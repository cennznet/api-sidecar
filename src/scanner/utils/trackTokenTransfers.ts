// Track transfers
import { trackEventData, trackEventDataSet } from "../dbOperations";
import { Params } from "@/src/scanner/utils/commonUtils";
import logger from "../../logger";

export async function trackTransferData(
	params: Params,
	date,
	txHash,
	blockNumber,
	owner
) {
	try {
		const tokenId = JSON.stringify(params[0].value);
		const newOwner = params[1].value;
		const tokenData = {
			eventData: {
				date: date,
				owner: newOwner,
				txHash: txHash,
			},
			eventType: "NFT_TRANSFERED",
		};
		const type = 0;
		await trackEventData(
			tokenId,
			type,
			blockNumber,
			JSON.stringify(tokenData),
			owner
		);
		logger.info("Transfer NFT done");
	} catch (e) {
		logger.error(
			`Error tracking token transfer with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

// Track batch of transfers
export async function trackTransferBatchData(
	params,
	date,
	txHash,
	blockNumber,
	owner
) {
	try {
		let tokenIds = [];
		let newOwner;
		if (params[2]) {
			// in new runtime > 50
			const collectionId = params[0].value;
			const seriesId = params[1].value;
			const serialNumbers = params[2].value;
			newOwner = params[3].value;
			serialNumbers.forEach((serialNumber) => {
				const tokenId = `[${collectionId.toString()},${seriesId},${serialNumber}]`;
				tokenIds.push(tokenId);
			});
		} else {
			// older runtime
			tokenIds = params[0].value; // tokenIds = tokens[]
			newOwner = params[1].value;
		}
		const tokenData = {
			eventData: {
				date: date,
				owner: newOwner,
				txHash: txHash,
			},
			eventType: "NFT_TRANSFERED",
		};
		const tokens = [];
		let type = 0; // nft token data
		tokenIds.forEach((tokenId) => {
			tokens.push([
				JSON.stringify(tokenId),
				type,
				blockNumber,
				JSON.stringify(tokenData),
				owner,
			]);
		});
		await trackEventDataSet(tokens);
		logger.info("Batch transfer NFT done");
	} catch (e) {
		logger.error(
			`Error tracking transfer batch data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}
