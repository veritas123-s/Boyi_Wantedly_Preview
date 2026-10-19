import {ROOM_LAYOUT} from './room-layout.js?v=9528bdbc62f4';
export function attachRoomActions(THREE,world,room){
 const root=new THREE.Group();root.name='Interactive seats and handheld objects';world.root.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),items=new Map();
 const G=g=>(geometries.add(g),g),M=m=>(materials.add(m),m);
 const leather=M(new THREE.MeshStandardMaterial({color:0x233b38,roughness:.65})),paper=M(new THREE.MeshStandardMaterial({color:0xf3e4c4,roughness:.85})),gold=M(new THREE.MeshStandardMaterial({color:0xac8a52,roughness:.3,metalness:.7}));
 const proxy=M(new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
 function mesh(g,m,parent=root){const o=new THREE.Mesh(G(g),m);parent.add(o);return o;}
 for(const seat of ROOM_LAYOUT[room].seats){const o=mesh(new THREE.BoxGeometry(.82,1.38,.84),proxy);o.position.set(seat.x,.72,seat.z);world.interactables.push({id:'seat',seatId:seat.id,label:'坐上'+seat.label,object:o,point:new THREE.Vector3(seat.x,.85,seat.z)});}
 for(const item of ROOM_LAYOUT[room].items){const group=new THREE.Group();group.position.set(item.x,item.y,item.z);root.add(group);items.set(item.id,group);
  if(item.kind==='book'){const cover=mesh(new THREE.BoxGeometry(.3,.055,.39),leather,group),pages=mesh(new THREE.BoxGeometry(.272,.045,.366),paper,group);pages.position.y=.016;const spine=mesh(new THREE.BoxGeometry(.035,.065,.39),gold,group);spine.position.x=-.139;group.rotation.y=.18;cover.castShadow=true;}
  else{const cup=mesh(new THREE.CylinderGeometry(.082,.058,.16,24,1,true),paper,group);cup.position.y=.08;const tea=mesh(new THREE.CircleGeometry(.073,24),M(new THREE.MeshStandardMaterial({color:0x51301c,roughness:.25})),group);tea.rotation.x=-Math.PI/2;tea.position.y=.145;const handle=mesh(new THREE.TorusGeometry(.052,.013,8,20),paper,group);handle.position.set(.08,.08,0);}
  world.interactables.push({id:'item',itemId:item.id,label:item.label,object:group,point:new THREE.Vector3(item.x,item.y,item.z)});
 }
 let updateDoor=null;
 if(room==='cottage'){
  const door=new THREE.Group();door.name='Screening-room door frame';door.position.set(5.56,0,2.6);door.rotation.y=-Math.PI/2;root.add(door);
  // Only the leaf is raycastable. The empty doorway never blocks E targeting.
  const hinge=new THREE.Group();hinge.name='Cinema door hinged leaf';hinge.position.x=-.675;door.add(hinge);
  const panel=mesh(new THREE.BoxGeometry(1.35,2.65,.09),leather,hinge);panel.position.set(.675,1.325,0);panel.receiveShadow=true;
  for(const x of [-.75,.75]){const frame=mesh(new THREE.BoxGeometry(.14,2.87,.25),gold,door);frame.position.set(x,1.435,0);}
  const header=mesh(new THREE.BoxGeometry(1.65,.14,.25),gold,door);header.position.y=2.87;
  for(const x of [.085,1.265]){const mould=mesh(new THREE.BoxGeometry(.025,2.38,.028),gold,hinge);mould.position.set(x,1.34,.064);}
  for(const y of [.18,.7,2.04,2.52]){const mould=mesh(new THREE.BoxGeometry(1.18,.026,.025),gold,hinge);mould.position.set(.675,y,.064);}
  for(const y of [.3,1.32,2.35]){const pin=mesh(new THREE.CylinderGeometry(.027,.027,.18,10),gold,hinge);pin.position.set(.015,y,.015);}
  const knob=mesh(new THREE.SphereGeometry(.055,14,10),gold,hinge);knob.position.set(1.14,1.15,.13);
  const rose=mesh(new THREE.CylinderGeometry(.085,.085,.018,18),gold,hinge);rose.rotation.x=Math.PI/2;rose.position.set(1.14,1.15,.063);
  const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#e1c997';ctx.font='600 62px Microsoft YaHei,sans-serif';ctx.textAlign='center';ctx.fillText('博医放映室',256,100);ctx.font='22px sans-serif';ctx.fillText('BOYI CINEMA',256,153);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);
  const sign=mesh(new THREE.PlaneGeometry(1.03,.386),M(new THREE.MeshBasicMaterial({map:t,transparent:true})),hinge);sign.position.set(.675,1.88,.067);
  const darkness=M(new THREE.MeshBasicMaterial({color:0x2b1722}));const recess=mesh(new THREE.BoxGeometry(1.43,2.74,.04),darkness,door);recess.position.set(0,1.37,-1.0);
  for(const x of [-.72,.72]){const jamb=mesh(new THREE.BoxGeometry(.035,2.74,.98),leather,door);jamb.position.set(x,1.37,-.48);}
  const carpet=mesh(new THREE.BoxGeometry(1.45,.025,1.1),leather,door);carpet.position.set(0,.018,-.47);
  const soffit=mesh(new THREE.BoxGeometry(1.45,.04,1.1),leather,door);soffit.position.set(0,2.74,-.47);
  const previewSign=mesh(new THREE.PlaneGeometry(1.16,.435),M(new THREE.MeshBasicMaterial({map:t,transparent:true,toneMapped:false})),door);previewSign.position.set(0,1.73,-.965);
  for(const x of [-.59,.59]){const strip=mesh(new THREE.BoxGeometry(.024,1.8,.018),M(new THREE.MeshBasicMaterial({color:0xffc38e,toneMapped:false})),door);strip.position.set(x,1.55,-.945);}
  const interaction={id:'cinema-door-toggle',label:'打开博医放映室的门',object:hinge,point:new THREE.Vector3(5.45,1.3,2.6)};world.interactables.push(interaction);
  const blocker={minX:0,maxX:0,minZ:0,maxZ:0};world.colliders.push(blocker);
  let open=false,angle=0,initialized=false;const corners=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  function poseDoor(){hinge.rotation.y=angle;hinge.updateWorldMatrix(true,true);let i=0;blocker.minX=blocker.minZ=Infinity;blocker.maxX=blocker.maxZ=-Infinity;for(const x of [0,1.35])for(const z of [-.06,.06]){const p=corners[i++].set(x,.1,z);hinge.localToWorld(p);blocker.minX=Math.min(blocker.minX,p.x);blocker.maxX=Math.max(blocker.maxX,p.x);blocker.minZ=Math.min(blocker.minZ,p.z);blocker.maxZ=Math.max(blocker.maxZ,p.z);}interaction.point.set(1.14,1.15,.13);hinge.localToWorld(interaction.point);}
  world.setCinemaDoor=value=>{open=Boolean(value);interaction.label=open?'关闭博医放映室的门':'打开博医放映室的门';if(!initialized){initialized=true;angle=open?-1.45:0;poseDoor();}};
  world.getPortal=p=>open&&angle<-.98&&p&&p.x>5.23&&p.x<5.65&&Math.abs(p.z-2.6)<.53?'cinema':null;
  updateDoor=dt=>{const target=open?-1.45:0,step=1-Math.exp(-Math.max(0,Math.min(.05,dt||0))*8.5);if(Math.abs(target-angle)>.001){angle+=(target-angle)*step;if(Math.abs(target-angle)<.001)angle=target;poseDoor();}};
  poseDoor();
 }
 if(updateDoor){const oldUpdate=world.update.bind(world);world.update=(seconds,dt=0)=>{oldUpdate(seconds,dt);updateDoor(dt);};}
 const oldDispose=world.dispose.bind(world);let disposed=false;
 world.dispose=()=>{if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());oldDispose();};
 world.setOccupants=occupants=>{const held=new Set(occupants.map(p=>p.heldItemId).filter(Boolean));for(const [id,o]of items)o.visible=!held.has(id);};
 return world;
}
export function createFirstPersonHands(THREE,camera){
 const root=new THREE.Group();root.name='First person held object';root.position.set(.32,-.30,-.66);camera.add(root);
 const geometries=[],materials=[];
 function add(g,color,x,y,z){geometries.push(g);const m=new THREE.MeshStandardMaterial({color,roughness:.7});materials.push(m);const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);root.add(mesh);return mesh;}
 const book=add(new THREE.BoxGeometry(.20,.27,.045),0x38635a,0,.02,0),pages=add(new THREE.BoxGeometry(.18,.25,.048),0xf3e5c4,0,.02,.005),cup=add(new THREE.CylinderGeometry(.062,.043,.14,20),0xf8f2df,0,.02,0);
 const sleeve=add(new THREE.CylinderGeometry(.045,.057,.23,14),0xeee5dc,.045,-.21,.02);sleeve.rotation.z=.22;add(new THREE.SphereGeometry(.048,14,10),0xedc29e,.02,-.1,.016);
 root.visible=false;
 return{update(kind,t,first){root.visible=first&&!!kind;book.visible=pages.visible=kind==='book';cup.visible=kind==='cup';root.rotation.y=-.18;root.position.y=-.30+Math.sin(t*2)*.004;},dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
