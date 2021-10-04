async function routes (fastify, options) {
    const collection = fastify.mongo.db.collection('nftWallet')

    fastify.get('/nftWallet/:address', async (request, reply) => {
      const result = await collection.findOne({ address: request.params.address })
      if (!result) {
        throw new Error('invalid value')
      }
      return result
    })
}

module.exports = routes