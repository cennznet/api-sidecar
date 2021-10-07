const { Api } = require('@cennznet/api');
const { saveListingData, saveWalletData, updateLastBlockInDB } = require('./utils');
const mongoose = require('mongoose');
const { NftWallet, NftListing  } = require('../mongo/models');
require("dotenv").config();
const logger = require('../logger');

async function main () {
    // Create the API and wait until ready
    const api = await Api.create({network: 'nikau',});

    const connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    await mongoose.connect(connectionStr);
    // get current block
    const signedBlock = await api.rpc.chain.getBlock();

    // get current block height and hash
    const currentHeight = signedBlock.block.header.number;
    const blockHash = signedBlock.block.header.hash;
    await updateLastBlockInDB(currentHeight, blockHash);

    const entries = await api.query.nft.tokenOwner.entries();
    logger.info(`Got all token entries`);
    const users = [];
    await Promise.all(
        entries.map(async (detail) => {
            const owner = detail[1].toString();
            users.push(owner);
            const [collectionId, seriesId] = detail[0].toHuman()[0];

            const serialNumber = (detail[0].toHuman()[1]).replace(/,/g, '');
            await saveWalletData(owner, [], [[collectionId, seriesId, serialNumber]]);
        })
    );

    const userUniqueList = new Set(users);
    const userList = Array.from(userUniqueList);
    logger.info('NFT WALLET VERIFICATION...');
    await Promise.all (
        userList.map(async (user) => {
            const wallet = await NftWallet.findById(user);
            if (!wallet) {
                console.log(`Wallet not found for user ${user}`);
            } else {
                const tokens = wallet.tokens;
                tokens.map(async (token) => {
                    const owner = await api.query.nft.tokenOwner([token.collectionId, token.seriesId], token.serialNumber);
                    if (owner.toString() !== user.toString()) {
                        logger.info(`UnSuccessfully for token ${token} and user ${user}`);
                        logger.info(`Expected owners as ${owner}`);
                    }
                });
            }
        })
    );

    const listingIds = []
    const listingEntries = await api.query.nft.listings.entries();
    await Promise.all(
        listingEntries.map(async (detail) => {
        const [listingId] = detail[0].toHuman();
        const listing = detail[1].toHuman();
        const listingAs = listing.hasOwnProperty('FixedPrice') ? listing.FixedPrice : listing.Auction;
        const tokens = listingAs.tokens;
        const seller = listingAs.seller;
        listingIds.push(listingId);
        await saveListingData(listingId, seller, tokens);
    }));

    logger.info('NFT Listing VERIFICATION...');
    await Promise.all (
        listingIds.map(async (listingId) => {
            const wallet = await NftListing.findById(listingId);
            if (!wallet) {
                logger.info(`Listing not found for listing id ${listingId}`);
            } else {
                const seller = wallet.seller;
                const tokens = wallet.tokens;
                const listing = (await api.query.nft.listings(listingId)).toHuman();
                const listingAs = listing.hasOwnProperty('FixedPrice') ? listing.FixedPrice : listing.Auction;
                if (listingAs.seller.toString() === seller.toString() && arraysAreEqual(listingAs.tokens, tokens)) {
                    // console.log(`Successfully for token ${token} and owner ${owner}`);
                } else {
                    console.log(`UnSuccessfully match for listing Id ${listingId} and tokens expected ${tokens} and seller ${seller}`);
                    console.log(`Received owners as ${listingAs.seller} and tokens ${listingAs.tokens} `);
                }
            }
        })
    );

    await api.disconnect();
}

function arraysAreEqual(chainTokens, dbTokens){
    dbTokens.map(dt => {
       if (chainTokens.find(ct => ct[0].toString() === dt.collectionId.toString() &&
           ct[1].toString() === dt.seriesId.toString() &&
           ct[2].toString() === dt.serialNumber.toString())) {
         // exist
       } else {
           return false;
       }
    })
    return true;
}

main().catch(console.error).finally(() => process.exit());
