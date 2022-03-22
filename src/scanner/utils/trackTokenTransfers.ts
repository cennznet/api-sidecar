// Track transfers
import {trackEventData, trackEventDataSet} from "@/src/scanner/dbOperations";

export async function trackTransferData(
    params,
    date,
    txHash,
    blockNumber,
    owner
) {
    try {
        const tokenId = JSON.stringify(params[0].value);
        const newOwner = params[1].value;
        const tokenData = {
            eventData: {
                date: date,
                owner: newOwner,
                txHash: txHash,
            },
            eventType: "NFT_TRANSFERED",
        };
        const type = 0;
        await trackEventData(
            tokenId,
            type,
            blockNumber,
            JSON.stringify(tokenData),
            owner
        );
    } catch (e) {
        console.log(
            `Error tracking token transfer with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}

// Track batch of transfers
export async function trackTransferBatchData(
    params,
    date,
    txHash,
    blockNumber,
    owner
) {
    try {
        let tokenIds = [];
        let newOwner;
        if (params[2]) {
            // in new runtime > 50
            const collectionId = params[0].value;
            const seriesId = params[1].value;
            const serialNumbers = params[2].value;
            newOwner = params[3].value;
            serialNumbers.forEach((serialNumber) => {
                const tokenId = `[${collectionId.toString()},${seriesId},${serialNumber}]`;
                tokenIds.push(tokenId);
            });
        } else {
            // older runtime
            tokenIds = params[0].value; // tokenIds = tokens[]
            newOwner = params[1].value;
        }
        const tokenData = {
            eventData: {
                date: date,
                owner: newOwner,
                txHash: txHash,
            },
            eventType: "NFT_TRANSFERED",
        };
        const tokens = [];
        let type = 0; // nft token data
        tokenIds.forEach((tokenId) => {
            tokens.push([
                JSON.stringify(tokenId),
                type,
                blockNumber,
                JSON.stringify(tokenData),
                owner,
            ]);
        });
        await trackEventDataSet(tokens);
    } catch (e) {
        console.log(
            `Error tracking transfer batch data with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}
