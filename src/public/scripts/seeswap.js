// SEESWAP SDK

const TESTNET = 'https://api.s0.b.hmny.io/';
const MAINNET = 'https://api.s0.t.hmny.io/';

var BPoolContract;
var TokenContract;
var OneWrapper;

//import * as HarmonyUtils  from '../modules/HarmonyUtils.browser.js';
//import * as HarmonyJs     from '../modules/HarmonyJs.browser.js';
//import * as BPoolContract from '../contracts/bpool-abi.js';  // ABI only for faster loading
//import * as TokenContract from '../contracts/token.js';


let HarmonyUtilsX = import('../modules/HarmonyUtils.browser.js');
let HarmonyNetX   = import('../modules/HarmonyNetwork.browser.js');
let HarmonyJsX    = import('../modules/HarmonyJs.browser.js');

// Modules will be loaded on demand not to slow UI
//async function loadModules() {
//    let HarmonyUtils = await import('../modules/HarmonyUtils.browser.js');
//    let HarmonyJs    = await import('../modules/HarmonyJs.browser.js');
//    //let BigNumber = await import('./modules/BigNumber.browser.js');
//}

async function loadContracts() {
    let res1 = await fetch('../contracts/BPOOL.json', {method:'get'});
    let res2 = await fetch('../contracts/HRC20.json', {method:'get'});
    let res3 = await fetch('../contracts/ONES.json',  {method:'get'});
    let res4 = await fetch('../contracts/USDS.json',  {method:'get'});
    let poolContract  = await res1.json();
    let tokenContract = await res2.json();
    let oneWrapper    = await res3.json();
    let usdWrapper    = await res4.json();
    //BPoolContract = await import('../contracts/bpool-abi.js');  // ABI only for faster loading
    //TokenContract = await import('../contracts/token.js');
    seeswap.PoolContract  = poolContract;
    seeswap.TokenContract = tokenContract;
    seeswap.OneWrapper    = oneWrapper;
    seeswap.UsdWrapper    = usdWrapper;
}

async function init(network=MAINNET){
    //console.log('Seeswap init...')
    if(!seeswap.isLoaded) { 
        try {
            //console.log('Loading modules...')
            //await loadModules(); 
            //console.log('Modules loaded...')
            await loadContracts(); 
            //console.log('Contracts loaded...')
            let chain = (network == TESTNET ? HarmonyUtils.ChainID.HmyTestnet : HarmonyUtils.ChainID.HmyMainnet);
            let opts  = {chainType: HarmonyUtils.ChainType.Harmony, chainId: chain};
            seeswap.network  = network;
            seeswap.harmony  = await HarmonyJs.Harmony(seeswap.network, opts);
            seeswap.isLoaded = true;
        } catch(ex){
            console.error('Error loading seeswap', ex);
        }
    }
    //console.log('SeeSwap', seeswap);
    //console.log('SeeSwap loaded');
}

async function connect(ext) {
    console.log('Wallet connect');
    try {
        let CHAINID = (seeswap.network==MAINNET?HarmonyUtils.ChainID.HmyMainnet:HarmonyUtils.ChainID.HmyTestnet);
        seeswap.extension = await new seeswap.harmony.HarmonyExtension(ext);
        seeswap.extension.provider  = new HarmonyNetwork.Provider(seeswap.network).provider;
        seeswap.extension.messenger = new HarmonyNetwork.Messenger(seeswap.extension.provider, HarmonyUtils.ChainType.Harmony, CHAINID);
        //seeswap.extension.provider = seeswap.harmony.provider;
        //seeswap.extension.messenger = seeswap.harmony.messenger;
        seeswap.extension.setShardID(0);
        seeswap.extension.wallet.messenger = seeswap.extension.messenger;
        seeswap.extension.blockchain.messenger = seeswap.extension.messenger;
        seeswap.extension.transactions.messenger = seeswap.extension.messenger;
        seeswap.extension.contracts.wallet = seeswap.extension.wallet;
        console.log('- Harmony',   seeswap.harmony);
        console.log('- Provider',  seeswap.harmony.provider);
        console.log('- Messenger', seeswap.harmony.messenger);
        console.log('- Extension', seeswap.extension);
        console.log('- WalletX',   seeswap.extension.wallet);
        console.log('- WalletC',   seeswap.extension.contracts.wallet);
        return true;
    } catch(ex){
        console.log('Wallet could not be instantiated')
        console.log('Error:', ex.message)
        console.log('Error:', ex)
    }
    return false;
}

async function disconnect() {
    //await seeswap.extension.wallet.forgetIdentity()
    seeswap.extension.logout();
    console.log('Wallet disconnected');
}

async function setSharding() {
    try {
        let res = await seeswap.harmony.blockchain.getShardingStructure();
        seeswap.harmony.shardingStructures(res.result);
    } catch (ex) {
        console.error('Sharding error', ex);
    }
}

async function getAccount() {
    seeswap.account = await seeswap.extension.wallet.getAccount();
    console.log('Account', seeswap.account);
    return seeswap.account;
}

function addWallet(privKey) {
    // TODO: privKey is required, throw error if not present
    seeswap.wallet = seeswap.harmony.wallet.addByPrivateKey(privKey);
    seeswap.harmony.wallet.setSigner(seeswap.wallet.address);
    seeswap.wallet.oneAddress = seeswap.wallet.bech32Address;
    return seeswap.wallet.oneAddress;
}

function addSigner(address) {
    let hex = HarmonyJs.crypto.getAddress(address).checksum;
    console.log('Signer', address, hex);
    seeswap.harmony.wallet.setSigner(hex);
    //seeswap.extension.wallet.setSigner(hex);
    //seeswap.extension.contracts.wallet.setSigner(hex);
}

async function attachWallet(wallet, address, reject){
    if (!address) {
        let account = await seeswap.wallet.getAccount();
        //let account = await window.onewallet.getAccount();
        address = HarmonyJs.crypto.getAddress(account.address).checksum;
    }
    console.log('Address:', address);
    wallet.defaultSigner = address;
    wallet.signTransaction = async function(tx, ad, rj) {
        console.log('Artifacts', tx, ad, rj)
        try {
            tx.from = address;
            let res = await seeswap.wallet.signTransaction(tx);
            //let res = await window.onewallet.signTransaction(tx);
            console.log('Tx signed:', res);
            return res;
        } catch (ex) {
            console.log('Error signing tx:', ex);
            if(reject) { reject(ex, tx); }
        }
        return tx;
    }
}

async function getBalance() {
    // Wallet must be loaded
    let res = await seeswap.harmony.blockchain.getBalance({ address: seeswap.account.address });
    //console.log(res.result)
    let bal = new seeswap.harmony.utils.Unit(res.result).asWei().toEther()
    return bal;
}

async function getAllowance(token, source, target) {
    let contract = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, token);
    let resp = await contract.methods.allowance(source, target).call(seeswap.gasCall);
    if (resp == null) {
        console.log('[ERROR] Unable to fetch allowance');
        return null;
    }
    let bal = money(resp, 8);
    return bal;
}

async function checkBalance(tokenAddress) {
    let contract = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, tokenAddress);
    let resp = await contract.methods.balanceOf(seeswap.harmony.wallet.accounts[0]).call(seeswap.gasCall);
    if (resp == null) {
        console.log('[ERROR] Unable to fetch balance');
        return null;
    }
    let bal = money(resp, 8);
    return bal;
}

async function getPoolBalance(pool, tokenAddress) {
    let contract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
    let resp = await contract.methods.getBalance(tokenAddress).call(seeswap.gasCall)
    let bal  = money(resp, 8)
    return bal
}

async function getPoolPrice(pool, base, quote) {
    console.log('PRICE', pool, base, quote);
    let contract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address);
    let tokenA = pool.tokens[base];
    let tokenB = pool.tokens[quote];
    let resp   = await contract.methods.getSpotPriceSansFee(tokenA.address, tokenB.address).call(seeswap.gasCall)
    console.log('Price',resp);
    //let price  = resp
    let price  = money(resp, 8)
    return price
}

async function getSwapFee(pool) {
    let contract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
    let resp = await contract.methods.getSwapFee().call(seeswap.gasCall)
    let fee  = money(resp,8)
    //let fee  = resp
    return fee;
}

async function getPoolInfo(pool) {
    console.log('POOL', pool);
    let info = null;
    try {
        let contract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address);
        let tokenA   = pool.tokens[pool.base].address;
        let tokenB   = pool.tokens[pool.quote].address;
        let priceA   = await contract.methods.getSpotPriceSansFee(tokenA, tokenB).call(seeswap.gasCall)
        let priceB   = await contract.methods.getSpotPriceSansFee(tokenB, tokenA).call(seeswap.gasCall)
        let balanceA = await contract.methods.getBalance(tokenA).call(seeswap.gasCall)
        let balanceB = await contract.methods.getBalance(tokenB).call(seeswap.gasCall)
        let swapFee  = await contract.methods.getSwapFee().call(seeswap.gasCall)
        info = {
            base:  { balance: money(balanceA, 8), price: money(priceA, 8) },
            quote: { balance: money(balanceB, 8), price: money(priceB, 8) },
            swapFee: money(swapFee, 3)
        };
        console.log('INFO', info)
    } catch(ex){
        console.log('INFO ERROR:', ex)
    }
    return info;
}

async function getPoolData(pool) {
    let contract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address);
    let resp0 = await contract.methods.getController().call(seeswap.gasCall)
    let resp1 = await contract.methods.getNumTokens().call(seeswap.gasCall)
    let resp2 = await contract.methods.getCurrentTokens().call(seeswap.gasCall)
    let resp3 = await contract.methods.getSwapFee().call(seeswap.gasCall)
    let resp4 = await contract.methods.isFinalized().call(seeswap.gasCall)
    let data = {
        controller: resp0,
        tokenCount: resp1.toNumber(),
        tokens: resp2,
        swapFee: resp3.toNumber(),
        finalized: resp4
    };
    return data;
}

async function approveToken(pool, token, amount) {
    let oneunits = (amount * 10**18).toString();
    console.log('Units', oneunits);
    let contract = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, token.address)
    let resp = await contract.methods.approve(pool.address, oneunits).send(seeswap.gasSend)
    if (resp.status === 'called') {
        console.log('Transfer approved:', amount, token.symbol)
        return true;
    } else {
        console.log('[ERROR] Token approval failed. Please check balance.')
    }
    return false;
}

async function bindToken(pool, token, amount, weight) {
    // APPROVE
    let amountU  = (amount * 10**18).toString();
    let tokenContract = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, token.address)
    let resp1 = await tokenContract.methods.approve(pool.address, amountU).send(seeswap.gasSend)
    if (resp1.status === 'called') {
        console.log('Token approved:', token.symbol)
    } else {
        console.log('Approval failed:', token.symbol, resp1.status)
        return false;
    }
    resp2 = await tokenContract.methods.allowance(seeswap.harmony.wallet.accounts[0], pool.address).call(seeswap.gasCall)
    console.log('Allowance', resp2.toString());

    // BIND
    let poolContract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
    let resp3 = await poolContract.methods.bind(token.address, amountU, weight).send(seeswap.gasSend)
    if (resp3.status === 'called') {
        console.log('Token bound:', amount, token.symbol)
    } else {
        console.log('Token binding failed:', resp3.status)
        return false
    }
    return true;
}

async function finalizePool(pool) {
    let contract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
    let resp = await contract.methods.finalize().send(seeswap.gasSend)
    if (resp.status === 'called') {
        console.log('Pool finalized')
    } else {
        console.log('Finalize failed', resp.status)
        return false
    }
    return true;
}

async function getTokenWeight(pool, tokenAddress) {
    let contract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
    let resp     = await contract.methods.getNormalizedWeight(tokenAddress).call(seeswap.gasCall);
    let weight   = new seeswap.harmony.utils.Unit(resp).asWei().toEther()
    //console.log('Token weight:', weight)
    return weight;
}

async function setupPool(opts) {
    var ok = true;
    for (var i = 0; i < opts.tokens.length; i++) {
        ok = await bindToken(opts.pool, opts.tokens[i].token, opts.tokens[i].amount, opts.tokens[i].weight);
        if(!ok){ return false; }
    }
    //ok = await finalizePool(opts.pool)
    for (var i = 0; i < opts.tokens.length; i++) {
        ok = await getTokenWeight(opts.pool, opts.tokens[i].token.address)
        if(!ok){ return false; }
    }
    return true;
}

async function joinPool(pool, token, amountIn, rejected) {
    console.log('Joining pool...');
    let unitsIn  = (amountIn * 10**18).toString();
    let unitsOut = 0;
    console.log('Units', unitsIn);

    //let approved = await this.approveToken(pool, token, amountIn);
    //if(!approved){ console.log('Not approved'); return false; }

    let tokenContract = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, token.address)
    let attached = await attachWallet(tokenContract.wallet, null, rejected);
    let resp0 = await tokenContract.methods.approve(pool.address, unitsIn).send(seeswap.gasSend)
    if (resp0.status === 'called') {
        console.log('Transfer approved:', amountIn, token.symbol);
    } else {
        console.log('[ERROR] Approval failed:', resp0.status);
        rejected('Error: Approval failed');
        return false;
    }

    let poolContract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
    let resp1 = await poolContract.methods.joinswapExternAmountIn(token.address, unitsIn, unitsOut).send(seeswap.gasSend)
    var ok = false;
    if (resp1.status === "called") {
        console.log('Pool joined with', amountIn, token.symbol)
        ok = true;
    } else {
        //console.log(resp)
        console.log(resp1.status);
        console.log('[ERROR] Failed to join pool', resp1);
        rejected('Error: Failed to join pool');
        return false;
    }
    return ok
}

async function exitPool(pool, token, amount, rejected) {
    console.log('Exiting pool...');
    let amountU  = (amount * 10**18).toString();
    console.log('Units', amountU);
    let maxAmount = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
    let contract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
    let attached = await attachWallet(contract.wallet, null, rejected);
    let resp = await contract.methods.exitswapExternAmountOut(token.address, amountU, maxAmount).send(seeswap.gasSend)
    var ok = false;
    if (resp.status === "called") {
        console.log('Exit pool', amount, token.symbol)
        ok = true;
    } else {
        console.log(resp.status);
        console.log('[ERROR] Failed to exit pool.', resp);
        rejected('Error: Failed to exit pool');
        return false;
    }
    return ok
}

async function swapTokens(pool, send, receive, amount, rejected) {
    let oneunits = (amount * 10**18).toString();
    console.log('Units', oneunits);
    
    // Approve transfer
    //console.log('ABI', seeswap.TokenContract.abi);
    let tokenContract = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, send.address)
    //console.log('TOK', tokenContract);
    //let reject = function(tx, callback){ console.log('Rejected', tx); callback('Swap rejected by user'); }
    let attached = await attachWallet(tokenContract.wallet, null, rejected);
    //if(!attached){ 
    //    console.log('Transaction rejected!');
    //    return false;
    //}
    //console.log('Attached', tokenContract.wallet);

    let resp0, resp1;
    console.log('Approving tx...');
    console.log('Pool addr', pool.address);
    console.log('Amount wei', oneunits);
    console.log('Gas opts', seeswap.gasSend);
    try {
        let okApprove = await tokenContract.methods.approve(pool.address, oneunits);
        console.log('Approve', okApprove);
        //if(okApprove.transaction.signature.s) { 
        if(okApprove) { 
            console.log('Sign and send...');
            resp0 = await okApprove.send(seeswap.gasSend);
            console.log('Resp0', resp0);
        } else {
            console.log('Approval rejected by user!');
            rejected('Approval rejected by user!');
            return false;
        }
    } catch(ex){
        console.log('Approval error:', ex);
        rejected('Approval error, try again later');
        return false;
    }
    if (resp0.status === 'called') {
        console.log('Transfer approved:', amount, send.symbol);
    } else {
        console.log('[ERROR] Approval failed:', resp0.status);
        rejected('Approval failed, try again later');
        return false;
    }

    //let approved = await approveToken(pool, send, amount);
    //if(!approved){ console.log('Not approved'); return false; }
    try {
        let poolContract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
        let maxPrice = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
        // TODO: add slippage instead of max price
        let okSwap = await poolContract.methods.swapExactAmountIn(send.address, oneunits, receive.address, 0, maxPrice);
        //if(okSwap.transaction.signature.s) {
        if(okSwap) {
            resp1 = await okSwap.send(seeswap.gasSend);
            console.log('Resp1', resp1);
        } else {
            console.log('Swap rejected!');
            rejected('Swap rejected, try again later');
            return false;
        }
    } catch(ex) {
        console.log('Swap error:', ex);
        rejected('Swap error, try again later');
        return false;
    }
    if (resp1.status === "called") {
        console.log('Swap successful')
        return true;
    } else {
        console.log('[ERROR] Swap failed:', resp1.status)
        rejected('Swap failed, try again later');
        return false;
    }
    return false;
}

async function sendToken(tokenAddress, amount, receiver, rejected) {
    console.log('SendToken', tokenAddress, amount, receiver);
    let destin = receiver;
    if(receiver.startsWith('one')){
        destin = seeswap.harmony.crypto.getAddress(receiver).checksum;
    }
    let value = new seeswap.harmony.utils.Unit(amount).asOne().toWei();
    console.log('Value', value);
    console.log('Wei', value.toString());
    let txid  = null;
    try { 
        let contract = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, tokenAddress)
        let attached = await attachWallet(contract.wallet, null, rejected);
        let resp     = await contract.methods.transfer(destin, value).send(seeswap.gasSend);
        if(resp.status=='called'){ 
            console.log(resp.transaction.txStatus, resp.transaction.id); 
            txid = resp.transaction.id; 
        } else { 
            console.log('SendToken failed:', resp); 
            rejected('Tx failed, try again later');
            return null;
        }
    } catch(ex){ 
        console.log('SendToken error:', ex) 
        rejected('Tx error, try again later');
        return null;
    }
    return txid;
}

async function sendPayment(amount, receiver, rejected) {
    let txid = null;
    let destin = receiver;
    if(receiver.startsWith('0x')){
        destin = seeswap.harmony.crypto.getAddress(receiver).bech32;
    }
    let wei  = new seeswap.harmony.utils.Unit(amount).asWei();
    console.log('Pay', wei, destin)
    console.log('Wei', wei.toString())
    const txn = seeswap.harmony.transactions.newTx({
        to: destin,
        value: wei,
        shardID: 0,
        toShardID: 0,
        gasPrice: '1000000000',
        gasLimit: '21000'
    });
    let attached = await attachWallet(seeswap.harmony.wallet, null, rejected);
    let   signed = await seeswap.harmony.wallet.signTransaction(txn);
    try { 
        let res = await seeswap.harmony.blockchain.sendTransaction(signed);
        console.log('Res', res);
        if(res.error){ 
            console.log('Tx Error:', res.error.message);
            //rejected('Payment error!')
            return null;
        } else if(res.result){ 
            console.log('Tx', res.result);
            txid = res.result;
        } else {
            console.log('No Tx?');
        }
    } catch(ex){ 
        console.log('Payment error:', ex.message);
        rejected(ex.message)
        return null;
    }
    return txid;
}


async function wrapOnes(wrapper, amount, rejected) {
    console.log('WrapOnes', amount);
    let value = new seeswap.harmony.utils.Unit(amount).asOne().toWei();
    console.log('Value', value);
    console.log('Wei', value.toString());
    let txid  = null;
    try { 
        let contract = seeswap.harmony.contracts.createContract(seeswap.OneWrapper.abi, wrapper)
        let attached = await attachWallet(contract.wallet, null, rejected);
        let resp = await contract.methods.wrap().send({value: value, ...seeswap.gasSend})
        if(resp.status=='called'){ 
            console.log(resp.transaction.txStatus, resp.transaction.id); 
            txid = resp.transaction.id; 
        } else { 
            console.log('Wrap ones failed:', resp); 
            rejected('Tx failed, try again later');
            return null;
        }
    } catch(ex){ 
        console.log('Wrap ones error:', ex) ;
        rejected('Tx error, try again later');
        return null;
    }
    return txid;
}

async function unwrapOnes(wrapper, amount, rejected) {
    console.log('UnwrapOnes', amount);
    let value = new seeswap.harmony.utils.Unit(amount).asOne().toWei();
    console.log('Value', value);
    console.log('Wei', value.toString());
    let txid  = null;
    try { 
        let contract = seeswap.harmony.contracts.createContract(seeswap.OneWrapper.abi, wrapper)
        let attached = await attachWallet(contract.wallet, null, rejected);
        let resp = await contract.methods.unwrap(value).send(seeswap.gasSend);
        if(resp.status=='called'){ 
            console.log(resp.transaction.txStatus, resp.transaction.id); 
            txid = resp.transaction.id; 
        } else { 
            console.log('Unwrap ones failed:', resp); 
            rejected('Tx failed, try again later');
            return null;
        }
    } catch(ex){ 
        console.log('Unwrap ones error:', ex) ;
        rejected('Tx error, try again later');
        return null;
    }
    return txid;
}


var seeswap = {
    // Data
    version        : '1.0.0',
    isLoaded       : false,
    mainnet        : MAINNET,
    testnet        : TESTNET,
    network        : MAINNET,
    harmony        : null,
    extension      : null,
    wallet         : null,
    account        : null,
    pool           : null,
    tokens         : null,
    poolContract   : null,
    tokenContract  : null,
    gasSend        : { gasPrice: 1000000000, gasLimit: 6721900 },
    gasCall        : { gasPrice: 1000000000, gasLimit:   31900 },
    // Methods
    init           : init,
    connect        : connect,
    disconnect     : disconnect,
    setSharding    : setSharding,
    getAccount     : getAccount,
    addWallet      : addWallet,
    addSigner      : addSigner,
    getBalance     : getBalance,
    getAllowance   : getAllowance,
    checkBalance   : checkBalance,
    getPoolInfo    : getPoolInfo,
    getPoolData    : getPoolData,
    getPoolBalance : getPoolBalance,
    getPoolPrice   : getPoolPrice,
    getSwapFee     : getSwapFee,
    approveToken   : approveToken,
    bindToken      : bindToken,
    getTokenWeight : getTokenWeight,
    setupPool      : setupPool,
    finalizePool   : finalizePool,
    joinPool       : joinPool,
    exitPool       : exitPool,
    swapTokens     : swapTokens,
    sendToken      : sendToken,
    sendPayment    : sendPayment,
    wrapOnes       : wrapOnes,
    unwrapOnes     : unwrapOnes,
    test           : test
};

window.seeswap = seeswap;
export default seeswap;

// UTILS

function money(amountBN, dec=2) {
    if(!amountBN){ return 0; }
    var num = null;
    try { num = parseFloat(new seeswap.harmony.utils.Unit(amountBN).asWei().toOne()).toFixed(dec); }
    catch(ex) { console.log('Error parsing money units'); }
    return num;
}


// END