import { Api, JsonRpc, RpcError } from 'eosjs';
import JsSignature from 'eosjs/dist/eosjs-jssig';
import fetch from 'node-fetch';                            // node only; not needed in browsers
import { TextEncoder, TextDecoder } from 'util'; 
import JsSignatureProvider from 'eosjs/dist/eosjs-jssig';
import path from 'path';
import env from './env';

const storage = require('node-persist');
const junglePrivateKey = env.junglePrivateKey;
const eosPrivateKey = env.eosPrivateKey;

const jungleSP = new JsSignatureProvider([junglePrivateKey]);
const eosSP = new JsSignatureProvider([eosPrivateKey]);

const jungleRPC = new JsonRpc('https://jungle2.cryptolions.io:443', { fetch });
const eosRPC = new JsonRpc('https://rpc.eosys.io', { fetch });

const jungleApi = new Api({ rpc: jungleRPC, signatureProvider: jungleSP, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
const eosApi = new Api({ rpc: eosRPC, signatureProvider: eosSP, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

const isMainnet = false;

async function getProxyNo1() {
    try {
        const proxyNo1 = await eosRPC.get_account('totaproxyno1');
        const producers = proxyNo1.voter_info.producers;
        return producers;
    } catch (e) {
        console.log('getProxyNo1 error', e);
        throw e;
    }
}

async function getProxyNo2() {
    try {
        const proxyNo2 = await eosRPC.get_account('totaproxyno2');
        const producers = proxyNo2.voter_info.producers;
        return producers;
    } catch (e) {
        console.log('getProxyNo2 error', e);
        throw e;
    }
}

async function getCurrentProducers() {
    try {
        const currentProducers = await eosRPC.get_producer_schedule();
        const res = [];
        for (const producer of currentProducers.active.producers) {
            res.push(producer.producer_name);
        }
        if (res.length == 21) {
            return res; 
        } else {
            throw new Error('producers must be 21!');
        }
    } catch (e) {
        console.log('getCurrentProducers error', e);
        throw e;
    }
}

async function getLastGames() {
    try {
        const rpc = (isMainnet == true) ? eosRPC : jungleRPC; 
        const gameInfos = await rpc.get_table_rows({ 
            json: true, 
            code: 'totatestgame', 
            scope: 'totatestgame', 
            table: 'games2', 
            reverse: true,
            limit: 10,
        });
        const lastGameKey = gameInfos.rows[0].key;
        const res = [];
        for (const game of gameInfos.rows) {
            if(game.result == 0) {
                res.push(game);
            }
        }
        return { last: lastGameKey, games: res };
    } catch(e) {
        console.log('getLastGames error', e);
        throw e;
    }
}

async function calculateResult(game, voteProducers, proxyNo1, proxyNo2) {
    try {
        let prevCount1 = 0;
        let prevCount2 = 0;
        let count1 = 0;
        let count2 = 0;

        const currentResult = await storage.getItem('currentResult');
        if (game.result_time > new Date()) return false;
        if (currentResult != void 0 && currentResult.timestamp != void 0 && currentResult.timestamp === game.result_time) {
            const prevResult = await storage.getItem('prevResult');
            if (prevResult === void 0) {
              await storage.setItem('prevResult', currentResult);
              prevCount1 = currentResult.count1;
              prevCount2 = currentResult.count2;
            } else {
              prevCount1 = prevResult.count1;
              prevCount2 = prevResult.count2;
            }
            count1 = currentResult.count1;
            count2 = currentResult.count2;
        } else {
            if (currentResult != void 0) {
              await storage.setItem('prevResult', currentResult);
              prevCount1 = currentResult.count1;
              prevCount2 = currentResult.count2;
            }
            for(let producer of voteProducers) {
                if(proxyNo1.indexOf(producer) != -1){
                    count1 += 1;
                }
                if(proxyNo2.indexOf(producer) != -1){
                    count2 += 1;
                }
            }
            await storage.setItem('currentResult', { 
                count1: count1,
                count2: count2,
                timestamp: game.result_time,
            });
        }
        console.log('Current', count1, count2);
        console.log('Prev', prevCount1, prevCount2);
        if (game.game_type === 0) {
            if(count1 > count2) return { key: game.key, result: 1 };
            else if(count2 > count1) return { key: game.key, result: 2 };
            else return { key: game.key, result: 3 };
        } else if (game.game_type === 1) {
            if(count1 > prevCount1) return { key: game.key, result: 1 };
            else if(count2 > prevCount2) return { key: game.key, result: 2 };
            else return { key: game.key, result: 3 };
        }
    } catch (err) {
        throw err;
    }
}

async function pushResult(gameResult) {
    try {
        const api = (isMainnet == true) ? eosApi : jungleApi;
        const result = await api.transact({
            actions: [{
                account: 'totatestgame',
                name: 'pushresult',
                authorization: [{
                    actor: 'totatestgame',
                    permission: 'owner',
                }],
                data: {
                    user: 'totatestgame',
                    game_key: gameResult.key,
                    result: gameResult.result,
                },
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        console.log(result);
        return result;
    } catch (err) {
        throw err;
    }
}

async function makeNewGame(lastNumber) {
    try {
        const api = (isMainnet == true) ? eosApi : jungleApi;
        const num = Math.floor((new Date().getTime() - new Date('Sun Jan 06 2019 00:00:00 GMT+0900').getTime()) / 86400000);
        const startTime = new Date('Sun Jan 06 2019 00:00:00 GMT+0900').getTime() + 86400000 * num;
        const resultTime = new Date('Sun Jan 06 2019 00:00:00 GMT+0900').getTime() + 86400000 * (num + 1);
        const endTime = startTime + 64800000;
        const result = await api.transact({
            actions: [{
                account: 'totatestgame',
                name: 'insertgame',
                authorization: [{
                    actor: 'totatestgame',
                    permission: 'owner',
                }],
                data: {
                    user: 'totatestgame',
                    game_name: `who win ${num + 1}`,
                    game_type: 0, // 0은 누가 더 많은지 
                    start_time: startTime,
                    end_time: endTime,
                    result_time : resultTime,
                    team1 : 'totaproxyno1',
                    team2 : 'totaproxyno2',
                },
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
        });
        console.log(result);
        return result;
    } catch (err) {
        throw err;
    }
}

async function tryPushAndMakeGame() {
    try {
        const proxyNo1 = await getProxyNo1();
        const proxyNo2 = await getProxyNo2();
        const producerList = await getCurrentProducers();
        const lastGames = await getLastGames();
        let pushRequest;
        for (const game of lastGames.games) {
            const gameResult = await calculateResult(game, producerList, proxyNo1, proxyNo2);
            if (gameResult) { 
              pushRequest = await pushResult(gameResult);
              console.log('pushresult', pushRequest);
            }
        }
        const makeRequest = await makeNewGame(lastGames.lastGameKey);
        console.log('insertgame', makeRequest);
    } catch (err) {
        console.log(err);
    }
}
//console.log(path.resolve(__dirname));
storage.init({ /*dir: path.resolve(__dirname) + '/.storage',*/ttl: 96 * 3600 * 1000 }).then(res => {
  console.log(new Date());
  tryPushAndMakeGame();
  storage.getItem('currentResult').then(r => console.log(r));
});
//tryPushAndMakeGame();
