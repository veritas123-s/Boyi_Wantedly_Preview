export function createVoiceActivityDetector({now=()=>performance.now(),publish=()=>{},threshold=.007,holdMs=220,renewMs=250}={}){
 let lastVoice=-Infinity,lastPublished=-Infinity,active=false;
 function sample(level){const time=now();if(Number.isFinite(level)&&level>=threshold)lastVoice=time;const next=time-lastVoice<=holdMs;if(next!==active||next&&time-lastPublished>=renewMs){active=next;lastPublished=time;publish(next);}return next;}
 return{sample,reset(){const was=active;active=false;lastVoice=-Infinity;if(was){lastPublished=now();publish(false);}},isSpeaking:()=>active&&now()-lastVoice<=holdMs};
}
export function createVoiceClient({prefix,getAuth,getSelf,getOccupants,getPose,notice}){
 const button=document.querySelector('#toggle-voice'),status=document.querySelector('#voice-status'),mute=document.querySelector('#mute-voice');
 let ws=null,context=null,stream=null,capture=null,source=null,mixer=null,sequence=0,generation=0,enabled=false,busy=false,muted=false;
 const speakers=new Map();let voiceTail=0,receivedPackets=0,captureDropped=0,staleCaptureDropped=0,sendBackpressureDropped=0;
 const activity=createVoiceActivityDetector({publish:speaking=>{if(ws?.readyState===WebSocket.OPEN&&ws.bufferedAmount<4096)ws.send(JSON.stringify({type:'speaking',speaking}));}});
 function clearSpeaker(entry){entry.node.port.postMessage({type:'reset'});entry.node.port.close();entry.node.disconnect();entry.gain.disconnect();entry.pan.disconnect();}
 function label(){button.textContent=enabled?'关闭语音':'开启语音';button.setAttribute('aria-pressed',String(enabled));mute.hidden=!enabled;mute.textContent=muted?'打开麦克风':'麦克风静音';mute.setAttribute('aria-pressed',String(muted));}
 function stop(message='语音已关闭'){
  activity.reset();generation++;enabled=false;busy=false;button.disabled=false;const old=ws;ws=null;if(old){old.onclose=null;old.close();}
  stream?.getTracks().forEach(track=>track.stop());stream=null;if(capture){capture.port.onmessage=null;capture.port.close();capture.disconnect();}capture=null;source?.disconnect();source=null;
  for(const entry of speakers.values())clearSpeaker(entry);speakers.clear();mixer?.disconnect();mixer=null;context?.close().catch(()=>{});context=null;status.textContent=message;label();
 }
 function receive(buffer){
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==348||!context||context.state!=='running')return;
  const bytes=new Uint8Array(buffer),hex=[...bytes.slice(0,16)].map(b=>b.toString(16).padStart(2,'0')).join(''),id=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  const occupants=getOccupants(),valid=new Set(occupants.filter(p=>p.voiceEnabled).map(p=>p.participantId));for(const [key,entry]of speakers)if(!valid.has(key)){clearSpeaker(entry);speakers.delete(key);}
  const session=[...bytes.slice(16,24)].map(b=>b.toString(16).padStart(2,'0')).join('');
  const peer=occupants.find(p=>p.participantId===id&&p.room===getSelf()?.room&&p.voiceSessionId===session);if(!peer)return;
  let entry=speakers.get(id);if(entry&&entry.session!==session){clearSpeaker(entry);speakers.delete(id);entry=null;}
  if(!entry){const gain=context.createGain(),pan=context.createStereoPanner(),node=new AudioWorkletNode(context,'boyi-voice-playback',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});node.connect(gain).connect(pan).connect(mixer);entry={gain,pan,node,sequence:-1,session,stats:{}};node.port.onmessage=e=>{if(e.data?.type==='stats')entry.stats=e.data;};speakers.set(id,entry);}
  const seq=new DataView(buffer).getUint32(24);if(seq<=entry.sequence)return;entry.sequence=seq;receivedPackets++;
  const pose=getPose(),dx=peer.x-pose.x,dz=peer.z-pose.z,distance=Math.hypot(dx,dz);
  entry.gain.gain.setTargetAtTime(peer.room==='classroom'?1:Math.min(1,2/(1+distance*.6)),context.currentTime,.02);entry.pan.pan.setTargetAtTime(peer.room==='classroom'?0:Math.max(-.85,Math.min(.85,(Math.cos(pose.yaw)*dx-Math.sin(pose.yaw)*dz)/Math.max(1,distance))),context.currentTime,.02);
  entry.node.port.postMessage({type:'frame',buffer,offset:28,sequence:seq},[buffer]);
 }
 async function start(){
  if(busy)return;if(!getSelf()){notice('先连接会客空间再开启语音');return;}busy=true;button.disabled=true;const epoch=++generation;status.textContent='正在请求麦克风权限';
  let acquired=null;
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.AudioWorkletNode)throw Error('当前浏览器不支持语音，请使用新版浏览器和 HTTPS 页面');
   acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
   if(epoch!==generation){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;
   context=new AudioContext({latencyHint:'interactive'});await context.resume();await context.audioWorklet.addModule(new URL('./voice-worklet.js?v=5c23d29b4627',import.meta.url));
   mixer=context.createDynamicsCompressor();mixer.threshold.value=-12;mixer.knee.value=12;mixer.ratio.value=8;mixer.attack.value=.003;mixer.release.value=.15;mixer.connect(context.destination);
   if(epoch!==generation)return;
   const socket=new WebSocket(prefix.replace(/^http/,'ws')+'/voice');socket.binaryType='arraybuffer';ws=socket;
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('语音连接超时，请重试')),7000);socket.onopen=()=>socket.send(JSON.stringify(getAuth()));socket.onerror=()=>{clearTimeout(timer);reject(Error('语音连接没有成功'));};socket.onmessage=e=>{if(typeof e.data!=='string')return;try{if(JSON.parse(e.data).type==='ready'){clearTimeout(timer);resolve();}}catch{clearTimeout(timer);reject(Error('语音连接没有成功'));}};socket.onclose=()=>{clearTimeout(timer);reject(Error('语音连接已关闭'));};});
   if(epoch!==generation){socket.close();return;}
   source=context.createMediaStreamSource(stream);capture=new AudioWorkletNode(context,'boyi-voice-capture');source.connect(capture).connect(context.destination);sequence=0;enabled=true;muted=false;
   voiceTail=0;activity.reset();capture.port.onmessage=e=>{capture.port.postMessage({type:'ack'});captureDropped=e.data.captureDropped||0;if(!enabled||muted||ws!==socket||socket.readyState!==WebSocket.OPEN){activity.reset();return;}if(Number.isFinite(e.data.capturedAt)&&context.currentTime-e.data.capturedAt>.10){staleCaptureDropped++;activity.reset();return;}if(socket.bufferedAmount>972){sendBackpressureDropped++;activity.sample(0);return;}activity.sample(e.data.level);if(e.data.level>=.007)voiceTail=12;else if(voiceTail>0)voiceTail--;else return;const packet=new Uint8Array(324);new DataView(packet.buffer).setUint32(0,Number.isInteger(e.data.sequence)?e.data.sequence:sequence++);packet.set(new Uint8Array(e.data.buffer),4);socket.send(packet);};for(const track of stream.getAudioTracks())track.onended=()=>{if(ws===socket)stop('麦克风已断开');};
   socket.onmessage=e=>{if(typeof e.data!=='string')receive(e.data);};socket.onerror=()=>{};socket.onclose=()=>{if(ws===socket)stop('语音连接中断，点击重新开启');};
   status.textContent='语音已开启 · 同空间的人可听到，越近越清楚';label();
  }catch(error){acquired?.getTracks().forEach(t=>t.stop());if(epoch===generation)stop(error.name==='NotAllowedError'?'未获得麦克风权限，可以继续文字聊天':error.message);}
  finally{if(epoch===generation){busy=false;button.disabled=false;}}
 }
 button.onclick=()=>enabled?stop():start();mute.onclick=()=>{muted=!muted;capture?.port.postMessage({type:'active',active:!muted});if(muted){activity.reset();voiceTail=0;}for(const track of stream?.getAudioTracks()||[])track.enabled=!muted;status.textContent=muted?'麦克风已静音，仍可听到同伴':'语音已开启 · 同空间的人可听到';label();};
 label();return{stop,start,getStats:()=>({enabled,muted,speaking:enabled&&!muted&&activity.isSpeaking(),speakers:speakers.size,receivedPackets,captureDropped,staleCaptureDropped,sendBackpressureDropped,playback:[...speakers.values()].map(s=>s.stats),speakerSessions:[...speakers.values()].map(s=>s.session),recording:false})};
}
