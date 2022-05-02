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
		// logger.info(`listingId::${listingId}`);
		// logger.info(`blockHash:${blockHash.toString()}`);
		// logger.info(`blockNumber:${blockNumber}`);
		const previousBlock = blockNumber - 1;
		const blockHashBeforeBuy =
			await api.rpc.chain.getBlockHash(previousBlock);
		console.log('blockHashBeforeBuy::',blockHashBeforeBuy.toString());
		const listingDetailInfo = await api.query.nft.listings.at(
				blockHashBeforeBuy,
				listingId) as Option<Listing>;
		const listingDetail = listingDetailInfo.unwrapOrDefault();
		const details = listingDetail.asFixedPrice.toJSON();
		// logger.info(`details::${details}`);
		const fixedPrice = accuracyFormat(details.fixedPrice, details.paymentAsset);
		const dataInserts = [];
		const eventType = "LISTING_CLOSED";
		const listingData = {
				type: "Fixed",
				assetId: details.paymentAsset,
				price: fixedPrice,
				txHash: txHash,
				date: date,
				seller: details.seller.toString(),
				buyer: details.buyer ? details.buyer.toString() : owner,
				tokenIds: JSON.stringify(details.tokens),
		};
		dataInserts.push([
			listingId,
			1, // type for listing
			blockNumber,
			JSON.stringify(listingData),
			owner,
			eventType
		]);
		const tokenData = {
				type: "Fixed",
				txHash: txHash,
				listingId: listingId,
				amount: fixedPrice,
				assetId: details.paymentAsset,
				date: date,
				owner: owner,
		};
		await extractTokenListingData(
			details.tokens,
			dataInserts,
			blockNumber,
			tokenData,
			owner,
			eventType
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
