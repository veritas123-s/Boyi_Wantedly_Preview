/* Naidan / 奶蛋. Static, original reference-matched indexed solid geometry.
 * This module is also imported on the main thread to build the small initial LOD.
 * The million-triangle model is generated only in a same-origin module Worker.
 */
export const NAIDAN_TRIANGLES = Object.freeze({ high: 1113056, smooth: 19432 });
const PROFILE = [[0,2.26],[.16,2.247],[.34,2.18],[.51,2.055],[.65,1.88],
  [.79,1.64],[.91,1.36],[.99,1.08],[1.015,.80],[.99,.54],
  [.90,.30],[.76,.13],[.59,.060],[.35,.038],[0,.035]];

function closedRings(rings, ringCount, segments, first, last) {
  const count = ringCount * segments + 2;
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
  positions.set(first); positions.set(rings, 3); positions.set(last, (count - 1) * 3);
  const indices = new Uint32Array(ringCount * segments * 6); let at = 0;
  const face = (a,b,c) => { indices[at++] = a; indices[at++] = b; indices[at++] = c; };
  for (let j = 0; j < segments; j++) face(0, 1+j, 1+(j+1)%segments);
  for (let i = 0; i < ringCount-1; i++) for (let j = 0; j < segments; j++) {
    const a = 1+i*segments+j, b = 1+i*segments+(j+1)%segments, c = a+segments, d = b+segments;
    face(a,c,b); face(b,c,d);
  }
  for (let j = 0; j < segments; j++) face(1+(ringCount-1)*segments+j, count-1, 1+(ringCount-1)*segments+(j+1)%segments);
  // Rings run clockwise under the reference's +Z front convention.
  let volume = 0;
  for (let i=0; i<indices.length; i+=3) {
    const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
    volume += positions[a]*(positions[b+1]*positions[c+2]-positions[b+2]*positions[c+1])
      +positions[a+1]*(positions[b+2]*positions[c]-positions[b]*positions[c+2])
      +positions[a+2]*(positions[b]*positions[c+1]-positions[b+1]*positions[c]);
  }
  if (volume < 0) for (let i=0;i<indices.length;i+=3) { const x=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=x; }
  for (let i=0;i<indices.length;i+=3) {
    const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
    const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2];
    const vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    for (const k of [a,b,c]) {normals[k]+=nx;normals[k+1]+=ny;normals[k+2]+=nz;}
  }
  for(let i=0;i<normals.length;i+=3){const len=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;normals[i]/=len;normals[i+1]/=len;normals[i+2]/=len;}
  return {positions,normals,indices};
}

function body(lon,lat) {
  const p=PROFILE,ext=[[2*p[0][0]-p[1][0],2*p[0][1]-p[1][1]],...p,[2*p.at(-1)[0]-p.at(-2)[0],2*p.at(-1)[1]-p.at(-2)[1]]];
  const curve=[];
  for(let k=1;k<ext.length-2;k++) for(let j=0;j<160;j++) {
    const t=j/160,a=ext[k-1],b=ext[k],c=ext[k+1],d=ext[k+2];
    curve.push([0,1].map(q=>.5*(2*b[q]+(-a[q]+c[q])*t+(2*a[q]-5*b[q]+4*c[q]-d[q])*t*t+(-a[q]+3*b[q]-3*c[q]+d[q])*t*t*t)));
  }
  curve.push(p.at(-1));const lengths=new Float64Array(curve.length);
  for(let i=1;i<curve.length;i++)lengths[i]=lengths[i-1]+Math.hypot(curve[i][0]-curve[i-1][0],curve[i][1]-curve[i-1][1]);
  const rings=new Float32Array((lat-1)*lon*3);let cursor=0;
  for(let i=1;i<lat;i++) {
    const dist=lengths.at(-1)*i/lat;while(cursor+1<lengths.length-1&&lengths[cursor+1]<dist)cursor++;
    const t=(dist-lengths[cursor])/(lengths[cursor+1]-lengths[cursor]);
    const r=curve[cursor][0]*(1-t)+curve[cursor+1][0]*t,y=curve[cursor][1]*(1-t)+curve[cursor+1][1]*t;
    for(let j=0;j<lon;j++){const a=j*2*Math.PI/lon,k=((i-1)*lon+j)*3;rings[k]=r*Math.cos(a);rings[k+1]=y;rings[k+2]=.79*r*Math.sin(a);}
  }
  return closedRings(rings,lat-1,lon,[0,2.26,0],[0,.035,0]);
}
function ellipsoid(center,scale,lon,lat) {
  const rings=new Float32Array((lat-1)*lon*3);
  for(let i=1;i<lat;i++)for(let j=0;j<lon;j++){
    const t=i*Math.PI/lat,a=j*2*Math.PI/lon,k=((i-1)*lon+j)*3;
    rings[k]=center[0]+scale[0]*Math.sin(t)*Math.cos(a);rings[k+1]=center[1]+scale[1]*Math.cos(t);rings[k+2]=center[2]+scale[2]*Math.sin(t)*Math.sin(a);
  }
  return closedRings(rings,lat-1,lon,[center[0],center[1]+scale[1],center[2]],[center[0],center[1]-scale[1],center[2]]);
}
function smile(lon,lat) {
  const rings=new Float32Array((lat-1)*lon*3);
  for(let i=1;i<lat;i++)for(let j=0;j<lon;j++){
    const t=-1+2*i/lat,a=j*2*Math.PI/lon,r=.012*Math.sqrt(1-t*t),k=((i-1)*lon+j)*3;
    rings[k]=.2*t;rings[k+1]=1.65-.028*(1-t*t)+r*Math.cos(a);rings[k+2]=.668-.058*t*t+r*Math.sin(a);
  }
  return closedRings(rings,lat-1,lon,[-.2,1.65,.61],[.2,1.65,.61]);
}
export function buildNaidanMeshData(high=false,onProgress=()=>{}) {
  const out=[];const add=(name,material,data)=>out.push({name,material,...data});
  add('Naidan body',0,body(high?1024:96,high?512:64));onProgress(72);
  const lon=high?96:32,lat=high?64:24;
  for(const [label,sign]of [['Left',-1],['Right',1]]){
    const x=sign*.316;
    add(label+' green eye',1,ellipsoid([x,1.848,.510],[.122,.143,.071],lon,lat));
    add(label+' black pupil',2,ellipsoid([x-.006,1.853,.572],[.056,.081,.027],lon,lat));
    add(label+' eye glint',3,ellipsoid([x-.021,1.882,.597],[.012,.017,.005],high?48:16,high?32:12));onProgress(sign<0?82:94);
  }
  add('Small smile',4,smile(high?48:12,high?128:32));onProgress(100);return out;
}
if(typeof WorkerGlobalScope!=='undefined'&&globalThis instanceof WorkerGlobalScope){
  globalThis.onmessage=event=>{
    if(event.data?.type!=='build-naidan')return;
    const started=performance.now();
    try{const meshes=buildNaidanMeshData(true,percent=>globalThis.postMessage({type:'progress',percent}));
      globalThis.postMessage({type:'model',meshes,generationMs:performance.now()-started},meshes.flatMap(m=>[m.positions.buffer,m.normals.buffer,m.indices.buffer]));
    }catch(error){globalThis.postMessage({type:'failure',message:String(error?.message||'Model generation failed').slice(0,180)});}
  };
}
