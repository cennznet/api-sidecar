// track cancel sale data
import {accuracyFormat} from "../formatBalance";
import {extractTokenListingData} from "./commonUtils";

export async function trackCancelSaleData(
    params,
    api,
    blockNumber,
    txHash,
    date,
    owner
) {
    try {
        const listingId = params[0].value;
        const blockHashBeforeBuy = (
            await api.rpc.chain.getBlockHash(blockNumber - 1)
        ).toString();
        const listingDetail = (
            await api.query.nft.listings.at(blockHashBeforeBuy, listingId)
        ).unwrapOrDefault();
        let details, type, priceRaw;
        if (listingDetail.isFixedPrice) {
            details = listingDetail.asFixedPrice.toJSON();
            type = "Fixed";
            priceRaw = details.fixedPrice;
        } else {
            details = listingDetail.asAuction.toJSON();
            type = "Auction";
            priceRaw = details.reservePrice;
        }
        const price = accuracyFormat(priceRaw, details.paymentAsset);
        const dataInserts = [];

        const listingData = {
            eventData: {
                type: type,
                assetId: details.paymentAsset,
                price: price.toString(),
                txHash: txHash,
                date: date,
                seller: details.seller.toString(),
                tokenIds: JSON.stringify(details.tokens),
            },
            eventType: "LISTING_CANCELED",
        };
        dataInserts.push([
            listingId,
            1,
            blockNumber,
            JSON.stringify(listingData),
            owner,
        ]);
        const tokenData = {
            eventData: {
                txHash: txHash,
                listingId: listingId,
                amount: price.toString(),
                assetId: details.paymentAsset,
                date: date,
                seller: details.seller.toString(),
            },
            eventType: "LISTING_CANCELED",
        };
        await extractTokenListingData(
            details.tokens,
            dataInserts,
            blockNumber,
            tokenData,
            owner
        );
        console.log("cancelSale done");
    } catch (e) {
        console.log(
            `Error tracking sale cancel data with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}
