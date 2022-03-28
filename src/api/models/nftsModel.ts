import { PrismaClient } from "@prisma/client";
import logger from "../../logger";

const prisma = new PrismaClient();
export async function fetchEventStream(tokenId) {
	try {
		const eventStream = await prisma.eventTracker.findMany({
			where: {
				streamId: tokenId,
			},
			orderBy: {
				version: "asc",
			},
		});
		return eventStream;
	} catch (err) {
		logger.error(err);
		return [];
	}
}

export async function fetchUsersNFTEvent(address) {
	try {
		const eventStream = await prisma.eventTracker.findMany({
			where: {
				signer: address,
				type: 0,
			},
			orderBy: {
				version: "asc",
			},
		});
		return eventStream;
	} catch (err) {
		logger.error(err);
		return [];
	}
}
