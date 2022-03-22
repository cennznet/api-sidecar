// track buy data
import {accuracyFormat} from "../formatBalance";
import { extractTokenListingData } from "./commonUtils";

export async function trackBuyData(
    params,
    blockHash,
    api,
    blockNumber,
    txHash,
    date,
    owner
) {
    try {
        const listingId = params[0].value;
        console.log("listingId::", listingId);
        console.log("blockHash:", blockHash.toString());
        const blockHashBeforeBuy = (
            await api.rpc.chain.getBlockHash(blockNumber - 1)
        ).toString();
        const listingDetail = (
            await api.query.nft.listings.at(blockHashBeforeBuy, listingId)
        ).unwrapOrDefault();
        const details = listingDetail.asFixedPrice.toJSON();
        console.log("details::", details);
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
        console.log("Buy done");
    } catch (e) {
        console.log(
            `Error tracking buy listing data with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}
