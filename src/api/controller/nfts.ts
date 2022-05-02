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
	eventType: string
}

type Request = FastifyRequest<{
	Params: TokenQueryObject | ListingQueryObject | WalletQueryObject;
}>;

export async function getTokenDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
	try {
		const eventTracker = this.mongo.db.collection('EventTracker');

		const {collectionId, seriesId, serialNumber} =
			request.params as TokenQueryObject;
		const tokenId = `[${collectionId},${seriesId},${serialNumber}]`;
		let nftData = await eventTracker.find({ streamId: tokenId }).sort({version: "asc"});
		nftData = await nftData.toArray();
		if (!nftData || nftData.length === 0)
			return reply.status(500).send({error: "Token Not found!"});
		let imgUrl = "",
			hash = "",
			createdDate = "";
		// for a token Id NFT created will be one time
		const createdDetails = nftData.find(
			(nft) => nft.eventType === "NFT_CREATED"
		);
		if (createdDetails) {
			const createdEventsData = JSON.parse(createdDetails.data);
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
			(nft) => nft.eventType === "LISTING_STARTED"
		);
		const listingClosedDetails = reverseListing.find(
			(nft) => nft.eventType === "LISTING_CLOSED"
		);
		const startListingEventData = listingStartedDetails
			? JSON.parse(listingStartedDetails.data)
			: null;
		const closeListingEventData = listingClosedDetails
			? JSON.parse(listingClosedDetails.data)
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
				status: nft.eventType,
				hash: eventDetails.txHash,
				date: eventDetails.date,
				owner: eventDetails.owner,
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
	} catch (e) {
		console.log('err:',e);
		return reply.status(404).send();
	}
}

export async function getListingDetails(
	request: Request,
	reply: FastifyReply
): Promise<FastifyReply> {
	const eventTracker = this.mongo.db.collection('EventTracker');
	// const data = await fetchEventStream(
	// 	(request.params as ListingQueryObject).listingId
	// );
	let data = await eventTracker.find({ streamId: (request.params as ListingQueryObject).listingId }).sort({version: "asc"});
	data = await data.toArray();
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
		(nft) => nft.eventType === "LISTING_STARTED"
	);
	if (listingStarted) {
		const eventDetails = JSON.parse(listingStarted.data);
		date = eventDetails.date;
		type = eventDetails.type;
		closeDate = eventDetails.close;
		seller = eventDetails.seller;
		tokenIds = eventDetails.tokenIds;
		status = listingStarted.eventType;
		assetId = eventDetails.assetId;
		sellPrice = eventDetails.sellPrice;
	}
	const listingClosed = listingData.find(
		(nft) =>
			nft.eventType === "LISTING_CANCELED" ||
			nft.eventType === "LISTING_CLOSED"
	);
	if (listingClosed) {
		const eventDetails = JSON.parse(listingClosed.data);
		type = eventDetails.type;
		status = listingClosed.eventType;
		tokenIds = eventDetails.tokenIds;
		if (status === "LISTING_CLOSED") {
			buyPrice = eventDetails.price;
		}
	}
	// get all bid
	const bid = listingData
		.filter((list) => list.eventType === "NFT_BID")
		.map((listing) => {
			const eventDetails = JSON.parse(listing.data);
			const address = eventDetails.currentBidSetter;
			const amount = eventDetails.currentBid;
			const date = eventDetails.date;
			const hash = eventDetails.txHash;
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
	const EventTracker = this.mongo.db.collection('EventTracker');
	let data = await EventTracker.find({ signer: (request.params as WalletQueryObject).address, streamType: 0 }).sort({version: "asc"})
	data = await data.toArray();
	if (!data || data.length === 0)
		return reply.status(500).send({ error: "Token Not found!" });
	const walletData = data as EventTracker[];
	let nft = walletData.map((walletInfo) => {
		const walletDetails = JSON.parse(walletInfo.data);
		const tokenId = walletInfo.streamId;
		const status = walletInfo.eventType;
		const data = walletDetails;
		return { tokenId, status, data };
	});
	const response = {
		nft,
		address: (request.params as WalletQueryObject).address,
	};
	return reply.status(200).send(response);
}
