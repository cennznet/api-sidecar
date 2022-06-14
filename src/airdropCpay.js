
const { Api } = require('@cennznet/api');
const fs = require('fs')
const { Keyring } = require('@polkadot/keyring');
// const {cvmToAddress} = require("@cennznet/types/utils");

// async function verifyTxSuccess(blockHash, chunk) {
//     for (let records = 1; records < chunk; records++) {
//         const record = csvData[records]
//         const [receiver, amount] = record.split(',');
//         const
//     }
// }

async function main () {
    const networkName = 'local';

    const api = await Api.create({network: networkName});
  //  logger.info(`Connect to cennznet network ${networkName}`);
    try {
        const data = fs.readFileSync('src/8339-payouts.csv', 'utf8')
        const txs = [];
        const spendingAssetId = (await api.query.genericAsset.spendingAssetId()).toNumber();
        const csvData = data.split("\n");
        console.log('arr.length:',csvData.length);
        const chunkSize = 1000
        for (let i = 0; i < csvData.length; i += chunkSize) {
            const chunk = csvData.slice(i, i + chunkSize);
            console.log('chunk size::',chunk.length);
            for (let records = 1; records < chunk; records++) {
                const record = csvData[records]
                const [receiver, amount] = record.split(',');
                txs.push(api.tx.genericAsset.transfer(spendingAssetId, receiver, amount));
            }
            const sudoAddress = await api.query.sudo.key();
            const keyring = new Keyring({type: 'sr25519'});
            // Lookup from keyring ( on --dev sudo would be `//Alice`)
            keyring.addFromUri('//Alice');
            const sudoKeypair = keyring.getPair(sudoAddress.toString());
            const nonce = await api.rpc.system.accountNextIndex(sudoAddress);
            // console.log('TxLL:',txs);
            // construct the batch and send the transactions
            const ex = api.tx.utility.batch(txs);
            const estimatedFee = await api.derive.fees.estimateFee({extrinsic: ex, userFeeAssetId: spendingAssetId});
            console.log('estimatedFee:',estimatedFee.toString());
            await ex.signAndSend(sudoKeypair, {nonce}, async ({events, status}) => {
                if (status.isInBlock) {
                    for (const {
                        event: {method, section, data},
                    } of events) {
                        const blockHash = status.asInBlock
                        console.log('Method:', method.toString());
                        console.log('section:', section.toString());
                        console.log('data:', data.toHuman());
                        if (section === 'utility' && method == 'BatchCompleted') {
                            console.log('Successful');
                            // await verifyTxSuccess(blockHash, chunk);
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error(err)
    }
}
main().catch((err) => console.log(err));


/**
 * Find ethereum executed event and get the first param from data [From, To/Contract, TxHash]
 * **/
function getEVMSigner(extrinsicIdx, allEvents) {
    const events = filterExtrinsicEvents(extrinsicIdx, allEvents);
    const event = events.find(
        (evt) =>
            evt.event.section === 'ethereum' && evt.event.method === 'Executed',
    );
    const evmAccount = event.event.data[0];
    if (evmAccount) {
        return cvmToAddress(evmAccount.toString());
    }
    return null;
}
function filterExtrinsicEvents(
    extrinsicIdx,
    events,
){
    return events.filter(
        ({ phase }) =>
            phase.isApplyExtrinsic && phase.asApplyExtrinsic.eqn(extrinsicIdx),
    );
}
