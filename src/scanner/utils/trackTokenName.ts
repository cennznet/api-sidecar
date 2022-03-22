// token series name update
import {extractTokenList} from "@/src/scanner/utility";

export async function trackSeriesNameData(
    params,
    api,
    date,
    owner,
    txHash,
    blockHash,
    blockNumber
) {
    try {
        const collectionId = params[0].value;
        const seriesId = params[1].value;
        const name = api.registry
            .createType(params[2].type, params[2].value)
            .toHuman();
        const tokenData = {
            eventData: {
                name: name,
                date: date,
                owner: owner,
                txHash: txHash,
            },
            eventType: "SERIES NAMED",
        };
        const type = 0; // nft token data
        const nextSerialNumber = (
            await api.query.nft.nextSerialNumber.at(blockHash, collectionId, seriesId)
        ).toNumber();
        await extractTokenList(
            0,
            nextSerialNumber,
            collectionId,
            seriesId,
            type,
            blockNumber,
            tokenData,
            owner
        );
    } catch (e) {
        console.log(
            `Error tracking token series name with params ${JSON.stringify(
                params
            )}, error ${e}`
        );
    }
}
