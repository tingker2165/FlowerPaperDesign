const assert=require('node:assert/strict');
const A=require('./advanced.js');
const pairs=[[[50,2.6772,-79.7751],[50,0,-82.7485],2.0425],[[50,3.1571,-77.2803],[50,0,-82.7485],2.8615],[[50,2.8361,-74.0200],[50,0,-82.7485],3.4412],[[50,-1.3802,-84.2814],[50,0,-82.7485],1.0000]];
for(const [a,b,d] of pairs)assert(Math.abs(A.deltaE00(a,b)-d)<.0001);
const fs=require('node:fs'),path=require('node:path');const allPairs=fs.readFileSync(path.join(__dirname,'data/ciede2000-reference.txt'),'utf8').trim().split(/\r?\n/);assert.equal(allPairs.length,34);for(const row of allPairs){const p=row.trim().split(/\s+/).map(Number);assert(Math.abs(A.deltaE00(p.slice(0,3),p.slice(3,6))-p[6])<.0001);}
for(const rgb of [[255,255,255],[0,0,0],[200,30,80],[20,140,70]]){const back=A.xyzToRgb(A.rgbToXYZ(rgb));rgb.forEach((v,i)=>assert(Math.abs(v-back[i])<=1));}
const profile=A.syntheticProfile(4),model=A.makeModel(profile,1.6);
const base=model.forward([0,0,0,0]);assert(base.rgb.every(v=>v>250));
for(let j=0;j<4;j++){const c=[0,0,0,0];c[j]=1;const pred=model.forward(c);pred.spectrum.forEach((v,i)=>assert(Math.abs(v-profile.primaries[1<<j][i])<1e-12));}
const csv=A.profileCSV(profile),parsed=A.parseProfileCSV(csv,4);assert.equal(parsed.primaries.length,16);assert.throws(()=>A.parseProfileCSV(csv.replace('0.98000000','NaN'),4));
const targets=Array.from({length:32},(_,i)=>model.forward([i/31,.3,.1,0]).rgb);
const data=new Uint8ClampedArray(targets.flatMap(rgb=>[...rgb,255]));
console.time('inverse');const r=A.separate(data,32,1,'process4',4,{strategy:'quality',tac:160,maxActive:3,minDot:3});console.timeEnd('inverse');
let maxActive=0;for(let i=0;i<32;i++){const c=r.channels.map(ch=>ch[i]);assert(c.reduce((s,v)=>s+v,0)<=1.6+1e-6);assert(c.every(v=>v===0||v>=.03-1e-6));maxActive=Math.max(maxActive,c.filter(v=>v>0).length);}assert(maxActive<=3);assert(r.stats.meanDE00<2.5,JSON.stringify(r.stats));
const reduced=A.separate(data,32,1,'process4',4,{strategy:'economy',tac:90,maxActive:2});assert(reduced.stats.maxTac<=90.0001);
const pastel=new Uint8ClampedArray([250,220,230,255,230,245,250,255,255,255,255,255]);const spot=A.separate(pastel,3,1,'spot',2);assert.equal(spot.palette.length,2);assert(spot.palette.some(p=>p.rgb[0]===250&&p.rgb[1]===220));assert(spot.stats.meanDE00<.1);
const ring=new Uint8ClampedArray(5*5*4);for(let y=0;y<5;y++)for(let x=0;x<5;x++){const i=(y*5+x)*4,red=x>=1&&x<=3&&y>=1&&y<=3&&!(x===2&&y===2);ring.set(red?[208,37,43,255]:[255,255,255,255],i);}
const seven=A.separate(ring,5,5,'reference7');assert.deepEqual(seven.palette.map(p=>p.name),['1 浅兰','2 黄','3 桔红','4 红','5 绿','6 深兰','7 盖白']);assert.equal(seven.channels[6][0],0);assert.equal(seven.channels[6][12],1);assert.equal(seven.channels[6][6],1);assert(seven.channels[3][6]>.9);assert.equal(seven.stats.activePlates,2);
for(let i=0;i<ring.length/4;i++)assert(!(seven.channels[2][i]>0&&seven.channels[3][i]>0));
const guidedMasks=[null,null,new Uint8Array([128,0]),new Uint8Array([0,255]),null,null,new Uint8Array([255,255])];
const guided=A.separate(new Uint8ClampedArray([225,63,47,255,208,37,43,255]),2,1,'reference7',4,{referencePlateMasks:guidedMasks});
assert(Math.abs(guided.channels[2][0]-128/255)<1e-6);assert.equal(guided.channels[2][1],0);assert.equal(guided.channels[3][0],0);assert.equal(guided.channels[3][1],1);assert.deepEqual(guided.referenceGuided,[false,false,true,true,false,false,true]);
const fixed={width:1,height:1,palette:[{angle:0}],channels:[new Float32Array([.3])]};const fm=A.platePixels(fixed,0,200,200,8,true,0,'fm');let black=0;for(let i=0;i<fm.length;i+=4){assert([0,255].includes(fm[i]));if(fm[i]===0)black++;}assert(Math.abs(black/40000-.3)<.005);
console.log('PASS: 34 CIEDE2000 reference pairs, sRGB roundtrip, spectral solid primaries, profile validation, inverse model recovery, TAC/active/min-dot constraints, pastel preservation, layered seven-color inference and supplied plate masks, FM area.');
console.log(JSON.stringify({inverse:r.stats.meanDE00,economy:reduced.stats.meanDE00,tac:reduced.stats.meanTac}));
