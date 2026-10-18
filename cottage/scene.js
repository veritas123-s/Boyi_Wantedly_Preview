/* Boyi Cottage: a self contained, original magical study.
 * Geometry, canvas textures and animation are local. No loader or network access.
 * The host owns the renderer, camera, input, wall bounds and question service.
 */
export function createCottageScene(THREE, scene, { textures = {}, quality = 'balanced', reduced = false } = {}) {
  const root = new THREE.Group();
  root.name = 'Boyi magical study';
  scene.add(root);
  const geometries = new Set(), materials = new Set(), ownedTextures = new Set();
  const batches = new Map(), decals = new Map(), colliders = [], interactables = [], flickers = [], hearthFlames = [], embers = [], fireAnimation = [];
  const animated = new THREE.Group();
  animated.name = 'Small living details';
  root.add(animated);
  let seed = 0x42b09e31, disposed = false;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const range = (a, b) => a + (b - a) * random();
  const G = geometry => (geometries.add(geometry), geometry);
  const M = material => (materials.add(material), material);
  const standard = options => M(new THREE.MeshStandardMaterial(options));
  const basic = options => M(new THREE.MeshBasicMaterial(options));
  const box = G(new THREE.BoxGeometry(1, 1, 1));
  const sphere = G(new THREE.SphereGeometry(1, 24, 16));
  const smallSphere = G(new THREE.SphereGeometry(1, 12, 8));
  const cylinder = G(new THREE.CylinderGeometry(1, 1, 1, 16));
  const ring = G(new THREE.TorusGeometry(1, 0.055, 8, 48));
  const temp = new THREE.Object3D();
  const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  const canvasTexture = (size, draw, color = true) => {
    // Canvas is only used while constructing the scene, never every frame.
    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    draw(ctx, size);
    const texture = new THREE.CanvasTexture(canvas);
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    ownedTextures.add(texture);
    return texture;
  };
  const woodFallback = canvasTexture(512, (c, s) => {
    c.fillStyle = '#554032'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 550; i++) {
      const x = range(0, s), w = range(.3, 2.8);
      c.beginPath(); c.strokeStyle = i % 4 ? `rgba(22,12,8,${range(.04,.22)})` : `rgba(193,147,90,${range(.05,.18)})`; c.lineWidth = w;
      c.moveTo(x, -20); c.bezierCurveTo(x + range(-16,16), s*.3, x + range(-12,12), s*.7, x + range(-7,7), s+20); c.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const x = range(50,s-50), y = range(0,s);
      for (let j = 0; j < 5; j++) { c.beginPath(); c.strokeStyle = 'rgba(27,15,8,.14)'; c.lineWidth = 1; c.ellipse(x,y,4+j*2,16+j*7,0,0,Math.PI*2); c.stroke(); }
    }
  });
  const stoneFallback = canvasTexture(512, (c, s) => {
    c.fillStyle = '#77716a'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 11000; i++) {
      const gray = Math.floor(range(45,190)); c.fillStyle = `rgba(${gray},${gray},${gray},${range(.015,.12)})`;
      c.fillRect(range(0,s),range(0,s),range(1,8),range(1,4));
    }
    for (let i = 0; i < 30; i++) { c.beginPath(); c.strokeStyle = 'rgba(34,27,21,.1)'; c.moveTo(range(0,s),range(0,s)); c.lineTo(range(0,s),range(0,s)); c.stroke(); }
    const edge = c.createLinearGradient(0,0,0,s); edge.addColorStop(0,'rgba(0,0,0,.14)'); edge.addColorStop(.15,'transparent'); edge.addColorStop(.85,'transparent'); edge.addColorStop(1,'rgba(0,0,0,.18)'); c.fillStyle=edge;c.fillRect(0,0,s,s);
  });
  const borrowedTexture = (value, fallback) => {
    if (!value) return fallback;
    const result = value.clone(); result.needsUpdate = true;
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.anisotropy = 4; ownedTextures.add(result); return result;
  };
  const woodColor = borrowedTexture(textures.woodColor, woodFallback);
  const stoneColor = borrowedTexture(textures.stoneColor, stoneFallback);
  const woodNormal = textures.woodNormal ? borrowedTexture(textures.woodNormal) : null;
  const stoneNormal = textures.stoneNormal ? borrowedTexture(textures.stoneNormal) : null;
  const woodRoughness = textures.woodRoughness ? borrowedTexture(textures.woodRoughness) : null;
  const stoneRoughness = textures.stoneRoughness ? borrowedTexture(textures.stoneRoughness) : null;
  const metalRoughness=canvasTexture(256,(c,s)=>{
    c.fillStyle='#999999';c.fillRect(0,0,s,s);
    for(let i=0;i<3400;i++){const v=Math.floor(range(96,220));c.strokeStyle=`rgba(${v},${v},${v},.17)`;c.lineWidth=range(.35,1.1);const x=range(0,s),y=range(0,s);c.beginPath();c.moveTo(x,y);c.lineTo(x+range(3,26),y+range(-1,1));c.stroke();}
  },false);
  const leatherGrain=canvasTexture(512,(c,s)=>{
    c.fillStyle='#c7c0b6';c.fillRect(0,0,s,s);
    for(let i=0;i<22000;i++){const v=Math.floor(range(90,210));c.fillStyle=`rgba(${v},${v},${v},${range(.03,.13)})`;c.fillRect(range(0,s),range(0,s),range(.5,2),range(.5,2));}
    c.strokeStyle='rgba(55,39,27,.1)';c.lineWidth=.65;
    for(let i=0;i<80;i++){c.beginPath();let x=range(0,s),y=range(0,s);c.moveTo(x,y);for(let k=0;k<5;k++){x+=range(-8,8);y+=range(2,10);c.lineTo(x,y);}c.stroke();}
  });
  const paperEdges=canvasTexture(512,(c,s)=>{
    c.fillStyle='#d3c5a7';c.fillRect(0,0,s,s);
    for(let y=0;y<s;y+=range(1,3)){c.fillStyle=`rgba(73,54,31,${range(.035,.18)})`;c.fillRect(0,y,s,range(.3,.8));}
    const shade=c.createLinearGradient(0,0,s,0);shade.addColorStop(0,'rgba(67,44,23,.16)');shade.addColorStop(.16,'transparent');shade.addColorStop(.88,'transparent');shade.addColorStop(1,'rgba(67,44,23,.2)');c.fillStyle=shade;c.fillRect(0,0,s,s);
  });
  const bookLabels=canvasTexture(1024,(c,s)=>{
    c.clearRect(0,0,s,s);const titles=['医学人文','科学方法','临床观察','研究札记','远行笔记','学习手册','MEDICINA','NATURA','MEMORIA','FIELD NOTES','OBSERVATION','HUMANITIES'];
    for(let n=0;n<32;n++){
      const x=(n%8)*128,y=Math.floor(n/8)*256;
      c.fillStyle='rgba(30,20,16,.2)';c.fillRect(x+21,y+20,86,216);
      c.strokeStyle='#b89a5d';c.lineWidth=1.5;c.strokeRect(x+25,y+25,78,206);c.strokeRect(x+29,y+29,70,198);
      c.textAlign='center';c.fillStyle='#d9bd7c';const title=titles[n%titles.length];
      if(n%titles.length<6){c.font='23px "Microsoft YaHei", serif';[...title].forEach((letter,i)=>c.fillText(letter,x+64,y+78+i*34));}
      else{c.save();c.translate(x+66,y+126);c.rotate(-Math.PI/2);c.font='16px Georgia, serif';c.fillText(title,0,5);c.restore();}
      c.font='12px Georgia, serif';c.fillText(String(n+1).padStart(2,'0'),x+64,y+215);
    }
  });
  const oak = standard({color:0x88705a,map:woodColor,normalMap:woodNormal,roughnessMap:woodRoughness,roughness:.77,metalness:0});
  const walnut = standard({color:0x4c3428,map:woodColor,normalMap:woodNormal,roughnessMap:woodRoughness,roughness:.68});
  const darkWood = standard({color:0x342820,map:woodColor,normalMap:woodNormal,roughness:.82});
  const woodEdge = standard({color:0x9c7950,map:woodColor,roughness:.63});
  const stone = standard({color:0xa1998b,map:stoneColor,normalMap:stoneNormal,roughnessMap:stoneRoughness,roughness:.96});
  const dressedStone = standard({color:0xb7aa94,map:stoneColor,normalMap:stoneNormal,roughness:.9});
  const soot = standard({color:0x17171a,map:stoneColor,roughness:1});
  const brass = standard({color:0xa6894d,metalness:.82,roughness:.48,roughnessMap:metalRoughness});
  const oldGold = standard({color:0xb89b61,metalness:.65,roughness:.58,roughnessMap:metalRoughness});
  const iron = standard({color:0x2d2b29,metalness:.72,roughness:.67,roughnessMap:metalRoughness});
  const paper = standard({color:0xd3c29b,roughness:.97});
  const pageEdges = standard({color:0xe7dcc2,map:paperEdges,roughness:.97});
  const wax = standard({color:0xe1d2ae,roughness:.86});
  const ink = standard({color:0x10202b,metalness:.2,roughness:.2});
  const leather = standard({color:0x442a2c,map:leatherGrain,roughness:.77});
  const flameOuter = basic({color:0xff992c,transparent:true,opacity:.47,depthWrite:false});
  const flameInner = basic({color:0xffe5a2});
  const glowMaterial = basic({color:0xffbe68,transparent:true,opacity:.09,depthWrite:false});
  const bookMaterials = [0x53352e,0x273e40,0x373548,0x6a4e35,0x3b4738,0x62333d,0x71604b,0x2e3747].map(color=>standard({color,map:leatherGrain,roughness:.8}));
  const bookLabelMaterial=standard({map:bookLabels,transparent:true,alphaTest:.05,depthWrite:false,roughness:.81,metalness:.1});
  for(const material of [oak,walnut,darkWood])material.normalScale?.set(.38,.38);
  stone.normalScale?.set(.52,.52);dressedStone.normalScale?.set(.3,.3);

  // Flat bevels make the stone catch narrow highlights without a subdivision
  // multiplier on every brick: 44 triangles instead of a rounded 200+.
  function chamferBox(r=.035) {
    const vertices=[],normals=[],uvs=[],v=new THREE.Vector3(),w=new THREE.Vector3(),normal=new THREE.Vector3();
    const triangle=(a,b,c,out,coords=[[0,0],[1,0],[1,1]])=>{
      v.fromArray(b).sub(new THREE.Vector3(...a));w.fromArray(c).sub(new THREE.Vector3(...a));normal.crossVectors(v,w).normalize();
      if(normal.dot(new THREE.Vector3(...out))<0){[b,c]=[c,b];coords=[coords[0],coords[2],coords[1]];normal.negate();}
      vertices.push(...a,...b,...c);for(let i=0;i<3;i++)normals.push(normal.x,normal.y,normal.z);for(const uv of coords)uvs.push(...uv);
    };
    const quad=(a,b,c,d,out)=>{triangle(a,b,c,out);triangle(a,c,d,out,[[0,0],[1,1],[0,1]]);};
    const half=.5,inner=half-r;
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const u=(axis+1)%3,v=(axis+2)%3,out=[0,0,0];out[axis]=sign;
      const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([su,sv])=>{const p=[0,0,0];p[axis]=sign*half;p[u]=su*inner;p[v]=sv*inner;return p;});quad(...points,out);
    }
    for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)for(const sa of [-1,1])for(const sb of [-1,1]){
      const c=3-a-b,out=[0,0,0];out[a]=sa;out[b]=sb;
      const point=(onA,sc)=>{const p=[0,0,0];p[a]=sa*(onA?half:inner);p[b]=sb*(onA?inner:half);p[c]=sc*inner;return p;};quad(point(true,-1),point(false,-1),point(false,1),point(true,1),out);
    }
    for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])triangle([sx*half,sy*inner,sz*inner],[sx*inner,sy*half,sz*inner],[sx*inner,sy*inner,sz*half],[sx,sy,sz]);
    const geometry=G(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));return geometry;
  }
  const stoneBlock=quality==='smooth'?box:chamferBox(.035);

  function group(name, parent = root, position = [0,0,0], rotation = [0,0,0]) {
    const object = new THREE.Group(); object.name=name; object.position.set(...position); object.rotation.set(...rotation); parent.add(object); return object;
  }
  function mesh(owner, geometry, material, position=[0,0,0], scale=[1,1,1], rotation=[0,0,0]) {
    const item = new THREE.Mesh(geometry,material); item.position.set(...position);item.scale.set(...scale);item.rotation.set(...rotation);item.castShadow=true;item.receiveShadow=true;owner.add(item);return item;
  }
  function batch(owner, geometry, material, position=[0,0,0], scale=[1,1,1], rotation=[0,0,0], tint=null) {
    const key = `${owner.uuid}/${geometry.uuid}/${material.uuid}`;
    if(!batches.has(key))batches.set(key,{owner,geometry,material,items:[]});
    temp.position.set(...position);temp.scale.set(...scale);temp.rotation.set(...rotation);temp.updateMatrix();
    batches.get(key).items.push({matrix:temp.matrix.clone(),tint});
  }
  function beam(owner, from, to, thickness, material, depth=thickness) {
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),direction=b.clone().sub(a);
    const key = `${owner.uuid}/${box.uuid}/${material.uuid}`;
    if(!batches.has(key))batches.set(key,{owner,geometry:box,material,items:[]});
    temp.position.copy(a.add(b).multiplyScalar(.5));temp.quaternion.setFromUnitVectors(Z,direction.clone().normalize());temp.scale.set(thickness,depth,direction.length());temp.updateMatrix();
    batches.get(key).items.push({matrix:temp.matrix.clone(),tint:null});
  }
  const B=(owner,material,x,y,z,sx,sy,sz,rotation=[0,0,0],tint=null)=>batch(owner,material===stone||material===dressedStone?stoneBlock:box,material,[x,y,z],[sx,sy,sz],rotation,tint);
  const C=(owner,material,x,y,z,radius,height,rotation=[0,0,0])=>batch(owner,cylinder,material,[x,y,z],[radius,height,radius],rotation);
  const S=(owner,material,x,y,z,sx,sy=sx,sz=sx)=>batch(owner,smallSphere,material,[x,y,z],[sx,sy,sz]);
  const rounded = (w,h,d,r=.06) => {
    const x=-w/2,y=-h/2,shape=new THREE.Shape();
    shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
    const geometry=G(new THREE.ExtrudeGeometry(shape,{depth:d,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:r*.38,bevelThickness:r*.38,curveSegments:4}));geometry.translate(0,0,-d/2);return geometry;
  };
  const archShape=(width,bottom,shoulder)=>{
    const r=width/2,shape=new THREE.Shape();shape.moveTo(-r,bottom);shape.lineTo(r,bottom);shape.lineTo(r,shoulder);shape.absarc(0,shoulder,r,0,Math.PI,false);shape.lineTo(-r,bottom);return shape;
  };
  const lineTube=(owner,points,radius,material,segments=32)=>mesh(owner,G(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,6,false)),material);
  function collider(x,z,w,d){colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
  function interact(id,label,object,point){interactables.push({id,label,object,point:new THREE.Vector3(...point)});object.userData.interactionId=id;}
  function labelDecal(owner,x,y,z,width,height,labelIndex){
    const key=owner.uuid;if(!decals.has(key))decals.set(key,{owner,positions:[],uvs:[]});const data=decals.get(key),u=(labelIndex%8)/8,v=1-Math.floor(labelIndex/8)/4;
    const points=[[x-width/2,y-height/2,z],[x+width/2,y-height/2,z],[x+width/2,y+height/2,z],[x-width/2,y+height/2,z]];
    const textureUV=[[u,v-.25],[u+.125,v-.25],[u+.125,v],[u,v]];
    for(const index of [0,1,2,0,2,3]){data.positions.push(...points[index]);data.uvs.push(...textureUV[index]);}
  }

  // The floor is staggered oak, with physical seams rather than a flat picture.
  const architecture = group('Stone, oak and mortise joints');
  const mortar=standard({color:0x4b4941,roughness:1});
  B(architecture,mortar,0,2.6,-7.19,12.4,5.3,.1);B(architecture,mortar,0,2.6,7.19,12.4,5.3,.1);
  B(architecture,mortar,-6.19,2.6,0,.1,5.3,14.4);
  B(architecture,mortar,6.19,.49,0,.1,.98,14.4);B(architecture,mortar,6.19,4.99,0,.1,.55,14.4);
  B(architecture,mortar,6.19,2.9,-5.71,.1,4.0,2.89);B(architecture,mortar,6.19,2.9,2.98,.1,4.0,8.16);
  B(architecture,darkWood,0,-.14,0,12.45,.22,14.45);
  for(let col=0;col<24;col++) {
    const x=-5.75+col*.5,offset=(col%2)*.86;
    for(let row=-1;row<9;row++) {
      const center=-6.12+row*1.72+offset,front=Math.max(-7,center-.85),back=Math.min(7,center+.85);
      if(back-front<.08)continue;
      const shade=range(.78,1.14),tint=new THREE.Color().setRGB(shade,shade*.965,shade*.91);
      B(architecture,oak,x,-.025,(front+back)/2,.487,.08,back-front,[0,0,0],tint);
      // Iron nail pairs are sparse and flush with the boards.
      if(col%3===0)for(const z of [front+.1,back-.1]) C(architecture,iron,x,.018,z,.012,.004);
    }
  }
  // Individual stone courses have deterministic variation and recessed mortar.
  const insideDoor=(x,y)=>Math.abs(x)<1.03 && y<2.4+Math.sqrt(Math.max(0,1.03**2-x*x));
  const insideWindow=(z,y)=>{const u=z+2.65;return Math.abs(u)<1.48&&y>1.01&&y<3.08+Math.sqrt(Math.max(0,1.48**2-u*u));};
  for(let course=0;course<16;course++) {
    const y=.17+course*.329,shift=(course%2)*.37;
    for(let col=-1;col<18;col++) {
      const x=-5.64+col*.73+shift,left=Math.max(-6.15,x-.355),right=Math.min(6.15,x+.355);
      if(right<=left)continue;
      const tone=range(.82,1.12),tint=new THREE.Color().setRGB(tone,tone*.97,tone*.93);
      B(architecture,stone,(left+right)/2,y,-7.02,right-left,.307,range(.24,.31),[0,0,0],tint);
      if(!insideDoor(x,y))B(architecture,stone,(left+right)/2,y,7.02,right-left,.307,.27,[0,0,0],tint);
    }
    for(let col=-1;col<21;col++) {
      const z=-6.65+col*.73+shift,front=Math.max(-7.15,z-.355),back=Math.min(7.15,z+.355);
      if(back<=front)continue;
      const tone=range(.8,1.12),tint=new THREE.Color().setRGB(tone,tone*.975,tone*.94);
      B(architecture,stone,-6.02,y,(front+back)/2,.28,.307,back-front,[0,0,0],tint);
      if(!insideWindow(z,y))B(architecture,stone,6.02,y,(front+back)/2,.28,.307,back-front,[0,0,0],tint);
    }
  }
  for(const x of [-5.82,5.82])for(const y of [.12,5.09])B(architecture,walnut,x,y,0,.2,.22,14.05);
  for(const z of [-6.87,6.87])B(architecture,walnut,0,5.12,z,12.15,.23,.26);
  for(const x of [-5.78,5.78])for(const z of [-6.7,-.2,6.7]) {
    B(architecture,walnut,x,2.6,z,.31,5.2,.31);
    B(architecture,woodEdge,x,.2,z,.41,.2,.41);
    B(architecture,woodEdge,x,4.92,z,.42,.2,.42);
  }
  // A pitched roof and four authentic-looking timber trusses.
  const pitch=Math.atan2(2.05,6.1),length=Math.hypot(6.1,2.05);
  B(architecture,darkWood,-3.05,6.16,0,length,.16,14.35,[0,0,pitch]);
  B(architecture,darkWood,3.05,6.16,0,length,.16,14.35,[0,0,-pitch]);
  for(const z of [-6.3,-2.2,2.0,6.2]) {
    beam(architecture,[-5.9,5.05,z],[5.9,5.05,z],.25,walnut,.32);
    beam(architecture,[-5.95,5.16,z],[0,7.15,z],.27,walnut,.3);
    beam(architecture,[0,7.15,z],[5.95,5.16,z],.27,walnut,.3);
    beam(architecture,[0,5.08,z],[0,7.07,z],.19,walnut,.22);
    for(const sign of [-1,1]) {
      beam(architecture,[sign*1.7,5.1,z],[sign*3.35,6.03,z],.16,walnut,.18);
      beam(architecture,[sign*5.75,4.12,z],[sign*4.85,5.01,z],.19,walnut,.2);
      for(const x of [sign*5.3,sign*3.0,sign*.25])S(architecture,iron,x,5.05,z+.171,.033,.033,.014);
    }
  }
  for(const x of [-4.3,-2.1,0,2.1,4.3])B(architecture,walnut,x,7.14-Math.abs(x)*.336,0,.14,.18,14.25);
  const gableShape=new THREE.Shape();gableShape.moveTo(-6.15,5.13);gableShape.lineTo(6.15,5.13);gableShape.lineTo(0,7.27);gableShape.closePath();
  const gableGeometry=G(new THREE.ShapeGeometry(gableShape));
  mesh(architecture,gableGeometry,stone,[0,0,-7.03]);
  mesh(architecture,gableGeometry,stone,[0,0,7.03],[1,1,1],[0,Math.PI,0]);

  // Worn carpet: an original woven astronomical border, rendered as a texture.
  const carpetTexture=canvasTexture(1024,(c,s)=>{
    c.fillStyle='#38242a';c.fillRect(0,0,s,s);
    for(let i=0;i<12000;i++){c.fillStyle=i%3?'rgba(194,142,79,.045)':'rgba(0,0,0,.08)';c.fillRect(range(0,s),range(0,s),range(1,4),range(1,7));}
    for(const inset of [20,31,58,76,101]){c.strokeStyle=inset===58?'#8b7149':'#67513b';c.lineWidth=inset===58?11:3;c.strokeRect(inset,inset,s-inset*2,s-inset*2);}
    c.strokeStyle='#856846';c.lineWidth=2;
    for(let i=0;i<20;i++){const x=84+i*45;for(const y of [52,s-52]){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.strokeRect(-9,-9,18,18);c.restore();}for(const x2 of [52,s-52]){c.save();c.translate(x2,x);c.rotate(Math.PI/4);c.strokeRect(-9,-9,18,18);c.restore();}}
    c.translate(s/2,s/2);for(let ringIndex=0;ringIndex<4;ringIndex++){c.beginPath();c.strokeStyle=ringIndex%2?'#72553e':'#8f704a';c.lineWidth=ringIndex===0?4:2;c.arc(0,0,78+ringIndex*36,0,Math.PI*2);c.stroke();}
    for(let i=0;i<16;i++){c.save();c.rotate(i*Math.PI/8);c.beginPath();c.moveTo(0,-175);c.lineTo(12,-48);c.lineTo(0,-21);c.lineTo(-12,-48);c.closePath();c.fillStyle=i%2?'#70523d':'#987247';c.fill();c.restore();}
  });
  const carpet=standard({map:carpetTexture,color:0xbab0a1,roughness:1});
  mesh(root,G(new THREE.PlaneGeometry(5.65,7.35)),carpet,[0,.026,.4],[1,1,1],[-Math.PI/2,0,0]);
  for(const z of [-3.32,4.12])for(let i=0;i<80;i++)B(architecture,paper,-2.73+i*.069,.027,z,.022,.008,.1);

  // Bookcase: fluted uprights, stepped cornices, 200+ individual volumes.
  const shelf=group('The library',root,[-5.63,0,-.75],[0,Math.PI/2,0]);
  const shelfWidth=2.13;
  for(const center of [-2.26,0,2.26]) {
    B(shelf,darkWood,center,2.15,-.17,shelfWidth,4.25,.16);
    for(const x of [center-shelfWidth/2,center+shelfWidth/2]) {
      B(shelf,walnut,x,2.14,.13,.16,4.3,.65);
      B(shelf,woodEdge,x,2.22,.48,.19,3.78,.065);
      for(const k of [-.052,0,.052])B(shelf,walnut,x+k,2.22,.523,.018,3.72,.024);
      B(shelf,woodEdge,x,.28,.21,.29,.19,.85); B(shelf,woodEdge,x,4.15,.19,.29,.15,.84);
      S(shelf,oldGold,x,4.2,.68,.055,.055,.025);
    }
    for(const y of [.24,1.01,1.78,2.55,3.32,4.08]) {
      B(shelf,walnut,center,y,.16,shelfWidth,.105,.73);
      B(shelf,woodEdge,center,y+.01,.55,shelfWidth+.05,.07,.08);
    }
    B(shelf,walnut,center,4.36,.15,shelfWidth+.22,.18,.9);
    B(shelf,woodEdge,center,4.48,.13,shelfWidth+.31,.08,1.0);
    B(shelf,walnut,center,.08,.17,shelfWidth+.2,.15,.87);
    for(let level=0;level<5;level++) {
      let x=center-shelfWidth/2+.16;
      const shelfY=.298+level*.77;
      while(x<center+shelfWidth/2-.19) {
        const width=range(.064,.145),height=range(.42,.64),depth=range(.31,.44),material=bookMaterials[Math.floor(random()*bookMaterials.length)];
        if(x+width>center+shelfWidth/2-.13)break;
        const centerX=x+width/2,z=.34+range(-.025,.025);
        B(shelf,pageEdges,centerX,shelfY+height/2,z-.007,width-.017,height-.028,depth-.035);
        for(const sign of [-1,1])B(shelf,material,centerX+sign*(width/2-.005),shelfY+height/2,z,.009,height,depth);
        B(shelf,material,centerX,shelfY+height/2,z+depth/2+.003,width,height,.025);
        // Raised leather bands and thin gilt tooling make the spines readable.
        for(const by of [.1,height-.08])B(shelf,oldGold,centerX,shelfY+by,z+depth/2+.018,width*.9,.012,.01);
        labelDecal(shelf,centerX,shelfY+height*.52,z+depth/2+.017,width*.86,height*.61,Math.floor(random()*32));
        x+=width+range(.009,.024);
      }
    }
    // Sun-and-moon finials above each section.
    C(shelf,brass,center,4.57,.15,.065,.12); S(shelf,oldGold,center,4.69,.15,.1);
  }
  // A brass rolling ladder and rail, visually separate from the collision box.
  C(shelf,brass,0,3.7,.89,.025,6.7,[0,0,Math.PI/2]);
  const ladder=group('Library ladder',shelf,[1.35,0,1.04],[-.08,0,0]);
  for(const x of [-.3,.3])B(ladder,walnut,x,1.82,0,.085,3.6,.1);
  for(let i=0;i<11;i++)B(ladder,woodEdge,0,.2+i*.31,.03,.66,.055,.13);
  collider(-5.18,-.75,1.43,6.94);
  interact('shelf','翻阅书架',shelf,[-4.82,1.75,-1.1]);

  // Hearth, voussoir arch, carved mantle and copper celestial clock.
  const fire=group('The hearth',root,[0,0,-6.43]);
  B(fire,dressedStone,0,.12,.05,3.8,.23,1.38);
  B(fire,soot,0,1.12,-.3,2.05,2.0,.14);
  B(fire,soot,0,.32,.12,2.25,.2,.95);
  for(const x of [-1.34,1.34]) {
    B(fire,dressedStone,x,1.12,.05,.55,1.85,.83);
    B(fire,dressedStone,x,.32,.08,.74,.2,1.0);
    B(fire,dressedStone,x,1.99,.03,.73,.18,.98);
    for(let i=0;i<5;i++)B(fire,stone,x,.55+i*.29,.48,.5,.015,.018);
    for(const ox of [-.15,.15])B(fire,dressedStone,x+ox,1.17,.49,.055,1.19,.05);
  }
  for(let i=0;i<13;i++) {
    const angle=i*Math.PI/12,r=1.1;
    B(fire,dressedStone,Math.cos(angle)*r,1.56+Math.sin(angle)*r,.1,.305,.39,.83,[0,0,angle-Math.PI/2]);
  }
  B(fire,dressedStone,0,2.91,.02,3.7,.19,1.11);
  B(fire,dressedStone,0,2.77,.02,3.46,.12,1.0);
  B(fire,stone,0,3.61,-.13,2.88,1.27,.38);
  for(const x of [-1.45,1.45])B(fire,woodEdge,x,2.99,.08,.22,.06,.76);
  for(let i=0;i<7;i++) {
    const x=-.76+i*.25;
    C(fire,darkWood,x,.42,.19,.105,range(.73,1.18),[Math.PI/2,range(-.4,.4),Math.PI/2+range(-.3,.3)]);
    const emberMaterial=standard({color:0x511905,emissive:0xb72b02,emissiveIntensity:range(.35,.8),roughness:1});
    embers.push({material:emberMaterial,intensity:emberMaterial.emissiveIntensity});
    S(fire,emberMaterial,x,.41,.42,.09,.04,.09);
  }
  const flameGeometry=G(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.11,.035),new THREE.Vector2(.14,.16),new THREE.Vector2(.085,.33),new THREE.Vector2(.035,.51),new THREE.Vector2(0,.66)],12));
  const fireOuterInstances=new THREE.InstancedMesh(flameGeometry,flameOuter,13),fireInnerInstances=new THREE.InstancedMesh(flameGeometry,flameInner,13);
  fireOuterInstances.name='Instanced hearth flames';fireInnerInstances.name='Instanced flame cores';
  fireOuterInstances.frustumCulled=fireInnerInstances.frustumCulled=false;
  animated.add(fireOuterInstances,fireInnerInstances);hearthFlames.push(fireOuterInstances,fireInnerInstances);
  for(let i=0;i<13;i++)fireAnimation.push({x:range(-.83,.83),y:.45,z:-6.19+range(-.2,.21),sx:range(.8,1.5),sy:range(.65,1.5),sz:range(.7,1.2),phase:range(0,9)});
  function updateHearthFlames(time){
    fireAnimation.forEach((flame,index)=>{
      const flutter=reduced?1:1+Math.sin(time*7.3+flame.phase)*.08+Math.sin(time*11.1+flame.phase)*.035;
      temp.position.set(flame.x,flame.y,flame.z);temp.rotation.set(0,0,reduced?0:Math.sin(time*3.7+flame.phase)*.045);temp.scale.set(flame.sx,flame.sy*flutter,flame.sz);temp.updateMatrix();fireOuterInstances.setMatrixAt(index,temp.matrix);
      temp.position.z+=.015;temp.scale.set(.43,.58*flutter,.43);temp.updateMatrix();fireInnerInstances.setMatrixAt(index,temp.matrix);
    });fireOuterInstances.instanceMatrix.needsUpdate=true;fireInnerInstances.instanceMatrix.needsUpdate=true;
  }
  updateHearthFlames(0);
  for(const x of [-.87,.87]) { C(fire,iron,x,.42,.58,.035,.55);S(fire,iron,x,.71,.58,.065); }
  for(let i=0;i<8;i++)C(fire,iron,-.9+i*.255,.46,.61,.014,.45);
  B(fire,iron,0,.28,.61,2.05,.035,.05);
  const hearthLight=new THREE.PointLight(0xffa451,34,9,2);hearthLight.position.set(0,1.1,-5.83);root.add(hearthLight);
  collider(0,-6.05,3.8,1.35); interact('fire','壁炉旁坐一会儿',fire,[0,1.4,-5.92]);

  function circularChart(owner,x,y,z,radius=.7) {
    const chartTexture=canvasTexture(512,(c,s)=>{
      c.fillStyle='#13212d';c.fillRect(0,0,s,s);c.translate(s/2,s/2);c.strokeStyle='#aa925f';c.lineWidth=2;
      for(const r of [92,150,206,227]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();}
      for(let i=0;i<60;i++){const a=i*Math.PI/30;c.beginPath();c.moveTo(Math.cos(a)*(i%5?215:204),Math.sin(a)*(i%5?215:204));c.lineTo(Math.cos(a)*228,Math.sin(a)*228);c.stroke();}
      for(let i=0;i<65;i++){const a=range(0,Math.PI*2),r=Math.sqrt(random())*190;c.fillStyle=i%3?'#c7c6b6':'#e3c58a';c.beginPath();c.arc(Math.cos(a)*r,Math.sin(a)*r,range(.7,2.3),0,Math.PI*2);c.fill();}
      c.strokeStyle='rgba(178,172,130,.45)';c.lineWidth=1;for(let i=0;i<12;i++){c.beginPath();c.moveTo(range(-130,130),range(-130,130));c.lineTo(range(-130,130),range(-130,130));c.stroke();}
    });
    mesh(owner,G(new THREE.CircleGeometry(radius,64)),standard({map:chartTexture,roughness:.65,metalness:.12}),[x,y,z]);
    batch(owner,ring,brass,[x,y,z+.01],[radius,radius,radius]);
    batch(owner,ring,walnut,[x,y,z-.02],[radius*1.09,radius*1.09,radius*1.09]);
  }
  circularChart(fire,0,3.68,.1,.61);
  for(const x of [-1.35,1.35]) {C(fire,brass,x,3.16,.08,.12,.33);C(fire,brass,x,3.37,.08,.17,.08);S(fire,brass,x,3.5,.08,.085,.13,.085);}

  // The arch really opens in the masonry; its painted night contains depth cues.
  const windowGroup=group('Moonlit arched window',root,[5.92,0,-2.65],[0,-Math.PI/2,0]);
  const nightTexture=canvasTexture(1024,(c,s)=>{
    const sky=c.createLinearGradient(0,0,0,s);sky.addColorStop(0,'#09112a');sky.addColorStop(.65,'#213650');sky.addColorStop(1,'#5b6371');c.fillStyle=sky;c.fillRect(0,0,s,s);
    for(let i=0;i<250;i++){c.beginPath();c.fillStyle=`rgba(230,237,245,${range(.2,.85)})`;c.arc(range(0,s),range(0,s*.77),range(.45,1.5),0,Math.PI*2);c.fill();}
    const halo=c.createRadialGradient(720,245,25,720,245,200);halo.addColorStop(0,'rgba(187,212,245,.28)');halo.addColorStop(1,'transparent');c.fillStyle=halo;c.fillRect(0,0,s,s);
    c.fillStyle='#d5dfec';c.beginPath();c.arc(720,245,55,0,Math.PI*2);c.fill();c.fillStyle='rgba(140,160,185,.2)';for(let i=0;i<12;i++){c.beginPath();c.arc(range(689,752),range(210,276),range(2,9),0,Math.PI*2);c.fill();}
    for(let layer=0;layer<4;layer++){c.beginPath();c.moveTo(0,s);for(let x=0;x<=s;x+=25)c.lineTo(x,695+layer*62+Math.sin(x*.007+layer)*52+Math.sin(x*.022+layer)*21);c.lineTo(s,s);c.closePath();c.fillStyle=['#354457','#29394c','#1c2d40','#112334'][layer];c.fill();}
    c.fillStyle='#152535';for(const [x,y,w,h] of [[168,749,31,108],[216,715,39,145],[268,756,25,100]]){c.fillRect(x,y,w,h);c.beginPath();c.moveTo(x-7,y);c.lineTo(x+w/2,y-41);c.lineTo(x+w+7,y);c.closePath();c.fill();}
    c.fillStyle='rgba(227,176,85,.7)';for(const x of [180,227,280])for(const y of [778,800,822])c.fillRect(x,y,4,7);
    // Fine glass patina prevents the window from looking like a flat monitor.
    for(let i=0;i<170;i++){c.strokeStyle='rgba(188,210,225,.025)';c.beginPath();c.moveTo(range(0,s),0);c.lineTo(range(0,s),s);c.stroke();}
  });
  const nightMat=basic({map:nightTexture,color:0xb5c6e6,side:THREE.DoubleSide});
  const dayTexture=canvasTexture(1024,(c,s)=>{
    const sky=c.createLinearGradient(0,0,0,s);sky.addColorStop(0,'#87a7bc');sky.addColorStop(.65,'#e7d8b9');sky.addColorStop(1,'#b5ae90');c.fillStyle=sky;c.fillRect(0,0,s,s);
    const sun=c.createRadialGradient(720,245,20,720,245,170);sun.addColorStop(0,'rgba(255,243,208,.9)');sun.addColorStop(.18,'rgba(255,243,208,.7)');sun.addColorStop(1,'transparent');c.fillStyle=sun;c.fillRect(0,0,s,s);
    for(let layer=0;layer<4;layer++){c.beginPath();c.moveTo(0,s);for(let x=0;x<=s;x+=25)c.lineTo(x,695+layer*62+Math.sin(x*.007+layer)*52+Math.sin(x*.022+layer)*21);c.lineTo(s,s);c.closePath();c.fillStyle=['#8e9f9f','#81948b','#6e8171','#566e59'][layer];c.fill();}
    c.fillStyle='#536666';for(const [x,y,w,h] of [[168,749,31,108],[216,715,39,145],[268,756,25,100]]){c.fillRect(x,y,w,h);c.beginPath();c.moveTo(x-7,y);c.lineTo(x+w/2,y-41);c.lineTo(x+w+7,y);c.closePath();c.fill();}
  });
  const windowGeometry=G(new THREE.ShapeGeometry(archShape(2.9,1.0,3.08),32));
  // ShapeGeometry has unnormalised UVs, so explicitly map the painted view.
  const uv=windowGeometry.attributes.uv,pos=windowGeometry.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+1.45)/2.9,(pos.getY(i)-1)/3.53);
  uv.needsUpdate=true;
  mesh(windowGroup,windowGeometry,nightMat,[0,0,-.06]);
  for(const x of [-1.53,1.53]) {
    B(windowGroup,dressedStone,x,2.06,.02,.22,2.25,.42);
    for(let i=0;i<7;i++)B(windowGroup,dressedStone,x,1.17+i*.305,.07,.29,.269,.5);
  }
  for(let i=0;i<19;i++){const angle=i*Math.PI/18;B(windowGroup,dressedStone,Math.cos(angle)*1.55,3.08+Math.sin(angle)*1.55,.03,.235,.27,.45,[0,0,angle-Math.PI/2]);}
  B(windowGroup,dressedStone,0,.99,.18,3.49,.18,.85);
  for(const x of [-.51,.51])B(windowGroup,iron,x,2.45,.12,.043,2.92,.08);
  B(windowGroup,iron,0,2.38,.12,2.88,.047,.08);
  const archPoints=[];for(let i=0;i<=32;i++){const angle=i*Math.PI/32;archPoints.push([Math.cos(angle)*1.39,3.08+Math.sin(angle)*1.39,.13]);}
  lineTube(windowGroup,archPoints,.035,iron,48);
  lineTube(windowGroup,[[-1.08,3.76,.13],[0,2.45,.13],[1.08,3.76,.13]],.025,iron,24);
  // Moonbeams are thin translucent planes, not an opaque screen overlay.
  const moonShaft=basic({color:0xb7d1ef,transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false});
  mesh(root,G(new THREE.PlaneGeometry(5.7,1.15)),moonShaft,[3.01,2.18,-2.65],[1,1,1],[0,0,-.47]).castShadow=false;
  interact('window','望向月夜',windowGroup,[5.45,2.55,-2.65]);
  const windowSeat=group('Deep window seat',root,[5.1,0,-2.65],[0,Math.PI/2,0]);
  B(windowSeat,walnut,0,.28,0,3.12,.5,.95);B(windowSeat,woodEdge,0,.51,0,3.2,.07,1.0);
  mesh(windowSeat,rounded(3.02,.1,.88,.055),leather,[0,.59,0]);
  for(const x of [-1.18,0,1.18]){B(windowSeat,woodEdge,x,.27,.493,.99,.37,.035);B(windowSeat,walnut,x,.27,.52,.88,.27,.02);S(windowSeat,brass,x,.29,.548,.026);}
  for(const x of [-1.2,1.2])mesh(windowSeat,rounded(.49,.34,.16,.09),leather,[x,.8,-.3],[1,1,1],[.12,0,x*.12]);
  collider(5.1,-2.65,1.08,3.25);

  // Desk is placed on the right, leaving a clear central walking route.
  const desk=group('The writing desk',root,[2.72,0,-.28],[0,-.12,0]);
  const topGeo=rounded(2.9,.15,1.42,.045);
  mesh(desk,topGeo,walnut,[0,.98,0]);
  B(desk,woodEdge,0,.885,0,2.99,.047,1.48);
  B(desk,leather,0,1.065,.03,1.64,.014,.87);
  for(const x of [-1.16,1.16])for(const z of [-.49,.49]) {
    C(desk,walnut,x,.44,z,.085,.78);
    for(const y of [.17,.34,.66,.78])C(desk,woodEdge,x,y,z,.105,.045);
    S(desk,walnut,x,.1,z,.12,.09,.12);
  }
  for(const x of [-1.07,1.07])B(desk,walnut,x,.78,0,.52,.21,1.13);
  for(const x of [-1.07,1.07]) {B(desk,woodEdge,x,.78,.586,.43,.14,.04);S(desk,brass,x,.78,.62,.03);}
  B(desk,walnut,0,.52,-.43,2.48,.09,.09);
  for(const x of [-1.12,1.12])B(desk,walnut,x,.5,0,.07,.09,1.0);
  // An open manuscript with ruled paragraphs and a hand-drawn orbital diagram.
  const manuscript=canvasTexture(1024,(c,s)=>{
    c.fillStyle='#d8c8a6';c.fillRect(0,0,s,s);
    for(let i=0;i<10000;i++){c.fillStyle='rgba(93,66,38,.025)';c.fillRect(range(0,s),range(0,s),range(1,5),range(1,3));}
    c.strokeStyle='#8b7453';c.lineWidth=2;c.strokeRect(50,48,924,928);c.strokeRect(63,61,898,902);
    c.fillStyle='#4a4339';c.font='italic 36px Georgia, serif';c.fillText('Ad astra · per scientiam',106,126);
    for(let row=0;row<15;row++){let x=105;const y=181+row*25;while(x<900){const w=range(14,65);c.fillStyle=`rgba(58,51,41,${range(.35,.6)})`;c.fillRect(x,y,w,range(1,2));x+=w+range(7,15);}}
    c.save();c.translate(510,745);c.strokeStyle='#665b47';c.lineWidth=2;for(const r of [55,97,144]){c.beginPath();c.ellipse(0,0,r,r*.63,-.2,0,Math.PI*2);c.stroke();}for(let i=0;i<7;i++){const a=i*2.39;c.beginPath();c.arc(Math.cos(a)*145,Math.sin(a)*89,4,0,Math.PI*2);c.fill();}c.restore();
  });
  const pageMaterial=standard({map:manuscript,roughness:.94,side:THREE.DoubleSide});
  const openBook=group('An open field journal',desk,[-.12,1.077,.04],[0,.06,0]);
  B(openBook,leather,0,.017,0,1.08,.035,.72);
  for(const side of [-1,1]) {
    B(openBook,paper,side*.265,.052,0,.52,.047,.68,[0,0,side*.04]);
    const curvedPage=G(new THREE.PlaneGeometry(.515,.675,12,12)),pagePositions=curvedPage.attributes.position;
    for(let p=0;p<pagePositions.count;p++){const x=pagePositions.getX(p),y=pagePositions.getY(p);pagePositions.setZ(p,.018*Math.sin((x+.258)/.516*Math.PI)+Math.pow(Math.max(0,Math.abs(x)-.19)*10,2)*.012+Math.sin(y*8)*.002);}
    curvedPage.computeVertexNormals();mesh(openBook,curvedPage,pageMaterial,[side*.265,.078,0],[1,1,1],[-Math.PI/2,0,side*.025]);
  }
  // Curled parchment and scroll knobs.
  B(desk,paper,.73,1.081,-.29,.52,.013,.49,[0,.16,0]);
  for(const z of [-.54,-.05]) {C(desk,paper,.73,1.1,z,.035,.59,[0,0,Math.PI/2]);for(const x of [.41,1.05])S(desk,walnut,x,1.1,z,.045);}
  C(desk,ink,-.94,1.13,.19,.09,.13);C(desk,brass,-.94,1.205,.19,.079,.022);
  const quill=group('Quill and ink',desk,[-.94,1.18,.19],[.08,0,-.44]);
  C(quill,brass,0,.16,0,.008,.42);
  const feather=G(new THREE.SphereGeometry(1,12,8));
  batch(quill,feather,paper,[.018,.36,0],[.054,.21,.009],[0,0,-.16]);
  for(let i=0;i<11;i++)beam(quill,[0,.23+i*.023,.009],[.04+Math.sin(i*.21)*.02,.265+i*.023,.009],.0025,woodEdge,.0025);
  // A small stack, a wax seal and a brass magnifier.
  for(let i=0;i<3;i++) {B(desk,bookMaterials[i],-.92,1.1+i*.07,-.36,.47,.063,.42,[0,.13-i*.09,0]);B(desk,paper,-.92,1.1+i*.07,-.351,.43,.043,.4,[0,.13-i*.09,0]);}
  C(desk,bookMaterials[5],.45,1.09,.43,.053,.012);
  batch(desk,ring,brass,[.85,1.09,.38],[.12,.12,.12],[-Math.PI/2,0,0]);
  B(desk,walnut,1.04,1.09,.42,.23,.025,.037,[0,-.26,0]);
  // Upholstered chair, angled into the desk, with a carved back.
  const chair=group('Reading chair',root,[2.78,0,1.14],[0,Math.PI-.1,0]);
  mesh(chair,rounded(.76,.12,.74,.03),walnut,[0,.49,0]);mesh(chair,rounded(.67,.07,.62,.04),leather,[0,.568,.025]);
  for(const x of [-.3,.3])for(const z of [-.29,.29])B(chair,walnut,x,.245,z,.07,.49,.07);
  for(const x of [-.32,.32])B(chair,walnut,x,1.02,-.3,.075,.98,.075);
  mesh(chair,rounded(.78,.14,.12,.04),walnut,[0,1.45,-.3]);mesh(chair,rounded(.54,.51,.065,.045),leather,[0,1.115,-.3]);
  for(const x of [-.15,0,.15])B(chair,woodEdge,x,1.13,-.345,.029,.52,.027);
  collider(2.72,-.28,3.14,1.86);collider(2.78,1.14,.95,.95);
  interact('desk','打开书桌手记',desk,[2.45,1.1,.16]);

  function candle(owner,x,y,z,height=.31) {
    C(owner,brass,x,y+.025,z,.11,.05);C(owner,brass,x,y+.11,z,.027,.16);C(owner,brass,x,y+.2,z,.075,.045);
    C(owner,wax,x,y+.22+height/2,z,.044,height);
    for(let i=0;i<3;i++){const a=i*2.1;S(owner,wax,x+Math.cos(a)*.039,y+.18+height-range(.02,.13),z+Math.sin(a)*.039,.011,.05,.012);}
    const flame=mesh(owner,flameGeometry,flameInner,[x,y+.22+height,z],[.24,.24,.24]);flame.castShadow=false;
    flickers.push({object:flame,phase:range(0,9),scale:.24});
  }
  candle(desk,1.12,1.07,-.39,.35);
  const deskLight=new THREE.PointLight(0xffc176,7,4.5,2);deskLight.position.set(3.79,1.84,-.83);root.add(deskLight);
  // Small glass, paper and metal details reward walking up to the desk.
  const glass=standard({color:0x43635f,transparent:true,opacity:.42,roughness:.14,metalness:.08,side:THREE.DoubleSide,depthWrite:false});
  const bottleGeometry=G(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.066,.01),new THREE.Vector2(.072,.14),new THREE.Vector2(.035,.19),new THREE.Vector2(.025,.23),new THREE.Vector2(.025,.28)],20));
  mesh(desk,bottleGeometry,glass,[1.08,1.07,.37]);C(desk,woodEdge,1.08,1.36,.37,.029,.035);
  B(desk,paper,.68,1.085,.44,.13,.006,.1,[0,.12,0]);
  for(const x of [-1.12,1.12])for(const z of [-.57,.57])S(desk,brass,x,.938,z,.014,.014,.008);

  // The original institutional and Boyi marks are supplied by the host.
  // A missing source texture leaves an undecorated plaque, never a fake crest.
  const ivory=standard({color:0xd9cfb8,roughness:.72});
  const emblemPanel=group('Original school and Boyi dual emblems',root,[0,4.48,-6.68]);
  mesh(emblemPanel,rounded(2.55,.86,.12,.06),walnut);
  mesh(emblemPanel,rounded(2.38,.7,.02,.035),ivory,[0,0,.077]);
  for(const x of [-1.17,1.17])for(const y of [-.31,.31])S(emblemPanel,brass,x,y,.101,.025,.025,.014);
  const logoMaterials=new Map();let originalLogoCount=0;
  function originalLogo(texture,owner,x,y,z,w,h,rotation=[0,0,0]){
    if(!texture)return;
    let material=logoMaterials.get(texture.uuid);
    if(!material){const image=borrowedTexture(texture);image.wrapS=image.wrapT=THREE.ClampToEdgeWrapping;image.colorSpace=THREE.SRGBColorSpace;material=standard({map:image,color:0xffffff,roughness:.8,transparent:true,alphaTest:.025,side:THREE.DoubleSide});logoMaterials.set(texture.uuid,material);originalLogoCount++;}
    const image=texture.image,aspect=image?.width&&image?.height?image.width/image.height:1;
    const fw=Math.min(w,h*aspect),fh=fw/aspect;
    const badge=mesh(owner,G(new THREE.PlaneGeometry(fw,fh)),material,[x,y,z],[1,1,1],rotation);badge.castShadow=false;badge.userData.originalBrandAsset=true;
  }
  originalLogo(textures.schoolLogo,emblemPanel,-.6,0,.125,.61,.61);
  originalLogo(textures.boyiLogo,emblemPanel,.6,0,.125,.64,.61);
  C(desk,ivory,.58,1.087,.43,.145,.013);batch(desk,ring,brass,[.58,1.094,.43],[.15,.15,.15],[-Math.PI/2,0,0]);
  originalLogo(textures.schoolLogo,desk,.58,1.099,.43,.24,.24,[-Math.PI/2,0,0]);

  // A travelled trunk and a reading armchair make the rear half worth exploring.
  const trunk=group('Travelling trunk',root,[-3.33,0,4.65],[0,.15,0]);
  mesh(trunk,rounded(1.45,.65,.85,.045),walnut,[0,.36,0]);
  mesh(trunk,rounded(1.48,.19,.88,.065),leather,[0,.76,0]);
  for(const x of [-.49,.49]){B(trunk,iron,x,.41,.448,.075,.66,.032);B(trunk,iron,x,.868,0,.075,.025,.81);}
  B(trunk,brass,0,.57,.465,.15,.19,.025);S(trunk,iron,0,.58,.485,.021,.033,.012);
  for(const x of [-.67,.67])for(const y of [.12,.65]){B(trunk,brass,x,y,.451,.1,.09,.02);S(trunk,iron,x,y,.468,.014,.014,.007);}
  collider(-3.33,4.65,1.6,1.08);
  const armchair=group('Fireside reading armchair',root,[3.9,0,4.95],[0,-.42,0]);
  const greenLeather=standard({color:0x283d36,map:leatherGrain,roughness:.7});
  mesh(armchair,rounded(1.03,.24,.92,.065),walnut,[0,.39,0]);mesh(armchair,rounded(.91,.16,.82,.075),greenLeather,[0,.57,.035]);
  mesh(armchair,rounded(.92,1.05,.17,.075),greenLeather,[0,1.1,-.34],[1,1,1],[-.12,0,0]);
  for(const x of [-.54,.54]){mesh(armchair,rounded(.16,.16,.96,.055),walnut,[x,.88,.02]);for(const z of [-.31,.33])B(armchair,walnut,x,.64,z,.07,.44,.07);}
  for(const x of [-.38,.38])for(const z of [-.31,.31])B(armchair,walnut,x,.18,z,.09,.35,.09);
  for(const x of [-.25,0,.25])for(const y of [.97,1.22])S(armchair,brass,x,y,-.221,.018,.018,.008);
  collider(3.9,4.95,1.47,1.42);

  // Freestanding armillary sphere and telescope add scholarly, nautical cues.
  const armillary=group('Brass armillary',root,[4.56,0,2.52]);
  for(const x of [-.23,.23])for(const z of [-.23,.23])beam(armillary,[x*1.65,.02,z*1.65],[x,.9,z],.055,walnut);
  C(armillary,walnut,0,.91,0,.43,.08);C(armillary,brass,0,1.13,0,.06,.38);
  for(const [rotation,r] of [[[0,0,.38],.49],[[Math.PI/2,0,0],.48],[[0,Math.PI/2,0],.48],[[.6,.8,.1],.44]])batch(armillary,ring,brass,[0,1.73,0],[r,r,r],rotation);
  S(armillary,oldGold,0,1.73,0,.18);beam(armillary,[-.19,1.15,0],[.19,2.3,0],.018,brass);
  collider(4.56,2.52,.86,.86);
  const telescope=group('Telescope',root,[4.63,0,-4.98],[0,.32,0]);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;beam(telescope,[Math.cos(a)*.48,.03,Math.sin(a)*.48],[0,1.28,0],.035,brass);}
  const telescopeTube=group('Optical tube',telescope,[0,1.5,0],[Math.PI/2-.28,0,.2]);
  C(telescopeTube,brass,0,0,0,.1,1.12);C(telescopeTube,iron,0,.6,0,.105,.06);C(telescopeTube,oldGold,0,-.6,0,.06,.14);
  C(telescopeTube,basic({color:0x193449}),0,.636,0,.084,.008);
  collider(4.63,-4.98,1,1);

  // Three small framed astronomical drawings break up blank stone surfaces.
  const charts=group('Charts and travelling memories',root,[3.48,0,-6.77]);
  for(let i=0;i<2;i++) {
    const x=i?1.01:-.48,y=i?2.95:3.69,w=i?.77:1.18,h=i?1.02:.85;
    B(charts,walnut,x,y,0,w+.13,h+.13,.08);
    B(charts,brass,x,y,.048,w+.035,h+.035,.013);
    const chart=canvasTexture(512,(c,s)=>{
      c.fillStyle='#b9a680';c.fillRect(0,0,s,s);c.strokeStyle='#645a48';c.lineWidth=2;
      for(let line=0;line<11;line++){c.beginPath();c.ellipse(s/2,s/2,30+line*17,120+line*4,line*.11,0,Math.PI*2);c.stroke();}
      for(let n=0;n<40;n++){c.beginPath();c.arc(range(45,470),range(45,470),range(1,3),0,Math.PI*2);c.fillStyle='#4d4b40';c.fill();}
      c.strokeStyle='#77664c';c.lineWidth=5;c.strokeRect(19,19,s-38,s-38);
    });
    mesh(charts,G(new THREE.PlaneGeometry(w,h)),standard({map:chart,roughness:.92}),[x,y,.06]);
  }

  // Back door: curved oak planks, forged hinges and a real, raycastable handle.
  const door=group('Door to Boyi',root,[0,0,6.96],[0,Math.PI,0]);
  const doorPanel=G(new THREE.ExtrudeGeometry(archShape(2.02,.06,2.41),{depth:.12,steps:1,bevelEnabled:true,bevelSegments:2,bevelThickness:.016,bevelSize:.015,curveSegments:24}));
  mesh(door,doorPanel,walnut,[0,0,-.02]);
  for(let i=-3;i<=3;i++) {
    const x=i*.254,top=2.41+Math.sqrt(Math.max(0,1.01**2-x*x));
    B(door,darkWood,x,top/2,.109,.011,top-.06,.016);
  }
  for(const x of [-1.13,1.13])B(door,dressedStone,x,1.26,0,.22,2.53,.42);
  for(let i=0;i<17;i++){const a=i*Math.PI/16;B(door,dressedStone,Math.cos(a)*1.13,2.41+Math.sin(a)*1.13,0,.23,.26,.43,[0,0,a-Math.PI/2]);}
  for(const y of [.45,1.92]) {B(door,iron,-.46,y,.137,1.01,.09,.036);for(const x of [-.86,-.53,-.18])S(door,iron,x,y,.17,.022,.022,.013);}
  batch(door,ring,brass,[.64,1.25,.19],[.1,.1,.1]);S(door,brass,.64,1.36,.17,.046,.06,.021);
  B(door,brass,0,2.45,.15,.62,.25,.025);
  const plaqueTexture=canvasTexture(512,(c,s)=>{c.fillStyle='#68422b';c.fillRect(0,0,s,s);c.strokeStyle='#b49b68';c.lineWidth=8;c.strokeRect(15,15,s-30,s-30);c.fillStyle='#dfcea9';c.textAlign='center';c.font='52px Georgia, serif';c.fillText('BOYI',s/2,235);c.font='29px Georgia, serif';c.fillText('THE STUDY',s/2,308);});
  mesh(door,G(new THREE.PlaneGeometry(.56,.19)),standard({map:plaqueTexture,roughness:.6}),[0,2.45,.168]);
  interact('door','回到博医造物',door,[0,1.6,6.66]);

  // Chandelier: warm wax, blackened brass and a single shadow-casting light.
  const chandelier=group('A circle of candlelight',root,[0,4.35,1.25]);
  for(let i=0;i<10;i++)batch(chandelier,ring,iron,[0,.3+i*.13,0],[.06,.09,.06],[0,i%2?Math.PI/2:0,0]);
  batch(chandelier,ring,iron,[0,0,0],[1.19,1.19,1.19],[Math.PI/2,0,0]);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*1.18,z=Math.sin(a)*1.18;beam(chandelier,[0,.19,0],[x,-.07,z],.023,iron);candle(chandelier,x,-.07,z,.28);}
  S(chandelier,brass,0,.16,0,.1,.18,.1);
  const keyLight=new THREE.PointLight(0xffcf91,92,19,2);keyLight.position.set(0,3.72,1.25);keyLight.castShadow=true;
  keyLight.shadow.mapSize.set(quality==='high'?2048:1024,quality==='high'?2048:1024);
  keyLight.shadow.camera.near=.25;keyLight.shadow.camera.far=20;keyLight.shadow.bias=-.00045;keyLight.shadow.normalBias=.035;keyLight.shadow.radius=3;
  // Furniture is static. Reuse its six-face shadow atlas after the first frame;
  // moving translucent flame/wing details deliberately cast no dynamic shadow.
  keyLight.shadow.autoUpdate=false;keyLight.shadow.needsUpdate=true;
  root.add(keyLight);
  const skyFill=new THREE.HemisphereLight(0x9fbad4,0x3e2e21,1.15);root.add(skyFill);
  const warmFill=new THREE.AmbientLight(0xd4bca1,.24);root.add(warmFill);
  const moon=new THREE.DirectionalLight(0xb6cce9,1.6);moon.position.set(7,6,-3);moon.target.position.set(-1,.4,.6);root.add(moon,moon.target);

  // The cloud companion becomes a quiet, winged spirit. All motion is local.
  const fairy=createBoyiFairy(THREE,animated,{reduced,colliders});
  interactables.push(fairy.interactable);

  // A handful of motes, not a large particle simulation or full-screen effect.
  const moteCount=quality==='high'?96:56,positions=new Float32Array(moteCount*3),moteBase=[];
  for(let i=0;i<moteCount;i++){const p=[range(-4.6,4.8),range(.4,4.8),range(-5.7,5.9)];moteBase.push(p);positions.set(p,i*3);}
  const moteGeometry=G(new THREE.BufferGeometry());moteGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const motes=new THREE.Points(moteGeometry,M(new THREE.PointsMaterial({color:0xd0b996,size:.014,transparent:true,opacity:.43,depthWrite:false,sizeAttenuation:true})));animated.add(motes);

  // Submit static furniture by shared material and geometry. Interaction groups
  // retain their InstancedMesh descendants, so raycasting hits real objects.
  let instances=0,instanceDraws=0;
  for(const entry of batches.values()) {
    if(!entry.items.length)continue;
    const item=new THREE.InstancedMesh(entry.geometry,entry.material,entry.items.length);
    item.name=`${entry.owner.name} · ${entry.material.type}`;item.castShadow=true;item.receiveShadow=true;
    entry.items.forEach((entryItem,index)=>{item.setMatrixAt(index,entryItem.matrix);if(entryItem.tint)item.setColorAt(index,entryItem.tint);});
    item.instanceMatrix.needsUpdate=true;if(item.instanceColor)item.instanceColor.needsUpdate=true;
    item.computeBoundingSphere();entry.owner.add(item);instances+=entry.items.length;instanceDraws++;
  }
  batches.clear();
  for(const data of decals.values()){
    const geometry=G(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uvs,2));geometry.computeVertexNormals();
    const titleMesh=mesh(data.owner,geometry,bookLabelMaterial);titleMesh.castShadow=false;
  }
  decals.clear();
  let triangleEstimate=0,meshCount=0,drawEstimate=0;
  root.traverse(object=>{if(object.isMesh){const g=object.geometry;const count=(g.index?g.index.count:g.attributes.position.count)/3;triangleEstimate+=count*(object.isInstancedMesh?object.count:1);meshCount++;drawEstimate+=Array.isArray(object.material)?object.material.length:1;}});
  const stats={sceneKind:'private-cottage',geometryTriangles:Math.round(triangleEstimate),meshObjects:meshCount,staticInstances:instances,staticInstanceDraws:instanceDraws,estimatedMainPassDrawCalls:drawEstimate+1,shadowLights:1,interactions:interactables.length,seed:'42b09e31',rendererMeasured:false,originalLogoCount};
  Object.defineProperties(stats,{spriteFollowing:{enumerable:true,get:()=>fairy.stats.spriteFollowing},spriteGestureCount:{enumerable:true,get:()=>fairy.stats.spriteGestureCount}});
  let elapsed=0,fireEnabled=true,nightEnabled=true;
  return {
    root,colliders,interactables,spawn:{x:0,y:1.65,z:4.5,yaw:0},stats,
    setViewerPose(pose={}){fairy.setViewerPose(pose);},
    setSpriteState(state='idle'){fairy.setSpriteState(state);},
    setFireEnabled(enabled=true) {
      fireEnabled=Boolean(enabled);
      hearthFlames.forEach(object=>{object.visible=fireEnabled;});
      embers.forEach(({material,intensity})=>{material.emissiveIntensity=fireEnabled?intensity:0;});
      hearthLight.intensity=fireEnabled?34:0;
    },
    setNightMode(enabled=true) {
      nightEnabled=Boolean(enabled);nightMat.map=nightEnabled?nightTexture:dayTexture;nightMat.color.setHex(nightEnabled?0xb5c6e6:0xe2dfcf);nightMat.needsUpdate=true;
      moon.color.setHex(nightEnabled?0xb6cce9:0xffe0aa);moon.intensity=nightEnabled?1.6:2.35;
      skyFill.color.setHex(nightEnabled?0x9fbad4:0xb6cbd2);skyFill.intensity=nightEnabled?1.15:1.45;
      warmFill.intensity=nightEnabled?.24:.34;
    },
    update(seconds,dt=0) {
      if(disposed)return;
      elapsed=Number.isFinite(seconds)?seconds:elapsed+Math.min(dt,.05);
      const t=elapsed;
      fairy.update(t,dt);
      if(!reduced) {
        for(const flicker of flickers) {
          flicker.object.scale.y=flicker.scale*(1+Math.sin(t*7.3+flicker.phase)*.08+Math.sin(t*11.1+flicker.phase)*.035);
        }
        hearthLight.intensity=fireEnabled?34+Math.sin(t*6.9)*1.8+Math.sin(t*11.7)*.8:0;
        if(fireEnabled)updateHearthFlames(t);
        const a=moteGeometry.attributes.position;
        for(let i=0;i<moteCount;i++){const p=moteBase[i];a.setXYZ(i,p[0]+Math.sin(t*.09+i)*.035,p[1]+Math.sin(t*.16+i*1.7)*.055,p[2]);}a.needsUpdate=true;
      }
    },
    dispose() {
      if(disposed)return;disposed=true;root.removeFromParent();
      fairy.dispose();root.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
      for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of ownedTextures)texture.dispose();
      keyLight.shadow.map?.dispose();
      colliders.length=0;interactables.length=0;
    }
  };
}


/** Shared, locally modelled Boyi fairy used by both the public lobby and study. */
export function createBoyiFairy(THREE, parent, { reduced=false, colliders=[] }={}) {
  const root=parent,animated=parent,geometries=new Set(),materials=new Set(),batches=new Map(),interactables=[];
  let seed=0x79b01a19,disposed=false;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;},range=(a,b)=>a+(b-a)*random();
  const G=g=>(geometries.add(g),g),M=m=>(materials.add(m),m),standard=o=>M(new THREE.MeshStandardMaterial(o)),basic=o=>M(new THREE.MeshBasicMaterial(o));
  const sphere=G(new THREE.SphereGeometry(1,24,16)),smallSphere=G(new THREE.SphereGeometry(1,12,8)),box=G(new THREE.BoxGeometry(1,1,1)),ring=G(new THREE.TorusGeometry(1,.055,8,48)),temp=new THREE.Object3D();
  const oldGold=standard({color:0xb89b61,metalness:.65,roughness:.47});
  function group(name,owner=root,position=[0,0,0],rotation=[0,0,0]){const o=new THREE.Group();o.name=name;o.position.set(...position);o.rotation.set(...rotation);owner.add(o);return o;}
  function mesh(owner,geometry,material,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){const o=new THREE.Mesh(geometry,material);o.position.set(...position);o.scale.set(...scale);o.rotation.set(...rotation);o.receiveShadow=true;o.castShadow=false;owner.add(o);return o;}
  function batch(owner,geometry,material,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){const key=owner.uuid+geometry.uuid+material.uuid;if(!batches.has(key))batches.set(key,{owner,geometry,material,matrices:[]});temp.position.set(...position);temp.scale.set(...scale);temp.rotation.set(...rotation);temp.updateMatrix();batches.get(key).matrices.push(temp.matrix.clone());}
  const B=(owner,material,x,y,z,w,h,d,rotation=[0,0,0])=>batch(owner,box,material,[x,y,z],[w,h,d],rotation);
  function rounded(w,h,d,r=.06){const x=-w/2,y=-h/2,shape=new THREE.Shape();shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);const g=G(new THREE.ExtrudeGeometry(shape,{depth:d,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:r*.38,bevelThickness:r*.38,curveSegments:4}));g.translate(0,0,-d/2);return g;}
  function lineTube(owner,points,radius,material,segments=32){return mesh(owner,G(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,6,false)),material);}
  function interact(id,label,object,point){interactables.push({id,label,object,point:new THREE.Vector3(...point)});object.userData.interactionId=id;}
  const sprite=group('Boyi cloud spirit',animated,[-1.65,1.78,-1.1],[0,.09,0]);
  sprite.scale.setScalar(.29);
  const porcelain=standard({color:0xe3e7e7,roughness:.3,metalness:.22});
  const whiteTrim=standard({color:0xb8c8ce,roughness:.27,metalness:.48});
  const visor=standard({color:0x12232a,roughness:.2,metalness:.48});
  const wine=standard({color:0x6e2537,roughness:.61,metalness:.08});
  const cyan=standard({color:0x83e4df,emissive:0x3fcec8,emissiveIntensity:1.8,roughness:.38});
  const wingMaterial=standard({color:0xe3c783,emissive:0x9e7535,emissiveIntensity:.22,metalness:.4,roughness:.46,transparent:true,opacity:.58,side:THREE.DoubleSide,depthWrite:false});
  const spiritHead=group('Expressive spirit head',sprite);
  const spiritHands=[];
  mesh(spiritHead,sphere,porcelain,[0,.12,0],[.44,.36,.34]);
  mesh(spiritHead,rounded(.61,.245,.09,.075),visor,[0,.115,.305]);
  for(const side of [-1,1]) {
    const points=[];for(let j=0;j<=16;j++){const a=Math.PI*.12+j/16*Math.PI*.76;points.push([side*.15+Math.cos(a)*.069,.095+Math.sin(a)*.067,.394]);}
    lineTube(spiritHead,points,.009,cyan,20);
    mesh(spiritHead,sphere,whiteTrim,[side*.428,.1,0],[.045,.11,.12]);
    spiritHands.push({side,object:mesh(sprite,sphere,porcelain,[side*.27,-.37,.04],[.1,.17,.09])});
    mesh(sprite,sphere,whiteTrim,[side*.095,-.62,.06],[.095,.08,.13]);
  }
  const bodyProfile=[new THREE.Vector2(0,-.57),new THREE.Vector2(.16,-.55),new THREE.Vector2(.22,-.4),new THREE.Vector2(.21,-.17),new THREE.Vector2(.13,-.09),new THREE.Vector2(0,-.08)];
  mesh(sprite,G(new THREE.LatheGeometry(bodyProfile,32)),porcelain);
  mesh(sprite,rounded(.105,.12,.025,.014),wine,[0,-.29,.213]);
  B(sprite,oldGold,0,-.29,.232,.06,.012,.01);B(sprite,oldGold,0,-.29,.233,.012,.06,.01);
  mesh(spiritHead,sphere,wine,[0,.425,-.015],[.35,.085,.28]);
  const capShape=G(new THREE.ConeGeometry(.34,.3,4));mesh(spiritHead,capShape,wine,[0,.56,-.015],[1,.28,1],[0,Math.PI/4,.06]);
  mesh(spiritHead,sphere,oldGold,[.25,.38,.12],[.03,.03,.03]);
  lineTube(spiritHead,[[.21,.54,0],[.3,.48,.1],[.29,.37,.13]],.008,oldGold,16);
  const wings=[];
  for(const side of [-1,1]) {
    const wing=group('Gilded spirit wing',sprite,[side*.16,-.17,-.12],[0,side*.13,side*-.18]);wings.push({object:wing,side});
    for(let i=0;i<7;i++) {
      const angle=side*(.35+i*.12),x=side*(.29+i*.048),y=.05+i*.065;
      mesh(wing,sphere,wingMaterial,[x,y,0],[.085,.32-i*.019,.019],[0,0,-angle]);
    }
  }
  batch(sprite,ring,oldGold,[0,.8,-.02],[.43,.43,.43],[Math.PI/2+.12,0,0]);
  const fairyLight=new THREE.PointLight(0x83d7d6,.65,2.8,2);fairyLight.position.set(-1.65,1.86,-.65);root.add(fairyLight);
  const spiritMotes=[];
  for(let i=0;i<6;i++) {const a=i*Math.PI/3;const mote=mesh(sprite,smallSphere,cyan,[Math.cos(a)*.6,-.44+Math.sin(a)*.08,Math.sin(a)*.5],[.012,.012,.012]);mote.castShadow=false;spiritMotes.push(mote);}
  const spiritTablet=group('Spirit reading tablet',sprite,[0,-.3,.36],[.18,0,0]);
  mesh(spiritTablet,rounded(.42,.29,.035,.026),visor);
  const tabletScreen=basic({color:0x80b8b9});
  mesh(spiritTablet,rounded(.365,.235,.008,.014),tabletScreen,[0,0,.024]);
  for(let i=0;i<4;i++)B(spiritTablet,cyan,-.012,.073-i*.043,.031,.27-i*.024,.008,.004);
  spiritTablet.visible=false;
  sprite.traverse(object=>{if(object.isMesh)object.castShadow=false;});
  interact('sprite','和博医云伴聊聊',sprite,[-1.65,1.94,-1.1]);
  const spriteInteraction=interactables.find(item=>item.id==='sprite');


  for(const b of batches.values()){const o=new THREE.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((matrix,index)=>o.setMatrixAt(index,matrix));o.instanceMatrix.needsUpdate=true;o.castShadow=false;o.receiveShadow=true;o.computeBoundingSphere();b.owner.add(o);}batches.clear();
  const stats={spriteFollowing:false,spriteGestureCount:0};
  let elapsed=0,spiritState='idle',stateStarted=0;
  let viewerSeen=false,nextGesture=8+random()*8,gesture=null;
  const viewer={x:0,y:1.65,z:4.5,yaw:0,pitch:0,aspect:1.6},followBase=sprite.position.clone(),desired=new THREE.Vector3(),offset=new THREE.Vector3();
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function companionAnchor(){
    const sin=Math.sin(viewer.yaw),cos=Math.cos(viewer.yaw);
    const forward=spiritState==='idle'?1.65:1.6,baseRight=spiritState==='idle'?.95:1.0;
    const right=viewer.aspect<.85?Math.min(baseRight,forward*Math.tan(34*Math.PI/180)*viewer.aspect*.52):baseRight;
    desired.set(viewer.x+cos*right-sin*forward,clamp(viewer.y-.13,1.2,2.3),viewer.z-sin*right-cos*forward);
    desired.x=clamp(desired.x,-5.18,5.18);desired.z=clamp(desired.z,-6.1,6.1);
    // Keep the little spirit in front of solid shelves and furniture. Testing
    // a small radius is sufficient: its wings remain visibly translucent.
    for(const c of colliders){
      const margin=.28;
      if(desired.x>c.minX-margin&&desired.x<c.maxX+margin&&desired.z>c.minZ-margin&&desired.z<c.maxZ+margin){
        const exits=[{distance:Math.abs(desired.x-c.minX+margin),x:c.minX-margin,z:desired.z},{distance:Math.abs(c.maxX+margin-desired.x),x:c.maxX+margin,z:desired.z},{distance:Math.abs(desired.z-c.minZ+margin),x:desired.x,z:c.minZ-margin},{distance:Math.abs(c.maxZ+margin-desired.z),x:desired.x,z:c.maxZ+margin}].filter(p=>Math.abs(p.x)<5.19&&Math.abs(p.z)<6.11);
        exits.sort((a,b)=>a.distance-b.distance);if(exits[0]){desired.x=exits[0].x;desired.z=exits[0].z;}
      }
    }
    return desired;
  }
  function updateFollowing(dt,t){
    const delta=clamp(Number.isFinite(dt)?dt:0,0,.05),alpha=1-Math.exp(-delta*4.2);
    if(viewerSeen){
      companionAnchor();
      // Follow around the viewer on an arc. A straight interpolation during a
      // 180-degree turn would pass through the camera and fill the whole view.
      const currentAngle=Math.atan2(followBase.x-viewer.x,followBase.z-viewer.z),targetAngle=Math.atan2(desired.x-viewer.x,desired.z-viewer.z);
      const angularDelta=Math.atan2(Math.sin(targetAngle-currentAngle),Math.cos(targetAngle-currentAngle));
      const angle=currentAngle+angularDelta*alpha;
      const currentDistance=clamp(Math.hypot(followBase.x-viewer.x,followBase.z-viewer.z),1.23,2.4),targetDistance=clamp(Math.hypot(desired.x-viewer.x,desired.z-viewer.z),1.23,2.4);
      const distance=currentDistance+(targetDistance-currentDistance)*alpha;
      followBase.set(viewer.x+Math.sin(angle)*distance,followBase.y+(desired.y-followBase.y)*alpha,viewer.z+Math.cos(angle)*distance);
      stats.spriteFollowing=true;
    }
    offset.set(0,reduced?0:Math.sin(t*.88)*.012,0);
    let roll=0,nod=0;
    if(!reduced&&spiritState==='idle'){
      if(!gesture&&t>=nextGesture){gesture={kind:Math.floor(random()*3),started:t,duration:2.3+random()*.8};stats.spriteGestureCount++;}
      if(gesture){
        const u=clamp((t-gesture.started)/gesture.duration,0,1),ease=u*u*(3-2*u),pulse=Math.sin(Math.PI*u);
        if(gesture.kind===0){offset.y+=pulse*pulse*.32;roll=Math.PI*2*ease;}
        else if(gesture.kind===1){const a=ease*Math.PI*2;offset.x=Math.sin(a)*.17*pulse;offset.z=(Math.cos(a)-1)*.12*pulse;offset.y+=pulse*.19;roll=Math.sin(a)*.1;}
        else{nod=Math.sin(u*Math.PI*5)*pulse*.14;offset.y+=pulse*.07;}
        if(u>=1){gesture=null;nextGesture=t+8+random()*8;roll=0;}
      }
    }else if(gesture){gesture=null;nextGesture=t+8+random()*8;}
    sprite.position.copy(followBase).add(offset);
    sprite.position.x=clamp(sprite.position.x,-5.3,5.3);sprite.position.z=clamp(sprite.position.z,-6.15,6.15);
    if(viewerSeen){const angle=Math.atan2(viewer.x-sprite.position.x,viewer.z-sprite.position.z),difference=Math.atan2(Math.sin(angle-sprite.rotation.y),Math.cos(angle-sprite.rotation.y));sprite.rotation.y+=difference*(1-Math.exp(-delta*5));}
    sprite.rotation.z=roll;spiritHead.rotation.x+=nod;
    spriteInteraction.point.copy(sprite.position);spriteInteraction.point.y+=.12*sprite.scale.y;
    fairyLight.position.copy(sprite.position);fairyLight.position.y+=.12;fairyLight.position.z+=.3;
    // Raycasts can happen immediately after update, before renderer traversal.
    sprite.updateWorldMatrix(true,true);
  }
  const applySpiritPose=(state,localTime)=>{
    spiritHead.rotation.set(0,0,0);
    spiritTablet.visible=state==='tablet';
    for(const hand of spiritHands){hand.object.position.set(hand.side*.27,-.37,.04);hand.object.rotation.set(0,0,0);}
    if(state==='think') {
      spiritHead.rotation.x=.16;
      spiritHands[1].object.position.set(.27,-.07,.25);
      spiritHands[1].object.rotation.z=-.43;
    } else if(state==='tablet') {
      spiritHead.rotation.x=.13;
      spiritHands[0].object.position.set(-.21,-.31,.32);
      spiritHands[1].object.position.set(.17,-.28,.41);
      if(!reduced)spiritHands[1].object.position.x+=Math.sin(localTime*2.6)*.025;
    } else if(state==='listen') spiritHead.rotation.z=-.09;
    else if(state==='nod')spiritHead.rotation.x=reduced?.08:Math.sin(Math.min(localTime,2)*6)*.1*Math.max(0,1-localTime/2);
  };

  return {root:sprite,interactable:spriteInteraction,stats,
    setViewerPose(pose={}) {
      if(disposed||![pose.x,pose.y,pose.z,pose.yaw].every(Number.isFinite))return;
      Object.assign(viewer,{x:pose.x,y:pose.y,z:pose.z,yaw:pose.yaw,pitch:Number.isFinite(pose.pitch)?pose.pitch:0,aspect:Number.isFinite(pose.aspect)&&pose.aspect>0?clamp(pose.aspect,.2,4):viewer.aspect});
      sprite.scale.setScalar(viewer.aspect<.75?.245:.29);
      if(!viewerSeen){viewerSeen=true;followBase.copy(companionAnchor());sprite.position.copy(followBase);sprite.rotation.y=Math.atan2(viewer.x-sprite.position.x,viewer.z-sprite.position.z);}
    },
    setSpriteState(state='idle') {
      if(disposed)return;
      spiritState=['idle','think','tablet','nod','listen'].includes(state)?state:'idle';
      stateStarted=elapsed;applySpiritPose(spiritState,0);
      if(spiritState!=='idle'){gesture=null;sprite.rotation.z=0;nextGesture=elapsed+8+random()*8;}
    },

    update(seconds,dt=0){if(disposed)return;elapsed=Number.isFinite(seconds)?seconds:elapsed+Math.min(dt,.05);const t=elapsed;applySpiritPose(spiritState,t-stateStarted);updateFollowing(dt,t);if(!reduced){for(const {object,side} of wings)object.rotation.z=side*(-.18+Math.sin(t*1.25)*.055);for(let i=0;i<spiritMotes.length;i++){const angle=i*Math.PI/3+(spiritState==='think'?t*.9:t*.16);spiritMotes[i].position.set(Math.cos(angle)*.6,spiritState==='think'?.44+Math.sin(angle*2)*.07:-.44+Math.sin(angle)*.08,Math.sin(angle)*.5);}}},
    dispose(){if(disposed)return;disposed=true;sprite.removeFromParent();fairyLight.removeFromParent();sprite.traverse(o=>{if(o.isInstancedMesh)o.dispose();});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
  };
}
