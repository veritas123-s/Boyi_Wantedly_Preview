(() => {
 'use strict';
 const script=document.currentScript,base=new URL('.',script.src),key='shanhai-music-v1';
 let saved={};try{const value=JSON.parse(sessionStorage.getItem(key)||'{}');if(value&&typeof value==='object')saved=value;}catch{}
 const audio=new Audio(),trackUrl=new URL('media/audio/shiguang-dingqiao.mp3',base).href;
 audio.id='background-music';audio.loop=true;audio.preload='none';audio.volume=.32;
 audio.setAttribute('playsinline','');audio.setAttribute('aria-label','背景音乐：时光，丁乔');
 const button=document.createElement('button');button.type='button';button.className='music-player';
 button.innerHTML='<span class="music-disc" aria-hidden="true"><span class="disc-label">山海<br>回声</span><span class="disc-hole"></span></span><span class="music-copy"><span class="music-title">时光 · 丁乔</span><span class="music-state">待播放</span></span><span class="music-symbol" aria-hidden="true">▶</span>';
 document.body.append(audio,button);
 let pausedByUser=saved.paused===true,busy=false,loading=false,playing=false,failed=false,sourceAssigned=false;
 let resumeTime=Number.isFinite(saved.time)&&saved.time>0?saved.time:0;
 const status=button.querySelector('.music-state'),symbol=button.querySelector('.music-symbol');
 function render(){const active=playing&&!audio.paused;button.classList.toggle('is-playing',active);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',!audio.paused||loading?'暂停背景音乐：时光，丁乔':'播放背景音乐：时光，丁乔');status.textContent=failed?'暂未加载，点击重试':loading?'正在加载':active?'正在播放':pausedByUser?'已暂停':'待播放';symbol.textContent=active?'Ⅱ':loading?'…':'▶';}
 function save(){if(sourceAssigned&&audio.readyState>=1)resumeTime=audio.currentTime;try{sessionStorage.setItem(key,JSON.stringify({paused:pausedByUser,time:resumeTime}));}catch{}}
 async function play(){if(busy)return;busy=true;pausedByUser=false;failed=false;loading=true;playing=false;if(!sourceAssigned){audio.src=trackUrl;sourceAssigned=true;}else if(audio.error){save();audio.load();}render();try{await audio.play();}catch(error){loading=false;playing=false;if(!pausedByUser&&error.name!=='AbortError')failed=true;}finally{busy=false;render();}}
 audio.addEventListener('loadedmetadata',()=>{if(resumeTime>0&&resumeTime<audio.duration)audio.currentTime=resumeTime;});
 audio.addEventListener('play',()=>{pausedByUser=false;document.querySelectorAll('audio').forEach(a=>{if(a!==audio)a.pause();});render();save();});
 audio.addEventListener('playing',()=>{playing=true;loading=false;failed=false;render();});
 audio.addEventListener('waiting',()=>{if(!audio.paused){playing=false;loading=true;render();}});
 audio.addEventListener('pause',()=>{playing=false;loading=false;render();save();});
 audio.addEventListener('error',()=>{playing=false;loading=false;failed=true;render();});
 document.addEventListener('play',event=>{if(event.target instanceof HTMLMediaElement&&event.target!==audio&&(!audio.paused||loading)){pausedByUser=true;audio.pause();playing=false;loading=false;render();save();}},true);
 button.addEventListener('click',()=>{if(failed||audio.error){play();}else if(!audio.paused||loading){pausedByUser=true;audio.pause();playing=false;loading=false;render();}else{play();}save();});
 window.addEventListener('pagehide',save);audio.addEventListener('timeupdate',()=>{if(Math.floor(audio.currentTime)%5===0)save();});
 render();
})();
