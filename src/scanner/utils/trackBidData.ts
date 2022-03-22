// track bid data
import {accuracyFormat} from "../formatBalance";
import {extractTokenListingData, Params} from "./commonUtils";
import {Api} from "@cennznet/api";
import {Balance, Listing, Option} from "@cennznet/types"

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
        let amountRaw: undefined | string = api.registry
            .createType(params[1].type, params[1].value);
        amountRaw  = amountRaw ? (amountRaw as unknown as Balance).toString() : '0';
        const listingDetail = (
            await api.query.nft.listings.at(blockHash, listingId) as Option<Listing>
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
