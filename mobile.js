/* Keyboard and touch handling for the existing menu; page links remain native. */
(()=>{'use strict';
 const menu=document.querySelector('.w-menu'),panel=document.querySelector('.w-menu-panel');
 if(!menu||!panel)return;
 const phone=matchMedia('(max-width:760px)');
 const sync=()=>{const open=menu.getAttribute('aria-expanded')==='true';document.body.classList.toggle('boyi-menu-open',open&&phone.matches);};
 new MutationObserver(sync).observe(menu,{attributes:true,attributeFilter:['aria-expanded']});
 phone.addEventListener('change',sync);sync();
 menu.addEventListener('click',()=>{if(phone.matches&&menu.getAttribute('aria-expanded')==='true')requestAnimationFrame(()=>panel.querySelector('a')?.focus({preventScroll:true}));});
 panel.addEventListener('click',event=>{if(event.target.closest('a'))document.body.classList.remove('boyi-menu-open');});
 document.addEventListener('keydown',event=>{
  if(!phone.matches||menu.getAttribute('aria-expanded')!=='true'||event.key!=='Tab')return;
  const links=[menu,...panel.querySelectorAll('a[href]')],first=links[0],last=links[links.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
})();
