const mongoose = require('mongoose');
const { Schema } = mongoose;


const NFT_WALLETS_COLLECTION = 'nftwallets';
const NFT_LISTINGS_COLLECTION = 'nftlistings';
const NFT_SALE = 'SALE';
const NFT_FIXED = 'NFT_FIXED';
const NFT_AUCTION = 'NFT_AUCTION';
const LAST_BLOCK_SCANNED = 'lastBlockScan'

const NftWalletSchema = new Schema({
    _id: String, // CENNZnet ss58 address
    activeListings: [String], // u128 listings
    tokens: [{
        collectionId: Number,
        seriesId: Number,
        serialNumber: Number,
    }],
}, { collection: NFT_WALLETS_COLLECTION });
NftWalletSchema.index({ tokens: 1 });

const NftListingSchema = new Schema({
    _id: String, // u128 is too large for js Number type
    seller: String, // CENNZnet ss58 address
    tokens: [{
        collectionId: Number,
        seriesId: Number,
        serialNumber: Number,
    }],
}, { collection: NFT_LISTINGS_COLLECTION });
NftListingSchema.index({ tokens: 1 });


const NftSaleSchema = new Schema({
    _id: String, // listing id
    details: String,
    price: String,
    type: String
}, { collection: NFT_SALE });

const NftFixedSchema = new Schema({
    _id: String, // listing id
    details: String,
    price: String,
}, { collection: NFT_FIXED });

const NftAuctionSchema = new Schema({
    _id: String, // listing id
    details: String,
    price: String,
}, { collection: NFT_AUCTION });


const LastBlockScanSchema = new Schema({
    _id: String,
    processedBlock: { type: String, default: '0' },
    finalizedBlock: String
}, { collection: LAST_BLOCK_SCANNED })

module.exports = {
    NftListing: mongoose.model('NftListing', NftListingSchema),
    NftWallet: mongoose.model('NftWallet', NftWalletSchema),
    LastBlockScan: mongoose.model('LastBlockScan', LastBlockScanSchema),
    NftSale: mongoose.model('NftSale', NftSaleSchema),
    NftFixed: mongoose.model('NftFixed', NftFixedSchema),
    NftAuction: mongoose.model('NftAuction', NftAuctionSchema),
    NFT_LISTINGS_COLLECTION,
    NFT_WALLETS_COLLECTION,
    LAST_BLOCK_SCANNED,
    NFT_AUCTION,
    NFT_FIXED,
    NFT_SALE,
}
