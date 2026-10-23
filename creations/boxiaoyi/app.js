import {STORAGE_KEY,ACTIONS,readState,saveState,normalizeState,stageFor,remaining,applyCare,beginSession,cancelSession,tickSession,createSequence,matchSequence} from './state.js?v=14';

const $ = selector => document.querySelector(selector);
const motionQuery = matchMedia('(prefers-reduced-motion:reduce)');
let storage;
try { storage = window.localStorage; } catch { storage = {getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}}; }
let {state,persistent} = readState(storage);
if (motionQuery.matches) state.motion = false;
let lastTick = performance.now(),lastSaved = 0,feedbackUntil = 0,live = true;
let visualAction = {name:'idle',start:performance.now(),duration:0};
let model = null,drawRequest = 0,lastDraw = 0,renderCount = 0,yaw = 0,tilt = 0,drag = null,frameFailures = 0;
let memory = null,memoryTimer = 0,sequenceTimer = 0;
const canvas = $('#model-canvas'),stage = $('#model-stage'),fallback = $('#fallback-avatar');
const symbols = ['▤','✦','✿','☾'];
const lines = {wave:'见到你真好，今天也一起向前走吧',pet:'嘿嘿，收到你的摸摸头了',feed:'补能完成！又有精神了',play:'一起伸个懒腰，再跳一下',study:'我在这里，陪你读完这一小段',rest:'慢慢呼吸，休息一下就好',memory:'顺序记住了，我们配合得不错'};

function persist() {
  persistent = saveState(storage,state);
  $('#storage-note').textContent = persistent ? '成长保存在当前设备的浏览器，刷新后仍会记得' : '浏览器暂时无法保存，本次成长会保留到关闭页面前';
}
function feedback(text) { $('#feedback').textContent = text;feedbackUntil = performance.now()+4500; }
function setVisual(name,duration=2400) {
  visualAction = {name,start:performance.now(),duration};
  $('#speech').textContent = lines[name] || '今天想一起做点什么？';
  fallback.dataset.action = '';
  // Restart the CSS-only fallback feedback without duplicating render loops.
  void fallback.offsetWidth;
  fallback.dataset.action = name;
  stage.dataset.pose = name;
  requestDraw();
}
function care(action) {
  if (state.mode !== 'idle' && ['study','rest','play','feed'].includes(action)) {feedback('先结束当前陪伴，再开始下一项');return;}
  if (['study','rest'].includes(action)) {
    const result = beginSession(state,action);state = result.state;feedback(result.reason);
    if (result.ok) {setVisual(action,Infinity);persist();}
  } else {
    const result = applyCare(state,action);state = result.state;feedback(result.reason);
    if (result.ok) {setVisual(action);persist();}
  }
  updateUI();
}
function updateUI() {
  const now = Date.now(),growth = stageFor(state.xp),inSession = state.mode !== 'idle';
  $('#energy').value = state.energy;$('#energy-value').value = state.energy;
  $('#mood').value = state.mood;$('#mood-value').value = state.mood;
  $('#mood-label').textContent = state.energy < 15 ? '想歇一小会儿' : state.mood >= 85 ? '今天特别开心' : state.mood >= 50 ? '今天心情不错' : '想和你待一会儿';
  $('#stage-badge').textContent = `${growth.name} · 成长 ${state.xp}`;
  $('#growth-stage').textContent = growth.name;
  $('#growth-detail').textContent = growth.next ? `${state.xp} / ${growth.next} 成长` : `${state.xp} 成长 · 默契已达成`;
  $('#growth-reward').textContent = growth.reward;
  $('#growth').max = growth.next ? growth.next-growth.base : 100;$('#growth').value = growth.next ? state.xp-growth.base : 100;
  $('#motion').checked = state.motion && !motionQuery.matches;
  document.body.classList.toggle('motion-off',!state.motion || motionQuery.matches);
  for (const button of document.querySelectorAll('[data-care]')) {
    const action = button.dataset.care,wait = remaining(state,action,now),blocked = inSession && ['study','rest','play','feed'].includes(action);
    button.disabled = !!wait || blocked;
    button.classList.toggle('active',state.mode === action);
    button.setAttribute('aria-pressed',String(state.mode === action));
    const base = {wave:'打个招呼',pet:'靠近一点',feed:'精力 +18',study:'专注 30 秒',play:'放松一下',rest:'恢复 8 秒'}[action];
    button.querySelector('small').textContent = wait ? `${Math.ceil(wait/1000)} 秒后再试` : base;
  }
  $('#session').hidden = !inSession;
  if (inSession) {
    const goal = state.mode === 'study' ? 30000 : 8000,value = state.mode === 'study' ? state.focusMs : state.restMs;
    $('#session-title').textContent = state.mode === 'study' ? '安静陪读中' : '休息恢复中';
    $('#session-time').textContent = `${Math.ceil((goal-value)/1000)} 秒`;
    $('#session-progress').value = value/goal*100;
  }
  $('#open-memory').disabled = inSession || remaining(state,'memory',now)>0;
  if (!persistent) $('#storage-note').textContent = '浏览器暂时无法保存，本次成长会保留到关闭页面前';
  if (model) {
    const changed=model.star.visible !== (state.xp>=60) || model.flower.visible !== (state.xp>=160);
    model.star.visible = state.xp >= 60;model.flower.visible = state.xp >= 160;
    if(changed)requestDraw();
  }
}
function motionAllowed() {return state.motion && !motionQuery.matches;}
function requestDraw() {if (!live || document.hidden || !model || drawRequest) return;drawRequest = requestAnimationFrame(draw);}
function draw(now) {
  drawRequest = 0;if (!live || document.hidden || !model) return;
  const motion = motionAllowed(),name = state.mode !== 'idle' ? state.mode : now-visualAction.start < visualAction.duration ? visualAction.name : 'idle';
  if (motion && now-lastDraw < (name === 'idle' ? 33 : 16)) {requestDraw();return;}
  lastDraw = now;
  try {
    const {renderer,scene,camera,avatar,shape,leftArm,rightArm,star,book,cup,halo} = model;
    const t = now/1000,age = (now-visualAction.start)/1000,active = name !== 'idle';
    avatar.update(t,camera,false,{});avatar.root.children[1].visible = false;
    avatar.root.rotation.set(0,yaw,0);shape.position.y = 0;shape.rotation.set(0,0,0);
    leftArm.rotation.set(0,0,0);rightArm.rotation.set(0,0,0);
    if (motion) {
      shape.position.y = Math.sin(t*1.8)*.006;
      if (name === 'wave') {rightArm.rotation.z = 2.25+Math.sin(age*15)*.22;rightArm.rotation.x = -.2;}
      if (name === 'pet') {shape.rotation.z = Math.sin(age*7)*.045;leftArm.rotation.z = -.18;rightArm.rotation.z = .18;shape.position.y -= .028*Math.abs(Math.sin(age*6));}
      if (name === 'play') {shape.position.y += Math.abs(Math.sin(age*6))*.13;leftArm.rotation.z = -.6;rightArm.rotation.z = .6;}
      if (name === 'feed') {rightArm.rotation.x = -1.08+Math.sin(age*4)*.12;shape.rotation.x = Math.sin(age*3)*.025;}
      if (name === 'study') {leftArm.rotation.x = -.68;rightArm.rotation.x = -.74;shape.rotation.x = .045;}
      if (name === 'rest') {shape.position.y -= .045;shape.rotation.z = .035*Math.sin(t*.8);leftArm.rotation.z = -.12;}
      halo.rotation.z = t*.1;star.rotation.y = Math.sin(t)*.12;
    } else {
      // A still, recognizable pose remains after motion is disabled.
      if (name === 'wave') rightArm.rotation.z = 2.25;
      if (name === 'study') {leftArm.rotation.x = -.68;rightArm.rotation.x = -.74;}
      if (name === 'feed') rightArm.rotation.x = -1.08;
    }
    book.visible = name === 'study';cup.visible = name === 'feed';
    camera.position.set(0,1.15+tilt,3.25);camera.lookAt(0,.87,0);
    renderer.render(scene,camera);renderCount++;
    stage.dataset.pose = name;stage.dataset.renderer = 'webgl';
    if (motion || active) {if (motion) requestDraw();}
  } catch (error) {frameFailures++;useFallback('三维画面暂时不可用，继续用轻量形象互动');}
}
function useFallback(message) {
  if (drawRequest) cancelAnimationFrame(drawRequest);drawRequest = 0;
  if (model) {model.dispose();model = null;}
  canvas.hidden = true;fallback.hidden = false;$('#model-loading').hidden = true;
  $('#view-help').textContent = '轻量形象 · 按钮照常可用';
  $('#speech').textContent = message;
  stage.dataset.renderer = 'fallback';
  for (const id of ['rotate-left','rotate-right','reset-view']) $( '#'+id).disabled = true;
}
async function initializeModel() {
  if (new URLSearchParams(location.search).get('view') === 'lite') {useFallback('轻量模式，也可以一起成长');return;}
  try {
    const [THREE,{createAvatar}] = await Promise.all([import('../../vendor/three/three.module.js'),import('../../cottage/avatars.js?v=62a22527fc64')]);
    if (!live) return;
    const renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:!matchMedia('(pointer:coarse)').matches,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1,matchMedia('(pointer:coarse)').matches?1.25:1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;renderer.toneMapping = THREE.ACESFilmicToneMapping;renderer.toneMappingExposure = 1.22;
    const scene = new THREE.Scene(),camera = new THREE.PerspectiveCamera(37,1,.1,30);
    scene.add(new THREE.HemisphereLight(0xfffbf2,0x9c8983,2.3));
    const light = new THREE.DirectionalLight(0xfff6e8,3.0);light.position.set(3,4,4);scene.add(light);
    const rim = new THREE.DirectionalLight(0xb0cfdb,1.3);rim.position.set(-3,3,-2);scene.add(rim);
    const avatar = createAvatar(THREE,{avatarId:'scholar-slate',name:'博小医',quality:'smooth'});
    // Reuse the existing neutral glasses rig, with a white coat and Boyi red pin.
    avatar.root.traverse(node=>{for(const mat of (Array.isArray(node.material)?node.material:[node.material])) {if(mat?.color?.getHex() === 0x91a4a6)mat.color.setHex(0xf3eee7);}});
    avatar.root.children[1].visible = false;scene.add(avatar.root);
    const extras = [],materials = [],textures = [];
    function mesh(geometry,color,position,rotation) {
      const material = new THREE.MeshStandardMaterial({color,roughness:.7});materials.push(material);extras.push(geometry);
      const object = new THREE.Mesh(geometry,material);if(position)object.position.set(...position);if(rotation)object.rotation.set(...rotation);scene.add(object);return object;
    }
    mesh(new THREE.CylinderGeometry(.71,.78,.095,64),0xe3c6b3,[0,-.018,0]);
    mesh(new THREE.CylinderGeometry(.68,.68,.012,64),0xf8efe3,[0,.035,0]);
    const halo = mesh(new THREE.TorusGeometry(.91,.012,8,72),0xc7a783,[0,.76,-.26]);
    const halo2 = mesh(new THREE.TorusGeometry(.96,.004,6,72),0xd5bca2,[0,.76,-.27]);halo2.rotation.z = .2;
    const pin = mesh(new THREE.SphereGeometry(.028,12,8),0x8d202c,[.12,.845,.148]);avatar.root.add(pin);scene.remove(pin);avatar.root.add(pin);
    const pinBar = mesh(new THREE.BoxGeometry(.011,.035,.006),0xfff5df,[.12,.845,.175]);scene.remove(pinBar);avatar.root.add(pinBar);
    const pinCross = mesh(new THREE.BoxGeometry(.03,.009,.006),0xfff5df,[.12,.845,.176]);scene.remove(pinCross);avatar.root.add(pinCross);
    // A small stethoscope supplies the medical identity without copying the owner's avatar.
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.085,.982,.145),new THREE.Vector3(-.14,.79,.17),new THREE.Vector3(-.025,.694,.18),new THREE.Vector3(.087,.805,.17),new THREE.Vector3(.085,.982,.145)]);
    const stethoscope = mesh(new THREE.TubeGeometry(curve,24,.009,6,false),0x535252);scene.remove(stethoscope);avatar.root.add(stethoscope);
    const disc = mesh(new THREE.CylinderGeometry(.027,.027,.009,16),0xb8a67f,[.086,.785,.185],[Math.PI/2,0,0]);scene.remove(disc);avatar.root.add(disc);
    const shape = avatar.root.children[0],leftArm = avatar.root.getObjectByName('leftArm'),rightArm = avatar.root.getObjectByName('rightArm');
    const book = new THREE.Group();
    const cover = mesh(new THREE.BoxGeometry(.32,.045,.22),0x8d202c);const pages = mesh(new THREE.BoxGeometry(.286,.035,.19),0xf5e7cd);
    scene.remove(cover,pages);book.add(cover,pages);pages.position.y=.006;book.position.set(0,.76,.26);book.rotation.x=.22;avatar.root.add(book);
    const cup = mesh(new THREE.CylinderGeometry(.055,.045,.12,18),0xefe2c8,[.255,.89,.18]);scene.remove(cup);avatar.root.add(cup);
    const star = new THREE.Group();star.position.set(.48,1.43,.06);scene.add(star);
    const starShape = new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.043:.095;i?starShape.lineTo(Math.cos(a)*r,Math.sin(a)*r):starShape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}starShape.closePath();
    const starMesh = mesh(new THREE.ExtrudeGeometry(starShape,{depth:.018,bevelEnabled:false}),0xcc9a4a);scene.remove(starMesh);star.add(starMesh);
    const flower = new THREE.Group();flower.position.set(-.5,.12,.15);scene.add(flower);
    const vase = mesh(new THREE.CylinderGeometry(.063,.043,.12,18),0x8d202c);scene.remove(vase);flower.add(vase);
    const stem = mesh(new THREE.CylinderGeometry(.007,.007,.19,8),0x708654,[0,.14,0]);scene.remove(stem);flower.add(stem);
    for(let i=0;i<6;i++){const a=i*Math.PI/3,p=mesh(new THREE.SphereGeometry(.026,8,6),0xe5b4b4,[Math.cos(a)*.028,.24+Math.sin(a)*.028,0]);scene.remove(p);flower.add(p);}
    const core = mesh(new THREE.SphereGeometry(.02,8,6),0xe3bb63,[0,.24,.02]);scene.remove(core);flower.add(core);
    const raycaster = new THREE.Raycaster(),pointer = new THREE.Vector2();
    model = {THREE,renderer,scene,camera,avatar,shape,leftArm,rightArm,halo,star,flower,book,cup,raycaster,pointer,
      dispose(){avatar.dispose();for(const geometry of extras)geometry.dispose();for(const mat of materials)mat.dispose();for(const texture of textures)texture.dispose();renderer.dispose();}};
    const resize = () => {if(!model)return;const bounds=stage.getBoundingClientRect();camera.aspect=Math.max(1,bounds.width)/Math.max(1,bounds.height);camera.updateProjectionMatrix();renderer.setSize(Math.max(1,bounds.width),Math.max(1,bounds.height),false);requestDraw();};
    model.observer = new ResizeObserver(resize);model.observer.observe(stage);const originalDispose=model.dispose;model.dispose=()=>{model?.observer?.disconnect();originalDispose();};
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();useFallback('画面连接暂停，轻量形象继续陪你');},{once:true});
    resize();$('#model-loading').hidden = true;updateUI();requestDraw();
  } catch {useFallback('三维画面暂时不可用，继续用轻量形象互动');}
}

document.querySelectorAll('[data-care]').forEach(button=>button.addEventListener('click',()=>care(button.dataset.care)));
$('#cancel-session').addEventListener('click',()=>{state=cancelSession(state);setVisual('idle',0);$('#speech').textContent='随时回来，我都在这里';feedback('这次先停一停，未完成的陪读不计成长');persist();updateUI();});
$('#motion').addEventListener('change',()=>{state={...state,motion:$('#motion').checked};persist();updateUI();if(drawRequest){cancelAnimationFrame(drawRequest);drawRequest=0;}requestDraw();});
motionQuery.addEventListener('change',()=>{if(motionQuery.matches)state={...state,motion:false};updateUI();if(drawRequest){cancelAnimationFrame(drawRequest);drawRequest=0;}requestDraw();});
$('#rotate-left').addEventListener('click',()=>{yaw-=Math.PI/6;requestDraw();});$('#rotate-right').addEventListener('click',()=>{yaw+=Math.PI/6;requestDraw();});$('#reset-view').addEventListener('click',()=>{yaw=0;tilt=0;requestDraw();});
stage.addEventListener('keydown',event=>{
  if(event.target!==stage)return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','m','M'].includes(event.key))event.preventDefault();
  if(event.key==='ArrowLeft')yaw-=Math.PI/12;if(event.key==='ArrowRight')yaw+=Math.PI/12;
  if(event.key==='ArrowUp')tilt=Math.min(.5,tilt+.08);if(event.key==='ArrowDown')tilt=Math.max(-.3,tilt-.08);
  if(event.key===' ')care('wave');if(event.key.toLowerCase()==='m')care('pet');requestDraw();
});
stage.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('button'))return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,total:0};if(event.pointerType==='mouse')stage.setPointerCapture(event.pointerId);});
stage.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId||!model)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.total+=Math.abs(dx)+Math.abs(dy);yaw+=dx*.012;tilt=Math.max(-.3,Math.min(.5,tilt+dy*.001));drag.x=event.clientX;drag.y=event.clientY;requestDraw();});
function endPointer(event) {
  if(!drag||drag.id!==event.pointerId)return;
  const moved=drag.total;drag=null;if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
  if(event.type==='pointerup'&&moved<9&&model) {
    const r=canvas.getBoundingClientRect();model.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);model.raycaster.setFromCamera(model.pointer,model.camera);model.scene.updateMatrixWorld(true);
    const hit=model.raycaster.intersectObject(model.avatar.root,true)[0];if(hit&&hit.point.y>1.05)care('pet');
  }
}
stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);stage.addEventListener('lostpointercapture',()=>{drag=null;});
$('#menu-toggle').addEventListener('click',()=>{const open=$('#menu-toggle').getAttribute('aria-expanded')!=='true';$('#menu-toggle').setAttribute('aria-expanded',String(open));$('#site-nav').classList.toggle('open',open);});

function clearMemoryTimers() {clearTimeout(memoryTimer);clearTimeout(sequenceTimer);memoryTimer=sequenceTimer=0;document.querySelectorAll('[data-memory]').forEach(b=>b.classList.remove('lit'));}
function closeMemory() {clearMemoryTimers();memory=null;$('#memory-dialog').close();$('#open-memory').focus();}
$('#open-memory').addEventListener('click',()=>{
  if(state.mode!=='idle')return;
  const wait=remaining(state,'memory');if(wait){feedback(`稍等 ${Math.ceil(wait/1000)} 秒再试`);return;}
  memory=null;clearMemoryTimers();$('#memory-instructions').textContent='先看顺序，再按相同顺序点亮四张卡片';$('#memory-sequence').textContent='';$('#start-memory').disabled=false;$('#start-memory').textContent='开始挑战';document.querySelectorAll('[data-memory]').forEach(b=>b.disabled=true);$('#memory-dialog').showModal();
});
$('#close-memory').addEventListener('click',closeMemory);
$('#memory-dialog').addEventListener('cancel',event=>{event.preventDefault();closeMemory();});
$('#start-memory').addEventListener('click',()=>{
  if(state.mode!=='idle'||remaining(state,'memory'))return;
  clearMemoryTimers();memory={sequence:createSequence(state.xp>=160?5:4),input:[],phase:'show',index:0};
  $('#start-memory').disabled=true;$('#memory-sequence').textContent='';$('#memory-instructions').textContent='看好亮起的顺序，数字也会同步显示';document.querySelectorAll('[data-memory]').forEach(b=>b.disabled=true);
  const showNext=()=>{
    if(!memory||memory.phase!=='show')return;
    if(memory.index>=memory.sequence.length){memory.phase='input';$('#memory-sequence').textContent='轮到你了';$('#memory-instructions').textContent=`按刚才的顺序，依次点 ${memory.sequence.length} 次`;document.querySelectorAll('[data-memory]').forEach(b=>b.disabled=false);$('#memory-dialog').querySelector('[data-memory="0"]').focus();memoryTimer=setTimeout(()=>finishMemory(false,'想不起来也没关系，再试一次'),30000);return;}
    const value=memory.sequence[memory.index++],button=$(`[data-memory="${value}"]`);button.classList.add('lit');$('#memory-sequence').textContent=`${memory.index}. ${value+1} ${symbols[value]}`;
    sequenceTimer=setTimeout(()=>{button.classList.remove('lit');$('#memory-sequence').textContent='';memoryTimer=setTimeout(showNext,220);},700);
  };showNext();
});
function finishMemory(success,message) {
  clearMemoryTimers();if(memory)memory.phase='done';document.querySelectorAll('[data-memory]').forEach(b=>b.disabled=true);
  if(success){const result=applyCare(state,'memory');state=result.state;if(result.ok){setVisual('memory');persist();}message=result.reason;}
  $('#memory-instructions').textContent=message;$('#memory-sequence').textContent=success?'✦ 完成了':'再来一次也很好';$('#start-memory').textContent=success?'完成，稍后再挑战':'再试一次';$('#start-memory').disabled=success;feedback(message);updateUI();
}
function answerMemory(value) {
  if(!memory||memory.phase!=='input')return;
  memory.input.push(value);const status=matchSequence(memory.sequence,memory.input);
  $('#memory-sequence').textContent=`已点 ${memory.input.length} / ${memory.sequence.length}`;
  if(status==='miss')finishMemory(false,'顺序差了一点点，重新观察一次吧');if(status==='complete')finishMemory(true,'');
}
document.querySelectorAll('[data-memory]').forEach(button=>button.addEventListener('click',()=>answerMemory(Number(button.dataset.memory))));
$('#memory-dialog').addEventListener('keydown',event=>{if(/^[1-4]$/.test(event.key)){event.preventDefault();answerMemory(Number(event.key)-1);}});

const clock=setInterval(()=>{
  const now=performance.now(),dt=now-lastTick;lastTick=now;if(document.hidden||!live)return;
  const result=tickSession(state,dt);state=result.state;
  if(result.completed){feedback(`${result.completed==='study'?'陪读':'休息'}完成 · 成长 +${ACTIONS[result.completed].xp}`);setVisual('wave',2300);persist();}
  if(state.mode!=='idle'&&now-lastSaved>2000){lastSaved=now;persist();}
  if(feedbackUntil&&now>feedbackUntil){$('#feedback').textContent='成长慢慢来，每次相处都会留下印记';feedbackUntil=0;}
  updateUI();
},250);
document.addEventListener('visibilitychange',()=>{
  document.body.classList.toggle('page-hidden',document.hidden);
  lastTick=performance.now();
  if(document.hidden){if(drawRequest)cancelAnimationFrame(drawRequest);drawRequest=0;persist();if(memory?.phase==='show'||memory?.phase==='input')finishMemory(false,'挑战已暂停，回来后重新开始就好');}
  else requestDraw();
});
window.addEventListener('storage',event=>{
  if(event.key!==STORAGE_KEY&&event.key!==null)return;
  try {
    state=normalizeState(event.newValue?JSON.parse(event.newValue):null);lastTick=performance.now();
    // Another tab can reset or start a session: stale challenges must not award against its state.
    if($('#memory-dialog').open)closeMemory();
    setVisual(state.mode,state.mode==='idle'?0:Infinity);updateUI();requestDraw();feedback('已更新当前浏览器另一页面的成长');
  } catch {/* Ignore a malformed event without replacing the usable current state. */}
});
window.addEventListener('pagehide',event=>{persist();if(drawRequest)cancelAnimationFrame(drawRequest);drawRequest=0;if(!event.persisted){live=false;clearInterval(clock);clearMemoryTimers();model?.dispose();model=null;}});
window.addEventListener('pageshow',()=>{lastTick=performance.now();requestDraw();});
// Read-only diagnostics make the visible behavior testable without changing care state.
window.boyiBoxiaoyi=Object.freeze({getState:()=>JSON.parse(JSON.stringify(state)),getView:()=>({renderer:stage.dataset.renderer||'loading',pose:stage.dataset.pose||'idle',yaw,tilt,renderCount,drawPending:!!drawRequest,hidden:document.hidden,motion:motionAllowed(),failures:frameFailures,star:!!model?.star.visible,flower:!!model?.flower.visible}),version:'0.1'});
document.body.classList.toggle('page-hidden',document.hidden);
persist();updateUI();initializeModel();
