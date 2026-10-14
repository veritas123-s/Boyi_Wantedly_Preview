'use strict';
const mq={matches:false},clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
let field=null;
function smooth(a,b,x) { const q=clamp((x-a)/(b-a)); return q*q*(3-2*q); }
function cacheFieldPoints(f) {
 const {w,h,kind}=f,short=Math.min(w,h),pitch=kind==='mission'?short/30:7;
 const cols=Math.floor(w/pitch),rows=Math.floor(h/pitch),points=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
  const px=(w-cols*pitch)/2+i*pitch,py=(h-rows*pitch)/2+j*pitch,x=(px-w/2)/(short/2),y=(py-h/2)/(short/2),r=Math.hypot(x,y);
  const point={px,py,x,y,r,mask:kind==='mission'?1-smooth(.88,1.12,r):1};
  if(point.mask<=0)continue;
  if(kind==='mission')point.swirl=(Math.atan2(y,x)+1.6*Math.log(Math.max(r,.001)))*3/(Math.PI*2)+.5;
  if(kind==='ripple')point.ripple=Array.from({length:4},(_,k)=>{const d=Math.hypot(x-Math.cos(k*2)*.65,y-Math.sin(k*2)*.4);return {sin:Math.sin(d*11+k),cos:Math.cos(d*11+k),weight:Math.exp(-d*.7)/3};});
  points.push(point);
 }
 f.pitch=pitch;f.points=points;
}
function mission(point,mode,waves,spin) {
  const {r}=point;
  if(mode===0 || mode===1) {
    let value=0;
    for(const {radius,decay} of waves[mode]) {
      const wave=mode===0?1-smooth(radius-.25,radius+.25,r):Math.exp(-Math.pow((r-radius)/.16,2));
      value=Math.max(value,wave*decay);
    }
    return value;
  }
  const span=clamp(r),turns=point.swirl+spin;
  const distance=Math.abs((turns-Math.floor(turns))-.5)*2;
  const width=.85*(1-.25*span);
  return (1-smooth(width*.5,width,distance))*smooth(0,.5,r)*(1-.8*span);
}
function drawField(f, time) {
  if(f.worker){
   const t=mq.matches?0:time,step=Math.floor(t/4);
   if(f.state!==step){f.state=step;f.figure.dataset.rmPattern=['circle','rings','spiral'][step%3];f.figure.style.setProperty('--rm-wheel-angle',`${step*120}deg`);f.labels.forEach((n,i)=>n.classList.toggle('rm-active',i===step%3));}
   if(f.pending){f.queuedTime=time;return;}f.pending=true;f.worker.postMessage({type:'draw',time:t});return;
  }
  const {ctx,w,h,kind}=f, t=mq.matches?0:time;
  ctx.clearRect(0,0,w,h); ctx.fillStyle='#292723';
  if(!f.points)cacheFieldPoints(f);
  const pitch=f.pitch;
  const step=Math.floor(t/4), mode=step%3, previous=step===0?mode:(mode+2)%3;
  const morph=ease(clamp((t%4)/1.5));
  if (f.state!==step) {
    f.state=step; f.figure.dataset.rmPattern=['circle','rings','spiral'][mode]; f.figure.style.setProperty('--rm-wheel-angle', `${step*120}deg`);
    f.labels.forEach((n,i)=>n.classList.toggle('rm-active',i===mode));
  }
  const waves=kind==='mission'?[0,1].map(mode=>Array.from({length:mode===0?3:2},(_,k)=>{const phase=(t*60*.004+k/(mode===0?3:2))%1;return {radius:phase*(mode===0?1.1:1.2),decay:Math.pow(1-phase,mode===0?1.5:1.2)};})):null;
  const spin=t*60*.02*3/(Math.PI*2);
  const centers=kind==='sphere'?Array.from({length:3},(_,k)=>({cx:Math.sin(t*.22+k*2)*.8,cy:Math.cos(t*.18+k*2)*.35,size:.5+k*.1})):null;
  const phases=kind==='ripple'?Array.from({length:4},(_,k)=>({sin:Math.sin(t*(1+k*.17)),cos:Math.cos(t*(1+k*.17))})):null;
  for(const point of f.points) {
    const {px,py,x,y,r,mask}=point;let v;
    if(kind==='mission') {
      v=morph===1?mission(point,mode,waves,spin):morph===0?mission(point,previous,waves,spin):mission(point,previous,waves,spin)*(1-morph)+mission(point,mode,waves,spin)*morph;
    } else if(kind==='sphere') {
      v=0;
      for(const {cx,cy,size} of centers) {
        const d=Math.hypot(x-cx,y-cy)/size;
        if(d<1) v=Math.max(v,Math.sqrt(1-d*d)*(.65+.35*clamp(1-(x-cx))));
      }
    } else {
      v=0;
      for(let k=0;k<4;k++) {
        const wave=point.ripple[k],phase=phases[k];
        v+=Math.max(0,wave.sin*phase.cos-wave.cos*phase.sin)*wave.weight;
      }
    }
    const radius=pitch*(kind==='mission'?.03+.39*Math.pow(clamp(v),.9):.06+.32*Math.pow(clamp(v),.82))*(kind==='mission'?1+.25*Math.sin(t*3-r*3):1);
    ctx.globalAlpha=mask; ctx.beginPath(); ctx.arc(px,py,radius,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
}

self.onmessage=event=>{
 const m=event.data;
 if(m.type==='init'){
  const ctx=m.canvas.getContext('2d');if(!ctx)throw Error('Offscreen 2D unavailable');
  field={canvas:m.canvas,ctx,kind:m.kind,figure:{dataset:{},style:{setProperty(){}}},labels:[],w:1,h:1,state:-1,worker:null};
 }else if(m.type==='resize'&&field){field.w=m.w;field.h=m.h;field.canvas.width=Math.round(m.w*m.dpr);field.canvas.height=Math.round(m.h*m.dpr);field.ctx.setTransform(m.dpr,0,0,m.dpr,0,0);cacheFieldPoints(field);
 }else if(m.type==='draw'&&field){drawField(field,m.time);self.postMessage({type:'drawn'});}
};
