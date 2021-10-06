const {processNftEventData, processNftExtrinsicData} = require('./utils');

const { Api } = require('@cennznet/api');
require("dotenv").config();
const logger = require('../logger');
const mongoose = require('mongoose');

async function main (networkName) {
    networkName = networkName || 'nikau';

    const api = await Api.create({network: networkName});
    logger.info(`Connect to cennznet network ${networkName}`);

    const connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    await mongoose.connect(connectionStr);

    await api.rpc.chain
        .subscribeFinalizedHeads(async (head) => {
            const blockNumber = head.number.toNumber();
            logger.info(`HEALTH CHECK => OK`);
            logger.info(`At blocknumber: ${blockNumber}`);

            const blockHash = head.hash.toString();
            const events = await api.query.system.events.at(blockHash);
            await Promise.all(
                events.map(async ({event}) => {
                    const { section, method, data } = event;
                    if (section === 'nft') {
                        const dataFetched = data.toHuman();
                        await processNftEventData(dataFetched, method, api);
                    }
                })
            );
            const block = await api.rpc.chain.getBlock(blockHash);
            const extrinsics = block.block.extrinsics.toHuman();
            // Process extrinsic data only for burn and burnBatch operation
            const filterSignedNFTExtrinsics = extrinsics.filter(ext => ext.isSigned && ext.method.section === 'nft' &&
                (ext.method.method === 'burnBatch' || ext.method.method === 'burn'));
            if (filterSignedNFTExtrinsics.length > 0) {
                await processNftExtrinsicData(filterSignedNFTExtrinsics);
            }
        });
}

const networkName = process.env.NETWORK;
main(networkName).catch((err) => console.log(err));
