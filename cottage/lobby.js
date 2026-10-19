import { createBoyiFairy } from './scene.js?v=a446a1c46f7e';

/** Public, fully modelled reception hall. Membership decisions belong to app. */
export function createLobbyScene(THREE, scene, {textures={},quality='balanced',reduced=false}={}) {
  const root=new THREE.Group();root.name='Boyi public reception hall';scene.add(root);
  const geometries=new Set(),materials=new Set(),ownedTextures=new Set(),batches=new Map(),colliders=[],interactables=[];
  let disposed=false,seed=0x6817b09e;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;},range=(a,b)=>a+(b-a)*random();
  const G=g=>(geometries.add(g),g),M=m=>(materials.add(m),m),standard=o=>M(new THREE.MeshStandardMaterial(o)),basic=o=>M(new THREE.MeshBasicMaterial(o));
  const box=G(new THREE.BoxGeometry(1,1,1)),sphere=G(new THREE.SphereGeometry(1,16,12)),cylinder=G(new THREE.CylinderGeometry(1,1,1,16)),ring=G(new THREE.TorusGeometry(1,.045,8,48)),temporary=new THREE.Object3D();
  const canvasTexture=(size,draw,color=true)=>{const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(size,size):document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d'),size);const t=new THREE.CanvasTexture(canvas);if(color)t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;ownedTextures.add(t);return t;};
  const source=(t,fallback=null)=>{if(!t)return fallback;const clone=t.clone();clone.needsUpdate=true;clone.wrapS=clone.wrapT=THREE.RepeatWrapping;clone.anisotropy=4;ownedTextures.add(clone);return clone;};
  const woodFallback=canvasTexture(512,(c,s)=>{c.fillStyle='#71604b';c.fillRect(0,0,s,s);for(let i=0;i<800;i++){c.strokeStyle=i%4?'rgba(25,14,7,.13)':'rgba(224,196,143,.1)';c.lineWidth=range(.4,2);const x=range(0,s);c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+range(-15,15),s*.35,x+range(-13,13),s*.7,x+range(-10,10),s);c.stroke();}});
  const stoneFallback=canvasTexture(512,(c,s)=>{c.fillStyle='#b4aa96';c.fillRect(0,0,s,s);for(let i=0;i<17000;i++){const v=Math.floor(range(75,225));c.fillStyle=`rgba(${v},${v},${v},.07)`;c.fillRect(range(0,s),range(0,s),range(1,5),range(1,4));}});
  const woodMap=source(textures.woodColor,woodFallback),stoneMap=source(textures.stoneColor,stoneFallback);
  const normalWood=source(textures.woodNormal),normalStone=source(textures.stoneNormal),roughWood=source(textures.woodRoughness),roughStone=source(textures.stoneRoughness);
  const wood=standard({color:0x6b4933,map:woodMap,normalMap:normalWood,roughnessMap:roughWood,roughness:.73});
  const darkWood=standard({color:0x372b23,map:woodMap,normalMap:normalWood,roughness:.8});
  const trim=standard({color:0x92754f,map:woodMap,roughness:.67});
  const stone=standard({color:0xa6a18f,map:stoneMap,normalMap:normalStone,roughnessMap:roughStone,roughness:.93});
  const stoneTrim=standard({color:0xb6aa92,map:stoneMap,normalMap:normalStone,roughness:.9});
  const floorStone=standard({color:0x8c887b,map:stoneFallback,normalMap:normalStone,roughnessMap:roughStone,roughness:.9});
  const iron=standard({color:0x262c2d,metalness:.68,roughness:.61}),brass=standard({color:0xb09a63,metalness:.78,roughness:.42});
  const paper=standard({color:0xd3c9ad,roughness:.98}),ivory=standard({color:0xe2d8bd,roughness:.83});
  const leather=standard({color:0x334c43,roughness:.69}),wine=standard({color:0x512b34,roughness:.86});
  for(const mat of [wood,darkWood])mat.normalScale?.set(.38,.38);for(const mat of [stone,stoneTrim,floorStone])mat.normalScale?.set(.4,.4);
  const leatherTexture=canvasTexture(512,(c,s)=>{c.fillStyle='#c8c1b5';c.fillRect(0,0,s,s);for(let i=0;i<22000;i++){const v=Math.floor(range(70,215));c.fillStyle=`rgba(${v},${v},${v},.11)`;c.fillRect(range(0,s),range(0,s),range(.5,2),range(.5,2));}for(let i=0;i<100;i++){c.strokeStyle='rgba(55,38,25,.09)';c.lineWidth=.5;const x=range(0,s),y=range(0,s);c.beginPath();c.moveTo(x,y);c.lineTo(x+range(-5,5),y+range(6,22));c.stroke();}});
  const paperTexture=canvasTexture(512,(c,s)=>{c.fillStyle='#dcd0b3';c.fillRect(0,0,s,s);for(let y=0;y<s;y+=range(1,2.5)){c.fillStyle=`rgba(75,55,32,${range(.03,.17)})`;c.fillRect(0,y,s,range(.3,.8));}const edge=c.createLinearGradient(0,0,s,0);edge.addColorStop(0,'rgba(73,52,32,.16)');edge.addColorStop(.12,'transparent');edge.addColorStop(.9,'transparent');edge.addColorStop(1,'rgba(73,52,32,.18)');c.fillStyle=edge;c.fillRect(0,0,s,s);});
  paper.map=paperTexture;leather.map=leatherTexture;floorStone.normalScale?.set(.1,.1);
  const bookMaterials=[0x334d49,0x643f36,0x4d4151,0x6d593c,0x353f4f,0x56462e].map(color=>standard({color,map:leatherTexture,roughness:.8}));
  function group(name,owner=root,position=[0,0,0],rotation=[0,0,0]){const o=new THREE.Group();o.name=name;o.position.set(...position);o.rotation.set(...rotation);owner.add(o);return o;}
  function mesh(owner,g,m,p=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...p);o.scale.set(...scale);o.rotation.set(...rotation);o.castShadow=true;o.receiveShadow=true;owner.add(o);return o;}
  function batch(owner,g,m,p=[0,0,0],scale=[1,1,1],rotation=[0,0,0],tint=null){const key=owner.uuid+g.uuid+m.uuid;if(!batches.has(key))batches.set(key,{owner,g,m,entries:[]});temporary.position.set(...p);temporary.scale.set(...scale);temporary.rotation.set(...rotation);temporary.updateMatrix();batches.get(key).entries.push({matrix:temporary.matrix.clone(),tint});}
  const B=(o,m,x,y,z,w,h,d,rotation=[0,0,0],tint=null)=>batch(o,box,m,[x,y,z],[w,h,d],rotation,tint);
  const C=(o,m,x,y,z,r,h,rotation=[0,0,0])=>batch(o,cylinder,m,[x,y,z],[r,h,r],rotation);
  const S=(o,m,x,y,z,w,h=w,d=w)=>batch(o,sphere,m,[x,y,z],[w,h,d]);
  function beam(owner,a,b,w,mat,h=w){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),delta.clone().normalize());const key=owner.uuid+box.uuid+mat.uuid;if(!batches.has(key))batches.set(key,{owner,g:box,m:mat,entries:[]});temporary.position.copy(from.add(to).multiplyScalar(.5));temporary.quaternion.copy(q);temporary.scale.set(w,h,delta.length());temporary.updateMatrix();batches.get(key).entries.push({matrix:temporary.matrix.clone(),tint:null});}
  function rounded(w,h,d,r=.035){const x=-w/2,y=-h/2,s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);const g=G(new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,bevelSize:r*.35,bevelThickness:r*.35,steps:1,curveSegments:4}));g.translate(0,0,-d/2);return g;}
  function arch(w,bottom,shoulder){const s=new THREE.Shape(),r=w/2;s.moveTo(-r,bottom);s.lineTo(r,bottom);s.lineTo(r,shoulder);s.absarc(0,shoulder,r,0,Math.PI,false);s.lineTo(-r,bottom);return s;}
  function collider(x,z,w,d){colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
  function interact(id,label,object,point){object.userData.interactionId=id;interactables.push({id,label,object,point:new THREE.Vector3(...point)});}

  const architecture=group('Hall masonry and panelled oak');
  B(architecture,darkWood,0,-.15,0,12.4,.25,14.4);
  for(let x=0;x<12;x++)for(let z=0;z<14;z++){
    const tint=new THREE.Color().setScalar(range(.84,1.11));B(architecture,floorStone,-5.5+x,-.02,-6.5+z,.982,.09,.982,[0,0,0],tint);
  }
  const windowCenters=[-3.8,0,3.8];
  const windowOpening=(z,y)=>windowCenters.some(center=>{const x=z-center;return Math.abs(x)<1.08&&y>1.18&&y<3.46+Math.sqrt(Math.max(0,1.08**2-x*x));});
  for(let row=0;row<16;row++){
    const y=.18+row*.334,offset=(row%2)*.375;
    for(let col=-1;col<18;col++){
      const x=-5.62+col*.75+offset,a=Math.max(-6.15,x-.362),b=Math.min(6.15,x+.362);if(b<=a)continue;
      const tint=new THREE.Color().setScalar(range(.82,1.08));
      if(!(Math.abs(x)<1.21&&y<2.55+Math.sqrt(Math.max(0,1.21**2-x*x))))B(architecture,stone,(a+b)/2,y,-7.02,b-a,.31,.29,[0,0,0],tint);
      B(architecture,stone,(a+b)/2,y,7.02,b-a,.31,.29,[0,0,0],tint);
    }
    for(let col=-1;col<21;col++){
      const z=-6.62+col*.75+offset,a=Math.max(-7.15,z-.362),b=Math.min(7.15,z+.362);if(b<=a)continue;
      const tint=new THREE.Color().setScalar(range(.8,1.1));B(architecture,stone,-6.02,y,(a+b)/2,.29,.31,b-a,[0,0,0],tint);
      if(!windowOpening(z,y))B(architecture,stone,6.02,y,(a+b)/2,.29,.31,b-a,[0,0,0],tint);
    }
  }
  // Lower panelling, mouldings, fluted half-columns and carved capitals.
  for(const sign of [-1,1]){
    B(architecture,darkWood,sign*5.79,.54,0,.19,1.08,14.12);
    for(const y of [.13,.93,1.08])B(architecture,trim,sign*5.67,y,0,.09,.065,14.1);
    for(let z=-6.3;z<7;z+=1.3){B(architecture,wood,sign*5.66,.54,z,.055,.7,1.13);B(architecture,darkWood,sign*5.62,.54,z,.03,.57,.98);}
    for(const z of [-6.7,-1.9,5.7]){
      B(architecture,wood,sign*5.77,2.65,z,.25,5.3,.35);B(architecture,trim,sign*5.69,2.71,z,.17,4.59,.43);
      for(const dz of [-.13,0,.13])B(architecture,darkWood,sign*5.585,2.71,z+dz,.027,4.47,.023);
      for(const y of [.19,4.96])B(architecture,trim,sign*5.69,y,z,.42,.18,.61);
    }
  }
  for(const z of [-6.75,-2.2,2.2,6.6]){
    beam(architecture,[-5.9,5.22,z],[5.9,5.22,z],.24,wood,.3);
    beam(architecture,[-5.9,5.3,z],[0,6.85,z],.22,darkWood,.26);beam(architecture,[0,6.85,z],[5.9,5.3,z],.22,darkWood,.26);
    beam(architecture,[0,5.28,z],[0,6.8,z],.16,trim,.2);
    for(const sign of [-1,1])beam(architecture,[sign*5.7,4.2,z],[sign*4.75,5.2,z],.19,wood,.23);
  }
  const roofLength=Math.hypot(6.1,1.6),roofAngle=Math.atan2(1.6,6.1);
  B(architecture,darkWood,-3.05,6.06,0,roofLength,.13,14.3,[0,0,roofAngle]);B(architecture,darkWood,3.05,6.06,0,roofLength,.13,14.3,[0,0,-roofAngle]);
  for(const x of [-4.2,-2.1,0,2.1,4.2])B(architecture,trim,x,6.85-Math.abs(x)*.262,0,.08,.1,14.2);
  const gable=new THREE.Shape();gable.moveTo(-6.1,5.17);gable.lineTo(6.1,5.17);gable.lineTo(0,6.9);gable.closePath();const gableGeometry=G(new THREE.ShapeGeometry(gable));
  mesh(architecture,gableGeometry,stone,[0,0,-7.02]);mesh(architecture,gableGeometry,stone,[0,0,7.02],[1,1,1],[0,Math.PI,0]);

  // Woven runner with restrained medical/scientific geometry rather than a logo.
  const runnerTexture=canvasTexture(1024,(c,s)=>{c.fillStyle='#452c32';c.fillRect(0,0,s,s);for(let i=0;i<15000;i++){c.fillStyle=i%2?'rgba(168,139,92,.045)':'rgba(0,0,0,.07)';c.fillRect(range(0,s),range(0,s),range(1,3),range(1,5));}for(const x of [28,39,71,81,s-28,s-39,s-71,s-81]){c.strokeStyle=x%2?'#8c7551':'#6e593f';c.lineWidth=x===71?8:2;c.beginPath();c.moveTo(x,0);c.lineTo(x,s);c.stroke();}for(let i=0;i<14;i++){c.save();c.translate(s/2,40+i*75);c.rotate(Math.PI/4);c.strokeStyle='#7c6446';c.lineWidth=2;c.strokeRect(-20,-20,40,40);c.restore();}});
  const runner=standard({map:runnerTexture,roughness:1});mesh(root,G(new THREE.PlaneGeometry(2.55,11.35)),runner,[.08,.029,.27],[1,1,1],[-Math.PI/2,0,0]);

  // A genuine door in a thick arch is the only route into the member study.
  const door=group('Door to the Boyi study',root,[0,0,-6.9]);
  const doorGeometry=G(new THREE.ExtrudeGeometry(arch(2.3,.04,2.58),{depth:.13,steps:1,curveSegments:24,bevelEnabled:true,bevelSize:.018,bevelThickness:.016,bevelSegments:2}));
  mesh(door,doorGeometry,wood,[0,0,-.08]);
  for(let i=-4;i<=4;i++){const x=i*.25,h=2.58+Math.sqrt(Math.max(0,1.15**2-x*x));B(door,darkWood,x,h/2,.068,.012,h-.06,.016);}
  for(const x of [-1.29,1.29]){B(door,stoneTrim,x,1.28,0,.25,2.57,.58);for(const y of [.2,2.49])B(door,stoneTrim,x,y,.04,.41,.18,.76);}
  for(let i=0;i<19;i++){const a=i*Math.PI/18;B(door,stoneTrim,Math.cos(a)*1.29,2.58+Math.sin(a)*1.29,0,.245,.27,.58,[0,0,a-Math.PI/2]);}
  for(const y of [.56,2.05]){B(door,iron,-.49,y,.107,1.12,.075,.032);for(const x of [-.96,-.55,-.16])S(door,brass,x,y,.13,.018,.018,.008);}
  batch(door,ring,brass,[.72,1.38,.14],[.105,.105,.105]);S(door,brass,.72,1.49,.14,.036,.045,.015);
  const entrancePlate=group('Boyi study door plate',door,[0,2.43,.14]);mesh(entrancePlate,rounded(.84,.26,.03,.025),brass);
  const doorTitle=canvasTexture(512,(c,s)=>{c.fillStyle='#a68e58';c.fillRect(0,0,s,s);c.strokeStyle='#51432d';c.lineWidth=9;c.strokeRect(12,12,s-24,s-24);c.fillStyle='#352b21';c.textAlign='center';c.scale(1,3.75);c.font='70px "KaiTi", "Microsoft YaHei", serif';c.fillText('博医小屋',s/2,92);});
  mesh(entrancePlate,G(new THREE.PlaneGeometry(.77,.205)),standard({map:doorTitle,roughness:.6}),[0,0,.032]);
  interact('door','进入博医小屋',door,[0,1.7,-6.55]);

  // Actual supplied emblems: clearly visible at arrival, never reconstructed.
  let originalLogoCount=0;const logoMaterials=new Map();
  function logo(texture,owner,p,w,h,rotation=[0,0,0]){
    if(!texture)return;let mat=logoMaterials.get(texture.uuid);
    if(!mat){const t=source(texture);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;t.colorSpace=THREE.SRGBColorSpace;mat=standard({map:t,transparent:true,alphaTest:.025,side:THREE.DoubleSide,roughness:.79});logoMaterials.set(texture.uuid,mat);originalLogoCount++;}
    const image=texture.image,ratio=image?.width&&image?.height?image.width/image.height:1,fw=Math.min(w,h*ratio);const o=mesh(owner,G(new THREE.PlaneGeometry(fw,fw/ratio)),mat,p,[1,1,1],rotation);o.castShadow=false;o.userData.originalBrandAsset=true;
  }
  const crest=group('Original dual emblems',root,[0,4.53,-6.71]);mesh(crest,rounded(2.96,.91,.13,.055),darkWood);mesh(crest,rounded(2.79,.74,.025,.035),ivory,[0,0,.085]);
  logo(textures.schoolLogo,crest,[-.71,0,.12],.67,.67);logo(textures.boyiLogo,crest,[.71,0,.12],.71,.67);
  for(const x of [-1.36,1.36])for(const y of [-.34,.34])S(crest,brass,x,y,.111,.023,.023,.012);
  for(const side of [-1,1]){
    const banner=group('Hanging academic banner',root,[side*2.69,3.2,-6.69]);
    B(banner,wine,0,-.16,0,.82,1.83,.025);B(banner,brass,0,.8,.025,1.02,.04,.05);for(const x of [-.5,.5])S(banner,brass,x,.8,.025,.045);
    mesh(banner,G(new THREE.CircleGeometry(.31,48)),ivory,[0,.16,.028]);logo(side<0?textures.schoolLogo:textures.boyiLogo,banner,[0,.16,.038],.51,.51);
    for(const x of [-.35,.35])B(banner,brass,x,-.16,.022,.011,1.65,.008);
  }

  // Left wall, public volumes: full book blocks with separate covers and pages.
  const shelf=group('Public reading shelves',root,[-5.58,0,-1.33],[0,Math.PI/2,0]);
  const titleTexture=canvasTexture(1024,(c,s)=>{c.clearRect(0,0,s,s);const titles=['医学人文','山海同行','博医手记','科学与艺术','学习札记','PUBLIC NOTES','MEDICINA','NATURA'];for(let n=0;n<8;n++){const x=n*128;c.strokeStyle='#ba9b63';c.lineWidth=2;c.strokeRect(x+19,75,90,865);c.strokeRect(x+24,81,80,853);c.fillStyle='#d4b57c';c.textAlign='center';if(n<5){c.font='39px "Microsoft YaHei", serif';[...titles[n]].forEach((ch,i)=>c.fillText(ch,x+64,300+i*120));}else{c.save();c.translate(x+64,510);c.rotate(-Math.PI/2);c.font='37px Georgia, serif';c.fillText(titles[n],0,12);c.restore();}}});
  const labelMaterial=standard({map:titleTexture,transparent:true,alphaTest:.06,roughness:.8,depthWrite:false});const labelPositions=[],labelUV=[];
  for(const center of [-1.08,1.08]){
    B(shelf,darkWood,center,1.84,-.16,2.06,3.68,.14);
    for(const x of [center-1.03,center+1.03]){B(shelf,wood,x,1.85,.1,.15,3.7,.58);B(shelf,trim,x,1.85,.42,.17,3.43,.055);for(const y of [.2,3.48])B(shelf,trim,x,y,.1,.26,.16,.77);}
    for(const y of [.2,.91,1.62,2.33,3.04,3.64]){B(shelf,wood,center,y,.11,2.06,.09,.66);B(shelf,trim,center,y,.47,2.12,.055,.065);}
    B(shelf,wood,center,3.79,.07,2.24,.14,.8);B(shelf,trim,center,3.88,.07,2.33,.06,.87);
    for(let level=0;level<5;level++){
      let x=center-.91;const y=.25+level*.71;
      while(x<center+.9){const w=range(.08,.16),h=range(.4,.58),d=range(.29,.38);if(x+w>center+.94)break;const bx=x+w/2,z=.31,mat=bookMaterials[Math.floor(random()*bookMaterials.length)];
        B(shelf,paper,bx,y+h/2,z,w-.018,h-.025,d-.026);for(const side of [-1,1])B(shelf,mat,bx+side*(w/2-.004),y+h/2,z,.008,h,d);B(shelf,mat,bx,y+h/2,z+d/2+.004,w,h,.022);
        for(const ly of [.075,h-.065])B(shelf,brass,bx,y+ly,z+d/2+.018,w*.88,.009,.006);
        const index=Math.floor(random()*8),left=bx-w*.4,right=bx+w*.4,bottom=y+h*.18,top=y+h*.83,front=z+d/2+.018;
        const ps=[[left,bottom,front],[right,bottom,front],[right,top,front],[left,top,front]],uv=[[index/8,0],[(index+1)/8,0],[(index+1)/8,1],[index/8,1]];for(const i of [0,1,2,0,2,3]){labelPositions.push(...ps[i]);labelUV.push(...uv[i]);}x+=w+range(.009,.025);
      }
    }
  }
  const labelGeometry=G(new THREE.BufferGeometry());labelGeometry.setAttribute('position',new THREE.Float32BufferAttribute(labelPositions,3));labelGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(labelUV,2));labelGeometry.computeVertexNormals();mesh(shelf,labelGeometry,labelMaterial).castShadow=false;
  collider(-5.24,-1.33,1.02,4.5);interact('shelf','翻阅公共书架',shelf,[-4.93,1.7,-1.33]);

  // A long meeting table, chairs, runner, manuscripts and writing instruments.
  const table=group('Communal reading table',root,[-2.4,0,.12]);mesh(table,rounded(2.05,.15,4.43,.05),wood,[0,.95,0]);B(table,trim,0,.85,0,2.13,.055,4.5);
  for(const x of [-.76,.76])for(const z of [-1.8,1.8]){C(table,wood,x,.43,z,.095,.8);for(const y of [.15,.72])C(table,trim,x,y,z,.12,.045);S(table,wood,x,.08,z,.13,.08,.13);}
  for(const z of [-1.8,1.8])B(table,wood,0,.43,z,1.67,.1,.09);B(table,wood,0,.4,0,.1,.12,3.68);
  B(table,wine,0,1.032,0,.62,.009,4.1);for(const x of [-.28,.28])B(table,brass,x,1.039,0,.009,.003,4.0);
  const seatGeometry=rounded(.66,.09,.66,.035),seatBack=rounded(.58,.69,.085,.045);
  for(const side of [-1,1])for(const z of [-1.36,1.34]){
    const chair=group('Meeting chair',root,[-2.4+side*1.5,0,z+.12],[0,side>0?-Math.PI/2:Math.PI/2,0]);batch(chair,seatGeometry,wood,[0,.49,0]);batch(chair,seatGeometry,leather,[0,.55,.02],[.9,.6,.9]);batch(chair,seatBack,leather,[0,1.02,-.28]);
    for(const x of [-.26,.26])for(const zz of [-.26,.26])B(chair,wood,x,.25,zz,.065,.5,.065);for(const x of [-.28,.28])B(chair,wood,x,1.03,-.29,.065,.95,.065);
    collider(-2.4+side*1.5,z+.12,.83,.84);
  }
  collider(-2.4,.12,2.2,4.6);
  const journalTexture=canvasTexture(1024,(c,s)=>{c.fillStyle='#d4c8a9';c.fillRect(0,0,s,s);c.strokeStyle='#7a7156';c.lineWidth=2;c.strokeRect(52,52,s-104,s-104);c.fillStyle='#4c4636';c.font='58px "KaiTi", "Microsoft YaHei", serif';c.textAlign='center';c.fillText('在这里，相遇与交谈',s/2,160);for(let r=0;r<20;r++){let x=95;while(x<930){const w=range(15,60);c.fillStyle='rgba(66,57,37,.5)';c.fillRect(x,225+r*29,w,2);x+=w+range(10,20);}}});
  const journalMaterial=standard({map:journalTexture,roughness:.96,side:THREE.DoubleSide});
  for(const z of [-1.26,1.2]){
    const book=group('Open public journal',table,[.06,1.048,z],[0,.16,0]);B(book,bookMaterials[1],0,.02,0,1.15,.035,.78);
    for(const sign of [-1,1]){B(book,paper,sign*.285,.049,0,.55,.037,.72);mesh(book,G(new THREE.PlaneGeometry(.54,.71)),journalMaterial,[sign*.285,.071,0],[1,1,1],[-Math.PI/2,0,sign*.02]);}
  }
  for(let i=0;i<4;i++){B(table,bookMaterials[i],.49,1.07+i*.07,.06,.48,.063,.65,[0,.12-i*.06,0]);B(table,paper,.49,1.07+i*.07,.055,.45,.042,.6,[0,.12-i*.06,0]);}
  C(table,iron,-.67,1.12,-.2,.066,.14);C(table,brass,-.67,1.2,-.2,.069,.025);beam(table,[-.68,1.16,-.2],[-.57,1.52,-.22],.006,brass);
  S(table,paper,-.55,1.53,-.22,.035,.15,.007);

  // Inviting lounge seating and real cushions, set clear of the central route.
  const lounge=group('Conversation corner');
  const cushion=rounded(.91,.17,.85,.075),backCushion=rounded(.94,.94,.18,.075),arm=rounded(.18,.17,.96,.05);
  for(const z of [-1.68,2.04]){
    const chair=group('Green leather lounge chair',lounge,[3.87,0,z],[0,-Math.PI/2,0]);B(chair,wood,0,.37,0,1.05,.24,.98);batch(chair,cushion,leather,[0,.56,.01]);batch(chair,backCushion,leather,[0,1.05,-.35],[1,1,1],[-.1,0,0]);
    for(const x of [-.55,.55]){batch(chair,arm,wood,[x,.85,0]);for(const zz of [-.31,.32])B(chair,wood,x,.66,zz,.065,.36,.065);}
    for(const x of [-.38,.38])for(const zz of [-.34,.34])B(chair,wood,x,.15,zz,.08,.3,.08);
    for(const x of [-.26,0,.26])for(const y of [.98,1.2])S(chair,brass,x,y,-.235,.015,.015,.007);
    collider(3.87,z,1.39,1.48);
  }
  const sideTable=group('Round tea table',lounge,[3.5,0,.2]);C(sideTable,wood,0,.61,0,.61,.1);C(sideTable,trim,0,.668,0,.63,.025);C(sideTable,wood,0,.33,0,.07,.55);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;beam(sideTable,[0,.22,0],[Math.cos(a)*.43,.04,Math.sin(a)*.43],.055,wood);}
  const ceramic=standard({color:0xb4c2bd,roughness:.27,metalness:.08});C(sideTable,ceramic,-.2,.7,.1,.13,.025);C(sideTable,ceramic,-.2,.77,.1,.064,.13);batch(sideTable,ring,ceramic,[-.12,.79,.1],[.04,.04,.04],[0,Math.PI/2,0]);
  C(sideTable,ivory,.16,.69,-.13,.14,.015);logo(textures.schoolLogo,sideTable,[.16,.702,-.13],.23,.23,[-Math.PI/2,0,0]);
  collider(3.5,.2,1.3,1.3);

  // Original scientific drawings, double frames and restrained wall ornament.
  for(const z of [-5.2,4.82]){
    const artwork=group('Framed scholarly drawing',root,[-5.73,3.2,z],[0,Math.PI/2,0]);
    B(artwork,darkWood,0,0,0,1.24,1.32,.09);B(artwork,brass,0,0,.053,1.12,1.2,.015);
    const image=canvasTexture(512,(c,s)=>{c.fillStyle='#bcad87';c.fillRect(0,0,s,s);c.strokeStyle='#675e46';c.lineWidth=2;for(let r=0;r<8;r++){c.beginPath();c.ellipse(s/2,s/2,42+r*20,90+r*13,r*.1,0,Math.PI*2);c.stroke();}for(let i=0;i<45;i++){c.beginPath();c.fillStyle='#555447';c.arc(range(60,450),range(60,450),range(1,3),0,Math.PI*2);c.fill();}c.strokeStyle='#8f7b51';c.lineWidth=5;c.strokeRect(18,18,s-36,s-36);});
    mesh(artwork,G(new THREE.PlaneGeometry(1.05,1.13)),standard({map:image,roughness:.94}),[0,0,.065]);
  }

  // The windows look out onto actual distant 3D silhouettes, moon and stars.
  const exterior=group('Three dimensional night outside the hall');
  const skyMaterial=basic({color:0x101b30,side:THREE.BackSide});mesh(exterior,G(new THREE.SphereGeometry(32,24,12)),skyMaterial,[0,3,0]).castShadow=false;
  const mountainMaterial=standard({color:0x263c4c,roughness:1});
  const mountain=G(new THREE.ConeGeometry(1,1,5));
  for(let i=0;i<13;i++)batch(exterior,mountain,mountainMaterial,[range(9.5,14),range(-.4,.6),-13+i*2.1],[range(2,4),range(3.5,7),range(1.8,3.5)],[0,range(0,Math.PI),0]);
  const moonMaterial=basic({color:0xd5e2ec});mesh(exterior,G(new THREE.SphereGeometry(.66,24,16)),moonMaterial,[10.9,6.4,-3.2]);
  const starPositions=new Float32Array(160*3);for(let i=0;i<160;i++){starPositions[i*3]=range(15,23);starPositions[i*3+1]=range(3,13);starPositions[i*3+2]=range(-20,20);}
  const starGeometry=G(new THREE.BufferGeometry());starGeometry.setAttribute('position',new THREE.BufferAttribute(starPositions,3));const stars=new THREE.Points(starGeometry,M(new THREE.PointsMaterial({color:0xd0deee,size:.032,sizeAttenuation:true})));exterior.add(stars);
  const glass=standard({color:0x8aacc0,transparent:true,opacity:.07,roughness:.2,side:THREE.DoubleSide,depthWrite:false});
  for(const center of windowCenters){
    const window=group('Arched reception window',root,[5.94,0,center],[0,-Math.PI/2,0]);
    mesh(window,G(new THREE.ShapeGeometry(arch(2.12,1.18,3.46),24)),glass);
    for(const x of [-1.15,1.15]){B(window,stoneTrim,x,2.3,0,.19,2.3,.43);for(let i=0;i<7;i++)B(window,stoneTrim,x,1.35+i*.305,.04,.25,.27,.51);}
    for(let i=0;i<15;i++){const a=i*Math.PI/14;B(window,stoneTrim,Math.cos(a)*1.15,3.46+Math.sin(a)*1.15,0,.24,.23,.46,[0,0,a-Math.PI/2]);}
    B(window,stoneTrim,0,1.12,.18,2.65,.16,.76);B(window,iron,0,2.81,.06,.035,3.03,.06);B(window,iron,0,2.62,.06,2.09,.036,.06);
    for(const x of [-.53,.53])B(window,iron,x,2.48,.06,.026,2.53,.06);
  }

  // Candle sconces, two chandeliers and one cached shadow atlas.
  const flameMaterial=basic({color:0xffdfa0});const flameGeometry=G(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.04,.03),new THREE.Vector2(.032,.1),new THREE.Vector2(0,.18)],10));
  const wax=standard({color:0xddd0ad,roughness:.86});
  function candle(owner,x,y,z){C(owner,brass,x,y,z,.1,.045);C(owner,brass,x,y+.11,z,.022,.18);C(owner,brass,x,y+.2,z,.065,.035);C(owner,wax,x,y+.36,z,.039,.29);batch(owner,flameGeometry,flameMaterial,[x,y+.51,z]);}
  for(const z of [-3.55,3.5]){
    const lightFixture=group('Brass candle chandelier',root,[0,z<0?4.57:4.2,z]);batch(lightFixture,ring,iron,[0,0,0],[1.04,1.04,1.04],[Math.PI/2,0,0]);
    for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*1.03,zz=Math.sin(a)*1.03;beam(lightFixture,[0,.22,0],[x,-.06,zz],.022,iron);candle(lightFixture,x,-.06,zz);}
    for(let i=0;i<10;i++)batch(lightFixture,ring,iron,[0,.25+i*.14,0],[.055,.08,.055],[0,i%2?Math.PI/2:0,0]);S(lightFixture,brass,0,.2,0,.1,.13,.1);
  }
  for(const z of [-5.2,4.8])for(const side of [-1,1]){
    const sconce=group('Wall candle sconce',root,[side*5.56,2.2,z],[0,side<0?Math.PI/2:-Math.PI/2,0]);B(sconce,iron,0,.2,0,.18,.56,.06);beam(sconce,[0,0,.03],[0,.12,.34],.025,brass);candle(sconce,0,.12,.34);
  }
  for(const z of [-.8,.9])candle(table,0,1.05,z);
  const keyLight=new THREE.PointLight(0xffd2a0,95,21,2);keyLight.position.set(0,4.1,.5);keyLight.castShadow=true;keyLight.shadow.mapSize.set(quality==='high'?2048:1024,quality==='high'?2048:1024);keyLight.shadow.camera.near=.3;keyLight.shadow.camera.far=23;keyLight.shadow.bias=-.0005;keyLight.shadow.normalBias=.03;keyLight.shadow.autoUpdate=false;keyLight.shadow.needsUpdate=true;root.add(keyLight);
  const doorLight=new THREE.PointLight(0xffc68b,16,8,2);doorLight.position.set(-.35,3.3,-5.7);root.add(doorLight);
  const readingLight=new THREE.PointLight(0xffd0a0,12,6,2);readingLight.position.set(-2.4,2.15,.1);root.add(readingLight);
  const hemisphere=new THREE.HemisphereLight(0xa3bed0,0x41372c,1.23);root.add(hemisphere);
  const moonLight=new THREE.DirectionalLight(0xb6d0eb,1.8);moonLight.position.set(8,6,0);moonLight.target.position.set(-2,.3,0);root.add(moonLight,moonLight.target);

  const fairy=createBoyiFairy(THREE,root,{reduced,colliders});interactables.push(fairy.interactable);
  let instanceCount=0;
  for(const b of batches.values()){const instanced=new THREE.InstancedMesh(b.g,b.m,b.entries.length);instanced.name=b.owner.name+' details';b.entries.forEach((entry,i)=>{instanced.setMatrixAt(i,entry.matrix);if(entry.tint)instanced.setColorAt(i,entry.tint);});instanced.instanceMatrix.needsUpdate=true;instanced.castShadow=b.owner!==exterior;instanced.receiveShadow=true;instanced.computeBoundingSphere();b.owner.add(instanced);instanceCount+=b.entries.length;}batches.clear();
  let triangles=0,draws=0;root.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);draws++;}});
  const stats={geometryTriangles:Math.round(triangles),estimatedMainPassDrawCalls:draws+1,staticInstances:instanceCount,shadowLights:1,interactions:3,originalLogoCount,sceneKind:'public-lobby',rendererMeasured:false};
  Object.defineProperties(stats,{spriteFollowing:{enumerable:true,get:()=>fairy.stats.spriteFollowing},spriteGestureCount:{enumerable:true,get:()=>fairy.stats.spriteGestureCount}});
  return{root,colliders,interactables,spawn:{x:0,y:1.65,z:4.5,yaw:0},stats,
    setViewerPose:pose=>fairy.setViewerPose(pose),setSpriteState:state=>fairy.setSpriteState(state),
    update(seconds,dt=0){if(!disposed)fairy.update(seconds,dt);},
    setNightMode(enabled=true){skyMaterial.color.setHex(enabled?0x101b30:0x99bdca);mountainMaterial.color.setHex(enabled?0x263c4c:0x718e80);moonMaterial.color.setHex(enabled?0xd5e2ec:0xffecc5);stars.visible=Boolean(enabled);moonLight.color.setHex(enabled?0xb6d0eb:0xffe1b3);moonLight.intensity=enabled?1.8:2.45;hemisphere.intensity=enabled?1.23:1.58;},
    dispose(){if(disposed)return;disposed=true;fairy.dispose();root.removeFromParent();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of ownedTextures)t.dispose();keyLight.shadow.map?.dispose();colliders.length=0;interactables.length=0;}
  };
}
