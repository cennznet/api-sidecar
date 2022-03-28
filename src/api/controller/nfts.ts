import { fetchEventStream, fetchUsersNFTEvent } from "../models/nftsModel";
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
	streamId: string;
	data: string;
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
	const nftData: EventTracker[] = (await fetchEventStream(
		tokenId
	)) as unknown as EventTracker[];
	if (!nftData || nftData.length === 0)
		return reply.status(500).send({ error: "Token Not found!" });
	let imgUrl = "",
		hash = "",
		createdDate = "";
	// for a token Id NFT created will be one time
	const createdDetails = nftData.find(
		(nft) => JSON.parse(nft.data).eventType === "NFT_CREATED"
	);
	if (createdDetails) {
		const createdEventsData = JSON.parse(createdDetails.data).eventData;
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
		(nft) => JSON.parse(nft.data).eventType === "LISTING_STARTED"
	);
	const listingClosedDetails = reverseListing.find(
		(nft) => JSON.parse(nft.data).eventType === "LISTING_CLOSED"
	);
	const startListingEventData = listingStartedDetails
		? JSON.parse(listingStartedDetails.data).eventData
		: null;
	const closeListingEventData = listingClosedDetails
		? JSON.parse(listingClosedDetails.data).eventData
		: null;
	// check if listing started and not closed or the last closed listing is not same as last opened listing, then show listing data
	if (
		startListingEventData &&
		(!listingClosedDetails ||
			startListingEventData.listingId !== closeListingEventData.listingId)
	) {
		listingId = startListingEventData.listingId;
		amount = startListingEventData.amount;
		tokenType = startListingEventData.assetId;
		type = startListingEventData.type;
	}
	const lastEvent = nftData.slice(-1)[0];
	const lastEventData = JSON.parse(lastEvent.data);
	const transactionType = lastEventData.eventType;
	hash = lastEventData.txHash;
	const items = nftData.map((nft) => {
		const eventDetails = JSON.parse(nft.data);
		return {
			status: eventDetails.eventType,
			hash: eventDetails.eventData.txHash,
			date: eventDetails.eventData.date,
			owner: eventDetails.eventData.owner,
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
	if (!data || data.length === 0)
		return reply.status(500).send({ error: "Token Not found!" });
	const listingData = data as EventTracker[];
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
		(nft) => JSON.parse(nft.data).eventType === "LISTING_STARTED"
	);
	if (listingStarted) {
		const eventDetails = JSON.parse(listingStarted.data);
		date = eventDetails.eventData.date;
		type = eventDetails.eventData.type;
		closeDate = eventDetails.eventData.close;
		seller = eventDetails.eventData.seller;
		tokenIds = eventDetails.eventData.tokenIds;
		status = eventDetails.eventType;
		assetId = eventDetails.eventData.assetId;
		sellPrice = eventDetails.eventData.sellPrice;
	}
	const listingClosed = listingData.find(
		(nft) =>
			JSON.parse(nft.data).eventType === "LISTING_CANCELED" ||
			JSON.parse(nft.data).eventType === "LISTING_CLOSED"
	);
	if (listingClosed) {
		const eventDetails = JSON.parse(listingClosed.data);
		type = eventDetails.eventData.type;
		status = eventDetails.eventType;
		tokenIds = eventDetails.eventData.tokenIds;
		if (eventDetails.eventType === "LISTING_CLOSED") {
			buyPrice = eventDetails.eventData.price;
		}
	}
	// get all bid
	const bid = listingData
		.filter((list) => JSON.parse(list.data).eventType === "NFT_BID")
		.map((listing) => {
			const eventDetails = JSON.parse(listing.data);
			const address = eventDetails.eventData.currentBidSetter;
			const amount = eventDetails.eventData.currentBid;
			const date = eventDetails.eventData.date;
			const hash = eventDetails.eventData.txHash;
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
	if (!data || data.length === 0)
		return reply.status(500).send({ error: "Token Not found!" });
	const walletData = data as EventTracker[];
	let nft = walletData.map((walletInfo) => {
		const walletDetails = JSON.parse(walletInfo.data);
		const tokenId = walletInfo.streamId;
		const status = walletDetails.eventType;
		const data = walletDetails.eventData;
		return { tokenId, status, data };
	});
	const response = {
		nft,
		address: (request.params as WalletQueryObject).address,
	};
	return reply.status(200).send(response);
}
