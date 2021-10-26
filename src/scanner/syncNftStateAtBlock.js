const { Api } = require('@cennznet/api');
const { saveListingData, saveWalletData, updateProcessedBlockInDB, updateFinalizedBlock } = require('./utils');
const mongoose = require('mongoose');
require("dotenv").config();
const logger = require('../logger');

async function main () {
    // Create the API and wait until ready
    const api = await Api.create({network: 'nikau',});

    const connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    await mongoose.connect(connectionStr);
    // get current block
    let signedBlock = await api.derive.chain.bestNumberFinalized();

    // get current block height and hash
    const currentHeight = signedBlock.toString();
    logger.info(`current height ${currentHeight}`);
    await updateProcessedBlockInDB(currentHeight);

    const entries = await api.query.nft.tokenOwner.entries();
    logger.info(`Got all token entries`);
    await Promise.all(
        entries.map(async (detail) => {
            const owner = detail[1].toString();
            const [collectionId, seriesId] = detail[0].toHuman()[0];

            const serialNumber = (detail[0].toHuman()[1]).replace(/,/g, '');
            await saveWalletData(owner, [], [[collectionId, seriesId, serialNumber]]);
        })
    );

    const listingEntries = await api.query.nft.listings.entries();
    await Promise.all(
        listingEntries.map(async (detail) => {
        const [listingId] = detail[0].toHuman();
        const listing = detail[1].toHuman();
        const listingAs = listing.hasOwnProperty('FixedPrice') ? listing.FixedPrice : listing.Auction;
        const tokens = listingAs.tokens;
        const seller = listingAs.seller;
        await saveListingData(listingId, seller, tokens);
    }));

    const finalizedBlock = await api.derive.chain.bestNumberFinalized();

    await updateFinalizedBlock(finalizedBlock.toString());

    await api.disconnect();
}

main().catch(console.error).finally(() => process.exit());
