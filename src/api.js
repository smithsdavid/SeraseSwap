// API

const fs       = require('fs').promises;
const path     = require('path');
const fetch    = require('node-fetch');


async function fileExists(name) {
    let ok = true;
    let file = path.join(__dirname, 'public/data/'+name);
	try { await fs.stat(file); } catch { ok = false; }
	//console.log('File exists', file, ok);
	return ok;
}

async function getFile(name) {
    let file = path.join(__dirname, 'public/data/'+name);
	let data = await fs.readFile(file, {encoding: 'utf-8'});
	return data;
}

async function saveFile(name, text) {
    let file = path.join(__dirname, 'public/data/'+name);
	let info = await fs.writeFile(file, text, {encoding: 'utf-8'});
	return info;
}


// ONE/USD price
async function getPrice() {
	var info = null;
	var data = await getFile('oneprice.json');
	try { 
		info = JSON.parse(data); 
		if(!info.updated){
			info.updated = 0;
		}
	} catch(ex) { 
		console.log('Json error:', ex); 
		info = {"error":"api info unavailable"};
		return info;
	}
	let now = (new Date()).getTime();
	let dif = now - info.updated;
	let m05 = 5*60*1000; // five minutes
	//console.log('prc',m05,'>',dif,'?');
	if(dif>m05){ 
		console.log(new Date(), 'price.fetch');
		try {
			let url = 'https://api.binance.com/api/v1/ticker/price?symbol=ONEUSDT'; // try v3
			let opt = {method:'get'};
			let rex = await fetch(url,opt);
			let jsn = await rex.json();
			jsn.updated = now;
			let txt = JSON.stringify(jsn);
			let ok  = await saveFile('oneprice.json', txt);
			info = jsn;
		} catch(ex){
			console.log('Save error:', ex)
			info = {"error":"api server unavailable"};
		}
	} else {
		//console.log('tkr.nofetch');
	}
	return info;
}

async function getIndicesAll() {
    //console.log('api/getindicesall');
    let source = 'indices.json';
    let update = true;
    let found  = false;
    let text   = '';
    let info   = {};

	if(fileExists(source)){ 
		try { 
			text  = await getFile(source); 
			found = true; 
			//console.log('Data', data);
			info = JSON.parse(text); 
			if(!info.status || !info.status.timestamp){
				info.status = { timestamp: '0' };
			}
		} catch(ex) { update = true; }
	}

	if(found){
		let now = new Date().getTime();
		let lst = new Date(info.status.timestamp).getTime();
		let dif = now-lst;
		let m30 = 30*60*1000; // 10 minutes
		//console.log('Diff',m30,'>',dif,'?');
		if(dif>m30){ update = true; }
		else { update = false; }
	}

	if(update) {
		console.log(new Date(), 'indicesall.fetch');
		try {
			let url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
			let hdr = {'X-CMC_PRO_API_KEY': 'YOUR_KEY_HERE'};
			//let dat = {'start':'1', 'limit':'100', 'convert':'USD,BTC'};
			let opt = { method:'get', headers:hdr };
			let res = await fetch(url, opt);
			let jsn = await res.json();
			text = JSON.stringify(jsn, null, 4);
			//text = JSON.stringify(jsn);
			let ok  = await saveFile(source, text);
		} catch(ex){
			console.log('Fetch error:', ex)
		}
	} else {
		//console.log('indices.nofetch');
	}
	//console.log('Indices', text);
	return text;
}

async function getIndices(symbol) {
    //console.log('api/getindices');
    let source = 'indices/index-'+symbol.toUpperCase()+'.json';
    let update = true;
    let found  = false;
    let text   = '';
    let info   = {};

	if(fileExists(source)){ 
		try { 
			text  = await getFile(source); 
			found = true; 
			//console.log('Data', data);
			info = JSON.parse(text); 
			if(!info.closeTime){
				info.closeTime = '0';
			}
		} catch(ex) { update = true; }
	}

	if(found){
		let now = new Date().getTime();
		let lst = new Date(parseInt(info.closeTime)).getTime();
		let dif = now-lst;
		let m30 = 30*60*1000; // 10 minutes
		//console.log('Diff',m30,'>',dif,'?');
		if(dif>m30){ update = true; }
		else { update = false; }
	}

	if(update) {
		console.log(new Date(), 'indices.fetch', symbol);
		try {
			let url = 'https://api.binance.com/api/v1/ticker/24hr?symbol='+symbol+'USDT';
			let opt = { method:'get' };
			let res = await fetch(url, opt);
			let jsn = await res.json();
			text = JSON.stringify(jsn, null, 4);
			//text = JSON.stringify(jsn);
			let ok  = await saveFile(source, text);
		} catch(ex){
			console.log('Fetch error:', ex)
		}
	} else {
		//console.log('indices.nofetch');
	}
	//console.log('Indices', text);
	return text;
}

async function getChart(market, period=2) {
	//console.log('Get Chart', market, period);
	market = market.replace(':','');
	let name   = market+'-'+period+'.json';
	let source = 'charts/'+name;
	let ival   = ['1m','5m','30m','4h','1d'][period];
	var info   = null;
	var data   = null;
	var update = true;
	var found  = false;

	if(fileExists(source)){ 
		try { 
			data = await getFile(source); found = true; 
			//console.log('Data', data);
			info = JSON.parse(data); 
			if(!info.length || info.length<48){
				console.log('No info')
				info = [];
				info[47] = [];
				info[47][0] = 0;
			}
		} catch(ex) { update = true; console.log('No file') }
	}

	if(found){
		//console.log('found')
		let now = (new Date()).getTime();
		let dif = now - info[47][0]; // Last tick?
		let m30 = 30*60*1000; // 30 minutes binance tick delay
		//console.log('cht',dif,'>',m30,'?');
		if(dif>m30){ update = true; }
		else { update = false; }
	}

	if(update){
		console.log(new Date(), 'chart.fetch', market, period);
		try {
			let url = 'https://api.binance.com/api/v1/klines?symbol='+market+'&interval='+ival+'&limit=48';
			let opt = {method:'get'};
			let rex = await fetch(url,opt);
			let jsn = await rex.json();
			let cht = JSON.stringify(jsn);
			let ok  = await saveFile(source, cht);
			//console.log(cht);
			data = cht;
		} catch(ex){
			console.log('Save error:', ex)
		}
	} else {
		//console.log('chart.nofetch');
	}
	return data;
}


exports.getPrice      = getPrice;
exports.getIndices    = getIndices;
exports.getIndicesAll = getIndicesAll;
exports.getChart      = getChart;

// END