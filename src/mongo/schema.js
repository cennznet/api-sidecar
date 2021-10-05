const { Schema } = require('mongoose');

const nftWalletSchema = new Schema({
    address: String,
    tokens: [{
        collectionId: Number,
        seriesId: Number,
        serialNumber: Number,
    }],
});

module.exports = {
    nftWalletSchema
}