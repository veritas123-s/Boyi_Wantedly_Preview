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
 if(room==='cottage'){
  const door=new THREE.Group();door.name='Door to the screening room';door.position.set(5.63,0,2.6);door.rotation.y=-Math.PI/2;root.add(door);
  const panel=mesh(new THREE.BoxGeometry(1.35,2.65,.08),leather,door);panel.position.y=1.325;for(const x of [-.72,.72]){const frame=mesh(new THREE.BoxGeometry(.09,2.77,.16),gold,door);frame.position.set(x,1.385,0);}const header=mesh(new THREE.BoxGeometry(1.53,.09,.16),gold,door);header.position.y=2.77;
  const knob=mesh(new THREE.SphereGeometry(.055,14,10),gold,door);knob.position.set(.48,1.15,.10);
  const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#e1c997';ctx.font='600 62px Microsoft YaHei,sans-serif';ctx.textAlign='center';ctx.fillText('放映室',256,106);ctx.font='22px sans-serif';ctx.fillText('BOYI CINEMA',256,156);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);const sign=mesh(new THREE.PlaneGeometry(1.0,.375),M(new THREE.MeshBasicMaterial({map:t,transparent:true})),door);sign.position.set(0,1.92,.055);
  world.interactables.push({id:'cinema-door',label:'进入放映室',object:door,point:new THREE.Vector3(5.45,1.3,2.6)});
 }
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
