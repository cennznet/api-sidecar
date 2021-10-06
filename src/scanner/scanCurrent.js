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
                    const token = args[0];
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
    logger.info('Event triggered::',method);
    switch (method) {
        case 'CreateToken': {
            const tokenId = dataFetched[1];
            const owner = dataFetched[2];
            await saveWalletData(owner, [], [tokenId]);
            break;
        }
        case 'CreateSeries': {
            const collectionId = dataFetched[0];
            const seriesId = dataFetched[1];
            const quantity = dataFetched[2];
            const owner = dataFetched[3];
            let tokens = [];
            for (let i = 0; i < quantity; i++) {
                tokens.push([collectionId, seriesId, i]);
            }
            await saveWalletData(owner, [], tokens);
            break;
        }
        case 'CreateAdditional': {
            const collectionId = dataFetched[0];
            const seriesId = dataFetched[1];
            const quantity = dataFetched[2];
            const owner = dataFetched[3];
            let tokens = [];
            const currentNextIndex = await api.query.nft.nextSerialNumber(collectionId, seriesId);
            let startIndex = currentNextIndex.toNumber() - quantity; // as the event has already occurred current next index will be next

            for (let i = startIndex; i < currentNextIndex.toNumber(); i++) {
                tokens.push([collectionId, seriesId, i]);
            }
            await saveWalletData(owner, [], tokens);
            break;
        }
        case 'Transfer': {
            const previousOwner = dataFetched[0];
            const tokenIds = dataFetched[1]; //list
            const newOwner = dataFetched[2];
            await transferTokens(previousOwner, newOwner, tokenIds);
            break;
        }
        case 'FixedPriceSaleListed': {
            const listingId = dataFetched[1];
            const listingDetails = (await api.query.nft.listings(listingId)).unwrapOrDefault();
            const details = listingDetails.asFixedPrice.toJSON();
            const tokens = details.tokens;
            const listingOwner = details.seller;
            // add listingId and tokens in db
            await saveListingData(listingId, listingOwner, tokens);
            break;
        }
        case 'AuctionOpen': {
            const listingId = dataFetched[1];
            const listingDetails = (await api.query.nft.listings(listingId)).unwrapOrDefault();
            const details = listingDetails.asAuction.toJSON();
            const tokens = details.tokens;
            const listingOwner = details.seller;
            // add listingId and tokens in db
            await saveListingData(listingId, listingOwner, tokens);
            break;
        }
        case 'FixedPriceSaleComplete': {
            const listingId = dataFetched[1];
            const newOwner = dataFetched[2];
            // search in db get the tokens and listing owner
            // move tokens from listing owner to newOwner
            await transferListingTokensToOwner(newOwner, listingId);
            break;
        }
        case 'AuctionSold': {
            const listingId = dataFetched[1];
            const newOwner = dataFetched[4];
            // search in db get the tokens and listing owner
            // move tokens from listing owner to newOwner
            await transferListingTokensToOwner(newOwner, listingId);
            break;
        }
        case 'FixedPriceSaleClosed': {
            const listingId = dataFetched[1];
            // delete listing from db
            await NftListing.findByIdAndRemove(listingId);
            // TODO - remove from NFTWallet
            break;
        }
        case 'AuctionClosed': {
            const listingId = dataFetched[1];
            // delete listing from db
            await NftListing.findByIdAndRemove(listingId);
            // TODO - remove from NFTWallet
            break;
        }
    }

}

async function main (networkName) {
    networkName = networkName || 'nikau';

    const api = await Api.create({network: networkName});
    logger.info(`Connect to cennznet network ${networkName}`);

    connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    logger.info(connectionStr);
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
            // Process extrinsic data only for burn and burnBatch operation
            const filterSignedNFTExtrinsics = extrinsics.filter(ext => ext.isSigned && ext.method.section === 'nft' &&
                (ext.method.method === 'burnBatch' || ext.method.method === 'burn'));
            if (filterSignedNFTExtrinsics.length > 0) {
                await processExtrinsicData(filterSignedNFTExtrinsics);
            }
        });
}

async function saveWalletData(address, activeListing, tokenList) {
    try {
        logger.info(`saving wallet data ${tokenList} for owner ${address} in db`);
        let tokens = tokenList.map(token => ({collectionId: token[0], seriesId: token[1], serialNumber: token[2]}));
        const exist = await NftWallet.findById(address).exec();
        if (exist) {
            tokens = [...exist.tokens, ...tokens];
        }
        const filter = { _id: address};
        const update = { tokens: tokens };
        const options = { upsert: true, new: true, setDefaultsOnInsert: true }; // create new if record does not exist, else update
        await NftWallet.updateOne(filter, update, options);

    } catch (e) {
        logger.error(`saving wallet data ${tokenList} for owner ${address} in db failed:: ${e}`);
    }
}

async function saveListingData(listingId, seller, tokenList) {
    try {
        logger.info(`saving listing for id ${listingId} for seller ${seller} in db`);
        const tokens = tokenList.map(token => ({collectionId: token[0], seriesId: token[1], serialNumber: token[2]}));
        const nftListing = new NftListing({
            _id: listingId,
            seller: seller,
            tokens: tokens
        });
        await nftListing.save();
        const sellerWallet = await NftWallet.findById(seller);
        const activeListings = sellerWallet ? [...sellerWallet.activeListings, listingId] : [listingId];
        const filter = { _id: seller};
        const update = { activeListings: activeListings };
        await NftWallet.updateOne(filter, update);
    } catch (e) {
        logger.error(`saving listing for id ${listingId} for seller ${seller} in db failed::${e}`);
    }
}

async function transferListingTokensToOwner(newOwner, listingId) {
    try {
        logger.info(`transfer listing with id ${listingId} to new owner ${newOwner}`);
        const listingDetails = await NftListing.findById(listingId);
        const tokens = listingDetails.tokens;
        logger.info(`Tokens in this listing[${listingId}]: ${tokens}`);
        const previousOwner = listingDetails.seller;

        const previousOwnersWallet = await NftWallet.findById(previousOwner);
        const filterPreviousOwnersToken = previousOwnersWallet.tokens;
        let activeListings = previousOwnersWallet.activeListings;
        activeListings = activeListings.filter(list => list !== listingId);
        const tokensFiltered = filterPreviousOwnersToken.filter((el) =>
            !tokens.find(( t ) =>
                t.collectionId === el.collectionId &&
                t.seriesId === el.seriesId &&
                t.serialNumber === el.serialNumber));

        // Remove tokens from previous owner
        const filter = { _id: previousOwner};
        const update = { activeListings: activeListings, tokens: tokensFiltered };
        await NftWallet.updateOne(filter, update);

        // Add tokens to new owner
        const newOwnersWallet = await NftWallet.findById(newOwner);
        const newTokens = newOwnersWallet ? [...newOwnersWallet.tokens, ...tokens] : tokens;
        const filter1 = { _id: newOwner };
        const update1 = { tokens: newTokens };
        const options1 = { upsert: true, new: true, setDefaultsOnInsert: true }; // create new if record does not exist, else update
        await NftWallet.updateOne(filter1, update1, options1);

        // delete listing id from db
        NftListing.findByIdAndRemove(listingId);

    } catch (e) {
        logger.error(`transfer listing with id ${listingId} to new owner ${newOwner} failed:: ${e}`);
    }
}


async function transferTokens(previousOwner, newOwner, tokenIds) {
    try {
        logger.info(`transfer ${tokenIds} tokens from ${previousOwner} to ${newOwner} `);
        const previousOwnersWallet = await NftWallet.findById(previousOwner);
        let filterPreviousOwnersToken = previousOwnersWallet.tokens;

        const tokensFiltered = filterPreviousOwnersToken.filter((el) =>
            !tokenIds.find(( t ) =>
                t[0].toString() === el.collectionId.toString() &&
                t[1].toString() === el.seriesId.toString() &&
                t[2].toString() === el.serialNumber.toString()));

        // Remove tokens from previous owner
        const filter = { _id: previousOwner};
        const update = { tokens: tokensFiltered };
        await NftWallet.updateOne(filter, update);

        // Add tokens to new owner
        const newOwnersWallet = await NftWallet.findById(newOwner);
        if (newOwnersWallet) {
            console.log('new owners wallet tokens::', newOwnersWallet.tokens);
        }
        const tokens = tokenIds.map(token => ({collectionId: token[0], seriesId: token[1], serialNumber: token[2]}));
        const newTokens = newOwnersWallet ? [...newOwnersWallet.tokens, ...tokens] : tokens;
        const filter1 = { _id: newOwner };
        const update1 = { tokens: newTokens };
        const options1 = { upsert: true, new: true, setDefaultsOnInsert: true }; // create new if record does not exist, else update
        await NftWallet.updateOne(filter1, update1, options1);
    } catch (e) {
        logger.error(`transfer ${tokenIds} tokens from ${previousOwner} to ${newOwner} failed::${e}`);
    }
}

async function burnWalletNFT(owner, collectionId, seriesId, serialNumbers) {
    try {
        logger.info(`Burn token: [${collectionId}, ${seriesId}, ${serialNumbers}]`);
        const ownersWallet = await NftWallet.findById(owner);
        const filterOwnersToken = ownersWallet.tokens;
        const tokensFiltered = filterOwnersToken.filter((el) =>
            !serialNumbers.find(( serialNumber ) =>
                collectionId.toString() === el.collectionId.toString() &&
                seriesId.toString() === el.seriesId.toString() &&
                serialNumber.toString() === el.serialNumber.toString()));

        // Remove tokens from previous owner
        const filter = { _id: owner};
        const update = { tokens: tokensFiltered };
        await NftWallet.updateOne(filter, update);
    } catch (e) {
        logger.error(`burn tokens [${collectionId}, ${seriesId}, ${serialNumbers}] from owner failed:: ${e}`,);
    }
}

const networkName = process.env.NETWORK;
main(networkName).catch((err) => console.log(err));
