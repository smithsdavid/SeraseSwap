// SeeSWAP

const fs         = require('fs').promises;
const path       = require('path');
const ejs        = require('ejs');
const express    = require('express');
const bodyParser = require('body-parser');
const api        = require('./api.js');
const PORT       = process.env.PORT || 5000;


const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);

app.get('/', async (req, res) => { 
    res.render('index.html');
});

app.get('/swap', async (req, res) => { 
    res.render('swap.html');
});

app.get('/pools', async (req, res) => { 
    res.render('pools.html');
});

app.get('/docs', async (req, res) => { 
    res.render('docs.html');
});

// API

app.get('/api/getindices', async (req, res) => {
    let data = await api.getIndicesAll();
    res.writeHead(200, {'Content-Type': 'application/json'}); 
    res.end(data);
});

app.get('/api/getindices/:symbol', async (req, res) => {
    let symbol = req.params.symbol
    let data = await api.getIndices(symbol);
    res.writeHead(200, {'Content-Type': 'application/json'}); 
    res.end(data);
});

app.get('/api/getprice', async (req, res) => {
	let data = await api.getPrice();
    let text = JSON.stringify(data);
    res.writeHead(200, {'Content-Type': 'application/json'}); 
	res.end(text);
});

app.get('/api/getchart', async (req, res) => {
    let market = req.query.market;
    let period = req.query.period;
	let data = await api.getChart(market, period);
    res.writeHead(200, {'Content-Type': 'application/json'}); 
	res.end(data);
});

app.get('/api/poolinfo/:poolid', async (req, res) => {
    let data = await api.getPoolInfo(req.params.poolid);
    res.writeHead(200, {'Content-Type': 'application/json'}); 
    res.end(data);
});

let now = new Date();
console.log(now, 'SeeSwap server is running...');
app.listen(PORT);


// END