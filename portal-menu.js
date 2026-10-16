/* Keep the existing menu state machine, with hover for a mouse and click for touch. */
(()=>{'use strict';function start(){const menu=document.querySelector('.w-menu'),panel=document.querySelector('.w-menu-panel');if(!menu||!panel)return;document.documentElement.classList.add('portal-hover-menu');const available=()=>{if(menu.inert)menu.inert=false;};available();new MutationObserver(available).observe(menu,{attributes:true,attributeFilter:['inert']});const desktop=matchMedia('(hover:hover) and (pointer:fine)');let timer;
 const cancel=()=>clearTimeout(timer),open=()=>{cancel();if(menu.getAttribute('aria-expanded')!=='true')menu.click();},close=()=>{cancel();if(menu.getAttribute('aria-expanded')==='true')menu.click();};
 const leave=()=>{cancel();timer=setTimeout(()=>{if(desktop.matches&&!menu.matches(':hover')&&!panel.matches(':hover')&&!panel.contains(document.activeElement))close();},180);};
 menu.addEventListener('pointerenter',event=>{if(desktop.matches&&event.pointerType==='mouse')open();});menu.addEventListener('pointerleave',leave);panel.addEventListener('pointerenter',cancel);panel.addEventListener('pointerleave',leave);
 menu.addEventListener('click',event=>{if(desktop.matches&&event.isTrusted&&event.detail>0){event.preventDefault();event.stopImmediatePropagation();}},true);
 desktop.addEventListener('change',()=>{cancel();close();});window.addEventListener('pagehide',cancel);
}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();})();
