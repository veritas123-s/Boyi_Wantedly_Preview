(() => {
 'use strict';
 const sections=[...document.querySelectorAll('.portal-showcase')];
 if(!sections.length||!('IntersectionObserver'in window))return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),visible=new Set();
 let observer=null,frame=0;
 function update(){frame=0;if(reduced.matches||document.hidden)return;for(const s of visible){const r=s.getBoundingClientRect(),shift=Math.max(-18,Math.min(18,(innerHeight/2-r.top-r.height/2)*.04));s.style.setProperty('--showcase-shift',shift.toFixed(2)+'px');}}
 function queue(){if(!frame&&visible.size&&!document.hidden&&!reduced.matches)frame=requestAnimationFrame(update);}
 function setup(){
  observer?.disconnect();observer=null;visible.clear();if(frame)cancelAnimationFrame(frame);frame=0;
  document.documentElement.classList.toggle('showcase-enhanced',!reduced.matches);
  if(reduced.matches){for(const s of sections){s.classList.add('is-seen');s.classList.remove('is-showing');s.style.removeProperty('--showcase-shift');}return;}
  observer=new IntersectionObserver(entries=>{for(const e of entries){e.target.classList.toggle('is-showing',e.isIntersecting&&!document.hidden);if(e.isIntersecting){e.target.classList.add('is-seen');visible.add(e.target);}else visible.delete(e.target);}queue();},{threshold:.12});
  sections.forEach(s=>observer.observe(s));
 }
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}for(const s of sections)s.classList.toggle('is-showing',!document.hidden&&visible.has(s)&&!reduced.matches);queue();});
 reduced.addEventListener('change',setup);setup();
})();
