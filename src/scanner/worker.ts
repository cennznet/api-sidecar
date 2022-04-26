import {Api} from "@cennznet/api";
import {EventRecord, RuntimeVersion} from "@polkadot/types/interfaces";
import {Vec} from "@polkadot/types-codec";
import {processAuctionSoldEvent, trackAuctionBundleData, trackAuctionData} from "./utils/trackTokenAuction";
import logger from "../logger";
import {
    trackAdditionalTokenData,
    trackTokenSeriesData,
    trackUniqueMintData
} from "./utils/trackTokenCreation";
import {trackSeriesNameData} from "./utils/trackTokenName";
import {trackTransferBatchData, trackTransferData} from "./utils/trackTokenTransfers";
import {trackBurnBatchData, trackBurnData} from "./utils/trackTokenBurn";
import {trackSellBundleData, trackSellData} from "./utils/trackTokenSell";
import {trackBuyData} from "./utils/trackTokenBuy";
import {trackBidData} from "./utils/trackBidData";
import {trackCancelSaleData} from "./utils/trackSaleCancel";
//const workerpool = require('workerpool');
import workerpool from 'workerpool';
// import {Singleton} from "./ApiService";

function getExtrinsicParams(e) {
    return e.meta.args.map((arg, idx) => {
        const value = e.args[idx].toJSON();
        return {
            ...arg.toJSON(),
            value,
        };
    });
}

// find the event for the extrinsic
function filterExtrinsicEvents(extrinsicIdx, events) {
    return events.filter(
        ({ phase }) =>
            phase.isApplyExtrinsic && phase.asApplyExtrinsic.eqn(extrinsicIdx)
    );
}

function isExtrinsicSuccessful(extrinsicIdx, events) {
    return (
        events.findIndex((evt) => evt.event.method === "ExtrinsicSuccess") > -1
    );
}

function getTimestamp(block, api) {
    for (const e of block.extrinsics) {
        const call = api.findCall(e.callIndex);
        if (call.section === "timestamp" && call.method === "set") {
            const date = new Date(e.args[0].toJSON());
            if (isNaN(date.getTime())) {
                throw new Error("timestamp args type wrong");
            }
            return date;
        }
    }
}

async function processNFTExtrinsicData({
                                           method,
                                           params,
                                           events,
                                           txHash,
                                           blockTimestamp,
                                           api,
                                           blockNumber,
                                           owner,
                                           blockHash,
                                       }) {
    logger.info(`Event triggered::${method}`);
    const date = blockTimestamp;
    const findNFTEvent = events.find(({ event }) => event.section === "nft");
    const eventData = findNFTEvent ? findNFTEvent.event.data.toJSON() : null;
    switch (method) {
        case "mintUnique": {
            if (!eventData) {
                logger.error(
                    `Something wrong, no event found for mintUnique extrinsic at blockNumber ${blockNumber}`
                );
                break;
            }

            await trackUniqueMintData(
                eventData,
                api,
                params,
                date,
                owner,
                txHash,
                blockNumber
            );
            break;
        }
        case "mintSeries": {
            if (!eventData) {
                logger.error(
                    `Something wrong, no event found for mint series extrinsic at blockNumber ${blockNumber}`
                );
                break;
            }

            await trackTokenSeriesData(
                eventData,
                api,
                params,
                date,
                owner,
                txHash,
                blockNumber
            );
            break;
        }
        case "mintAdditional": {
            if (!eventData) {
                logger.error(
                    `Something wrong, no event found for mintAdditional extrinsic at blockNumber ${blockNumber}`
                );
                break;
            }

            await trackAdditionalTokenData(
                params,
                eventData,
                api,
                blockHash,
                date,
                owner,
                txHash,
                blockNumber
            );
            break;
        }
        case "setSeriesName": {
            await trackSeriesNameData(
                params,
                api,
                date,
                owner,
                txHash,
                blockHash,
                blockNumber
            );
            break;
        }
        case "transfer": {
            await trackTransferData(params, date, txHash, blockNumber, owner);
            break;
        }
        case "transferBatch": {
            await trackTransferBatchData(params, date, txHash, blockNumber, owner);
            break;
        }

        case "burn": {
            await trackBurnData(params, date, txHash, blockNumber, owner);
            break;
        }
        case "burnBatch": {
            await trackBurnBatchData(params, date, txHash, blockNumber, owner);
            break;
        }

        case "sellBundle": {
            if (!eventData) {
                logger.error(
                    `Something wrong, no event found for sell bundle extrinsic at blockNumber ${blockNumber}`
                );
                break;
            }

            await trackSellBundleData(
                params,
                api,
                eventData,
                txHash,
                date,
                owner,
                blockNumber
            );
            break;
        }
        case "sell": {
            if (!eventData) {
                logger.error(
                    `Something wrong, no event found for sell extrinsic at blockNumber ${blockNumber}`
                );
                break;
            }

            await trackSellData(
                params,
                api,
                eventData,
                txHash,
                date,
                owner,
                blockNumber
            );
            break;
        }

        case "buy": {
            await trackBuyData(
                params,
                blockHash,
                api,
                blockNumber,
                txHash,
                date,
                owner
            );
            break;
        }
        case "auction": {
            if (!eventData) {
                logger.error(
                    `Something wrong, no event found for auction extrinsic at blockNumber ${blockNumber}`
                );
                break;
            }
            await trackAuctionData(
                eventData,
                params,
                api,
                txHash,
                date,
                owner,
                blockNumber
            );

            break;
        }
        case "auctionBundle": {
            if (!eventData) {
                logger.error(
                    `Something wrong, no event found for auction bundle extrinsic at blockNumber ${blockNumber}`
                );
                break;
            }
            await trackAuctionBundleData(
                eventData,
                params,
                api,
                txHash,
                date,
                owner,
                blockNumber
            );

            break;
        }

        case "bid": {
            await trackBidData(
                params,
                api,
                blockHash,
                owner,
                txHash,
                date,
                blockNumber
            );
            break;
        }

        case "cancelSale": {
            await trackCancelSaleData(params, api, blockNumber, txHash, date, owner);
            break;
        }
    }
}

//let api;
// Api.create({ provider: process.env.provider }).then(api);
// let apiInstance;
//Api.create({ provider: process.env.provider }).then(api)
async function trackNFTFromChunk(data) {
    try {
        console.log('******* new instance *****');
        const api = await Api.create({ provider: process.env.provider });
        //apiInstance = api;
        const currentRuntimeVersion = await api.rpc.state.getRuntimeVersion();
        const specVersion = currentRuntimeVersion.specVersion.toNumber();
        const {startIndex, endIndex} = data;
        let apiAt;
        for (let i = startIndex; i <= endIndex; i++) {
            const blockNumber = i;
            console.log(`At blocknumber: ${blockNumber}`);
           // logger.info(`HEALTH CHECK => OK`);
            const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
            // console.log('blockHash:', blockHash.toString());
            const [block, allEvents, runtimeVersionAtBlockHash] = await Promise.all([
                api.rpc.chain.getBlock(blockHash),
                api.query.system.events.at(blockHash),
                api.rpc.state.getRuntimeVersion(blockHash)
            ]);

            const extrinsics = block.block.extrinsics;

            if (runtimeVersionAtBlockHash.specVersion.toNumber() < specVersion) {
                apiAt = await api.at(blockHash);
            }

            await Promise.all(
                extrinsics.map(async (e, index) => {
                    const params = getExtrinsicParams(e);
                    let call = apiAt ? apiAt.findCall(e.callIndex) : api.findCall(e.callIndex);
                    // console.log('section:::::', call.section);
                    // console.log('method:::::', call.method);
                    if (call.section === "nft") {
                        const extrinsicRelatedEvents = filterExtrinsicEvents(
                            index,
                            allEvents
                        );
                        if (isExtrinsicSuccessful(index, extrinsicRelatedEvents)) {
                            const blockTimestamp = getTimestamp(block.block, api);
                            const txHash = e.hash.toString();
                            const owner = e.signer.toString();
                            const {method} = call;
                            // console.log('^^^^^^^^^^^');
                            await processNFTExtrinsicData({
                                method,
                                params,
                                events: extrinsicRelatedEvents,
                                txHash,
                                blockTimestamp,
                                api,
                                owner,
                                blockNumber,
                                blockHash,
                            });
                        }
                    }
                })
            );
            const auctionSoldEvent = (allEvents as unknown as Vec<EventRecord>).find(
                ({event}) => event.section === "nft" && event.method === "AuctionSold"
            );
            if (auctionSoldEvent) {
                const blockTimestamp = getTimestamp(block.block, api);
                await processAuctionSoldEvent(
                    auctionSoldEvent.event,
                    blockTimestamp,
                    blockNumber,
                    blockHash.toString(),
                    api
                );
            }
        }
        console.log('disconnecting api instance...');
        await api.disconnect();
       // return endIndex;
    } catch (e) {
        console.log('Err::',e);
    }
}


// a deliberately inefficient implementation of the fibonacci sequence
// function fibonacci(n) {
//     console.log('**********************************');
//     if (n < 2) return n;
//     // return n + 2;
//     return fibonacci(n - 2) + fibonacci(n - 1);
// }

// create a worker and register public functions
workerpool.worker({
    trackNFTFromChunk: trackNFTFromChunk,
    // fibonacci: fibonacci
});
