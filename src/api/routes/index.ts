import {
	getTokenDetails,
	getListingDetails,
	getWalletDetails,
} from "../controller/nfts";
import fastifyMongo from 'fastify-mongodb';
const { EVENT_TRACKER } = require('../../mongo/models');
const mongoConnector = require('../mongo.js');

export async function routes(fastify) {
	// const connectionStr = `${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`;
	const eventTracker = fastify.mongo.db.collection(EVENT_TRACKER);
	// fastify.register(require('fastify-cors'), {
	// 	"origin": '*',
	// })
	//console.log('fastify:',fastify);
	//fastify.register(mongoConnector)
	//const collectionEventTracker = fastify.mongo.db.collection(EVENT_TRACKER);
	//const eventProof = fastify.mongo.db.collection(EVENT_TRACKER);
	// const nftData = await eventTracker.find({ streamId: '[56,94,0]' }).sort({version: "asc"});
	// console.log('nftData:',nftData);
	fastify.get(
		"/nft/token/:collectionId/:seriesId/:serialNumber",eventTracker,
		getTokenDetails
	);
	fastify.get("/nft/listing/:listingId", getListingDetails);
	fastify.get("/nft/wallet/:address", getWalletDetails);
}
