const { processNftEventData, processNftExtrinsicData, updateProcessedBlockInDB, updateFinalizedBlock } = require('./utils');
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

    // Scan the finalized block and store it in db
    await api.rpc.chain
        .subscribeFinalizedHeads(async (head) => {
            const finalizedBlockAt = head.number.toNumber();
            await updateFinalizedBlock(finalizedBlockAt);
    });

    // Watch the block (processed / finalized) and process the block that are not yet finalized and updated processedBlk in db
    async function watchBlock() {
        while (true) {
            const blockScanned = await LastBlockScan.findOne({});
            logger.info(`Block scanned: ${blockScanned}`);
            if (blockScanned) {
                const {processedBlock, finalizedBlock} = blockScanned;
                let nextBlkToProcess = new BigNumber(processedBlock).plus(1);
                const finalizeBlk = new BigNumber(finalizedBlock);
                while (nextBlkToProcess.lte(finalizeBlk)) {
                    const blockHash = await api.rpc.chain.getBlockHash(nextBlkToProcess.toString());
                    await processDataAtBlockHash(api, blockHash, true);
                    await updateProcessedBlockInDB(nextBlkToProcess);
                    nextBlkToProcess = nextBlkToProcess.plus(1);
                }
            } else {
                logger.info(`Database has no record in lastBlockScan table`);
            }
            await sleep(5000);
        }
    }
    await watchBlock();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const networkName = process.env.NETWORK;
main(networkName).catch((err) => console.log(err));
