/* Spectral Yule–Nielsen Neugebauer, Demichel independent area fractions.
 * Built-in primaries are synthetic, NOT measured ceramic colorants.
 * References and limitations: 算法说明.md and data/README.md.
 */
(function(root){
'use strict';
const CIE=typeof module!=='undefined'?require('./color-data.js'):root.CIEData;
const Legacy=typeof module!=='undefined'?require('./engine.js'):root.DecalEngine;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const inks=[{id:'C',name:'青 C',angle:15},{id:'M',name:'品红 M',angle:75},{id:'Y',name:'黄 Y',angle:0},{id:'K',name:'黑 K',angle:45},{id:'R',name:'红 R',angle:30},{id:'G',name:'绿 G',angle:60}];
// Screen-color estimates from the supplied seven-plate reference, not measured ink data.
const referenceSeven=[
 {id:'1',name:'1 浅兰',rgb:[92,128,208],angle:15,referenceMesh:'300#'},
 {id:'2',name:'2 黄',rgb:[251,193,48],angle:75,referenceMesh:'250#'},
 {id:'3',name:'3 桔红',rgb:[225,63,47],angle:0,referenceMesh:'300#'},
 {id:'4',name:'4 红',rgb:[208,37,43],angle:45,referenceMesh:'300#'},
 {id:'5',name:'5 绿',rgb:[125,180,119],angle:30,referenceMesh:'300#'},
 {id:'6',name:'6 深兰',rgb:[36,39,91],angle:60,referenceMesh:'300#'},
 {id:'7',name:'7 盖白',rgb:[255,255,255],angle:10,underbase:true,referenceMesh:'300#'}
];
const white=[.95047,1,1.08883];
const norm=CIE.cmf.reduce((s,c,i)=>s+c[1]*CIE.d65[i],0);
const integration=CIE.cmf.map((c,i)=>c.map(v=>v*CIE.d65[i]/norm));
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const encode=v=>Math.round(255*clamp(v<=.0031308?12.92*v:1.055*Math.max(0,v)**(1/2.4)-.055));
function rgbToXYZ(rgb){const [r,g,b]=rgb.map(linear);return [.4124564*r+.3575761*g+.1804375*b,.2126729*r+.7151522*g+.072175*b,.0193339*r+.119192*g+.9503041*b];}
function xyzToRgb([x,y,z]){return [encode(3.2404542*x-1.5371385*y-.4985314*z),encode(-.969266*x+1.8760108*y+.041556*z),encode(.0556434*x-.2040259*y+1.0572252*z)];}
function xyzToLab(xyz){const f=xyz.map((v,i)=>{const t=v/white[i];return t>216/24389?Math.cbrt(t):(24389/27*t+16)/116;});return [116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])];}
const rgbToLab=rgb=>xyzToLab(rgbToXYZ(rgb));
const sqdist=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);
function deltaE00(a,b){
 const [L1,a1,b1]=a,[L2,a2,b2]=b,C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),C=(C1+C2)/2;
 const g=.5*(1-Math.sqrt(C**7/(C**7+25**7))),ap1=(1+g)*a1,ap2=(1+g)*a2,cp1=Math.hypot(ap1,b1),cp2=Math.hypot(ap2,b2);
 const degrees=x=>x*180/Math.PI,radians=x=>x*Math.PI/180;
 const hue=(x,y)=>{if(x===0&&y===0)return 0;return (degrees(Math.atan2(y,x))+360)%360;};
 const h1=hue(ap1,b1),h2=hue(ap2,b2);let dh=h2-h1;if(cp1*cp2===0)dh=0;else if(dh>180)dh-=360;else if(dh< -180)dh+=360;
 const dL=L2-L1,dC=cp2-cp1,dH=2*Math.sqrt(cp1*cp2)*Math.sin(radians(dh/2)),lm=(L1+L2)/2,cm=(cp1+cp2)/2;
 let hm;if(cp1*cp2===0)hm=h1+h2;else if(Math.abs(h1-h2)<=180)hm=(h1+h2)/2;else hm=(h1+h2+(h1+h2<360?360:-360))/2;
 const T=1-.17*Math.cos(radians(hm-30))+.24*Math.cos(radians(2*hm))+.32*Math.cos(radians(3*hm+6))-.20*Math.cos(radians(4*hm-63));
 const sl=1+.015*(lm-50)**2/Math.sqrt(20+(lm-50)**2),sc=1+.045*cm,sh=1+.015*cm*T;
 const rt=-2*Math.sqrt(cm**7/(cm**7+25**7))*Math.sin(radians(60*Math.exp(-(((hm-275)/25)**2))));
 const x=dL/sl,y=dC/sc,z=dH/sh;return Math.sqrt(Math.max(0,x*x+y*y+z*z+rt*y*z));
}
function spectralXYZ(spectrum){const out=[0,0,0];for(let i=0;i<spectrum.length;i++)for(let q=0;q<3;q++)out[q]+=spectrum[i]*integration[i][q];return out;}
function syntheticProfile(n){
 const gaussian=(w,c,s)=>Math.exp(-.5*((w-c)/s)**2);
 const absorb=(j,w)=>[.08+3.7*gaussian(w,655,65),.06+3.4*gaussian(w,545,42),.03+4.5*gaussian(w,430,48),3.1,.08+4*gaussian(w,440,50)+3.6*gaussian(w,540,42),.08+3.8*gaussian(w,430,40)+3.7*gaussian(w,665,50)][j];
 const primaries=Array.from({length:1<<n},(_,mask)=>CIE.wavelengths.map(w=>{let d=0;for(let j=0;j<n;j++)if(mask&(1<<j))d+=absorb(j,w);return .98*Math.exp(-d);}));
 return {schema:'decal-spectral-v1',name:'合成光谱 '+n+' 色（演示）',source:'synthetic',wavelengths:CIE.wavelengths.slice(),inkIds:inks.slice(0,n).map(p=>p.id),primaries};
}
function validateProfile(p,n){
 if(!p||p.schema!=='decal-spectral-v1')throw Error('配置 schema 应为 decal-spectral-v1。');
 if(!['synthetic','user-measured'].includes(p.source))throw Error('source 仅支持 synthetic 或 user-measured。');
 if(!Array.isArray(p.inkIds)||p.inkIds.length!==n||p.inkIds.some((id,j)=>id!==inks[j].id))throw Error('色序应为 '+inks.slice(0,n).map(p=>p.id).join(',')+'。');
 if(JSON.stringify(p.wavelengths)!==JSON.stringify(CIE.wavelengths))throw Error('光谱波长应为 380–780 nm，间隔 10 nm，共 41 个值。');
 if(!Array.isArray(p.primaries)||p.primaries.length!==(1<<n))throw Error('需要 '+(1<<n)+' 个实地叠印组合，包含底材。');
 p.primaries.forEach((s,j)=>{if(!Array.isArray(s)||s.length!==41||s.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('组合 '+j+' 的反射率必须是 41 个 0–1 有限值。');});return p;
}
function makeModel(profile,n=1.6){
 const channels=profile.inkIds.length,roots=profile.primaries.map(s=>s.map(v=>v**(1/n)));
 const palette=inks.slice(0,channels).map((p,j)=>({...p,rgb:xyzToRgb(spectralXYZ(profile.primaries[1<<j]))}));
 function forward(coverage){
  const active=[];let fixed=0;for(let j=0;j<channels;j++){if(coverage[j]>=1)fixed|=1<<j;else if(coverage[j]>0)active.push(j);}
  const spectrum=new Float64Array(41);for(let m=0;m<(1<<active.length);m++){let area=1,mask=fixed;for(let t=0;t<active.length;t++){const j=active[t],v=coverage[j];if(m&(1<<t)){area*=v;mask|=1<<j;}else area*=1-v;}if(area<1e-12)continue;const r=roots[mask];for(let s=0;s<41;s++)spectrum[s]+=area*r[s];}
  for(let s=0;s<41;s++)spectrum[s]=spectrum[s]**n;const xyz=spectralXYZ(spectrum);return {xyz,lab:xyzToLab(xyz),rgb:xyzToRgb(xyz),spectrum};
 }
 return {profile,n,palette,forward};
}
function buildTree(points,depth=0){if(!points.length)return null;const axis=depth%3;points.sort((a,b)=>a.lab[axis]-b.lab[axis]);const m=points.length>>1;return {point:points[m],axis,left:buildTree(points.slice(0,m),depth+1),right:buildTree(points.slice(m+1),depth+1)};}
function nearest(tree,target,penalty,limit=3){const best=[];function visit(node){if(!node)return;const p=node.point,score=sqdist(p.lab,target)+penalty(p.coverage);if(best.length<limit||score<best[best.length-1].score){best.push({point:p,score});best.sort((a,b)=>a.score-b.score);if(best.length>limit)best.pop();}const d=target[node.axis]-p.lab[node.axis];visit(d<0?node.left:node.right);if(best.length<limit||d*d<=best[best.length-1].score)visit(d<0?node.right:node.left);}visit(tree);return best;}
function settings(options={},channels=4){return {n:clamp(Number(options.n)||1.6,1,4),tac:clamp(Number(options.tac)||240,50,400)/100,maxActive:clamp(Math.round(Number(options.maxActive)||3),1,channels),minDot:clamp(Number(options.minDot)||0,0,20)/100,inkWeight:options.strategy==='economy'?20:options.strategy==='quality'?0:5,activeWeight:options.strategy==='economy'?4:options.strategy==='quality'?0:.8,strategy:options.strategy||'balanced',quality:options.quality==='fine'?'fine':'standard'};}
function spectralSeparate(data,width,height,mode,options={},progress=()=>{}){
 const channelsCount=mode==='extended6'?6:4,opts=settings(options,channelsCount);const profile=validateProfile(options.profile||syntheticProfile(channelsCount),channelsCount),model=makeModel(profile,opts.n);
 const valid=c=>c.reduce((s,v)=>s+v,0)<=opts.tac+1e-7&&c.filter(v=>v>1e-7).length<=opts.maxActive&&c.every(v=>v<=1&&v>=0&&(v===0||v>=opts.minDot-1e-7));
 const penalty=c=>opts.inkWeight*c.reduce((s,v)=>s+v,0)+opts.activeWeight*c.filter(v=>v>1e-7).length;
 const candidates=[],coverage=new Array(channelsCount).fill(0),levels=[0,.25,.5,.75,1];
 function enumerate(j){if(j===channelsCount){if(valid(coverage))candidates.push({coverage:coverage.slice(),lab:model.forward(coverage).lab});return;}for(const v of levels){coverage[j]=v;enumerate(j+1);}coverage[j]=0;}
 progress('建立叠印候选库',0);enumerate(0);const tree=buildTree(candidates.slice());
 const baseTree=channelsCount===6?buildTree(candidates.filter(p=>p.coverage[4]===0&&p.coverage[5]===0)):null;
 function refine(seed,target,variableChannels=channelsCount){let c=seed.slice(),prediction=model.forward(c),score=deltaE00(target,prediction.lab)**2+penalty(c),moves=0;
  for(const step of [.125,.0625,.03125,.015625])for(let sweep=0;sweep<2;sweep++){let improved=false;for(let j=0;j<variableChannels;j++)for(const dir of [-1,1]){const test=c.slice();test[j]=clamp(test[j]+dir*step);if(test[j]<opts.minDot)test[j]=dir<0?0:opts.minDot;if(!valid(test))continue;const pred=model.forward(test),newScore=deltaE00(target,pred.lab)**2+penalty(test);if(newScore<score-1e-5){c=test;prediction=pred;score=newScore;improved=true;moves++;}}if(!improved)break;}
  return {coverage:c,prediction,score,moves};
 }
 const quantization=opts.quality==='fine'?64:32,groups=new Map(),keys=new Uint32Array(width*height),foreground=new Uint8Array(width*height);
 for(let i=0;i<width*height;i++){const r=data[4*i],g=data[4*i+1],b=data[4*i+2];foreground[i]=Math.max(255-r,255-g,255-b)>8?1:0;const a=Math.min(quantization-1,Math.floor(r*quantization/256)),c=Math.min(quantization-1,Math.floor(g*quantization/256)),d=Math.min(quantization-1,Math.floor(b*quantization/256)),key=(a*quantization+c)*quantization+d;keys[i]=key;let group=groups.get(key);if(!group){group={sum:[0,0,0],count:0};groups.set(key,group);}group.sum[0]+=r;group.sum[1]+=g;group.sum[2]+=b;group.count++;}
 const channels=Array.from({length:channelsCount},()=>new Float32Array(width*height)),errors=new Float32Array(width*height),preview=new Uint8ClampedArray(width*height*4);let completed=0;
 for(const group of groups.values()){
  const target=rgbToLab(group.sum.map(v=>v/group.count));const seeds=nearest(tree,target,penalty,opts.quality==='fine'?3:2);let winner=null;
  if(baseTree){for(const seed of nearest(baseTree,target,penalty,opts.quality==='fine'?3:2)){const base=refine(seed.point.coverage,target,4);if(!winner||base.score<winner.score)winner=base;seeds.push({point:{coverage:base.coverage}});}}
  for(const seed of seeds){const solved=refine(seed.point.coverage,target);if(!winner||solved.score<winner.score)winner=solved;}
  group.solution=winner;completed++;if(completed%80===0)progress('感知颜色约束求解',Math.round(completed/groups.size*85));
 }
 const deltas=[],tacs=[],channelAreas=new Array(channelsCount).fill(0);let inkSum=0,foregroundCount=0,mae=0,maxTac=0,riskCount=0;
 for(let i=0;i<width*height;i++){
  const solution=groups.get(keys[i]).solution,lab=rgbToLab([data[i*4],data[i*4+1],data[i*4+2]]),de=deltaE00(lab,solution.prediction.lab);errors[i]=de;let tac=0;
  for(let j=0;j<channelsCount;j++){const v=solution.coverage[j];channels[j][i]=v;tac+=v;channelAreas[j]+=v;}maxTac=Math.max(maxTac,tac);
  for(let q=0;q<3;q++){preview[i*4+q]=solution.prediction.rgb[q];mae+=Math.abs(preview[i*4+q]-data[i*4+q]);}preview[i*4+3]=255;
  if(foreground[i]){foregroundCount++;deltas.push(de);tacs.push(tac);inkSum+=tac;if(de>5)riskCount++;}
 }
 deltas.sort((a,b)=>a-b);const stats={meanDE00:deltas.length?deltas.reduce((s,v)=>s+v,0)/deltas.length:0,p95DE00:deltas.length?deltas[Math.floor((deltas.length-1)*.95)]:0,maxDE00:deltas.length?deltas[deltas.length-1]:0,above5Percent:100*riskCount/(foregroundCount||1),meanTac:100*inkSum/(foregroundCount||1),maxTac:100*maxTac,foregroundPixels:foregroundCount,foregroundRule:'max(255-R,255-G,255-B)>8; assumed white background',candidateCount:candidates.length,targetGroups:groups.size,quantization,channelAreas:channelAreas.map(v=>v/(width*height)),activePlates:channelAreas.filter(v=>v>width*height*.0001).length};
 progress('完成',100);return {width,height,mode,palette:model.palette,channels,profile,modelOptions:opts,stats,errors,foreground,preview,mae:mae/(width*height*3),advanced:true};
}
function perceptualSpot(data,width,height,count){
 const histogram=new Map();for(let i=0;i<width*height;i++){const rgb=[data[i*4],data[i*4+1],data[i*4+2]];if(rgb.every(v=>v>247))continue;const key=rgb.map(v=>v>>3).join(',');let p=histogram.get(key);if(!p){p={sum:[0,0,0],weight:0};histogram.set(key,p);}p.weight++;rgb.forEach((v,q)=>p.sum[q]+=v);}
 const points=[...histogram.values()].map(p=>({rgb:p.sum.map(v=>v/p.weight),weight:p.weight}));points.forEach(p=>p.lab=rgbToLab(p.rgb));if(!points.length)points.push({rgb:[0,0,0],weight:1,lab:[0,0,0]});
 const centers=[points.reduce((a,b)=>a.weight>b.weight?a:b).lab.slice()];while(centers.length<count){let winner=null,best=-1;for(const p of points){const d=Math.min(...centers.map(c=>sqdist(c,p.lab)))*Math.sqrt(p.weight);if(d>best){best=d;winner=p;}}if(best<1)break;centers.push(winner.lab.slice());}
 for(let it=0;it<24;it++){const sums=centers.map(()=>[0,0,0,0]);for(const p of points){let best=0,min=Infinity;centers.forEach((c,j)=>{const d=sqdist(c,p.lab);if(d<min){min=d;best=j;}});p.lab.forEach((v,q)=>sums[best][q]+=v*p.weight);sums[best][3]+=p.weight;}let movement=0;centers.forEach((c,j)=>{if(sums[j][3]){const next=sums[j].slice(0,3).map(v=>v/sums[j][3]);movement+=sqdist(c,next);centers[j]=next;}});if(movement<.001)break;}
 const palette=centers.map((c,j)=>{let p=points[0],best=Infinity;for(const q of points){const d=sqdist(c,q.lab);if(d<best){best=d;p=q;}}return {name:'专色 '+(j+1),rgb:p.rgb.map(Math.round),angle:[15,75,0,45,30,60,10,80][j]};});
 const channels=palette.map(()=>new Float32Array(width*height)),linearPalette=palette.map(p=>p.rgb.map(linear));
 for(let i=0;i<width*height;i++){const rgb=[data[i*4],data[i*4+1],data[i*4+2]],target=rgbToLab(rgb),lin=rgb.map(linear);let best=0,bestA=0,min=Infinity;
  linearPalette.forEach((p,j)=>{const v=p.map(x=>1-x),a=clamp(v.reduce((s,x,q)=>s+x*(1-lin[q]),0)/(v.reduce((s,x)=>s+x*x,0)||1)),mixed=p.map(x=>encode(1-a*(1-x))),d=sqdist(target,rgbToLab(mixed));if(d<min){min=d;best=j;bestA=a;}});channels[best][i]=bestA;
 }
 const result={width,height,palette,channels,mode:'spot',advanced:true,spotLinear:true};result.preview=compose(result);result.mae=result.preview.reduce((s,v,i)=>s+(i%4<3?Math.abs(v-data[i]):0),0)/(width*height*3);result.stats=evaluate(data,result.preview);result.errors=new Float32Array(width*height);result.foreground=new Uint8Array(width*height);let inkSum=0;for(let i=0;i<width*height;i++){result.errors[i]=deltaE00(rgbToLab([...data.slice(i*4,i*4+3)]),rgbToLab([...result.preview.slice(i*4,i*4+3)]));result.foreground[i]=Math.max(255-data[i*4],255-data[i*4+1],255-data[i*4+2])>8?1:0;if(result.foreground[i])for(const ch of channels)inkSum+=ch[i];}result.stats.meanTac=100*inkSum/(result.stats.foregroundPixels||1);return result;
}
function referenceSevenSeparate(data,width,height,options={}){
 const palette=referenceSeven.map(p=>({...p,rgb:p.rgb.slice()})),size=width*height;
 const channels=palette.map(()=>new Float32Array(size)),supplied=Array.isArray(options.referencePlateMasks)?options.referencePlateMasks:[];
 const guided=palette.map((_,j)=>supplied[j]!=null);
 for(let j=0;j<7;j++)if(guided[j]&&supplied[j].length!==size)throw Error('第 '+(j+1)+' 张参考色版尺寸不匹配。');
 const nearWhite=i=>data[i*4]>=248&&data[i*4+1]>=248&&data[i*4+2]>=248;
 let groups=null,keys=null;
 if(guided.slice(0,6).some(v=>!v)){
  groups=new Map();keys=new Uint16Array(size);
  for(let i=0;i<size;i++){
   const r=data[i*4],g=data[i*4+1],b=data[i*4+2],key=((r>>3)*32+(g>>3))*32+(b>>3);keys[i]=key;
   let group=groups.get(key);if(!group){group={sum:[0,0,0],count:0};groups.set(key,group);}
   group.sum[0]+=r;group.sum[1]+=g;group.sum[2]+=b;group.count++;
  }
  // Each candidate is a stack of independent ink coverages. 3 and 4 are
  // mutually exclusive in automatic inference; supplied plates stay intact.
  const candidates=[],levels=[.33,.67,1],pigments=palette.slice(0,6).map(p=>p.rgb.map(linear));
  function add(c){
   let lin=[1,1,1],active=0,total=0;for(let j=0;j<6;j++)if(c[j]){active++;total+=c[j];for(let q=0;q<3;q++)lin[q]*=1-c[j]*(1-pigments[j][q]);}
   candidates.push({coverage:c.slice(),lab:rgbToLab(lin.map(encode)),penalty:.8*total+1.2*Math.max(0,active-1)});
  }
  add([0,0,0,0,0,0]);
  function combinations(start,chosen){
   if(chosen.length){const c=[0,0,0,0,0,0];function levelsFor(k){if(k===chosen.length){add(c);return;}for(const level of levels){c[chosen[k]]=level;levelsFor(k+1);}c[chosen[k]]=0;}levelsFor(0);}
   if(chosen.length===3)return;
   for(let j=start;j<6;j++){if((j===2&&chosen.includes(3))||(j===3&&chosen.includes(2)))continue;combinations(j+1,[...chosen,j]);}
  }
  combinations(0,[]);
  for(const group of groups.values()){
   const rgb=group.sum.map(v=>v/group.count);if(rgb.every(v=>v>=248)){group.coverage=candidates[0].coverage;continue;}
   const target=rgbToLab(rgb);let best=Infinity,winner=candidates[0];
   for(const candidate of candidates){const score=deltaE00(target,candidate.lab)**2+candidate.penalty;if(score<best){best=score;winner=candidate;}}
   group.coverage=winner.coverage;
  }
 }
 for(let j=0;j<6;j++)if(guided[j])for(let i=0;i<size;i++)channels[j][i]=supplied[j][i]/255;
 for(let i=0;i<size;i++)if(groups&&!nearWhite(i)){
  const c=groups.get(keys[i]).coverage;for(let j=0;j<6;j++)if(!guided[j])channels[j][i]=c[j];
 }
 if(guided[6])for(let i=0;i<size;i++)channels[6][i]=supplied[6][i]/255;
 else{
  // A near-white region touching the edge is background. Enclosed white
  // details and all colored marks belong to the inferred white underbase.
  const outside=new Uint8Array(size),queue=new Uint32Array(size);let head=0,tail=0;
  function seed(i){if(!outside[i]&&nearWhite(i)){outside[i]=1;queue[tail++]=i;}}
  for(let x=0;x<width;x++){seed(x);seed((height-1)*width+x);}
  for(let y=1;y<height-1;y++){seed(y*width);seed(y*width+width-1);}
  while(head<tail){const i=queue[head++],x=i%width;
   if(x>0)seed(i-1);if(x+1<width)seed(i+1);if(i>=width)seed(i-width);if(i+width<size)seed(i+width);
  }
  for(let i=0;i<size;i++)channels[6][i]=outside[i]?0:1;
 }
 const result={width,height,mode:'reference7',palette,channels,advanced:true,spotLinear:true,referenceSeven:true,
  referenceGuided:guided,paletteSource:'reference-image-screen-estimate',
  layerModel:'multiplicative linear-RGB overprint; independent plates; no measured pigment calibration'};
 result.preview=compose(result);result.mae=result.preview.reduce((s,v,i)=>s+(i%4<3?Math.abs(v-data[i]):0),0)/(size*3);
 result.stats=evaluate(data,result.preview);result.errors=new Float32Array(size);result.foreground=new Uint8Array(size);
 let total=0,max=0,foreground=0;
 for(let i=0;i<size;i++){
  const source=[data[i*4],data[i*4+1],data[i*4+2]],predicted=[result.preview[i*4],result.preview[i*4+1],result.preview[i*4+2]];
  result.errors[i]=deltaE00(rgbToLab(source),rgbToLab(predicted));
  const active=Math.max(255-source[0],255-source[1],255-source[2])>8;result.foreground[i]=active?1:0;
  if(active){foreground++;let coverage=0;for(const channel of channels)coverage+=channel[i];total+=coverage;max=Math.max(max,coverage);}
 }
 result.stats.meanTac=100*total/(foreground||1);result.stats.maxTac=100*max;
 result.stats.activePlates=channels.filter(ch=>ch.some(v=>v>0)).length;result.stats.targetGroups=groups?.size||0;
 return result;
}
function evaluate(source,preview){const deltas=[];let meanTac=0;for(let i=0;i<source.length;i+=4){if(Math.max(255-source[i],255-source[i+1],255-source[i+2])<=8)continue;deltas.push(deltaE00(rgbToLab([...source.slice(i,i+3)]),rgbToLab([...preview.slice(i,i+3)])));}deltas.sort((a,b)=>a-b);return {meanDE00:deltas.length?deltas.reduce((s,v)=>s+v,0)/deltas.length:0,p95DE00:deltas.length?deltas[Math.floor((deltas.length-1)*.95)]:0,above5Percent:100*deltas.filter(v=>v>5).length/(deltas.length||1),foregroundPixels:deltas.length};}
function compose(result,enabled,options={}){
 if(!result.advanced)return Legacy.compose(result,enabled,options);const {width:w,height:h,palette,channels}=result;enabled=enabled||palette.map(()=>true);
 if(result.preview&&enabled.every(Boolean)&&!options.screen&&!options.gain&&!options.offsetPixels)return new Uint8ClampedArray(result.preview);
 const model=result.profile?makeModel(result.profile,result.modelOptions.n):null,out=new Uint8ClampedArray(w*h*4),cache=new Map();
 const fm=options.screen&&options.method==='fm'?channels.map((_,j)=>platePixels(result,j,w,h,options.period,true,options.gain||0,'fm')):null;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=channels.map((ch,j)=>{if(!enabled[j])return 0;const sx=Math.round(x-(options.offsetPixels||0)*j),sy=Math.round(y-(options.offsetPixels||0)*j*.5);if(sx<0||sx>=w||sy<0||sy>=h)return 0;let a=ch[sy*w+sx];a=clamp(a+(options.gain||0)/100*4*a*(1-a));return options.screen?(fm?(fm[j][(sy*w+sx)*4]===0?1:0):(Legacy.dotAt(sx,sy,a,options.period,palette[j].angle)?1:0)):a;});let rgb;
  if(model){const key=c.map(v=>Math.round(v*4096)).join(',');rgb=cache.get(key);if(!rgb){rgb=model.forward(c).rgb;cache.set(key,rgb);}}
  else{let lin=[1,1,1];c.forEach((v,j)=>{palette[j].rgb.forEach((p,q)=>lin[q]*=1-v*(1-linear(p)));});rgb=lin.map(encode);}
  const i=(y*w+x)*4;for(let q=0;q<3;q++)out[i+q]=rgb[q];out[i+3]=255;
 }return out;
}
function heatmap(result){const out=new Uint8ClampedArray(result.width*result.height*4);for(let i=0;i<result.errors.length;i++){const v=clamp(result.errors[i]/10);out[i*4]=Math.round(255*v);out[i*4+1]=Math.round(180*(1-v));out[i*4+2]=Math.round(130*(1-v));out[i*4+3]=result.foreground[i]?255:0;}return out;}
function platePixels(result,index,w,h,period,screen=true,gain=0,method='am'){
 const src=result.channels[index],sw=result.width,sh=result.height,out=new Uint8ClampedArray(w*h*4);
 function sample(x,y){const xx=clamp((x+.5)*sw/w-.5,0,sw-1),yy=clamp((y+.5)*sh/h-.5,0,sh-1),x0=Math.floor(xx),y0=Math.floor(yy),x1=Math.min(sw-1,x0+1),y1=Math.min(sh-1,y0+1),tx=xx-x0,ty=yy-y0;const a=(src[y0*sw+x0]*(1-tx)+src[y0*sw+x1]*tx)*(1-ty)+(src[y1*sw+x0]*(1-tx)+src[y1*sw+x1]*tx)*ty;return clamp(a+gain/100*4*a*(1-a));}
 let current=new Float64Array(w+2),next=new Float64Array(w+2);
 for(let y=0;y<h;y++){const dir=method==='fm'&&y%2?-1:1;for(let t=0;t<w;t++){const x=dir===1?t:w-1-t;let a=sample(x,y),v;
   if(screen&&method==='fm'){a+=current[x+1];const black=a>=.5?1:0;v=black?0:255;const e=a-black;current[x+1+dir]+=e*7/16;next[x+1-dir]+=e*3/16;next[x+1]+=e*5/16;next[x+1+dir]+=e/16;}
   else v=screen?(Legacy.dotAt(x,y,a,period,result.palette[index].angle)?0:255):Math.round(255*(1-a));
   const i=(y*w+x)*4;out[i]=out[i+1]=out[i+2]=v;out[i+3]=255;
  }if(method==='fm'){current=next;next=new Float64Array(w+2);}}
 return out;
}
function profileCSV(profile){return ['mask,'+profile.wavelengths.join(','),...profile.primaries.map((s,i)=>i+','+s.map(v=>v.toFixed(8)).join(','))].join('\n');}
function parseProfileCSV(text,n){const rows=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(r=>r.split(',').map(s=>s.trim()));const expected=['mask',...CIE.wavelengths.map(String)];if(JSON.stringify(rows[0])!==JSON.stringify(expected))throw Error('CSV 表头必须为 mask,380,390,…,780。');const primaries=new Array(1<<n);for(const row of rows.slice(1)){if(row.length!==42||row.some(v=>v===''))throw Error('CSV 每行需要组合编号及 41 个反射率值。');const mask=Number(row[0]);if(!Number.isInteger(mask)||mask<0||mask>=primaries.length||primaries[mask])throw Error('CSV 组合编号无效或重复。');primaries[mask]=row.slice(1).map(Number);}if(primaries.some(s=>!s)||rows.length-1!==primaries.length)throw Error('CSV 缺少叠印组合。');return validateProfile({schema:'decal-spectral-v1',name:'用户导入光谱（来源待核验）',source:'user-measured',inkIds:inks.slice(0,n).map(p=>p.id),wavelengths:CIE.wavelengths.slice(),primaries},n);}
function separate(data,w,h,mode='process4',count=4,options={},progress){if(mode==='legacy4'){const r=Legacy.separate(data,w,h,'process4');r.stats=evaluate(data,Legacy.compose(r));r.legacy=true;return r;}if(mode==='spot')return perceptualSpot(data,w,h,count);if(mode==='reference7')return referenceSevenSeparate(data,w,h,options);return spectralSeparate(data,w,h,mode,options,progress);}
const api={...Legacy,separate,compose,heatmap,platePixels,profileCSV,parseProfileCSV,makeModel,syntheticProfile,validateProfile,rgbToLab,xyzToLab,xyzToRgb,rgbToXYZ,deltaE00,evaluate,spectralXYZ,settings};
if(typeof module!=='undefined')module.exports=api;else{root.DecalLegacy=Legacy;root.DecalEngine=api;}
})(typeof self!=='undefined'?self:this);
