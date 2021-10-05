const { Schema } = require('mongoose');

const NftWalletSchema = new Schema({
    _id: String,
    tokens: [{
        collectionId: Number,
        seriesId: Number,
        serialNumber: Number,
    }]
})

module.exports = {
    NftWalletSchema
}