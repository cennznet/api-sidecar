// track burn related data
import { trackEventData, trackEventDataSet } from "../dbOperations";
import { Params } from "./commonUtils";
import logger from "../../logger";

export async function trackBurnData(
	params: Params,
	date: Date,
	txHash: string,
	blockNumber: number,
	owner: string
) {
	try {
		const tokenId = JSON.stringify(params[0].value);
		const tokenData = {
				date: date,
				owner: null,
				txHash: txHash,
		};
		const eventType = "NFT_BURNED";
		const type = 0;
		await trackEventData(
			tokenId,
			type,
			eventType,
			blockNumber,
			JSON.stringify(tokenData),
			owner
		);
		logger.info("Burn done");
	} catch (e) {
		logger.error(
			`Error tracking token burn data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

// track batch of burn tokens
export async function trackBurnBatchData(
	params: Params,
	date: Date,
	txHash: string,
	blockNumber: number,
	owner: string
) {
	try {
		const collectionId = params[0].value;
		const seriesId = params[1].value;
		const serialNumbers = params[2].value;
		const tokenData = {
				date: date,
				owner: null,
				txHash: txHash,
		};
		const eventType = "NFT_BURNED";
		const tokens = [];
		serialNumbers.forEach((serialNumber) => {
			const tokenId = `[${collectionId.toString()},${seriesId},${serialNumber}]`;
			tokens.push([tokenId, 0, blockNumber, JSON.stringify(tokenData), owner, eventType]);
		});
		await trackEventDataSet(tokens);

		logger.info("burn batch done..");
	} catch (e) {
		logger.error(
			`Error tracking token burn batch data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}
