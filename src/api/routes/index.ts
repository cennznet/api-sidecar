//const nft = require('../controller/nfts');
import {
	getTokenDetails,
	getListingDetails,
	getWalletDetails,
} from "../controller/nfts";

export async function routes(fastify) {
	fastify.get(
		"/nft/token/:collectionId/:seriesId/:serialNumber",
		getTokenDetails
	);
	fastify.get("/nft/listing/:listingId", getListingDetails);
	fastify.get("/nft/wallet/:address", getWalletDetails);
}
