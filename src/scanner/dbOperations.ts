import { DATABASE } from "../api/config/database";
import { config } from "dotenv";
config();

export async function trackEventData(streamId, type, version, data, signer) {
	const connection = await DATABASE.getConnection();
	await connection.query(
		`INSERT INTO event_tracker( stream_id, type, version, data, signer )  values(?,?,?,?,?)`,
		[streamId, type, version, data, signer]
	);
}

export async function trackEventDataSet(tokens) {
	const connection = await DATABASE.getConnection();
	await connection.query(
		`INSERT INTO event_tracker( stream_id, type, version, data, signer )  values ?`,
		[tokens]
	);
}

export async function runQuery(query) {
	const connection = await DATABASE.getConnection();
	const data = await connection.query(query);
	return data;
}
