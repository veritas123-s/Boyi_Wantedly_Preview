import {decodeMuLaw} from './voice-codec.js?v=ca8d86034c2c';
export function createVoiceClient({prefix,getAuth,getSelf,getOccupants,getPose,notice}){
 const button=document.querySelector('#toggle-voice'),status=document.querySelector('#voice-status'),mute=document.querySelector('#mute-voice');
 let ws=null,context=null,stream=null,capture=null,source=null,sequence=0,generation=0,enabled=false,busy=false,muted=false;
 const speakers=new Map(),sources=new Set();let voiceTail=0,receivedPackets=0;
 function clearSpeaker(entry){for(const node of entry.sources){try{node.stop();}catch{}node.disconnect();sources.delete(node);}entry.sources.clear();entry.gain.disconnect();entry.pan.disconnect();}
 function label(){button.textContent=enabled?'关闭语音':'开启语音';button.setAttribute('aria-pressed',String(enabled));mute.hidden=!enabled;mute.textContent=muted?'打开麦克风':'麦克风静音';mute.setAttribute('aria-pressed',String(muted));}
 function stop(message='语音已关闭'){
  generation++;enabled=false;busy=false;button.disabled=false;const old=ws;ws=null;if(old){old.onclose=null;old.close();}
  stream?.getTracks().forEach(track=>track.stop());stream=null;capture?.disconnect();capture=null;source?.disconnect();source=null;
  for(const node of sources){try{node.stop();}catch{}}sources.clear();for(const entry of speakers.values())clearSpeaker(entry);speakers.clear();context?.close().catch(()=>{});context=null;status.textContent=message;label();
 }
 function receive(buffer){
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==348||!context||context.state!=='running')return;
  const bytes=new Uint8Array(buffer),hex=[...bytes.slice(0,16)].map(b=>b.toString(16).padStart(2,'0')).join(''),id=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  const occupants=getOccupants(),valid=new Set(occupants.filter(p=>p.voiceEnabled).map(p=>p.participantId));for(const [key,entry]of speakers)if(!valid.has(key)){clearSpeaker(entry);speakers.delete(key);}
  const session=[...bytes.slice(16,24)].map(b=>b.toString(16).padStart(2,'0')).join('');
  const peer=occupants.find(p=>p.participantId===id&&p.room===getSelf()?.room&&p.voiceSessionId===session);if(!peer)return;
  let entry=speakers.get(id);if(entry&&entry.session!==session){clearSpeaker(entry);speakers.delete(id);entry=null;}
  if(!entry){const gain=context.createGain(),pan=context.createStereoPanner();gain.connect(pan).connect(context.destination);entry={gain,pan,next:0,sequence:-1,session,sources:new Set()};speakers.set(id,entry);}
  const seq=new DataView(buffer).getUint32(24);if(seq<=entry.sequence)return;entry.sequence=seq;receivedPackets++;
  if(entry.next>context.currentTime+.18)entry.next=context.currentTime+.04;
  const audio=context.createBuffer(1,320,16000),data=audio.getChannelData(0);for(let i=0;i<320;i++)data[i]=decodeMuLaw(bytes[i+28]);
  const pose=getPose(),dx=peer.x-pose.x,dz=peer.z-pose.z,distance=Math.hypot(dx,dz);
  entry.gain.gain.setTargetAtTime(Math.min(1,2/(1+distance*.6)),context.currentTime,.02);entry.pan.pan.setTargetAtTime(Math.max(-.85,Math.min(.85,(Math.cos(pose.yaw)*dx-Math.sin(pose.yaw)*dz)/Math.max(1,distance))),context.currentTime,.02);
  const node=context.createBufferSource();node.buffer=audio;node.connect(entry.gain);const at=Math.max(context.currentTime+.025,entry.next);entry.next=at+.02;sources.add(node);entry.sources.add(node);node.onended=()=>{sources.delete(node);entry.sources.delete(node);node.disconnect();};node.start(at);
 }
 async function start(){
  if(busy)return;if(!getSelf()){notice('先连接会客空间再开启语音');return;}busy=true;button.disabled=true;const epoch=++generation;status.textContent='正在请求麦克风权限';
  let acquired=null;
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.AudioWorkletNode)throw Error('当前浏览器不支持语音，请使用新版浏览器和 HTTPS 页面');
   acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
   if(epoch!==generation){acquired.getTracks().forEach(t=>t.stop());return;}stream=acquired;
   context=new AudioContext({latencyHint:'interactive'});await context.resume();await context.audioWorklet.addModule(new URL('./voice-worklet.js?v=39ffe5f3858b',import.meta.url));
   if(epoch!==generation)return;
   const socket=new WebSocket(prefix.replace(/^http/,'ws')+'/voice');socket.binaryType='arraybuffer';ws=socket;
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('语音连接超时，请重试')),7000);socket.onopen=()=>socket.send(JSON.stringify(getAuth()));socket.onerror=()=>{clearTimeout(timer);reject(Error('语音连接没有成功'));};socket.onmessage=e=>{if(typeof e.data!=='string')return;try{if(JSON.parse(e.data).type==='ready'){clearTimeout(timer);resolve();}}catch{clearTimeout(timer);reject(Error('语音连接没有成功'));}};socket.onclose=()=>{clearTimeout(timer);reject(Error('语音连接已关闭'));};});
   if(epoch!==generation){socket.close();return;}
   source=context.createMediaStreamSource(stream);capture=new AudioWorkletNode(context,'boyi-voice-capture');source.connect(capture).connect(context.destination);sequence=0;enabled=true;muted=false;
   voiceTail=0;capture.port.onmessage=e=>{if(!enabled||muted||document.hidden||ws!==socket||socket.readyState!==WebSocket.OPEN||socket.bufferedAmount>4096)return;if(e.data.level>=.007)voiceTail=12;else if(voiceTail>0)voiceTail--;else return;const packet=new Uint8Array(324);new DataView(packet.buffer).setUint32(0,sequence++);packet.set(new Uint8Array(e.data.buffer),4);socket.send(packet);};
   socket.onmessage=e=>{if(typeof e.data!=='string')receive(e.data);};socket.onerror=()=>{};socket.onclose=()=>{if(ws===socket)stop('语音连接中断，点击重新开启');};
   status.textContent='语音已开启 · 同空间的人可听到，越近越清楚';label();
  }catch(error){acquired?.getTracks().forEach(t=>t.stop());if(epoch===generation)stop(error.name==='NotAllowedError'?'未获得麦克风权限，可以继续文字聊天':error.message);}
  finally{if(epoch===generation){busy=false;button.disabled=false;}}
 }
 button.onclick=()=>enabled?stop():start();mute.onclick=()=>{muted=!muted;for(const track of stream?.getAudioTracks()||[])track.enabled=!muted;status.textContent=muted?'麦克风已静音，仍可听到同伴':'语音已开启 · 同空间的人可听到';label();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&(enabled||busy))stop('页面进入后台，语音已关闭');});
 label();return{stop,start,getStats:()=>({enabled,muted,speakers:speakers.size,receivedPackets,speakerSessions:[...speakers.values()].map(s=>s.session),recording:false})};
}
