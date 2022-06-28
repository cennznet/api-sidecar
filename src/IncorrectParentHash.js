const axios = require("axios");
const {appendFile} = require("fs");
require("dotenv").config();

async function fetchValidBlocks() {
    // Start at block - 10034900 --- 220 days 8 hrs ago
    //12104900
    const startBlock = 10106900;//10096900; //10034900;
    // const endBlock = 12104900;
    const endBlock = 12104900;
    const blockWithIncorrectParentHash = [];
    let chunk = 900;
    let lastInTheLoop = null;
    for (let block = startBlock; block < endBlock; block = block+chunk+1) {
        try {
            const url = `${process.env.UNCOVER_ENDPOINT}/blocksV2?start_block=${block}&end_block=${block + chunk}`;
            console.log('url:',url);
            const result = await axios.get(url);
            console.log('result::',result);
            const blockList = result.data.data.blocks;
            console.log('blockNumbers:', blockList)
            console.log(`Range- start block: ${block}, end block: ${block + chunk}`);
            if (lastInTheLoop) {
                if (lastInTheLoop.hash === blockList[0].parent_hash) {
                    console.log('verified the first value..');
                } else {
                    console.log(`InValid block:${blockList[0].block_num}`);
                    blockWithIncorrectParentHash.push(blockList[0].block_num);
                    const newCSVDataAdded = `\r\n${blockList[0].block_num}, ${blockList[0].parent_hash}, ${lastInTheLoop.hash} `;
                    appendFile('./invalidBlock.csv', newCSVDataAdded, (err) => {
                        if (err) {
                            console.error('error inserting data in csv');
                        }
                    });
                }
            }
            for (let idx = 0; idx < blockList.length - 1; idx++) {
                if (blockList[idx].hash === blockList[idx + 1].parent_hash) {
                    console.log('**');
                    // console.log(`Valid block:${blockList[idx+1].block_num}`)
                } else {
                    console.log(`InValid block:${blockList[idx + 1].block_num}`);
                    blockWithIncorrectParentHash.push(blockList[idx + 1].block_num);
                    const newCSVDataAdded = `\r\n${blockList[idx + 1].block_num}, ${blockList[idx + 1].parent_hash}, ${blockList[idx].hash} `;
                    appendFile('./invalidBlock.csv', newCSVDataAdded, (err) => {
                        if (err) {
                            console.error('error inserting data in csv');
                        }
                    });
                }
            }
            lastInTheLoop = blockList[blockList.length-1];
            console.log('Blocks with incorrect parent hash::', blockWithIncorrectParentHash);
            const cSVDataAdded = `\r\n Range:, ${block}, ${block + chunk}`;
            appendFile('./rangeCompleted.csv', cSVDataAdded, (err) => {
                if (err) {
                    console.error('error inserting data in csv');
                }
            });
        } catch (error) {
            console.error(error);
        }
    }
    console.log('blockWithIncorrectParentHash:',blockWithIncorrectParentHash);
}

fetchValidBlocks().catch((err) => console.log(err));
