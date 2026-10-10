const assert=require('node:assert/strict');
const E=require('./engine.js');
const make=rgb=>new Uint8ClampedArray([...rgb,255]);
const white=E.separate(make([255,255,255]),1,1);
assert(white.channels.every(c=>c[0]===0));assert.equal(white.mae,0);
const cyan=E.separate(make([0,174,211]),1,1);assert(cyan.mae<2,`Cyan reconstruction error ${cyan.mae}`);
const gray=E.separate(make([70,70,70]),1,1);assert(gray.channels.every(c=>c[0]>=0&&c[0]<=1));
assert.deepEqual([...E.compose(cyan,[false,false,false,false])],[255,255,255,255]);
const solid=E.separate(new Uint8ClampedArray([...make([210,40,30]),...make([30,120,80]),...make([255,255,255])]),3,1,'spot',2);assert.equal(solid.palette.length,2);assert(solid.mae<1);
for(const coverage of [.1,.3,.5,.7,.9]){let dots=0;for(let y=0;y<400;y++)for(let x=0;x<400;x++)if(E.dotAt(x,y,coverage,40,0))dots++;assert(Math.abs(dots/160000-coverage)<.025,`Area error ${coverage}: ${dots/160000}`);}
const plate=E.platePixels(cyan,0,80,80,10,true);for(let i=0;i<plate.length;i+=4){assert([0,255].includes(plate[i]));assert.equal(plate[i],plate[i+1]);assert.equal(plate[i+3],255);}
console.log('PASS: white, bounded separation, cyan reconstruction, layer visibility, spot colors, halftone area and binary pixels.');
