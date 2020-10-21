// SEESWAP SDK

const TESTNET = 'https://api.s0.b.hmny.io/';
const MAINNET = 'https://api.s0.t.hmny.io/';

let HarmonyUtilsX = import('../modules/HarmonyUtils.browser.js');
let HarmonyNetX   = import('../modules/HarmonyNetwork.browser.js');
let HarmonyJsX    = import('../modules/HarmonyJs.browser.js');

async function loadContracts() {
    console.log('Loading contracts...');
    let res1 = await fetch('../contracts/BPOOL.json', {method:'get'});
    let res2 = await fetch('../contracts/HRC20.json', {method:'get'});
    let res3 = await fetch('../contracts/ONES.json',  {method:'get'});
    let res4 = await fetch('../contracts/USDS.json',  {method:'get'});
    let poolContract  = await res1.json();
    let tokenContract = await res2.json();
    let onesWrapper   = await res3.json();
    let usdsWrapper   = await res4.json();
    seeswap.PoolContract  = poolContract;
    seeswap.TokenContract = tokenContract;
    seeswap.OnesWrapper   = onesWrapper;
    seeswap.UsdsWrapper   = usdsWrapper;
    console.log('Contracts loaded');
}

async function init(network=MAINNET){
    console.log('Seeswap init...')
    if(!seeswap.isLoaded) { 
        try {
            await loadContracts(); 
            let chain = (network == MAINNET ? HarmonyUtils.ChainID.HmyMainnet : HarmonyUtils.ChainID.HmyTestnet);
            let opts  = {chainType: HarmonyUtils.ChainType.Harmony, chainId: chain};
            seeswap.network  = network;
            seeswap.harmony  = await HarmonyJs.Harmony(seeswap.network, opts);
            seeswap.isLoaded = true;
        } catch(ex){
            console.error('Error loading seeswap', ex);
        }
    }
    console.log('SeeSwap loaded');
}

async function connect(ext) {
    console.log('Wallet connect');
    try {
        let chain = (seeswap.network == MAINNET ? HarmonyUtils.ChainID.HmyMainnet : HarmonyUtils.ChainID.HmyTestnet);
        seeswap.extension = await new seeswap.harmony.HarmonyExtension(ext);
        seeswap.extension.provider  = new HarmonyNetwork.Provider(seeswap.network).provider;
        seeswap.extension.messenger = new HarmonyNetwork.Messenger(seeswap.extension.provider, HarmonyUtils.ChainType.Harmony, chain);
        seeswap.extension.setShardID(0);
        seeswap.extension.wallet.messenger = seeswap.extension.messenger;
        seeswap.extension.blockchain.messenger = seeswap.extension.messenger;
        seeswap.extension.transactions.messenger = seeswap.extension.messenger;
        seeswap.extension.contracts.wallet = seeswap.extension.wallet;
        console.log('- Harmony', seeswap.harmony);
        console.log('- Provider', seeswap.harmony.provider);
        console.log('- Messenger', seeswap.harmony.messenger);
        console.log('- Extension', seeswap.extension);
        console.log('- WalletX', seeswap.extension.wallet);
        console.log('- WalletC', seeswap.extension.contracts.wallet);
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
        address = HarmonyJs.crypto.getAddress(account.address).checksum;
    }
    console.log('Address:', address);
    wallet.defaultSigner = address;
    wallet.signTransaction = async function(tx, ad, rj) {
        console.log('Artifacts', tx, ad, rj)
        try {
            tx.from = address;
            let res = await seeswap.wallet.signTransaction(tx);
            console.log('Tx signed:', res);
            return res;
        } catch (ex) {
            console.log('Error signing tx:', ex);
            if(reject) { reject(ex, tx); }
        }
        return tx;
    }
}

async function getBalance(address) {
    console.log('Seeswap.getBalance', address);
    if(!address){
        address = seeswap.account.address; // Wallet must be loaded
    }
    address = addressToHex(address);
    let res = await seeswap.harmony.blockchain.getBalance({ address: address });
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

async function checkBalance(address, tokenAddress) {
    let contract = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, tokenAddress);
    let resp = await contract.methods.balanceOf(address).call(seeswap.gasCall);
    if (resp == null) {
        console.log('[ERROR] Unable to fetch balance');
        return null;
    }
    let bal = money(resp, 8);
    return bal;
}

async function getPoolBalance(pool, address) {
    let contract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
    let resp = await contract.methods.getBalance(address).call(seeswap.gasCall)
    let bal  = money(resp, 8)
    return bal
}

async function getPoolLiquidity(pool, tokenA, tokenB, address) {
    console.log('Pool liquidity', pool.name, 'for address', address);
    let pctx     = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
    let tactx    = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, tokenA)
    let tbctx    = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, tokenB)
    let poolbal  = await pctx.methods.totalSupply().call(seeswap.gasCall)
    let mystake  = await pctx.methods.balanceOf(address).call(seeswap.gasCall)
    let percent  = parseFloat(mystake)/parseFloat(poolbal)
    let priceA   = await pctx.methods.getSpotPriceSansFee(tokenA, tokenB).call(seeswap.gasCall)
    let priceB   = await pctx.methods.getSpotPriceSansFee(tokenB, tokenA).call(seeswap.gasCall)
    let poolbalA = await pctx.methods.getBalance(tokenA).call(seeswap.gasCall)
    let poolbalB = await pctx.methods.getBalance(tokenB).call(seeswap.gasCall)
    let balanceA = await tactx.methods.balanceOf(address).call(seeswap.gasCall)
    let balanceB = await tbctx.methods.balanceOf(address).call(seeswap.gasCall)
    let liquidA  = (money(poolbalA, 8) * 1 * percent).toFixed(8);
    let liquidB  = (money(poolbalB, 8) * 1 * percent).toFixed(8);
    //console.log('poolbal',  money(poolbal,8));
    //console.log('mystake',  money(mystake,8));
    //console.log('percent',  percent);
    //console.log('poolbalA', money(poolbalA,8));
    //console.log('poolbalB', money(poolbalB,8));
    //console.log('liquidA',  liquidA);
    //console.log('liquidB',  liquidB);
    //console.log('balanceA', money(balanceA,8));
    //console.log('balanceB', money(balanceB,8));
    let info = {
        pool: pool.name,
        balance: money(poolbal, 8),
        mystake: money(mystake, 8),
        percent: percent.toFixed(8),
        tokenA: { price: money(priceA, 8), liquidity: money(poolbalA, 8), myliquidity: liquidA, mybalance: money(balanceA, 8) },
        tokenB: { price: money(priceB, 8), liquidity: money(poolbalB, 8), myliquidity: liquidB, mybalance: money(balanceB, 8) }
    }
    return info;
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
    let oneunits = new seeswap.harmony.utils.Unit(amount).asOne().toWei();
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
    let amountU  = new seeswap.harmony.utils.Unit(amount).asOne().toWei();
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
    ok = await finalizePool(opts.pool)
    for (var i = 0; i < opts.tokens.length; i++) {
        ok = await getTokenWeight(opts.pool, opts.tokens[i].token.address)
        if(!ok){ return false; }
    }
    return true;
}

async function joinPool(pool, tokenA, tokenB, share, rejected) {
    console.log('Joining pool...');
    //let unitsIn  = (share * 10**18).toString();
    let unitsIn  = new seeswap.harmony.utils.Unit(share).asOne().toWei();
    let unitsOut = 0;
    console.log('Share', share);
    console.log('Units', unitsIn);

    let max   = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";
    let maxIn = [max,max]; // Max per token
    let wei   = unitsIn;
    let weiA  = max;
    let weiB  = max;


    let pctx  = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi,  pool.address);
    let tctxA = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, tokenA.address);
    let tctxB = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, tokenB.address);

    let attachedP = await attachWallet(pctx.wallet,  null, rejected);
    let attachedA = await attachWallet(tctxA.wallet, null, rejected);
    let attachedB = await attachWallet(tctxB.wallet, null, rejected);

    console.log('Approving transfer:', weiA.toString(), tokenA.name);
    let resp0 = await tctxA.methods.approve(pool.address, weiA).send(seeswap.gasSend)
    if (resp0.status === 'called') { console.log('Transfer approved:', weiA.toString(), tokenA.name); }
    else { console.log('Approval failed:', resp0.status);  return false; }

    console.log('Approving transfer:', weiB.toString(), tokenB.name);
    let resp1 = await tctxB.methods.approve(pool.address, weiB).send(seeswap.gasSend)
    if (resp1.status === 'called') { console.log('Transfer approved:', weiB.toString(), tokenB.name); }
    else { console.log('Approval failed:', resp1.status);  return false; }

    console.log('Joining pool with shares:', wei.toString());
    let resp2 = await pctx.methods.joinPool(wei, maxIn).send(seeswap.gasSend)
    if (resp2.status === "called") { console.log('Pool joined with', share, 'SWP') }
    else { console.log('Failed to join pool', resp2.status); rejected('Error: Failed to join pool'); return false; }

    return true;
}

async function joinPoolOLD(pool, token, amountIn, rejected) {
    console.log('Joining pool...');
    //let unitsIn  = (amountIn * 10**18).toString();
    let unitsIn  = new seeswap.harmony.utils.Unit(amountIn).asOne().toWei();
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

async function exitPool(pool, share, rejected) {
    console.log('Exiting pool...');
    //let wei = (share * 10**18).toString();
    let wei = new seeswap.harmony.utils.Unit(share).asOne().toWei();
    console.log('Share', share);
    console.log('Units', wei);
    let mins = ['0','0'];
    let contract = seeswap.harmony.contracts.createContract(seeswap.PoolContract.abi, pool.address)
    let attached = await attachWallet(contract.wallet, null, rejected);
    let resp = await contract.methods.exitPool(wei, mins).send(seeswap.gasSend)
    var ok = false;
    if (resp.status === "called") {
        console.log('Exit pool', share);
        ok = true;
    } else {
        console.log(resp.status);
        console.log('[ERROR] Failed to exit pool.', resp);
        rejected('Error: Failed to exit pool');
        return false;
    }
    return ok
}

async function exitPoolOLD(pool, token, amount, rejected) {
    console.log('Exiting pool...');
    //let amountU  = (amount * 10**18).toString();
    let amountU  = new seeswap.harmony.utils.Unit(amount).asOne().toWei();
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
    //let oneunits = (amount * 10**18).toString();
    let oneunits = new seeswap.harmony.utils.Unit(amount).asOne().toWei();
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
        let gas = { gasPrice: 1000000000, gasLimit: 50000 };
        let contract = seeswap.harmony.contracts.createContract(seeswap.TokenContract.abi, tokenAddress)
        let attached = await attachWallet(contract.wallet, null, rejected);
        let resp     = await contract.methods.transfer(destin, value).send(gas);
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
    console.log('Wei', value.toString());
    let txid  = null;
    try { 
        let gas = { gasPrice: 1000000000, gasLimit: 75000 };
        let contract = seeswap.harmony.contracts.createContract(seeswap.OnesWrapper.abi, wrapper)
        let attached = await attachWallet(contract.wallet, null, rejected);
        let resp = await contract.methods.wrap().send({value: value, ...gas})
        if(resp.status=='called'){ 
            console.log(resp.transaction.txStatus, resp.transaction.id); 
            txid = resp.transaction.id; 
        } else { 
            console.log('Wrap Ones failed:', resp); 
            rejected('Tx failed, try again later');
            return null;
        }
    } catch(ex){ 
        console.log('Wrap Ones error:', ex) ;
        rejected('Tx error, try again later');
        return null;
    }
    return txid;
}

async function unwrapOnes(wrapper, amount, rejected) {
    console.log('UnwrapOnes', amount);
    let value = new seeswap.harmony.utils.Unit(amount).asOne().toWei();
    console.log('Wei', value.toString());
    let txid  = null;
    try { 
        let gas = { gasPrice: 1000000000, gasLimit: 75000 };
        let contract = seeswap.harmony.contracts.createContract(seeswap.OnesWrapper.abi, wrapper)
        let attached = await attachWallet(contract.wallet, null, rejected);
        let resp = await contract.methods.unwrap(value).send(gas);
        if(resp.status=='called'){ 
            console.log(resp.transaction.txStatus, resp.transaction.id); 
            txid = resp.transaction.id; 
        } else { 
            console.log('Unwrap Ones failed:', resp); 
            rejected('Tx failed, try again later');
            return null;
        }
    } catch(ex){ 
        console.log('Unwrap Ones error:', ex) ;
        rejected('Tx error, try again later');
        return null;
    }
    return txid;
}

async function wrapUsds(wrapper, amount, rejected) {
    console.log('WrapUsds', amount);
    let value = new seeswap.harmony.utils.Unit(amount).asOne().toWei();
    console.log('Wei', value.toString());
    let txid  = null;
    try { 
        let gas = { gasPrice: 1000000000, gasLimit: 75000 };
        let contract = seeswap.harmony.contracts.createContract(seeswap.UsdsWrapper.abi, wrapper)
        let attached = await attachWallet(contract.wallet, null, rejected);
        let resp = await contract.methods.wrap().send({value: value, ...gas})
        if(resp.status=='called'){ 
            console.log(resp.transaction.txStatus, resp.transaction.id); 
            txid = resp.transaction.id; 
        } else { 
            console.log('Wrap Usds failed:', resp); 
            rejected('Tx failed, try again later');
            return null;
        }
    } catch(ex){ 
        console.log('Wrap Usds error:', ex) ;
        rejected('Tx error, try again later');
        return null;
    }
    return txid;
}

async function unwrapUsds(wrapper, amount, rejected) {
    console.log('UnwrapUsds', amount);
    let value = new seeswap.harmony.utils.Unit(amount).asOne().toWei();
    console.log('Wei', value.toString());
    let txid  = null;
    try { 
        let gas = { gasPrice: 1000000000, gasLimit: 75000 };
        let contract = seeswap.harmony.contracts.createContract(seeswap.UsdsWrapper.abi, wrapper)
        let attached = await attachWallet(contract.wallet, null, rejected);
        let resp = await contract.methods.unwrap(value).send(gas);
        if(resp.status=='called'){ 
            console.log(resp.transaction.txStatus, resp.transaction.id); 
            txid = resp.transaction.id; 
        } else { 
            console.log('Unwrap Usds failed:', resp); 
            rejected('Tx failed, try again later');
            return null;
        }
    } catch(ex){ 
        console.log('Unwrap Usds error:', ex) ;
        rejected('Tx error, try again later');
        return null;
    }
    return txid;
}


var seeswap = {
    // Data
    version          : '1.0.0',
    isLoaded         : false,
    mainnet          : MAINNET,
    testnet          : TESTNET,
    network          : TESTNET,
    harmony          : null,
    extension        : null,
    wallet           : null,
    account          : null,
    pool             : null,
    tokens           : null,
    PoolContract     : null,
    TokenContract    : null,
    OnesWrapper      : null,
    UsdsWrapper      : null,
    gasSend          : { gasPrice: 1000000000, gasLimit: 6721900 },
    gasCall          : { gasPrice: 1000000000, gasLimit:   31900 },
    // Methods
    init             : init,
    connect          : connect,
    disconnect       : disconnect,
    setSharding      : setSharding,
    getAccount       : getAccount,
    addWallet        : addWallet,
    addSigner        : addSigner,
    getBalance       : getBalance,
    getAllowance     : getAllowance,
    checkBalance     : checkBalance,
    getPoolInfo      : getPoolInfo,
    getPoolData      : getPoolData,
    getPoolBalance   : getPoolBalance,
    getPoolLiquidity : getPoolLiquidity,
    getPoolPrice     : getPoolPrice,
    getSwapFee       : getSwapFee,
    approveToken     : approveToken,
    bindToken        : bindToken,
    getTokenWeight   : getTokenWeight,
    setupPool        : setupPool,
    finalizePool     : finalizePool,
    joinPool         : joinPool,
    exitPool         : exitPool,
    swapTokens       : swapTokens,
    sendToken        : sendToken,
    sendPayment      : sendPayment,
    wrapOnes         : wrapOnes,
    unwrapOnes       : unwrapOnes,
    wrapUsds         : wrapUsds,
    unwrapUsds       : unwrapUsds
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

function addressToBech32(address) {
    if(address.startsWith('0x')){
        return seeswap.harmony.crypto.getAddress(address).bech32;
    }
    return address;
}

function addressToHex(address) {
    if(address.startsWith('one')){
        return seeswap.harmony.crypto.getAddress(address).checksum;
    }
    return address;
}


// END