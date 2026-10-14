(() => {
'use strict';
if (window.BoyiReferenceMotion) return;
const script = document.currentScript;
const asset = new URL('media/brand/institutions.jpg', script?.src || location.href).href;
const mq = matchMedia('(prefers-reduced-motion: reduce)');
const staticTitles = () => mq.matches || document.documentElement.hasAttribute('data-rm-static');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls) => { const n = document.createElement(tag); n.className = cls; return n; };
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => x < .5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2;
const titles = new Set(), fields = new Set(), photos = new Map();
const entered = new WeakSet(), timers = new WeakMap();
let footerThumbState=null;
let running = true, raf = 0, last = 0, elapsed = 0, ready = false;
const visible = new WeakSet();
const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const e of entries) {
    if (e.isIntersecting) { visible.add(e.target); if (titles.has(e.target)) reveal(e.target); }
    else visible.delete(e.target);
  }
  wake();
}, {threshold: .08}) : null;
function watch(n) { if(io)io.observe(n);else{visible.add(n);if(titles.has(n))reveal(n);} }
function pulse(n) {
  clearTimeout(timers.get(n));
  n.classList.remove('rm-play');
  if(staticTitles()){n.classList.remove('rm-pending');return;}
  n.classList.add('rm-pending');
  void n.offsetWidth;n.classList.add('rm-play');
  // Read the actual CSS timing so fallback and the final visible layer agree.
  const ms = value => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000);
  const duration = Math.max(0, ...$$('.rm-layer', n).map(layer => {
    const style = getComputedStyle(layer);
    return ms(style.animationDuration) + ms(style.animationDelay);
  }));
  const finish=()=>{n.classList.remove('rm-play','rm-pending');};
  timers.set(n,setTimeout(finish,duration+100));
}
function reveal(n) { const stage=n.closest('.w-stage'); if(stage && !stage.classList.contains('copy-entered')) return; if (!entered.has(n)) { entered.add(n); pulse(n); } }
function decorateTitle(n) {
  if (titles.has(n) || n.closest('form,[contenteditable],.rm-layer')) return;
  const originalLabel=n.innerText.trim().replace(/\s+/g,' ');
  const base=el('rm-base','rm-title-base');while(n.firstChild)base.append(n.firstChild);n.append(base);
  if(!n.hasAttribute('aria-label')) n.setAttribute('aria-label',originalLabel);
  titles.add(n); n.classList.add('rm-title');if(!staticTitles())n.classList.add('rm-pending');
  // Await normal viewport entry without exposing offscreen base text.
  n.addEventListener('animationcancel',()=>{if(mq.matches||!n.classList.contains('rm-play')){clearTimeout(timers.get(n));n.classList.remove('rm-play','rm-pending');}});
  n.addEventListener('animationend',event=>{if(event.target.classList?.contains('rm-layer')&&event.target.style.getPropertyValue('--rm-layer')==='2'){clearTimeout(timers.get(n));n.classList.remove('rm-play','rm-pending');}});
  const geometry=()=>{const r=n.getBoundingClientRect();n.style.setProperty('--rm-skew',`${r.height*Math.tan(22.5*Math.PI/180)}px`);n.style.setProperty('--rm-band-width',`${Math.min(600,r.width*.55)}px`);};
  geometry();addEventListener('resize',geometry,{passive:true});
  n.classList.add(n.closest('.stage-copy') ? 'rm-title-band' : 'rm-title-gradient');
  for (let i = 0; i < 3; i++) {
    const layer = el('rm-layer', 'rm-layer');
    layer.setAttribute('aria-hidden', 'true'); layer.style.setProperty('--rm-layer', i);
    for (const child of [...n.childNodes]) {
      if (child.nodeType === 1 && child.matches('.rm-layer')) continue;
      layer.append(child.cloneNode(true));
    }
    for (const child of $$('*', layer)) {
      child.removeAttribute('id'); child.removeAttribute('name');
      if (child.matches('a,button,input,select,textarea,[tabindex]')) child.setAttribute('tabindex', '-1');
    }
    n.append(layer);
  }
  // A heading enters once; moving the pointer across readable text never hides it.
  watch(n);
}
function roll(link) {
  if (link.classList.contains('rm-roll') || link.closest('form,[contenteditable]')) return;
  if(!link.hasAttribute('aria-label') && !link.querySelector('img')) {const copy=link.cloneNode(true);if(link.closest('.w-nav')) for(const small of $$('small',copy))small.remove();link.setAttribute('aria-label',copy.textContent.trim().replace(/\s+/g,' '));}
  const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT, {
    acceptNode(n) { return n.textContent.trim() && !n.parentElement.closest('svg,small,script,style,.rm-arrow,.arrow,[aria-hidden="true"],.w-institutions,.logo') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
  });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  let i = 0;
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    const chars = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('zh', {granularity:'grapheme'}).segment(node.data)].map(v => v.segment) : Array.from(node.data);
    for (const ch of chars) {
      if (/\s/.test(ch)) { fragment.append(document.createTextNode(ch)); continue; }
      const cell = el('rm-char', 'rm-char');
      cell.style.setProperty('--rm-delay', `${Math.min(i++, 35)*20}ms`);
      const front = el('rm-front', 'rm-front'), back = el('rm-back', 'rm-back');
      front.textContent = ch; back.textContent = ch; back.setAttribute('aria-hidden', 'true');
      cell.append(front, back); fragment.append(cell);
    }
    const text=el('rm-text','rm-text'); text.append(fragment); node.replaceWith(text);
  }
  link.classList.add('rm-roll');
}
function arrow(link) {
  if ($('.rm-arrow', link)) return;
  const slot = $('.circle-arrow,.stage-link-arrow,.w-arrow,[data-circle-icon],.circle-icon,.arrow', link);
  if (!slot) return;
  slot.classList.add('rm-arrow');
  const original = el('rm-original', 'rm-arrow-original');
  while (slot.firstChild) original.append(slot.firstChild);
  const clip = el('rm-clip', 'rm-arrow-clip'); clip.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 2; i++) {
    const mark = el('rm-mark', `rm-arrow-mark rm-arrow-mark-${i}`);
    const graphic=original.querySelector('svg');
    if(graphic)mark.append(graphic.cloneNode(true));else mark.innerHTML='<svg class="boyi-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M8 5h11v11"/></svg>';
    clip.append(mark);
  }
  slot.append(original, clip);
}
function line(link) {
  if ($('.rm-line', link)) return;
  link.classList.add('rm-cta');
  for (const name of ['rm-line', 'rm-line-active']) {
    const n = el('rm-line', name); n.setAttribute('aria-hidden', 'true'); link.append(n);
  }
}
function field(host, kind, large = false) {
  if (!host || $('.rm-field', host)) return;
  const figure = el('figure', `rm-field rm-field-${kind}${large ? ' rm-field-large' : ''}`);
  figure.setAttribute('aria-hidden', 'true');
  const canvas = el('canvas', 'rm-canvas'); figure.append(canvas);
  const labels = [];
  if (kind === 'mission') {
    const wheel = el('div', 'rm-wheel');
    ['求知','实践','生长'].forEach((text, i) => {
      const label = el('span', 'rm-wheel-label'); label.textContent = text;
      label.style.setProperty('--rm-label-angle', `${i*120}deg`);
      wheel.append(label); labels.push(label);
    });
    figure.append(wheel);
  }
  host.prepend(figure);
  const ctx = canvas.getContext('2d'); if (!ctx) { figure.remove(); return; }
  const f = {figure, canvas, ctx, kind, labels, w:0, h:0, state:-1};
  fields.add(f); watch(figure); resizeField(f); drawField(f, elapsed);
}
function resizeField(f) {
  const r = f.figure.getBoundingClientRect();
  f.w = Math.max(1, r.width); f.h = Math.max(1, r.height);
  const dpr = Math.min(devicePixelRatio || 1, 2);
  f.canvas.width = Math.round(f.w*dpr); f.canvas.height = Math.round(f.h*dpr);
  f.ctx.setTransform(dpr,0,0,dpr,0,0);
}
function smooth(a,b,x) { const q=clamp((x-a)/(b-a)); return q*q*(3-2*q); }
function mission(x,y,t,mode) {
  const r=Math.hypot(x,y), frame=t*60;
  if(mode===0 || mode===1) {
    const count=mode===0?3:2; let value=0;
    for(let k=0;k<count;k++) {
      const phase=(frame*.004+k/count)%1;
      const radius=phase*(mode===0?1.1:1.2);
      const decay=Math.pow(1-phase,mode===0?1.5:1.2);
      const wave=mode===0?1-smooth(radius-.25,radius+.25,r):Math.exp(-Math.pow((r-radius)/.16,2));
      value=Math.max(value,wave*decay);
    }
    return value;
  }
  const span=clamp(r), angle=Math.atan2(y,x);
  const turns=(angle+frame*.02+1.6*Math.log(Math.max(r,.001)))*3/(Math.PI*2)+.5;
  const distance=Math.abs((turns-Math.floor(turns))-.5)*2;
  const width=.85*(1-.25*span);
  return (1-smooth(width*.5,width,distance))*smooth(0,.5,r)*(1-.8*span);
}
function drawField(f, time) {
  const {ctx,w,h,kind}=f, t=mq.matches?0:time;
  ctx.clearRect(0,0,w,h); ctx.fillStyle='#292723';
  const short=Math.min(w,h), pitch=kind==='mission'?short/30:7;
  const step=Math.floor(t/4), mode=step%3, previous=step===0?mode:(mode+2)%3;
  const morph=ease(clamp((t%4)/1.5));
  if (f.state!==step) {
    f.state=step; f.figure.dataset.rmPattern=['circle','rings','spiral'][mode]; f.figure.style.setProperty('--rm-wheel-angle', `${step*120}deg`);
    f.labels.forEach((n,i)=>n.classList.toggle('rm-active',i===mode));
  }
  const cols=Math.floor(w/pitch), rows=Math.floor(h/pitch);
  for(let j=0;j<=rows;j++) for(let i=0;i<=cols;i++) {
    const px=(w-cols*pitch)/2+i*pitch, py=(h-rows*pitch)/2+j*pitch;
    const x=(px-w/2)/(short/2), y=(py-h/2)/(short/2), r=Math.hypot(x,y);
    let v, mask=1;
    if(kind==='mission') {
      v=mission(x,y,t,previous)*(1-morph)+mission(x,y,t,mode)*morph;
      mask=1-smooth(.88,1.12,r);
    } else if(kind==='sphere') {
      v=0;
      for(let k=0;k<3;k++) {
        const cx=Math.sin(t*.22+k*2)*.8, cy=Math.cos(t*.18+k*2)*.35;
        const d=Math.hypot(x-cx,y-cy)/(.5+k*.1);
        if(d<1) v=Math.max(v,Math.sqrt(1-d*d)*(.65+.35*clamp(1-(x-cx))));
      }
    } else {
      v=0;
      for(let k=0;k<4;k++) {
        const d=Math.hypot(x-Math.cos(k*2)*.65,y-Math.sin(k*2)*.4);
        v+=Math.max(0,Math.sin(d*11-t*(1+k*.17)+k))*Math.exp(-d*.7)/3;
      }
    }
    const radius=pitch*(kind==='mission'?.03+.39*Math.pow(clamp(v),.9):.06+.32*Math.pow(clamp(v),.82))*(kind==='mission'?1+.25*Math.sin(t*3-r*3):1);
    if(mask<=0) continue;
    ctx.globalAlpha=mask; ctx.beginPath(); ctx.arc(px,py,radius,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
}
function footerThumbnail() {
 const image=$('img.w-footer-photo');
 if(!image || footerThumbState) return;
 const host=el('div','w-footer-photo rm-footer-thumb');
 image.replaceWith(host); image.classList.remove('w-footer-photo'); image.classList.add('rm-footer-slide','rm-footer-slide-active'); host.append(image);
 const urls=[image.src,new URL('media/photos/009.jpg',script?.src||location.href).href,new URL('media/photos/001.jpg',script?.src||location.href).href];
 footerThumbState={host,image,urls,index:0,time:0,pending:false}; watch(host);
}
function advanceFooter(seconds) {
 const f=footerThumbState;
 if(!f || !visible.has(f.host) || mq.matches || navigator.connection?.saveData || f.pending) return;
 f.time+=seconds; if(f.time<2) return; f.time=0; f.pending=true;
 const next=new Image(); next.className='rm-footer-slide'; next.alt=''; next.setAttribute('aria-hidden','true'); next.decoding='async';
 const index=(f.index+1)%f.urls.length; next.src=f.urls[index];
 next.decode().then(()=>{
   if(!running || document.hidden || mq.matches || !visible.has(f.host)) return;
   f.host.append(next); const old=f.image;
   requestAnimationFrame(()=>{next.classList.add('rm-footer-slide-active');old.classList.remove('rm-footer-slide-active');});
   setTimeout(()=>{if(old!==f.host.firstElementChild) old.remove();},650);
   f.image=next;f.index=index;
 }).catch(()=>{}).finally(()=>{f.pending=false;});
}
function tick(now) {
  raf=0;
  if(!running || document.hidden || mq.matches) { last=0; return; }
  if(!last) last=now;
  const delta=now-last;
  if(delta>=33) {
    elapsed+=Math.min(delta,100)/1000; last=now;
    for(const f of fields) if(visible.has(f.figure)) drawField(f,elapsed);
    advanceFooter(Math.min(delta,100)/1000);
  }
  if([...fields].some(f=>visible.has(f.figure)) || (footerThumbState && visible.has(footerThumbState.host))) raf=requestAnimationFrame(tick);
  else last=0;
}
function wake() { if(!raf && running && !document.hidden && !mq.matches) raf=requestAnimationFrame(tick); }
function etch() {
  if($('.rm-etch') || /(^|\/)admin(\/|\.|$)/i.test(location.pathname)) return;
  const ns='http://www.w3.org/2000/svg';
  const svgNode=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs)) n.setAttribute(k,v);return n;};
  const wrap=el('div','rm-etch'); wrap.setAttribute('aria-hidden','true');
  [[98,927,439,439],[614,947,459,399]].forEach((box,i)=>{
    const svg=svgNode('svg',{viewBox:box.join(' '),class:`rm-etch-logo rm-etch-${i}`,focusable:'false'});
    const defs=svgNode('defs',{}), filter=svgNode('filter',{id:`rm-logo-filter-${i}`,x:'-2%',y:'-2%',width:'104%',height:'104%','color-interpolation-filters':'sRGB'});
    filter.append(svgNode('feColorMatrix',{type:'matrix',values:'0 0 0 0 .16 0 0 0 0 .15 0 0 0 0 .14 -.2126 -.7152 -.0722 0 1'}));
    defs.append(filter); svg.append(defs);
    svg.append(svgNode('image',{href:asset,width:'1179',height:'2014',filter:`url(#rm-logo-filter-${i})`}));
    wrap.append(svg);
  });
  document.body.prepend(wrap);
}
function transitionPhoto(stage, oldPhoto, newPhoto) {
  if(!stage || !newPhoto || !newPhoto.complete || !newPhoto.naturalWidth) return Promise.resolve(false);
  photos.get(stage)?.();
  if(oldPhoto===newPhoto) return Promise.resolve(true);
  const host=$('.stage-visual',stage)||stage;
  return new Promise(resolve=>{
    let done=false, overlay=null, timeout=0;
    const animations=[];
    const finish=()=>{
      if(done) return; done=true; clearTimeout(timeout);
      newPhoto.classList.add('active'); if(oldPhoto) oldPhoto.classList.remove('active');
      for(const a of animations) a.cancel();
      overlay?.remove(); host.classList.remove('rm-photo-running');
      if(photos.get(stage)===finish) photos.delete(stage);
      resolve(true);
    };
    photos.set(stage,finish);
    if(mq.matches || document.hidden || !running || !Element.prototype.animate) { finish(); return; }
    try {
      overlay=el('div','rm-photo-overlay'); overlay.setAttribute('aria-hidden','true');
      const rect=host.getBoundingClientRect(), count=rect.width<760?2:4;
      const skew=Math.tan(22.5*Math.PI/180)*rect.height/Math.max(rect.width,1)*100;
      const style=getComputedStyle(newPhoto);
      host.classList.add('rm-photo-running');
      for(let i=0;i<count;i++) {
        const band=el('div','rm-photo-band');
        const l=i===0?-skew-2:i*100/count, r=i===count-1?102+skew:(i+1)*100/count+.2;
        band.style.clipPath=`polygon(${l}% 0,${r}% 0,${r-skew}% 100%,${l-skew}% 100%)`;
        const image=newPhoto.cloneNode(false);
        image.removeAttribute('id'); image.removeAttribute('data-src'); image.removeAttribute('data-srcset');
        image.className='rm-photo-copy'; image.alt=''; image.setAttribute('aria-hidden','true');
        image.style.objectFit=style.objectFit; image.style.objectPosition=style.objectPosition;
        band.append(image); overlay.append(band);
        animations.push(image.animate([
          {clipPath:'polygon(120% 0,120% 0,120% 100%,120% 100%)',transform:'scale(1.5)'},
          {clipPath:'polygon(-60% 0,160% 0,160% 100%,-60% 100%)',transform:'scale(1)'}
        ],{duration:1500,delay:i*100,easing:'cubic-bezier(.76,0,.24,1)',fill:'both'}));
      }
      host.append(overlay);
      timeout=setTimeout(finish,2100);
      Promise.all(animations.map(a=>a.finished)).then(finish,finish);
    } catch { finish(); }
  });
}
function tabs() {
  for(const button of $$('[data-tab],.news-tab')) {
    const group=button.parentElement;
    if(group.classList.contains('rm-tabs')) continue;
    group.classList.add('rm-tabs');
    const dot=el('i','rm-tab-dot'); dot.setAttribute('aria-hidden','true'); group.append(dot);
    const update=()=>{
      const active=$('[aria-selected="true"]',group)||$('[data-tab],.news-tab',group);
      if(!active) return;
      const a=active.getBoundingClientRect(),g=group.getBoundingClientRect();
      dot.style.setProperty('--rm-tab-x',`${a.left-g.left+group.scrollLeft+a.width/2}px`);
    };
    new MutationObserver(update).observe(group,{subtree:true,attributes:true,attributeFilter:['aria-selected']});
    group.addEventListener('click',()=>requestAnimationFrame(update));
    addEventListener('resize',update,{passive:true}); update();
  }
}
function refresh() {
  if(!document.body) return;
  document.body.classList.add('rm-ready');
  $$('.stage-copy h1,.stage-copy h2,main h1,.w-info h2,.cloud-section-head h2,.student-section-head h2').forEach(decorateTitle);
  $$('.stage-copy').forEach(copy=>$$('.rm-title',copy).forEach((n,i)=>n.style.setProperty('--rm-title-delay',`${i*150}ms`)));
  $$('.w-nav a,.w-menu-panel a,.stage-link,.w-footer a,[data-hover-text-trigger]').forEach(roll);
  $$('.stage-link,.text-link,[data-circle-icon-trigger]').forEach(n=>{arrow(n);line(n);});
  etch(); tabs(); footerThumbnail();
  const info=$('.w-info');
  if(info) {
    const heads=$$('h2',info).slice(0,2);
    heads.forEach((h,i)=>field(h.parentElement,i?'ripple':'sphere'));

  } else {
    const intro=$('.about-section,.reflection-intro');
    if(intro) field(intro,'mission',true);
  }
  const join=$('.w-careers,.w-join,[data-reference-join]');
  if(join && !$('.rm-pattern',join)) {
    join.classList.add('rm-pattern-host');
    const pattern=el('div','rm-pattern'); pattern.setAttribute('aria-hidden','true');
    for(let i=0;i<3;i++) {const shape=el('i',`rm-shape rm-shape-${i}`);shape.style.setProperty('--rm-phase',`${-i*4}s`);pattern.append(shape);}
    join.prepend(pattern);
  }
  wake();
}
function introPhotos() {
 for(const image of $$('.portal-hero figure img,.practice-hero-figure img,.hero-image>img')) {
  const figure=image.parentElement;
  if(figure.classList.contains('rm-intro-photo')) continue;
  figure.classList.add('rm-intro-photo');
  const play=()=>{
   if(!image.complete || !image.naturalWidth || mq.matches || document.hidden) return;
   const copy=image.cloneNode(false);copy.removeAttribute('id');copy.className='rm-inner-photo-copy';copy.alt='';copy.setAttribute('aria-hidden','true');
   figure.append(copy);
   const a=copy.animate([{clipPath:'polygon(120% 0,120% 0,80% 100%,80% 100%)',transform:'scale(1.2)'},{clipPath:'polygon(-45% 0,145% 0,105% 100%,-85% 100%)',transform:'scale(1)'}],{duration:1500,easing:'cubic-bezier(.87,0,.13,1)'});
   a.finished.catch(()=>{}).finally(()=>copy.remove());
  };
  if(image.complete) play(); else image.addEventListener('load',play,{once:true});
 }
}
function syncHeader() {
 const header=$('.w-header'); if(!header) return;
 const compact=scrollY>10, expanded=!compact||header.matches(':hover,:focus-within');
 const nav=$('.w-nav',header),menu=$('.w-menu',header);
 if(nav) nav.inert=!expanded||innerWidth<=760;
 if(menu) menu.inert=!compact&&innerWidth>760;
}
function scrollEffects() {
  const header=$('.w-header'); header?.classList.toggle('rm-compact',scrollY>10); syncHeader();
  const footer=$('.w-footer');
  if(footer) {
    const r=footer.getBoundingClientRect(), p=clamp((innerHeight-r.top)/Math.max(1,Math.min(innerHeight,r.height)));
    footer.classList.add('rm-footer');
    footer.style.setProperty('--rm-footer-y',`${mq.matches||innerWidth<760?0:(1-p)*250}px`);
    footer.style.setProperty('--rm-footer-clip',`${mq.matches||innerWidth<760?0:(1-p)*15}%`);
  }
}
function init() {
  if(ready) return; ready=true;
  if(!getComputedStyle(document.documentElement).getPropertyValue('--rm-paper').trim()){document.documentElement.classList.remove('rm-boot');return;}
  refresh();document.documentElement.classList.remove('rm-boot');introPhotos();scrollEffects();
  const header=$('.w-header');for(const event of ['pointerenter','pointerleave','focusin','focusout']) header?.addEventListener(event,()=>requestAnimationFrame(syncHeader));
  for(const stage of $$('.w-stage')) new MutationObserver(()=>{
    if(stage.classList.contains('copy-entered')) $$('.rm-title',stage).forEach(reveal);
  }).observe(stage,{attributes:true,attributeFilter:['class']});
  const panel=$('.w-menu-panel');
  if(panel) {
    $$('a',panel).forEach((n,i)=>n.style.setProperty('--rm-menu-delay',`${i*50+100}ms`));
    const update=()=>panel.classList.toggle('rm-menu-open',!panel.hidden);
    new MutationObserver(update).observe(panel,{attributes:true,attributeFilter:['hidden']}); update();
  }
  let scrollQueued=false;
  addEventListener('scroll',()=>{if(!scrollQueued){scrollQueued=true;requestAnimationFrame(()=>{scrollQueued=false;scrollEffects();});}},{passive:true});
  if('ResizeObserver' in window) {
    const ro=new ResizeObserver(entries=>{for(const e of entries)for(const f of fields)if(e.target===f.figure){resizeField(f);drawField(f,elapsed);}});
    for(const f of fields) ro.observe(f.figure);
  }
  addEventListener('resize',()=>{for(const f of fields){resizeField(f);drawField(f,elapsed);}scrollEffects();},{passive:true});
  window.BoyiReferenceMotion.initialized=true;
}
function stop() {cancelAnimationFrame(raf);raf=0;last=0;for(const finish of [...photos.values()])finish();}
document.addEventListener('visibilitychange',()=>{document.body?.classList.toggle('rm-paused',document.hidden);if(document.hidden)stop();else wake();});
addEventListener('pagehide',()=>{running=false;document.body?.classList.add('rm-paused');stop();});
addEventListener('pageshow',()=>{running=true;document.body?.classList.remove('rm-paused');wake();});
mq.addEventListener('change',()=>{stop();for(const n of titles)n.classList.remove('rm-play','rm-pending');for(const f of fields)drawField(f,elapsed);scrollEffects();wake();});
window.BoyiReferenceMotion={
  initialized:false,
  transitionPhoto,
  refresh,
  replayTitles(root=document){for(const n of titles)if(root===n||root.contains(n))pulse(n);},
  limitations:[
    'CSS companion must load after existing styles; browser visuals remain unverified.',
    'Parent must call transitionPhoto after decode and await it before updating carousel index.',
    'Footer reveals in flow to preserve long-page layout; own stills rotate after decoding on eligible visible viewports.',
    'Floating join shapes require an existing matching host; no content, card order or formal logo is replaced.',
    'Logo etching reuses the audited JPEG; it is not a vector master. Asset URL assumes this script is in the site root.'
  ]
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
