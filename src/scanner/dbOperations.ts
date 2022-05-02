import { config } from "dotenv";
import logger from "../logger";
const { EventTracker } = require('../mongo/models');
config();

export async function trackEventData(streamId, type, eventType, version, data, signer) {
	try {
		logger.info(`saving event for streamId ${streamId} for signer ${signer} with data ${data} in db`);
		//const tokens = tokenList.map(token => ({collectionId: token[0], seriesId: token[1], serialNumber: token[2]}));
		const eventTracker = new EventTracker({
			streamId: streamId,
			streamType: type,
			version: version, // blocknumber
			data: data,
			signer: signer,
			eventType: eventType,
		});
		await eventTracker.save();

	} catch (e) {
		logger.error(`saving event for streamId ${streamId} for signer ${signer} with data ${data} in db failed::${e}`);
	}
}

export async function trackEventDataSet(tokens) {
	try {
		// console.log('inside insertMany');
		// console.log('tokens::',tokens);
		const data = tokens.map((token) => {
			return {
				streamId: token[0].toString(),
				streamType: token[1],
				version: token[2],
				data: token[3],
				signer: token[4],
				eventType: token[5]
			};
		});
		// console.log('data:',data);
		logger.info(`saving multiple event data for  ${JSON.stringify(data)} in db`);
		await EventTracker.insertMany(data);
	} catch (e) {
		logger.error(`saving event data in db failed::${e}`);
	}
}
