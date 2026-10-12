'use strict';
document.documentElement.classList.add('js');
const header=document.querySelector('.w-header'),menu=document.querySelector('.w-menu'),panel=document.querySelector('.w-menu-panel');
function closeMenu(){if(!menu)return;panel.hidden=true;menu.setAttribute('aria-expanded','false');menu.innerHTML='<span>•</span> Menu';}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';panel.hidden=open;menu.setAttribute('aria-expanded',String(!open));menu.innerHTML=open?'<span>•</span> Menu':'<span>×</span> Close';});
panel?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();menu?.focus();}});
document.addEventListener('click',e=>{if(panel&&!panel.hidden&&!header.contains(e.target)&&!panel.contains(e.target))closeMenu();});
let pending=false;
function draw(){pending=false;const y=scrollY;header?.classList.toggle('compact',y>100);document.querySelector('.stage-0')?.classList.toggle('expanded',y>20);for(const stage of document.querySelectorAll('.w-stage')){const r=stage.getBoundingClientRect(),p=Math.max(-1,Math.min(1,r.top/innerHeight));stage.querySelector('.stage-copy').style.transform=`translateY(${p*-24}px)`;}}
addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(draw);}},{passive:true});draw();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(!reduced.matches){for(const stage of document.querySelectorAll('.w-stage')){const imgs=[...stage.querySelectorAll('.stage-image')];let index=0;setInterval(()=>{if(document.hidden||stage.getBoundingClientRect().bottom<0||stage.getBoundingClientRect().top>innerHeight)return;imgs[index].classList.remove('active');index=(index+1)%imgs.length;imgs[index].classList.add('active');},6500);}}
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}),{threshold:.16});document.querySelectorAll('[data-reveal]').forEach(e=>observer.observe(e));
const tabs=[...document.querySelectorAll('[data-tab]')];function selectTab(button){for(const t of tabs){const active=t===button;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.dataset.tab).hidden=!active;}}
for(const button of tabs){button.addEventListener('click',()=>selectTab(button));button.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();let i=tabs.indexOf(button);i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectTab(tabs[i]);tabs[i].focus();});}
document.querySelector('.w-scroll')?.addEventListener('click',()=>document.querySelector('.stage-1').scrollIntoView({behavior:reduced.matches?'instant':'smooth'}));
