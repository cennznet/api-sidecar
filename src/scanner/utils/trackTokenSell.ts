// track sell data for batch
import { accuracyFormat } from "../formatBalance";
import { convertBlockToDate, extractListingData, Params } from "./commonUtils";
import { Api } from "@cennznet/api";

export async function trackSellBundleData(
	params: Params,
	api: Api,
	eventData: number[],
	txHash: string,
	date: Date,
	owner: string,
	blockNumber: number
) {
	try {
		const tokenIds = params[0].value;
		const buyer = params[1].value;
		const paymentAsset = params[2].value;
		const fixedPriceRaw = api.registry
			.createType(params[3].type, params[3].value)
			.toString();
		const fixedPrice = accuracyFormat(fixedPriceRaw, paymentAsset);
		const duration = params[4].value;
		const marketPlaceId = params[5] ? params[5].value : null;
		const listingId = eventData[1];
		console.log("fixed Price::", fixedPrice);
		const tokenData = {
			eventData: {
				type: "Fixed",
				txHash: txHash,
				listingId: listingId,
				amount: fixedPrice,
				assetId: paymentAsset,
				date: date,
				owner: owner,
			},
			eventType: "LISTING_STARTED",
		};
		console.log("tokenData:", tokenData);
		console.log("data::", date);
		const closeDate = await convertBlockToDate(
			api,
			duration + blockNumber,
			date
		);
		const listingData = {
			eventData: {
				type: "Fixed",
				assetId: paymentAsset,
				sellPrice: fixedPrice,
				txHash: txHash,
				date: date,
				seller: owner,
				buyer: buyer,
				tokenIds: JSON.stringify(tokenIds),
				close: closeDate,
				marketPlaceId: marketPlaceId,
			},
			eventType: "LISTING_STARTED",
		};
		console.log("listingData:", listingData);

		await extractListingData(
			tokenIds,
			blockNumber,
			tokenData,
			owner,
			listingId,
			listingData
		);
	} catch (e) {
		console.log(
			`Error tracking sell bundle data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

// track sell data
export async function trackSellData(
	params: Params,
	api: Api,
	eventData: number[],
	txHash: string,
	date: Date,
	owner: string,
	blockNumber: number
) {
	try {
		const tokenIds = params[0].value;
		const buyer = params[1].value;
		const paymentAsset = params[2].value;
		const fixedPriceRaw = api.registry
			.createType(params[3].type, params[3].value)
			.toString();
		const fixedPrice = accuracyFormat(fixedPriceRaw, paymentAsset);
		const duration = params[4].value;
		const marketPlaceId = params[5] ? params[5].value : null;
		const listingId = eventData[1];
		const tokenData = {
			eventData: {
				type: "Fixed",
				txHash: txHash,
				listingId: listingId,
				amount: fixedPrice,
				assetId: paymentAsset,
				date: date,
				owner: owner,
			},
			eventType: "LISTING_STARTED",
		};
		const closeDate = await convertBlockToDate(
			api,
			duration + blockNumber,
			date
		);
		console.log("date in sell:", duration + blockNumber);
		const listingData = {
			eventData: {
				type: "Fixed",
				assetId: paymentAsset,
				sellPrice: fixedPrice,
				txHash: txHash,
				date: date,
				seller: owner,
				buyer: buyer,
				tokenIds: JSON.stringify([tokenIds]),
				close: closeDate,
				marketPlaceId: marketPlaceId,
			},
			eventType: "LISTING_STARTED",
		};
		await extractListingData(
			[tokenIds],
			blockNumber,
			tokenData,
			owner,
			listingId,
			listingData
		);
	} catch (e) {
		console.log(
			`Error tracking sell data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}
