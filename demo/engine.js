/* Deterministic image separation in a deliberately hypothetical optical model. */
(function(root){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const presets=[{name:'青 C',rgb:[0,174,211],angle:15},{name:'品红 M',rgb:[218,35,125],angle:75},{name:'黄 Y',rgb:[255,215,0],angle:0},{name:'黑 K',rgb:[24,27,26],angle:45},{name:'红 R',rgb:[223,45,32],angle:15},{name:'绿 G',rgb:[29,151,64],angle:75}];
const od=rgb=>rgb.map(v=>-Math.log(Math.max(v,1)/255));
function cluster(data,k){
 const points=[];for(let i=0;i<data.length;i+=Math.max(4,Math.floor(data.length/4/8000)*4)){if(Math.min(data[i],data[i+1],data[i+2])<200)points.push([data[i],data[i+1],data[i+2]]);}
 if(!points.length){for(let i=0;i<data.length;i+=4)if(Math.min(data[i],data[i+1],data[i+2])<250)points.push([data[i],data[i+1],data[i+2]]);}if(!points.length)return [{name:'专色 1',rgb:[0,0,0],angle:45}];
 const seed=points.reduce((best,p)=>p[0]+p[1]+p[2]<best[0]+best[1]+best[2]?p:best,points[0]);const centers=[seed.slice()];while(centers.length<k){let far=points[0],best=-1;for(const p of points){const d=Math.min(...centers.map(c=>c.reduce((s,v,j)=>s+(v-p[j])**2,0)));if(d>best){best=d;far=p;}}if(best<1)break;centers.push(far.slice());}
 for(let t=0;t<16;t++){const sums=centers.map(()=>[0,0,0,0]);for(const p of points){let best=0,dmin=Infinity;centers.forEach((c,j)=>{const d=c.reduce((s,v,q)=>s+(v-p[q])**2,0);if(d<dmin){best=j;dmin=d;}});for(let q=0;q<3;q++)sums[best][q]+=p[q];sums[best][3]++;}centers.forEach((c,j)=>{if(sums[j][3])for(let q=0;q<3;q++)c[q]=sums[j][q]/sums[j][3];});}
 return centers.map((rgb,i)=>({name:'专色 '+(i+1),rgb:rgb.map(Math.round),angle:[15,75,0,45,30,60,10,80][i]}));
}
function separate(data,width,height,mode='process4',count=4){
 const palette=mode==='spot'?cluster(data,count):presets.slice(0,mode==='extended6'?6:4).map(p=>({...p,rgb:p.rgb.slice()}));
 const channels=palette.map(()=>new Float32Array(width*height));const vectors=palette.map(p=>od(p.rgb));
 const norms=vectors.map(v=>v.reduce((s,x)=>s+x*x,0));
 for(let i=0;i<width*height;i++){
  const rgb=[data[i*4],data[i*4+1],data[i*4+2]];
  if(mode==='spot'){
   let best=0,err=Infinity,aBest=0;palette.forEach((p,j)=>{const v=p.rgb.map(x=>255-x),norm=v.reduce((s,x)=>s+x*x,0);const a=clamp(v.reduce((s,x,q)=>s+x*(255-rgb[q]),0)/(norm||1));const e=v.reduce((s,x,q)=>s+(255-a*x-rgb[q])**2,0);if(e<err){best=j;err=e;aBest=a;}});channels[best][i]=aBest;
  }else{
   const target=od(rgb),weights=new Float64Array(palette.length),res=target.slice();
   for(let pass=0;pass<20;pass++)for(let j=0;j<palette.length;j++){const v=vectors[j];const delta=v.reduce((s,x,q)=>s+x*res[q],0)/(norms[j]||1);const next=clamp(weights[j]+delta);const change=next-weights[j];weights[j]=next;for(let q=0;q<3;q++)res[q]-=change*v[q];}
   weights.forEach((v,j)=>channels[j][i]=v);
  }
 }
 const result={width,height,palette,channels,mode};const image=compose(result);let error=0;for(let i=0;i<width*height;i++)for(let q=0;q<3;q++)error+=Math.abs(image[i*4+q]-data[i*4+q]);result.mae=error/(width*height*3);return result;
}
function compose(result,enabled,options={}){
 const {width:w,height:h,palette,channels}=result;enabled=enabled||palette.map(()=>true);const out=new Uint8ClampedArray(w*h*4),vectors=palette.map(p=>od(p.rgb));const gain=(options.gain||0)/100,shift=(options.offsetPixels||0);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sum=[0,0,0];for(let j=0;j<palette.length;j++){if(!enabled[j])continue;const sx=Math.round(x-shift*j),sy=Math.round(y-shift*j*.5);if(sx<0||sx>=w||sy<0||sy>=h)continue;let a=channels[j][sy*w+sx];a=clamp(a+gain*4*a*(1-a));if(options.screen)a=dotAt(sx,sy,a,options.period,palette[j].angle)?1:0;if(result.mode==='spot'){for(let q=0;q<3;q++)sum[q]+= -Math.log(Math.max(1,255-a*(255-palette[j].rgb[q]))/255);}else for(let q=0;q<3;q++)sum[q]+=a*vectors[j][q];}const i=(y*w+x)*4;for(let q=0;q<3;q++)out[i+q]=255*Math.exp(-sum[q]);out[i+3]=255;}return out;
}
function dotAt(x,y,a,period,angle){if(a<=0)return false;if(a>=1)return true;period=Math.max(2,period||8);const rad=angle*Math.PI/180;const u=(x*Math.cos(rad)+y*Math.sin(rad))/period,v=(-x*Math.sin(rad)+y*Math.cos(rad))/period;const dx=u-Math.floor(u)-.5,dy=v-Math.floor(v)-.5;
 // Circular highlights and inverse circular shadows preserve nominal cell area.
 if(a<=.5)return dx*dx+dy*dy<=a/Math.PI;
 const cx=.5-Math.abs(dx),cy=.5-Math.abs(dy);return cx*cx+cy*cy>(1-a)/Math.PI;
}
function platePixels(result,index,w,h,period,screen=true,gain=0){const out=new Uint8ClampedArray(w*h*4);const source=result.channels[index];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.min(result.width-1,Math.floor((x+.5)*result.width/w)),sy=Math.min(result.height-1,Math.floor((y+.5)*result.height/h));let a=source[sy*result.width+sx];a=clamp(a+gain/100*4*a*(1-a));const v=screen?(dotAt(x,y,a,period,result.palette[index].angle)?0:255):Math.round(255*(1-a));const i=(y*w+x)*4;out[i]=out[i+1]=out[i+2]=v;out[i+3]=255;}return out;}
const api={separate,compose,platePixels,dotAt};if(typeof module!=='undefined')module.exports=api;else root.DecalEngine=api;
})(typeof self!=='undefined'?self:this);
