// FinChart 1.0

var FinChart = function(canvasId) { 
    this.data    = [];
    this.width   = 600;
    this.height  = 300;
    this.padding = 20;
    this.ticks   = 48;
    this.font    = "normal 1em Arial"; 
    this.showMAC = true; 
    this.canvas  = new SVG(canvasId);
    //console.log(this.canvas);
};

FinChart.prototype.colors  = {
    foreground : '#FFF',
    background : '#1A262C',
    border     : '#1A262C',
    dashed     : '#394951',
    labels     : '#A8B3CE',
    tickUp     : '#6E914F',
    tickDn     : '#B54F5B',
    mac05      : '#D0D',
    mac10      : '#DD0',
    mac20      : '#08D',
    warning    : '#B54F5B'
};

FinChart.prototype.fonts = {
    axis   : 'font: normal 0.6em Arial',
    labels : 'font: normal 0.6em Arial',
    time   : 'font: normal 0.6em Arial'
};

FinChart.prototype.patterns = {
    dashed: [2,4],
    dotted: [2,2]
};

FinChart.prototype.resize = function() {
    this.canvas.resize();
    this.draw(this.data);
}

FinChart.prototype.draw = function(data) {
    this.data = data;
    //this.canvas.background(this.colors.background);
    //this.canvas.border(this.colors.border);
    this.drawAxis();
    if(!data || data.length<2){ this.drawNoData(); return; }
    this.drawLabels();
    this.drawVolume();
    this.drawChart();
    this.drawMAC();
    this.crosshair();
    this.crosshairVolume();
}

FinChart.prototype.drawNoData = function() {
    var x,y,go=this.canvas; 
    x = this.canvas.width/2;
    y = this.canvas.height/2;
    go.text('No data available', x, y, this.colors.warning, 'middle');
}

FinChart.prototype.drawAxis = function() {
    var x0,y0,x1,y1,w,h,volW,volH,barW,barH,tick,go=this.canvas; 
    chtW = this.canvas.chart.width;
    chtH = this.canvas.chart.height;
    volW = this.canvas.volume.width;
    volH = this.canvas.volume.height;

    // Volume Area
    x0 = this.padding;
    y0 = this.canvas.height - this.padding - volH;
    w  = volW;
    h  = volH;
    go.rect(x0,y0,w,h,0,'transparent',this.colors.dashed);
    //go.rect(x0,y0,w,h,0,this.colors.background,this.colors.dashed);

    // X Axis
    x0 = this.padding;
    y0 = this.padding + chtH;
    x1 = this.canvas.width  - this.padding;
    y1 = this.padding + chtH;
    go.lineTo(x0,y0,x1,y1,this.colors.dashed);

    // Y Axis
    x1 = this.padding;
    y1 = this.padding;
    go.lineTo(x0,y0,x1,y1,this.colors.dashed);

    // X Ticks 11
    tick = chtW / 12;
    x0 = this.padding;
    y0 = this.padding + chtH + 6;
    x1 = x0;
    y1 = this.padding + chtH;
    for (var i = 0; i < 11; i++) {
        x0 += tick;
        go.lineTo(x0,y0,x0,y1,this.colors.dashed);  
    }

    // Y Ticks 3
    tick = chtH / 4;
    x0 = this.padding - 6;
    y0 = this.padding + chtH;
    x1 = this.padding;
    y1 = y0;
    for (var i = 0; i < 3; i++) {
        y0 -= tick;
        go.lineTo(x0,y0,x1,y0,this.colors.dashed);  
    }

    // X Dotted 3
    tick = chtH / 4;
    x0 = this.padding;
    y0 = this.padding + chtH;
    x1 = this.canvas.width  - this.padding;
    y1 = y0;
    for (var i = 0; i < 3; i++) {
        y0 -= tick;
        go.lineTo(x0,y0,x1,y0,this.colors.dashed,1,this.patterns.dashed);
    }
}

FinChart.prototype.getLabels = function(data=null) {
    function getMinute(time) {
        var date = new Date(time);
        var hh   = date.getHours();
        var mm   = date.getMinutes();
        if(mm<10){ mm = '0'+mm; }
        var am   = (hh < 12 ? 'am' : 'pm')
        var hour = (hh==0 ? 12 : (hh > 12 ? hh-12 : hh)) + ':' + mm + ' ' + am;
        return hour;
    }

    function getHour(time) {
        var date = new Date(time);
        var hh   = date.getHours();
        var am   = (hh < 12 ? 'am' : 'pm')
        var hour = (hh==0 ? 12 : (hh > 12 ? hh-12 : hh)) + ' ' + am;
        return hour;
    }

    function getDay(time) {
        var names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dic'];
        var date  = new Date(time);
        var mm    = date.getMonth()
        var mo    = names[mm].substr(0,1);
        var day   = date.getDate() + ' ' + names[mm];
        return day;
    }

    function getMonth(time) {
        var names = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DIC'];
        var date  = new Date(time);
        var mm    = date.getMonth();
        return names[mm];
    }

    if(!data) { data = this.data; }
    var tick = parseInt(this.ticks / 12);
    var labels = [];
    var diff = data[data.length-1].time - data[0].time;
    // 04h diff   14,100000
    // 24h diff   84,600000
    // 07d diff  676,800000
    // 30d diff 4060,800000
    var getLabel = getHour;
    if     (diff <    50000000) { getLabel = getMinute; }
    else if(diff <   200000000) { getLabel = getHour; }
    else if(diff < 20000000000) { getLabel = getDay; }
    else { getLabel = getMonth; }

    for (var i = 0; i < data.length; i++) {
        if(i%tick){ continue; }
        var time = data[i].time;
        var label = getLabel(time);
        labels.push(label);
    }

    if(labels.length < 12) { 
        for (var i = labels.length; i < 12; i++) { labels.push(''); }
    }

    return labels;
}

FinChart.prototype.drawLabels = function() {
    var x,y,x0,y0,x1,y1,min,max,decs,tick,go=this.canvas;
    var ini  = this.data.length > this.ticks ? this.data.length - this.ticks : 0;
    var data = this.data.slice(ini);
    x0   = this.padding + 4;
    y0   = this.padding + 4;
    x1   = this.padding + 4;
    y1   = this.padding + this.canvas.chart.height - 4;
    x2   = this.padding + this.canvas.chart.width - 4;
    y2   = this.padding + 4;
    min  = this.getMinPrice();
    max  = this.getMaxPrice();
    pmax = (((max/min)-1)*100).toFixed(2)+'%';
    decs = (min<1 ? 8 : (min>100 ? 0 : 4));

    // Min and max price
    go.text(max.toFixed(decs),x0,y0,this.colors.labels,'start',this.fonts.axis);
    go.text(min.toFixed(decs),x1,y1,this.colors.labels,'start',this.fonts.axis);
    
    // Max percent
    var ptx = go.text(pmax,x2,y2,this.colors.labels,'end',this.fonts.axis);

    // Draw X time labels
    var labels = this.getLabels(data);
    x = this.padding;
    y = this.padding*1.75 + chtH;
    tick = chtW / 12; // TODO: set as option?
    for (var i = 0; i < 11; i++) {
        x += tick;
        var label = labels[i];
        go.text(label,x,y,this.colors.labels,'middle',this.fonts.time);
    }
}

FinChart.prototype.drawVolume = function() {
    var x,y,w,h,barH,go=this.canvas; 
    var ini    = this.data.length > this.ticks ? this.data.length - this.ticks : 0;
    var data   = this.data.slice(ini);
    var minVol = this.getMinVolume(data);
    var maxVol = this.getMaxVolume(data);
    var volW   = this.canvas.volume.width;
    var volH   = this.canvas.volume.height * 0.90; // buffer at the top
    var base   = this.canvas.height - this.padding - 1;
    var tick   = (this.canvas.width - this.padding*2) / this.ticks;
    var prev   = 0;

    x = this.padding + 2;
    w = volW / this.ticks - 4;

    for (var i = 0; i < data.length; i++) {
        var item = data[i];
        barH = (item.volume - minVol) * volH / maxVol;
        h =  barH;
        y =  base-h;
        color = (prev <= item.close ? this.colors.tickUp : this.colors.tickDn);
        prev  = item.close;
        go.rect(x,y,w,h,0,color,color);
        x += tick;
    }
}

FinChart.prototype.drawChart = function() {
    var x,y,w,h,lx,ly0,ly1,barH,lineH,go=this.canvas; 
    var ini      = this.data.length > this.ticks ? this.data.length - this.ticks : 0;
    var data     = this.data.slice(ini);
    var minPrice = this.getMinPrice(data);
    var maxPrice = this.getMaxPrice(data);
    var difPrice = maxPrice - minPrice;
    var areaH    = this.canvas.chart.height;
    var base     = areaH + this.padding * 0.90;
    var volW     = this.canvas.volume.width;
    var ratio    = areaH / difPrice;
    var tick     = volW / this.ticks;

    x = this.padding + 2;
    w = volW / this.ticks - 4;
    l = w/2;

    for (var i = 0; i < data.length; i++) {
        var item = data[i]; 
        barH  = Math.abs((item.open - item.close) * ratio);
        lineH = Math.abs((item.low  - item.high)  * ratio); 
        lx = x+l;
        if(item.close >= item.open) {
            y = base - (item.close - minPrice) * ratio;
            h = (item.close - item.open) * ratio;
            color = this.colors.tickUp;
        } else {
            y = base - (item.open  - minPrice) * ratio;
            h = (item.open  - item.close) * ratio;
            color = this.colors.tickDn;
        }
        ly0 = base - (item.high - minPrice) * ratio;
        ly1 = base - (item.low  - minPrice) * ratio;
        go.lineTo(lx,ly0,lx,ly1,color);
        go.rect(x,y,w,h,0,color,color);
        x += tick;
    }
}

FinChart.prototype.drawMAC = function() {
    if(!this.showMAC) { return; }

    function avg(list) {
        var sum = 0.0;
        for(var index in list) { sum += list[index]; }
        return sum / list.length;
    }

    var x,y,w,l,go = this.canvas;
    var ini  = (this.data.length > this.ticks ? (this.data.length - this.ticks) : 0);
    var data = (ini > 0 ? this.data.slice(ini) : this.data);
    var minPrice = this.getMinPrice(data);
    var maxPrice = this.getMaxPrice(data);
    var difPrice = maxPrice - minPrice;
    var areaW    = this.canvas.chart.width;
    var areaH    = this.canvas.chart.height;
    var base     = areaH + this.padding * 0.90;
    var ratio    = areaH / difPrice;
    var tick     = areaW / this.ticks;

    // Calc Moving Average
    var mac05 = null;
    var mac10 = null;
    var mac20 = null;    
    var sum05 = [];
    var sum10 = [];
    var sum20 = [];
    var n     = 0
    
    for(var index in data) {
        if(n >  4) { mac05 = avg(sum05); sum05.shift(); }
        if(n >  9) { mac10 = avg(sum10); sum10.shift(); }
        if(n > 19) { mac20 = avg(sum20); sum20.shift(); }
        data[n].mac = {mac05: mac05, mac10: mac10, mac20: mac20};
        sum05.push(data[index].close || 0.0);
        sum10.push(data[index].close || 0.0);
        sum20.push(data[index].close || 0.0);
        n += 1;
    }

    // Draw MAC
    x = this.padding + 2;
    w = areaW / this.ticks - 4;
    l = w/2;
    z = this.padding + 2;

    var p05, p10, p20;
    var points05 = [];
    var points10 = [];
    var points20 = [];

    for (var i = 0; i < data.length; i++) {
        var item = data[i];
        if(item.mac.mac05) {
            y05 = base - (item.mac.mac05 - minPrice) * ratio;
            p05 = {x:x, y:y05};
            if(points05.length < 1) { // First point? add starting point to all
                points05.push({x:z, y:y05}); 
                points10.push({x:z, y:y05}); 
                points20.push({x:z, y:y05}); 
            }
            points05.push(p05);
        }
        if(item.mac.mac10) {
            y10 = base - (item.mac.mac10 - minPrice) * ratio;
            p10 = {x:x, y:y10};
            points10.push(p10);
        }
        if(item.mac.mac20) {
            y20 = base - (item.mac.mac20 - minPrice) * ratio;
            p20 = {x:x, y:y20};
            points20.push(p20);
        }
        x += tick;
    }

    go.chartLine(points05, this.colors.mac05);
    go.chartLine(points10, this.colors.mac10);
    go.chartLine(points20, this.colors.mac20);
}

FinChart.prototype.getMinVolume = function(data=null) {
    if(!data) { data = this.data; }
    var minVol = 999999999999;
    for (var i = 0; i < data.length; i++) {
        var vol = data[i].volume;
        if(vol < minVol) { minVol = vol; }
    }
    return minVol;
}

FinChart.prototype.getMaxVolume = function(data=null) {
    if(!data) { data = this.data; }
    var maxVol = 0;
    for (var i = 0; i < data.length; i++) {
        var vol = data[i].volume;
        if(vol > maxVol) { maxVol = vol; }
    }
    return maxVol;
}

FinChart.prototype.getMinPrice = function(data=null) {
    if(!data) { data = this.data; }
    var minPrice = 999999999999;
    for (var i = 0; i < data.length; i++) {
        var lo = data[i].low;
        var hi = data[i].high;
        var op = data[i].open;
        var cl = data[i].close;
        var price = Math.min(lo, hi, op, cl);
        if(price < minPrice) { minPrice = price; }
    }
    return minPrice;
}

FinChart.prototype.getMaxPrice = function(data=null) {
    if(!data) { data = this.data; }
    var maxPrice = 0;
    for (var i = 0; i < data.length; i++) {
        var lo = data[i].low;
        var hi = data[i].high;
        var op = data[i].open;
        var cl = data[i].close;
        var price = Math.max(lo, hi, op, cl);
        if(price > maxPrice) { maxPrice = price; }
    }
    return maxPrice;
}

FinChart.prototype.crosshair = function(data=null) {
    if(!data) { data = this.data; }
    if(!data) { return; }

    var w  = this.canvas.chart.width;
    var h  = this.canvas.chart.height;
    var p  = this.padding;  
    var go = this.canvas;
    var lo = this.getMinPrice(data);
    var hi = this.getMaxPrice(data);
    var xh = go.group(p,p,'crosshair');
    var g1 = go.group(0,0,'crossarea');
    var r1 = go.rect(0,0,w,h,0,'transparent');
    var r2 = go.rect(0,0,w,h,0,'transparent');
    var l1 = go.lineTo(0,0,w,0,this.colors.dashed,2,[4,4]);
    var l2 = go.lineTo(0,0,0,h,this.colors.dashed,2,[4,4]);
    var tx = go.text('',0,0,this.colors.labels,'start');
    var isFirefox = (window.navigator.userAgent.indexOf('Firefox')>0);
    if(isFirefox){ p=0; }

    xh.appendChild(r1);
    xh.appendChild(g1);
    g1.appendChild(r2);
    g1.appendChild(l1);
    g1.appendChild(l2);
    g1.appendChild(tx);
    g1.style.display='none';
    xh.addEventListener('mouseenter', function(event){ g1.style.display='block'; }, false);
    xh.addEventListener('mouseleave', function(event){ g1.style.display='none';  }, false);
    xh.addEventListener('mousemove',  function(event){ 
        //l1.setAttribute('y2',event.y-(event.y-event.offsetY)-p-4);
        //l1.setAttribute('y1',event.layerY-p-4);
        var xx = event.offsetX;
        var yy = event.offsetY;
        l1.setAttribute('y1',yy-p-4);
        l1.setAttribute('y2',yy-p-4);
        l2.setAttribute('x1',xx-p-4);
        l2.setAttribute('x2',xx-p-4);
        tx.setAttribute('y' ,yy-p-10);
        tx.setAttribute('x' ,xx>w-100?xx-p*2:xx);
        tx.setAttribute('text-anchor',xx>w-100?'end':'start');
      //tx.textContent = (hi - (yy-p-4) * (hi-lo) / h).toFixed(hi>10?4:8);
        tx.textContent = (hi - (yy-p-4) * (hi-lo) / h).toLocaleString(undefined, {minimumFractionDigits: hi>10?4:8, maximumFractionDigits: hi>10?4:8});
    }, false);
}

FinChart.prototype.crosshairVolume = function(data=null) {
    if(!data) { data = this.data; }
    if(!data) { return; }

    var w  = this.canvas.chart.width;
    var h  = this.canvas.volume.height;
    var hc = this.canvas.chart.height;
    var p  = this.padding;
    var vy = p*2+hc; // Vol area Y
    var go = this.canvas;
    var lo = this.getMinVolume(data);
    var hi = this.getMaxVolume(data);
    var xh = go.group(p,p+hc+p,'crosshairvol');
    var g1 = go.group(0,0,'crossareavol');
    var r1 = go.rect(0,0,w,h,0,'transparent');
    var r2 = go.rect(0,0,w,h,0,'transparent');
    var lh = go.lineTo(0,0,w,0,this.colors.dashed,2,[4,4]);
    var lv = go.lineTo(0,0,0,h,this.colors.dashed,2,[4,4]);
    var tx = go.text('',0,0,this.colors.labels,'start');
    var isFirefox = (window.navigator.userAgent.indexOf('Firefox')>0);
    if(isFirefox){ vy=0; p=0; }

    xh.appendChild(r1);
    xh.appendChild(g1);
    g1.appendChild(r2);
    g1.appendChild(lh);
    g1.appendChild(lv);
    g1.appendChild(tx);
    g1.style.display='none';
    xh.addEventListener('mouseenter', function(event){ g1.style.display='block'; }, false);
    xh.addEventListener('mouseleave', function(event){ g1.style.display='none';  }, false);
    xh.addEventListener('mousemove',  function(event){ 
        var xx = event.offsetX;
        var yy = event.offsetY;
        lh.setAttribute('y1',yy-vy-4);
        lh.setAttribute('y2',yy-vy-4);
        lv.setAttribute('x1',xx-p-4);
        lv.setAttribute('x2',xx-p-4);
        tx.setAttribute('y' ,yy-vy-10);
        tx.setAttribute('x' ,xx>w-100?xx-p*2:xx);
        tx.setAttribute('text-anchor',xx>w-100?'end':'start');
      //tx.textContent = (hi - (yy-vy-4) * (hi-lo) / h).toFixed(hi>1000000?0:4);
        tx.textContent = (hi - (yy-vy-4) * (hi-lo) / h).toLocaleString(undefined, {minimumFractionDigits: hi>1000000?0:4, maximumFractionDigits: hi>1000000?0:4});
    }, false);
}


/*---- SVG LIBRARY

Use: var svg = SVG("mydiv");
     svg.circle(100,100,50,'red','black');
     svg.rect(200,100,80,120,'blue','green');
     svg.line(300,100,350,100,'black');


SVG REFERENCE

rect     (x,y,width,height,radius,fill,stroke)
circle   (x,y,r,fill,stroke)
ellipse  (x,y,width,height,angle,fill,stroke)
triangle (x1,y1,x2,y2,x3,y3,fill,stroke)
shape    ([path],fill,stroke)
translate(x,y)
rotate   (angle)
scale    (w,h,element)
image    (src,x,y,width,height,stroke)
text     (x,y,string,font,style)

-----------------------------------*/

function SVG(parentid, id='finchartsvg') {
  this.NS          = "http://www.w3.org/2000/svg";
  this.xlinkNS     = "http://www.w3.org/1999/xlink";
  this.version     = "1.1";
  this.container   = null;
  this.canvas      = null;
  this.chart       = null;
  this.volume      = null;
  this.elements    = [];
  this.width       = 600;
  this.height      = 300;
  this.padding     =  20;
  this.color       = "black";
  this.backcolor   = "white";
  this.bordercolor = "black";
  this.fillstyle   = "grey";
  this.strokestyle = "black";
  this.strokewidth = "1px";
  this.font        = "normal 1em Arial";
  this.applyfillstyle   = false;
  this.applystrokestyle = false;
  this.applystrokewidth = false;
  this.rotateStack = [];
  this.temp    = {
    fill:null,
    stroke:null,
    end:null
  };
  this.colors  = {
    red:"red",
    green:"green",
    blue:"blue",
    grey:"grey",
    lightgrey:"lightgrey",
    white:"white",
    black:"black"
  };
  
  this.container = document.getElementById(parentid);
  this.width  = this.container.clientWidth;
  this.height = this.container.clientHeight;
  if(this.container.childNodes.length>0) { this.container.removeChild(this.container.childNodes[0]); }
  this.canvas = document.createElementNS(this.NS,"svg");
  this.canvas.setAttribute("id",id);
  this.container.appendChild(this.canvas);
  this.size(this.width, this.height);
}

/*---- Methods ----*/
SVG.prototype.init = function(id){}
SVG.prototype.strokeWidth = function(width){
  if(!width){
    this.strokewidth="1px";
    this.applystrokewidth=false;
  } else {
    this.strokewidth=width;
    this.applystrokewidth=true;
  }
}

SVG.prototype.size = function(width, height){
    var aw =  width  - this.padding*2;
    var ah = (height - this.padding*3) / 5 * 4;
    var vw =  width  - this.padding*2;
    var vh = (height - this.padding*3) / 5;
    this.width  = width;
    this.height = height;
    this.chart  = {width: aw, height: ah};
    this.volume = {width: vw, height: vh};
    this.canvas.setAttribute('width',width); 
    this.canvas.setAttribute('height',height);
}

SVG.prototype.resize = function(){
    this.width  = this.container.clientWidth;
    this.height = this.container.clientHeight;
    if(this.container.childNodes.length>0) { this.container.removeChild(this.container.childNodes[0]); }
    this.canvas = document.createElementNS(this.NS,"svg");
    this.canvas.setAttribute("id",id);
    this.container.appendChild(this.canvas);
    this.size(this.width, this.height);
}

SVG.prototype.background = function(color){
  this.backcolor = color;  // save for future use
  this.canvas.style.background = color;
}

SVG.prototype.border = function(color,radius){ /* "1px color" or {width:"1px",color:"black"} */
  this.bordercolor = color;  // save for future use
  this.canvas.style.border = "1px solid "+color;
  if(radius){ 
    this.canvas.style.BorderRadius = radius; 
  }
}

SVG.prototype.clear = function(){ // remove all elements from svg object
  while(this.canvas.childNodes.length>1) this.canvas.removeChild(this.canvas.firstChild); 
}

SVG.prototype.lineTo = function(x1,y1,x2,y2,stroke,strokewidth,pattern){
  var o = document.createElementNS(this.NS,"line");
  o.setAttribute("x1",x1);
  o.setAttribute("y1",y1);
  o.setAttribute("x2",x2);
  o.setAttribute("y2",y2);
  if(stroke) o.setAttribute("stroke",stroke);
  if(strokewidth) o.setAttribute("stroke-width",strokewidth);
  if(pattern) o.setAttribute("stroke-dasharray",pattern);
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

SVG.prototype.polyline = function(points,width,stroke,strokewidth){
  var o = document.createElementNS(this.NS,"polyline");
  o.setAttribute("points",points);
  o.setAttribute("fill","none");
  if(stroke) o.setAttribute("stroke",stroke);
  if(!width) width = svg.strokewidth;
  if(strokewidth) o.setAttribute("stroke-width",strokewidth);
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

SVG.prototype.triangle = function(x1,y1,x2,y2,x3,y3,fill,stroke,strokewidth){
  var o = document.createElementNS(this.NS,"polyline");
  o.setAttribute("points",[x1,y1,x2,y2,x3,y3,x1,y1].toString());
  if(fill) o.setAttribute("fill",fill);
  if(stroke) o.setAttribute("stroke",stroke);
  if(strokewidth) o.setAttribute("stroke-width",strokewidth);
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

SVG.prototype.rect = function(x,y,width,height,radius,fill,stroke,strokewidth){
  if(x<0 || y<0 || width<0 || height<0){ return; }
  var o = document.createElementNS(this.NS,"rect");
  o.setAttribute("x", x);
  o.setAttribute("y", y);
  o.setAttribute("width",  width);
  o.setAttribute("height", height);
  if(radius){ o.setAttribute("rx",radius); o.setAttribute("ry",radius); }
  if(fill) o.setAttribute("fill",fill);
  if(stroke) o.setAttribute("stroke",stroke);
  if(strokewidth) o.setAttribute("stroke-width",strokewidth);
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

SVG.prototype.circle = function(x,y,radius,fill,stroke,strokewidth){
  var o = document.createElementNS(this.NS,"circle");
  o.setAttribute("cx", x);
  o.setAttribute("cy", y);
  o.setAttribute( "r", radius);
  if(fill) o.setAttribute("fill",fill);
  if(stroke) o.setAttribute("stroke",stroke);
  if(strokewidth) o.setAttribute("stroke-width",strokewidth);
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

SVG.prototype.ellipse = function(x,y,width,height,angle,fill,stroke,strokewidth){
  var o = document.createElementNS(this.NS,"ellipse");
  o.setAttribute("cx", x);
  o.setAttribute("cy", y);
  o.setAttribute("rx", width);
  o.setAttribute("ry", height);
  if(angle)  o.setAttribute("transform","rotate("+angle+","+x+","+y+")");
  if(fill)   o.setAttribute("fill",fill);
  if(stroke) o.setAttribute("stroke",stroke);
  if(strokewidth) o.setAttribute("stroke-width",strokewidth);
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

SVG.prototype.path = function(path,fill,stroke,strokewidth){
  var o = document.createElementNS(this.NS,"path");
  o.setAttribute("d",path);
  if(fill) o.setAttribute("fill",fill);
  if(stroke) o.setAttribute("stroke",stroke);
  if(strokewidth) o.setAttribute("stroke-width",strokewidth);
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

SVG.prototype.shape = SVG.prototype.path;

SVG.prototype.translate = function(x,y,element){
  element.setAttribute("transform","translate("+x+","+y+")");  
}

SVG.prototype.rotate = function(element,angle,x,y){
  var r,t;
  t = element.getAttribute("transform"); // TODO: check transform already set, add new transform
  if(x&&y){ r = "rotate("+angle+","+x+","+y+")"; }
     else { r = "rotate("+angle+")"; }
  if(t) t += " " + r;
  else t = r;
  element.setAttribute("transform",t);
}

SVG.prototype.scale = function(hor,ver,element){
  if(!element) element=this.canvas;
  element.setAttribute("transform","scale("+hor+","+ver+")");
}

SVG.prototype.group = function(x,y,id,parent){
  var o = document.createElementNS(this.NS,"g");
  if(id) o.setAttribute("id",id);
  o.setAttribute("transform","translate("+x+","+y+")");
  if(parent) parent.appendChild(o);
  else this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

SVG.prototype.image = function (src,x,y,width,height,stroke,strokewidth){
  var o = document.createElementNS(this.NS,"image");
  o.setAttribute("x",x);
  o.setAttribute("y",y);
  o.setAttribute("width",width);
  o.setAttribute("height",height);
  o.setAttribute("preserveAspectRatio","none");
  if(stroke) o.setAttribute("stroke",stroke);
  o.setAttributeNS(this.xlinkNS,"href",src);
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

SVG.prototype.text = function(txt,x,y,fill,align,style){
  var o = document.createElementNS(this.NS,"text");
  o.setAttribute("x", x);
  o.setAttribute("y", y);
  if(fill)  o.setAttribute("fill",fill);
  if(align) o.setAttribute("text-anchor",align);
  //if(style) o.style.font = style;
  if(style) o.setAttribute("style",style);
  o.textContent = txt;
  //o.appendChild(document.createTextNode(txt));
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

SVG.prototype.strokewidth = function(sw){
  if(!sw){ this.applystrokewidth=false; this.strokewidth="1px";} 
  else{    this.applystrokewidth=true; this.strokewidth=sw;}
  //this.canvas.setAttribute(s);
}

SVG.prototype.defs = function(){
  var o = document.createElementNS(this.NS,"defs");
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}

/*
create: svf.filter(defs,'shadow',100,0,0,'4 4',4,4);
use:    element.setAttribute("filter","url(#shadow)");
<filter id='shadow' filterRes='100' x='0' y='0'>
  <feGaussianBlur stdDeviation='4 4'/>
  <feOffset dx='4' dy='4'/>
</filter>
*/

SVG.prototype.filter = function(parent,id,res,x,y,dev,dx,dy){
  var f = document.createElementNS(this.NS,"filter");
  var g = document.createElementNS(this.NS,"feGaussianBlur");
  var o = document.createElementNS(this.NS,"feOffset");
  f.setAttribute("id",id);
  f.setAttribute("filterRes",res);
  f.setAttribute("x", x);
  f.setAttribute("y", y);
  g.setAttribute("stdDeviation",dev);
  o.setAttribute("dx",dx);
  o.setAttribute("dy",dy);
  f.appendChild(g);
  f.appendChild(o);
  parent.appendChild(f);
  this.elements.push(f);
  return f;
}

/*
create: svg.shadow(defs,"myshadow",3,3);
use: element.setAttribute("filter","url(#myshadow)")
<filter id="myshadow">
 <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="MyBlur"/>
 <feOffset in="MyBlur" dx="3" dy="3" result="FinalBlur"/>
 <feMerge>
  <feMergeNode in="FinalBlur"/>
  <feMergeNode in="SourceGraphic"/>
 </feMerge>
</filter>
*/

SVG.prototype.shadow = function(parent,id,dx,dy){
  var f  = document.createElementNS(this.NS,"filter");
  var g  = document.createElementNS(this.NS,"feGaussianBlur");
  var o  = document.createElementNS(this.NS,"feOffset");
  var m  = document.createElementNS(this.NS,"feMerge");
  var n1 = document.createElementNS(this.NS,"feMergeNode");
  var n2 = document.createElementNS(this.NS,"feMergeNode");
  f.setAttribute("id",id);
  g.setAttribute("in","SourceAlpha");
  g.setAttribute("stdDeviation","1");
  g.setAttribute("result","myblur");
  o.setAttribute("in","myblur");
  o.setAttribute("dx",dx);
  o.setAttribute("dy",dy);
  o.setAttribute("result","finalblur");
  n1.setAttribute("in","finalblur");
  n2.setAttribute("in","SourceGraphic");

  m.appendChild(n1);
  m.appendChild(n2);
  f.appendChild(g);
  f.appendChild(o);
  f.appendChild(m);
  parent.appendChild(f);
  this.elements.push(f);
  return f;
}


SVG.prototype.chartLine = function(points, stroke, strokewidth) {
  var list = [];
  for(var i in points) {
    list.push(points[i].x);
    list.push(points[i].y);
  }
  var o = document.createElementNS(this.NS,"polyline");
  o.setAttribute("points",list.toString());
  //if(fill) o.setAttribute("fill",fill);
  o.setAttribute("fill",'transparent');
  if(stroke) o.setAttribute("stroke",stroke);
  if(strokewidth) o.setAttribute("stroke-width",strokewidth);
  this.canvas.appendChild(o);
  this.elements.push(o);
  return o;
}



// END