import { buildNaidanMeshData, NAIDAN_TRIANGLES } from './naidan-worker.js?v=8f95ee627b56';

// All instances using one THREE runtime share materials, geometries and Worker.
const cache=new WeakMap();
function acquire(THREE){
  let entry=cache.get(THREE);
  if(!entry){
    const colors=['#e9b82d','#789841','#121b0b','#dde6bb','#8d6427'],roughness=[.72,.40,.28,.25,.80];
    entry={users:0,listeners:new Set(),worker:null,high:null,error:null,progress:8,generationMs:0};
    entry.materials=colors.map((color,i)=>new THREE.MeshStandardMaterial({name:'Naidan material '+i,color,roughness:roughness[i],metalness:0}));
    entry.convert=data=>data.map(part=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(part.positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(part.normals,3));geometry.setIndex(new THREE.BufferAttribute(part.indices,1));
      // Conservative bounds avoid scanning 556k vertices on the UI thread.
      geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1.1475,0),1.65);
      geometry.boundingBox=new THREE.Box3(new THREE.Vector3(-1.02,.035,-.805),new THREE.Vector3(1.02,2.26,.805));
      return {name:part.name,material:part.material,geometry,triangles:part.indices.length/3,vertices:part.positions.length/3};});
    const start=performance.now();entry.low=entry.convert(buildNaidanMeshData(false));entry.lodGenerationMs=performance.now()-start;
    cache.set(THREE,entry);
  }
  entry.users++;return entry;
}
function requestHigh(entry){
  if(entry.high||entry.worker||entry.error)return;
  const notify=()=>{for(const listener of entry.listeners)listener();};
  const finish=()=>{entry.worker?.terminate();entry.worker=null;entry.progress=100;notify();};
  try{
    entry.worker=new Worker(new URL('./naidan-worker.js?v=8f95ee627b56',import.meta.url),{type:'module',name:'naidan-static-model'});
    entry.worker.onmessage=event=>{const data=event.data;
      if(data?.type==='progress'){entry.progress=Math.max(entry.progress,Math.min(97,8+Math.round(data.percent*.89)));notify();return;}
      if(data?.type==='failure'){entry.error=data.message;finish();return;}
      if(data?.type!=='model')return;
      if(data.meshes?.reduce((n,m)=>n+m.indices.length/3,0)!==NAIDAN_TRIANGLES.high){entry.error='Unexpected model triangle count';finish();return;}
      entry.high=entry.convert(data.meshes);entry.generationMs=data.generationMs;finish();
    };
    entry.worker.onerror=event=>{event.preventDefault?.();entry.error='High-resolution Worker could not complete; matching LOD retained';finish();};
    entry.worker.postMessage({type:'build-naidan'});
  }catch{entry.error='Module Worker unavailable; matching LOD retained';finish();}
}

/** Ground-origin static model. +Z front, 2.03 wide / 2.225 high / 1.604 deep.
 * high/balanced show 19,432 triangles then generate 1,113,056 in one Worker.
 * smooth keeps the matching lightweight shape. No update/animation is needed.
 */
export function createNaidan(THREE,parent,{quality='balanced',reduced=false}={}){
  const entry=acquire(THREE),root=new THREE.Group();root.name='奶蛋';parent?.add(root);
  const wantsHigh=quality!=='smooth';let disposed=false,meshes=[],current=null,resolveReady;
  const state={state:'loading-lod',quality,progress:0,triangles:0,vertices:0,meshes:0,highRequested:wantsHigh,
    ready:false,static:true,reducedMotion:!!reduced,generationMs:entry.lodGenerationMs,error:null,
    dimensions:{width:2.03,height:2.225,depth:1.604},front:'+Z',groundOrigin:true};
  const ready=new Promise(resolve=>{resolveReady=resolve;});
  const stats=()=>({...state,dimensions:{...state.dimensions},sharedUsers:entry.users});
  function install(parts){if(current===parts)return;const fresh=parts.map(part=>{const mesh=new THREE.Mesh(part.geometry,entry.materials[part.material]);mesh.name=part.name;mesh.position.y=-.035;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;});for(const mesh of meshes)root.remove(mesh);meshes=fresh;current=parts;
    state.triangles=parts.reduce((n,m)=>n+m.triangles,0);state.vertices=parts.reduce((n,m)=>n+m.vertices,0);state.meshes=parts.length;}
  function refresh(){if(disposed)return;
    const done=!wantsHigh||!!entry.high||!!entry.error;
    install(wantsHigh&&entry.high?entry.high:entry.low);
    state.progress=done?100:entry.progress;state.ready=done;
    state.state=!wantsHigh?'ready-lod':entry.high?'ready-high':entry.error?'ready-lod-fallback':'generating-high';
    state.error=wantsHigh?entry.error:null;state.generationMs=entry.high&&wantsHigh?entry.generationMs:entry.lodGenerationMs;
    if(done)resolveReady(stats());
  }
  entry.listeners.add(refresh);refresh();if(wantsHigh){requestHigh(entry);refresh();}
  function dispose(){if(disposed)return;disposed=true;entry.listeners.delete(refresh);for(const mesh of meshes)root.remove(mesh);meshes=[];root.removeFromParent();
    if(--entry.users===0){entry.worker?.terminate();entry.worker=null;entry.listeners.clear();for(const part of [...entry.low,...(entry.high||[])])part.geometry.dispose();for(const mat of entry.materials)mat.dispose();cache.delete(THREE);}
    state.state='disposed';state.ready=false;state.triangles=0;state.vertices=0;state.meshes=0;resolveReady(stats());}
  return {root,stats,dispose,ready};
}
