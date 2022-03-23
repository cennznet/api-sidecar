// track auction data
import { accuracyFormat } from "../formatBalance";
import {
	convertBlockToDate,
	extractTokenListingData,
	Params,
} from "./commonUtils";
import { trackEventDataSet } from "../dbOperations";
import { Api } from "@cennznet/api";
import { Listing, Option, Balance } from "@cennznet/types";

export async function trackAuctionData(
	eventData: number[],
	params: Params[],
	api: Api,
	txHash: string,
	date: Date,
	owner: string,
	blockNumber: number
) {
	try {
		const listingId = eventData[1];
		const tokenId = params[0].value;
		const paymentAsset = params[1].value;
		let reservedPriceRaw: undefined | string = api.registry.createType(
			params[2].type,
			params[2].value
		);
		reservedPriceRaw = reservedPriceRaw
			? (reservedPriceRaw as unknown as Balance).toString()
			: "";
		const reservedPrice = accuracyFormat(reservedPriceRaw, paymentAsset);
		const duration = params[3].value;
		const listingData = {
			eventData: {
				type: "Auction",
				assetId: paymentAsset,
				sellPrice: reservedPrice,
				txHash: txHash,
				date: date,
				seller: owner,
				tokenIds: JSON.stringify([tokenId]),
				close: new Date(duration + blockNumber),
			},
			eventType: "LISTING_STARTED",
		};
		const tokenData = {
			eventData: {
				type: "Auction",
				txHash: txHash,
				listingId: listingId,
				amount: reservedPrice,
				assetId: paymentAsset,
				date: date,
				owner: owner,
			},
			eventType: "LISTING_STARTED",
		};
		await extractAuctionData(
			listingId,
			blockNumber,
			listingData,
			tokenId,
			tokenData,
			owner
		);
		console.log("Auction done");
	} catch (e) {
		console.log(
			`Error tracking auction data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

// track auction data for batch
export async function trackAuctionBundleData(
	eventData: number[],
	params: Params[],
	api: Api,
	txHash: string,
	date: Date,
	owner: string,
	blockNumber: number
) {
	try {
		const listingId = eventData[1];
		const tokenIds = params[0].value;
		const paymentAsset = params[1].value;
		let reservedPriceRaw: undefined | string = api.registry.createType(
			params[2].type,
			params[2].value
		);
		reservedPriceRaw = reservedPriceRaw
			? (reservedPriceRaw as unknown as Balance).toString()
			: "";
		const reservedPrice = accuracyFormat(reservedPriceRaw, paymentAsset);
		const duration = params[3].value;
		const closeDate = await convertBlockToDate(
			api,
			duration + blockNumber,
			date
		);
		const listingData = {
			eventData: {
				type: "Auction",
				assetId: paymentAsset,
				sellPrice: reservedPrice,
				txHash: txHash,
				date: date,
				seller: owner,
				tokenIds: JSON.stringify(tokenIds),
				close: closeDate,
			},
			eventType: "LISTING_STARTED",
		};
		const tokenData = {
			eventData: {
				type: "Auction",
				txHash: txHash,
				listingId: listingId,
				amount: reservedPrice,
				assetId: paymentAsset,
				date: date,
				owner: owner,
			},
			eventType: "LISTING_STARTED",
		};
		const dataInserts = [];
		dataInserts.push([
			listingId,
			1, // for listing
			blockNumber,
			JSON.stringify(listingData),
			owner,
		]);
		await extractTokenListingData(
			tokenIds,
			dataInserts,
			blockNumber,
			tokenData,
			owner
		);
		console.log("Bundle Auction done");
	} catch (e) {
		console.log(
			`Error tracking auction bundle data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

async function extractAuctionData(
	listingId: string | number,
	blockNumber: number,
	listingData: {},
	tokenId: string,
	tokenData: {},
	owner: string
) {
	const dataInserts = [];
	// 1 is for listing type
	dataInserts.push([listingId, 1, blockNumber, JSON.stringify(listingData)]);
	dataInserts.push([
		JSON.stringify(tokenId),
		0,
		blockNumber,
		JSON.stringify(tokenData),
		owner,
	]);
	await trackEventDataSet(dataInserts);
}

// event to knw if a auction was closed
export async function processAuctionSoldEvent(
	event: { data: any },
	blockTimestamp: Date,
	blockNumber: number,
	blockHash: string,
	api: Api
) {
	try {
		const { data } = event;
		const date = blockTimestamp;
		let [, listingId, assetId, priceRaw, winner] = data.toJSON();
		const blockHashBeforeBuy = (
			await api.rpc.chain.getBlockHash(blockNumber - 1)
		).toString();
		const listingDetail = (
			(await api.query.nft.listings.at(
				blockHashBeforeBuy,
				listingId
			)) as Option<Listing>
		).unwrapOrDefault();
		const details = listingDetail.asAuction.toJSON();
		const dataInserts = [];
		const closeDate = await convertBlockToDate(api, details.close, date);
		const price = accuracyFormat(priceRaw, details.paymentAsset);

		const listingData = {
			eventData: {
				type: "Auction",
				assetId: assetId,
				price: price.toString(),
				txHash: blockHash,
				date: date,
				seller: details.seller.toString(),
				buyer: winner,
				tokenIds: JSON.stringify(details.tokens),
				close: closeDate,
			},
			eventType: "LISTING_CLOSED",
		};
		dataInserts.push([
			listingId,
			1,
			blockNumber,
			JSON.stringify(listingData),
			null,
		]);
		const tokenData = {
			eventData: {
				txHash: blockHash,
				listingId: listingId,
				amount: price.toString(),
				assetId: assetId,
				date: date,
				seller: details.seller.toString(),
			},
			eventType: "LISTING_CLOSED",
		};
		await extractTokenListingData(
			details.tokens,
			dataInserts,
			blockNumber,
			tokenData,
			null
		);
		console.log("Auction completed");
	} catch (e) {
		console.log(
			`Error tracking auction sold data with params ${(
				event as any
			).toJSON()}, error ${e}`
		);
	}
}
