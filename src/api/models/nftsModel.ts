import logger from "../../logger";
const { EventTracker } = require('../../mongo/models');

export async function fetchEventStream(tokenId) {
	try {
		console.log('*****');
		console.log('Reached fetchEventStream..');

		const eventStream = await EventTracker.find({ streamId: tokenId }).sort({version: "asc"}).exec();
		console.log('eventStream:',eventStream);
		return eventStream;
	} catch (err) {
		logger.error(err);
		return [];
	}
}

export async function fetchUsersNFTEvent(address, EventTracker) {
	try {
		const eventStream = await EventTracker.find({ signer: address, streamType: 0 }).sort({version: "asc"}).exec();
		console.log('eventStream::',eventStream);
		return eventStream;
	} catch (err) {
		logger.error(err);
		return [];
	}
}
