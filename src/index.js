import { Api, JsonRpc, RpcError } from 'eosjs';
import JsSignature from 'eosjs/dist/eosjs-jssig';
import fetch from 'node-fetch';                            // node only; not needed in browsers
import { TextEncoder, TextDecoder } from 'util'; 
import env from './env';
import JsSignatureProvider from 'eosjs/dist/eosjs-jssig';


const startTime = 1544025600000;
const intervalTime = 300000;
const junglePrivateKey = env.junglePrivateKey;
const eosPrivateKey = env.eosPrivateKey;

const jungleSP = new JsSignatureProvider([junglePrivateKey]);
const eosSP = new JsSignatureProvider([eosPrivateKey]);

const jungleRPC = new JsonRpc('https://jungle2.cryptolions.io:443', { fetch });
const eosRPC = new JsonRpc('https://rpc.eosys.io', { fetch });

const jungleApi = new Api({ jungleRPC, jungleSP, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
const eosApi = new Api({ eosRPC, eosSP, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

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

async function getRestGames() {
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
        console.log('getRestGames error', e);
        throw e;
    }
}

function calculateResult(game, voteProducers, proxyNo1, proxyNo2) {
    try {
        if (game.game_type === 0) {
            let count1 = 0;
            let count2 = 0;

            for(let producer of producerList) {
                if(proxyNo1.indexOf(voteProducers) != -1){
                count1 += 1;  
                }
                if(proxyNo2.indexOf(voteProducers) != -1){
                count2 += 1;
                }
            }
            if(count1 > count2) return { key: game.key, result: 1 };
            else if(count2 > count1) return { key: game.key, result: 2 };
            else return { key: game.key, result: 3 };
        }
    } catch (err) {
        throw err;
    }
}

async function pushResult(result) {
    try {
        const api = (isMainnet == true) ? eosApi : jungleApi;
        const result = api.transact({
            actions: [{
                account: 'totatestgame',
                name: 'pushresult',
                authorization: [{
                    actor: 'totatestgame',
                    permission: 'active',
                }],
                data: {
                    user: 'totatestgame',
                    game_key: result.key,
                    result: result.result,
                },
            }]
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
        const result = api.transact({
            actions: [{
                account: 'totatestgame',
                name: 'insertgame',
                authorization: [{
                    actor: 'totatestgame',
                    permission: 'active',
                }],
                data: {
                    user: 'totatestgame',
                    game_name: `who win ${lastNumber + 1}`,
                    game_type: 0, // 0은 누가 더 많은지 
                    start_time: startTime,
                    end_time: endTime,
                    result_time : resultTime,
                    team1 : 'totaproxyno1',
                    team2 : 'totaproxyno2',
                },
            }]
        });
        console.log(result);
        return result;
    } catch (err) {
        throw err;
    }
}
