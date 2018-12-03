const util = require('util');
const exec = util.promisify(require('child_process').exec);
require('dotenv').config();

const startTime = 1543820400000;
const intervalTime = 600000;

async function getTotaProxyNo1() {
  const { stdout, stderr } = await exec('docker exec -i eosioReal /opt/eosio/bin/cleos --wallet-url http://localhost:9999 -u https://rpc.eosys.io get account totaproxyno1 -j');
	return JSON.parse(`${stdout}`).voter_info.producers;
}

async function getTotaProxyNo2() {
  const { stdout, stderr } = await exec('docker exec -i eosioReal /opt/eosio/bin/cleos --wallet-url http://localhost:9999 -u https://rpc.eosys.io get account totaproxyno2 -j');
	return JSON.parse(`${stdout}`).voter_info.producers;
}

async function getProducerList() {
  const { stdout, stderr } = await exec('docker exec -i eosioReal /opt/eosio/bin/cleos --wallet-url http://localhost:9999 -u https://rpc.eosys.io system listproducers -l 21 -j');
	return JSON.parse(`${stdout}`).rows;
}

async function unlockWallet2() {
  try {
    const { stdout1, stderr1 } = await exec(`docker exec -i eosioJungle /opt/eosio/bin/cleos --wallet-url http://localhost:9090 -u https://jungle2.cryptolions.io wallet unlock --name default --password ${process.env.PASSWORD_JUNGLE}`);
    console.log(stdout1);
    console.log(stderr1);
  } catch(e) {
    console.log(e);
  }
}

async function pushResult2(gameNumber, side) {
 const { stdout2, stderr2 } = await exec(`docker exec -i eosioJungle /opt/eosio/bin/cleos --wallet-url http://localhost:9090 -u https://jungle2.cryptolions.io push action totatestgame pushresult '["totatestgame", ${gameNumber + 5}, ${side}]' -p totatestgame@active`);
  console.log(stdout2);
  console.log(stderr2); 
}

async function pushNewGame2() {
  const startTime = 1543820400000;
  const intervalTime = 600000;

  const gameNumber = Math.round((new Date().getTime() - startTime) / (6 * intervalTime));
  const { stdout, stderr } = await exec(`docker exec -i eosioJungle /opt/eosio/bin/cleos --wallet-url http://localhost:9090 -u https://jungle2.cryptolions.io push action totatestgame insertgame '["totatestgame", "game5", 0, ${startTime + gameNumber * intervalTime * 6}, ${startTime + gameNumber * intervalTime * 6 + intervalTime * 5}, ${startTime + (gameNumber + 1) * intervalTime * 6}, "totaproxyno1", "totaproxyno2"]' -p totatestgame@active`);
  
}

function getGameNumber() {
  const startTime = 1543820400000;
  const intervalTime = 600000;

  return Math.round((new Date().getTime() - startTime) / (6 * intervalTime));
}

async function result() {
  const proxyNo1 = await getTotaProxyNo1();
  const proxyNo2 = await getTotaProxyNo2();
  const producerList = await getProducerList();

  let count1 = 0;
  let count2 = 0;

  for(let producer of producerList) {
    if(proxyNo1.indexOf(producer.owner) != -1){
      count1 += 1;  
    }
    if(proxyNo2.indexOf(producer.owner) != -1){
      count2 += 1;
    }
  }
  console.log(count1);
  console.log(count2);
  unlockWallet2();
  if(count1 > count2) pushResult2(getGameNumber(), 1);
  else if(count2 > count1) pushResult2(getGameNumber(), 2);
  else pushResult2(getGameNumber(), 3);

  pushNewGame2();
}

result();

