import { createClient } from "redis";
import { EventRecord } from "@polkadot/types/interfaces";
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

import { Api } from "@cennznet/api";
import { config } from "dotenv";
import logger from "../logger";
import { Vec } from "@polkadot/types-codec";
import { u8aToString } from "@polkadot/util";

config();
export let supportedAssets = [];

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
		const processedBlock = (await redisClient.get("processedBlock")) || "0";
		const finalizedBlock = (await redisClient.get("finalizedBlock")) || "0";
		return [parseInt(processedBlock), parseInt(finalizedBlock)];
	} catch (e) {
		logger.info(`error in get redis block info:${e}`);
	}
}

async function fetchSupportedAssets(api) {
	const assets = await api.rpc.genericAsset.registeredAssets();

	const assetInfo = assets.map((asset) => {
		const [tokenId, { symbol, decimalPlaces }] = asset;
		return {
			id: tokenId.toString(),
			symbol: u8aToString(symbol),
			decimals: decimalPlaces.toNumber(),
		};
	});
	supportedAssets = assetInfo;
}

async function main(networkName) {
	networkName = networkName || "azalea";

	const api = await Api.create({ provider: process.env.provider });
	const currentRuntimeVersion = await api.rpc.state.getRuntimeVersion();
	await fetchSupportedAssets(api);
	const redisClient = createClient();
	await redisClient.connect();
	// await redisClient.set('processedBlock', '11408530');
	logger.info(`Connect to cennznet network ${networkName}`);
	let apiAt;
	while (true) {
		const [processedBlock, finalizedBlock] = await getBlockInfoFromRedis(
			redisClient
		);
		logger.info(`processedBlock::${processedBlock}`);
		logger.info(`finalizedBlock:${finalizedBlock}`);
		for (let i = processedBlock + 1; i <= finalizedBlock; i++) {
			const blockNumber = i;
			logger.info(`HEALTH CHECK => OK`);
			logger.info(`At blocknumber: ${blockNumber}`);
			const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
			console.log('blockHash:',blockHash.toString());
			const block = await api.rpc.chain.getBlock(blockHash);
			const allEvents = await api.query.system.events.at(blockHash);
			const extrinsics = block.block.extrinsics;
			const runtimeVersionAtBlockHash = await api.rpc.state.getRuntimeVersion(blockHash);

			if (runtimeVersionAtBlockHash.specVersion.toNumber() < currentRuntimeVersion.specVersion.toNumber()) {
				apiAt = await api.at(blockHash);
			}

			await Promise.all(
				extrinsics.map(async (e, index) => {
					const params = getExtrinsicParams(e);
					let call= apiAt ? apiAt.findCall(e.callIndex): api.findCall(e.callIndex);

					if (call.section === "nft") {
						const extrinsicRelatedEvents = filterExtrinsicEvents(
							index,
							allEvents
						);
						if (isExtrinsicSuccessful(index, extrinsicRelatedEvents)) {
							const blockTimestamp = getTimestamp(block.block, api);
							const txHash = e.hash.toString();
							const owner = e.signer.toString();
							const { method } = call;
							await processNFTExtrinsicData({
								method,
								params,
								events: extrinsicRelatedEvents,
								txHash,
								blockTimestamp,
								api,
								owner,
								blockNumber,
								blockHash,
							});
						}
					}
				})
			);
			const auctionSoldEvent = (allEvents as unknown as Vec<EventRecord>).find(
				({ event }) => event.section === "nft" && event.method === "AuctionSold"
			);
			if (auctionSoldEvent) {
				const blockTimestamp = getTimestamp(block.block, api);
				await processAuctionSoldEvent(
					auctionSoldEvent.event,
					blockTimestamp,
					blockNumber,
					blockHash.toString(),
					api
				);
			}
			await redisClient.set("processedBlock", blockNumber.toString());
		}
		await sleep(5000);
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const networkName = process.env.NETWORK;
main(networkName).catch((err) => console.log(err));
