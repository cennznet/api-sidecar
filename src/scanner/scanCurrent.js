const { Api } = require('@cennznet/api');
require("dotenv").config();
const logger = require('../logger');
const { NftWallet, NftListing } = require('../mongo/models');
const mongoose = require('mongoose');

async function processExtrinsicData(extrinsics) {
    await Promise.all(
        extrinsics.map(async (extrinsic) =>{
            const args = extrinsic.method.args;
            switch (extrinsic.method.method) {
                case 'burnBatch': {
                    const owner = extrinsic.signer;
                    const collectionId = args[0];
                    const seriesId = args[1];
                    const serialNumbers = args[2];
                    await burnWalletNFT(owner, collectionId, seriesId, serialNumbers);
                }
                case 'burn':{
                    console.log('args:',args);
                    const token = args[0]; //args: [ [ '96', '0', '6' ] ]
                    const owner = extrinsic.signer;
                    console.log('token:', token);
                    console.log('owner:', owner);
                    await burnWalletNFT(owner, token[0], token[1], [token[2]]);
                }
            }
        })
    );
}

async function processEventData(dataFetched, method, api) {
    switch (method) {
        case 'CreateToken': {
            const tokenId = dataFetched[1];
            const owner = dataFetched[2];
            await saveWalletData(owner, [], tokenId);
        }
        case 'CreateSeries': {
            const collectionId = dataFetched[0];
            const seriesId = dataFetched[1];
            const quantity = dataFetched[2];
            const owner = dataFetched[3];
            let tokens = [];
            // for loop on quantity
            for (let i = 0; i < quantity; i++) {
                tokens.push([collectionId, seriesId, i]);
            }
            await saveWalletData(owner, [], tokenId);

        }
        case 'CreateAdditional': {
            const collectionId = dataFetched[0];
            const seriesId = dataFetched[1];
            const quantity = dataFetched[2];
            const owner = dataFetched[3];
            let tokens = [];
            const currentNextIndex = await api.query.nft.nextSerialNumber(collectionId, seriesId);
            let startIndex = currentNextIndex - quantity; // as the event has already occurred current next index will be next
            // get starting index
            for (let i = startIndex; i < quantity; i++) {
                tokens.push([collectionId, seriesId, i]);
            }
            await saveWalletData(owner, [], tokenId);
        }
        case 'Transfer': {
            const previousOwner = dataFetched[0];
            const tokenIds = dataFetched[1]; //list
            const newOwner = dataFetched[2];
            await transferTokens(previousOwner, newOwner, tokenIds);
        }
        case 'FixedPriceSaleListed': {
            const listingId = dataFetched[1];
            const listingDetails = (await api.query.nft.listings(listingId)).unwrapOrDefault();
            const details = listingDetails.asFixedPrice.toJSON();
            const tokens = details.tokens;
            const listingOwner = details.seller;
            // add listingId and tokens in db
            await saveListingData(listingId, listingOwner, tokens);
        }
        case 'AuctionOpen': {
            const listingId = dataFetched[1];
            const listingDetails = (await api.query.nft.listings(listingId)).unwrapOrDefault();
            const details = listingDetails.asAuction.toJSON();
            const tokens = details.tokens;
            const listingOwner = details.seller;
            // add listingId and tokens in db
            await saveListingData(listingId, listingOwner, tokens);
        }
        case 'FixedPriceSaleComplete': {
            const listingId = dataFetched[1];
            const newOwner = dataFetched[2];
            // search in db get the tokens and listing owner
            // move tokens from listing owner to newOwner
            await transferListingTokensToOwner(newOwner, listingId);
        }
        case 'AuctionSold': {
            const listingId = dataFetched[1];
            const newOwner = dataFetched[4];
            // search in db get the tokens and listing owner
            // move tokens from listing owner to newOwner
            await transferListingTokensToOwner(newOwner, listingId);
        }
        case 'FixedPriceSaleClosed': {
            const listingId = dataFetched[1];
            // delete listing from db
            await NftListing.findOneAndRemove(listingId);
        }
        case 'AuctionClosed': {
            const listingId = dataFetched[1];
            // delete listing from db
            await NftListing.findOneAndRemove(listingId);
        }
    }

}

async function main (networkName) {
    networkName = networkName || 'nikau';

    const api = await Api.create({network: networkName});
    logger.info(`Connect to cennznet network ${networkName}`);

    connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    console.log(connectionStr);
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
                        await processEventData(dataFetched, method, api);
                    }
                })
            );
            const block = await api.rpc.chain.getBlock(blockHash);
            const extrinsics = block.block.extrinsics.toHuman();
            const filterSignedNFTExtrinsics = extrinsics.filter(ext => ext.isSigned && ext.method.section === 'nft');
            console.log('filterSignedExtrinsics:', filterSignedNFTExtrinsics);
            if (filterSignedNFTExtrinsics.length > 0) {
                await processExtrinsicData(filterSignedNFTExtrinsics);
            }
        });
}

async function saveWalletData(address, activeListing, tokenList) {
    try {
        const tokens = tokenList.map(token => ({collectionId: token[0], seriesId: token[1], serialNumber: token[2]}));
        const nftWallet = new NftWallet({
            _id: address,
            activeListings: activeListing,
            tokens: tokens
        });
        await nftWallet.save();
    } catch (e) {
        logger.error('saving wallet data in db failed::',e);
    }
}

async function saveListingData(listingId, seller, tokenList) {
    try {
        const tokens = tokenList.map(token => ({collectionId: token[0], seriesId: token[1], serialNumber: token[2]}));
        const nftListing = new NftListing({
            _id: listingId,
            seller: seller,
            tokens: tokens
        });
        await nftListing.save();
        const sellerWallet = await NftWallet.findById(seller);
        let activeListing = sellerWallet ? sellerWallet.activeListing.push(listingId) : [listingId];
        const sellerTokens = sellerWallet ? sellerWallet.tokens : tokens;
        const nftWallet = new NftWallet({
            _id: seller,
            activeListings: activeListing,
            tokens: sellerTokens
        });
        await nftWallet.save();
    } catch (e) {
        logger.error('saving listing data in db failed::',e);
    }
}

async function transferListingTokensToOwner(newOwner, listingId) {
    try {
        const listingDetails = await NftListing.findById(listingId);
        const tokens = listingDetails.tokens;
        const previousOwner = listingDetails.seller;
        const previousOwnersWallet = await NftWallet.findById(previousOwner);
        let filterPreviousOwnersToken = previousOwnersWallet.tokens;
        let activeListing = previousOwnersWallet.activeListing;
        activeListing = activeListing.filter(list => list !== listingId);
        tokens.map(token => {
            filterPreviousOwnersToken = filterPreviousOwnersToken.filter(pToken => pToken.collectionId !== token.collectionId &&
                pToken.seriesId !== token.seriesId && pToken.serialNumber !== token.serialNumber);
        });
        const nftWallet1 = new NftWallet({
            _id: previousOwner,
            activeListings: activeListing,
            tokens: filterPreviousOwnersToken
        });
        await nftWallet1.save();
        const newOwnersWallet = await NftWallet.findById(newOwner);
        const newActiveListing = newOwnersWallet ? newOwnersWallet.activeListing.push(listingId) : [listingId];
        const newTokens = newOwnersWallet ? [...newOwnersWallet.tokens, ...tokens] : tokens;
        const nftWallet2 = new NftWallet({
            _id: newOwner,
            activeListings: newActiveListing,
            tokens: newTokens
        });
        await nftWallet2.save();
    } catch (e) {
        logger.error('transfer listing tokens to new owner failed::',e);
    }
}


async function transferTokens(previousOwner, newOwner, tokenIds) {
    try {
        const previousOwnersWallet = await NftWallet.findById(previousOwner);
        let filterPreviousOwnersToken = previousOwnersWallet.tokens;
        let activeListing = previousOwnersWallet.activeListing;
        tokenIds.map(token => {
            filterPreviousOwnersToken = filterPreviousOwnersToken.filter(pToken => pToken.collectionId.toString() !== token[0].toString() &&
                pToken.seriesId.toString() !== token[1].toString() && pToken.serialNumber.toString() !== token[2].toString());
        });
        const nftWallet1 = new NftWallet({
            _id: previousOwner,
            activeListings: activeListing,
            tokens: filterPreviousOwnersToken
        });
        await nftWallet1.save();
        const newOwnersWallet = await NftWallet.findById(newOwner);
        const newActiveListing = newOwnersWallet ? newOwnersWallet.activeListing : [];
        const tokens = tokenIds.map(token => ({collectionId: token[0], seriesId: token[1], serialNumber: token[2]}));
        const newTokens = newOwnersWallet ? [...newOwnersWallet.tokens, ...tokens] : tokens;
        const nftWallet2 = new NftWallet({
            _id: newOwner,
            activeListings: newActiveListing,
            tokens: newTokens
        });
        await nftWallet2.save();
    } catch (e) {
        logger.error('transfer listing tokens to new owner failed::',e);
    }
}

async function burnWalletNFT(owner, collectionId, seriesId, serialNumbers) {
    try {
        const ownersWallet = await NftWallet.findById(owner);
        let filterOwnersToken = ownersWallet.tokens;
        serialNumbers.map(serialNumber => {
            filterOwnersToken = filterOwnersToken.filter(pToken => pToken.collectionId.toString() !== collectionId.toString() &&
                pToken.seriesId.toString() !== seriesId && pToken.serialNumber.toString() !== serialNumber);
        });
        const activeListing = ownersWallet.activeListing;
        const nftWallet2 = new NftWallet({
            _id: owner,
            activeListings: activeListing,
            tokens: filterOwnersToken
        });
        await nftWallet2.save();
    } catch (e) {

    }
}

const networkName = process.env.NETWORK;
main(networkName).catch((err) => console.log(err));
