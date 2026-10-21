import { createBoyiFairy } from './scene.js?v=88fe2ad16406';
import { ROOM_LAYOUT, ROOM_ORIGINS, ROOM_BOUNDS, ROOM_PORTALS } from './room-layout.js?v=87b8be1d1b17';

/** A local, shared-geometry teaching room next to the western arcade. */
export function createClassroomScene(THREE,scene,{textures={},quality='balanced',reduced=false}={}){
 const ultra=quality==='ultra',root=new THREE.Group();root.name='Boyi classroom';scene.add(root);
 const geometries=new Set(),materials=new Set(),ownedTextures=new Set(),batches=new Map(),colliders=[],interactables=[];
 let disposed=false,doorOpen=false,externalPresentation=null;
 const G=g=>(geometries.add(g),g),M=m=>(materials.add(m),m);
 const standard=o=>M(new THREE.MeshStandardMaterial(o)),basic=o=>M(new THREE.MeshBasicMaterial(o));
 const box=G(new THREE.BoxGeometry(1,1,1)),plane=G(new THREE.PlaneGeometry(1,1)),cylinder=G(new THREE.CylinderGeometry(1,1,1,12));
 const transform=new THREE.Object3D();
 function batch(g,m,p,scale=[1,1,1],rotation=[0,0,0]){const key=g.uuid+'/'+m.uuid;let data=batches.get(key);if(!data){data={g,m,matrices:[]};batches.set(key,data);}transform.position.set(...p);transform.scale.set(...scale);transform.rotation.set(...rotation);transform.updateMatrix();data.matrices.push(transform.matrix.clone());}
 const B=(m,x,y,z,w,h,d)=>batch(box,m,[x,y,z],[w,h,d]);
 const wall=standard({color:0x8a8170,roughness:.96}),oak=standard({color:0x674c36,roughness:.8,map:ultra?null:textures.woodColor||null}),walnut=standard({color:0x352923,roughness:.8}),brass=standard({color:0xb79a63,metalness:ultra?.2:.68,roughness:.5}),felt=standard({color:0x35564d,roughness:.95}),ivory=standard({color:0xded4b8,roughness:.9});
 const glow=standard({color:0xf4d9a0,emissive:0xffc982,emissiveIntensity:.7,roughness:.7});
 function collider(id,x,z,w,d,maxY=Infinity,minY=0){colliders.push({id,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY,maxY});}
 function lettering(lines,width=1024,height=576){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#193c35';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#b09b67';ctx.lineWidth=3;ctx.strokeRect(25,25,width-50,height-50);ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>{ctx.fillStyle=i?'#d1d8c6':'#f5edcd';ctx.font=`${i?'400':'600'} ${i?35:76}px "Microsoft YaHei",sans-serif`;ctx.fillText(line,width/2,height*(i?.65:.40),width-100);});const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=ultra?1:4;ownedTextures.add(t);return t;}
 B(walnut,0,-.14,0,15.6,.22,15.1);
 for(let x=-7.3;x<7.8;x+=1)for(let z=-6.9;z<7.6;z+=1)B(oak,x,-.025,z,.98,.08,.98);
 B(wall,-7.7,3,0,.25,6,15.2);collider('classroom-west-wall',-7.7,0,.25,15.2);
 for(const z of [-7.5,7.5]){B(wall,0,3,z,15.6,6,.25);collider('classroom-wall-'+z,0,z,15.6,.25);}
 // The east opening is shared with the cottage's one physical hinged leaf.
 for(const [z,d]of[[-4.15,6.7],[4.15,6.7]]){B(wall,7.8,3,z,.25,6,d);collider('classroom-east-wall-'+z,7.8,z,.25,d);}
 B(wall,7.8,4.55,0,.25,2.9,1.6);collider('classroom-door-lintel',7.8,0,.3,1.6,6,3.1);
 B(walnut,0,6.04,0,15.6,.16,15.2);
 for(let z=-6.6;z<7;z+=2.2){B(oak,0,5.76,z,15.3,.24,.2);B(glow,0,5.6,z,5.4,.035,.15);}
 for(const x of[-7.5,7.6])for(const z of[-7.3,7.3]){B(oak,x,3,z,.23,6,.3);B(brass,x,.21,z,.36,.18,.4);}
 // Panelled walls and high shelves use a handful of root-level instances.
 for(const side of[-1,1]){
  const x=side<0?-7.51:7.62;
  for(const z of[-6.1,-3.9,3.9,6.1]){B(oak,x,1.0,z,.06,1.7,1.86);B(walnut,x-side*.035,1.0,z,.025,1.47,1.64);}
  for(const z of[-4.9,4.9]){B(oak,x-side*.12,3.8,z,.18,1.1,2.0);B(glow,x-side*.23,3.8,z,.025,.82,1.72);}
 }
 // Twenty actual seats, with independent desks and clear side aisles.
 for(const seat of ROOM_LAYOUT.classroom.seats){
  const{x,z}=seat;
  B(walnut,x,.25,z,.72,.5,.7);B(felt,x,.495,z,.70,.05,.67);
  B(oak,x,1.00,z+.28,.73,.92,.10);
  for(const dx of[-.27,.27])B(brass,x+dx,.31,z+.26,.045,.62,.045);
  B(oak,x,1.015,z-.75,1.24,.13,.66);B(felt,x,1.086,z-.75,.96,.012,.48);
  for(const dx of[-.49,.49])for(const dz of[-.22,.22])B(walnut,x+dx,.48,z-.75+dz,.055,.96,.055);
  collider(seat.id+'-seat',x,z,.73,.56,.52);
  collider(seat.id+'-back',x,z+.28,.73,.10,1.46);
  collider(seat.id+'-desk-table',x,z-.75,1.24,.66,1.092);
 }
 // A low, jumpable podium keeps the screen visible from the side entrance.
 B(walnut,0,.14,-5.55,11,.28,2.7);B(oak,0,.29,-5.55,10.9,.02,2.6);collider('classroom-lectern-platform',0,-5.55,11,2.7,.3);
 B(oak,-4.15,.9,-5.05,1.18,1.2,.78);B(brass,-4.15,1.51,-5.05,1.28,.025,.87);collider('classroom-lectern-table',-4.15,-5.05,1.28,.87,1.522);
 const ready=lettering(['博医教室','交流 · 分享 · 共同学习']);
 const screenMaterial=basic({map:ready,toneMapped:false});
 B(walnut,0,3.20,-7.29,9.98,5.665,.12);B(brass,0,3.20,-7.215,9.84,5.53,.02);
 const screen=new THREE.Mesh(plane,screenMaterial);screen.name='Classroom 16:9 presentation screen';screen.position.set(0,3.20,-7.18);screen.scale.set(9.6,5.4,1);root.add(screen);
 interactables.push({id:'classroom',label:'打开课堂课件',object:screen,point:new THREE.Vector3(0,3.20,-7.18)});
 const lecternProxy=new THREE.Mesh(box,basic({visible:false,transparent:true,opacity:0,colorWrite:false,depthWrite:false}));lecternProxy.position.set(-4.15,1.05,-5.05);lecternProxy.scale.set(1.28,1.52,.87);root.add(lecternProxy);interactables.push({id:'classroom',label:'打开课堂课件',object:lecternProxy,point:new THREE.Vector3(-4.15,1.4,-5.05)});
 let originalLogoCount=0;
 for(const[texture,x]of[[textures.schoolLogo,-6.08],[textures.boyiLogo,6.08]])if(texture){
  const image=texture.image,aspect=image?.width&&image?.height?image.width/image.height:1,w=Math.min(1.3,1.3*aspect),h=w/aspect;
  B(ivory,x,3.15,-7.20,1.6,1.6,.045);
  batch(plane,basic({map:texture,transparent:true,toneMapped:false,depthWrite:false}),[x,3.15,-7.16],[w,h,1]);originalLogoCount++;
 }
 const environment=new THREE.HemisphereLight(0xcad6d2,0x4e3928,1.6);root.add(environment);
 const downLight=new THREE.PointLight(0xffd7a4,ultra?0:85,22,2);downLight.position.set(0,5.2,-1);downLight.visible=!ultra;root.add(downLight);
 let instances=0;
 for(const b of batches.values()){const object=new THREE.InstancedMesh(b.g,b.m,b.matrices.length);b.matrices.forEach((matrix,i)=>object.setMatrixAt(i,matrix));object.instanceMatrix.needsUpdate=true;object.receiveShadow=!ultra;object.castShadow=false;object.computeBoundingSphere();root.add(object);instances+=b.matrices.length;}
 batches.clear();
 const fairy=createBoyiFairy(THREE,root,{reduced:reduced||ultra,colliders,bounds:ROOM_BOUNDS.classroom,lightEnabled:!ultra});interactables.push(fairy.interactable);
 const stats={sceneKind:'private-classroom',seatCount:20,originalLogoCount,staticInstances:instances,quality,shadowLights:0,presentationAttached:false,disposed:false};
 return{root,origin:ROOM_ORIGINS.classroom,bounds:ROOM_BOUNDS.classroom,connections:ROOM_PORTALS.classroom,connection:ROOM_PORTALS.classroom[0],colliders,interactables,stats,spawn:{x:6.6,z:0,yaw:Math.PI/2},
  setClassroomDoor(value){doorOpen=Boolean(value);},
  getPortal(p){return doorOpen&&p&&p.x>=7.78&&p.x<8.2&&Math.abs(p.z)<.8?'cottage':null;},
  setPresentationTexture(texture=null){if(disposed)return;if(texture!==null&&!texture.isTexture)throw new TypeError('课件需要Three纹理');externalPresentation=texture;screenMaterial.map=texture||ready;screenMaterial.needsUpdate=true;stats.presentationAttached=Boolean(texture);},
  setCompanionActive(active){fairy.setActive(active);environment.visible=Boolean(active);},
  setViewerPose(pose){fairy.setViewerPose(pose);},setSpriteState(state){fairy.setSpriteState(state);},
  setNightMode(night=true){environment.intensity=night?1.6:1.9;},
  update(seconds,dt=0){if(!disposed)fairy.update(seconds,dt);},
  dispose(){if(disposed)return;disposed=true;fairy.dispose();screenMaterial.map=null;externalPresentation=null;root.removeFromParent();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of ownedTextures)t.dispose();colliders.length=interactables.length=0;stats.presentationAttached=false;stats.disposed=true;}
 };
}
