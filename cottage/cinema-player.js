import {attachBilibiliBrowser,biliVideo} from './bilibili-browser.js?v=15f612630590';
export function createCinemaPlayer({getSelf,send,notice,setVideo,openPanel,closePanel=()=>{}}){
 const $=s=>document.querySelector(s),video=$('#cinema-video'),status=$('#movie-status'),url=$('#movie-url'),seek=$('#movie-seek');
 let movie=null,receivedAt=0,source='',active=false,blocked=false,flat=false,lastSync=0,viewing=false,bili=null,biliFrame=null,biliLoads=0,biliReady=false,biliTimer=null;
 const browser=attachBilibiliBrowser({openPanel,getSelf,send,notice});
 const screen=$('#flat-screen'),fullButton=document.createElement('button'),viewTools=document.createElement('div');
 fullButton.id='movie-fullscreen';fullButton.type='button';fullButton.textContent='完整银幕';fullButton.hidden=true;fullButton.disabled=true;$('#cinema-controls').before(fullButton);
 viewTools.id='movie-view-tools';viewTools.setAttribute('aria-label','完整银幕操作');
 for(const [id,label,target] of [['movie-explore','返回探索',null],['movie-view-controls','放映控制','#cinema-controls'],['movie-view-chat','同屋聊天','#open-roomchat'],['movie-view-voice','语音','#open-voice']]){const button=document.createElement('button');button.id=id;button.type='button';button.textContent=label;button.onclick=()=>target?$(target).click():setViewing(false);viewTools.append(button);}
 screen.prepend(viewTools);
 const panelScreenButton=document.createElement('button');panelScreenButton.id='movie-open-screen';panelScreenButton.type='button';panelScreenButton.className='primary';panelScreenButton.textContent='打开完整银幕';$('#movie-form').before(panelScreenButton);panelScreenButton.onclick=()=>fullButton.click();
 const biliHost=document.createElement('div'),biliNote=document.createElement('div'),biliHint=document.createElement('span'),biliIdentity=document.createElement('strong'),biliExternal=document.createElement('a'),biliRetry=document.createElement('button');
 biliHost.id='cinema-bili-player';biliHost.hidden=true;biliNote.id='cinema-bili-note';biliNote.hidden=true;biliHint.textContent='B站视频由各自点击播放、控制进度和声音';biliExternal.textContent='在 B 站打开 ↗';biliExternal.target='_blank';biliExternal.rel='noopener noreferrer';biliRetry.textContent='重新加载播放器';biliRetry.type='button';biliIdentity.id='cinema-bili-identity';biliIdentity.setAttribute('aria-live','polite');biliNote.append(biliIdentity,biliHint,biliRetry,biliExternal);screen.append(biliHost,biliNote);
 function clearBili(){clearTimeout(biliTimer);biliTimer=null;biliFrame?.remove();biliFrame=null;bili=null;biliReady=false;biliIdentity.textContent='';biliHost.replaceChildren();biliHost.hidden=biliNote.hidden=true;video.hidden=false;}
 function showBili(next,{reload=false}={}){if(!reload&&biliFrame&&bili?.key===next.key)return false;clearBili();bili=next;biliIdentity.textContent=next.id+' · 第 '+next.part+' P';video.hidden=true;biliHost.hidden=biliNote.hidden=false;biliExternal.href=next.url;biliHint.textContent='点击播放器中的播放按钮；进度和声音由各自控制';const frame=document.createElement('iframe');frame.title='哔哩哔哩放映银幕 · '+next.id+' · 第 '+next.part+' P';frame.allow='autoplay; fullscreen; encrypted-media; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation');frame.src=next.playerUrl;frame.onload=()=>{if(frame!==biliFrame)return;biliReady=true;clearTimeout(biliTimer);};biliFrame=frame;biliLoads++;biliHost.append(frame);biliTimer=setTimeout(()=>{if(frame===biliFrame)biliHint.textContent='如果播放器没有画面，可重新加载，或在 B 站打开；部分视频需要登录或受版权限制';},20000);return true;}
 biliRetry.onclick=()=>{if(bili)showBili(bili,{reload:true});};
 function setViewing(value){viewing=Boolean(value&&active&&source);document.body.classList.toggle('cinema-viewing',viewing);screen.classList.toggle('viewing',viewing);screen.classList.remove('minimized');screen.hidden=!viewing&&!flat;fullButton.setAttribute('aria-pressed',String(viewing));if(viewing){closePanel();if(document.pointerLockElement)document.exitPointerLock();}}
 fullButton.onclick=()=>{if(movie?.kind==='web'&&!bili){browser.openShared();return;}setViewing(true);if(movie?.playing&&blocked)play();};
 addEventListener('keydown',event=>{if(event.code==='Escape'&&viewing&&!$('#room-dialog').open){event.preventDefault();setViewing(false);}});
 video.playsInline=true;video.preload='metadata';video.crossOrigin='anonymous';
 function targetTime(){return movie?movie.time+(movie.playing?(performance.now()-receivedAt)/1000:0):0;}
 function controls(){const host=movie?.hostId===getSelf()?.participantId;$('#movie-host').textContent=host?'你是当前房主，可选片与控制播放':'由当前房主选片与控制播放';for(const id of ['movie-load','movie-play','movie-pause','movie-stop','movie-seek'])$('#'+id).disabled=!host;if(movie?.kind==='web'){for(const id of ['movie-play','movie-pause','movie-seek'])$('#'+id).disabled=true;}fullButton.textContent=movie?.kind==='web'?(bili?'B站银幕':'打开B站网页'):'完整银幕';$('#movie-play').textContent='播放';$('#movie-unlock').hidden=!blocked;fullButton.hidden=panelScreenButton.hidden=!active;fullButton.disabled=panelScreenButton.disabled=!source;panelScreenButton.textContent=movie?.kind==='web'?(bili?'打开B站银幕':'打开B站网页'):'打开完整银幕';}
 async function play(){try{await video.play();blocked=false;status.textContent=flat?'正在同步放映 · 网页银幕':'正在同步放映';controls();}catch(error){if(error.name==='NotAllowedError'){blocked=true;status.textContent='点击“开启放映声音”，与大家同步观看';controls();}else if(error.name!=='AbortError')status.textContent='视频暂时无法播放，请检查直链和视频格式';}}
 function sync(force=false){
  if(!movie||movie.kind==='web'||!active||!source||!video.readyState)return;
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
  const revisionChanged=next.revision!==movie?.revision;movie=next;receivedAt=performance.now();browser.apply(movie);controls();
  if(movie.kind==='web'){if(source!==movie.url){const hadVideo=!!video.getAttribute('src');source=movie.url;video.pause();video.removeAttribute('src');if(hadVideo)video.load();setVideo(null);}flat=false;blocked=false;const selected=biliVideo(movie.url);if(selected){const changed=showBili(selected);if(changed)setViewing(true);status.textContent='B站银幕已打开，点击播放器播放；同屋共享视频和分P，播放进度与声音由各自控制';}else{clearBili();setViewing(false);screen.hidden=true;status.textContent='房主已分享哔哩哔哩网页入口；视频链接可直接在放映室银幕播放';}controls();return;}
  if(source!==movie.url){clearBili();source=movie.url;flat=false;blocked=false;setViewing(false);video.pause();video.removeAttribute('src');video.crossOrigin='anonymous';screen.hidden=true;setVideo(null);if(source){status.textContent='正在连接影片';video.src=source;video.load();}else{video.load();status.textContent='房主粘贴视频直链或 B站视频链接后，即可观看';}controls();}
  sync(revisionChanged);
 }
 video.addEventListener('loadeddata',()=>{if(!active||!source||movie?.kind==='web')return;setVideo(flat?null:video);screen.hidden=!viewing&&!flat;if(flat){status.textContent='片源未开放三维贴图访问，已切换网页银幕';}else status.textContent=movie?.playing?'正在同步放映':'影片已就绪';sync(true);});
 video.addEventListener('error',()=>{if(!active||!source||movie?.kind==='web')return;if(!flat){flat=true;video.removeAttribute('crossorigin');video.src=source;video.load();}else status.textContent='此链接暂时不能播放，请使用可直接打开的 MP4 或 WebM 视频';});
 video.addEventListener('ended',()=>{if(movie?.hostId===getSelf()?.participantId)send('/media',{action:'pause'}).catch(e=>notice(e.message));});
 async function control(body){try{await send('/media',body);}catch(error){status.textContent=error.message;}}
 $('#movie-form').onsubmit=e=>{e.preventDefault();const value=url.value.trim(),selected=biliVideo(value);let biliURL=false;try{biliURL=new URL(value).hostname.endsWith('.bilibili.com');}catch{}if(biliURL&&!selected){status.textContent='银幕需要具体的 B站 BV / av 视频链接；浏览首页或搜索请点“哔哩哔哩网页”';return;}control({action:'load',...(selected?{kind:'web'}:{}),url:selected?.url||value});};
 $('#movie-play').onclick=()=>control({action:'play'});$('#movie-pause').onclick=()=>control({action:'pause'});$('#movie-stop').onclick=()=>control({action:'stop'});
 seek.onchange=()=>control({action:'seek',time:Number(seek.value)});$('#movie-unlock').onclick=()=>{if(movie?.playing)play();else{video.play().then(()=>video.pause()).catch(()=>{});blocked=false;controls();}};
 $('#flat-close').onclick=()=>{$('#flat-screen').classList.toggle('minimized');};
 function clear(){browser.clearShared();clearBili();const hadMedia=!!(movie||source||video.getAttribute('src'));active=false;movie=null;source='';flat=false;blocked=false;receivedAt=0;lastSync=0;setViewing(false);fullButton.hidden=true;fullButton.disabled=true;video.pause();video.removeAttribute('src');if(hadMedia)video.load();setVideo(null);screen.hidden=true;screen.classList.remove('minimized');url.value='';status.textContent='';seek.value='0';$('#movie-time').textContent='0:00';controls();}
 return{apply,clear,isViewing:()=>viewing||browser.isOpen(),update(){if(active&&getSelf()?.room!=='cinema'){clear();return;}if(active&&performance.now()-lastSync>1000){lastSync=performance.now();sync();}},getStats:()=>({kind:movie?.kind||'video',browser:browser.getStats(),bilibili:bili?{id:bili.id,part:bili.part,iframeLoads:biliLoads,frameReady:biliReady,mode:'full-screen',synchronized:'video-and-part-only'}:null,active,hasSource:!!source,playing:!video.paused,time:video.currentTime,blocked,flat,viewing,host:movie?.hostId===getSelf()?.participantId,revision:movie?.revision||0})};
}
