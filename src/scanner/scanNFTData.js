const { processNftEventData, processNftExtrinsicData, updateProcessedBlockInDB, updateFinalizedBlock } = require('./utils');
const { LastBlockScan  } = require('../mongo/models');
const { Api } = require('@cennznet/api');
require("dotenv").config();
const logger = require('../logger');
const mongoose = require('mongoose');
const BigNumber = require('bignumber.js');
const {writeFileSync} = require("fs");
const fs = require('fs');

async function processDataAtBlockHash(api, blockHash, nextBlkToProcess) {
    // const events = await api.query.system.events.at(blockHash);
    // await Promise.all(
    //     events.map(async ({event}) => {
    //         const {section, method, data} = event;
    //         if (section === 'nft') {
    //             const dataFetched = data.toHuman();
    //             await processNftEventData(dataFetched, method, api, processingOldBlock ? blockHash : null);
    //         }
    //     })
    // );
    try {
        const block = await api.rpc.chain.getBlock(blockHash);
        if (block) {
            const extrinsics = block.block.extrinsics.toHuman();
            console.log('Extrinsics:',extrinsics);
            extrinsics.map(extrinsic => {
                if (extrinsic.isSigned) {
                    // console.log('method:::', extrinsic.method);
                    // console.log('args:::', extrinsic.method.args);
                    const owner = extrinsic.signer.toString();
                    if (owner === '5CMSBT7CgKxnRkQTErCFx3mmRCRwmMegJmUdgCbkHQMS7Cx1') {
                        console.log('Users sent extrinsic::', extrinsics);
                        logger.info(extrinsics);
                        console.log('Block Number::', nextBlkToProcess);
                        // console.log('events::', events);
                        fs.appendFileSync('data.txt', `${extrinsics}. ${nextBlkToProcess}`);
                    }
                }
            });

            // const filterSignedNFTExtrinsics = extrinsics.filter(ext => ext.isSigned && ext.method.section === 'nft' &&
            //     (ext.method.method === 'burnBatch' || ext.method.method === 'burn'));
            // if (filterSignedNFTExtrinsics.length > 0) {
            //     await processNftExtrinsicData(filterSignedNFTExtrinsics);
            // }
        } else {
            logger.info(`Retrieving block details from rpc.chain.getBlock failed for hash ${blockHash}`)
        }
    } catch (e) {
        console.log('e::',e);
    }
}

async function main (networkName) {
    networkName = networkName || 'nikau';
    // const api = await Api.create({network: 'nikau'});
    const api = await Api.create({provider: 'wss://cennznet.unfrastructure.io/public/uncover?apikey=dev-debug-key'});
    logger.info(`Connect to cennznet network ${networkName}`);

    // const connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    // await mongoose.connect(connectionStr);

    // Scan the finalized block and store it in db
    // await api.rpc.chain
    //     .subscribeFinalizedHeads(async (head) => {
    //         const finalizedBlockAt = head.number.toNumber();
    //         await updateFinalizedBlock(finalizedBlockAt);
    // });

    // Watch the block (processed / finalized) and process the block that are not yet finalized and updated processedBlk in db
    async function watchBlock() {
        // while (true) {
            // const blockScanned = await LastBlockScan.findOne({});
            // logger.info(`Block scanned: ${blockScanned}`);
            // if (blockScanned) {
            //     const {processedBlock, finalizedBlock} = blockScanned;
            //     let nextBlkToProcess = new BigNumber(processedBlock).plus(1);
            //     const finalizeBlk = new BigNumber(finalizedBlock);

        //// 12171127
            let nextBlkToProcess = 12078743;// 12099817;//12097996;//12095681;//12080584; //12080263; // 12078904; //12078743;//12062278;//12058903;//12058772;//12058583;//12057805;//12056890;// 12056376;//12056184;//12056184;
            let finalizeBlk = 12250838;
                while (nextBlkToProcess<finalizeBlk) {
        // let nextBlkToProcess = 2413366;
                    console.log('At Block Number::',nextBlkToProcess);
                    const blockHash = await api.rpc.chain.getBlockHash(nextBlkToProcess);
                    await processDataAtBlockHash(api, blockHash, nextBlkToProcess);
                    // await updateProcessedBlockInDB(nextBlkToProcess);
                    nextBlkToProcess = nextBlkToProcess+1;
                }
            // } else {
            //     logger.info(`Database has no record in lastBlockScan table`);
            // }
            // await sleep(5000);
        // }
    }
    await watchBlock();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const networkName = process.env.NETWORK;
main(networkName).catch((err) => console.log(err));
