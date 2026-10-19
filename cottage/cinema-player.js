export function createCinemaPlayer({getSelf,send,notice,setVideo}){
 const $=s=>document.querySelector(s),video=$('#cinema-video'),status=$('#movie-status'),url=$('#movie-url'),seek=$('#movie-seek');
 let movie=null,receivedAt=0,source='',active=false,blocked=false,flat=false,lastSync=0;
 video.playsInline=true;video.preload='metadata';video.crossOrigin='anonymous';
 function targetTime(){return movie?movie.time+(movie.playing?(performance.now()-receivedAt)/1000:0):0;}
 function controls(){const host=movie?.hostId===getSelf()?.participantId;$('#movie-host').textContent=host?'你是当前房主，可选片与控制播放':'由当前房主选片与控制播放';for(const id of ['movie-load','movie-play','movie-pause','movie-stop','movie-seek'])$('#'+id).disabled=!host;$('#movie-play').textContent='播放';$('#movie-unlock').hidden=!blocked;}
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
  if(source!==movie.url){source=movie.url;flat=false;blocked=false;video.pause();video.removeAttribute('src');video.crossOrigin='anonymous';$('#flat-screen').hidden=true;setVideo(null);if(source){status.textContent='正在连接影片';video.src=source;video.load();}else{video.load();status.textContent='房主粘贴视频直链后，即可一起观看';}}
  sync(revisionChanged);
 }
 video.addEventListener('loadeddata',()=>{if(!active||!source)return;setVideo(flat?null:video);if(flat){$('#flat-screen').hidden=false;status.textContent='片源未开放三维贴图访问，已切换网页银幕';}else status.textContent=movie?.playing?'正在同步放映':'影片已就绪';sync(true);});
 video.addEventListener('error',()=>{if(!active||!source)return;if(!flat){flat=true;video.removeAttribute('crossorigin');video.src=source;video.load();}else status.textContent='此链接暂时不能播放，请使用可直接打开的 MP4 或 WebM 视频';});
 video.addEventListener('ended',()=>{if(movie?.hostId===getSelf()?.participantId)send('/media',{action:'pause'}).catch(e=>notice(e.message));});
 async function control(body){try{await send('/media',body);}catch(error){status.textContent=error.message;}}
 $('#movie-form').onsubmit=e=>{e.preventDefault();control({action:'load',url:url.value.trim()});};
 $('#movie-play').onclick=()=>control({action:'play'});$('#movie-pause').onclick=()=>control({action:'pause'});$('#movie-stop').onclick=()=>control({action:'stop'});
 seek.onchange=()=>control({action:'seek',time:Number(seek.value)});$('#movie-unlock').onclick=()=>{if(movie?.playing)play();else{video.play().then(()=>video.pause()).catch(()=>{});blocked=false;controls();}};
 $('#flat-close').onclick=()=>{$('#flat-screen').classList.toggle('minimized');};
 function clear(){if(!movie&&!source)return;active=false;movie=null;source='';video.pause();video.removeAttribute('src');video.load();setVideo(null);$('#flat-screen').hidden=true;url.value='';status.textContent='';}
 return{apply,clear,update(){if(active&&getSelf()?.room!=='cinema'){clear();return;}if(active&&performance.now()-lastSync>1000){lastSync=performance.now();sync();}},getStats:()=>({active,hasSource:!!source,playing:!video.paused,time:video.currentTime,blocked,flat,host:movie?.hostId===getSelf()?.participantId,revision:movie?.revision||0})};
}
