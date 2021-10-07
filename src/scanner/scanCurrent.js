const {processNftEventData, processNftExtrinsicData, updateLastBlockInDB} = require('./utils');
const { LastBlockScan  } = require('../mongo/models');

const { Api } = require('@cennznet/api');
require("dotenv").config();
const logger = require('../logger');
const mongoose = require('mongoose');
const BigNumber = require('bignumber.js');

async function processDataAtBlockHash(api, blockHash, processingOldBlock) {
    const events = await api.query.system.events.at(blockHash);
    await Promise.all(
        events.map(async ({event}) => {
            const {section, method, data} = event;
            if (section === 'nft') {
                const dataFetched = data.toHuman();
                await processNftEventData(dataFetched, method, api, processingOldBlock ? blockHash : null);
            }
        })
    );
    const block = await api.rpc.chain.getBlock(blockHash);
    const extrinsics = block.block.extrinsics.toHuman();
    const filterSignedNFTExtrinsics = extrinsics.filter(ext => ext.isSigned && ext.method.section === 'nft' &&
        (ext.method.method === 'burnBatch' || ext.method.method === 'burn'));
    if (filterSignedNFTExtrinsics.length > 0) {
        await processNftExtrinsicData(filterSignedNFTExtrinsics);
    }
}

async function main (networkName) {
    networkName = networkName || 'nikau';

    const api = await Api.create({network: networkName});
    logger.info(`Connect to cennznet network ${networkName}`);

    const connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    await mongoose.connect(connectionStr);

    let processingOldBlockFinished = false;
    const lastBlockScanned = await LastBlockScan.findOne();
    if (!lastBlockScanned) {
        logger.info('No record for old block number in db');
        processingOldBlockFinished = true;
    } else {
        let lastScannedBlockNumber = new BigNumber(lastBlockScanned.blockNumber).plus(1);
        const signedBlock = await api.rpc.chain.getBlock();
        let currentHeight = signedBlock.block.header.number.toNumber();
        // Process old data
        while (lastScannedBlockNumber.lte(currentHeight)) {
            logger.info(`Scanning old block at :${lastScannedBlockNumber.toString()}`);
            logger.info(`Current height: ${currentHeight}`);
            const blockHash = await api.rpc.chain.getBlockHash(lastScannedBlockNumber.toString());
            await processDataAtBlockHash(api, blockHash, true);
            if (lastScannedBlockNumber.eq(currentHeight - 10)) {
                const currentSignedBlock = await api.rpc.chain.getBlock();
                currentHeight = currentSignedBlock.block.header.number.toNumber(); // before last 10 blocks to finish check the current height
            }
            if (lastScannedBlockNumber.eq(currentHeight)) {
                logger.info(`current height: ${currentHeight}`);
                logger.info(`Last scanned block reached till current block..`);
                processingOldBlockFinished = true
            }
            await updateLastBlockInDB(lastScannedBlockNumber.toString(), blockHash.toString());
            lastScannedBlockNumber = lastScannedBlockNumber.plus(1);
        }
    }
    logger.info(`ProcessingOldBlock has finished ${processingOldBlockFinished}`);
    if (processingOldBlockFinished) {
        await api.rpc.chain
            .subscribeFinalizedHeads(async (head) => {
                const blockNumber = head.number.toNumber();
                logger.info(`HEALTH CHECK => OK`);
                logger.info(`At blocknumber: ${blockNumber}`);
                const blockHash = head.hash.toString();
                processingOldBlock = false;
                await processDataAtBlockHash(api, blockHash, processingOldBlock);
                await updateLastBlockInDB(blockNumber, blockHash);
            });
    }
}

const networkName = process.env.NETWORK;
main(networkName).catch((err) => console.log(err));
