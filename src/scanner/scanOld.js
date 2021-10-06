const {processNftEventData, processNftExtrinsicData} = require('./utils');
const { Api } = require('@cennznet/api');
require("dotenv").config();
const logger = require('../logger');

async function main (networkName, startBlockNumber, endBlockNumber) {
    networkName = networkName || 'nikau';

    const api = await Api.create({network: networkName});
    logger.info(`Connect to cennznet network ${networkName}`);

    for (let blockNumber = startBlockNumber; blockNumber <= endBlockNumber; blockNumber++) {
            logger.info(`HEALTH CHECK => OK`);
            logger.info(`At blocknumber: ${blockNumber}`);
            const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
            const events = await api.query.system.events.at(blockHash);
            await Promise.all(
                events.map(async ({event}) => {
                    const { section, method, data } = event;
                    if (section === 'nft') {
                        const dataFetched = data.toHuman();
                        await processNftEventData(dataFetched, method, api, blockHash);
                    }
                })
            );
            const block = await api.rpc.chain.getBlock(blockHash);
            const extrinsics = block.block.extrinsics.toHuman();
            // Process extrinsic data only for burn and burnBatch operation
            const filterSignedNFTExtrinsics = extrinsics.filter(ext => ext.isSigned && ext.method.section === 'nft' &&
            (ext.method.method === 'burnBatch' || ext.method.method === 'burn'));
            processNftExtrinsicData(filterSignedNFTExtrinsics);
        }
}


const networkName = process.env.NETWORK;
const startBlockNumber = 0, endBlockNumber = process.env.BLOCKNUMBER
main(networkName, startBlockNumber, endBlockNumber).catch((err) => console.log(err));
