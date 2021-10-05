const mongoose = require('mongoose');
const { Schema, Number } = mongoose;
require('dotenv').config();

// Write some dummy data into the database
async function bootstrap() {
    connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    console.log(connectionStr);
    await mongoose.connect(connectionStr);

    const NftWalletSchema = new Schema({
    address: String,
    tokens: [{
        collectionId: Number,
        seriesId: Number,
        tokenId: Number,
    }]
    });

    const NftWallet = mongoose.model('NftWallet', NftWalletSchema);

    // Create an instance of model SomeModel
    const nftWallet = new NftWallet({
        address: '5FWizEtxJTb2wPjWEqtEDetYTjgmWRmUNvRpMBh6ZDX4JJCt',
        tokens: [
            {
                collectionId: 1,
                SeriesId: 1,
                SerialNumber: 13
            },
            {
                collectionId: 1,
                SeriesId: 1,
                SerialNumber: 12
            },
            {
                collectionId: 0,
                SeriesId: 0,
                SerialNumber: 0
            }
        ]
    });

    // Save the new model instance, passing a callback
    await nftWallet.save(function (err) {
        if (err) console.error(err);
    });
    const nftWallet2 = new NftWallet({ 
        address: '5FxQFnffWMLrJYH5gKhGMFYxiSboz2Vz5VFFueBGLqn5WiGd',
        tokens: [{
            collectionId: 3,
            SeriesId: 5,
            SerialNumber: 13
        }]
    });
    // Save the new model instance, passing a callback
    await nftWallet2.save(function (err) {
        if (err) console.error(err);
    })
}

bootstrap()
    .then(async () => {
        console.log("bootstrap success")
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });