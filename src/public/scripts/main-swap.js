// SEESWAP SWAP

var session = {
	network   : 0, // 0.testnet 1.mainnet
	wallet    : null,
    address   : null,
	connected : false,
    market    : 'ONEs/USDs',
    base      : 'ONEs',
    quote     : 'USDs',
    onePrice  : 0.01,
    btcPrice  : 10000.00,
};

var swap = {
	pool     : '',
	sell     : 'ONEs',
	buy      : 'USDs',
	price    : '1.00',
	amount   : '1',
	fee      : '0.005',
	slippage : '0.5',
	myBalSell: '0',
	myBalBuy : '0'
};

var wrapOnes = {
	wrapper  : 1,
	sell     : 'ONE',
	buy      : 'ONEs',
	price    : 1.00,
	amount   : 0.00,
	wfee     : 0.01,
	ufee     : 0.01,
	oneBal   : 0.00,
	onesBal  : 0.00,
	myOneBal : 0.00,
	myOnesBal: 0.00
};

var wrapUsds = {
	wrapper  : 1,
	sell     : 'ONE',
	buy      : 'USDs',
	price    : 1.00,
	amount   : 0.00,
	wfee     : 0.01,
	ufee     : 0.01,
	oneBal   : 0.00,
	usdsBal  : 0.00,
	myOneBal : 0.00,
	myUsdsBal: 0.00
};

var chartInfo = {
    market  : '',
    data    : null,
    candles : {'ONE':[]},
    ticks   : [300000, 900000, 3600000, 86400000, 604800000],  // 5m 15m 1h 1d 1w 
	symbol  : 'ONE',
    period  : 2  // 1h
}

var ticker  = {};
var klines  = {};
var assets  = {};
var pools   = {};

var _config = {
	testnet: {
		network: 'https://api.s0.b.hmny.io/',
		pools  : 'data/pools-testnet.json',
		markets: {'ONEs/USDs':'ONE/USDT','SEE/ONEs':'','ARANK/ONEs':'','EUSK/ONEs':'','SEED/ONEs':''},
		symbols: {'ONE':'ONE','ONEs':'ONE','USDs':'','SEE':'','ARANK':'','EUSK':'','SEED':''},
		icons  : {'ONE':'one','ONEs':'ones','USDs':'usds','SEE':'see','ARANK':'arank','EUSK':'eusk','SEED':'seed'},
		USDSActive : true,
		USDSWrapper: '0xed8E8980d287B07C114afCaCcD871489A2604f5e',
		ONESActive : true,
		ONESWrapper: '0xFD2117D4Ba367275e0b8186F8d98Aac96cCE9700',
		initicker: 'ONE'
	},
	mainnet: {
		network: 'https://api.s0.t.hmny.io/',
		pools  : 'data/pools-mainnet.json',
		markets: {'ONEs/USDs':'ONE/USDT','SEE/ONEs':'','ARANK/ONEs':'','EUSK/ONEs':'','SEED/ONEs':''},
		symbols: {'ONE':'ONE','ONEs':'ONE','USDs':'','SEE':'','ARANK':'','EUSK':'','SEED':''},
		icons  : {'ONE':'one','ONEs':'ones','USDs':'usds','SEE':'see','ARANK':'arank','EUSK':'eusk','SEED':'seed'},
		USDSActive : true,
		USDSWrapper: '0xFCE523163e2eE1F5f0828eCe554E9D839bEA17F5',
		ONESActive : true,
		ONESWrapper: '0xB2f2C1D77113042f5ee9202d48F6d15FB99efb63',
		initicker: 'ONE'
	}
}

var config = (session.network==1 ? _config.mainnet : _config.testnet);


// UTILS

function $(id) { return document.getElementById(id); }

function getIconName(sym) { 
	return 'assets/'+(config.icons[sym]||'noicon')+'.png'; 
}

function money(n, d=2) { 
	return Number(n).toLocaleString(undefined, {minimumFractionDigits:d, maximumFractionDigits:d}); 
}

function validNumber(text='') {
    let number, value;
    let sep = Intl.NumberFormat(navigator.language).format(1000).substr(1,1) || ',';
    if(sep==','){ value = text.replace(/\,/g,''); }
    else if(sep=='.'){ value = text.replace(/\./g,'').replace(',','.'); }
    try { number = parseFloat(value) || 0.0; } catch(ex){ console.log(ex); number = 0.0; }
    return number;
}


// WALLET

async function connectState(n) {
	switch(n){
		case 0:
			$('connect').enabled = true;
			$('connect').innerHTML = 'Connect wallet';
			break;
		case 1:
			$('connect').enabled = false;
			$('connect').innerHTML = 'Connecting...';
			break;
		case 2:
			$('connect').enabled = true;
			$('connect').innerHTML = 'Wallet Connected';
			break;
	}
}

async function connectWallet() {
	let ext = null; 
	connectState(1); // connecting
	if(window.onewallet && window.onewallet.isOneWallet){
		ext = window.onewallet;  // Harmony One wallet
		name = 'onewallet';
	} else if(window.harmony){
		ext = window.harmony;    // Math wallet
		name = 'harmony';
	} else {
		alert('Error: Wallet not connected'); 
		connectState(0); // Connect
		return false;
	}
	let connected = await seeswap.connect(ext);
	if(!connected){ 
		alert('Error: Wallet not connected'); 
		connectState(0);
		return false; 
	} else { 
		let account = await seeswap.getAccount();
		if(!account){
			alert('Error: Account not selected'); 
			connectState(0); // connect
			return false; 
		}
		//console.log('Account', account.address, account.name);
		session.wallet = name;
		session.connected = true;
        session.address = account.address;
		connectState(2); // connected
		showBalance(session.address);
	}
	return true;
}

async function disconnectWallet() {
	$('connect').enabled = false;
	$('connect').innerHTML = 'Disconnecting...';
	await seeswap.disconnect();
	session.wallet = '';
	session.connected = false;
	$('connect').innerHTML = 'Connect wallet';
	$('connect').enabled = true;
}

async function loadSeeSwap() {
	console.log('SeeSwap', seeswap.version)
	await seeswap.init(config.network);
	if(window.onewallet && window.onewallet.isOneWallet){
		seeswap.wallet = window.onewallet;  // Harmony One wallet
	} else if(window.harmony){
		seeswap.wallet = window.harmony;    // Math wallet
	}
	return seeswap.isLoaded;
}


// UI METHODS

function setColorTheme() {
	let mode = document.body.className;
	//$('theme-icon').src   = (mode=='dark-mode')?'media/icon-light.png':'media/icon-dark.png';
	$('theme-icon').title = (mode=='dark-mode')?'Light mode':'Dark mode'; 
}

function swapMode() {
	let mode = document.body.className;
	document.body.className = (mode=='dark-mode')?'light-mode':'dark-mode'; 
	//$('theme-icon').src = (mode=='dark-mode')?'media/icon-dark.png':'media/icon-light.png'; 
	$('theme-icon').title = (mode=='dark-mode')?'Dark mode':'Light mode'; 
}

function showTicker(symbol, ticker) {
	let decs = (ticker.lastPrice>1000?4:8);
	$('index-base').innerHTML     = symbol;
	$('coin-price').innerHTML     = money(ticker.weightedAvgPrice, decs);
	$('total-volume').innerHTML   = money(ticker.volume, 2);
	$('total-volusd').innerHTML   = money(ticker.quoteVolume, 2);
	$('total-percent').innerHTML  = money(ticker.priceChangePercent, 2) + '%';
	$('total-change24').innerHTML = money(ticker.priceChange, decs);
}

function showMarketInfo(symbol, info) {
	let decs = (info.lowPrice>1000?4:8);
	let spread = (info.highPrice - info.lowPrice) * 100 / info.highPrice;
	$("price-open").innerHTML   = money(info.openPrice, decs);
	$("price-high").innerHTML   = money(info.highPrice, decs);
	$("price-low").innerHTML    = money(info.lowPrice, decs);
	$("price-close").innerHTML  = money(info.prevClosePrice, decs);
	$("price-spread").innerHTML = money(spread, 4)+'%';
}

async function showBalance(address) {
	if(!address){ return; }
	let res = await seeswap.harmony.blockchain.getBalance({ address: address });
	console.log('Balance', res);
	if(res){
        $('user-address').innerHTML = 'Address: ' + session.address.substr(0,8);
		$('user-balance').innerHTML = 'Balance: ' + money(parseInt(res.result, 16) / 10**18, 2);
	}
}

async function showMyBalances() {
	if(!session.address || !swap.pool){ return; }
	let pool = pools[swap.pool];
	let tokenA = pool.tokens[swap.sell].address;
	let tokenB = pool.tokens[swap.buy].address;
	let res1 = await seeswap.checkBalance(session.address, tokenA);
	let res2 = await seeswap.checkBalance(session.address, tokenB);
	console.log('My Balances', res1, res2);
	swap.myBalSell = res1;
	swap.myBalBuy  = res2;
	if(res1){
		$('sell-asset-mybalance').innerHTML = 'My balance: ' + money(res1, 8);
		$('buy-asset-mybalance').innerHTML  = 'My balance: ' + money(res2, 8);
	}
}


// CHART

function clearCandles() {
    for(var id in chartInfo.candles){
        for(var period in chartInfo.candles[id]){
            chartInfo.candles[id][period] = null; // Candlestick cached data
        }
    }
}

function onChartPeriod(n) {
    chartInfo.period = n;
    setChartButtons(n);
    getChartData(chartInfo.market, chartInfo.period);
}

function setChartButtons(n) {
    $('chart-action0').classList.remove('selected');
    $('chart-action1').classList.remove('selected');
    $('chart-action2').classList.remove('selected');
    $('chart-action3').classList.remove('selected');
    $('chart-action4').classList.remove('selected');
    var tag;
    switch(n){
        case 0:  tag = $('chart-action0'); break;
        case 1:  tag = $('chart-action1'); break;
        case 2:  tag = $('chart-action2'); break;
        case 3:  tag = $('chart-action3'); break;
        case 4:  tag = $('chart-action4'); break;
        default: tag = $('chart-action2'); break;
    }
    tag.classList.add('selected');
}

function clearChart(market) {
    $('chart').innerHTML = '';
    $('chart-label').innerHTML = market.slice(0,-1)+' N/A';
}

async function getChartData(market, period) {
	if(!market){ market = 'ONE/USDT'; }
    console.log("Loading chart data for", market, period);
    if(chartInfo.candles[market] && chartInfo.candles[market][period]){ onChartData(chartInfo.candles[market][period], market, period); return; }
    let pair = market.replace('/',':');
    var url = 'api/getchart?market='+pair+'&period='+period;
    //console.log('Chart url: '+url);

    if(market=='BSV/USDT'){ 
        console.log('Binance does not list BSV');
        clearChart(market);
        return; 
    }

    var resp, info;
    try {
    	resp = await fetch(url, {method:'get'});
    	info = await resp.json();
    } catch(ex) {
    	console.log('Error fetching chart data');
    	return;
    }
    //console.log('Chart data for', market, info);

    if(!chartInfo.candles[market]){ chartInfo.candles[market] = []; }
    chartInfo.candles[market][period] = info;  // Cache chart data for faster drawing

    // Parse data
    var data   = null;
    var factor = 1;
    var suffix = market.split('/')[0];

    data = info.map(item=>{
        return {
            time:   parseInt(item[0]),
            date:   new Date(parseInt(item[0])),
            open:   parseFloat(item[1])*factor,
            high:   parseFloat(item[2])*factor,
            low:    parseFloat(item[3])*factor,
            close:  parseFloat(item[4])*factor,
            volume: parseFloat(item[5])
        };
    });

    onChartData(data, market, period);
}

function onChartData(data, market, period) {
    //console.log('Chart data', data);
    if(!chartInfo.candles[market]){ chartInfo.candles[market] = []; }
    chartInfo.candles[market][period] = data;  // Cache chart data for faster drawing

    var last   = {open:0, high:0, low:0, close:0, spread:0};
    last.open  = data[0].open;
    last.close = data[data.length-1].close;
    last.low   = 999999;
    for(var i in data){
        if(data[i].low  < last.low ) { last.low  = data[i].low;  }
        if(data[i].high > last.high) { last.high = data[i].high; }
    }
    last.spread = ((last.high/last.low-1)*100).toFixed(4);
    decs = last.high > 100 ? 4 : 8;

    $('price-open').innerHTML   = money(last.open,  decs);
    $('price-high').innerHTML   = money(last.high,  decs);
    $('price-low').innerHTML    = money(last.low,   decs);
    $('price-close').innerHTML  = money(last.close, decs);
    $('price-spread').innerHTML = money(last.spread, 4)+'%';

    $('chart').innerHTML = '';  //clearChart();
    chartInfo.data = data;
    var chart = new FinChart('chart');
    chart.draw(data);  
    $('chart-label').innerHTML = market.slice(0,-1);
}


// POOLS

function showPools(pools){
	console.log('Pools', pools);
	let html  = '';
	let table = $('pools-list');
	let row   = '<tr id="{id}"><td><img class="pool-icon" src="{icon1}"> <img class="pool-icon" src="{icon2}"></td><td>{symbols}</td><td>{baseBal}</td><td>{basePrice}</td><td>{quoteBal}</td><td>{quotePrice}</td><td>{fee}</td><td><button id="swap-{id}" class="pool-swap" onclick="onSelect(\'{id}\')" {disabled}>{swap}</button></td></tr>';
	let list  = Object.keys(pools);
	//console.log(list);
	for(var key in pools){
		item = pools[key];
		//console.log(item);
		let syms = Object.keys(item.tokens);
		//console.log(syms);
		let symbols = syms.join('/');
		html += row.replace(/{id}/g,        key) //key.substr(2,10))
		           .replace('{icon1}',      item.tokens[syms[0]].icon)
		           .replace('{icon2}',      item.tokens[syms[1]].icon)
		           .replace('{symbols}',    symbols)
		           .replace('{baseBal}',    money(item.tokens[syms[0]].balance, 4))
		           .replace('{basePrice}',  money(item.tokens[syms[0]].price, 4))
		           .replace('{quoteBal}',   money(item.tokens[syms[1]].balance, 4))
		           .replace('{quotePrice}', money(item.tokens[syms[1]].price, 4))
		           .replace('{fee}',        money(item.swapfee*100, 1)+'%')
		           .replace('{disabled}',   (item.active?'':'disabled="disabled"'))
		           .replace('{swap}',       (item.active?'SWAP':'N/A'))
	}
	table.tBodies[0].innerHTML = html;
}

async function loadTicker(symbol='ONE') {
	var res = await fetch('api/getindices/'+symbol, {method:'get'});
	ticker = await res.json();
	showTicker(symbol, ticker);
	showMarketInfo(symbol, ticker);
}

async function loadChart() {
	clearCandles();
	chartInfo.market = 'ONE/USDT';
	chartInfo.period = 2;
	getChartData(chartInfo.market, chartInfo.period);
}

async function loadPools() {
	var res  = await fetch(config.pools, {method:'get'});
	var data = await res.json();
	pools = data.pools;
	showPools(pools);
}

async function selectPool(poolId) {
	console.log('Selected Pool', poolId);
	let pool = pools[poolId];
	seeswap.pool = pool;
	swap.pool    = poolId;
	swap.sell    = pool.base;
	swap.buy     = pool.quote;
	swap.amount  = 1.0;
	$('entry-swap').disabled = !pool.active;
	$('sell-asset-qty').value = '1.00';
	clearStatus();
	selectPoolRow(poolId);
	showAssets();
	// Indices
	let symbol = config.symbols[pool.base];
	if(!symbol){ symbol = 'ONE'; }
	loadTicker(symbol);
	// Chart
    chartInfo.market = config.markets[pool.name];
    getChartData(chartInfo.market, chartInfo.period);
	let info = await seeswap.getPoolInfo(pool);
	if(info){ 
		swap.price = swap.sell==pool.base ? info.quote.price : info.base.price; 
	    $('pool-price-label').innerHTML = swap.sell+'/'+swap.buy;
    	$('pool-price-value').value = swap.price;
		updatePoolInfo(poolId, info);  // table.row for poolid
	}
	await showMyBalances();
	calcBuy();
}

function selectPoolRow(poolid) {
	var table = $('pools-list');
	var rows  = table.tBodies[0].rows
	for (var i = 0; i < rows.length; i++) {
		rows[i].className = '';
		if(rows[i].id==poolid) { rows[i].className = 'select'; }
	}
}

async function showAssets() {
	let pool = pools[swap.pool];
	$('sell-asset-icon').src = pool.tokens[swap.sell].icon;
	$('sell-asset-symbol').innerHTML = swap.sell;
	$('buy-asset-icon').src = pool.tokens[swap.buy].icon;
	$('buy-asset-symbol').innerHTML = swap.buy;
	swap.price = await getPoolPrice(pool, swap.sell, swap.buy);
	//$('sell-asset-qty').value = $('buy-asset-qty').value.replace(/,/g, '');
	calcBuy();
}

async function getPoolPrice(pool, base, quote) {
    //console.log('Info', pool, base, quote);
    let price = await seeswap.getPoolPrice(pool, quote, base);
    console.log('Price', base, quote, price);
    $('pool-price-label').innerHTML = base+'/'+quote;
    $('pool-price-value').value = price;
    return price;
}

async function updatePoolInfo(address, info) {
	console.log('Pool info', info);
	if(!info){ return; }
    let row = $(address);
    if(!row){ console.log('No row?'); return; }
    row.cells[2].innerHTML = money(info.base.balance, 4);
    row.cells[3].innerHTML = money(info.base.price, 4);
    row.cells[4].innerHTML = money(info.quote.balance, 4);
    row.cells[5].innerHTML = money(info.quote.price, 4);
    row.cells[6].innerHTML = money(info.swapFee*100, 1)+'%';
}

async function getPoolInfo(pool) {
    //console.log('Pool', pool);
    let info = await seeswap.getPoolInfo(pool);
    console.log('Info', info);
    return info;
}

function getFirstPoolId() {
	let list = Object.keys(pools);
	if(list.length<1) { return; }
	let poolId = list[0];
	console.log('First pool', poolId);
	return poolId;
}

async function loadPoolPrices() {
	for(address in pools){
		let pool = pools[address];
    	let info = await seeswap.getPoolInfo(pool);
    	updatePoolInfo(address, info)
	}
}

async function updatePoolRow(pool) {
    let info = await seeswap.getPoolInfo(pool);
   	updatePoolInfo(pool.address, info);
}


// CALC

function calcSell() {
	let amount = validNumber($('buy-asset-qty').value);
	console.log('Sell', amount)
	sellAmount = amount / swap.price;
	swap.amount = sellAmount;
	$('sell-asset-qty').value = money(sellAmount, 8);
}

function calcBuy() {
	let amount = validNumber($('sell-asset-qty').value);
	console.log('Buy', amount)
	swap.amount = amount;
	buyAmount = amount * swap.price;
	$('buy-asset-qty').value = money(buyAmount, 8);
}

function calcWrapOnesSell() {
	let amount = validNumber($('wrap-ones-buy-qty').value);
	if(amount==0){ $('wrap-ones-sell-qty').value = 0; return; }
	console.log('Ones Sell', amount)
	let sellAmount = amount / wrapOnes.price;
	wrapOnes.amount = sellAmount;
	$('wrap-ones-sell-qty').value = money(sellAmount, 8);
}

function calcWrapOnesBuy() {
	let amount = validNumber($('wrap-ones-sell-qty').value);
	if(amount==0){ $('wrap-ones-buy-qty').value = 0; return; }
	console.log('Ones Buy', amount)
	wrapOnes.amount = amount;
	let buyAmount = amount * wrapOnes.price;
	$('wrap-ones-buy-qty').value = money(buyAmount, 8);
}

function calcWrapUsdsSell() {
	let amount = validNumber($('wrap-usds-buy-qty').value);
	if(amount==0){ $('wrap-usds-sell-qty').value = 0; return; }
	console.log('Usds Sell', amount)
	let sellAmount = amount / wrapUsds.price;
	wrapUsds.amount = sellAmount;
	$('wrap-usds-sell-qty').value = money(sellAmount, 8);
}

function calcWrapUsdsBuy() {
	let amount = validNumber($('wrap-usds-sell-qty').value);
	if(amount==0){ $('wrap-usds-buy-qty').value = 0; return; }
	console.log('Usds Buy', amount)
	wrapUsds.amount = amount;
	let buyAmount = amount * wrapUsds.price;
	$('wrap-usds-buy-qty').value = money(buyAmount, 8);
}


// UI DISABLE

function enableSwap() {
	$('entry-swap').innerHTML = 'SWAP';
	$('entry-swap').enabled = true;
}

function disableSwap() {
	$('entry-swap').innerHTML = 'WAIT';
	$('entry-swap').enabled = false;
}

function enableWrapOnes() {
	$('wrap-ones-swap').innerHTML = (wrapOnes.sell=='ONE'?'WRAP':'UNWRAP');
	$('wrap-ones-swap').enabled = true;
}

function disableWrapOnes() {
	$('wrap-ones-swap').innerHTML = 'WAIT';
	$('wrap-ones-swap').enabled = false;
}

function enableWrapUsds() {
	$('wrap-usds-swap').innerHTML = (wrapUsds.sell=='ONE'?'WRAP':'UNWRAP');
	$('wrap-usds-swap').enabled = true;
}

function disableWrapUsds() {
	$('wrap-usds-swap').innerHTML = 'WAIT';
	$('wrap-usds-swap').enabled = false;
}


// STATUS

function showStatus(txt, state=0, wait=false) {
    let div = $('status');
    let msg = $('message');
    let spn = $('spinner');
    msg.innerHTML = txt;
    spn.style.display = (wait?'inline':'none');
    switch(state) {
        case 0: div.className = 'normal'; break;
        case 1: div.className = 'warn';   break;
        case 2: div.className = 'error';  break;
    }
}

function showWait(msg)  { showStatus(msg, 0, true); }
function showWarn(msg)  { showStatus(msg, 1); }
function showError(msg) { showStatus(msg, 2); }
function clearStatus()  { showStatus('&nbsp;', 0); }
function signTxs(txt)   { $('signmsg').innerHTML = txt||'&nbsp;'; }


function showWrapOnesStatus(txt, state=0, wait=false) {
    let div = $('wrap-ones-status');
    let msg = $('wrap-ones-message');
    let spn = $('wrap-ones-spinner');
    msg.innerHTML = txt;
    spn.style.display = (wait?'inline':'none');
    switch(state) {
        case 0: div.className = 'normal'; break;
        case 1: div.className = 'warn';   break;
        case 2: div.className = 'error';  break;
    }
}

function showWrapOnesWait(msg)  { showWrapOnesStatus(msg, 0, true); }
function showWrapOnesWarn(msg)  { showWrapOnesStatus(msg, 1); }
function showWrapOnesError(msg) { showWrapOnesStatus(msg, 2); }
function clearWrapOnesStatus()  { showWrapOnesStatus('&nbsp;', 0); }
function signWrapOnesTxs(txt)   { $('wrap-ones-msg').innerHTML = txt||'&nbsp;'; }


function showWrapUsdsStatus(txt, state=0, wait=false) {
    let div = $('wrap-usds-status');
    let msg = $('wrap-usds-message');
    let spn = $('wrap-usds-spinner');
    msg.innerHTML = txt;
    spn.style.display = (wait?'inline':'none');
    switch(state) {
        case 0: div.className = 'normal'; break;
        case 1: div.className = 'warn';   break;
        case 2: div.className = 'error';  break;
    }
}

function showWrapUsdsWait(msg)  { showWrapUsdsStatus(msg, 0, true); }
function showWrapUsdsWarn(msg)  { showWrapUsdsStatus(msg, 1); }
function showWrapUsdsError(msg) { showWrapUsdsStatus(msg, 2); }
function clearWrapUsdsStatus()  { showWrapUsdsStatus('&nbsp;', 0); }
function signWrapUsdsTxs(txt)   { $('wrap-usds-msg').innerHTML = txt||'&nbsp;'; }


// WRAPPERS

function showWrapOnesPrice(price, invert=false) {
	if(invert){ price = 1/price; }
	$('wrap-ones-price-value').value = money(price, 8);
}

function showWrapUsdsPrice(price, invert=false) {
	if(invert){ price = 1/price; }
	$('wrap-usds-price-value').value = money(price, 8);
}

async function loadWrapOnesPrice() {
	var res, info;
	wrapOnes.price = 1.0;
	$('wrap-ones-swap').disabled = !config.ONESActive;
	showWrapOnesPrice(wrapOnes.price);
}

async function loadWrapUsdsPrice() {
	var res, info;
	res  = await fetch('api/getprice', {method:'get'});
	info = await res.json();
	wrapUsds.price = parseFloat(info.price);
	$('wrap-usds-swap').disabled = !config.USDSActive;
	showWrapUsdsPrice(wrapUsds.price);
}

async function loadWrapOnesBalance() {
	console.log('Fetching ONEs balances...');
	if(!session.address){ console.log('No session.address'); return; }
	console.log('Address', session.address);
	var res, info;
    let oneBal    = await seeswap.getBalance(config.ONESWrapper);
    let myOneBal  = await seeswap.getBalance(session.address);
    let wctx      = seeswap.harmony.contracts.createContract(seeswap.OnesWrapper.abi, config.ONESWrapper);
    let onesBal   = await wctx.methods.totalSupply().call(seeswap.gasCall);
    let myOnesBal = await wctx.methods.balanceOf(session.address).call(seeswap.gasCall);
	wrapOnes.oneBal    = oneBal;
	wrapOnes.onesBal   = onesBal/10**18;
	wrapOnes.myOneBal  = myOneBal;
	wrapOnes.myOnesBal = myOnesBal/10**18;
	console.log('ONE  liquidity:', wrapOnes.oneBal);
	console.log('ONE  mybalance:', wrapOnes.myOneBal);
	console.log('ONEs liquidity:', wrapOnes.onesBal);
	console.log('ONEs mybalance:', wrapOnes.myOnesBal);
	if(wrapOnes.sell=='ONE'){
		$('wrap-ones-sell-liquidity').innerHTML = 'Liquidity: '  + money(wrapOnes.oneBal, 8);
		$('wrap-ones-buy-liquidity').innerHTML  = 'Liquidity: '  + money(wrapOnes.onesBal, 8);
		$('wrap-ones-sell-mybalance').innerHTML = 'My Balance: ' + money(wrapOnes.myOneBal, 8);
		$('wrap-ones-buy-mybalance').innerHTML  = 'My Balance: ' + money(wrapOnes.myOnesBal, 8);
	} else {
		$('wrap-ones-sell-liquidity').innerHTML = 'Liquidity: '  + money(wrapOnes.onesBal, 8);
		$('wrap-ones-buy-liquidity').innerHTML  = 'Liquidity: '  + money(wrapOnes.oneBal, 8);
		$('wrap-ones-sell-mybalance').innerHTML = 'My Balance: ' + money(wrapOnes.myOnesBal, 8);
		$('wrap-ones-buy-mybalance').innerHTML  = 'My Balance: ' + money(wrapOnes.myOneBal, 8);
	}
}

async function loadWrapUsdsBalance() {
	console.log('Fetching USDs balances...');
	if(!session.address){ console.log('No session.address'); return; }
	console.log('Address', session.address);
	var res, info;
    let oneBal    = await seeswap.getBalance(config.USDSWrapper);
    let myOneBal  = await seeswap.getBalance(session.address);
    let wctx      = seeswap.harmony.contracts.createContract(seeswap.UsdsWrapper.abi, config.USDSWrapper);
    let usdsBal   = await wctx.methods.totalSupply().call(seeswap.gasCall);
    let myUsdsBal = await wctx.methods.balanceOf(session.address).call(seeswap.gasCall);
	wrapUsds.oneBal    = oneBal;
	wrapUsds.usdsBal   = usdsBal/10**18;
	wrapUsds.myOneBal  = myOneBal;
	wrapUsds.myUsdsBal = myUsdsBal/10**18;
	console.log('ONE  liquidity:', wrapUsds.oneBal);
	console.log('ONE  mybalance:', wrapUsds.myOneBal);
	console.log('USDs liquidity:', wrapUsds.usdsBal);
	console.log('USDs mybalance:', wrapUsds.myUsdsBal);
	if(wrapUsds.sell=='ONE'){
		$('wrap-usds-sell-liquidity').innerHTML = 'Liquidity: '  + money(wrapUsds.oneBal, 8);
		$('wrap-usds-buy-liquidity').innerHTML  = 'Liquidity: '  + money(wrapUsds.usdsBal, 8);
		$('wrap-usds-sell-mybalance').innerHTML = 'My Balance: ' + money(wrapUsds.myOneBal, 8);
		$('wrap-usds-buy-mybalance').innerHTML  = 'My Balance: ' + money(wrapUsds.myUsdsBal, 8);
	} else {
		$('wrap-usds-sell-liquidity').innerHTML = 'Liquidity: '  + money(wrapUsds.usdsBal, 8);
		$('wrap-usds-buy-liquidity').innerHTML  = 'Liquidity: '  + money(wrapUsds.oneBal, 8);
		$('wrap-usds-sell-mybalance').innerHTML = 'My Balance: ' + money(wrapUsds.myUsdsBal, 8);
		$('wrap-usds-buy-mybalance').innerHTML  = 'My Balance: ' + money(wrapUsds.myOneBal, 8);
	}
}

async function getWrapUsdsPrice(base, quote) {
	let resp, info;
    try {
	    resp = await fetch('api/getprice', {method:'get'});
    	info = await resp.json();
    } catch(ex) {
    	info = {error:'Error parsing data'};
    }
    if(info.error){  console.log('Price error: info error'); showWrapUsdsError('Error fetching price'); return null; }
    if(!info.price){ console.log('Price error: info price'); showWrapUsdsError('Error fetching price'); return null; }
    let price = parseFloat(info.price);
    if (quote=='ONE') { price = 1/price; }
    console.log('Wrap Usds price', price);
    return price;
}

async function wrapOnesInfo() {
	let market = wrapOnes.sell+'/'+wrapOnes.buy;
	$('wrap-ones-price-label').innerHTML = market;
	$('wrap-ones-sell-symbol').innerHTML = wrapOnes.sell;
	$('wrap-ones-buy-symbol').innerHTML  = wrapOnes.buy;
	$('wrap-ones-sell-icon').src = getIconName(wrapOnes.sell);
	$('wrap-ones-buy-icon').src  = getIconName(wrapOnes.buy);
	wrapOnes.price = 1.0;
	$('wrap-ones-price-value').value = money(wrapOnes.price, 8);
	calcWrapOnesBuy();
}

async function wrapUsdsInfo() {
	let market = wrapUsds.sell+'/'+wrapUsds.buy;
	$('wrap-usds-price-label').innerHTML = market;
	$('wrap-usds-sell-symbol').innerHTML = wrapUsds.sell;
	$('wrap-usds-buy-symbol').innerHTML  = wrapUsds.buy;
	$('wrap-usds-sell-icon').src = getIconName(wrapUsds.sell);
	$('wrap-usds-buy-icon').src  = getIconName(wrapUsds.buy);
	let price = await getWrapUsdsPrice(wrapUsds.sell, wrapUsds.buy);
	console.log('Price', market, price);
	if(price){
		$('wrap-usds-price-value').value = money(price, 8); 
		wrapUsds.price = price; 
		calcWrapUsdsBuy();
	}
}

async function goWrapOnes() {
	console.log('Wrapping ONE...')
	let amount  = validNumber($('wrap-ones-sell-qty').value);
	let wrapper = config.ONESWrapper;
	let reject  = function(msg, tx) { signWrapOnesTxs(); showWrapOnesError(msg); enableWrapOnes(); }
	let txid = await seeswap.wrapOnes(wrapper, amount, reject);
	console.log('Txid', txid);
	if(txid){
		signWrapOnesTxs('ONE payment received');
		showWrapOnesStatus('Tokens wrapped, check your wallet!');
	} else {
		signWrapOnesTxs(txid);
		showWrapOnesError('Wrapping error!');
    	return false;
	}
	return true;
}

async function goUnwrapOnes() {
	console.log('Unwrapping ONE...')
	let amount  = validNumber($('wrap-ones-sell-qty').value);
	let wrapper = config.ONESWrapper;
	let reject = function(msg, tx) { signWrapOnesTxs(); showWrapOnesError(msg); enableWrapOnes(); }
	let txid = await seeswap.unwrapOnes(wrapper, amount, reject);
	console.log('Txid', txid);
	if(txid){
		signWrapOnesTxs('ONEs tokens received');
		showWrapOnesStatus('Tokens unwrapped, check your wallet!');
	} else { 
		signWrapOnesTxs(txid);
    	showWrapOnesError('Unwrapping error!');
    	return false;
	}
	return true;
}

async function goWrapUsds() {
	console.log('Wrapping ONE/USDs...')
	let amount  = validNumber($('wrap-usds-sell-qty').value);
	let wrapper = config.USDSWrapper;
	let reject  = function(msg, tx) { signWrapUsdsTxs(); showWrapUsdsError(msg); enableWrapUsds(); }
	let txid = await seeswap.wrapUsds(wrapper, amount, reject);
	console.log('Txid', txid);
	if(txid){
		signWrapUsdsTxs('ONE payment received');
		showWrapUsdsStatus('Tokens wrapped, check your wallet!');
	} else {
		signWrapUsdsTxs(txid);
		showWrapUsdsError('Wrapping error!');
    	return false;
	}
	return true;
}

async function goUnwrapUsds() {
	console.log('Unwrapping USDs/ONE...')
	let amount  = validNumber($('wrap-usds-sell-qty').value);
	let wrapper = config.USDSWrapper;
	let reject = function(msg, tx) { signWrapUsdsTxs(); showWrapUsdsError(msg); enableWrapUsds(); }
	let txid = await seeswap.unwrapUsds(wrapper, amount, reject);
	console.log('Txid', txid);
	if(txid){
		signWrapUsdsTxs('USDs tokens received');
		showWrapUsdsStatus('Tokens unwrapped, check your wallet!');
	} else { 
		signWrapUsdsTxs(txid);
    	showWrapUsdsError('Unwrapping error!'); // TODO: fetch error message
    	return false;
	}
	return true;
}


//---- EVENTS

function enableEvents() {
	$('pools-list').addEventListener('click', function(event){onTableClick(event)},false);
	$('sell-asset-qty').addEventListener('keyup', calcBuy, true);
	$('buy-asset-qty').addEventListener('keyup', calcSell, true);
	$('wrap-ones-sell-qty').addEventListener('keyup', calcWrapOnesBuy, true);
	$('wrap-ones-buy-qty').addEventListener('keyup', calcWrapOnesSell, true);
	$('wrap-usds-sell-qty').addEventListener('keyup', calcWrapUsdsBuy, true);
	$('wrap-usds-buy-qty').addEventListener('keyup', calcWrapUsdsSell, true);
}

function onWallet() {
	if(!session.connected){
		connectWallet();
	} else {
		disconnectWallet();
	}
}

function onTableClick(event) {
	var row = event.target.parentNode;
	var poolid = row.id;
	if(!poolid) { return; }
	selectPool(poolid);
}

function onSelect(poolId) {
	console.log('onSelect', poolId);
	selectPool(poolId)
	window.location.href='#form';
	$('sell-asset-qty').focus();
}

async function onSwitch() {
	let tmp   = swap.sell;
	swap.sell = swap.buy;
	swap.buy  = tmp;
	$('sell-asset-qty').value = $('buy-asset-qty').value.replace(/,/g, '');
	await showAssets();
	await showMyBalances();
	calcBuy();
}

async function onWrapTabSel(tab) {
	if(tab==1){
		$('wrap-tab1').classList.add('wrap-sel');
		$('wrap-tab2').classList.remove('wrap-sel');
        $('ones-form').classList.add('selected');
        $('usds-form').classList.remove('selected');
		//switchWraps(1);
		//wrapOnesInfo();
		loadWrapOnesPrice();
		loadWrapOnesBalance();
	} else {
		$('wrap-tab1').classList.remove('wrap-sel');
		$('wrap-tab2').classList.add('wrap-sel');
        $('ones-form').classList.remove('selected');
        $('usds-form').classList.add('selected');
		//switchWraps(2);
		//wrapUsdsInfo();
		loadWrapUsdsPrice();
		loadWrapUsdsBalance();
	}
}

async function onWrapOnesSwitch() {
	let tmp   = wrapOnes.sell;
	wrapOnes.sell = wrapOnes.buy;
	wrapOnes.buy  = tmp;
	$('wrap-ones-swap').innerHTML = (wrapOnes.sell=='ONE'?'WRAP':'UNWRAP');
	$('wrap-ones-sell-qty').value = $('wrap-ones-buy-qty').value.replace(/,/g, '');
	if(wrapOnes.sell=='ONE'){
		$('wrap-ones-sell-liquidity').innerHTML = 'Liquidity: '  + money(wrapOnes.oneBal, 8);
		$('wrap-ones-buy-liquidity').innerHTML  = 'Liquidity: '  + money(wrapOnes.onesBal, 8);
		$('wrap-ones-sell-mybalance').innerHTML = 'My Balance: ' + money(wrapOnes.myOneBal, 8);
		$('wrap-ones-buy-mybalance').innerHTML  = 'My Balance: ' + money(wrapOnes.myOnesBal, 8);
	} else {
		$('wrap-ones-sell-liquidity').innerHTML = 'Liquidity: '  + money(wrapOnes.onesBal, 8);
		$('wrap-ones-buy-liquidity').innerHTML  = 'Liquidity: '  + money(wrapOnes.oneBal, 8);
		$('wrap-ones-sell-mybalance').innerHTML = 'My Balance: ' + money(wrapOnes.myOnesBal, 8);
		$('wrap-ones-buy-mybalance').innerHTML  = 'My Balance: ' + money(wrapOnes.myOneBal, 8);
	}
	wrapOnesInfo();
}

async function onWrapUsdsSwitch() {
	let tmp   = wrapUsds.sell;
	wrapUsds.sell = wrapUsds.buy;
	wrapUsds.buy  = tmp;
	$('wrap-usds-swap').innerHTML = (wrapUsds.sell=='ONE'?'WRAP':'UNWRAP');
	$('wrap-usds-sell-qty').value = $('wrap-usds-buy-qty').value.replace(/,/g, '');
	if(wrapUsds.sell=='ONE'){
		$('wrap-usds-sell-liquidity').innerHTML = 'Liquidity: '  + money(wrapUsds.oneBal, 8);
		$('wrap-usds-buy-liquidity').innerHTML  = 'Liquidity: '  + money(wrapUsds.usdsBal, 8);
		$('wrap-usds-sell-mybalance').innerHTML = 'My Balance: ' + money(wrapUsds.myOneBal, 8);
		$('wrap-usds-buy-mybalance').innerHTML  = 'My Balance: ' + money(wrapUsds.myUsdsBal, 8);
	} else {
		$('wrap-usds-sell-liquidity').innerHTML = 'Liquidity: '  + money(wrapUsds.usdsBal, 8);
		$('wrap-usds-buy-liquidity').innerHTML  = 'Liquidity: '  + money(wrapUsds.oneBal, 8);
		$('wrap-usds-sell-mybalance').innerHTML = 'My Balance: ' + money(wrapUsds.myUsdsBal, 8);
		$('wrap-usds-buy-mybalance').innerHTML  = 'My Balance: ' + money(wrapUsds.myOneBal, 8);
	}
	wrapUsdsInfo();
}

async function onWrapOnesExecute() {
	console.log('onWrapOnes', wrapOnes);
	wrapOnes.amount = validNumber($('wrap-ones-sell-qty').value);
	if(!wrapOnes.amount || wrapOnes.amount<0) { 
		showWrapOnesWarn('Amount must be greater than zero'); 
		return;
	}
	disableWrapOnes()
	signWrapOnesTxs('You must sign one transaction')
    showWrapOnesWait('Wait, approving transaction');
    let ok = false;
	if(wrapOnes.sell=='ONE'){ 
		ok = await goWrapOnes();
	} else if(wrapOnes.buy=='ONE') { 
		ok = await goUnwrapOnes();
	} else {
    	showWrapError('Error wrapping Ones assets');
	}
    if(ok) {
    	//signWrapOnesTxs();
    	wrapOnesInfo();
    	loadWrapOnesBalance();
    } else {
    	//
    }
    enableWrapOnes();
}

async function onWrapUsdsExecute() {
	console.log('onWrapUsds', wrapUsds);
	wrapUsds.amount = validNumber($('wrap-usds-sell-qty').value);
	if(!wrapUsds.amount || wrapUsds.amount<0) { 
		showWrapUsdsWarn('Amount must be greater than zero'); 
		return;
	}
	disableWrapUsds()
	signWrapUsdsTxs('You must sign one transaction')
    showWrapUsdsWait('Wait, approving transaction');
    let ok = false;
	if(wrapUsds.sell=='ONE'){ 
		ok = await goWrapUsds();
	} else if(wrapUsds.buy=='ONE') { 
		ok = await goUnwrapUsds();
	} else {
    	showWrapError('Error wrapping assets');
	}
    if(ok) {
    	//signWrapUsdsTxs();
    	wrapUsdsInfo();
    	loadWrapUsdsBalance();
    } else {
    	//
    }
    enableWrapUsds();
}

async function onSwapExecute() {
	disableSwap()
	signTxs('You must sign two transactions')
    showWait('Wait, approving transaction');
	let pool   = pools[swap.pool];
	let sell   = pool.tokens[swap.sell];
	let buy    = pool.tokens[swap.buy];
	let amount = swap.amount;
	let price  = swap.price;
	console.log('SWAP', pool.name, sell.symbol, buy.symbol, amount, price);
	let reject = function(msg, tx) { signTxs(); showError(msg); enableSwap(); }
	// TODO: validate amounts > 0
	// TODO: validate amounts in american format, commas and dots
    let ok = await seeswap.swapTokens(pool, sell, buy, amount, reject);
    console.log('OK', ok);
    if(ok) {
    	signTxs();
    	showStatus('Assets swapped!');
    	showAssets();
    	showMyBalances();
    	updatePoolRow(pool);
    }
    enableSwap();
}

function sellMaxAmount() {
	let amount = swap.myBalSell;
	$('sell-asset-qty').value = amount;
	calcBuy();
}

function buyMaxAmount() {
	let amount = swap.myBalBuy;
	$('buy-asset-qty').value = amount;
	calcSell();
}

function wrapOnesSellMaxAmount() {
	let amount = (wrapOnes.sell=='ONE' ? wrapOnes.myOneBal : wrapOnes.myOnesBal);
	$('wrap-ones-sell-qty').value = money(amount, 8);
	calcWrapOnesBuy();
}

function wrapOnesBuyMaxAmount() {
	let amount = (wrapOnes.buy=='ONE' ? wrapOnes.myOneBal : wrapOnes.myOnesBal);
	$('wrap-ones-buy-qty').value = money(amount, 8);
	calcWrapOnesSell();
}

function wrapUsdsSellMaxAmount() {
	let amount = (wrapUsds.sell=='ONE' ? wrapUsds.myOneBal : wrapUsds.myUsdsBal);
	$('wrap-usds-sell-qty').value = money(amount, 8);
	calcWrapUsdsBuy();
}

function wrapUsdsBuyMaxAmount() {
	let amount = (wrapUsds.buy=='ONE' ? wrapUsds.myOneBal : wrapUsds.myUsdsBal);
	$('wrap-usds-buy-qty').value = money(amount, 8);
	calcWrapUsdsSell();
}


//---- MAIN

async function main() {
	setColorTheme();
	loadTicker(config.initicker);
	loadWrapOnesPrice();
	loadWrapUsdsPrice();
	await loadPools();
	if(await loadSeeSwap()){ 
        await connectWallet()
		loadWrapOnesBalance();
		let poolId = getFirstPoolId();
		selectPool(poolId);
		loadPoolPrices();
	}
	enableEvents();
}

window.onload = main;

// END