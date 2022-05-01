import axios from "axios";
import { createObjectCsvWriter as createCSV } from "csv-writer";
const fs = require('fs');
const request = require('request');

interface SectionsChartData {
	sections: string[];
	failedExts: number[];
	successfulExts: number[];
}

interface SectionMethodsChartData {
	section: string;
	methods: string[];
	failedExts: number[];
	successfulExts: number[];
}

interface SectionData {
	section: string;
	successfulExt: string;
	failedExt: string;
}

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
	const csvArray = [];
	while (start <= end) {
		const dateTimeInParts = start.toISOString().split("T");
		const date = dateTimeInParts[0];
		console.log("date:", date);
		await Promise.all(
			sections.map(async (section) => {
				const mtds = methods[section];
				await Promise.all(
					mtds.map(async (mtd) => {
						const csvObject = {};
						csvObject["date"] = date;
						const extrinsic = `${section}.${mtd}`;
						csvObject["extrinsic"] = extrinsic;
						const response = await axios.get(
							`https://service.eks.centrality.cloud/cennznet-explorer-api/api/scan/extrinsics_count?section=${section}&method=${mtd}&date=${date}`
						);
						const [successfulExt, failedExt] = response?.data?.data;
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
	const csv = createCSV({
		path: `${fileName}.csv`,
		header: [
			{ id: "date", title: "Date" },
			{ id: "extrinsic", title: "Extrinsic" },
			{ id: "successfulExt", title: "Success Txs" },
			{ id: "failedExt", title: "Failed Txs" },
		],
	});
	const sectionAggregation = {};
	csvArray.forEach(extEntry => {
		const sectionName = extEntry.extrinsic.split(".")[0];
		const sectionMethodName = extEntry.extrinsic.split(".")[1];
		if(sectionAggregation[sectionName]){
			const successfulEx = sectionAggregation[sectionName].successfulExt + extEntry.successfulExt;
			const failedEx = sectionAggregation[sectionName].failedExt + extEntry.failedExt;
			sectionAggregation[sectionName] =  {
				...sectionAggregation[sectionName],
				successfulExt: successfulEx,
				failedExt: failedEx,
			}
			if(sectionAggregation[sectionName][sectionMethodName]){
				const successfulEx = sectionAggregation[sectionName][sectionMethodName].successfulExt + extEntry.successfulExt;
				const failedEx = sectionAggregation[sectionName][sectionMethodName].failedExt + extEntry.failedExt;
				sectionAggregation[sectionName][sectionMethodName] = {
					successfulExt: successfulEx,
					failedExt: failedEx
				}
			}
			else{
				sectionAggregation[sectionName][sectionMethodName] = {
					successfulExt: extEntry.successfulExt,
					failedExt: extEntry.failedExt
				}
			}
		}
		else {
			sectionAggregation[sectionName] = {
				successfulExt: extEntry.successfulExt,
				failedExt: extEntry.failedExt,
				[sectionMethodName]: {
					successfulExt: extEntry.successfulExt,
					failedExt: extEntry.failedExt,
				}
			};
		}
	});
	console.info("sectionAggregation", sectionAggregation)
	const sects = Object.keys(sectionAggregation);
	const sectionsChartData: SectionsChartData = {
		sections: sects,
		successfulExts: sects.map(section => sectionAggregation[section].successfulExt),
		failedExts: sects.map(section => sectionAggregation[section].failedExt)
	}
	await createSectionsGraph(sectionsChartData, fileName);
	const sectionMethodsGraphDatas: SectionMethodsChartData[] = sects.map(section => {
		const methods = Object.keys(sectionAggregation[section]).filter(method => method !== "successfulExt" && method !== "failedExt");
		const successfulExts = methods.map(method => sectionAggregation[section][method].successfulExt );
		const failedExts = methods.map(method => sectionAggregation[section][method].failedExt);
		return {
			section,
			methods,
			failedExts,
			successfulExts
		}
	});
	const createSectionsGraphProms = sectionMethodsGraphDatas.map(async chartData => {return await createSectionMethodsGraph(chartData, fileName);});
	await Promise.all(createSectionsGraphProms);
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

const createSectionMethodsGraph = (sectionMethodsData: SectionMethodsChartData, chartTitle:string) => {
	const quickChartURL = 'https://quickchart.io/chart/create';
	const totalTransactionCount = sectionMethodsData.successfulExts.reduce((a, b) => a + b, 0) + sectionMethodsData.failedExts.reduce((a, b) => a + b, 0);
	const post_data = {
		chart: {
			type: 'bar',
			data: {
				'labels': sectionMethodsData.methods,
				datasets: [
					{
						label: 'Successful Extrinsics',
						backgroundColor: 'rgb(75, 192, 192)',
						data: sectionMethodsData.successfulExts,
					},
					{
						label: 'Failed Extrinsics',
						backgroundColor: 'rgb(255, 99, 132)',
						data: sectionMethodsData.failedExts,
					},
				]
			},
			options: {
				title: {
					display: true,
					text: `CENNZnet ${sectionMethodsData.section} Module Transactions ${chartTitle}\n\t ${totalTransactionCount} Total Transactions`,
				},
				scales: {
					xAxes: [
						{
							stacked: false,
						},
					],
					yAxes: [
						{
							stacked: false,
						},
					],
				},
			},
		}
	}
	const createChartProm = new Promise((resolve, reject) => {
		request.get({ url: quickChartURL, method: "POST", json: true, body: post_data }, function (error, response, body) {
			if (!error) {
				const filePath = "charts/"
				if (!fs.existsSync(filePath)){
					fs.mkdirSync(filePath);
				}
				request(body['url']).pipe(fs.createWriteStream(`${filePath}/${sectionMethodsData.section}_${chartTitle}.png`)).on('close', () => {
					resolve(body['url']);
				});
			} else {
				reject(response);
			}
		});
	})
	createChartProm
		.then(chartUrl => {
			console.log(chartUrl)
		})
		.catch((err) => {
			console.error(err)
			return false;
		})
	return true;
}

const createSectionsGraph = (sectionsData: SectionsChartData, chartTitle:string) => {
	const quickChartURL = 'https://quickchart.io/chart/create';
	const totalTransactionCount = sectionsData.successfulExts.reduce((a, b) => a + b, 0) + sectionsData.failedExts.reduce((a, b) => a + b, 0)
	const post_data = {
		chart: {
			type: 'bar',
			data: {
				'labels': sectionsData.sections,
				datasets: [
					{
						label: 'Successful Extrinsics',
						backgroundColor: 'rgb(75, 192, 192)',
						data: sectionsData.successfulExts,
					},
					{
						label: 'Failed Extrinsics',
						backgroundColor: 'rgb(255, 99, 132)',
						data: sectionsData.failedExts,
					},
				]
			},
			options: {
				title: {
					display: true,
					text: `CENNZnet Module Transactions ${chartTitle}\n\t ${totalTransactionCount} Total Transactions`,
				},
				scales: {
					xAxes: [
						{
							stacked: false,
						},
					],
					yAxes: [
						{
							stacked: false,
						},
					],
				},
			},
		}
	}
	const createChartProm = new Promise((resolve, reject) => {
		request.get({ url: quickChartURL, method: "POST", json: true, body: post_data }, function (error, response, body) {
			if (!error) {
				const filePath = "charts/"
				if (!fs.existsSync(filePath)){
					fs.mkdirSync(filePath);
				}
				request(body['url']).pipe(fs.createWriteStream(`${filePath}/CENNZnet_module_${chartTitle}.png`)).on('close', () => {
					resolve(body['url']);
				});
			} else {
				reject(response);
			}
		});
	})
	createChartProm
		.then(chartUrl => {
			console.log(chartUrl)
		})
		.catch((err) => {
			console.error(err)
			return false;
		})
	return true;
};

main(process.argv[2], process.argv[3], process.argv[4]).catch((err) =>
	console.log(err)
);
