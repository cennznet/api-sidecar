// token series name update
import { Params } from "./commonUtils";
import { Api } from "@cennznet/api";
import { u128 } from "@cennznet/types";
import { extractTokenList } from "./trackTokenCreation";
import logger from "../../logger";

export async function trackSeriesNameData(
	params: Params,
	api: Api,
	date: Date,
	owner: string,
	txHash: string,
	blockHash: string,
	blockNumber: number
) {
	try {
		const collectionId = params[0].value;
		const seriesId = params[1].value;
		const name = api.registry
			.createType(params[2].type, params[2].value)
			.toHuman();
		const tokenData = {
				name: name,
				date: date,
				owner: owner,
				txHash: txHash,
		};
		const eventType = "SERIES_NAMED";
		const type = 0; // nft token data
		const nextSerialNumber = (
			(await api.query.nft.nextSerialNumber.at(
				blockHash,
				collectionId,
				seriesId
			)) as u128
		).toNumber();
		await extractTokenList(
			0,
			nextSerialNumber,
			collectionId,
			seriesId,
			type,
			blockNumber,
			tokenData,
			owner,
			eventType
		);
		logger.info('Series name updated');
	} catch (e) {
		logger.error(
			`Error tracking token series name with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}
