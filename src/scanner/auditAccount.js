
const { Api } = require('@cennznet/api');
const  createCsvWriter = require("csv-writer").createObjectCsvWriter;


main().catch((err) => console.log(err));
async function main () {
    const csv =  createCsvWriter({
        path: `${process.env.ACCOUNT_ID}.csv`,
        header: [
            { id: "assetId", title: "AssetId" },
            { id: "balance", title: "Balance" },
            { id: "blockNo", title: "BlockNumber" },
        ],
    });
    const api = await Api.create({provider: process.env.PROVIDER});
    const fromBlock = process.env.FROM_BLOCK;
    const toBlock = process.env.TO_BLOCK;
    const csvArray = [];
    for (let i = fromBlock; i<= toBlock; i++) {
        const blockHash = await api.rpc.chain.getBlockHash(i);

        const balance = await api.query.genericAsset.freeBalance.at(blockHash, process.env.ASSET_ID, process.env.ACCOUNT_ID);
        const csvObject = {};
        csvObject["assetId"] = process.env.ASSET_ID;
        csvObject["balance"] = balance.toString();
        csvObject["blockNo"] = i;
        csvArray.push(csvObject);
        console.log('listing at block 11838988::', bal);
    }
    csv.writeRecords(
            csvArray
        )
        .then(() => {
            console.log("Done!");
        });
}
