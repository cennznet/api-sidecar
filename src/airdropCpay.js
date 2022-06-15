
const { Api } = require('@cennznet/api');
const fs = require('fs')
const { Keyring } = require('@polkadot/keyring');


async function main () {
    const networkName = 'azalea';

    const api = await Api.create({network: networkName});
    console.log(`Connect to cennznet network ${networkName}`);
    try {
        const data = fs.readFileSync('src/payouts.csv', 'utf8')
        const spendingAssetId = (await api.query.genericAsset.spendingAssetId()).toNumber();
        console.log('spending asset id:', spendingAssetId);
        const csvData = data.split("\n");
        console.log('arr.length:',csvData.length);
        // const sudoAddress = await api.query.sudo.key();
        const keyring = new Keyring({type: 'sr25519'});
        const airdropAccount = keyring.addFromSeed(process.ENV.SEED);
        let nonce = await api.rpc.system.accountNextIndex(airdropAccount.address);

        const newCSVDataHeader = "Account, 8329 Era, 8339 Era, 8357 Era, 8391 Era, 8396 Era, Total, TransactionHash";
        fs.appendFile("src/payoutsWithTxHash.csv", newCSVDataHeader, (err)=> {if (err) { console.error('error inserting data in csv'); }});
        for (let records = 1; records < csvData.length; records++) {
            const record = csvData[records]
            const [receiver, era1, era2, era3, era4, era5, totalAmount] = record.split(',');

            await new Promise((resolve) => {
                const tx = api.tx.genericAsset.transfer(spendingAssetId, receiver, totalAmount);
                tx.signAndSend(airdropAccount, {nonce: nonce++}, async ({events, status}) => {
                    console.log('status:',status.toHuman());
                    if (status.isInBlock) {
                        for (const {event: {method, section, data}} of events) {
                            if (section === 'genericAsset' && method == 'Transferred') {
                                const [assetId, from, to, amountTransferred] = data;
                                const newCSVDataAdded = `\r\n ${to}, ${era1}, ${era2}, ${era3}, ${era4}, ${era5}, ${amountTransferred}, ${tx.hash.toString()} `;
                                console.log('newCSVDataAdded:',newCSVDataAdded);
                                fs.appendFile("src/payoutsWithTxHash.csv", newCSVDataAdded,
                                    (err)=> { if (err) { console.error('error inserting data in csv'); }});
                                resolve();
                            } else if (section === 'system' && method === 'ExtrinsicFailed') {
                                fs.appendFile("src/failedPayoutsWithTxHash.csv", `${record}, ${tx.hash.toString()}`,
                                    (err)=> { if (err) { console.error('error inserting data in csv'); }});
                                resolve();
                            }
                        }
                    }
                });
            });
        }
        console.log('JOB completed!!');
    } catch (err) {
        console.error(err)
    }
}
main().catch((err) => console.log(err));
