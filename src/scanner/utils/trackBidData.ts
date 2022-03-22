// track bid data
import {accuracyFormat} from "../formatBalance";
import { extractTokenListingData } from "./commonUtils";

export async function trackBidData(
    params,
    api,
    blockHash,
    owner,
    txHash,
    date,
    blockNumber
) {
    try {
        const listingId = params[0].value;
        const amountRaw = api.registry
            .createType(params[1].type, params[1].value)
            .toString();
        const listingDetail = (
            await api.query.nft.listings.at(blockHash, listingId)
        ).unwrapOrDefault();
        const details = listingDetail.asAuction.toJSON();
        console.log("details::", details);
        const amount = accuracyFormat(amountRaw, details.paymentAsset);
        const dataInserts = [];
        const listingData = {
            eventData: {
                type: "Auction",
                assetId: details.paymentAsset,
                currentBid: amount,
                currentBidSetter: owner,
                txHash: txHash,
                date: date,
                seller: details.seller.toString(),
                tokenIds: JSON.stringify(details.tokens),
            },
            eventType: "NFT_BID",
        };
        dataInserts.push([listingId, 1, blockNumber, JSON.stringify(listingData)]);
        const tokenData = {
            eventData: {
                txHash: txHash,
                listingId: listingId,
                amount: amount,
                assetId: details.paymentAsset,
                date: date,
                currentBidSetter: owner,
            },
            eventType: "NFT_BID",
        };
        await extractTokenListingData(
            details.tokens,
            dataInserts,
            blockNumber,
            tokenData,
            owner
        );
        console.log("Bid done");
    } catch (e) {
        console.log(
            `Error tracking token bid data with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}
