const mongoose = require('mongoose');
const { Schema, Number } = mongoose;
require('dotenv').config();

// Write some dummy data into the database
async function bootstrap() {
    connectionStr = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
    console.log(connectionStr);
    await mongoose.connect(connectionStr);

    const NftWalletSchema = new Schema({
        _id: String,
        tokens: [{
            collectionId: Number,
            seriesId: Number,
            serialNumber: Number,
        }]
    });

    const NftWallet = mongoose.model('nftwallet', NftWalletSchema);

    // Create an instance of model SomeModel
    const nftWallet = new NftWallet({
        _id: '5FWizEtxJTb2wPjWEqtEDetYTjgmWRmUNvRpMBh6ZDX4JJCt',
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

    // Save the new model instance, passing a callback
    await nftWallet.save();
    const nftWallet2 = new NftWallet({ 
        _id: '5FxQFnffWMLrJYH5gKhGMFYxiSboz2Vz5VFFueBGLqn5WiGd',
        tokens: [{
            collectionId: 3,
            seriesId: 5,
            serialNumber: 13
        }]
    });
    // Save the new model instance, passing a callback
    await nftWallet2.save();
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