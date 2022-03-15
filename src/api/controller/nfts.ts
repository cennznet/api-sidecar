import { nftsModel } from "../models/nftsModel";

export async function getTokenDetails(request, reply) {
	const { collectionId, seriesId, serialNumber } = request.params;
	const tokenId = `[${collectionId},${seriesId},${serialNumber}]`;
	const data = await nftsModel.fetchEventStream(tokenId);
	if (data[0]) {
		const nftData = data[0];
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
		const listingStartedDetails = [...nftData]
			.reverse()
			.find((nft) => nft.data.eventType === "LISTING_STARTED");
		const listingClosedDetails = [...nftData]
			.reverse()
			.find((nft) => nft.data.eventType === "LISTING_CLOSED");
		if (listingStartedDetails) {
			if (
				listingClosedDetails &&
				listingStartedDetails.data.eventData.listingId ===
					listingClosedDetails.data.eventData.listingId
			) {
				// listing is closed
			} else {
				listingId = listingStartedDetails.data.eventData.listingId;
				amount = listingStartedDetails.data.eventData.amount;
				tokenType = listingStartedDetails.data.eventData.assetId;
				type = listingStartedDetails.data.eventData.type;
			}
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
	return reply.status(500).send({ error: "Token Not found!" });
}

export async function getListingDetails(request, reply) {
	const data = await nftsModel.fetchEventStream(request.params.listingId);
	const listingData = data[0];
	console.log("listingData:", listingData);
	if (listingData.length > 0) {
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
	} else {
		return reply.status(500).send({ error: "Listing Not found!" });
	}
}

export async function getWalletDetails(request, reply) {
	const data = await nftsModel.fetchUsersNFTEvent(request.params.address);
	const walletData = data[0];
	console.log("walletData:", walletData);
	if (walletData.length > 0) {
		let nft = walletData.map((walletInfo) => {
			const tokenId = walletInfo.stream_id;
			const status = walletInfo.data.eventType;
			const data = walletInfo.data.eventData;
			return { tokenId, status, data };
		});
		const response = { nft, address: request.params.address };
		return reply.status(200).send(response);
	} else {
		return reply.status(500).send({ error: "No wallet data!" });
	}
}
