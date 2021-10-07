require("dotenv").config();
const logger = require('../logger');
const { NftWallet, NftListing, LastBlockScan } = require('../mongo/models');

async function updateProcessedBlockInDB(blockNumber, finalizedBlock) {
    const filter = {};
    const update = finalizedBlock ? { processedBlock: blockNumber, finalizedBlock: finalizedBlock } : { processedBlock: blockNumber };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true }; // create new if record does not exist, else update
    await LastBlockScan.updateOne(filter, update, options);
    logger.info(`Updated the last processed block in db..${blockNumber}`);
}
exports.updateProcessedBlockInDB = updateProcessedBlockInDB;

async function updateFinalizedBlock(finalizedBlock) {
    const filter = {};
    const update = { finalizedBlock: finalizedBlock };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true }; // create new if record does not exist, else update
    await LastBlockScan.updateOne(filter, update, options);
    logger.info(`Updated the last finalized block in db..${finalizedBlock}`);
}
exports.updateFinalizedBlock = updateFinalizedBlock;

async function processNftExtrinsicData(extrinsics) {
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
                    break;
                }
                case 'burn':{
                    const token = args[0];
                    const owner = extrinsic.signer;
                    await burnWalletNFT(owner, token[0], token[1], [token[2]]);
                    break;
                }
            }
        })
    );
}
exports.processNftExtrinsicData = processNftExtrinsicData;

async function processNftEventData(dataFetched, method, api, blockHash) {
    logger.info(`Event triggered::${method}`);
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
            let nextIndex;
            if (blockHash) {
                nextIndex = await api.query.nft.nextSerialNumber.at(blockHash, collectionId, seriesId);
            } else {
                nextIndex = await api.query.nft.nextSerialNumber(collectionId, seriesId);
            }
            let startIndex = nextIndex.toNumber() - quantity; // as the event has already occurred current next index will be next

            for (let i = startIndex; i < nextIndex.toNumber(); i++) {
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
            let listingDetails;
            if (blockHash) {
                listingDetails = (await api.query.nft.listings.at(blockHash, listingId)).unwrapOrDefault();
            } else {
                listingDetails = (await api.query.nft.listings(listingId)).unwrapOrDefault();
            }
            const details = listingDetails.asFixedPrice.toJSON();
            const tokens = details.tokens;
            const listingOwner = details.seller;
            // add listingId and tokens in db
            await saveListingData(listingId, listingOwner, tokens);
            break;
        }
        case 'AuctionOpen': {
            const listingId = dataFetched[1];
            let listingDetails;
            if (blockHash) {
                listingDetails = (await api.query.nft.listings.at(blockHash, listingId)).unwrapOrDefault();
            } else {
                listingDetails = (await api.query.nft.listings(listingId)).unwrapOrDefault();
            }
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
            break;
        }
        case 'AuctionClosed': {
            const listingId = dataFetched[1];
            // delete listing from db
            await NftListing.findByIdAndRemove(listingId);
            break;
        }
    }

}

exports.processNftEventData = processNftEventData;
async function saveWalletData(address, activeListing, tokenList) {
    try {
        logger.info(`saving wallet data ${tokenList} for owner ${address} in db`);
        let tokens = tokenList.map(token => ({collectionId: token[0], seriesId: token[1], serialNumber: token[2]}));
        const filter = { _id: address};
        const update = { $push: { tokens: { $each: tokens } } };
        const options = { upsert: true, new: true, setDefaultsOnInsert: true }; // create new if record does not exist, else update
        await NftWallet.updateOne(filter, update, options);
    } catch (e) {
        logger.error(`saving wallet data ${tokenList} for owner ${address} in db failed:: ${e}`);
    }
}

exports.saveWalletData = saveWalletData;

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

        const filter = { _id: seller};
        const update = { $push: { activeListings: listingId } };
        await NftWallet.updateOne(filter, update);
    } catch (e) {
        logger.error(`saving listing for id ${listingId} for seller ${seller} in db failed::${e}`);
    }
}

exports.saveListingData = saveListingData;

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
        const filter1 = { _id: newOwner };
        const update1 = { $push: { tokens: { $each: tokens } } };
        const options1 = { upsert: true, new: true, setDefaultsOnInsert: true }; // create new if record does not exist, else update
        await NftWallet.updateOne(filter1, update1, options1);

        // delete listing id from db
        await NftListing.findByIdAndRemove(listingId);

    } catch (e) {
        logger.error(`transfer listing with id ${listingId} to new owner ${newOwner} failed:: ${e}`);
    }
}


async function transferTokens(previousOwner, newOwner, tokenIds) {
    try {
        logger.info(`transfer ${tokenIds} tokens from ${previousOwner} to ${newOwner} `);
        const tokens = tokenIds.map(token => ({collectionId: token[0], seriesId: token[1], serialNumber: token[2]}));
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
        const filter1 = { _id: newOwner };
        const update1 = { $push: { tokens: { $each: tokens } } };
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
