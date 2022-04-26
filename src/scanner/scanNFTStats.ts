import {createClient, RedisDefaultModules} from "redis";
import {EventRecord, RuntimeVersion} from "@polkadot/types/interfaces";
import { trackCancelSaleData } from "./utils/trackSaleCancel";
import {
	trackAuctionData,
	processAuctionSoldEvent,
	trackAuctionBundleData,
} from "./utils/trackTokenAuction";
import { trackBurnBatchData, trackBurnData } from "./utils/trackTokenBurn";
import { trackBuyData } from "./utils/trackTokenBuy";
import {
	trackAdditionalTokenData,
	trackTokenSeriesData,
	trackUniqueMintData,
} from "./utils/trackTokenCreation";
import { trackSeriesNameData } from "./utils/trackTokenName";
import { trackSellBundleData, trackSellData } from "./utils/trackTokenSell";
import {
	trackTransferBatchData,
	trackTransferData,
} from "./utils/trackTokenTransfers";
import { trackBidData } from "./utils/trackBidData";
// import {Singleton} from "./ApiService";
import { Api } from "@cennznet/api";
import { config } from "dotenv";
import logger from "../logger";
import { Vec } from "@polkadot/types-codec";
import { u8aToString } from "@polkadot/util";
//import workerpool from 'workerpool';
import * as workerpool from 'workerpool';
import { OverrideBundleType } from "@polkadot/types/types";

config();
export let supportedAssets = [];
let api;
//const redisClient = createClient();

// find the event for the extrinsic
function filterExtrinsicEvents(extrinsicIdx, events) {
	return events.filter(
		({ phase }) =>
			phase.isApplyExtrinsic && phase.asApplyExtrinsic.eqn(extrinsicIdx)
	);
}

function isExtrinsicSuccessful(extrinsicIdx, events) {
	return (
		events.findIndex((evt) => evt.event.method === "ExtrinsicSuccess") > -1
	);
}

function getExtrinsicParams(e) {
	return e.meta.args.map((arg, idx) => {
		const value = e.args[idx].toJSON();
		return {
			...arg.toJSON(),
			value,
		};
	});
}

function getTimestamp(block, api) {
	for (const e of block.extrinsics) {
		const call = api.findCall(e.callIndex);
		if (call.section === "timestamp" && call.method === "set") {
			const date = new Date(e.args[0].toJSON());
			if (isNaN(date.getTime())) {
				throw new Error("timestamp args type wrong");
			}
			return date;
		}
	}
}

async function processNFTExtrinsicData({
	method,
	params,
	events,
	txHash,
	blockTimestamp,
	api,
	blockNumber,
	owner,
	blockHash,
}) {
	logger.info(`Event triggered::${method}`);
	const date = blockTimestamp;
	const findNFTEvent = events.find(({ event }) => event.section === "nft");
	const eventData = findNFTEvent ? findNFTEvent.event.data.toJSON() : null;
	switch (method) {
		case "mintUnique": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for mintUnique extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}

			await trackUniqueMintData(
				eventData,
				api,
				params,
				date,
				owner,
				txHash,
				blockNumber
			);
			break;
		}
		case "mintSeries": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for mint series extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}

			await trackTokenSeriesData(
				eventData,
				api,
				params,
				date,
				owner,
				txHash,
				blockNumber
			);
			break;
		}
		case "mintAdditional": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for mintAdditional extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}

			await trackAdditionalTokenData(
				params,
				eventData,
				api,
				blockHash,
				date,
				owner,
				txHash,
				blockNumber
			);
			break;
		}
		case "setSeriesName": {
			await trackSeriesNameData(
				params,
				api,
				date,
				owner,
				txHash,
				blockHash,
				blockNumber
			);
			break;
		}
		case "transfer": {
			await trackTransferData(params, date, txHash, blockNumber, owner);
			break;
		}
		case "transferBatch": {
			await trackTransferBatchData(params, date, txHash, blockNumber, owner);
			break;
		}

		case "burn": {
			await trackBurnData(params, date, txHash, blockNumber, owner);
			break;
		}
		case "burnBatch": {
			await trackBurnBatchData(params, date, txHash, blockNumber, owner);
			break;
		}

		case "sellBundle": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for sell bundle extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}

			await trackSellBundleData(
				params,
				api,
				eventData,
				txHash,
				date,
				owner,
				blockNumber
			);
			break;
		}
		case "sell": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for sell extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}

			await trackSellData(
				params,
				api,
				eventData,
				txHash,
				date,
				owner,
				blockNumber
			);
			break;
		}

		case "buy": {
			await trackBuyData(
				params,
				blockHash,
				api,
				blockNumber,
				txHash,
				date,
				owner
			);
			break;
		}
		case "auction": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for auction extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}
			await trackAuctionData(
				eventData,
				params,
				api,
				txHash,
				date,
				owner,
				blockNumber
			);

			break;
		}
		case "auctionBundle": {
			if (!eventData) {
				logger.error(
					`Something wrong, no event found for auction bundle extrinsic at blockNumber ${blockNumber}`
				);
				break;
			}
			await trackAuctionBundleData(
				eventData,
				params,
				api,
				txHash,
				date,
				owner,
				blockNumber
			);

			break;
		}

		case "bid": {
			await trackBidData(
				params,
				api,
				blockHash,
				owner,
				txHash,
				date,
				blockNumber
			);
			break;
		}

		case "cancelSale": {
			await trackCancelSaleData(params, api, blockNumber, txHash, date, owner);
			break;
		}
	}
}

async function getBlockInfoFromRedis(redisClient) {
	try {

		// await redisClient.set('processedBlock', '1426148');
		// return [2000, 3000];
		const processedBlock = (await redisClient.get("processedBlock")) || "0";
		const finalizedBlock = (await redisClient.get("finalizedBlock")) || "0";
		return [parseInt(processedBlock), parseInt(finalizedBlock)];
	} catch (e) {
		logger.info(`error in get redis block info:${e}`);
	}
}



const redisClient = createClient();
async function main () {
	try {
		//const redisClient = createClient();
		const pool = workerpool.pool(__dirname + '/worker.js', {maxQueueSize: 5, maxWorker: 5, workerType: 'thread'});
		if (!redisClient.isOpen) {
			await redisClient.connect();
		}
		const [currentProcessedBlock, latestFinalizedBlock] = await getBlockInfoFromRedis(redisClient);
		while (currentProcessedBlock <= latestFinalizedBlock) {
		const processedBlockStr = (await redisClient.get("processedBlock")) || "0";
		const processedBlock = parseInt(processedBlockStr);
		// console.log('processedBlock::', processedBlock);
		// console.log('latestFinalizedBlock:', latestFinalizedBlock);
		const batchSize = 100;
		let targetNumber = Math.min(
			processedBlock + batchSize,
			latestFinalizedBlock,
		);
		const blocksToScan = targetNumber - processedBlock;
		const totalBatches = blocksToScan < 10 ? blocksToScan : 5;
		const startBlock = processedBlock;
		const chunk = Math.floor(blocksToScan / totalBatches);
		let indexMap = [];
		for (let batchStart = 1; batchStart <= totalBatches; batchStart++) {
			const startIndex = startBlock + (chunk * (batchStart - 1)) + 1;
			const lastBatch = batchStart === totalBatches;
			const endIndex = lastBatch ? targetNumber : startIndex + (chunk - 1);
			indexMap.push({startIndex, endIndex});
		}
		console.log('indexMap::', indexMap);
		console.log('pool.stats:', pool.stats());
		try {
			await Promise.all(indexMap.map(async (index) => {
				try {
					await pool.exec('trackNFTFromChunk', [index]);
					console.log('pool.stats:', pool.stats());
					console.log(`Done: ${JSON.stringify(index)}`);
				} catch (e) {
					console.error(`Error: ${JSON.stringify(index)}`);
					//throw e;
				}

			}));
			//	pool.terminate();
			//	console.log('pool.stats:',pool.stats());
			console.log('Done with all promises...');
			console.log('pool.stats:', pool.stats());
			// Terminate gracefully
			//await pool.terminate();
			console.log("***** Pool terminated gracefully *****");
			const block = parseInt(await redisClient.get("processedBlock"));
			console.log('current processed block in redis::', block);
			if (block < targetNumber) {
				await redisClient.set("processedBlock", targetNumber.toString());
			}
			//process.exit();
		} catch (e) {
			console.error('Global error');
			// Force terminate the pool (no need to continue after an error)
			await pool.terminate(true);
			throw e;
		}
		}
	} catch (e) {
		console.log('err::',e);
	}
}




function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => console.log(err));
