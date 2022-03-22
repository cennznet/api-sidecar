// store in db all the relevant data for mint unique nft
import {trackEventData, trackEventDataSet} from "@/src/scanner/dbOperations";

export async function trackUniqueMintData(
    eventData,
    api,
    params,
    date,
    owner,
    txHash,
    blockNumber
) {
    try {
        const tokenId = JSON.stringify(eventData[1]); // tokenId in format [17,5,0] - [collectionId, seriesId, serialNo]
        const imgUrl = api.registry
            .createType(params[3].type, params[3].value)
            .toHuman();
        const tokenData = {
            eventData: {
                imgUrl: imgUrl,
                date: date,
                owner: owner,
                txHash: txHash,
            },
            eventType: "NFT_CREATED",
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
            `Error tracking unique mint data with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}

// mint series add all the tokens as per the count argument in the db
export async function trackTokenSeriesData(
    eventData,
    api,
    params,
    date,
    owner,
    txHash,
    blockNumber
) {
    try {
        const collectionId = eventData[0];
        const seriesId = eventData[1];
        const noOfTokens = eventData[2]; // quantity
        const imgUrl = api.registry
            .createType(params[4].type, params[4].value)
            .toHuman();
        const tokenData = {
            eventData: {
                imgUrl: imgUrl,
                date: date,
                owner: owner,
                txHash: txHash,
            },
            eventType: "NFT_CREATED",
        };
        const type = 0; // nft token data
        await extractTokenList(
            0,
            noOfTokens,
            collectionId,
            seriesId,
            type,
            blockNumber,
            tokenData,
            owner
        );
    } catch (e) {
        console.log(
            `Error tracking token series data with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}

// mint series add additional nft for a given collection, find next serialNumber at this blockhash and add more
export async function trackAdditionalTokenData(
    params,
    eventData,
    api,
    blockHash,
    date,
    owner,
    txHash,
    blockNumber
) {
    try {
        const collectionId = eventData[0];
        const seriesId = eventData[1];
        const noOfTokens = eventData[2]; // quantity
        const nextSerialNumber = (
            await api.query.nft.nextSerialNumber.at(blockHash, collectionId, seriesId)
        ).toNumber();
        const imgUrl = api.query.nft.seriesMetadataScheme
            ? (
                await api.query.nft.seriesMetadataScheme.at(
                    blockHash,
                    collectionId,
                    seriesId
                )
            ).toHuman()
            : (
                await api.query.nft.seriesMetadataURI.at(
                    blockHash,
                    collectionId,
                    seriesId
                )
            ).toHuman();
        const tokenData = {
            eventData: {
                imgUrl: imgUrl,
                date: date,
                owner: owner,
                txHash: txHash,
            },
            eventType: "NFT_CREATED",
        };
        const type = 0; // nft token data
        const endIndex = nextSerialNumber + noOfTokens;
        const startIndex = nextSerialNumber;
        await extractTokenList(
            startIndex,
            endIndex,
            collectionId,
            seriesId,
            type,
            blockNumber,
            tokenData,
            owner
        );
    } catch (e) {
        console.log(
            `Error tracking additional series data with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}
// common function to extract tokens from start to end index
export async function extractTokenList(
    startIndex,
    endIndex,
    collectionId,
    seriesId,
    type,
    blockNumber,
    tokenData,
    owner
) {
    const tokens = [];
    for (let i = startIndex; i < endIndex; i++) {
        const serialNumber = i;
        const tokenId = `[${collectionId},${seriesId},${serialNumber}]`;
        tokens.push([tokenId, type, blockNumber, JSON.stringify(tokenData), owner]);
    }
    await trackEventDataSet(tokens);
}
