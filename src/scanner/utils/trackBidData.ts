// track bid data
import { accuracyFormat } from "../formatBalance";
import { extractTokenListingData, Params } from "./commonUtils";
import { Api } from "@cennznet/api";
import { Balance, Listing, Option } from "@cennznet/types";
import logger from "../../logger";

export async function trackBidData(
	params: Params[],
	api: Api,
	blockHash: string,
	owner: string,
	txHash: string,
	date: Date,
	blockNumber: number
) {
	try {
		const listingId = params[0].value;
		let amountRaw: undefined | string = api.registry.createType(
			params[1].type,
			params[1].value
		);
		amountRaw = amountRaw ? (amountRaw as unknown as Balance).toString() : "0";
		const listingDetail = (
			(await api.query.nft.listings.at(blockHash, listingId)) as Option<Listing>
		).unwrapOrDefault();
		const details = listingDetail.asAuction.toJSON();
		const amount = accuracyFormat(amountRaw, details.paymentAsset);
		const dataInserts = [];
		const eventType = "NFT_BID";
		const listingData = {
				type: "Auction",
				assetId: details.paymentAsset,
				currentBid: amount,
				currentBidSetter: owner,
				txHash: txHash,
				date: date,
				seller: details.seller.toString(),
				tokenIds: JSON.stringify(details.tokens),
		};
		dataInserts.push([listingId, 1, blockNumber, JSON.stringify(listingData), eventType]);
		const tokenData = {
				txHash: txHash,
				listingId: listingId,
				amount: amount,
				assetId: details.paymentAsset,
				date: date,
				currentBidSetter: owner,
		};
		await extractTokenListingData(
			details.tokens,
			dataInserts,
			blockNumber,
			tokenData,
			owner,
			eventType
		);
		logger.info("Bid done");
	} catch (e) {
		logger.error(
			`Error tracking token bid data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}
