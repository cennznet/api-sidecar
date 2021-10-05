const { Schema } = require('mongoose');

const NFT_WALLETS_COLLECTION = 'nftwallets';

const NftWalletSchema = new Schema({
    _id: String,
    tokens: [{
        collectionId: Number,
        seriesId: Number,
        serialNumber: Number,
    }],
    NFT_WALLETS_COLLECTION,
});

module.exports = {
    NftWalletSchema,
    NFT_WALLETS_COLLECTION,
}