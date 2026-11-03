import {attachBilibiliBrowser,biliVideo} from './bilibili-browser.js?v=15f612630590';

export function createCinemaPlayer({getSelf,send,notice,setVideo,openPanel,closePanel,releaseLook,aimScreen}){
 const $=s=>document.querySelector(s),video=$('#cinema-video'),status=$('#movie-status'),url=$('#movie-url'),seek=$('#movie-seek');
 const screen=$('#cinema-web-screen'),biliHost=$('#cinema-bili-player'),screenInput=$('#cinema-screen-input'),sound=$('#cinema-sound');
 const webMedia=$('#cinema-web-media'),panelScreen=$('#movie-panel-screen'),loading=$('#movie-loading'),progress=$('#movie-load-progress'),percent=$('#movie-load-percent');
 let openScreenPending=false,loadTimer;
 function setProgress(value){loading.hidden=value===null;if(value!==null){progress.value=value;percent.textContent=value+'%';}}
 let lastTransform='',lastClip='';
 const browser=attachBilibiliBrowser({openPanel,getSelf,send,notice});
 let movie=null,receivedAt=0,source='',active=false,flat=false,lastSync=0,bili=null,biliFrame=null,biliLoads=0,biliReady=false,projectedWorld=null,interacting=false,blocked=false,needsSound=false,playPending=false,mediaEpoch=0;
 const host=()=>!!movie?.hostId&&movie.hostId===getSelf()?.participantId;
 function setInteraction(value){
  interacting=Boolean(value&&!screen.hidden&&biliFrame);
  if(interacting)releaseLook();
  document.body.classList.toggle('cinema-screen-input',interacting);
  screenInput.setAttribute('aria-pressed',String(interacting));
  screenInput.textContent=interacting?'完成银幕操作':'操作银幕';
  if(biliFrame)biliFrame.tabIndex=interacting?0:-1;
 }
 screenInput.onclick=()=>setInteraction(!interacting);
 panelScreen.onclick=()=>{if(!biliReady)return;closePanel();aimScreen();openScreenPending=true;};
 document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement)setInteraction(false);});
 function dismissControls(){if($('#room-dialog').open&&!$('[data-panel="cinema"]').hidden)closePanel();}
 function clearBili(){
  clearTimeout(loadTimer);openScreenPending=false;setInteraction(false);
  biliFrame?.remove();biliFrame=null;bili=null;biliReady=false;biliHost.hidden=true;video.hidden=false;
 }
 function showBili(next){
  if(bili?.key===next.key)return;
  clearBili();bili=next;video.hidden=true;biliHost.hidden=false;
  const frame=document.createElement('iframe');
  frame.title='哔哩哔哩放映银幕 · '+next.id+' · 第 '+next.part+' P';
  frame.allow='autoplay; encrypted-media';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
  frame.tabIndex=-1;frame.src=next.playerUrl;frame.onload=()=>{
   if(frame!==biliFrame)return;
   clearTimeout(loadTimer);biliReady=true;setProgress(100);controls();
   status.textContent='播放器页面已加载。点击“操作银幕”，再用 B 站播放器的播放按钮。';
  };
  biliFrame=frame;biliLoads++;biliHost.append(frame);
  loadTimer=setTimeout(()=>{status.textContent='播放器页面加载超时，可重新选择影片';},25000);
 }
 function controls(){
  const isHost=host();
  $('#movie-host').textContent=isHost?'你是当前房主，可选片与控制播放':'由当前房主选片与控制播放';
  for(const id of ['movie-load','movie-play','movie-pause','movie-stop','movie-seek'])$('#'+id).disabled=!isHost;
  if(movie?.kind==='web')for(const id of ['movie-play','movie-pause','movie-seek'])$('#'+id).disabled=true;
  $('#movie-unlock').hidden=sound.hidden=!active||(!blocked&&!needsSound);
  screenInput.hidden=!active||!biliFrame||screen.hidden;
  panelScreen.hidden=!biliFrame;panelScreen.disabled=!biliReady;
 }
 function targetTime(){return movie?movie.time+(movie.playing?(performance.now()-receivedAt)/1000:0):0;}
 async function play({withSound=false}={}){
  if(playPending&&!withSound)return;
  const epoch=mediaEpoch;
  playPending=true;
  if(withSound){video.muted=false;blocked=false;}
  try{
   try{await video.play();}
   catch(error){
    if(error.name!=='NotAllowedError'||epoch!==mediaEpoch||video.muted)throw error;
    video.muted=true;needsSound=true;
    await video.play();
   }
   if(epoch!==mediaEpoch)return;
   blocked=false;needsSound=video.muted;
   status.textContent=needsSound?'正在静音放映，点击“打开声音”收听':'正在同步放映';
  }catch(error){
   if(epoch!==mediaEpoch)return;
   if(error.name==='NotAllowedError'){blocked=true;status.textContent='点击“打开声音”开始播放';}
   else if(error.name!=='AbortError')status.textContent='视频暂时无法播放，请检查直链和视频格式';
  }finally{if(epoch===mediaEpoch){playPending=false;controls();}}
 }
 function sync(force=false){
  if(!movie||movie.kind==='web'||!active||!source||!video.readyState)return;
  const desired=Math.max(0,Math.min(Number.isFinite(video.duration)?Math.max(0,video.duration-.04):604800,targetTime()));
  if((force||Math.abs(video.currentTime-desired)>.65)&&!video.seeking)try{video.currentTime=desired;}catch{}
  if(movie.playing&&video.paused&&!blocked)play();else if(!movie.playing&&!video.paused)video.pause();
  seek.max=Number.isFinite(video.duration)?String(video.duration):'604800';if(document.activeElement!==seek)seek.value=String(video.currentTime);
  const seconds=Math.floor(video.currentTime||0);$('#movie-time').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 }
 function resetMedia(){
  setProgress(null);mediaEpoch++;playPending=false;blocked=needsSound=flat=false;
  clearBili();projectedWorld?.projectWebMedia(null,0,0,false);projectedWorld=null;screen.hidden=true;
  video.pause();video.muted=false;
  if(video.hasAttribute('src')){video.removeAttribute('src');video.load();}
  setVideo(null);
 }
 function apply(data){
  if(getSelf()?.room!=='cinema'){if(active)clear();return;}
  active=true;if(!data.movie)return;
  const next=data.movie;
  if(!Number.isFinite(next.time)||!Number.isInteger(next.revision)||next.revision<(movie?.revision||0))return;
  const revisionChanged=next.revision!==movie?.revision,changed=source!==next.url||movie?.kind!==next.kind,started=!movie?.playing&&next.playing;
  movie=next;receivedAt=performance.now();browser.apply(movie);
  if(changed){
   resetMedia();source=movie.url;
   if(movie.kind==='web'){
    const selected=biliVideo(source);
    if(selected){setProgress(50);status.textContent='正在加载 B 站播放器页面…';showBili(selected);}
    else status.textContent='房主已分享哔哩哔哩网页入口，可从放映控制打开。';
   }else if(source){
    setProgress(50);status.textContent='正在连接影片';video.crossOrigin='anonymous';video.src=source;video.load();
   }else status.textContent='房主粘贴视频直链或 B站视频链接后，即可观看';
  }
  if(started&&host()&&movie.kind!=='web')dismissControls();
  controls();sync(revisionChanged);
 }
 video.addEventListener('loadeddata',()=>{
  if(!active||!source||movie?.kind==='web')return;
  setProgress(100);setVideo(flat?null:video);
  status.textContent=movie.playing?'正在同步放映':'影片已就绪，点击“播放”开始投影';
  sync(true);
 });
 video.addEventListener('error',()=>{
  if(!active||!source||movie?.kind==='web')return;
  if(!flat){flat=true;video.removeAttribute('crossorigin');video.src=source;video.load();}
  else status.textContent='此链接暂时不能播放，请使用可直接打开的 MP4 或 WebM 视频';
 });
 video.addEventListener('ended',()=>{if(host())send('/media',{action:'pause'}).catch(e=>notice(e.message));});
 async function control(body){
  const retryBili=body.action==='load'&&source===body.url&&biliFrame&&!biliReady;
  if(body.action==='load'){setProgress(0);status.textContent='正在提交片源…';}
  try{
   const data=await send('/media',body);if(data?.movie)apply(data);
   if(retryBili&&data?.movie&&source===body.url&&!biliReady){
    const selected=biliVideo(source);clearBili();showBili(selected);setProgress(50);controls();
    status.textContent='正在重新加载 B 站播放器页面…';
   }else if(body.action==='load'&&source===body.url&&(biliReady||video.readyState>=2)){
    setProgress(100);status.textContent=biliReady?'播放器页面已加载，点击“操作银幕”。':'影片已就绪';
   }
  }catch(error){if(body.action==='load')setProgress(null);status.textContent=error.message;}
 }
 $('#movie-form').onsubmit=e=>{e.preventDefault();const value=url.value.trim(),selected=biliVideo(value);let biliURL=false;try{biliURL=new URL(value).hostname.endsWith('.bilibili.com');}catch{}if(biliURL&&!selected){status.textContent='请选择具体的 B站 BV / av 视频链接；浏览首页或搜索请点“哔哩哔哩网页”';return;}control({action:'load',...(selected?{kind:'web'}:{}),url:selected?.url||value});};
 $('#movie-play').onclick=()=>control({action:'play'});$('#movie-pause').onclick=()=>control({action:'pause'});$('#movie-stop').onclick=()=>control({action:'stop'});
 seek.onchange=()=>control({action:'seek',time:Number(seek.value)});
 sound.onclick=$('#movie-unlock').onclick=()=>{if(movie?.playing)play({withSound:true});};
 function project(world,camera,width,height){
  const enabled=Boolean(world&&(biliFrame||(flat&&video.readyState>=2)));
  if(projectedWorld&&projectedWorld!==world)projectedWorld.projectWebMedia(null,0,0,false);
  projectedWorld=enabled?world:null;
  const projection=world?.projectWebMedia(camera,width,height,enabled);
  if(screen.hidden===Boolean(projection)){
   screen.hidden=!projection;if(!projection)setInteraction(false);controls();
  }
  if(projection){
   if(openScreenPending){openScreenPending=false;setInteraction(true);}
   const {x0,y0,cropWidth,cropHeight,clip}=projection;
   const crop=`${x0.toFixed(2)}/${y0.toFixed(2)}/${cropWidth.toFixed(2)}/${cropHeight.toFixed(2)}/${clip}`;
   if(lastClip!==crop){
    lastClip=crop;screen.style.clipPath=clip;
    screen.style.width=`${cropWidth}px`;screen.style.height=`${cropHeight}px`;
    webMedia.style.transform=`translate(${-x0}px,${-y0}px)`;
   }
   if(lastTransform!==projection.transform)screen.style.transform=lastTransform=projection.transform;
  }
 }
 function clear(){
  browser.clearShared();active=false;movie=null;source='';receivedAt=0;lastSync=0;resetMedia();
  url.value='';status.textContent='';seek.value='0';$('#movie-time').textContent='0:00';controls();
 }
 return {apply,clear,project,update(){
  if(active&&getSelf()?.room!=='cinema'){clear();return;}
  if(active&&performance.now()-lastSync>1000){lastSync=performance.now();sync();}
 },getStats:()=>({
  kind:movie?.kind||'video',browser:browser.getStats(),
  bilibili:bili?{id:bili.id,part:bili.part,iframeLoads:biliLoads,frameReady:biliReady,mode:'world-screen',synchronized:'video-and-part-only'}:null,
  active,hasSource:!!source,playing:!video.paused,time:video.currentTime,blocked,flat,projected:!screen.hidden,interacting,host:host(),revision:movie?.revision||0
 })};
}
