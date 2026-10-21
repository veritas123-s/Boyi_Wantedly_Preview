import {ROOM_LAYOUT} from './room-layout.js?v=87b8be1d1b17';
import {createCarrotProp} from './avatars.js?v=62a22527fc64';
export function attachRoomActions(THREE,world,room){
 const root=new THREE.Group();root.name='Interactive seats and handheld objects';world.root.add(root);
 const geometries=new Set(),materials=new Set(),textures=new Set(),items=new Map();
 const G=g=>(geometries.add(g),g),M=m=>(materials.add(m),m);
 const leather=M(new THREE.MeshStandardMaterial({color:0x233b38,roughness:.65})),paper=M(new THREE.MeshStandardMaterial({color:0xf3e4c4,roughness:.85})),gold=M(new THREE.MeshStandardMaterial({color:0xac8a52,roughness:.3,metalness:.7}));
 const proxy=M(new THREE.MeshBasicMaterial({visible:false,transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
 function mesh(g,m,parent=root){const o=new THREE.Mesh(G(g),m);parent.add(o);return o;}
 for(const seat of ROOM_LAYOUT[room].seats){const o=mesh(new THREE.BoxGeometry(.82,1.38,.84),proxy);o.position.set(seat.x,.72,seat.z);world.interactables.push({id:'seat',seatId:seat.id,label:'坐上'+seat.label,object:o,point:new THREE.Vector3(seat.x,.85,seat.z)});}
 for(const item of ROOM_LAYOUT[room].items){const group=new THREE.Group();group.position.set(item.x,item.y,item.z);root.add(group);items.set(item.id,group);
  if(item.kind==='book'){const cover=mesh(new THREE.BoxGeometry(.3,.055,.39),leather,group),pages=mesh(new THREE.BoxGeometry(.272,.045,.366),paper,group);pages.position.y=.016;const spine=mesh(new THREE.BoxGeometry(.035,.065,.39),gold,group);spine.position.x=-.139;group.rotation.y=.18;cover.castShadow=true;}
  else{const cup=mesh(new THREE.CylinderGeometry(.082,.058,.16,24,1,true),paper,group);cup.position.y=.08;const tea=mesh(new THREE.CircleGeometry(.073,24),M(new THREE.MeshStandardMaterial({color:0x51301c,roughness:.25})),group);tea.rotation.x=-Math.PI/2;tea.position.y=.145;const handle=mesh(new THREE.TorusGeometry(.052,.013,8,20),paper,group);handle.position.set(.08,.08,0);}
  world.interactables.push({id:'item',itemId:item.id,label:item.label,object:group,point:new THREE.Vector3(item.x,item.y,item.z)});
 }
 const doors=[];
 if(room==='cottage'){
  function addPortalDoor({kind,label,x,z,rotation,target}){
   const frame=new THREE.Group();frame.name=label+' shared doorway';frame.position.set(x,0,z);frame.rotation.y=rotation;root.add(frame);
   const hinge=new THREE.Group();hinge.name=label+' single hinged leaf';hinge.position.x=-.8;frame.add(hinge);
   const leaf=mesh(new THREE.BoxGeometry(1.6,3.05,.10),leather,hinge);leaf.position.set(.8,1.525,0);leaf.receiveShadow=true;
   for(const side of[-1,1]){const jamb=mesh(new THREE.BoxGeometry(.14,3.2,.30),gold,frame);jamb.position.set(side*.88,1.6,0);}
   const header=mesh(new THREE.BoxGeometry(1.9,.14,.30),gold,frame);header.position.y=3.2;
   for(const xx of[.085,1.515]){const mould=mesh(new THREE.BoxGeometry(.025,2.78,.028),gold,hinge);mould.position.set(xx,1.53,.065);}
   for(const yy of[.18,.78,2.17,2.88]){const mould=mesh(new THREE.BoxGeometry(1.44,.026,.025),gold,hinge);mould.position.set(.8,yy,.065);}
   for(const yy of[.3,1.45,2.7]){const pin=mesh(new THREE.CylinderGeometry(.027,.18,.18,10),gold,hinge);pin.scale.x=.15;pin.scale.z=.15;pin.position.set(.015,yy,.015);}
   for(const face of[-1,1]){const knob=mesh(new THREE.SphereGeometry(.055,14,10),gold,hinge);knob.position.set(1.37,1.18,face*.13);}
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;const ctx=canvas.getContext('2d');ctx.fillStyle='#e1c997';ctx.textAlign='center';ctx.font='600 60px "Microsoft YaHei",sans-serif';ctx.fillText(label,256,100);ctx.font='22px sans-serif';ctx.fillText(kind==='cinema'?'BOYI CINEMA':'BOYI CLASSROOM',256,153);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
   for(const face of[-1,1]){const sign=mesh(new THREE.PlaneGeometry(1.22,.457),M(new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false})),hinge);sign.position.set(.8,2.0,face*.067);sign.rotation.y=face>0?0:Math.PI;}
   // Eight narrow boxes approximate the moving leaf without its former giant
   // diagonal AABB pushing a nearby visitor sideways across the doorway.
   const segments=Array.from({length:8},(_,i)=>{const c={id:kind+'-door-leaf-'+i,space:'world',minX:0,maxX:0,minZ:0,maxZ:0,minY:0,maxY:3.05};world.colliders.push(c);return c;});
   const interaction={id:kind+'-door-toggle',label:'打开'+label+'的门',object:hinge,space:'world',point:new THREE.Vector3(x,1.3,z)};world.interactables.push(interaction);
   const corners=Array.from({length:4},()=>new THREE.Vector3());let open=false,angle=0,initialized=false;
   function pose(){hinge.rotation.y=angle;hinge.updateWorldMatrix(true,true);for(let i=0;i<segments.length;i++){const c=segments[i];c.minX=c.minZ=Infinity;c.maxX=c.maxZ=-Infinity;let n=0;for(const xx of[i*.2,(i+1)*.2])for(const zz of[-.055,.055]){const v=corners[n++].set(xx,.1,zz);hinge.localToWorld(v);c.minX=Math.min(c.minX,v.x);c.maxX=Math.max(c.maxX,v.x);c.minZ=Math.min(c.minZ,v.z);c.maxZ=Math.max(c.maxZ,v.z);}}interaction.point.set(1.37,1.18,.13);hinge.localToWorld(interaction.point);}
   function setOpen(value){open=Boolean(value);interaction.label=(open?'关闭':'打开')+label+'的门';if(!initialized){initialized=true;angle=open?-Math.PI/2:0;pose();}}
   world[kind==='cinema'?'setCinemaDoor':'setClassroomDoor']=setOpen;
   const api={target,isPortal(p){return open&&angle<-.98&&p&&Math.abs(p.x-x)<.4&&Math.abs(p.z-z)<.8;},update(dt){const targetAngle=open?-Math.PI/2:0;if(Math.abs(targetAngle-angle)>.001){angle+=(targetAngle-angle)*(1-Math.exp(-Math.max(0,Math.min(.05,dt||0))*8.5));if(Math.abs(targetAngle-angle)<.001)angle=targetAngle;pose();}}};doors.push(api);pose();
  }
  addPortalDoor({kind:'cinema',label:'博医放映室',x:6,z:2.6,rotation:-Math.PI/2,target:'cinema'});
  addPortalDoor({kind:'classroom',label:'博医教室',x:-24,z:4.8,rotation:Math.PI/2,target:'classroom'});
  world.getPortal=p=>doors.find(door=>door.isPortal(p))?.target||null;
 }
 if(doors.length){const oldUpdate=world.update.bind(world);world.update=(seconds,dt=0)=>{oldUpdate(seconds,dt);for(const door of doors)door.update(dt);};}
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
 const carrot=createCarrotProp(THREE);carrot.root.scale.setScalar(.9);carrot.root.position.y=.025;root.add(carrot.root);carrot.root.visible=false;
 root.visible=false;
 return{update(kind,t,first,pose={}){const age=Number.isFinite(pose.serverTime)?(pose.serverTime-(pose.actionAt||0))/1000:10,petting=pose.action==='pet'&&age>=0&&age<.7,bonking=pose.action==='bonk'&&age>=0&&age<.35,swing=bonking?Math.sin(age/.35*Math.PI):0;root.visible=first&&(!!kind||petting);book.visible=pages.visible=kind==='book';cup.visible=kind==='cup';carrot.root.visible=kind==='carrot';root.rotation.set(petting?-.48+Math.sin(age*23)*.08:-swing*.62,-.18,petting?-.22:-swing*.12);root.position.set(.32,-.30+Math.sin(t*2)*.004+(petting?.17:swing*.10),-.66-(petting?.09:swing*.12));},getStats:()=>({visible:root.visible,carrot:carrot.root.visible&&root.visible}),dispose(){root.removeFromParent();carrot.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
