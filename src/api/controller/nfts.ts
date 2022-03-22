import { fetchEventStream,  fetchUsersNFTEvent} from "../models/nftsModel";
import { FastifyReply, FastifyRequest } from "fastify";

interface TokenQueryObject {
	collectionId: string;
	seriesId: string;
	serialNumber: string;
}

interface ListingQueryObject {
	listingId: string;
}

interface WalletQueryObject {
	address: string;
}

interface EventTracker {
	stream_id: string;
	data: { eventData: any; eventType: string };
}

type Request = FastifyRequest<{
	Params: TokenQueryObject | ListingQueryObject | WalletQueryObject;
}>;

export async function getTokenDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
	const { collectionId, seriesId, serialNumber } =
		request.params as TokenQueryObject;
	const tokenId = `[${collectionId},${seriesId},${serialNumber}]`;
	const data = await fetchEventStream(tokenId);
	if (!data || (data[0] as []).length === 0)
		return reply.status(500).send({ error: "Token Not found!" });
	const nftData = data[0] as EventTracker[];
	let imgUrl = "",
		hash = "",
		createdDate = "";
	// for a token Id NFT created will be one time
	const createdDetails = nftData.find(
		(nft) => nft.data.eventType === "NFT_CREATED"
	);
	if (createdDetails) {
		const createdEventsData = createdDetails.data.eventData;
		createdDate = createdEventsData.date;
		imgUrl = createdEventsData.imgUrl;
	}
	let listingId = "N/A",
		amount = "N/A",
		tokenType = "N/A",
		type = "N/A";
	// Listing can happen multiple times
	// find the recent/last listing id for a token
	const reverseListing = [...nftData].reverse();
	const listingStartedDetails = reverseListing.find(
		(nft) => nft.data.eventType === "LISTING_STARTED"
	);
	const listingClosedDetails = reverseListing.find(
		(nft) => nft.data.eventType === "LISTING_CLOSED"
	);
	// check if listing started and not closed or the last closed listing is not same as last opened listing, then show listing data
	if (
		listingStartedDetails &&
		(!listingClosedDetails ||
			listingStartedDetails.data.eventData.listingId !==
				listingClosedDetails.data.eventData.listingId)
	) {
		listingId = listingStartedDetails.data.eventData.listingId;
		amount = listingStartedDetails.data.eventData.amount;
		tokenType = listingStartedDetails.data.eventData.assetId;
		type = listingStartedDetails.data.eventData.type;
	}
	const lastEvent = nftData.slice(-1)[0];
	const transactionType = lastEvent.data.eventType;
	hash = lastEvent.data.eventData.txHash;
	const items = nftData.map((nft) => {
		return {
			status: nft.data.eventType,
			hash: nft.data.eventData.txHash,
			date: nft.data.eventData.date,
			owner: nft.data.eventData.owner,
		};
	});
	const response = {
		createdDate: createdDate,
		imgUrl: imgUrl,
		listingId: listingId,
		amount: amount,
		tokenType: tokenType,
		listingType: type,
		transactionType: transactionType,
		hash: hash,
		items: items,
	};
	return reply.status(200).send(response);
}

export async function getListingDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
	const data = await fetchEventStream(
		(request.params as ListingQueryObject).listingId
	);
	if (!data || (data[0] as []).length === 0)
		return reply.status(500).send({ error: "Token Not found!" });
	const listingData = data[0] as EventTracker[];
	console.log("listingData:", listingData);
	let date = "N/A",
		type = "N/A",
		closeDate = "N/A",
		seller = "N/A",
		tokenIds = [],
		status,
		assetId,
		sellPrice,
		buyPrice;
	const listingStarted = listingData.find(
		(nft) => nft.data.eventType === "LISTING_STARTED"
	);
	if (listingStarted) {
		date = listingStarted.data.eventData.date;
		type = listingStarted.data.eventData.type;
		closeDate = listingStarted.data.eventData.close;
		seller = listingStarted.data.eventData.seller;
		tokenIds = listingStarted.data.eventData.tokenIds;
		status = listingStarted.data.eventType;
		assetId = listingStarted.data.eventData.assetId;
		sellPrice = listingStarted.data.eventData.sellPrice;
	}
	const listingClosed = listingData.find(
		(nft) =>
			nft.data.eventType === "LISTING_CANCELED" ||
			nft.data.eventType === "LISTING_CLOSED"
	);
	if (listingClosed) {
		type = listingClosed.data.eventData.type;
		status = listingClosed.data.eventType;
		tokenIds = listingClosed.data.eventData.tokenIds;
		if (listingClosed.data.eventType === "LISTING_CLOSED") {
			buyPrice = listingClosed.data.eventData.price;
		}
	}
	// get all bid
	const bid = listingData
		.filter((list) => list.data.eventType === "NFT_BID")
		.map((listing) => {
			const address = listing.data.eventData.currentBidSetter;
			const amount = listing.data.eventData.currentBid;
			const date = listing.data.eventData.date;
			const hash = listing.data.eventData.txHash;
			return { address, amount, date, hash };
		});
	const response = {
		date,
		closeDate,
		type,
		status,
		seller,
		assetId,
		tokenIds,
		bid,
		sellPrice,
		buyPrice,
	};
	return reply.status(200).send(response);
}

export async function getWalletDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
	const data = await fetchUsersNFTEvent(
		(request.params as WalletQueryObject).address
	);
	if (!data || (data[0] as []).length === 0)
		return reply.status(500).send({ error: "Token Not found!" });
	const walletData = data[0] as EventTracker[];
	let nft = walletData.map((walletInfo) => {
		const tokenId = walletInfo.stream_id;
		const status = walletInfo.data.eventType;
		const data = walletInfo.data.eventData;
		return { tokenId, status, data };
	});
	const response = {
		nft,
		address: (request.params as WalletQueryObject).address,
	};
	return reply.status(200).send(response);
}
