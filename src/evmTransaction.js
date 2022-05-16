
const { Api } = require('@cennznet/api');
const fs = require('fs')
const {cvmToAddress} = require("@cennznet/types/utils");

async function main () {
    const networkName = 'nikau';

    const api = await Api.create({network: networkName});
  //  logger.info(`Connect to cennznet network ${networkName}`);
    try {
        const data = fs.readFileSync('src/blocks.csv', 'utf8')
        // console.log(data)
        // console.log(typeof data)
        const blckUpdateQuery = [];
        const arr = data.split("\n");
        for (let blockno = 1; blockno < arr.length - 1; blockno++) {
            const blockNumber = arr[blockno]
            console.log('block:', blockNumber);
            const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
            const [block, events] = await Promise.all([ api.rpc.chain
                .getBlock(blockHash), api.query.system.events.at(blockHash)]);
            const extrinsics = block.block.extrinsics;
            await Promise.all(
                extrinsics.map((e, i) => {
                    if (e.method.section === 'ethereum' && e.method.method === 'transact') {
                        const signer = getEVMSigner(i, events);
                        const isSigned = true;
                        const extrinsicIndex = `${blockNumber}-${i}`;
                        const data = `update chain_extrinsics set is_signed=${isSigned}, account_id=${signer} where block_num = ${blockNumber} and extrinsic_index = '${extrinsicIndex}'`;
                        blckUpdateQuery.push(data);
                        blckUpdateQuery.push("\n");
                    }
                })
            );
        }
        console.log('blckUpdateQuery:',blckUpdateQuery);
       fs.writeFile(

            './updateExtrinsic.txt',

            JSON.stringify(blckUpdateQuery),

            function (err) {
                if (err) {
                    console.error('Crap happens');
                }
            }
        );
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
