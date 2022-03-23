import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config();
const prisma = new PrismaClient();

export async function trackEventData(streamId, type, version, data, signer) {
	await prisma.eventTracker.create({
		data: {
			streamId: streamId,
			type: type,
			version: version,
			data: data,
			signer: signer,
		},
	});
}

export async function trackEventDataSet(tokens) {
	const data = tokens.map((token) => {
		console.log("Token:", token);
		return {
			streamId: token[0].toString(),
			type: token[1],
			version: token[2],
			data: token[3],
			signer: token[4],
		};
	});
	const createMany = await prisma.eventTracker.createMany({
		data: data,
		skipDuplicates: true,
	});
	console.log("create many:", createMany);
}
