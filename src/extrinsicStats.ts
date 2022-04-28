import axios from "axios";
import { createObjectCsvWriter as createCSV } from "csv-writer";

async function main(startDate, endDate, fileName) {
	let start = new Date(startDate);
	let end = new Date(endDate);

	let newend = end.setDate(end.getDate() + 1);
	end = new Date(newend);
	const sections = ["genericAsset", "cennzx", "staking", "nft", "erc20Peg"];
	const methods = {
		genericAsset: [
			"burn",
			"create",
			"createReserved",
			"mint",
			"transfer",
			"transferAll",
			"updateAssetInfo",
			"updatePermission",
		],
		cennzx: [
			"addLiquidity",
			"buyAsset",
			"removeLiquidity",
			"sellAsset",
			"setFeeRate",
		],
		staking: [
			"bond",
			"bondExtra",
			"setController",
			"nominate",
			"unbond",
			"withdrawUnbonded",
			"setPayee",
			"rebond",
			"chill",
		],
		nft: [
			"auction",
			"auctionBundle",
			"bid",
			"burn",
			"burnBatch",
			"buy",
			"cancelSale",
			"createCollection",
			"migrateToMetadataScheme",
			"mintAdditional",
			"mintSeries",
			"registerMarketplace",
			"sell",
			"sellBundle",
			"setOwner",
			"setSeriesName",
			"transfer",
			"transferBatch",
			"updateFixedPrice",
		],
		erc20Peg: ["depositClaim", "withdraw"],
	};
	//const sections = ["genericAsset"];
	const csvArray = [];
	while (start <= end) {
		const dateTimeInParts = start.toISOString().split("T");
		const date = dateTimeInParts[0];
		console.log(date);
		await Promise.all(
			sections.map(async (section) => {
				const mtds = methods[section];
				console.log("mtds::", mtds);
				await Promise.all(
					mtds.map(async (mtd) => {
						const csvObject = {};
						csvObject["date"] = date;
						const extrinsic = `${section}.${mtd}`;
						console.log("extrinsic::", extrinsic);
						csvObject["extrinsic"] = extrinsic;
						const response = await axios.get(
							`https://service.eks.centrality.cloud/cennznet-explorer-api/api/scan/extrinsics_count?section=${section}&method=${mtd}&date=${date}`
						);
						const [successfulExt, failedExt] = response?.data?.data;
						console.log("successfulExt:", successfulExt);
						console.log("failedExt:", failedExt);
						console.log(
							`successfulExt of type ${section}:: is ${successfulExt}`
						);
						console.log(`FailedExt of type ${section}:: is ${failedExt}`);
						csvObject["successfulExt"] = successfulExt;
						csvObject["failedExt"] = failedExt;
						csvArray.push(csvObject);
					})
				);
			})
		);
		let newDate = start.setDate(start.getDate() + 1);
		start = new Date(newDate);
	}
	console.log("csvObject::", csvArray);
	console.log("csvObject::", `${fileName}.csv`);
	const csv = createCSV({
		path: `${fileName}.csv`,
		header: [
			{ id: "date", title: "Date" },
			{ id: "extrinsic", title: "Extrinsic" },
			{ id: "successfulExt", title: "Success Txs" },
			{ id: "failedExt", title: "Failed Txs" },
		],
	});

	csv
		.writeRecords(
			csvArray
			//     [
			//     { genericAsset: 14, cennzx: 4 , staking: 2, nft: 2, ethBridge: 4, erc20Peg: 2,  total: 5, date: end},
			// ]
		)
		.then(() => {
			console.log("Done!");
		});
}

main(process.argv[2], process.argv[3], process.argv[4]).catch((err) =>
	console.log(err)
);
