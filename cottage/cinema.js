import { createBoyiFairy } from './scene.js?v=32a3d67967c6';
import { ROOM_LAYOUT } from './room-layout.js?v=9528bdbc62f4';

export function createCinemaScene(THREE, scene, { textures = {}, quality = 'balanced', reduced = false } = {}) {
  const tier = ['smooth', 'high'].includes(quality) ? quality : 'balanced';
  const root = new THREE.Group(); root.name = 'Boyi cinema';
  const geometries = new Set(), materials = new Set(), ownedTextures = new Set(), batches = new Map();
  const colliders = [], interactables = [], temp = new THREE.Object3D();
  let disposed = false, video = null, videoTexture = null;
  const G = g => (geometries.add(g), g), M = m => (materials.add(m), m);
  const standard = options => M(new THREE.MeshStandardMaterial(options));
  const basic = options => M(new THREE.MeshBasicMaterial(options));
  const borrowed = key => textures[key]?.isTexture ? textures[key] : null;
  const box = G(new THREE.BoxGeometry(1, 1, 1));
  const plane = G(new THREE.PlaneGeometry(1, 1));
  const sphere = G(new THREE.SphereGeometry(1, 12, 8));
  const cylinder = G(new THREE.CylinderGeometry(1, 1, 1, 12));
  const ring = G(new THREE.TorusGeometry(1, .025, 6, 32));
  function batch(geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0], owner = root) {
    const key = `${geometry.uuid}:${material.uuid}:${owner.uuid}`;
    if (!batches.has(key)) batches.set(key, { geometry, material, owner, matrices: [] });
    temp.position.set(...position); temp.scale.set(...scale); temp.rotation.set(...rotation); temp.updateMatrix();
    batches.get(key).matrices.push(temp.matrix.clone());
  }
  const B = (m, x, y, z, w, h, d, rotation = [0, 0, 0]) => batch(box, m, [x, y, z], [w, h, d], rotation);
  function mesh(geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, material); object.position.set(...position);
    object.scale.set(...scale); object.rotation.set(...rotation); root.add(object); return object;
  }
  function rounded(w, h, d, radius) {
    const bevel = Math.min(.025, radius * .35, d / 6), width = w - 2 * bevel, height = h - 2 * bevel;
    const x = -width / 2, y = -height / 2, r = Math.min(radius, width / 3, height / 3);
    const s = new THREE.Shape(); s.moveTo(x + r, y); s.lineTo(x + width - r, y);
    s.quadraticCurveTo(x + width, y, x + width, y + r); s.lineTo(x + width, y + height - r);
    s.quadraticCurveTo(x + width, y + height, x + width - r, y + height); s.lineTo(x + r, y + height);
    s.quadraticCurveTo(x, y + height, x, y + height - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const depth = d - 2 * bevel;
    const g = G(new THREE.ExtrudeGeometry(s, { depth, steps: 1, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 }));
    g.translate(0, 0, -depth / 2); return g;
  }
  function lettering(lines, width = 512, height = 512) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('影院文字纹理需要 Canvas 2D');
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#321923'); gradient.addColorStop(1, '#100f17');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#bc915d'; ctx.lineWidth = 3; ctx.strokeRect(18, 18, width - 36, height - 36);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((line, i) => {
      ctx.font = `${i === 0 ? '600' : '400'} ${Math.round(width * (i === 0 ? .074 : .043))}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.fillStyle = i === 0 ? '#ffe2ae' : '#d3c1af';
      ctx.fillText(line, width / 2, height * (.32 + i * .18), width - 64);
    });
    const texture = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter; ownedTextures.add(texture); return texture;
  }
  const wood = standard({ color: 0x66412d, roughness: .68, map: borrowed('woodColor'),normalMap:borrowed('woodNormal'),roughnessMap:borrowed('woodRoughness') });
  const walnut = standard({ color: 0x291a19, roughness: .57, map: borrowed('woodColor'),normalMap:borrowed('woodNormal'),roughnessMap:borrowed('woodRoughness') });
  const stone = standard({ color: 0x51433c, roughness: .9, map: borrowed('stoneColor'),normalMap:borrowed('stoneNormal'),roughnessMap:borrowed('stoneRoughness') });
  const plaster = standard({ color: 0x51443e, roughness: .94 });
  const copper = standard({ color: 0xbd8c56, metalness: .72, roughness: .4 });
  const fabricCanvas=document.createElement('canvas');fabricCanvas.width=fabricCanvas.height=256;const fabricContext=fabricCanvas.getContext('2d');fabricContext.fillStyle='#d4d4d4';fabricContext.fillRect(0,0,256,256);for(let y=0;y<256;y+=2){fabricContext.fillStyle=y%4?'#c8c8c8':'#e0e0e0';fabricContext.fillRect(0,y,256,1);}for(let x=0;x<256;x+=3){fabricContext.fillStyle='rgba(70,70,70,.13)';fabricContext.fillRect(x,0,1,256);}const fabricTexture=new THREE.CanvasTexture(fabricCanvas);fabricTexture.wrapS=fabricTexture.wrapT=THREE.RepeatWrapping;fabricTexture.repeat.set(3,3);ownedTextures.add(fabricTexture);
  const velvet = standard({ color: 0x701e32, roughness: .95,roughnessMap:fabricTexture,bumpMap:tier==='high'?fabricTexture:null,bumpScale:.009 });
  wood.normalScale?.set(.35,.35);walnut.normalScale?.set(.32,.32);stone.normalScale?.set(.38,.38);
  const glow = standard({ color: 0xffdba7, emissive: 0xffbb70, emissiveIntensity: .75, roughness: .6 });
  const bookMaterials = [0x475c54, 0x784937, 0x413b58].map(color => standard({ color, roughness: .85 }));
  // The shell stays inside 12 x 14 metres; boundary colliders reserve camera clearance.
  B(stone, 0, -.12, 0, 12, .18, 14);
  for (let x = 0; x < 12; x++) for (let z = 0; z < 14; z++)
    B((x + z) % 4 ? wood : walnut, x - 5.5, -.025, z - 6.5, .975, .05, .975);
  for (const side of [-1, 1]) {
    B(plaster, side * 5.9, 2.8, 0, .2, 5.6, 14);
    colliders.push({ minX: side < 0 ? -6 : 5.58, maxX: side < 0 ? -5.58 : 6, minZ: -7, maxZ: 7 });
  }
  for (const side of [-1, 1]) {
    B(plaster, 0, 2.8, side * 6.9, 11.6, 5.6, .2);
    colliders.push({ minX: -6, maxX: 6, minZ: side < 0 ? -7 : 6.55, maxZ: side < 0 ? -6.55 : 7 });
  }
  B(plaster, 0, 5.6, 0, 12, .2, 14);
  for (let z = -6; z <= 6; z += 2) B(wood, 0, 5.3, z, 11.6, .24, .16);
  for (let x = -5; x <= 5; x += 2) B(wood, x, 5.3, 0, .16, .24, 13.6);
  for (let x = -4; x <= 4; x += 2) for (let z = -5; z <= 5; z += 2) {
    B(walnut, x, 5.47, z, 1.82, .08, 1.82); B(glow, x, 5.415, z - .76, 1.45, .015, .025);
  }
  const poster = basic({ map: lettering(['博医放映室', '共看 · 共谈', '让好故事在此相遇']), toneMapped: false });
  for (const side of [-1, 1]) {
    for (let z = -5; z <= 5; z += 2) {
      B(wood, side * 5.76, 1.15, z, .08, 1.95, 1.7); B(walnut, side * 5.705, 1.2, z, .035, 1.65, 1.42);
      B(copper, side * 5.675, 1.2, z - .72, .025, 1.72, .025);
    }
    B(copper, side * 5.665, 2.18, 0, .025, .035, 13.2); B(wood, side * 5.69, .12, 0, .16, .24, 13.4);
    B(wood, side * 5.69, 3.2, -.9, .12, 1.85, 1.3);
    batch(plane, poster, [side * 5.61, 3.2, -.9], [1.08, 1.55, 1], [0, -side * Math.PI / 2, 0]);
    for (let z=-5.4;z<5.6;z+=.8)B(glow,side*3.29,.035,z,.036,.014,.18);
    for (const z of [-4.9, 1.1, 4.7]) {
      B(copper, side * 5.52, 3.4, z, .08, .65, .26); B(copper, side * 5.48, 3.25, z, .35, .06, .06);
      batch(sphere, glow, [side * 5.35, 3.55, z], [.12, .22, .12]);
    }
    // Shallow, modelled bookcases leave the externally installed items accessible.
    B(wood, side * 5.71, .55, 1.95, .06, 1.1, 1.8);
    for (const z of [1.09, 2.81]) B(wood, side * 5.43, .55, z, .64, 1.1, .09);
    for (const y of [.1, .58, 1.08]) B(wood, side * 5.43, y, 1.95, .64, .06, 1.8);
    for (let i = 0; i < 12; i++) {
      const h = .32 + (i % 4) * .035, z = 1.23 + i * .13;
      B(bookMaterials[i % 3], side * 5.13, .61 + h / 2, z, .12, h, .095);
      B(copper, side * 5.063, .69, z, .008, .018, .07);
    }
    colliders.push({ minX: side < 0 ? -5.75 : 5.05, maxX: side < 0 ? -5.05 : 5.75, minZ: 1.03, maxZ: 2.87 });
    const logo = borrowed(side < 0 ? 'schoolLogo' : 'boyiLogo') || lettering(side < 0 ? ['上海交通大学', '医学院'] : ['博医', '博医放映室']);
    const image = logo.image, aspect = image?.width > 0 && image?.height > 0 ? image.width / image.height : 1;
    const width = aspect >= 1 ? 1.06 : 1.06 * aspect, height = aspect >= 1 ? 1.06 / aspect : 1.06;
    batch(cylinder, glow, [side * 5.71, 3.25, -3.65], [.73, .025, .73], [0, 0, Math.PI / 2]);
    batch(ring, copper, [side * 5.66, 3.25, -3.65], [.72, .72, .72], [0, Math.PI / 2, 0]);
    batch(plane, basic({ map: logo, transparent: true, toneMapped: false, depthWrite: false }), [side * 5.63, 3.25, -3.65], [width, height, 1], [0, -side * Math.PI / 2, 0]);
  }
  const cushion = rounded(1.23, .24, 1.06, .085), back = rounded(1.24, .88, .25, .1);
  const arm = G(new THREE.LatheGeometry([[0, .2], [.13, .22], [.17, .35], [.16, .66], [.12, .82], [0, .86]].map(p => new THREE.Vector2(...p)), 16));
  const seats = ROOM_LAYOUT.cinema.seats;
  for (const row of [seats.slice(0, 4), seats.slice(4, 8)]) {
    const z = row[0].z; B(walnut, 0, .19, z, 5.5, .22, 1.25); B(copper, 0, .285, z - .63, 5.35, .025, .015);
    for (const x of [-2.45, 2.45]) for (const dz of [-.47, .47]) B(wood, x, .065, z + dz, .13, .13, .13);
    for (const seat of row) {
      batch(cushion, velvet, [seat.x, seat.height - .12, z - .045]);
      batch(back, velvet, [seat.x, .9, z + .47]);for(const dx of [-.59,.59])B(copper,seat.x+dx,seat.height-.025,z-.045,.012,.015,.94);B(copper,seat.x,seat.height-.025,z-.51,1.16,.015,.012);
      for (const dx of [-.29, .29]) {
        for (const dz of [-.27, .21]) batch(sphere, copper, [seat.x + dx, seat.height, z + dz], [.018, .007, .018]);
        for (const y of [.72, 1.07]) batch(sphere, copper, [seat.x + dx, y, z + .337], [.018, .018, .012]);
      }
    }
    for (const side of [-1, 1]) {
      batch(arm, velvet, [side * 2.58, 0, z], [1, 1, 3.3]);
      batch(ring, copper, [side * 2.58, .7, z - .48], [.09, .09, .09]);
    }
    colliders.push({ minX: -2.75, maxX: 2.75, minZ: z - .625, maxZ: z + .625 });
  }
  B(copper, 0, 2.6, -6.25, 8.48, 4.98, .06); B(walnut, 0, 2.6, -6.15, 8.32, 4.82, .12);
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++)
    batch(cylinder, velvet, [side * (4.45 + i * .2), 2.7, -6], [.105, 4.9, .16]);
  B(velvet, 0, 5.13, -6, 11.2, .18, .32);
  const ready = lettering(['博医放映室', '选一部电影，坐下来一起看', '让好故事在此相遇'], 1024, 576);
  const screenMaterial = basic({ map: ready, toneMapped: false });
  const screen = mesh(plane, screenMaterial, [0, 2.6, -6.05], [8, 4.5, 1]);
  screen.name = 'Cinema screen'; screen.userData.interactionId = 'cinema';
  interactables.push({ id: 'cinema', label: '放映控制', object: screen, point: new THREE.Vector3(0, 2.6, -6.05) });
  // The exit is a physical hinged leaf. The separate frame stays still and
  // cannot masquerade as a solid interaction target after the door opens.
  const doorFrame=new THREE.Group();doorFrame.name='Cinema exit frame';doorFrame.position.set(4.5,0,5.95);doorFrame.rotation.y=Math.PI;root.add(doorFrame);
  const doorHinge=new THREE.Group();doorHinge.name='Cinema exit hinged leaf';doorHinge.position.x=-.675;doorFrame.add(doorHinge);
  function doorMesh(g,m,p,scale=[1,1,1],owner=doorHinge){const o=new THREE.Mesh(g,m);o.position.set(...p);o.scale.set(...scale);o.receiveShadow=true;owner.add(o);return o;}
  doorMesh(box,wood,[.675,1.325,0],[1.35,2.65,.09]);
  for(const x of [-.75,.75])doorMesh(box,copper,[x,1.435,0],[.14,2.87,.25],doorFrame);
  doorMesh(box,copper,[0,2.87,0],[1.65,.14,.25],doorFrame);
  for(const x of [.085,1.265])doorMesh(box,copper,[x,1.34,.064],[.025,2.38,.028]);
  for(const y of [.18,.7,2.04,2.52])doorMesh(box,copper,[.675,y,.064],[1.18,.026,.025]);
  for(const y of [.3,1.32,2.35])doorMesh(cylinder,copper,[.015,y,.015],[.027,.18,.027]);
  doorMesh(sphere,copper,[1.14,1.15,.13],[.055,.055,.055]);
  doorMesh(plane,basic({map:lettering(['回到博医小屋','靠近后互动开关门']),toneMapped:false}),[.675,1.89,.067],[1.02,.56,1]);
  doorMesh(box,basic({color:0x30261e}),[0,1.37,-.92],[1.45,2.74,.05],doorFrame);
  for(const x of [-.72,.72])doorMesh(box,walnut,[x,1.37,-.45],[.04,2.74,.88],doorFrame);
  doorMesh(box,walnut,[0,2.74,-.45],[1.45,.04,.9],doorFrame);
  doorMesh(plane,basic({map:lettering(['博医小屋','二楼 · 阅读与思考']),toneMapped:false}),[0,1.7,-.88],[1.13,.63,1],doorFrame);
  for(const x of [-.59,.59])doorMesh(box,basic({color:0xffc38e,toneMapped:false}),[x,1.55,-.86],[.024,1.8,.018],doorFrame);
  const doorInteraction={id:'cinema-door-toggle',label:'打开通往博医小屋的门',object:doorHinge,point:new THREE.Vector3(4.5,1.3,5.8)};interactables.push(doorInteraction);
  const doorBlocker={minX:0,maxX:0,minZ:0,maxZ:0};colliders.push(doorBlocker);
  let doorOpen=false,doorAngle=0,doorInitialized=false;const doorCorners=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  function poseDoor(){doorHinge.rotation.y=doorAngle;doorHinge.updateWorldMatrix(true,true);let i=0;doorBlocker.minX=doorBlocker.minZ=Infinity;doorBlocker.maxX=doorBlocker.maxZ=-Infinity;for(const x of [0,1.35])for(const z of [-.06,.06]){const p=doorCorners[i++].set(x,.1,z);doorHinge.localToWorld(p);doorBlocker.minX=Math.min(doorBlocker.minX,p.x);doorBlocker.maxX=Math.max(doorBlocker.maxX,p.x);doorBlocker.minZ=Math.min(doorBlocker.minZ,p.z);doorBlocker.maxZ=Math.max(doorBlocker.maxZ,p.z);}doorInteraction.point.set(1.14,1.15,.13);doorHinge.localToWorld(doorInteraction.point);}
  function setCinemaDoor(value){doorOpen=Boolean(value);doorInteraction.label=doorOpen?'关闭通往博医小屋的门':'打开通往博医小屋的门';if(!doorInitialized){doorInitialized=true;doorAngle=doorOpen?-1.45:0;poseDoor();}}
  function getPortal(p){return doorOpen&&doorAngle<-.98&&p&&p.z>6.12&&p.z<6.6&&Math.abs(p.x-4.5)<.52?'cottage':null;}
  poseDoor();
  B(walnut, 0, 4.65, 5.65, .64, .3, .5);
  batch(cylinder, glow, [0, 4.65, 5.36], [.09, .1, .09], [Math.PI / 2, 0, 0]);
  const origin = new THREE.Vector3(0, 4.65, 5.3), destination = new THREE.Vector3(0, 2.6, -6.05);
  const direction = origin.clone().sub(destination);
  const beam = mesh(G(new THREE.ConeGeometry(2.15, direction.length(), 24, 1, true)), basic({ color: 0xffddb5, transparent: true, opacity: .022, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }), origin.clone().add(destination).multiplyScalar(.5).toArray());
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); beam.visible = false;
  const ambient = new THREE.HemisphereLight(0xffe2bc, 0x342232, 1.2); root.add(ambient);
  const key = new THREE.SpotLight(0xffdfb3, 135, 22, 1.03, .65, 2); key.position.set(0, 5.1, 3.8);
  key.target.position.set(0, .4, -.8); key.castShadow = tier !== 'smooth' && !reduced;
  key.shadow.mapSize.set(tier==='high'?2048:1024,tier==='high'?2048:1024);key.shadow.autoUpdate=false;key.shadow.needsUpdate=true; key.shadow.camera.near = .3; key.shadow.camera.far = 22; key.shadow.bias = -.0003;
  root.add(key, key.target);
  const roomLight = new THREE.PointLight(0xffc58e, 15, 12, 2); roomLight.position.set(0, 3.8, 1.5); root.add(roomLight);
  for (const b of batches.values()) {
    const object = new THREE.InstancedMesh(b.geometry, b.material, b.matrices.length);
    b.matrices.forEach((matrix, i) => object.setMatrixAt(i, matrix)); object.instanceMatrix.needsUpdate = true;
    object.receiveShadow = true; object.castShadow = key.castShadow && b.material === velvet;
    object.computeBoundingSphere(); b.owner.add(object);
  }
  batches.clear();
  const fairy = createBoyiFairy(THREE, root, { reduced, colliders }); interactables.push(fairy.interactable);
  const stats = { sceneKind:'private-cinema',originalLogoCount:2,rendererMeasured:false,quality: tier, seatCount: seats.length, sofaRows: 2, meshSubmissionsEstimate: 0, instancedMeshes: 0, pointLights: 0, shadowLights: 0, videoAttached: false, disposed: false,
    get spriteFollowing() { return fairy.stats.spriteFollowing; }, get spriteGestureCount() { return fairy.stats.spriteGestureCount; } };
  root.traverse(o => { if (o.isMesh) stats.meshSubmissionsEstimate++; if (o.isInstancedMesh) stats.instancedMeshes++; if (o.isPointLight) stats.pointLights++; if (o.isLight && o.castShadow) stats.shadowLights++; });
  scene.add(root);
  function setVideo(next = null) {
    if (disposed || next === video) return;
    if (next !== null && (typeof next.play !== 'function' || typeof next.pause !== 'function')) throw new TypeError('setVideo 需要视频元素或 null');
    const replacement = next === null ? null : new THREE.VideoTexture(next);
    if (replacement && THREE.SRGBColorSpace) replacement.colorSpace = THREE.SRGBColorSpace;
    const previous = videoTexture; videoTexture = replacement; video = next;
    screenMaterial.map = replacement || ready; screenMaterial.needsUpdate = true;
    previous?.dispose(); stats.videoAttached = next !== null; beam.visible = false;
  }
  return { root, colliders, interactables, spawn: { x: 4.5, z: 4.8, yaw: 0 }, stats, setVideo, setCinemaDoor, getPortal,
    setViewerPose(pose = {}) {
      if (disposed || ![pose.x, pose.y, pose.z, pose.yaw].every(Number.isFinite)) return;
      fairy.setViewerPose({ ...pose, x: Math.max(-5.58, Math.min(5.58, pose.x)), z: Math.max(-6.55, Math.min(6.55, pose.z)) });
    },
    setSpriteState(state = 'idle') { if (!disposed) fairy.setSpriteState(state); },
    setNightMode(night = true) {
      if (disposed) return; ambient.intensity = night ? .34 : .85; key.intensity = night ? 30 : 90;
      roomLight.intensity = night ? 7 : 15; glow.emissiveIntensity = night ? .5 : .75;
    },
    update(seconds, dt = 0) {
      if (disposed) return; fairy.update(seconds, dt);const target=doorOpen?-1.45:0;if(Math.abs(target-doorAngle)>.001){doorAngle+=(target-doorAngle)*(1-Math.exp(-Math.max(0,Math.min(.05,dt||0))*8.5));if(Math.abs(target-doorAngle)<.001)doorAngle=target;poseDoor();}
      beam.visible = !!video && !video.paused && !video.ended && video.readyState >= 2;
    },
    dispose() {
      if (disposed) return; disposed = true; fairy.dispose(); root.removeFromParent();
      root.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
      screenMaterial.map = null; videoTexture?.dispose(); videoTexture = null; video = null;
      for (const g of geometries) g.dispose(); for (const m of materials) m.dispose(); for (const t of ownedTextures) t.dispose();
      if (typeof key.shadow.dispose === 'function') key.shadow.dispose(); else { key.shadow.map?.dispose(); key.shadow.mapPass?.dispose(); }
      geometries.clear(); materials.clear(); ownedTextures.clear(); root.clear(); colliders.length = 0; interactables.length = 0;
      stats.videoAttached = false; stats.disposed = true;
    }
  };
}
