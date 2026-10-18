(() => {
 'use strict';
 const sections=[...document.querySelectorAll('.portal-showcase')];
 if(!sections.length||!('IntersectionObserver'in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 document.documentElement.classList.add('showcase-enhanced');
 const visible=new Set(),observer=new IntersectionObserver(entries=>{for(const e of entries){e.target.classList.toggle('is-showing',e.isIntersecting);if(e.isIntersecting){e.target.classList.add('is-seen');visible.add(e.target);}else visible.delete(e.target);}},{threshold:.12});
 sections.forEach(s=>observer.observe(s));let queued=false;
 const update=()=>{queued=false;for(const s of visible){const r=s.getBoundingClientRect(),shift=Math.max(-18,Math.min(18,(innerHeight/2-r.top-r.height/2)*.04));s.style.setProperty('--showcase-shift',shift.toFixed(2)+'px');}};
 addEventListener('scroll',()=>{if(!queued&&visible.size){queued=true;requestAnimationFrame(update);}},{passive:true});
})();
