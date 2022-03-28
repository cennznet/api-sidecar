// track buy data
import { accuracyFormat } from "../formatBalance";
import { extractTokenListingData, Params } from "./commonUtils";
import { Api } from "@cennznet/api";
import { Listing, Option } from "@cennznet/types";
import logger from "../../logger";

export async function trackBuyData(
	params: Params,
	blockHash: string,
	api: Api,
	blockNumber: number,
	txHash: string,
	date: Date,
	owner: string
) {
	try {
		const listingId = params[0].value;
		logger.info(`listingId::${listingId}`);
		logger.info(`blockHash:${blockHash.toString()}`);
		const blockHashBeforeBuy = (
			await api.rpc.chain.getBlockHash(blockNumber - 1)
		).toString();
		const listingDetail = (
			(await api.query.nft.listings.at(
				blockHashBeforeBuy,
				listingId
			)) as Option<Listing>
		).unwrapOrDefault();
		const details = listingDetail.asFixedPrice.toJSON();
		logger.info(`details::${details}`);
		const fixedPrice = accuracyFormat(details.fixedPrice, details.paymentAsset);
		const dataInserts = [];
		const listingData = {
			eventData: {
				type: "Fixed",
				assetId: details.paymentAsset,
				price: fixedPrice,
				txHash: txHash,
				date: date,
				seller: details.seller.toString(),
				buyer: details.buyer ? details.buyer.toString() : owner,
				tokenIds: JSON.stringify(details.tokens),
			},
			eventType: "LISTING_CLOSED",
		};
		dataInserts.push([
			listingId,
			1, // type for listing
			blockNumber,
			JSON.stringify(listingData),
			owner,
		]);
		const tokenData = {
			eventData: {
				type: "Fixed",
				txHash: txHash,
				listingId: listingId,
				amount: fixedPrice,
				assetId: details.paymentAsset,
				date: date,
				owner: owner,
			},
			eventType: "LISTING_CLOSED",
		};
		await extractTokenListingData(
			details.tokens,
			dataInserts,
			blockNumber,
			tokenData,
			owner
		);
		logger.info("Buy done");
	} catch (e) {
		logger.error(
			`Error tracking buy listing data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}
