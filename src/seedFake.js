const { NftWallet, NftListing } = require('./mongo/models');
const mongoose = require('mongoose');
require('dotenv').config();

// Write some fake data into the database
async function seedFake() {
    connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    console.log(connectionStr);
    await mongoose.connect(connectionStr);

    // Create an instance of model SomeModel
    const nftWallet = new NftWallet({
        _id: '5FWizEtxJTb2wPjWEqtEDetYTjgmWRmUNvRpMBh6ZDX4JJCt',
        activeListings: [],
        tokens: [
            {
                collectionId: 1,
                seriesId: 1,
                serialNumber: 13
            },
            {
                collectionId: 1,
                seriesId: 1,
                serialNumber: 12
            },
            {
                collectionId: 0,
                seriesId: 0,
                serialNumber: 0
            }
        ]
    });
    await nftWallet.save();

    const nftWallet2 = new NftWallet({ 
        _id: '5FxQFnffWMLrJYH5gKhGMFYxiSboz2Vz5VFFueBGLqn5WiGd',
        activeListings: ['123'],
        tokens: [{
            collectionId: 3,
            seriesId: 5,
            serialNumber: 13
        }]
    });
    await nftWallet2.save();

    const nftListing = new NftListing({
        _id: '123',
        seller: '5FxQFnffWMLrJYH5gKhGMFYxiSboz2Vz5VFFueBGLqn5WiGd',
        tokens: [{
            collectionId: 3,
            seriesId: 5,
            serialNumber: 13
        }]
    });
    await nftListing.save();
}

module.exports = {
    seedFake
};

seedFake()
    .then(async () => {
        console.log("seed success")
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });