// common function
import { trackEventDataSet } from "../dbOperations";
import { bnToBn, extractTime } from "@polkadot/util";

export interface Params {
	name: string;
	value: string;
	type: string;
}

export async function extractTokenListingData(
	tokens,
	dataInserts,
	blockNumber,
	tokenData,
	owner
) {
	tokens.forEach((token) => {
		dataInserts.push([
			JSON.stringify(token),
			0,
			blockNumber,
			JSON.stringify(tokenData),
			owner,
		]);
	});
	await trackEventDataSet(dataInserts);
}

let blockTime;

// Convert a block number to date
export async function convertBlockToDate(api, blockNumber, date) {
	blockTime = blockTime ? blockTime : await api.consts.babe.expectedBlockTime;
	const value = blockTime.mul(bnToBn(blockNumber)).toNumber();
	const time = extractTime(Math.abs(value));
	const { days } = time;
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

// common function
export async function extractListingData(
	tokenIds,
	blockNumber,
	tokenData,
	owner,
	listingId,
	listingData
) {
	const tokens = [];
	let type = 0;
	tokenIds.forEach((tokenId) => {
		tokens.push([
			JSON.stringify(tokenId),
			type,
			blockNumber,
			JSON.stringify(tokenData),
			owner,
		]);
	});
	type = 1; // listing data
	tokens.push([
		listingId,
		type,
		blockNumber,
		JSON.stringify(listingData),
		owner,
	]);
	console.log("tokens::", tokens);
	await trackEventDataSet(tokens);
}
