import { trackEventData, trackEventDataSet } from "./dbOperations";
import { bnToBn, extractTime } from "@polkadot/util";

let blockTime;

async function convertBlockToDate(api, blockNumber, date) {
	blockTime = blockTime ? blockTime : await api.consts.babe.expectedBlockTime;
	const value = blockTime.mul(bnToBn(blockNumber)).toNumber();
	const time = extractTime(Math.abs(value));
	const { days } = time;
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

export async function trackUniqueMintData(
	eventData,
	api,
	params,
	date,
	owner,
	txHash,
	blockNumber
) {
	try {
		const tokenId = JSON.stringify(eventData[1]); // tokenId in format [17,5,0] - [collectionId, seriesId, serialNo]
		const imgUrl = api.registry
			.createType(params[3].type, params[3].value)
			.toHuman();
		const tokenData = {
			eventData: {
				imgUrl: imgUrl,
				date: date,
				owner: owner,
				txHash: txHash,
			},
			eventType: "NFT_CREATED",
		};
		const type = 0;
		await trackEventData(
			tokenId,
			type,
			blockNumber,
			JSON.stringify(tokenData),
			owner
		);
	} catch (e) {
		console.log(
			`Error tracking unique mint data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function trackTokenSeriesData(
	eventData,
	api,
	params,
	date,
	owner,
	txHash,
	blockNumber
) {
	try {
		const collectionId = eventData[0];
		const seriesId = eventData[1];
		const noOfTokens = eventData[2]; // quantity
		const imgUrl = api.registry
			.createType(params[4].type, params[4].value)
			.toHuman();
		const tokenData = {
			eventData: {
				imgUrl: imgUrl,
				date: date,
				owner: owner,
				txHash: txHash,
			},
			eventType: "NFT_CREATED",
		};
		const type = 0; // nft token data
		await extractTokenList(
			0,
			noOfTokens,
			collectionId,
			seriesId,
			type,
			blockNumber,
			tokenData,
			owner
		);
	} catch (e) {
		console.log(
			`Error tracking token series data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function trackAdditionalTokenData(
	params,
	eventData,
	api,
	blockHash,
	date,
	owner,
	txHash,
	blockNumber
) {
	try {
		const collectionId = eventData[0];
		const seriesId = eventData[1];
		const noOfTokens = eventData[2]; // quantity
		const nextSerialNumber = (
			await api.query.nft.nextSerialNumber.at(blockHash, collectionId, seriesId)
		).toNumber();
		const imgUrl = api.query.nft.seriesMetadataScheme
			? (
					await api.query.nft.seriesMetadataScheme.at(
						blockHash,
						collectionId,
						seriesId
					)
			  ).toHuman()
			: (
					await api.query.nft.seriesMetadataURI.at(
						blockHash,
						collectionId,
						seriesId
					)
			  ).toHuman();
		const tokenData = {
			eventData: {
				imgUrl: imgUrl,
				date: date,
				owner: owner,
				txHash: txHash,
			},
			eventType: "NFT_CREATED",
		};
		const type = 0; // nft token data
		const endIndex = nextSerialNumber + noOfTokens;
		const startIndex = nextSerialNumber;
		await extractTokenList(
			startIndex,
			endIndex,
			collectionId,
			seriesId,
			type,
			blockNumber,
			tokenData,
			owner
		);
	} catch (e) {
		console.log(
			`Error tracking additional series data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function extractTokenList(
	startIndex,
	endIndex,
	collectionId,
	seriesId,
	type,
	blockNumber,
	tokenData,
	owner
) {
	const tokens = [];
	for (let i = startIndex; i < endIndex; i++) {
		const serialNumber = i;
		const tokenId = `[${collectionId},${seriesId},${serialNumber}]`;
		tokens.push([tokenId, type, blockNumber, JSON.stringify(tokenData), owner]);
	}
	await trackEventDataSet(tokens);
}

export async function trackSeriesNameData(
	params,
	api,
	date,
	owner,
	txHash,
	blockHash,
	blockNumber
) {
	try {
		const collectionId = params[0].value;
		const seriesId = params[1].value;
		const name = api.registry
			.createType(params[2].type, params[2].value)
			.toHuman();
		const tokenData = {
			eventData: {
				name: name,
				date: date,
				owner: owner,
				txHash: txHash,
			},
			eventType: "SERIES NAMED",
		};
		const type = 0; // nft token data
		const nextSerialNumber = (
			await api.query.nft.nextSerialNumber.at(blockHash, collectionId, seriesId)
		).toNumber();
		await extractTokenList(
			0,
			nextSerialNumber,
			collectionId,
			seriesId,
			type,
			blockNumber,
			tokenData,
			owner
		);
	} catch (e) {
		console.log(
			`Error tracking token series name with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function trackTransferData(
	params,
	date,
	txHash,
	blockNumber,
	owner
) {
	try {
		const tokenId = JSON.stringify(params[0].value);
		const newOwner = params[1].value;
		const tokenData = {
			eventData: {
				date: date,
				owner: newOwner,
				txHash: txHash,
			},
			eventType: "TRANSFER",
		};
		const type = 0;
		await trackEventData(
			tokenId,
			type,
			blockNumber,
			JSON.stringify(tokenData),
			owner
		);
	} catch (e) {
		console.log(
			`Error tracking token transfer with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function trackTransferBatchData(
	params,
	date,
	txHash,
	blockNumber,
	owner
) {
	try {
		let tokenIds = [];
		let newOwner;
		if (params[2]) {
			// in new runtime > 50
			const collectionId = params[0].value;
			const seriesId = params[1].value;
			const serialNumbers = params[2].value;
			newOwner = params[3].value;
			serialNumbers.forEach((serialNumber) => {
				const tokenId = `[${collectionId.toString()},${seriesId},${serialNumber}]`;
				tokenIds.push(tokenId);
			});
		} else {
			// older runtime
			tokenIds = params[0].value; // tokenIds = tokens[]
			newOwner = params[1].value;
		}
		const tokenData = {
			eventData: {
				date: date,
				owner: newOwner,
				txHash: txHash,
			},
			eventType: "TRANSFER",
		};
		const tokens = [];
		let type = 0; // nft token data
		tokenIds.forEach((tokenId) => {
			tokens.push([
				JSON.stringify(tokenId),
				type,
				blockNumber,
				JSON.stringify(tokenData),
				owner,
			]);
		});
		await trackEventDataSet(tokens);
	} catch (e) {
		console.log(
			`Error tracking transfer batch data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function trackBurnData(params, date, txHash, blockNumber, owner) {
	try {
		const tokenId = JSON.stringify(params[0].value);
		const tokenData = {
			eventData: {
				date: date,
				owner: null,
				txHash: txHash,
			},
			eventType: "BURN",
		};
		const type = 0;
		await trackEventData(
			tokenId,
			type,
			blockNumber,
			JSON.stringify(tokenData),
			owner
		);
		console.log("Burn done");
	} catch (e) {
		console.log(
			`Error tracking token burn data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function trackBurnBatchData(
	params,
	date,
	txHash,
	blockNumber,
	owner
) {
	try {
		const collectionId = params[0].value;
		const seriesId = params[1].value;
		const serialNumbers = params[2].value;
		const tokenData = {
			eventData: {
				date: date,
				owner: null,
				txHash: txHash,
			},
			eventType: "BURN",
		};
		const tokens = [];
		serialNumbers.forEach((serialNumber) => {
			const tokenId = `[${collectionId.toString()},${seriesId},${serialNumber}]`;
			tokens.push([tokenId, 0, blockNumber, JSON.stringify(tokenData), owner]);
		});
		await trackEventDataSet(tokens);

		console.log("burn batch done..");
	} catch (e) {
		console.log(
			`Error tracking token burn batch data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

async function extractListingData(
	tokenIds,
	blockNumber,
	tokenData,
	owner,
	listingId,
	listingData
) {
	const tokens = [];
	let type = 0;
	tokenIds.forEach((tokenId) => {
		tokens.push([
			JSON.stringify(tokenId),
			type,
			blockNumber,
			JSON.stringify(tokenData),
			owner,
		]);
	});
	type = 1; // listing data
	tokens.push([
		listingId,
		type,
		blockNumber,
		JSON.stringify(listingData),
		owner,
	]);
	console.log("tokens::", tokens);
	await trackEventDataSet(tokens);
}

export async function trackSellBundleData(
	params,
	api,
	eventData,
	txHash,
	date,
	owner,
	blockNumber
) {
	try {
		const tokenIds = params[0].value;
		const buyer = params[1].value;
		const paymentAsset = params[2].value;
		const fixedPrice = api.registry
			.createType(params[3].type, params[3].value)
			.toString();
		const duration = params[4].value;
		const marketPlaceId = params[5] ? params[5].value : null;
		const listingId = eventData[1];
		console.log("fixed Price::", fixedPrice);
		const tokenData = {
			eventData: {
				type: "Fixed",
				txHash: txHash,
				listingId: listingId,
				amount: fixedPrice,
				assetId: paymentAsset,
				date: date,
				owner: owner,
			},
			eventType: "LISTING_STARTED",
		};
		console.log("tokenData:", tokenData);
		console.log("data::", date);
		const closeDate = await convertBlockToDate(
			api,
			duration + blockNumber,
			date
		);
		const listingData = {
			eventData: {
				type: "Fixed",
				assetId: paymentAsset,
				sellPrice: fixedPrice,
				txHash: txHash,
				date: date,
				seller: owner,
				buyer: buyer,
				tokenIds: JSON.stringify(tokenIds),
				close: closeDate,
				marketPlaceId: marketPlaceId,
			},
			eventType: "LISTING_STARTED",
		};
		console.log("listingData:", listingData);

		await extractListingData(
			tokenIds,
			blockNumber,
			tokenData,
			owner,
			listingId,
			listingData
		);
	} catch (e) {
		console.log(
			`Error tracking sell bundle data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function trackSellData(
	params,
	api,
	eventData,
	txHash,
	date,
	owner,
	blockNumber
) {
	try {
		const tokenIds = params[0].value;
		const buyer = params[1].value;
		const paymentAsset = params[2].value;
		const fixedPrice = api.registry
			.createType(params[3].type, params[3].value)
			.toString();
		const duration = params[4].value;
		const marketPlaceId = params[5] ? params[5].value : null;
		const listingId = eventData[1];
		const tokenData = {
			eventData: {
				type: "Fixed",
				txHash: txHash,
				listingId: listingId,
				amount: fixedPrice,
				assetId: paymentAsset,
				date: date,
				owner: owner,
			},
			eventType: "LISTING_STARTED",
		};
		const closeDate = await convertBlockToDate(
			api,
			duration + blockNumber,
			date
		);
		console.log("date in sell:", duration + blockNumber);
		const listingData = {
			eventData: {
				type: "Fixed",
				assetId: paymentAsset,
				sellPrice: fixedPrice,
				txHash: txHash,
				date: date,
				seller: owner,
				buyer: buyer,
				tokenIds: JSON.stringify([tokenIds]),
				close: closeDate,
				marketPlaceId: marketPlaceId,
			},
			eventType: "LISTING_STARTED",
		};
		await extractListingData(
			[tokenIds],
			blockNumber,
			tokenData,
			owner,
			listingId,
			listingData
		);
	} catch (e) {
		console.log(
			`Error tracking sell data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

async function extractTokenListingData(
	tokens,
	dataInserts,
	blockNumber,
	tokenData,
	owner
) {
	tokens.forEach((token) => {
		dataInserts.push([
			JSON.stringify(token),
			0,
			blockNumber,
			JSON.stringify(tokenData),
			owner,
		]);
	});
	await trackEventDataSet(dataInserts);
}

export async function trackBuyData(
	params,
	blockHash,
	api,
	blockNumber,
	txHash,
	date,
	owner
) {
	try {
		const listingId = params[0].value;
		console.log("listingId::", listingId);
		console.log("blockHash:", blockHash.toString());
		const blockHashBeforeBuy = (
			await api.rpc.chain.getBlockHash(blockNumber - 1)
		).toString();
		const listingDetail = (
			await api.query.nft.listings.at(blockHashBeforeBuy, listingId)
		).unwrapOrDefault();
		const details = listingDetail.asFixedPrice.toJSON();
		console.log("details::", details);
		const dataInserts = [];
		const listingData = {
			eventData: {
				type: "Fixed",
				assetId: details.paymentAsset,
				price: details.fixedPrice,
				txHash: txHash,
				date: date,
				seller: details.seller.toString(),
				buyer: details.buyer ? details.buyer.toString() : owner,
				tokenIds: JSON.stringify(details.tokens),
			},
			eventType: "LISTING_CLOSED",
		};
		dataInserts.push([
			listingId,
			1,
			blockNumber,
			JSON.stringify(listingData),
			owner,
		]);
		const tokenData = {
			eventData: {
				type: "Fixed",
				txHash: txHash,
				listingId: listingId,
				amount: details.fixedPrice,
				assetId: details.paymentAsset,
				date: date,
				owner: owner,
			},
			eventType: "LISTING_CLOSED",
		};
		await extractTokenListingData(
			details.tokens,
			dataInserts,
			blockNumber,
			tokenData,
			owner
		);
		console.log("Buy done");
	} catch (e) {
		console.log(
			`Error tracking buy listing data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

async function extractAuctionData(
	listingId,
	blockNumber,
	listingData,
	tokenId,
	tokenData,
	owner
) {
	const dataInserts = [];
	dataInserts.push([listingId, 1, blockNumber, JSON.stringify(listingData)]);
	dataInserts.push([
		JSON.stringify(tokenId),
		0,
		blockNumber,
		JSON.stringify(tokenData),
		owner,
	]);
	await trackEventDataSet(dataInserts);
}

export async function trackAuctionData(
	eventData,
	params,
	api,
	txHash,
	date,
	owner,
	blockNumber
) {
	try {
		const listingId = eventData[1];
		const tokenId = params[0].value;
		const paymentAsset = params[1].value;
		const reservedPrice = api.registry
			.createType(params[2].type, params[2].value)
			.toString();
		const duration = params[3].value;
		const listingData = {
			eventData: {
				type: "Auction",
				assetId: paymentAsset,
				sellPrice: reservedPrice,
				txHash: txHash,
				date: date,
				seller: owner,
				tokenIds: JSON.stringify([tokenId]),
				close: new Date(duration + blockNumber),
			},
			eventType: "LISTING_STARTED",
		};
		const tokenData = {
			eventData: {
				type: "Auction",
				txHash: txHash,
				listingId: listingId,
				amount: reservedPrice,
				assetId: paymentAsset,
				date: date,
				owner: owner,
			},
			eventType: "LISTING_STARTED",
		};
		await extractAuctionData(
			listingId,
			blockNumber,
			listingData,
			tokenId,
			tokenData,
			owner
		);
		console.log("Auction done");
	} catch (e) {
		console.log(
			`Error tracking auction data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function trackAuctionBundleData(
	eventData,
	params,
	api,
	txHash,
	date,
	owner,
	blockNumber
) {
	try {
		const listingId = eventData[1];
		const tokenIds = params[0].value;
		const paymentAsset = params[1].value;
		const reservedPrice = api.registry
			.createType(params[2].type, params[2].value)
			.toString();
		const duration = params[3].value;
		const closeDate = await convertBlockToDate(
			api,
			duration + blockNumber,
			date
		);
		const listingData = {
			eventData: {
				type: "Auction",
				assetId: paymentAsset,
				sellPrice: reservedPrice,
				txHash: txHash,
				date: date,
				seller: owner,
				tokenIds: JSON.stringify(tokenIds),
				close: closeDate,
			},
			eventType: "LISTING_STARTED",
		};
		const tokenData = {
			eventData: {
				type: "Auction",
				txHash: txHash,
				listingId: listingId,
				amount: reservedPrice,
				assetId: paymentAsset,
				date: date,
				owner: owner,
			},
			eventType: "LISTING_STARTED",
		};
		const dataInserts = [];
		dataInserts.push([
			listingId,
			1,
			blockNumber,
			JSON.stringify(listingData),
			owner,
		]);
		await extractTokenListingData(
			tokenIds,
			dataInserts,
			blockNumber,
			tokenData,
			owner
		);
		console.log("Bundle Auction done");
	} catch (e) {
		console.log(
			`Error tracking auction bundle data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function trackBidData(
	params,
	api,
	blockHash,
	owner,
	txHash,
	date,
	blockNumber
) {
	try {
		const listingId = params[0].value;
		const amount = api.registry
			.createType(params[1].type, params[1].value)
			.toString();
		const listingDetail = (
			await api.query.nft.listings.at(blockHash, listingId)
		).unwrapOrDefault();
		const details = listingDetail.asAuction.toJSON();
		console.log("details::", details);
		const dataInserts = [];
		const listingData = {
			eventData: {
				type: "Auction",
				assetId: details.paymentAsset,
				currentBid: amount,
				currentBidSetter: owner,
				txHash: txHash,
				date: date,
				seller: details.seller.toString(),
				tokenIds: JSON.stringify(details.tokens),
			},
			eventType: "NFT_BID",
		};
		dataInserts.push([listingId, 1, blockNumber, JSON.stringify(listingData)]);
		const tokenData = {
			eventData: {
				txHash: txHash,
				listingId: listingId,
				amount: amount,
				assetId: details.paymentAsset,
				date: date,
				currentBidSetter: owner,
			},
			eventType: "NFT_BID",
		};
		await extractTokenListingData(
			details.tokens,
			dataInserts,
			blockNumber,
			tokenData,
			owner
		);
		console.log("Bid done");
	} catch (e) {
		console.log(
			`Error tracking token bid data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function trackCancelSaleData(
	params,
	api,
	blockNumber,
	txHash,
	date,
	owner
) {
	try {
		const listingId = params[0].value;
		const blockHashBeforeBuy = (
			await api.rpc.chain.getBlockHash(blockNumber - 1)
		).toString();
		const listingDetail = (
			await api.query.nft.listings.at(blockHashBeforeBuy, listingId)
		).unwrapOrDefault();
		let details, type, price;
		if (listingDetail.isFixedPrice) {
			details = listingDetail.asFixedPrice.toJSON();
			type = "Fixed";
			price = details.fixedPrice;
		} else {
			details = listingDetail.asAuction.toJSON();
			type = "Auction";
			price = details.reservePrice;
		}
		const dataInserts = [];
		const listingData = {
			eventData: {
				type: type,
				assetId: details.paymentAsset,
				price: price.toString(),
				txHash: txHash,
				date: date,
				seller: details.seller.toString(),
				tokenIds: JSON.stringify(details.tokens),
			},
			eventType: "LISTING_CANCELED",
		};
		dataInserts.push([
			listingId,
			1,
			blockNumber,
			JSON.stringify(listingData),
			owner,
		]);
		const tokenData = {
			eventData: {
				txHash: txHash,
				listingId: listingId,
				amount: price.toString(),
				assetId: details.paymentAsset,
				date: date,
				seller: details.seller.toString(),
			},
			eventType: "LISTING_CANCELED",
		};
		await extractTokenListingData(
			details.tokens,
			dataInserts,
			blockNumber,
			tokenData,
			owner
		);
		console.log("cancelSale done");
	} catch (e) {
		console.log(
			`Error tracking sale cancel data with params ${JSON.stringify(
				params
			)}, error ${e}`
		);
	}
}

export async function processAuctionSoldEvent(
	event,
	blockTimestamp,
	blockNumber,
	blockHash,
	api
) {
	try {
		const { data } = event;
		const date = blockTimestamp;
		let [, listingId, assetId, price, winner] = data.toJSON();
		const blockHashBeforeBuy = (
			await api.rpc.chain.getBlockHash(blockNumber - 1)
		).toString();
		const listingDetail = (
			await api.query.nft.listings.at(blockHashBeforeBuy, listingId)
		).unwrapOrDefault();
		const details = listingDetail.asAuction.toJSON();
		const dataInserts = [];
		const closeDate = await convertBlockToDate(api, details.close, date);
		const listingData = {
			eventData: {
				type: "Auction",
				assetId: assetId,
				price: price.toString(),
				txHash: blockHash,
				date: date,
				seller: details.seller.toString(),
				buyer: winner,
				tokenIds: JSON.stringify(details.tokens),
				close: closeDate,
			},
			eventType: "LISTING_CLOSED",
		};
		dataInserts.push([
			listingId,
			1,
			blockNumber,
			JSON.stringify(listingData),
			null,
		]);
		const tokenData = {
			eventData: {
				txHash: blockHash,
				listingId: listingId,
				amount: price.toString(),
				assetId: assetId,
				date: date,
				seller: details.seller.toString(),
			},
			eventType: "LISTING_CLOSED",
		};
		await extractTokenListingData(
			details.tokens,
			dataInserts,
			blockNumber,
			tokenData,
			null
		);
		console.log("Auction completed");
	} catch (e) {
		console.log(
			`Error tracking auction sold data with params ${event.toJSON()}, error ${e}`
		);
	}
}
