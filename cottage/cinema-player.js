export function createCinemaPlayer({getSelf,send,notice,setVideo}){
 const $=s=>document.querySelector(s),video=$('#cinema-video'),status=$('#movie-status'),url=$('#movie-url'),seek=$('#movie-seek');
 let movie=null,receivedAt=0,source='',active=false,blocked=false,flat=false,lastSync=0,viewing=false;
 const screen=$('#flat-screen'),fullButton=document.createElement('button'),viewTools=document.createElement('div');
 fullButton.id='movie-fullscreen';fullButton.type='button';fullButton.textContent='完整银幕';fullButton.hidden=true;fullButton.disabled=true;$('#cinema-controls').before(fullButton);
 viewTools.id='movie-view-tools';viewTools.setAttribute('aria-label','完整银幕操作');
 for(const [id,label,target] of [['movie-explore','返回探索',null],['movie-view-controls','放映控制','#cinema-controls'],['movie-view-chat','同屋聊天','#open-roomchat'],['movie-view-voice','语音','#open-voice']]){const button=document.createElement('button');button.id=id;button.type='button';button.textContent=label;button.onclick=()=>target?$(target).click():setViewing(false);viewTools.append(button);}
 screen.prepend(viewTools);
 function setViewing(value){viewing=Boolean(value&&active&&source);document.body.classList.toggle('cinema-viewing',viewing);screen.classList.toggle('viewing',viewing);screen.classList.remove('minimized');screen.hidden=!viewing&&!flat;fullButton.setAttribute('aria-pressed',String(viewing));if(viewing&&document.pointerLockElement)document.exitPointerLock();}
 fullButton.onclick=()=>{setViewing(true);if(movie?.playing&&blocked)play();};
 addEventListener('keydown',event=>{if(event.code==='Escape'&&viewing&&!$('#room-dialog').open){event.preventDefault();setViewing(false);}});
 video.playsInline=true;video.preload='metadata';video.crossOrigin='anonymous';
 function targetTime(){return movie?movie.time+(movie.playing?(performance.now()-receivedAt)/1000:0):0;}
 function controls(){const host=movie?.hostId===getSelf()?.participantId;$('#movie-host').textContent=host?'你是当前房主，可选片与控制播放':'由当前房主选片与控制播放';for(const id of ['movie-load','movie-play','movie-pause','movie-stop','movie-seek'])$('#'+id).disabled=!host;$('#movie-play').textContent='播放';$('#movie-unlock').hidden=!blocked;fullButton.hidden=!active;fullButton.disabled=!source;}
 async function play(){try{await video.play();blocked=false;status.textContent=flat?'正在同步放映 · 网页银幕':'正在同步放映';controls();}catch(error){if(error.name==='NotAllowedError'){blocked=true;status.textContent='点击“开启放映声音”，与大家同步观看';controls();}else if(error.name!=='AbortError')status.textContent='视频暂时无法播放，请检查直链和视频格式';}}
 function sync(force=false){
  if(!movie||!active||!source||!video.readyState)return;
  const desired=Math.max(0,Math.min(Number.isFinite(video.duration)?Math.max(0,video.duration-.04):604800,targetTime()));
  if((force||Math.abs(video.currentTime-desired)>.65)&&!video.seeking)try{video.currentTime=desired;}catch{}
  video.playbackRate=1;
  if(movie.playing&&video.paused&&!blocked)play();else if(!movie.playing&&!video.paused)video.pause();
  seek.max=Number.isFinite(video.duration)?String(video.duration):'604800';if(document.activeElement!==seek)seek.value=String(video.currentTime);
  const seconds=Math.floor(video.currentTime||0);$('#movie-time').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 }
 function apply(data){
  const inCinema=getSelf()?.room==='cinema';active=inCinema;
  if(!inCinema){clear();return;}if(!data.movie)return;
  const next=data.movie;if(!Number.isFinite(next.time)||!Number.isInteger(next.revision)||next.revision<(movie?.revision||0))return;
  const revisionChanged=next.revision!==movie?.revision;movie=next;receivedAt=performance.now();controls();
  if(source!==movie.url){source=movie.url;flat=false;blocked=false;setViewing(false);video.pause();video.removeAttribute('src');video.crossOrigin='anonymous';screen.hidden=true;setVideo(null);if(source){status.textContent='正在连接影片';video.src=source;video.load();}else{video.load();status.textContent='房主粘贴视频直链后，即可一起观看';}controls();}
  sync(revisionChanged);
 }
 video.addEventListener('loadeddata',()=>{if(!active||!source)return;setVideo(flat?null:video);screen.hidden=!viewing&&!flat;if(flat){status.textContent='片源未开放三维贴图访问，已切换网页银幕';}else status.textContent=movie?.playing?'正在同步放映':'影片已就绪';sync(true);});
 video.addEventListener('error',()=>{if(!active||!source)return;if(!flat){flat=true;video.removeAttribute('crossorigin');video.src=source;video.load();}else status.textContent='此链接暂时不能播放，请使用可直接打开的 MP4 或 WebM 视频';});
 video.addEventListener('ended',()=>{if(movie?.hostId===getSelf()?.participantId)send('/media',{action:'pause'}).catch(e=>notice(e.message));});
 async function control(body){try{await send('/media',body);}catch(error){status.textContent=error.message;}}
 $('#movie-form').onsubmit=e=>{e.preventDefault();control({action:'load',url:url.value.trim()});};
 $('#movie-play').onclick=()=>control({action:'play'});$('#movie-pause').onclick=()=>control({action:'pause'});$('#movie-stop').onclick=()=>control({action:'stop'});
 seek.onchange=()=>control({action:'seek',time:Number(seek.value)});$('#movie-unlock').onclick=()=>{if(movie?.playing)play();else{video.play().then(()=>video.pause()).catch(()=>{});blocked=false;controls();}};
 $('#flat-close').onclick=()=>{$('#flat-screen').classList.toggle('minimized');};
 function clear(){setViewing(false);fullButton.hidden=true;fullButton.disabled=true;if(!movie&&!source)return;active=false;movie=null;source='';video.pause();video.removeAttribute('src');video.load();setVideo(null);screen.hidden=true;url.value='';status.textContent='';}
 return{apply,clear,isViewing:()=>viewing,update(){if(active&&getSelf()?.room!=='cinema'){clear();return;}if(active&&performance.now()-lastSync>1000){lastSync=performance.now();sync();}},getStats:()=>({active,hasSource:!!source,playing:!video.paused,time:video.currentTime,blocked,flat,viewing,host:movie?.hostId===getSelf()?.participantId,revision:movie?.revision||0})};
}
