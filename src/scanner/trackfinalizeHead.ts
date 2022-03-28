import logger from "@/src/logger";

const { Api } = require("@cennznet/api");
import { createClient } from "redis";

async function main(networkName) {
	const api = await Api.create({ network: "azalea" });
	const redisClient = createClient();
	redisClient.on("error", (err) => {
		logger.error(err);
		logger.error("Error occured while connecting or accessing redis server");
	});
	await redisClient.connect();
	await api.rpc.chain.subscribeFinalizedHeads(async (head) => {
		const finalizedBlockAt = head.number.toString();
		logger.info(`finalizedBlockAt::${finalizedBlockAt}`);
		await redisClient.set("finalizedBlock", finalizedBlockAt);
	});
}

const networkName = process.env.NETWORK;
main(networkName).catch((err) => console.log(err));
