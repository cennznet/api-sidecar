const { Api } = require('@cennznet/api');
require("dotenv").config();
const logger = require('../logger');

function processExtrinsicData(extrinsics) {
    extrinsics.map(extrinsic =>{
        const args = extrinsic.method.args;
        switch (extrinsic.method.method) {
            case 'setOwner': {
                // update collection owner
                const collectionId = args[0];
                const newOwner = args[1];

            }
            case 'sellBundle':{
                // need to check
            }
            case 'buy': {

            }
            case 'auctionBundle': {

            }
        }
    })
}

function processEventData(dataFetched, method) {
    switch (method) {
        case 'CreateToken': {
            const collectionId = dataFetched[0];
            const tokenId = dataFetched[1];
            const owner = dataFetched[2];
            // call db
        }
        case 'CreateSeries': {
            const collectionId = dataFetched[0];
            const seriesId = dataFetched[1];
            const quantity = dataFetched[2];
            const owner = dataFetched[3];
            // for loop on quantity
        }
        case 'CreateAdditional': {
            const collectionId = dataFetched[0];
            const seriesId = dataFetched[1];
            const quantity = dataFetched[2];
            const owner = dataFetched[3];
            // need to find the last serial number from db
            // for loop on quantity
        }
        case 'CreateCollection': {
            const collectionId = dataFetched[0];
            const collectionName = dataFetched[1];
            const owner = dataFetched[2];
            // add owner to collection
        }
        case 'Transfer': {
            const previousOwner = dataFetched[0];
            const tokenIds = dataFetched[1]; //list
            const newOwner = dataFetched[2];
            // update previousOwner to new owner for all tokenIds
        }
        case 'Burn': {
            const collectionId = dataFetched[0];
            const seriesId = dataFetched[1];
            const serialNumbers = dataFetched[2]; //list
            // delete all tokens [...serialNumbers]
        }
    }
}

async function main (networkName, startBlockNumber, endBlockNumber) {
    networkName = networkName || 'nikau';

    const api = await Api.create({network: networkName});
    logger.info(`Connect to cennznet network ${networkName}`);

    for (let blockNumber = startBlockNumber; blockNumber <= endBlockNumber; blockNumber++) {
            logger.info(`HEALTH CHECK => OK`);
            logger.info(`At blocknumber: ${blockNumber}`);
            const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
            // const blockHash = head.hash.toString();
            const events = await api.query.system.events.at(blockHash);
            events.map(async ({event}) => {
                const { section, method, data } = event;
                if (section === 'nft') {
                    const dataFetched = data.toHuman();
                    processEventData(dataFetched, method);
                }
            });
            const block = await api.rpc.chain.getBlock(blockHash);
            const extrinsics = block.block.extrinsics.toHuman();
            const filterSignedNFTExtrinsics = extrinsics.filter(ext => ext.isSigned && ext.method.section === 'nft');
            console.log('filterSignedExtrinsics:', filterSignedNFTExtrinsics);
            processExtrinsicData(filterSignedNFTExtrinsics);
        }
}


const networkName = process.env.NETWORK;
const startBlockNumber = 0, endBlockNumber = process.env.BLOCKNUMBER
main(networkName, startBlockNumber, endBlockNumber).catch((err) => console.log(err));
