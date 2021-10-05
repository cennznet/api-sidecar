const { NFT_WALLETS_COLLECTION } = require('../../mongo/schema');

async function routes (fastify, options) {
    const collection = fastify.mongo.db.collection(NFT_WALLETS_COLLECTION)

    fastify.get('/nftWallet/:address', async (request, reply) => {
      const result = await collection.findOne({ _id: request.params.address })
      if (!result) {
        throw new Error('invalid value')
      }
      return result
    })
}

module.exports = routes