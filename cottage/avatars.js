// Original lightweight 3D characters, with reference-inspired owner styling.
import { createNaidan } from './naidan.js?v=6c17b37b7837';
const avatarMetrics=Object.freeze({human:Object.freeze({height:1.65,radius:.31,eyeHeight:1.65,seatedEyeHeight:1.30}),naidan:Object.freeze({height:.90,radius:.42,eyeHeight:.70,seatedEyeHeight:1.25})});
export function getAvatarMetrics(avatarId){return avatarId==='naidan'?avatarMetrics.naidan:avatarMetrics.human;}
function createSpeakingIndicator(THREE,parent,height){
 const root=new THREE.Group();root.name='Speaking indicator';root.position.y=height;root.visible=false;parent.add(root);
 const material=new THREE.MeshBasicMaterial({color:0x83e4bb,depthWrite:false}),geometry=new THREE.BoxGeometry(.035,1,.025),bars=[];
 for(let i=0;i<3;i++){const bar=new THREE.Mesh(geometry,material);bar.position.x=(i-1)*.055;root.add(bar);bars.push(bar);}
 const inverse=new THREE.Quaternion();return{root,update(t,camera,pose,heightOverride=height){root.visible=typeof pose.speaking==='boolean'?pose.speaking:!!pose.voiceEnabled&&Number.isFinite(pose.speakingUntil)&&pose.speakingUntil>(pose.serverTime||Date.now());root.position.y=heightOverride;if(!root.visible)return;for(let i=0;i<bars.length;i++)bars[i].scale.y=.075+Math.abs(Math.sin(t*9+i*1.4))*.075;if(camera){inverse.copy(parent.quaternion).invert();root.quaternion.copy(camera.quaternion).premultiply(inverse);}},dispose(){root.removeFromParent();geometry.dispose();material.dispose();}};
}
const contactShadowCache=new WeakMap();
function acquireContactShadow(THREE){
 let entry=contactShadowCache.get(THREE);
 if(!entry){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,8,64,64,62);gradient.addColorStop(0,'rgba(12,13,12,.46)');gradient.addColorStop(.42,'rgba(12,13,12,.25)');gradient.addColorStop(.77,'rgba(12,13,12,.075)');gradient.addColorStop(1,'rgba(12,13,12,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);entry={texture:new THREE.CanvasTexture(canvas),users:0};contactShadowCache.set(THREE,entry);}
 entry.users++;return{texture:entry.texture,release(){if(--entry.users===0){entry.texture.dispose();contactShadowCache.delete(THREE);}}};
}
export const avatarPresets=[
 {id:'scholar-amber',label:'琥珀',coat:0xd8a754,hair:0x87412d,style:'braid'},
 {id:'scholar-blue',label:'海盐',coat:0x799cba,hair:0xd4c8b6,style:'short'},
 {id:'scholar-sage',label:'青岚',coat:0x83a993,hair:0x353b32,style:'curl'},
 {id:'scholar-plum',label:'星禾',coat:0xc8a298,hair:0x77594b,style:'bob'},
 {id:'scholar-rose',label:'朝露',coat:0xd499a2,hair:0x4a3233,style:'bun'},
 {id:'scholar-slate',label:'云杉',coat:0x91a4a6,hair:0x404f5d,style:'glasses'},
 {id:'naidan',label:'奶蛋',coat:0xe9b82d,hair:0x789841,style:'naidan'}
];
// Shared geometry for a carried carrot. The tapered orange body and green
// leaves remain readable in first person and beside the static Naidan model.
export function createCarrotProp(THREE){
 const root=new THREE.Group();root.name='Carrot';const geometries=[],materials=[];
 const orange=new THREE.MeshStandardMaterial({color:0xed852d,roughness:.72}),green=new THREE.MeshStandardMaterial({color:0x5b9446,roughness:.76});materials.push(orange,green);
 const bodyGeometry=new THREE.ConeGeometry(.078,.39,14),leafGeometry=new THREE.SphereGeometry(1,10,8);geometries.push(bodyGeometry,leafGeometry);
 const body=new THREE.Mesh(bodyGeometry,orange);body.rotation.z=Math.PI;body.castShadow=true;root.add(body);
 for(let i=-1;i<=1;i++){const leaf=new THREE.Mesh(leafGeometry,green);leaf.position.set(i*.035,.245,0);leaf.scale.set(.021,.115,.035);leaf.rotation.z=-i*.38;leaf.castShadow=true;root.add(leaf);}
 let disposed=false;return{root,dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
export function createAvatar(THREE,{avatarId='visitor',variant=0,name='访客',quality='balanced'}={}){
 if(avatarId==='naidan')return createNaidanAvatar(THREE,{name,quality:quality==='ultra'?'smooth':quality});
 const owner=avatarId==='zhang-jiayu',preset=avatarPresets.find(p=>p.id===avatarId)||{coat:0x9aafac,hair:0x52483c,style:'short'};
 const root=new THREE.Group(),shape=new THREE.Group();root.add(shape);root.name='avatar';
 const geometries=[],materials=[],textures=[],bins=new Map(),customMeshes=[],temporary=new THREE.Object3D();
 const rig={},origins=new Map([[shape,new THREE.Vector3()]]);let part=shape;
 function joint(name,parent,worldOrigin){const group=new THREE.Group();group.name=name;const origin=new THREE.Vector3(...worldOrigin);group.position.copy(origin).sub(origins.get(parent));parent.add(group);origins.set(group,origin);rig[name]=group;return group;}
 function withPart(target,build){const previous=part;part=target;try{build();}finally{part=previous;}}
 const leftArm=joint('leftArm',shape,[-.225,.89,0]),rightArm=joint('rightArm',shape,[.225,.89,0]);

 const G=g=>(geometries.push(g),g),material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.72,...extra});materials.push(m);return m;};
 let seed=Number.isInteger(variant)?variant:0;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const coat=material(owner?0xf0ece7:preset.coat),shirt=material(owner?0x633a71:0xe9e2cf),pants=material(owner?0x594063:0x344148),shoes=material(owner?0x332f39:0x313433),hair=material(owner?0x30233d:preset.hair,{flatShading:true}),skin=material(0xeec49f),iris=material(owner?0x61446e:0x3b4a49),pupil=material(owner?0x302237:0x24312f),white=material(0xfffaf0),metal=material(0xbabdbb,{roughness:.32,metalness:.7}),accent=material(owner?0x795185:0xc5ae75),tube=material(0x33343d,{roughness:.58}),glass=material(0xc4dce5,{roughness:.13,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}),liquid=material(0x9254bb,{roughness:.26,transparent:true,opacity:.86});
 if(!owner&&variant){const c=new THREE.Color(preset.coat);c.offsetHSL((random()-.5)*.055,(random()-.5)*.1,(random()-.5)*.13);coat.color.copy(c);}
 const sphere=G(new THREE.SphereGeometry(1,18,12)),softSphere=G(new THREE.SphereGeometry(1,12,10)),box=G(new THREE.BoxGeometry(1,1,1)),cylinder=G(new THREE.CylinderGeometry(1,1,1,16));
 function add(geometry,mat,pos,scale,rotation=[0,0,0]){const key=part.uuid+geometry.uuid+mat.uuid;if(!bins.has(key))bins.set(key,{owner:part,geometry,mat,matrices:[]});temporary.position.set(...pos).sub(origins.get(part));temporary.scale.set(...scale);temporary.rotation.set(...rotation);temporary.updateMatrix();bins.get(key).matrices.push(temporary.matrix.clone());}
 const S=(mat,x,y,z,w,h=w,d=w)=>add(sphere,mat,[x,y,z],[w,h,d]);
 const B=(mat,x,y,z,w,h,d,rotation=[0,0,0])=>add(box,mat,[x,y,z],[w,h,d],rotation);
 function direct(g,m,pos=[0,0,0],rotation=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.rotation.set(...rotation);o.castShadow=true;o.receiveShadow=true;o.userData.owner=part;o.position.sub(origins.get(part));customMeshes.push(o);return o;}
 function polygon(points,depth,mat,z,bevel=.006){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();return direct(G(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelSegments:1,bevelThickness:bevel,bevelSize:bevel,curveSegments:1,steps:1})),mat,[0,0,z]);}
 function rod(a,b,r,mat){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);const key=part.uuid+cylinder.uuid+mat.uuid;if(!bins.has(key))bins.set(key,{owner:part,geometry:cylinder,mat,matrices:[]});temporary.position.copy(from.add(to).multiplyScalar(.5)).sub(origins.get(part));temporary.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());temporary.scale.set(r,delta.length(),r);temporary.updateMatrix();bins.get(key).matrices.push(temporary.matrix.clone());}
 function curve(points,r,mat){return direct(G(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),28,r,6,false)),mat);}
 function arm(side,elbow,hand){withPart(side<0?leftArm:rightArm,()=>{const shoulder=[side*.225,.89,0];rod(shoulder,elbow,.073,coat);S(coat,...elbow,.077);rod(elbow,hand,.064,coat);S(skin,...hand,.058,.068,.052);});}
 // A shaped face, visible sclera, coloured irises and a soft smile.
 add(softSphere,skin,[0,1.205,0],[.245,.268,.218]);S(skin,-.244,1.18,0,.037,.064,.039);S(skin,.244,1.18,0,.037,.064,.039);
 for(const side of [-1,1]){S(white,side*.091,1.225,.192,.071,.082,.02);S(iris,side*.091,1.218,.211,.049,.062,.014);S(pupil,side*.09,1.218,.224,.023,.046,.006);S(white,side*.09-.014,1.246,.23,.013,.017,.005);S(white,side*.09+.016,1.204,.232,.005,.007,.004);B(hair,side*.094,1.326,.191,.092,.016,.012,[0,0,side*-.17]);}
 polygon([[-.016,1.172],[.012,1.15],[.017,1.177]],.019,skin,.214,.002);
 curve([[-.057,1.102,.193],[-.026,1.095,.211],[.015,1.101,.214],[.054,1.117,.197]],.0045,material(0x9c564c));
 S(hair,0,1.375,-.045,.259,.156,.222);
 const style=owner?'owner':preset.style;
 if(owner){
   // Layered asymmetrical locks lie over the scalp, not a ring of upright cones.
   polygon([[-.24,1.36],[-.13,1.49],[.015,1.425],[.09,1.268],[.012,1.323],[-.043,1.246],[-.105,1.37],[-.188,1.3]],.052,hair,.132,.002);
   polygon([[.005,1.435],[.13,1.477],[.245,1.357],[.203,1.195],[.15,1.288],[.115,1.255]],.073,hair,.123,.003);
   polygon([[-.255,1.36],[-.16,1.405],[-.214,1.156],[-.267,1.218]],.087,hair,.065,.002);
   polygon([[-.245,1.414],[-.155,1.53],[-.032,1.494],[-.112,1.434]],.15,hair,-.067,.002);
   polygon([[-.105,1.47],[.027,1.556],[.161,1.503],[.081,1.441]],.17,hair,-.11,.002);
   polygon([[.087,1.458],[.216,1.515],[.276,1.415],[.188,1.369]],.14,hair,-.087,.002);
   polygon([[.223,1.38],[.284,1.336],[.25,1.228],[.207,1.265]],.1,hair,-.055,.002);
 }else if(style==='braid'){
   S(hair,-.15,1.405,.13,.15,.08,.078);S(hair,.115,1.397,.14,.12,.075,.07);
   for(let i=0;i<6;i++)S(hair,-.232+Math.sin(i*2.1)*.018,1.22-i*.072,-.014,.068-i*.004,.053,.053);
   S(accent,-.237,.82,-.01,.052,.022,.026);
 }else if(style==='bun'){
   S(hair,.145,1.498,-.09,.122,.115,.106);S(hair,-.1,1.413,.135,.17,.065,.067);
   add(cylinder,accent,[.154,1.497,-.087],[.129,.015,.111],[0,0,.13]);
 }else if(style==='curl'){
   for(let i=0;i<9;i++){const a=i/9*Math.PI*2;S(hair,Math.cos(a)*.183,1.395+Math.sin(i)*.025,Math.sin(a)*.145,.087,.072,.078);}
 }else if(style==='bob'){
   S(hair,-.225,1.226,-.07,.078,.205,.135);S(hair,.225,1.226,-.07,.078,.205,.135);
   polygon([[-.205,1.417],[.19,1.42],[.16,1.325],[.035,1.34],[-.04,1.3],[-.18,1.33]],.046,hair,.146,.004);
 }else{
   polygon([[-.21,1.4],[-.055,1.46],[.16,1.4],[.185,1.323],[.06,1.35],[-.065,1.294],[-.16,1.33]],.059,hair,.14,.003);
 }
 // Common underlying torso and boots are covered by distinct outer garments.
 B(shirt,0,.768,0,.31,.43,.2);S(skin,0,.986,.01,.069,.075,.062);
 for(const side of [-1,1]){const leg=joint(side<0?'leftLeg':'rightLeg',shape,[side*.09,.52,0]);const knee=joint(side<0?'leftKnee':'rightKnee',leg,[side*.09,.30,0]);withPart(leg,()=>B(pants,side*.09,.41,0,.13,.22,.15));withPart(knee,()=>{B(pants,side*.09,.20,0,.13,.22,.15);S(shoes,side*.09,.098,.045,.095,.07,.15);});}

 if(owner){
   polygon([[-.224,.985],[-.071,.984],[-.031,.755],[-.05,.393],[-.18,.325],[-.288,.366],[-.245,.705]],.125,coat,-.043,.008);
   polygon([[.071,.984],[.224,.985],[.245,.705],[.286,.357],[.172,.332],[.044,.39],[.032,.755]],.125,coat,-.043,.008);
   B(coat,0,.663,-.071,.398,.569,.103);
   polygon([[-.078,1.005],[-.19,.944],[-.088,.783],[-.035,.91]],.024,white,.101,.004);
   polygon([[.078,1.005],[.19,.944],[.088,.783],[.035,.91]],.024,white,.101,.004);
   for(const side of [-1,1])B(coat,side*.177,.595,.104,.083,.105,.021,[0,0,side*.07]);
   arm(-1,[-.344,.758,.035],[-.389,1.038,.178]);arm(1,[.345,.693,.07],[.165,.686,.29]);
   withPart(leftArm,()=>{for(let i=0;i<3;i++)S(skin,-.404+i*.018,1.041,.208,.014,.041,.014);
   // The purple liquid is visibly inside an open, rounded glass tube.
   add(cylinder,glass,[-.39,1.18,.201],[.025,.255,.025],[0,0,-.14]);S(glass,-.373,1.054,.201,.025,.023,.025);
   add(cylinder,liquid,[-.382,1.126,.202],[.019,.127,.019],[0,0,-.14]);S(liquid,-.373,1.063,.202,.019,.018,.019);
   const tubeRim=G(new THREE.TorusGeometry(.025,.0025,6,20));add(tubeRim,glass,[-.407,1.307,.201],[1,1,1],[Math.PI/2,0,-.14]);
   });
   withPart(rightArm,()=>{B(accent,.188,.748,.219,.245,.325,.025,[0,0,-.12]);B(white,.19,.751,.236,.214,.29,.008,[0,0,-.12]);B(metal,.206,.906,.246,.079,.022,.012,[0,0,-.12]);
   for(let i=0;i<3;i++)S(skin,.164+i*.017,.687,.299,.014,.027,.011);
   for(let i=0;i<4;i++)B(metal,.188,.819-i*.031,.243,.132,.003,.002,[0,0,-.12]);
   });
   curve([[-.097,.974,.16],[-.145,.866,.172],[-.142,.724,.181],[-.072,.655,.195],[.009,.69,.201],[.028,.798,.184]],.009,tube);
   curve([[.097,.974,.16],[.136,.876,.174],[.122,.79,.196],[.071,.752,.205]],.009,tube);
   S(metal,.071,.745,.219,.034,.034,.014);S(tube,.071,.745,.232,.025,.025,.007);
   for(const side of [-1,1]){rod([side*.096,.98,.16],[side*.133,.92,.175],.006,metal);S(metal,side*.095,.982,.163,.014,.014,.012);}
 }else{
   const garments={braid:'waistcoat',short:'cape',curl:'hood',bob:'dress',bun:'robe',glasses:'vest'},garment=garments[style]||'jacket';
   if(garment==='hood'){
     polygon([[-.25,.98],[-.09,1.007],[.09,1.007],[.25,.98],[.32,.47],[.2,.412],[-.2,.412],[-.32,.47]],.17,coat,-.09,.012);
     S(coat,0,1.06,-.16,.243,.26,.115);B(accent,-.015,.86,.118,.038,.06,.015);rod([-.23,.96,.12],[.23,.61,.155],.017,material(0x77533b));B(accent,.25,.54,.13,.18,.19,.08);
   }else if(garment==='dress'){
     polygon([[-.2,.97],[.2,.97],[.17,.71],[.32,.319],[-.32,.319],[-.17,.71]],.2,coat,-.08,.012);
     B(accent,0,.697,.137,.36,.032,.022);S(accent,0,.695,.16,.031,.035,.009);
     S(coat,-.031,1.52,-.015,.277,.068,.231);S(accent,.17,1.534,.02,.052,.018,.045);
   }else if(garment==='cape'||garment==='robe'){
     polygon([[-.08,1.02],[-.26,.962],[-.35,.61],[-.24,.47],[0,.53],[.24,.47],[.35,.61],[.26,.962],[.08,1.02]],.16,coat,-.07,.011);
     B(accent,0,.943,.124,.06,.034,.02);B(shirt,0,.689,.12,.24,.257,.04);
     if(garment==='cape'){S(coat,.015,1.52,-.035,.278,.064,.239);polygon([[-.07,.97],[.07,.97],[.06,.8],[-.06,.71]],.035,accent,.12,.006);}
     else{polygon([[-.2,.985],[-.03,1.02],[.03,.94],[-.09,.81]],.031,accent,.12,.004);S(accent,.105,.938,.148,.047,.045,.02);}
   }else{
     const hem=garment==='waistcoat'?.43:.55;
     for(const side of [-1,1])polygon([[side*.04,.98],[side*.22,.966],[side*.236,hem],[side*.08,hem-.04]],.13,coat,-.035,.01);
     B(coat,0,(.98+hem)/2,-.08,.39,.98-hem,.095);
     for(const side of [-1,1])polygon([[side*.06,.994],[side*.15,.934],[side*.075,.813]],.02,white,.113,.003);
     if(garment==='vest')B(accent,0,.893,.13,.038,.15,.024);
   }
   arm(-1,[-.267,.73,0],[-.28,.546,.04]);arm(1,[.267,.73,0],[.28,.546,.04]);
   for(let i=0;i<3;i++)S(accent,.031,.852-i*.081,.143,.009,.009,.005);
   if(garment==='waistcoat')withPart(leftArm,()=>{add(cylinder,paperMaterial(),[-.31,.621,.101],[.035,.25,.035],[0,0,-.1]);});
   if(garment==='cape'||garment==='dress')withPart(rightArm,()=>{B(accent,.258,.619,.116,.164,.21,.045,[0,0,-.13]);B(white,.258,.621,.142,.14,.18,.008,[0,0,-.13]);});
   if(style==='glasses'){
     const lensMaterial=material(0xb6cfda,{transparent:true,opacity:.045,depthWrite:false,roughness:.2}),frame=G(new THREE.TorusGeometry(.051,.0035,6,28));
     for(const side of [-1,1]){add(frame,metal,[side*.091,1.221,.24],[1,1.12,1]);S(lensMaterial,side*.091,1.221,.238,.046,.052,.003);rod([side*.14,1.239,.239],[side*.229,1.246,.058],.003,metal);}
     rod([-.039,1.234,.241],[.039,1.234,.241],.003,metal);
   }
   const proportions={braid:[1.02,1.02,1],short:[.96,.96,1],curl:[1.04,1.035,1],bob:[.94,.99,1],bun:[.98,.95,1],glasses:[.96,1.055,1]};shape.scale.set(...(proportions[style]||[1,1,1]));
 }
 function paperMaterial(){return material(0xdacdb0);}
 // Static tailored panels and hair locks share one draw per material. No
 // per-frame geometry upload or shadow rebake is needed when a guest walks.
 const merged=new Map(),point=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
 for(const mesh of customMeshes){mesh.updateMatrix();normalMatrix.getNormalMatrix(mesh.matrix);const source=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry,positions=source.attributes.position,normals=source.attributes.normal,uv=source.attributes.uv,key=mesh.userData.owner.uuid+mesh.material.uuid;if(!merged.has(key))merged.set(key,{owner:mesh.userData.owner,material:mesh.material,p:[],n:[],uv:[]});const data=merged.get(key);for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrix);normal.fromBufferAttribute(normals,i).applyNormalMatrix(normalMatrix);data.p.push(point.x,point.y,point.z);data.n.push(normal.x,normal.y,normal.z);data.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);}if(source!==mesh.geometry)source.dispose();}
 for(const data of merged.values()){const g=G(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(data.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(data.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));const mesh=new THREE.Mesh(g,data.material);mesh.castShadow=true;mesh.receiveShadow=true;data.owner.add(mesh);}
 for(const {owner,geometry,mat,matrices}of bins.values()){const o=new THREE.InstancedMesh(geometry,mat,matrices.length);matrices.forEach((m,i)=>o.setMatrixAt(i,m));o.instanceMatrix.needsUpdate=true;o.castShadow=true;o.receiveShadow=true;o.computeBoundingSphere();owner.add(o);}
 const canvas=document.createElement('canvas'),labelName=String(name).slice(0,18);canvas.height=96;let context=canvas.getContext('2d');context.font='500 30px Microsoft YaHei,sans-serif';canvas.width=Math.min(600,Math.max(128,Math.ceil(context.measureText(labelName).width)+44));context=canvas.getContext('2d');context.fillStyle='rgba(22,28,28,.48)';context.beginPath();context.roundRect(4,8,canvas.width-8,80,18);context.fill();context.font='500 30px Microsoft YaHei,sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillStyle='#eee2c9';context.fillText(labelName,canvas.width/2,48);const labelTexture=new THREE.CanvasTexture(canvas);textures.push(labelTexture);labelTexture.colorSpace=THREE.SRGBColorSpace;const labelMat=new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide});materials.push(labelMat);const labelWidth=Math.min(.96,Math.max(.38,canvas.width/470));const labelMesh=new THREE.Mesh(G(new THREE.PlaneGeometry(labelWidth,.17)),labelMat),labelWorldPosition=new THREE.Vector3();labelMesh.position.y=1.83;root.add(labelMesh);
 const contact=acquireContactShadow(THREE),shadowMaterial=new THREE.MeshBasicMaterial({map:contact.texture,transparent:true,depthWrite:false,opacity:.72,polygonOffset:true,polygonOffsetFactor:-1});materials.push(shadowMaterial);const shadow=new THREE.Mesh(G(new THREE.PlaneGeometry(.84,.67)),shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.037;shadow.renderOrder=1;root.add(shadow);
 const held=new THREE.Group();held.name='Carried object';held.position.set(owner?-.06:.055,owner?-.20:-.34,.20);rightArm.add(held);
 const bookCover=new THREE.Mesh(G(new THREE.BoxGeometry(.20,.27,.055)),accent);held.add(bookCover);const pages=new THREE.Mesh(G(new THREE.BoxGeometry(.176,.246,.06)),white);pages.position.z=.006;held.add(pages);
 const cup=new THREE.Mesh(G(new THREE.CylinderGeometry(.065,.045,.13,20)),white);cup.position.y=.05;held.add(cup);const handle=new THREE.Mesh(G(new THREE.TorusGeometry(.046,.012,6,16)),white);handle.position.set(.062,.055,0);held.add(handle);held.visible=false;
 const carrot=createCarrotProp(THREE);carrot.root.position.y=.035;held.add(carrot.root);carrot.root.visible=false;
 const speaking=createSpeakingIndicator(THREE,root,2.02);
 let disposed=false;

 return{root,setPose(x,z,yaw,dt=.016){const f=1-Math.exp(-dt*12);root.position.x+=(x-root.position.x)*f;root.position.z+=(z-root.position.z)*f;const diff=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y));root.rotation.y+=diff*f;},update(t,camera,moving=false,pose={}){
  const seated=!!pose.seatId,age=Number.isFinite(pose.serverTime)?(pose.serverTime-(pose.actionAt||0))/1000:10,walking=moving&&!seated,phase=t*(pose.running?11:8),step=walking?Math.sin(phase)*.55:0;
  shape.position.y=seated?(pose.seatHeight||.55)-.52:walking?Math.abs(Math.sin(phase))*.018:0;
  rig.leftLeg.rotation.x=seated?-Math.PI/2:step;rig.rightLeg.rotation.x=seated?-Math.PI/2:-step;
  rig.leftKnee.rotation.x=seated?Math.PI/2:Math.max(0,-step)*.75;rig.rightKnee.rotation.x=seated?Math.PI/2:Math.max(0,step)*.75;
  leftArm.rotation.set(seated?-.18:-step*.52,0,0);rightArm.rotation.set(seated?-.18:step*.52,0,0);
  if(pose.action==='wave'&&age>=0&&age<2){rightArm.rotation.z=2.5+Math.sin(age*16)*.20;rightArm.rotation.x=-.3;}
  const heldKind=pose.equippedItemId==='carrot'?'carrot':pose.heldKind;
  held.visible=!!heldKind;bookCover.visible=pages.visible=heldKind==='book';cup.visible=handle.visible=heldKind==='cup';carrot.root.visible=heldKind==='carrot';
  if(held.visible)rightArm.rotation.x=-.8;
  if(pose.action==='pet'&&age>=0&&age<.7){rightArm.rotation.x=-1.9+Math.sin(age*23)*.13;rightArm.rotation.z=-.3;}
  if(pose.action==='bonk'&&age>=0&&age<.35){rightArm.rotation.x=-1.45+Math.sin(age/.35*Math.PI)*.95;rightArm.rotation.z=-.16;}
  if(pose.action==='pickup'&&age>=0&&age<.65)rightArm.rotation.x=-Math.sin(age/.65*Math.PI)*.9;
  shadow.visible=!seated&&(pose.jumpHeight||0)<.08;speaking.update(t,camera,pose);
  labelMesh.getWorldPosition(labelWorldPosition);labelMesh.visible=labelWorldPosition.distanceTo(camera.position)>1.15;labelMesh.scale.setScalar(Math.max(.55,Math.min(1,labelWorldPosition.distanceTo(camera.position)/2.8)));labelMesh.quaternion.copy(camera.quaternion);labelMesh.quaternion.premultiply(root.quaternion.clone().invert());
 },getMetrics:()=>getAvatarMetrics(avatarId),getRigPose:()=>({leftLeg:rig.leftLeg.rotation.x,rightLeg:rig.rightLeg.rotation.x,leftKnee:rig.leftKnee.rotation.x,rightArm:rightArm.rotation.x,held:held.visible,carrot:carrot.root.visible}),dispose(){if(disposed)return;disposed=true;root.removeFromParent();speaking.dispose();carrot.dispose();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());contact.release();}};
}

function createNaidanAvatar(THREE,{name='奶蛋',quality='balanced'}={}){
 const root=new THREE.Group();root.name='avatar';const metrics=getAvatarMetrics('naidan'),scale=metrics.height/2.225,model=createNaidan(THREE,root,{quality});model.root.scale.setScalar(scale);
 const canvas=document.createElement('canvas'),text=String(name).slice(0,18);canvas.height=96;let context=canvas.getContext('2d');context.font='500 30px Microsoft YaHei,sans-serif';canvas.width=Math.min(600,Math.max(128,Math.ceil(context.measureText(text).width)+44));context=canvas.getContext('2d');context.fillStyle='rgba(22,28,28,.48)';context.beginPath();context.roundRect(4,8,canvas.width-8,80,18);context.fill();context.font='500 30px Microsoft YaHei,sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillStyle='#eee2c9';context.fillText(text,canvas.width/2,48);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});const geometry=new THREE.PlaneGeometry(Math.min(.96,Math.max(.38,canvas.width/470)),.17);const label=new THREE.Mesh(geometry,material);label.position.y=metrics.height+.18;root.add(label);const world=new THREE.Vector3(),inverse=new THREE.Quaternion();let disposed=false;
 const contact=acquireContactShadow(THREE),shadowGeometry=new THREE.PlaneGeometry(.90,.72),shadowMaterial=new THREE.MeshBasicMaterial({map:contact.texture,transparent:true,depthWrite:false,opacity:.72,polygonOffset:true,polygonOffsetFactor:-1});const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.037;shadow.renderOrder=1;root.add(shadow);
 const hand=new THREE.Group();hand.name='Naidan side hand and prop';hand.position.set(.40,.43,.12);hand.scale.setScalar(.75);root.add(hand);
 const handGeometry=new THREE.SphereGeometry(.075,12,10),handMaterial=new THREE.MeshStandardMaterial({color:0xf0ca6b,roughness:.75}),palm=new THREE.Mesh(handGeometry,handMaterial);hand.add(palm);
 const carrot=createCarrotProp(THREE);carrot.root.position.set(.025,.12,.035);hand.add(carrot.root);hand.visible=false;
 const speaking=createSpeakingIndicator(THREE,root,metrics.height+.36);
 return {root,ready:model.ready,setPose(x,z,yaw,dt=.016){const f=1-Math.exp(-dt*12);root.position.x+=(x-root.position.x)*f;root.position.z+=(z-root.position.z)*f;const diff=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y));root.rotation.y+=diff*f;},
  update(t,camera,moving=false,pose={}){if(disposed)return;/* Static body: seating translates it; only the separate side hand/prop expresses social actions. */const seat=pose.seatId?(pose.seatHeight||.55):0;model.root.position.y=seat;label.position.y=metrics.height+.18+seat;speaking.update(t,camera,pose,metrics.height+.36+seat);const age=(Number.isFinite(pose.serverTime)?pose.serverTime-(pose.actionAt||0):10000)/1000,petting=pose.action==='pet'&&age>=0&&age<.7,bonking=pose.action==='bonk'&&age>=0&&age<.35,waving=pose.action==='wave'&&age>=0&&age<2;carrot.root.visible=pose.heldKind==='carrot'||pose.equippedItemId==='carrot';hand.visible=carrot.root.visible||petting||bonking||waving;hand.position.set(.40,(petting?.72:.43)+seat,.12);hand.rotation.set(bonking?Math.sin(age/.35*Math.PI)*1.1:0,0,petting?Math.sin(age*22)*.16:waving?.5+Math.sin(age*16)*.22:0);shadow.visible=!pose.seatId&&(pose.jumpHeight||0)<.08;if(camera){label.getWorldPosition(world);const d=world.distanceTo(camera.position);label.visible=d>1.15;label.scale.setScalar(Math.max(.55,Math.min(1,d/2.8)));inverse.copy(root.quaternion).invert();label.quaternion.copy(camera.quaternion).premultiply(inverse);}},
  getMetrics:()=>metrics,getRigPose:()=>({leftLeg:0,rightLeg:0,leftKnee:0,rightArm:0,held:carrot.root.visible,carrot:carrot.root.visible,sideHand:hand.visible}),getModelStats:()=>({...model.stats(),renderedDimensions:{width:2.03*scale,height:metrics.height,depth:1.604*scale},collisionRadius:metrics.radius}),
  dispose(){if(disposed)return;disposed=true;speaking.dispose();carrot.dispose();handGeometry.dispose();handMaterial.dispose();model.dispose();geometry.dispose();material.dispose();texture.dispose();shadowGeometry.dispose();shadowMaterial.dispose();contact.release();root.removeFromParent();}};
}
