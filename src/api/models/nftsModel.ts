import { PrismaClient } from "@prisma/client";

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
		console.log("eventStream::", eventStream);
		return eventStream;
	} catch (err) {
		console.error(err);
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
		console.log("eventStream::", eventStream);
		return eventStream;
	} catch (err) {
		return false;
	}
}
