// track burn related data
import {trackEventData, trackEventDataSet} from "../dbOperations";

export async function trackBurnData(params, date, txHash, blockNumber, owner) {
    try {
        const tokenId = JSON.stringify(params[0].value);
        const tokenData = {
            eventData: {
                date: date,
                owner: null,
                txHash: txHash,
            },
            eventType: "BURN",
        };
        const type = 0;
        await trackEventData(
            tokenId,
            type,
            blockNumber,
            JSON.stringify(tokenData),
            owner
        );
        console.log("Burn done");
    } catch (e) {
        console.log(
            `Error tracking token burn data with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}

// track batch of burn tokens
export async function trackBurnBatchData(
    params,
    date,
    txHash,
    blockNumber,
    owner
) {
    try {
        const collectionId = params[0].value;
        const seriesId = params[1].value;
        const serialNumbers = params[2].value;
        const tokenData = {
            eventData: {
                date: date,
                owner: null,
                txHash: txHash,
            },
            eventType: "BURN",
        };
        const tokens = [];
        serialNumbers.forEach((serialNumber) => {
            const tokenId = `[${collectionId.toString()},${seriesId},${serialNumber}]`;
            tokens.push([tokenId, 0, blockNumber, JSON.stringify(tokenData), owner]);
        });
        await trackEventDataSet(tokens);

        console.log("burn batch done..");
    } catch (e) {
        console.log(
            `Error tracking token burn batch data with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}
