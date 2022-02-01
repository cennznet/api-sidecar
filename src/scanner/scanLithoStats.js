const { NftSale, NftFixed, NftAuction  } = require('../mongo/models');
var fs = require('fs');
const mongoose = require('mongoose');
const { Api } = require('@cennznet/api');
require("dotenv").config();
const logger = require('../logger');
// const startAtBlock = 9410800;
// const currentBlock = 9903177;
const startAtBlock = 9802928; //9783656;//9771625; //9769651; //9767210; //9763224; //9757058; //9756493; //9744311; //9740293; // 9737842; //9692556; //9671405; //9656574; //9570844;  //9555935; //9553311;  //9551825; //9496964;// 9496659; // 9482563;// 9482431; //9412963;// 9412314; //9411953;//9410321;
const currentBlock = 9971169;

let uniqueTokensCreated = 0;
let seriesCreated = 0;
const listingDetails = [];
const salesDone = [];
let totalCENNZSale = 0;
let totalCPAYSale = 0;
const CENNZ = 1;
const CPAY = 2;

async function processLithoEventData(dataFetched, method, api, blockHash) {
    logger.info(`Event triggered::${method}`);
    switch (method) {
        case 'CreateToken': {
            uniqueTokensCreated++;
            break;
        }
        case 'CreateSeries': {
            seriesCreated++;
            break;
        }
        case 'FixedPriceSaleListed': {
            const listingId = dataFetched[1];
            let listingDetail;
            if (blockHash) {
                listingDetail = (await api.query.nft.listings.at(blockHash, listingId)).unwrapOrDefault();
            }
            const details = listingDetail.asFixedPrice.toJSON();
            listingDetails.push({listingId: listingId, details: details});
            const nftFixed = new NftFixed({
                _id: listingId,
                details: JSON.stringify(details),
                price: details.fixedPrice.toString(),
            });
            await nftFixed.save();
            break;
        }
        case 'AuctionOpen': {
            const listingId = dataFetched[1];
            let listingDetail;
            if (blockHash) {
                listingDetail = (await api.query.nft.listings.at(blockHash, listingId)).unwrapOrDefault();
            } else {
                listingDetail = (await api.query.nft.listings(listingId)).unwrapOrDefault();
            }
            const details = listingDetail.asAuction.toJSON();
            listingDetails.push({listingId: listingId, details: details});
            const nftAuction = new NftAuction({
                _id: listingId,
                details: JSON.stringify(details),
                price: details.reservePrice.toString(),
            });
            await nftAuction.save();
            break;
        }
        case 'FixedPriceSaleComplete': {
            const listingId = dataFetched[1];
            //const listingInfo = listingDetails.find(listing => listing.listingId);
            const listingInfo = await NftFixed.findById(listingId);
            if (listingInfo) {
                salesDone.push({
                    listingId,
                    details: listingInfo.details,
                    price: listingInfo.details.fixedPrice,
                    type: 'FixedSale'
                });
                logger.info({
                    listingId,
                    details: listingInfo.details,
                    price: listingInfo.details.fixedPrice,
                    type: 'FixedSale'
                });
                const nftSale = new NftSale({
                    _id: listingId,
                    details: listingInfo.details,
                    price: listingInfo.price.toString(),
                    type: 'FixedSale'
                });
                await nftSale.save();
            }
            break;
        }
        case 'Bid': {
            const listingId = dataFetched[1];
            const amount = dataFetched[2];
            await NftAuction.findByIdAndUpdate(listingId, {price: amount.toString()});
            break;
        }
        case 'AuctionSold': {
            const listingId = dataFetched[1];
            const listingInfo = await NftAuction.findById(listingId);
           // const listingInfo = listingDetails.find(listing => listing.listingId);
            if (listingInfo) {
                salesDone.push({
                    listingId,
                    details: listingInfo.details,
                    price: listingInfo.price,
                    type: 'Auction'
                });
                logger.info({
                    listingId,
                    details: listingInfo.details,
                    price: listingInfo.price,
                    type: 'Auction'
                });
                const nftSale = new NftSale({
                    _id: listingId,
                    details: listingInfo.details,
                    price: listingInfo.price,
                    type: 'Auction'
                });
                await nftSale.save();
            }
            break;
        }
    }

}

async function main (networkName) {
    networkName = networkName || 'azalea';

    const connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    await mongoose.connect(connectionStr);
    const provider = process.env.PROVIDER;
    const api = await Api.create({provider: provider});
    logger.info(`Connect to cennznet network ${networkName}`);
    for (let i = startAtBlock; i < currentBlock; i++)
    {
        const blockNumber = i;
        logger.info(`HEALTH CHECK => OK`);
        logger.info(`At blocknumber: ${blockNumber}`);
        //const blockHash = head.hash.toString();
        const blockHash = await api.rpc.chain.getBlockHash(i);
        const events = await api.query.system.events.at(blockHash);
        await Promise.all(
            events.map(async ({event}) => {
                const {section, method, data} = event;
                if (section === 'nft') {
                    const dataFetched = data.toHuman();
                    await processLithoEventData(dataFetched, method, api, blockHash );
                }
            })
        );
    }

    const salesJSON = salesDone.reduce((acc, sales) => {
        const listingId = sales.listingId;
        const details = sales.details;
        const price = sales.price;
        const paymentAsset = sales.details.paymentAsset;
        if (details.paymentAsset == CENNZ) {
            totalCENNZSale = totalCENNZSale + price.toNumber();
        } else if (details.paymentAsset == CPAY) {
            totalCPAYSale = totalCPAYSale + price.toNumber();
        }
        const type = sales.type;
        acc[listingId] = {details, type, price, paymentAsset}
        return acc;
    }, {});

    console.log('Total unique tokens created:',uniqueTokensCreated);
    console.log('Total series tokens created: ',seriesCreated);
    console.log('Total sale in CENNZ::', totalCENNZSale);
    console.log('Total sale in CPAY::', totalCPAYSale);
    console.log('Total listing::', listingDetails);
    console.log('Total Sales::', salesJSON);


    fs.writeFile('sales.json', JSON.stringify(salesJSON) );
    fs.writeFile('listings.txt', listingDetails);
}

const networkName = process.env.NETWORK;
main(networkName).catch((err) => console.log(err));
