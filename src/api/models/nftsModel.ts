import { DATABASE } from "../config/database";

export const nftsModel = {
	fetchEventStream: async function (tokenId) {
		const connection = await DATABASE.getConnection();
		let res = [{}];
		try {
			res = await connection.execute(
				`SELECT * FROM event_tracker where stream_id = ? ORDER BY version ASC`,
				[tokenId]
			);
			connection.release();
		} catch (err) {
			console.error(err);
			connection.release();
			return false;
		}
		return res.length > 0 ? res : null;
	},
	fetchUsersNFTEvent: async function (address) {
		const connection = await DATABASE.getConnection();
		let res = [{}];
		try {
			res = await connection.execute(
				`SELECT * FROM event_tracker where signer = ? and type = 0 ORDER BY version ASC`,
				[address]
			);
			connection.release();
		} catch (err) {
			console.error(err);
			connection.release();
			return false;
		}
		return res.length > 0 ? res : null;
	},
};
