// store in db all the relevant data for mint unique nft
import { trackEventData, trackEventDataSet } from "../dbOperations";
import { Api } from "@cennznet/api";
import { Params } from "./commonUtils";
import { u128 } from "@cennznet/types";
import logger from "../../logger";

export async function trackUniqueMintData(
	eventData: number[],
	api: Api,
	params: Params,
	date: Date,
	owner: string,
	txHash: string,
	blockNumber: number
) {
	try {
		const tokenId = JSON.stringify(eventData[1]); // tokenId in format [17,5,0] - [collectionId, seriesId, serialNo]
		const imgUrl = api.registry
			.createType(params[3].type, params[3].value)
			.toHuman();
		const tokenData = {
				imgUrl: imgUrl,
				date: date,
				owner: owner,
				txHash: txHash
		};
		const eventType = "NFT_CREATED"
		const type = 0;
		await trackEventData(
			tokenId,
			type,
			eventType,
			blockNumber,
			JSON.stringify(tokenData),
			owner
		);
		logger.info('Unique mint completed');
	} catch (e) {
		logger.error(
			`Error tracking unique mint data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

// mint series add all the tokens as per the count argument in the db
export async function trackTokenSeriesData(
	eventData: number[],
	api: Api,
	params: Params[],
	date: Date,
	owner: string,
	txHash: string,
	blockNumber: number
) {
	try {
		// https://github.com/cennznet/cennznet/pull/535/files
		// As per the changes, earlier for mint series single token event data at index 1 used to be array - https://uncoverexplorer.com/block/12047748
		const checkIfSingleTokenInSeries = Array.isArray(eventData[1]);
		const collectionId = eventData[0];
		const seriesId = checkIfSingleTokenInSeries ? eventData[1][1] : eventData[1];
		const noOfTokens = checkIfSingleTokenInSeries ? 1 : eventData[2]; // quantity
		const imageIndex = params.findIndex(p => p.name === 'metadataPath' || p.type === 'CrmlNftMetadataScheme' || p.type === 'MetadataScheme' || p.type === 'MetadataBaseURI') || 4;
		// @ts-ignore
		const imgUrl = api.registry
			.createType(params[imageIndex].type, params[imageIndex].value)
			.toHuman();
		const tokenData = {
				imgUrl: imgUrl,
				date: date,
				owner: owner,
				txHash: txHash,
		};
		const eventType = "NFT_CREATED";
		const type = 0; // nft token data
		await extractTokenList(
			0,
			noOfTokens,
			collectionId,
			seriesId,
			type,
			blockNumber,
			tokenData,
			owner,
			eventType
		);
		logger.info('Token series completed');
	} catch (e) {
		logger.error(
			`Error tracking token series data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

// mint series add additional nft for a given collection, find next serialNumber at this blockhash and add more
export async function trackAdditionalTokenData(
	params: Params,
	eventData: number[],
	api: Api,
	blockHash: string,
	date: Date,
	owner: string,
	txHash: string,
	blockNumber: number
) {
	try {
		const collectionId = eventData[0];
		const seriesId = eventData[1];
		const noOfTokens = eventData[2]; // quantity

		const [_nextSerialNumber, _imgUrl] = await Promise.all([
			api.query.nft.nextSerialNumber.at(blockHash, collectionId, seriesId),
			api.query.nft.seriesMetadataScheme
				? api.query.nft.seriesMetadataScheme.at(
						blockHash,
						collectionId,
						seriesId
				  )
				: api.query.nft.seriesMetadataURI.at(blockHash, collectionId, seriesId),
		]);
		const nextSerialNumber = (_nextSerialNumber as u128).toNumber();
		const imgUrl = _imgUrl.toHuman();

		const tokenData = {
				imgUrl: imgUrl,
				date: date,
				owner: owner,
				txHash: txHash,
		};
		const eventType = "NFT_CREATED";
		const type = 0; // nft token data
		const endIndex = nextSerialNumber + noOfTokens;
		const startIndex = nextSerialNumber;
		await extractTokenList(
			startIndex,
			endIndex,
			collectionId,
			seriesId,
			type,
			blockNumber,
			tokenData,
			owner,
			eventType
		);
		logger.info('Additional tokens completed');
	} catch (e) {
		logger.error(
			`Error tracking additional series data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}
// common function to extract tokens from start to end index
export async function extractTokenList(
	startIndex: number,
	endIndex: number,
	collectionId: string | number,
	seriesId: string | number,
	type: number,
	blockNumber: number,
	tokenData: {},
	owner: string,
	eventType: string
) {
	const tokens = [];
	for (let i = startIndex; i < endIndex; i++) {
		const serialNumber = i;
		const tokenId = `[${collectionId},${seriesId},${serialNumber}]`;
		tokens.push([tokenId, type, blockNumber, JSON.stringify(tokenData), owner, eventType]);
	}
	await trackEventDataSet(tokens);
}
