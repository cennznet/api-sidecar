const { Api } = require('@cennznet/api');
const { saveListingData, saveWalletData } = require('./utils');
const mongoose = require('mongoose');
const { NftWallet, NftListing } = require('../mongo/models');

async function main () {
    // Create the API and wait until ready
    const api = await Api.create({network: 'nikau',});

    const connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    await mongoose.connect(connectionStr);
    const entries = await api.query.nft.tokenOwner.entries();
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
    console.log('NFT WALLET VERIFICATION...');
    await Promise.all (
        userList.map(async (user) => {
            const wallet = await NftWallet.findById(user);
            // return {user, tokens: wallet.tokens};
            const tokens = wallet.tokens;
            tokens.map(async (token) => {
                const owner = await api.query.nft.tokenOwner([token.collectionId, token.seriesId],token.serialNumber);
                if (owner.toString() === user.toString()) {
                    // console.log(`Successfully for token ${token} and owner ${owner}`);
                } else {
                    console.log(`UnSuccessfully for token ${token} and user ${user}`);
                    console.log(`Expected owners as ${owner}`);
                }
            });
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

    console.log('NFT Listing VERIFICATION...');
    await Promise.all (
        listingIds.map(async (listingId) => {
            const wallet = await NftListing.findById(listingId);
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
