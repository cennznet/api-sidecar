const Fastify = require('fastify');
const mongoConnector = require('./mongo.js');
const nftWallet = require('./routes/nftWallet.js');
require('dotenv').config();

const fastify = Fastify({
  logger: true
})
fastify.register(mongoConnector)
fastify.register(nftWallet)

fastify.listen(3000, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})