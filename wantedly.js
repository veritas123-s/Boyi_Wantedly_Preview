(()=>{
'use strict';
document.documentElement.classList.add('js');
const header=document.querySelector('.w-header'),menu=document.querySelector('.w-menu'),panel=document.querySelector('.w-menu-panel');
function closeMenu(){if(!menu||!panel)return;panel.hidden=true;menu.setAttribute('aria-expanded','false');menu.innerHTML='<span>•</span> 菜单';}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';panel.hidden=open;menu.setAttribute('aria-expanded',String(!open));menu.innerHTML=open?'<span>•</span> 菜单':'<span>×</span> 关闭';});
panel?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();menu?.focus();}});
document.addEventListener('click',e=>{if(panel&&!panel.hidden&&!header.contains(e.target)&&!panel.contains(e.target))closeMenu();});
const stages=[...document.querySelectorAll('.w-stage')],reduced=matchMedia('(prefers-reduced-motion: reduce)');
const introStages=[...document.querySelectorAll('.boyi-opening,.stage-0')],introReady=new WeakSet();
function enterCopy(stage){if(introStages.includes(stage)&&!introReady.has(stage))return;stage.classList.add('copy-entered');}
function startIntro(stage){
 if(introReady.has(stage))return;introReady.add(stage);
 const photo=stage.querySelector('.stage-image'),motion=window.BoyiReferenceMotion;
 const sweep=stage.matches('.boyi-opening')&&!reduced.matches&&motion?.initialized;
 if(sweep)photo.classList.remove('active');
 stage.classList.add('expanded');enterCopy(stage);
 if(sweep)motion.transitionPhoto(stage,null,photo).catch(()=>false).finally(()=>photo.classList.add('active'));
}
function intro(stage){requestAnimationFrame(()=>requestAnimationFrame(()=>loadPhoto(stage.querySelector('.stage-image')).then(()=>requestAnimationFrame(()=>startIntro(stage)))));}
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting&&e.intersectionRatio>.12){intro(e.target);observer.unobserve(e.target);}},{threshold:.12});introStages.forEach(stage=>observer.observe(stage));}else introStages.forEach(intro);
let pending=false;
function draw(){pending=false;header?.classList.toggle('compact',scrollY>10);for(const stage of stages){const r=stage.getBoundingClientRect(),p=Math.max(-1,Math.min(1,r.top/innerHeight));stage.querySelector('.stage-copy').style.transform=reduced.matches?'none':`translateY(${p*-24}px)`;}}
addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(draw);}},{passive:true});draw();
// Load and decode the next photo before replacing the one already visible.
const loading=new WeakMap();
function loadPhoto(photo){
 if(loading.has(photo))return loading.get(photo);
 const task=(async()=>{
  if(photo.dataset.src){
   if(photo.dataset.sizes)photo.sizes=photo.dataset.sizes;
   if(photo.dataset.srcset)photo.srcset=photo.dataset.srcset;
   photo.src=photo.dataset.src;delete photo.dataset.src;delete photo.dataset.srcset;delete photo.dataset.sizes;
  }
  try{if(typeof photo.decode==='function')await photo.decode();else if(!photo.complete)await new Promise((resolve,reject)=>{photo.addEventListener('load',resolve,{once:true});photo.addEventListener('error',reject,{once:true});});}catch{return false;}
  return photo.complete&&photo.naturalWidth>0;
 })();loading.set(photo,task);return task;
}
const state=new Map(stages.map(stage=>[stage,{photos:[...stage.querySelectorAll('.stage-image')],index:0,visible:false,timer:null}]));
const idle=callback=>{if('requestIdleCallback'in window)requestIdleCallback(callback,{timeout:2000});else setTimeout(callback,200);};
function prepare(stage){const s=state.get(stage);return loadPhoto(s.photos[s.index]);}
function warmNext(stage){const s=state.get(stage);if(!s.visible||reduced.matches||document.hidden)return;idle(()=>{if(s.visible&&!document.hidden)loadPhoto(s.photos[(s.index+1)%s.photos.length]);});}
function schedule(stage){const s=state.get(stage);clearTimeout(s.timer);if(s.photos.length<2||!s.visible||document.hidden||reduced.matches)return;s.timer=setTimeout(async()=>{
  const next=(s.index+1)%s.photos.length,ready=await loadPhoto(s.photos[next]);
  if(ready&&s.visible&&!document.hidden&&!reduced.matches){const previous=s.photos[s.index];
   const motion=window.BoyiReferenceMotion;
   let switched=false;
   if(motion&&typeof motion.transitionPhoto==='function'){
    try{switched=await motion.transitionPhoto(stage,previous,s.photos[next]);}
    catch(error){console.warn('Photo transition fell back to decoded image',error);}
   }
   if(!switched){previous.classList.remove('active');s.photos[next].classList.add('active');}
   s.index=next;warmNext(stage);}
  schedule(stage);
 },6500);}
function setVisible(stage,visible){const s=state.get(stage);s.visible=visible;stage.classList.toggle('is-on-screen',visible);clearTimeout(s.timer);if(visible)prepare(stage).then(()=>{warmNext(stage);schedule(stage);});}
if('IntersectionObserver'in window){
 const nearby=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){prepare(entry.target);nearby.unobserve(entry.target);}},{rootMargin:'300px'});
 const visible=new IntersectionObserver(entries=>entries.forEach(entry=>setVisible(entry.target,entry.isIntersecting&&entry.intersectionRatio>.12)),{threshold:[0,.12]});
 stages.forEach(stage=>{nearby.observe(stage);visible.observe(stage);});
 const copyObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){enterCopy(entry.target.closest('.w-stage'));copyObserver.unobserve(entry.target);}},{threshold:.2});
 stages.forEach(stage=>copyObserver.observe(stage.querySelector('.stage-copy')));
}else{stages.forEach(stage=>{setVisible(stage,true);enterCopy(stage);});}
document.addEventListener('visibilitychange',()=>{for(const stage of stages){const s=state.get(stage);clearTimeout(s.timer);if(!document.hidden&&s.visible){warmNext(stage);schedule(stage);}}});
reduced.addEventListener('change',()=>{draw();if(reduced.matches){introStages.forEach(startIntro);stages.forEach(enterCopy);}for(const stage of stages){warmNext(stage);schedule(stage);}});
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}),{threshold:.16});document.querySelectorAll('[data-reveal]').forEach(e=>observer.observe(e));}
const tabs=[...document.querySelectorAll('[data-tab]')];function selectTab(button){for(const t of tabs){const active=t===button;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.dataset.tab).hidden=!active;}}
for(const button of tabs){button.addEventListener('click',()=>selectTab(button));button.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();let i=tabs.indexOf(button);i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectTab(tabs[i]);tabs[i].focus();});}
document.querySelector('.w-scroll')?.addEventListener('click',()=>document.querySelector('.stage-1').scrollIntoView({behavior:reduced.matches?'auto':'smooth'}));
// Prefetch only the link the user deliberately approaches, never all linked pages.
const prefetched=new Set();
function prefetchLink(link){
 if(!link||navigator.connection?.saveData)return;
 const url=new URL(link.href);if(url.origin!==location.origin||url.pathname===location.pathname||url.hash||!url.pathname.endsWith('/')||url.pathname.includes('/admin/'))return;
 if(prefetched.has(url.href))return;prefetched.add(url.href);
 const hint=document.createElement('link');hint.rel='prefetch';hint.as='document';hint.href=url.href;document.head.append(hint);
}
document.addEventListener('pointerover',event=>prefetchLink(event.target.closest('.w-nav a,.w-menu-panel a,.stage-link')),{passive:true});
document.addEventListener('focusin',event=>prefetchLink(event.target.closest('.w-nav a,.w-menu-panel a,.stage-link')));

})();
