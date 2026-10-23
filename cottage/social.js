import {createAvatar,avatarPresets,getAvatarMetrics} from './avatars.js?v=62a22527fc64';
import {createVoiceClient} from './voice.js?v=7270db12f52c';
import {findSeat,findItem,ROOM_LAYOUT} from './room-layout.js?v=87b8be1d1b17';
export function createSocialClient({THREE,scene,camera,player,getYaw,getMovement,onSpawn,openPanel,closePanel,notice,onRoomChange,onState,onInteraction,canSyncMovement=()=>true,quality='balanced'}){
 const prefix=(['localhost','127.0.0.1'].includes(location.hostname)?location.origin:'https://122.51.44.155')+'/boyi-members/api/cottage';
 const $=s=>document.querySelector(s);let self=null,token='',cursor=0,closed=false,joined=false,target=null,choosing=null,lastState=0,retry=0,pollController=null,roomEpoch=0,pollGeneration=0,resumeCredentials=null,transitioning=false,entering=false,joining=false,applyQueue=Promise.resolve();
 const peers=new Map(),inbox=new Map(),messages=[];let occupants=[],conversationGeneration=0,conversationSelfName='';
 const messageTTL=60000;let serverOffset=0,lastSnapshotVersion=0,identityRevision=null;
 let sessionNickname='',entryChoiceShown=false,resumeChoices=false,reconnectTimer=null;
 function rememberNickname(value){sessionNickname=value;$('#visitor-name').value=value;}
 $('#visitor-name').value='';
 const roomMessages=[],seenEvents=new Set(),interactionPoses=new Map();
 let journalLease='',journalQueue=Promise.resolve();
 const voice=createVoiceClient({prefix,getAuth:()=>auth({}),getSelf:()=>self,getOccupants:()=>occupants,getPose:()=>({x:player.x,z:player.z,yaw:getYaw()}),notice});
 function poseFor(p){const serverTime=Date.now()+serverOffset,age=(serverTime-(p?.jumpAt||0))/1000,effect=interactionPoses.get(p?.participantId),acting=effect?.actionUntil>serverTime,receiving=effect?.receivedUntil>serverTime;if(effect&&!acting&&!receiving)interactionPoses.delete(p?.participantId);return{...p,speaking:p?.participantId===self?.participantId?voice.getStats().speaking:!!p?.voiceEnabled&&p.speakingUntil>serverTime,...(acting?{action:effect.action,actionAt:effect.actionAt}:{}),...(receiving?{interactionReceived:effect.received,interactionAt:effect.receivedAt}:{}),serverTime,seatHeight:findSeat(p?.room,p?.seatId)?.height,heldKind:p?.equippedItemId==='carrot'?'carrot':findItem(p?.room,p?.heldItemId)?.kind,jumpHeight:Number.isFinite(p?.y)?(p.grounded?0:Math.max(0,p.y)):age>0&&age<.88?Math.max(0,4.4*age-5*age*age):0};}
 function renderRoomChat(){const list=$('#room-messages');list.replaceChildren();for(const message of roomMessages){const line=document.createElement('p'),name=document.createElement('strong'),text=document.createElement('span');name.textContent=message.fromName+'：';text.textContent=message.text;line.append(name,text);list.append(line);}list.scrollTop=list.scrollHeight;}
 function clearRoomChat(){roomMessages.length=0;$('#room-messages').replaceChildren();$('#room-chat-text').value='';}

 function renderMessages(){const list=$('#chat-messages');list.replaceChildren();for(const message of messages){const line=document.createElement('p');line.className=message.mine?'mine':'';const name=document.createElement('small');name.textContent=message.mine?conversationSelfName||'我':message.fromName;const text=document.createElement('span');text.textContent=message.text;line.append(name,text);list.append(line);}list.scrollTop=list.scrollHeight;}
 function clearChat(){conversationGeneration++;conversationSelfName='';if(target)inbox.delete(target.participantId);messages.length=0;target=null;$('#chat-messages').replaceChildren();$('#chat-text').value='';$('#chat-status').textContent='';$('#chat-person').textContent='';document.dispatchEvent(new CustomEvent('boyi:chat-clear'));}
 function clearConversations(){seenEvents.clear();interactionPoses.clear();inbox.clear();clearChat();clearRoomChat();}
 function expireMessages(){const now=performance.now();for(const [id,list]of inbox){const fresh=list.filter(m=>now-m.receivedAt<messageTTL);if(fresh.length)inbox.set(id,fresh);else inbox.delete(id);}let changed=false;for(let i=messages.length-1;i>=0;i--)if(now-messages[i].receivedAt>=messageTTL){messages.splice(i,1);changed=true;}if(changed)renderMessages();const remaining=roomMessages.filter(m=>now-m.receivedAt<messageTTL);if(remaining.length!==roomMessages.length){roomMessages.splice(0,roomMessages.length,...remaining);renderRoomChat();}}
 const expiryTimer=setInterval(expireMessages,5000);
 let previewRenderer=null,previewScene=null,previewCamera=null,previewInitializing=null;const previewCache=new Map();
 async function avatarPreview(id,variant=0){const key=id+':'+variant;if(previewCache.has(key))return previewCache.get(key);if(!previewRenderer){if(!previewInitializing)previewInitializing=import('../vendor/three/three.module.js?v=c8211c69345d').then(({WebGLRenderer})=>{previewRenderer=new WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});previewRenderer.setSize(240,280);previewRenderer.setPixelRatio(1);previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;previewRenderer.toneMappingExposure=1.15;previewScene=new THREE.Scene();previewScene.add(new THREE.HemisphereLight(0xffffff,0x55504a,2.7));const light=new THREE.DirectionalLight(0xffe4be,3.3);light.position.set(2,4,3);previewScene.add(light);previewCamera=new THREE.PerspectiveCamera(33,240/280,.1,10);previewCamera.position.set(.6,1.05,3.4);previewCamera.lookAt(0,.87,0);});await previewInitializing;}const metrics=getAvatarMetrics(id);previewCamera.position.set(metrics.height*.36,metrics.height*.64,metrics.height*2.12);previewCamera.lookAt(0,metrics.height*.52,0);const model=createAvatar(THREE,{avatarId:id,variant,name:'',quality:'smooth'});if(model.root.children[1])model.root.children[1].visible=false;previewScene.add(model.root);previewRenderer.render(previewScene,previewCamera);const result=previewRenderer.domElement.toDataURL('image/png');model.dispose();previewCache.set(key,result);while(previewCache.size>16)previewCache.delete(previewCache.keys().next().value);return result;}
 function fillPreview(button,id,variant=0){const key=id+':'+variant;button.dataset.variant=String(variant);button.dataset.previewKey=key;avatarPreview(id,variant).then(src=>{if(!button.isConnected||button.dataset.previewKey!==key)return;const old=button.querySelector('.avatar-swatch,img');const image=document.createElement('img');image.src=src;image.alt='';image.width=240;image.height=280;old?.replaceWith(image);}).catch(()=>{});}
 async function request(route,body,signal){
  const controller=new AbortController(),cancel=()=>controller.abort(signal.reason||new DOMException('已取消连接','AbortError'));
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  const timer=setTimeout(()=>controller.abort(Error('博医服务器响应超时，请稍后重试')),route==='/poll'?28000:10000);
  try{const response=await fetch(prefix+route,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',...(route==='/presentation'&&body?.action==='load'?{'X-Boyi-Presentation-Upload':'1','X-Boyi-Participant':body.participantId,'X-Boyi-Token':body.token}:{})},body:JSON.stringify(body),signal:controller.signal});let data;try{data=await response.json();}catch(error){if(controller.signal.aborted)throw controller.signal.reason;throw Object.assign(Error('博医服务器暂时无法响应，请稍后重试'),{status:response.status});}if(!response.ok)throw Object.assign(Error(data.error||'这次连接未成功，请稍后再试'),{status:response.status,data});return data;}
  catch(error){if(controller.signal.aborted)throw controller.signal.reason||error;if(error instanceof TypeError)throw Error('无法连接博医服务器，请检查网络后重试');throw error;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }
 // Keep movement bounded on slow connections; reserve the connection for slides.
 let stateRequest=null,presentationTransfers=0;
 function cancelStateRequest(){const job=stateRequest;stateRequest=null;job?.controller.abort(new DOMException('位置同步已更新','AbortError'));}
 function beginPresentationTransfer(){presentationTransfers++;cancelStateRequest();let ended=false;return()=>{if(!ended){ended=true;presentationTransfers=Math.max(0,presentationTransfers-1);}};}
 const auth=extra=>({participantId:self?.participantId,token,...extra});
 function updateSelf(data){if(data.self)self=data.self;if(typeof data.canChooseAvatar==='boolean')self.canChooseAvatar=data.canChooseAvatar;if(Array.isArray(data.avatarChoices))self.avatarChoices=data.avatarChoices;$('#self-label').textContent=self?self.nickname+(self.verified?' · 博医学员':' · 访客'):'访客';$('#choose-avatar').hidden=!self;}
 function clearPeers(){for(const peer of peers.values())peer.model.dispose();peers.clear();}
 async function changeRoomWithPresence(room,epoch){
  const session=token,id=self?.participantId;let active=true,busy=false,controller,inFlight=Promise.resolve();
  const current=()=>!closed&&joined&&epoch===roomEpoch&&session===token&&id===self?.participantId;
  const renew=()=>{if(!active||!current()||busy)return;busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);inFlight=(async()=>{try{const data=await request('/poll',{participantId:id,token:session,cursor,waitMs:0},controller.signal);if(current()&&data.self?.room===self?.room)deliverEvents(data);}catch{}finally{clearTimeout(timeout);busy=false;}})();};
  const timer=setInterval(renew,4000);
  try{return await onRoomChange?.(room);}finally{active=false;clearInterval(timer);if(current())await inFlight;else controller?.abort();}
 }
 function deliverEvents(data){
  if(Number.isSafeInteger(data.identityRevision)){
   if(identityRevision!==null&&data.identityRevision<identityRevision)return;
   if(identityRevision!==null&&data.identityRevision!==identityRevision){journalLease='';voice.stop('账号身份已变化，语音已关闭');clearConversations();if($('#room-dialog').open&&!document.querySelector('[data-panel="chat"]').hidden)closePanel();}
   identityRevision=data.identityRevision;
  }
  if(data.self?.room===self?.room&&Number.isSafeInteger(data.cursor))cursor=Math.max(cursor,data.cursor);
  const events=[];for(const event of data.events||[]){if(!event||event.room!==self?.room||typeof event.id!=='string'||seenEvents.has(event.id))continue;seenEvents.add(event.id);events.push(event);while(seenEvents.size>512)seenEvents.delete(seenEvents.values().next().value);}
  for(const event of events)if(event.type==='chat'){const from=event.fromId||event.senderId||event.from,remote=typeof from==='object'?from.participantId:from;const message={receivedAt:performance.now(),fromId:remote,text:event.text,fromName:event.fromName||event.nickname||occupants.find(p=>p.participantId===remote)?.nickname||'同屋访客',mine:remote===self?.participantId};if(!message.mine){const id=remote;if(target?.participantId===id){showMessage(message);}else{if(!inbox.has(id))inbox.set(id,[]);const list=inbox.get(id);list.push(message);if(list.length>30)list.shift();notice((occupants.find(p=>p.participantId===remote)?.nickname||'同伴')+'发来一条消息，在“同屋的人”里查看');}}}
  for(const event of events)if(event.type==='room-chat'){roomMessages.push({fromName:event.fromName,text:event.text,receivedAt:performance.now()});while(roomMessages.length>40)roomMessages.shift();renderRoomChat();}
  for(const event of events)if(event.type==='interaction'&&['pet','bonk'].includes(event.kind)&&Number.isFinite(event.sentAt)&&Number.isFinite(event.expiresAt)&&event.expiresAt>Date.now()+serverOffset){const duration=event.kind==='pet'?700:350,source=interactionPoses.get(event.fromId)||{},recipient=interactionPoses.get(event.toId)||{};interactionPoses.set(event.fromId,{...source,action:event.kind,actionAt:event.sentAt,actionUntil:event.sentAt+duration});interactionPoses.set(event.toId,{...recipient,received:event.kind,receivedAt:event.sentAt,receivedUntil:event.sentAt+duration});onInteraction?.(event);}
 }
 async function applyData(data,{spawn=false,epoch=roomEpoch,signal}={}){if(signal?.aborted||closed||!joined||!token||epoch!==roomEpoch)return false;if(!Number.isSafeInteger(data.snapshotVersion)||data.snapshotVersion<=lastSnapshotVersion){deliverEvents(data);renderPeople();return false;}lastSnapshotVersion=data.snapshotVersion;if(Number.isFinite(data.serverTime))serverOffset=data.serverTime-Date.now();const previousRoom=self?.room,previousSeat=self?.seatId||null;updateSelf(data);const changed=!!self?.room&&self.room!==(previousRoom||'lobby');if(data.cursor!==undefined)cursor=data.cursor;if(Array.isArray(data.occupants))occupants=data.occupants;else if(changed)occupants=[];voice.reconcile?.();if(changed){journalLease='';transitioning=true;voice.stop('切换空间，语音已关闭');clearConversations();clearPeers();try{await changeRoomWithPresence(self.room,epoch);}finally{transitioning=false;}if(closed||epoch!==roomEpoch)return;}if(data.journal&&(!data.journal.locked||data.journal.editorId!==self?.participantId))journalLease='';if(spawn||changed||previousSeat!==(self?.seatId||null))onSpawn?.(self);
  const ids=new Set();for(const p of occupants){if(p.participantId===self?.participantId||p.room!==self?.room)continue;ids.add(p.participantId);let peer=peers.get(p.participantId);const signature=p.avatarId+':'+p.variant+':'+p.nickname;if(!peer||peer.signature!==signature){peer?.model.dispose();const model=createAvatar(THREE,{avatarId:p.avatarId,variant:p.variant,name:p.nickname,quality});model.root.position.set(p.x,0,p.z);scene.add(model.root);peer={signature,model,data:p};peers.set(p.participantId,peer);}peer.data=p;}
  for(const [id,peer]of peers)if(!ids.has(id)){peer.model.dispose();peers.delete(id);interactionPoses.delete(id);inbox.delete(id);if(target?.participantId===id)clearChat();}
  deliverEvents(data);
  onState?.(data,occupants);renderPeople();return true;
 }
 function apply(data,options={}){const epoch=options.epoch??roomEpoch;const job=applyQueue.then(()=>applyData(data,{...options,epoch}));applyQueue=job.catch(()=>{});return job;}
 async function join(options={}){
  if(joining||joined)return joined;joining=true;closed=false;transitioning=true;const epoch=++roomEpoch;$('#social-status').textContent='正在连接会客大厅';
  try{
   const chosen=(typeof options.nickname==='string'?options.nickname:sessionNickname||$('#visitor-name').value).trim(),resume=resumeCredentials?{...resumeCredentials}:null;
   if(!chosen){$('#social-status').textContent='先填写本次小屋昵称';openPanel('nickname');document.dispatchEvent(new CustomEvent('boyi:nickname-required'));return false;}
   const data=await request('/join',{nickname:chosen||undefined,...(resume?{resume}:{})});
   if(closed||epoch!==roomEpoch){if(data.participantId&&data.token)request('/leave',{participantId:data.participantId,token:data.token}).catch(()=>{});return false;}
   resumeCredentials={participantId:data.participantId,token:data.token};self=null;lastSnapshotVersion=0;identityRevision=null;token=data.token;joined=true;
   await apply(data,{spawn:true,epoch});if(closed||epoch!==roomEpoch)return false;
   rememberNickname(self.nickname);$('#social-status').textContent='已连接';$('#connect-room').hidden=true;$('#visitor-entry').hidden=false;retry=0;clearTimeout(reconnectTimer);poll(++pollGeneration);if(!entryChoiceShown||resumeChoices){entryChoiceShown=true;resumeChoices=false;showChoices();}return true;
  }catch(error){if(epoch!==roomEpoch||closed)return false;joined=false;token='';$('#social-status').textContent='尚未连接，可以先逛逛大厅';$('#connect-room').hidden=false;notice(error.message);if(resumeCredentials&&sessionNickname)scheduleReconnect();return false;}
  finally{if(epoch===roomEpoch)transitioning=false;joining=false;}
 }
 function scheduleReconnect(){clearTimeout(reconnectTimer);if(closed||!sessionNickname)return;reconnectTimer=setTimeout(()=>{reconnectTimer=null;if(!closed&&!joined)join();},3000);}
 async function poll(generation){
  while(!closed&&joined&&generation===pollGeneration){
   if(entering||transitioning){await new Promise(r=>setTimeout(r,50));continue;}const epoch=roomEpoch;
   try{pollController=new AbortController();const data=await request('/poll',auth({cursor,waitMs:20000}),pollController.signal);if(closed||generation!==pollGeneration)return;if(epoch!==roomEpoch)continue;await apply(data,{epoch});retry=0;}
   catch(error){
    if(closed||generation!==pollGeneration)return;if(epoch!==roomEpoch)continue;if(error.data?.self)await apply(error.data,{epoch});retry++;$('#social-status').textContent='正在重新连接';
    if(retry>3){const wasChoosing=$('#room-dialog').open&&!document.querySelector('[data-panel="avatar"]').hidden;resumeChoices=wasChoosing;choosing=null;cancelStateRequest();roomEpoch++;pollGeneration++;joined=false;token='';journalLease='';voice.stop('连接中断，语音已关闭');onState?.({disconnected:true},[]);clearConversations();clearPeers();occupants=[];self=null;renderPeople();transitioning=true;try{await onRoomChange?.('lobby');}finally{transitioning=false;}$('#social-status').textContent='连接中断，正在恢复当前会话';$('#connect-room').hidden=false;if(wasChoosing)showChoices();scheduleReconnect();return;}
    await new Promise(r=>setTimeout(r,Math.min(5000,retry*1000)));
   }
  }
 }
 function renderPeople(){const container=$('#people-list');container.replaceChildren();const others=occupants.filter(p=>p.participantId!==self?.participantId);$('#people-count').textContent=String(others.length+(joined?1:0));$('#people-empty').hidden=others.length>0;for(const person of others){const button=document.createElement('button');button.type='button';button.className='person-choice';const strong=document.createElement('strong');strong.textContent=person.nickname;const small=document.createElement('small');small.textContent=(person.verified?'博医学员':'访客')+(person.voiceEnabled?' · 语音中':'')+(person.seatId?' · 已入座':'')+(inbox.get(person.participantId)?.length?' · 有新消息':'')+' · 聊一聊 ↗';button.append(strong,small);button.onclick=()=>openChat(person);container.append(button);}}
 function showMessage(m){if(!Number.isFinite(m.receivedAt))m.receivedAt=performance.now();if(performance.now()-m.receivedAt>=messageTTL)return;messages.push(m);if(messages.length>40)messages.shift();renderMessages();}
 async function openChat(person){conversationGeneration++;conversationSelfName='';target=person;const generation=conversationGeneration,session=token,room=self?.room;messages.length=0;$('#chat-messages').replaceChildren();$('#chat-person').textContent=person.nickname;const pending=inbox.get(person.participantId)||[];for(const message of pending)showMessage(message);inbox.delete(person.participantId);openPanel('chat');document.dispatchEvent(new CustomEvent('boyi:chat-target',{detail:{participantId:person.participantId,nickname:person.nickname}}));$('#chat-text').focus();try{const result=await request('/conversation',auth({targetId:person.participantId}));if(joined&&token===session&&self?.room===room&&target===person&&conversationGeneration===generation&&result.participant?.participantId===person.participantId){$('#chat-person').textContent=result.participant.displayName||person.nickname;conversationSelfName=result.self?.displayName||'';renderMessages();}}catch(error){if(target===person&&conversationGeneration===generation)$('#chat-status').textContent=error.message;}}
 $('#chat-form').addEventListener('submit',async e=>{e.preventDefault();const input=$('#chat-text'),button=$('#chat-send'),text=input.value.trim();if(!text||!target||!joined||button.disabled)return;const recipient=target,session=token,room=self?.room,generation=conversationGeneration;const isCurrent=()=>joined&&token===session&&self?.room===room&&target===recipient&&conversationGeneration===generation;button.disabled=true;$('#chat-status').textContent='';try{await request('/chat',auth({targetId:recipient.participantId,text}));if(isCurrent()){showMessage({mine:true,text});if(input.value.trim()===text)input.value='';}}catch(error){if(isCurrent())$('#chat-status').textContent=error.message;}finally{button.disabled=false;}});
 function showChoices(){
  const connected=joined&&!!self&&!!token;
  const eligible=connected&&!!self?.canChooseAvatar;
  $('#avatar-reconnect').hidden=connected;
  $('#avatar-editor').hidden=!eligible;
  $('#avatar-access').hidden=eligible;
  $('#avatar-login').hidden=!connected||!!self?.verified;
  $('#avatar-access-status').textContent=!connected?'连接中断，重新连接后可继续选择；原来的形象会保留':self?.verified?'当前账号尚未获得博医五期选角资格；可以先进入大厅':'当前以访客身份进入。登录已认证的博医五期账号后，就能选择并保存形象';
  $('#avatar-choice-note').textContent='';
  openPanel('avatar');
  if(!eligible){choosing=null;return;}
  const list=$('#avatar-choices');list.replaceChildren();const choices=self.avatarChoices||avatarPresets;for(const choice of choices){const id=typeof choice==='string'?choice:choice.id,preset=avatarPresets.find(p=>p.id===id);const button=document.createElement('button');button.type='button';button.dataset.avatar=id;button.setAttribute('aria-pressed',String(self.avatarId===id));const swatch=document.createElement('span');swatch.className='avatar-swatch';swatch.style.setProperty('--avatar-color',preset?'#'+preset.coat.toString(16).padStart(6,'0'):'#754f82');const label=document.createElement('strong');label.textContent=preset?.label||(id==='zhang-jiayu'?'我的专属形象':typeof choice==='object'?choice.label:'访客');button.append(swatch,label);button.disabled=$('#save-avatar').disabled;button.onclick=()=>{if($('#save-avatar').disabled)return;if(!joined||!self?.canChooseAvatar||!token){showChoices();return;}choosing={avatarId:id,variant:Number(button.dataset.variant)||0};list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('#avatar-choice-note').textContent='已选 '+label.textContent;};list.append(button);fillPreview(button,id,id===self.avatarId?self.variant||0:0);}choosing={avatarId:self.avatarId,variant:self.variant||0};$('#avatar-choice-note').textContent='已选形象会保留，也可以换一个再进入';}
 $('#choose-avatar').onclick=showChoices;$('#avatar-continue').onclick=closePanel;$('#avatar-reconnect').onclick=join;$('#generate-avatar').onclick=()=>{if(!self?.canChooseAvatar||$('#save-avatar').disabled)return;const preset=avatarPresets[Math.floor(Math.random()*avatarPresets.length)];choosing={avatarId:preset.id,variant:crypto.getRandomValues(new Uint16Array(1))[0]};$('#avatar-choices').querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.avatar===preset.id));if(b.dataset.avatar===preset.id)fillPreview(b,preset.id,choosing.variant);});$('#avatar-choice-note').textContent='已生成 '+preset.label+' 的新配色';};
 $('#save-avatar').onclick=async()=>{if($('#save-avatar').disabled)return;if(!joined||!choosing||!self?.canChooseAvatar||!token){showChoices();return;}$('#save-avatar').disabled=true;$('#generate-avatar').disabled=true;$('#avatar-choices').querySelectorAll('button').forEach(b=>b.disabled=true);const epoch=roomEpoch,session=token;try{const data=await request('/avatar',auth(choosing));if(epoch!==roomEpoch||session!==token||closed)return;await apply(data,{epoch});if($('#room-dialog').open&&!document.querySelector('[data-panel="avatar"]').hidden)closePanel();notice('形象已保存，可在顶部“我的形象”随时更换');}catch(error){if(epoch===roomEpoch&&session===token&&!closed)$('#avatar-choice-note').textContent=error.message;}finally{$('#save-avatar').disabled=false;$('#generate-avatar').disabled=false;$('#avatar-choices').querySelectorAll('button').forEach(b=>b.disabled=false);}};
 $('#connect-room').onclick=join;
 async function enterRoom(room){if(!joined){notice('连接会客大厅后才能通过这扇门');openPanel('people');return false;}if(entering)return false;const route=self?.room+':'+room;if(room!==self?.room&&!['lobby:cottage','cottage:lobby','cottage:cinema','cinema:cottage','cottage:classroom','classroom:cottage'].includes(route)){notice('放映室从博医小屋的门进入，前往小屋请乘大厅电梯');return false;}entering=true;cancelStateRequest();const epoch=++roomEpoch;try{if(typeof getMovement==='function'&&['cottage:cinema','cinema:cottage','cottage:classroom','classroom:cottage'].includes(route))await request('/state',stateBody());const data=await request('/enter',auth({room}));await apply(data,{spawn:true,epoch});return true;}catch(error){if(error.data?.self)await apply(error.data,{epoch});$('#gate-status').textContent=error.message;openPanel('gate');return false;}finally{entering=false;}}
 async function send(route,body,{signal}={}){if(!joined)throw Error('请先连接会客空间');signal?.throwIfAborted();const epoch=roomEpoch,session=token,room=self?.room;const data=await request(route,auth(body),signal);signal?.throwIfAborted();if(!joined||closed||epoch!==roomEpoch||session!==token||self?.room!==room)return null;if(data.self&&!await apply(data,{epoch,signal}))return null;signal?.throwIfAborted();return data;}
 async function action(kind,id){if(!joined){notice('请先连接会客空间');return false;}const epoch=roomEpoch,session=token,room=self?.room;const current=()=>joined&&!closed&&epoch===roomEpoch&&session===token&&self?.room===room;try{const data=await send('/action',{kind,...(id?{id}:{})});if(!data||!current())return false;return true;}catch(error){if(current())notice(error.message);return false;}}
 function toggleCinemaDoor(){return action('toggleCinemaDoor');}
 function toggleClassroomDoor(){return action('toggleClassroomDoor');}
 async function uploadPresentation(file,{signal,onProgress=()=>{}}={}){
  if(!joined||!token||self?.room!=='classroom')throw Error('请先进入教室');
  const endTransfer=beginPresentationTransfer();try{
  const epoch=roomEpoch,session=token,participantId=self.participantId;
  const data=await new Promise((resolve,reject)=>{
   const xhr=new XMLHttpRequest();let settled=false,timer;
   const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);error?reject(error):resolve(value);};
   const cancel=()=>{finish(signal?.reason||new DOMException('已取消上传','AbortError'));xhr.abort();};
   const deadline=(ms,message)=>{clearTimeout(timer);timer=setTimeout(()=>{finish(Error(message));xhr.abort();},ms);};
   xhr.open('POST',prefix+'/presentation-upload');xhr.withCredentials=true;
   xhr.setRequestHeader('Content-Type','application/vnd.openxmlformats-officedocument.presentationml.presentation');
   xhr.setRequestHeader('X-Boyi-Participant',participantId);xhr.setRequestHeader('X-Boyi-Token',session);xhr.setRequestHeader('X-Boyi-Filename',encodeURIComponent(file.name));
   xhr.upload.onprogress=event=>{deadline(60000,'课件上传超过一分钟没有进展，请检查网络后重试');onProgress({phase:'upload',loaded:event.loaded,total:event.lengthComputable?event.total:file.size});};
   xhr.upload.onload=()=>{deadline(180000,'服务器校验课件超时，请重新读取投影或重试');onProgress({phase:'validate',loaded:file.size,total:file.size});};
   xhr.onerror=()=>finish(Error('课件上传连接中断，请检查网络后重试'));
   xhr.onabort=()=>finish(new DOMException('已取消上传','AbortError'));
   xhr.onload=()=>{let value;try{value=JSON.parse(xhr.responseText);}catch{return finish(Error('服务器未返回课件结果，请重试'));}if(xhr.status<200||xhr.status>=300)return finish(Object.assign(Error(value.error||'这次课件未能分享，请重试'),{status:xhr.status,data:value}));finish(null,value);};
   signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted){cancel();return;}
   deadline(60000,'课件上传超过一分钟没有进展，请检查网络后重试');xhr.send(file);
  });
  if(!joined||closed||epoch!==roomEpoch||session!==token||self?.participantId!==participantId||self?.room!=='classroom')return null;
  if(data.self&&!await apply(data,{epoch}))return null;return data;
  }finally{endTransfer();}
 }
 async function fetchPresentationFile(deckId,{signal,onProgress=()=>{}}={}){
  if(!joined||!token||self?.room!=='classroom')throw Error('请先进入教室');const epoch=roomEpoch,session=token,participantId=self.participantId;
  const endTransfer=beginPresentationTransfer(),controller=new AbortController();let timer;const cancel=()=>controller.abort(signal.reason),progress=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(Error('课件读取超过一分钟没有进展，请重新读取投影')),60000);};signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();progress();
  try{
  const response=await fetch(prefix+'/presentation-file',{method:'GET',credentials:'include',cache:'no-store',signal:controller.signal,headers:{'X-Boyi-Participant':participantId,'X-Boyi-Token':session,...(deckId?{'X-Boyi-Deck':deckId}:{})}});progress();
  if(!response.ok){let data;try{data=await response.json();}catch{}throw Object.assign(Error(data?.error||'暂时无法读取课件'),{status:response.status});}
  if(response.headers.get('content-type')?.split(';')[0]!=='application/vnd.openxmlformats-officedocument.presentationml.presentation')throw Error('课件响应不正确');
  const total=Number(response.headers.get('content-length'))||0,heap=globalThis.performance?.memory,available=heap?Math.max(0,heap.jsHeapSizeLimit-heap.usedJSHeapSize):Infinity,memoryBudget=Math.floor(Math.min((Number(globalThis.navigator?.deviceMemory)||4)*1024*1048576*.08,available*.2)),reader=response.body?.getReader(),chunks=[];let loaded=0,buffer;
  const checkMemory=bytes=>{if(bytes>memoryBudget)throw Error('当前浏览器可用内存不足以读取这份课件，请关闭其他页面后重试');};
  if(reader){try{checkMemory(total);for(;;){const next=await reader.read();if(next.done)break;progress();loaded+=next.value.byteLength;checkMemory(loaded);chunks.push(next.value);onProgress({loaded,total});}buffer=await new Blob(chunks).arrayBuffer();}catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();chunks.length=0;}}else{checkMemory(total);buffer=await response.arrayBuffer();checkMemory(buffer.byteLength);}
  const actual=response.headers.get('x-boyi-deck-id');if(total&&buffer.byteLength!==total)throw Error('课件下载不完整，请重试');
  if(!joined||closed||epoch!==roomEpoch||session!==token||self?.participantId!==participantId||self?.room!=='classroom')return null;if(!actual||deckId&&actual!==deckId)throw Error('课件已更换，请重新读取');return{buffer,deckId:actual};
  }catch(error){if(controller.signal.aborted)throw controller.signal.reason||error;if(error instanceof TypeError)throw Error('课件服务器连接中断，请检查网络后重新读取投影');throw error;}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);endTransfer();}
 }
 async function changeNickname(value){
  if(typeof value!=='string'||![...value.trim()].length){notice('请填写1至18个文字的小屋昵称');return false;}
  if(!joined){$('#visitor-name').value=value;return join({nickname:value});}
  const epoch=roomEpoch,session=token;
  try{const result=await request('/nickname',auth({nickname:value}));if(!joined||closed||epoch!==roomEpoch||session!==token)return false;await apply(result,{epoch});if(self?.nickname!==result.self?.nickname)return false;rememberNickname(self.nickname);return true;}
  catch(error){if(joined&&epoch===roomEpoch&&session===token)notice(error.message);return false;}
 }
 function journalCommand(route,extra={},withLease=false){
  const epoch=roomEpoch,session=token,room=self?.room;
  const job=journalQueue.then(async()=>{
   const current=()=>joined&&!closed&&epoch===roomEpoch&&session===token&&self?.room===room;
   if(!current())return null;
   if(withLease&&!journalLease){if(route==='/journal/release')return null;throw Error('请先申请编辑手记');}
   try{const result=await request(route,auth({...extra,...(withLease?{lease:journalLease}:{})}));if(!current())return null;await apply(result,{epoch});if(!current())return null;if(typeof result.lease==='string')journalLease=result.lease;if(route==='/journal/release')journalLease='';return{document:result.document,meta:result.meta};}
   catch(error){if(current()&&(error.status===403||error.status===409))journalLease='';throw error;}
  });journalQueue=job.catch(()=>{});return job;
 }
 const journalRead=()=>journalCommand('/journal');
 const journalAcquire=()=>journalCommand('/journal/acquire');
 const journalRenew=()=>journalCommand('/journal/renew',{},true);
 const journalSave=(text,revision)=>journalCommand('/journal/save',{text,revision},true);
 const journalRelease=()=>journalCommand('/journal/release',{},true);
 function sitNearby(){if(self?.seatId)return action('stand');const occupied=new Set(occupants.map(p=>p.seatId).filter(Boolean));const seat=ROOM_LAYOUT[self?.room]?.seats.filter(s=>!occupied.has(s.id)&&Math.hypot(s.x-player.x,s.z-player.z)<=2.1).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];if(!seat){notice('走近一张空椅子或沙发再坐下');return Promise.resolve(false);}return action('sit',seat.id);}
 function pickupNearby(){if(self?.heldItemId)return action('drop');const held=new Set(occupants.map(p=>p.heldItemId).filter(Boolean));const item=ROOM_LAYOUT[self?.room]?.items.filter(s=>!held.has(s.id)&&Math.hypot(s.x-player.x,s.z-player.z)<=2.1).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];if(!item){notice('走近书本或茶杯再拿取');return Promise.resolve(false);}return action('pickup',item.id);}
 $('#room-chat-form').onsubmit=async e=>{e.preventDefault();const input=$('#room-chat-text'),button=$('#room-chat-send'),text=input.value.trim();if(!text)return;button.disabled=true;try{const result=await send('/room-chat',{text});if(result&&input.value.trim()===text)input.value='';}catch(error){notice(error.message);}finally{button.disabled=false;}};
 function stateBody(){const heading=getYaw();return auth({room:self?.room,x:player.x,z:player.z,yaw:Math.atan2(Math.sin(heading),Math.cos(heading)),...(typeof getMovement==='function'?getMovement():{})});}
 function update(t,dt){for(const peer of peers.values()){const p=peer.data;const moving=Math.hypot(peer.model.root.position.x-p.x,peer.model.root.position.z-p.z)>.025;peer.model.setPose(p.x,p.z,p.yaw+Math.PI,dt);const pose=poseFor(p);const feet=Number.isFinite(pose.y)?pose.y:pose.jumpHeight;peer.model.root.position.y+=(feet-peer.model.root.position.y)*(1-Math.exp(-dt*12));peer.model.update(t,camera,moving,pose);}if(!stateRequest&&!presentationTransfers&&joined&&canSyncMovement()&&!entering&&!transitioning&&!document.hidden&&performance.now()-lastState>250){lastState=performance.now();const epoch=roomEpoch,session=token,job={controller:new AbortController()};stateRequest=job;request('/state',stateBody(),job.controller.signal).then(data=>{if(joined&&!closed&&epoch===roomEpoch&&session===token)return apply(data,{epoch});}).catch(error=>{if(joined&&!closed&&epoch===roomEpoch&&session===token&&error.data?.self)apply(error.data,{epoch}).catch(()=>{});}).finally(()=>{if(stateRequest===job)stateRequest=null;});}}
 function pick(raycaster){const hits=raycaster.intersectObjects([...peers.values()].map(p=>p.model.root),true);if(!hits[0]||hits[0].distance>3.5)return null;let node=hits[0].object;while(node?.parent&&node.parent!==scene)node=node.parent;return [...peers.values()].find(p=>p.model.root===node)?.data||null;}
 function leave(){cancelStateRequest();roomEpoch++;pollGeneration++;closed=true;journalLease='';clearTimeout(reconnectTimer);voice.stop();onState?.({disconnected:true},[]);joined=false;clearInterval(expiryTimer);clearConversations();pollController?.abort();if(self&&token)navigator.sendBeacon(prefix+'/leave',new Blob([JSON.stringify(auth({}))],{type:'application/json'}));resumeCredentials=null;sessionNickname='';for(const p of peers.values())p.model.dispose();peers.clear();inbox.clear();messages.length=0;previewRenderer?.dispose();previewRenderer?.forceContextLoss();previewCache.clear();}
 $('#room-dialog').addEventListener('close',clearChat);
 return{join,enterRoom,toggleCinemaDoor,toggleClassroomDoor,fetchPresentationFile,uploadPresentation,changeNickname,showAvatarChoices:showChoices,needsNickname:()=>!sessionNickname,journalRead,journalAcquire,journalRenew,journalSave,journalRelease,update,pick,openChat,leave,action,send,sitNearby,pickupNearby,getPose:()=>poseFor(self),getOccupants:()=>occupants,getSelf:()=>self,getStats:()=>({joined,voice:voice.getStats(),pose:self?poseFor(self):null,occupants:occupants.length,self:self?{participantId:self.participantId,avatarId:self.avatarId,variant:self.variant,verified:self.verified,cohort:self.cohort,canEnterCottage:self.canEnterCottage}:null,room:self?.room||'lobby',peers:peers.size,peerActions:[...peers.values()].map(p=>({id:p.data.participantId,seatId:p.data.seatId,heldItemId:p.data.heldItemId,action:p.data.action,rig:p.model.getRigPose()})),canChooseAvatar:!!self?.canChooseAvatar})};
}
