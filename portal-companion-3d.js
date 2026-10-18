import * as THREE from './vendor/three/three.module.js';

const FRAME_MS = 1000 / 60;
const DURATIONS = Object.freeze({ wave: 1.6, jump: 1.25, nod: 1.4, think: 2.8, listen: 2.2, celebrate: 1.8, tablet: 3.4 });
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };

export function createBoyiModel(canvas, { onError = () => {}, onFrame = () => {} } = {}) {
  let renderer = null, scene = null, camera = null, root = null;
  let observer = null, raf = null, disposed = false, fault = false, ready = false;
  let paused = false, active = false, action = 'idle', busy = false, reduced = false;
  let elapsedBase = 0, startedAt = 0, lastRenderAt = -Infinity;
  let renderFrames = 0, geometryVertices = 0, uniqueGeometryVertices = 0, meshCount = 0;
  let lastError = null, lastFrameTime = 0, width = 0, height = 0, pixelRatio = 0;
  let head, left, right, legs, tablet, tabletTexture, tabletContext, paintedPage = -1;
  let transition = null;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const animated = [], rest = new Map();
  const down = new THREE.Vector3(0, -1, 0);
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), v5 = new THREE.Vector3();
  const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  const blendQ = new THREE.Quaternion();
  const handQ = new THREE.Quaternion(), holdQ = new THREE.Quaternion();
  const target = new THREE.Vector3(), contact = new THREE.Vector3(), offset = new THREE.Vector3();
  const leftPole = new THREE.Vector3(-1.6, 2.1, 0.35);
  const rightPole = new THREE.Vector3(1.6, 2.1, 0.35);
  const tabletOffset = new THREE.Vector3(-0.36, 0.32, 0.1);
  const indexTip = new THREE.Vector3(-0.04, -0.425, 0.01);
  const now = () => performance.now();
  const notify = (callback, value) => { try { callback(value); } catch (_) { /* Consumer callbacks do not own the render loop. */ } };
  const trackGeometry = geometry => { geometries.add(geometry); return geometry; };
  const trackMaterial = material => { materials.add(material); return material; };
  const cancel = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null; };
  const elapsedAt = time => elapsedBase + (active && !paused ? Math.max(0, time - startedAt) : 0);

  function fail(error) {
    if (fault || disposed) return;
    fault = true;
    active = false;
    cancel();
    const reported = error instanceof Error ? error : new Error(String(error));
    lastError = reported.message;
    notify(onError, reported);
  }

  function contextLost(event) {
    event.preventDefault();
    fail(new Error('WebGL 上下文已丢失，请由宿主重新创建三维模块。'));
  }

  function render(time = now()) {
    if (disposed || fault || !renderer || !scene || !camera) return false;
    try {
      if (renderer.getContext().isContextLost()) {
        fail(new Error('WebGL 上下文不可用。'));
        return false;
      }
      renderer.render(scene, camera);
      renderFrames += 1;
      lastRenderAt = time;
      lastFrameTime = time / 1000;
      notify(onFrame, { time: lastFrameTime, elapsed: elapsedAt(time) / 1000, action, renderFrames });
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  }

  function resize() {
    if (disposed || fault || !renderer) return;
    try {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width || width || canvas.clientWidth || 300));
      const h = Math.max(1, Math.round(rect.height || height || canvas.clientHeight || 400));
      const ratio = Math.min(1.5, Math.max(0.5, window.devicePixelRatio || 1));
      if (w === width && h === height && ratio === pixelRatio) return;
      width = w; height = h; pixelRatio = ratio;
      renderer.setPixelRatio(ratio);
      renderer.setSize(w, h, false);
      const aspect = w / h;
      const vertical = Math.max(6.8, 5.9 / aspect);
      camera.left = -vertical * aspect / 2;
      camera.right = vertical * aspect / 2;
      camera.top = vertical / 2;
      camera.bottom = -vertical / 2;
      camera.updateProjectionMatrix();
      if (ready) render();
    } catch (error) { fail(error); }
  }

  function mesh(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.scale.set(...scale);
    parent.add(object);
    return object;
  }

  function joint(parent, position) {
    const group = new THREE.Group();
    group.position.set(...position);
    parent.add(group);
    return group;
  }

  function roundedRect(x, y, w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  function rememberPose() {
    for (const object of animated) rest.set(object, object.quaternion.clone());
  }

  function resetPose() {
    for (const object of animated) object.quaternion.copy(rest.get(object));
    root.position.y = 0;
    tablet.visible = false;
  }

  // Analytic two-bone IK: both arm segments retain their physical lengths.
  function aimArm(arm, wristTarget, pole, worldHandQuaternion, weight) {
    v0.copy(arm.shoulder.position);
    v1.copy(wristTarget).sub(v0);
    const distance = clamp(v1.length(), 0.03, arm.upperLength + arm.lowerLength - 0.002);
    if (v1.lengthSq() < 0.000001) v1.set(0, -1, 0);
    v1.normalize();
    v2.copy(pole).sub(v0);
    v2.addScaledVector(v1, -v2.dot(v1));
    if (v2.lengthSq() < 0.000001) v2.set(0, 0, 1).addScaledVector(v1, -v1.z);
    v2.normalize();
    const along = (arm.upperLength ** 2 - arm.lowerLength ** 2 + distance ** 2) / (2 * distance);
    const bend = Math.sqrt(Math.max(0, arm.upperLength ** 2 - along ** 2));
    v3.copy(v0).addScaledVector(v1, along).addScaledVector(v2, bend);
    v4.copy(v3).sub(v0).normalize();
    q0.setFromUnitVectors(down, v4);
    v5.copy(v0).addScaledVector(v1, distance).sub(v3).normalize();
    q1.copy(q0).invert();
    v5.applyQuaternion(q1);
    q1.setFromUnitVectors(down, v5);
    q2.copy(q0).multiply(q1).invert().multiply(worldHandQuaternion);
    arm.shoulder.quaternion.copy(rest.get(arm.shoulder)).slerp(q0, weight);
    arm.elbow.quaternion.copy(rest.get(arm.elbow)).slerp(q1, weight);
    arm.hand.quaternion.copy(rest.get(arm.hand)).slerp(q2, weight);
  }

  function syncTablet() {
    root.updateMatrixWorld(true);
    right.hand.getWorldPosition(target);
    root.worldToLocal(target);
    tablet.position.copy(target).add(tabletOffset);
    tablet.rotation.set(-0.12, -0.15, -0.12);
    tablet.updateMatrixWorld(true);
  }

  function paintTablet(page) {
    const selected = ((page % 3) + 3) % 3;
    if (selected === paintedPage) return;
    paintedPage = selected;
    const ctx = tabletContext, w = 256, h = 384;
    ctx.fillStyle = '#101f2d'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#83eafa'; ctx.font = 'bold 25px sans-serif';
    ctx.fillText('BOYI', 20, 38);
    ctx.font = '15px sans-serif'; ctx.fillText('0' + (selected + 1) + ' / 03', 166, 36);
    ctx.fillStyle = '#254454'; ctx.fillRect(20, 57, 216, 2);
    if (selected === 0) {
      ctx.strokeStyle = '#86effa'; ctx.lineWidth = 5; ctx.beginPath();
      ctx.moveTo(22, 193); ctx.lineTo(65, 176); ctx.lineTo(103, 190);
      ctx.lineTo(142, 121); ctx.lineTo(179, 151); ctx.lineTo(231, 93); ctx.stroke();
      ctx.fillStyle = '#d6edf0'; ctx.fillRect(23, 238, 160, 9); ctx.fillRect(23, 264, 204, 7);
      ctx.fillStyle = '#547a89'; ctx.fillRect(23, 288, 180, 7);
    } else if (selected === 1) {
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = '#1d3947'; ctx.fillRect(22, 80 + i * 55, 212, 43);
        ctx.fillStyle = '#83eafa'; ctx.fillRect(31, 91 + i * 55, 19, 19);
        ctx.fillStyle = '#b5d8de'; ctx.fillRect(64, 94 + i * 55, 115 + (i % 2) * 30, 7);
      }
    } else {
      const bars = [58, 108, 82, 155, 126];
      bars.forEach((bar, i) => { ctx.fillStyle = i % 2 ? '#a54f5a' : '#83eafa'; ctx.fillRect(28 + i * 43, 272 - bar, 27, bar); });
      ctx.fillStyle = '#b5d8de'; ctx.fillRect(24, 300, 170, 8);
    }
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath(); ctx.arc(109 + i * 19, 354, 4, 0, Math.PI * 2);
      ctx.fillStyle = i === selected ? '#83eafa' : '#405964'; ctx.fill();
    }
    tabletTexture.needsUpdate = true;
  }

  function applyMotion(seconds, representative = false) {
    resetPose();
    if (action === 'idle') return;
    const duration = DURATIONS[action];
    const u = (seconds / duration) % 1;
    const phase = u * Math.PI * 2;
    const total = duration * 2;
    const weight = representative ? 1 : smooth(0, 0.24, seconds) * (busy ? 1 : 1 - smooth(total - 0.3, total, seconds));
    if (action === 'wave') {
      left.shoulder.rotation.z = THREE.MathUtils.lerp(-0.1, -2.05, weight);
      left.shoulder.rotation.x = -0.15 * weight;
      left.elbow.rotation.z = (-0.6 + 0.3 * Math.sin(phase * 2)) * weight;
      left.hand.rotation.z = 0.2 * Math.sin(phase * 2 + 0.4) * weight;
      head.rotation.z = -0.06 * weight;
    } else if (action === 'jump') {
      const flight = smooth(0.15, 0.85, u);
      const lift = Math.max(0, Math.sin(Math.PI * flight));
      root.position.y = 0.62 * lift * weight;
      const crouch = (1 - smooth(0.06, 0.2, u)) + smooth(0.78, 0.9, u) * (1 - smooth(0.92, 1, u));
      for (const leg of legs) {
        leg.hip.rotation.x = (-0.22 * crouch - 0.15 * lift) * weight;
        leg.knee.rotation.x = (0.42 * crouch + 0.3 * lift) * weight;
      }
      left.shoulder.rotation.z = -0.1 - 0.75 * lift * weight;
      right.shoulder.rotation.z = 0.1 + 0.75 * lift * weight;
      left.elbow.rotation.x = right.elbow.rotation.x = -0.3 * lift * weight;
    } else if (action === 'nod') {
      head.rotation.x = (0.04 + 0.23 * Math.sin(phase)) * weight;
      left.elbow.rotation.x = right.elbow.rotation.x = -0.12 * weight;
    } else if (action === 'think') {
      head.rotation.x = (0.16 + 0.02 * Math.sin(phase)) * weight;
      head.rotation.z = -0.045 * weight;
      handQ.setFromEuler(new THREE.Euler(Math.PI, 0, -0.12));
      target.set(-0.17, 2.99, 0.58);
      aimArm(left, target, leftPole, handQ, weight);
      for (const finger of left.fingers) finger.rotation.x = 0.95 * weight;
      right.shoulder.rotation.x = -0.35 * weight;
      right.shoulder.rotation.z = 0.36 * weight;
      right.elbow.rotation.x = -0.8 * weight;
    } else if (action === 'listen') {
      head.rotation.z = (-0.12 + 0.025 * Math.sin(phase)) * weight;
      head.rotation.y = -0.08 * weight;
      left.shoulder.rotation.z = THREE.MathUtils.lerp(-0.1, -1.95, weight);
      left.elbow.rotation.z = -1.15 * weight;
      left.hand.rotation.z = -0.2 * weight;
      right.elbow.rotation.x = -0.18 * weight;
    } else if (action === 'celebrate') {
      left.shoulder.rotation.z = THREE.MathUtils.lerp(-0.1, -2.35, weight);
      right.shoulder.rotation.z = THREE.MathUtils.lerp(0.1, 2.35, weight);
      left.elbow.rotation.z = (-0.3 + 0.22 * Math.sin(phase * 2)) * weight;
      right.elbow.rotation.z = (0.3 - 0.22 * Math.sin(phase * 2)) * weight;
      left.hand.rotation.x = 0.2 * Math.sin(phase * 2) * weight;
      right.hand.rotation.x = -0.2 * Math.sin(phase * 2) * weight;
      head.rotation.z = 0.07 * Math.sin(phase) * weight;
    } else if (action === 'tablet') {
      tablet.visible = true;
      holdQ.setFromEuler(new THREE.Euler(-0.25, 0, 0));
      target.set(0.52, 2.39, 0.5);
      aimArm(right, target, rightPole, holdQ, weight);
      syncTablet();
      const swipe = smooth(0.25, 0.62, u);
      contact.set(-0.08, 0.23 - 0.42 * swipe, 0.105);
      tablet.localToWorld(contact);
      root.worldToLocal(contact);
      offset.set(0.82, -0.05, -0.57).normalize();
      handQ.setFromUnitVectors(down, offset);
      offset.copy(indexTip).applyQuaternion(handQ);
      target.copy(contact).sub(offset);
      aimArm(left, target, leftPole, handQ, weight);
      left.fingers.forEach((finger, i) => { finger.rotation.x = i === 1 ? 0 : 1.15 * weight; });
      right.fingers.forEach(finger => { finger.rotation.x = 0.48 * weight; });
      head.rotation.x = 0.14 * weight;
      paintTablet(Math.floor(seconds / duration) + (u >= 0.62 ? 1 : 0));
    }
    if (transition && !representative) {
      const blend = smooth(0, 0.2, seconds);
      if (blend < 1) {
        animated.forEach((object, i) => {
          blendQ.copy(object.quaternion);
          object.quaternion.copy(transition.quaternions[i]).slerp(blendQ, blend);
        });
        root.position.y = THREE.MathUtils.lerp(transition.rootY, root.position.y, blend);
      } else transition = null;
    }
    if (tablet.visible) syncTablet();
  }

  function schedule() {
    if (!disposed && !fault && active && !paused && raf === null) raf = requestAnimationFrame(tick);
  }

  function tick(time) {
    raf = null;
    if (disposed || fault || paused || !active) return;
    if (time - lastRenderAt < FRAME_MS - 1) { schedule(); return; }
    const seconds = elapsedAt(time) / 1000;
    if (!busy && seconds >= DURATIONS[action] * 2) {
      active = false; action = 'idle'; elapsedBase = 0; transition = null;
      resetPose(); render(time);
      return;
    }
    try { applyMotion(seconds); } catch (error) { fail(error); return; }
    render(time);
    schedule();
  }

  function play(name, { busy: requestedBusy = false, reduced: requestedReduced = false } = {}) {
    if (disposed || fault || !ready) return false;
    if (name !== 'idle' && !Object.prototype.hasOwnProperty.call(DURATIONS, name)) return false;
    cancel();
    transition = { quaternions: animated.map(object => object.quaternion.clone()), rootY: root.position.y };
    action = name;
    busy = Boolean(requestedBusy && (name === 'think' || name === 'tablet'));
    reduced = Boolean(requestedReduced);
    elapsedBase = 0; startedAt = now(); active = name !== 'idle' && !reduced;
    try {
      if (name === 'idle') { transition = null; resetPose(); }
      else if (reduced) {
        transition = null;
        elapsedBase = DURATIONS[name] * 0.42 * 1000;
        applyMotion(elapsedBase / 1000, true);
      } else applyMotion(0);
      render(startedAt);
      schedule();
      return !fault;
    } catch (error) { fail(error); return false; }
  }

  function setPaused(value) {
    if (disposed || fault || paused === Boolean(value)) return;
    const time = now();
    if (value) { elapsedBase = elapsedAt(time); paused = true; cancel(); }
    else { paused = false; startedAt = time; schedule(); }
  }

  function dispose() {
    if (disposed) return;
    disposed = true; active = false; ready = false; cancel();
    observer?.disconnect();
    if (typeof window !== 'undefined') window.removeEventListener('resize', resize);
    canvas?.removeEventListener?.('webglcontextlost', contextLost);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    geometries.clear(); materials.clear(); textures.clear();
    scene?.clear();
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
    }
    if (tabletContext) { tabletContext.canvas.width = 1; tabletContext.canvas.height = 1; }
    transition = null; rest.clear(); animated.length = 0;
  }

  function getStats() {
    return {
      renderFrames, targetFps: 60, running: active && !paused && !fault && !disposed,
      paused, disposed, ready, action, busy, reduced, elapsed: elapsedAt(now()) / 1000,
      rootX: root?.position.x ?? 0, rootY: root?.position.y ?? 0, rootZ: root?.position.z ?? 0,
      rootScale: root ? root.scale.toArray() : [1, 1, 1],
      cameraPosition: camera ? camera.position.toArray() : null,
      geometryVertices, uniqueGeometryVertices, meshCount,
      drawCalls: renderer?.info.render.calls ?? 0, triangles: renderer?.info.render.triangles ?? 0,
      pixelRatio, width, height, lastFrameTime, lastError
    };
  }

  const api = { play, setPaused, dispose, getStats };
  try {
    if (!canvas || typeof canvas.getContext !== 'function' || typeof canvas.getBoundingClientRect !== 'function') {
      throw new Error('createBoyiModel 需要可测量尺寸的 HTML canvas。');
    }
    if (THREE.REVISION !== '180') throw new Error('此模块需要宿主提供 Three.js 0.180.0。');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = false;
    canvas.addEventListener('webglcontextlost', contextLost, false);
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-3, 3, 3.4, -3.4, 0.1, 60);
    camera.position.set(6, 4.2, 13);
    camera.lookAt(0, 2.65, 0);
    root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.HemisphereLight(0xf3faff, 0x50464c, 2.3));
    const key = new THREE.DirectionalLight(0xfff4ed, 3.2);
    key.position.set(-4, 7, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0xa7e8ff, 1.5);
    rim.position.set(5, 5, -3); scene.add(rim);

    const standard = (color, roughness = 0.4, metalness = 0.12) => trackMaterial(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    const white = standard(0xf4f0ee, 0.34), wine = standard(0x7b2939, 0.53);
    const dark = standard(0x262b32, 0.48), black = standard(0x080f18, 0.2, 0.3);
    const metal = standard(0x626a74, 0.3, 0.62);
    const cyan = trackMaterial(new THREE.MeshStandardMaterial({ color: 0x88edff, emissive: 0x36cbe8, emissiveIntensity: 0.7, roughness: 0.3 }));
    const sphere = trackGeometry(new THREE.SphereGeometry(1, 20, 12));
    const headSphere = trackGeometry(new THREE.SphereGeometry(1, 32, 20));
    const capsule = trackGeometry(new THREE.CapsuleGeometry(0.5, 1, 4, 12));
    const cylinder = trackGeometry(new THREE.CylinderGeometry(1, 1, 1, 20));
    const ring = trackGeometry(new THREE.TorusGeometry(1, 0.105, 6, 24));
    const eyeCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(-0.22, -0.05, 0), new THREE.Vector3(-0.17, 0.22, 0),
      new THREE.Vector3(0.17, 0.22, 0), new THREE.Vector3(0.22, -0.05, 0)
    );
    const eyeGeometry = trackGeometry(new THREE.TubeGeometry(eyeCurve, 18, 0.045, 6, false));

    mesh(root, sphere, white, [0, 2.62, 0], [0.76, 0.91, 0.46]);
    mesh(root, sphere, dark, [0, 1.83, 0], [0.61, 0.23, 0.39]);
    mesh(root, cylinder, dark, [0, 3.38, 0], [0.25, 0.25, 0.25]);
    mesh(root, sphere, cyan, [0, 2.88, 0.454], [0.18, 0.045, 0.025]);
    mesh(root, sphere, white, [-0.35, 2.25, 0.4], [0.23, 0.23, 0.055]);
    mesh(root, capsule, wine, [-0.35, 2.39, 0.46], [0.04, 0.21, 0.025]).rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const points = [new THREE.Vector3(side * 0.28, 3.35, 0.38), new THREE.Vector3(side * 0.43, 3.05, 0.45), new THREE.Vector3(side * 0.28, 2.92, 0.48), new THREE.Vector3(side * 0.48, 2.56, 0.42)];
      const line = new THREE.CurvePath();
      for (let i = 1; i < points.length; i += 1) line.add(new THREE.LineCurve3(points[i - 1], points[i]));
      mesh(root, trackGeometry(new THREE.TubeGeometry(line, 12, 0.026, 5, false)), wine);
    }

    head = joint(root, [0, 3.96, 0]); animated.push(head);
    mesh(head, headSphere, white, [0, 0.12, 0], [1.18, 0.96, 0.76]);
    mesh(head, headSphere, black, [0, 0.1, 0.5], [1.025, 0.71, 0.36]);
    for (const side of [-1, 1]) {
      mesh(head, eyeGeometry, cyan, [side * 0.44, 0.05, 0.91]);
      const ear = joint(head, [side * 1.16, 0.1, -0.01]);
      mesh(ear, cylinder, wine, [side * 0.03, 0, 0], [0.39, 0.2, 0.39]).rotation.z = Math.PI / 2;
      mesh(ear, cylinder, white, [side * 0.14, 0, 0], [0.34, 0.16, 0.34]).rotation.z = Math.PI / 2;
      mesh(ear, ring, cyan, [side * 0.23, 0, 0], [0.22, 0.22, 0.22]).rotation.y = Math.PI / 2;
      mesh(ear, cylinder, metal, [side * 0.235, 0, 0], [0.16, 0.012, 0.16]).rotation.z = Math.PI / 2;
    }
    const crown = trackGeometry(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2));
    mesh(head, crown, wine, [0, 0.75, -0.025], [1.2, 0.65, 0.82]);
    mesh(head, sphere, wine, [0, 1.39, -0.025], [0.13, 0.055, 0.12]);
    const brimShape = new THREE.Shape();
    brimShape.moveTo(-1.06, 0.05);
    brimShape.bezierCurveTo(-1.28, -0.48, -0.94, -1.18, -0.35, -1.28);
    brimShape.bezierCurveTo(0.48, -1.48, 1.29, -0.92, 1.08, 0.05);
    brimShape.quadraticCurveTo(0, -0.12, -1.06, 0.05);
    const brimGeometry = trackGeometry(new THREE.ExtrudeGeometry(brimShape, { depth: 0.035, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.025, bevelThickness: 0.018, curveSegments: 12 }));
    brimGeometry.rotateX(-Math.PI / 2);
    mesh(head, brimGeometry, white, [0, 0.705, 0.06], [1.02, 1, 1.02]);
    mesh(head, brimGeometry, wine, [0, 0.749, 0.06]);

    function buildArm(side) {
      const upperLength = 0.7, lowerLength = 0.65;
      const shoulder = joint(root, [side * 0.8, 3.02, 0]);
      shoulder.rotation.z = side * 0.1;
      mesh(shoulder, sphere, white, [0, -0.03, 0], [0.25, 0.25, 0.25]);
      mesh(shoulder, capsule, white, [0, -upperLength / 2, 0], [0.36, upperLength / 2, 0.36]);
      const elbow = joint(shoulder, [0, -upperLength, 0]);
      mesh(elbow, sphere, dark, [0, 0, 0], [0.18, 0.18, 0.18]);
      mesh(elbow, capsule, white, [0, -lowerLength / 2, 0], [0.34, lowerLength / 2, 0.34]);
      mesh(elbow, cylinder, wine, [0, -lowerLength + 0.08, 0], [0.18, 0.12, 0.18]);
      const hand = joint(elbow, [0, -lowerLength, 0]);
      mesh(hand, cylinder, dark, [0, 0, 0], [0.105, 0.12, 0.105]);
      mesh(hand, sphere, white, [0, -0.12, 0], [0.155, 0.18, 0.105]);
      const fingers = [];
      [-0.12, -0.04, 0.04, 0.12].forEach((x, i) => {
        const digit = joint(hand, [x, -0.22, 0.01]);
        digit.scale.y = [0.88, 1, 0.96, 0.78][i];
        mesh(digit, capsule, white, [0, -0.085, 0], [0.06, 0.085, 0.06]);
        mesh(digit, sphere, dark, [0, -0.165, 0], [0.035, 0.04, 0.035]);
        fingers.push(digit);
      });
      const thumb = joint(hand, [side * 0.14, -0.09, 0.035]);
      thumb.rotation.z = side * 0.8;
      mesh(thumb, capsule, white, [0, -0.075, 0], [0.075, 0.075, 0.075]);
      mesh(thumb, sphere, dark, [0, -0.14, 0], [0.043, 0.045, 0.043]);
      animated.push(shoulder, elbow, hand, ...fingers);
      return { shoulder, elbow, hand, fingers, upperLength, lowerLength };
    }
    left = buildArm(-1); right = buildArm(1);
    legs = [-1, 1].map(side => {
      const hip = joint(root, [side * 0.34, 1.76, 0]);
      mesh(hip, capsule, white, [0, -0.32, 0], [0.43, 0.32, 0.43]);
      const knee = joint(hip, [0, -0.64, 0]);
      mesh(knee, sphere, dark, [0, 0, 0], [0.225, 0.2, 0.22]);
      mesh(knee, ring, cyan, [0, 0, 0.205], [0.105, 0.105, 0.105]);
      mesh(knee, capsule, white, [0, -0.27, 0], [0.43, 0.25, 0.43]);
      mesh(knee, sphere, wine, [0, -0.96, 0.15], [0.33, 0.105, 0.52]);
      mesh(knee, sphere, white, [0, -0.77, 0.15], [0.32, 0.29, 0.5]);
      mesh(knee, sphere, wine, [side * 0.27, -0.72, 0.02], [0.045, 0.12, 0.13]);
      mesh(knee, sphere, cyan, [0, -0.65, 0.56], [0.15, 0.027, 0.025]);
      animated.push(hip, knee);
      return { hip, knee };
    });

    tablet = joint(root, [0, 0, 0]);
    const tabletBody = trackGeometry(new THREE.ExtrudeGeometry(roundedRect(-0.42, -0.54, 0.84, 1.08, 0.075), { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, steps: 1, curveSegments: 5 }));
    mesh(tablet, tabletBody, metal);
    const surface = document.createElement('canvas');
    surface.width = 256; surface.height = 384;
    tabletContext = surface.getContext('2d');
    if (!tabletContext) throw new Error('无法创建平板屏幕画布。');
    tabletTexture = new THREE.CanvasTexture(surface);
    tabletTexture.colorSpace = THREE.SRGBColorSpace;
    tabletTexture.generateMipmaps = false;
    tabletTexture.minFilter = THREE.LinearFilter;
    tabletTexture.magFilter = THREE.LinearFilter;
    textures.add(tabletTexture);
    const screenGeometry = trackGeometry(new THREE.ShapeGeometry(roundedRect(-0.36, -0.46, 0.72, 0.92, 0.045), 5));
    const positions = screenGeometry.getAttribute('position'), uv = screenGeometry.getAttribute('uv');
    for (let i = 0; i < positions.count; i += 1) uv.setXY(i, (positions.getX(i) + 0.36) / 0.72, (positions.getY(i) + 0.46) / 0.92);
    uv.needsUpdate = true;
    const screenMaterial = trackMaterial(new THREE.MeshBasicMaterial({ map: tabletTexture, toneMapped: false }));
    mesh(tablet, screenGeometry, screenMaterial, [0, 0, 0.086]);
    mesh(tablet, sphere, dark, [0, -0.503, 0.085], [0.025, 0.025, 0.007]);
    paintTablet(0);
    tablet.visible = false;
    rememberPose();
    scene.traverse(object => {
      if (object.isMesh) { meshCount += 1; geometryVertices += object.geometry.getAttribute('position').count; }
    });
    for (const geometry of geometries) uniqueGeometryVertices += geometry.getAttribute('position').count;
    resize();
    if (!fault) {
      ready = true;
      resetPose();
      render();
      if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(resize); observer.observe(canvas); }
      window.addEventListener('resize', resize, { passive: true });
    }
  } catch (error) {
    fail(error);
    dispose();
  }
  return api;
}
