const { NFT_LISTINGS_COLLECTION, NFT_WALLETS_COLLECTION } = require('../../mongo/models');

async function routes (fastify, options) {
    const collectionWallet = fastify.mongo.db.collection(NFT_WALLETS_COLLECTION);
    const collectionListings = fastify.mongo.db.collection(NFT_LISTINGS_COLLECTION);

    fastify.get('/nft/wallet/:address', async (request, reply) => {
      // TODO: suppress _id
      const result = await collectionWallet.findOne({ _id: request.params.address });
      if (!result) {
        throw new Error('invalid value')
      }
      return result
    })

    fastify.get('/nft/listing/:listingId', async (request, reply) => {
      // TODO: suppress _id
      const result = await collectionListings.findOne({ _id: request.params.listingId });
      if (!result) {
        throw new Error('invalid value')
      }
      return result
    })
}

module.exports = routes