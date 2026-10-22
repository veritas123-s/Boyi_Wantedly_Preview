// Official player contract: https://player.bilibili.com/
// Only video identity and part are carried into the cross-origin iframe.
export function biliVideo(value){
 const text=String(value||'').trim();let url;
 try{url=new URL(/^(?:BV[0-9A-Za-z]{10}|av[1-9][0-9]*)$/i.test(text)?'https://www.bilibili.com/video/'+text:text);}catch{return null;}
 if(url.protocol!=='https:'||url.username||url.password||url.port||!['www.bilibili.com','m.bilibili.com'].includes(url.hostname))return null;
 const match=/^\/video\/(BV[0-9A-Za-z]{10}|av[1-9][0-9]*)\/?$/i.exec(url.pathname);if(!match)return null;
 const rawPart=url.searchParams.get('p')||'1';if(!/^[1-9][0-9]{0,8}$/.test(rawPart))return null;
 const part=Number(rawPart),id=match[1].slice(0,2).toLowerCase()==='bv'?'BV'+match[1].slice(2):'av'+match[1].slice(2);
 const address=new URL('https://www.bilibili.com/video/'+id+'/');if(part!==1)address.searchParams.set('p',String(part));
 const player=new URL('https://player.bilibili.com/player.html');player.searchParams.set(id.startsWith('BV')?'bvid':'aid',id.startsWith('BV')?id:id.slice(2));player.searchParams.set('p',String(part));player.searchParams.set('autoplay','0');player.searchParams.set('poster','1');player.searchParams.set('danmaku','0');
 return{key:id+':'+part,id,part,url:address.href,playerUrl:player.href};
}

export const BILIBILI_HOSTS=Object.freeze(['www.bilibili.com','search.bilibili.com','space.bilibili.com','t.bilibili.com','live.bilibili.com','m.bilibili.com','passport.bilibili.com','account.bilibili.com']);
export function biliAddress(value){
 const text=String(value||'').trim();if(!text||text.length>2048||/[\u0000-\u001f\u007f]/u.test(text))throw Error('请输入搜索关键词或哔哩哔哩网址');
 const video=biliVideo(text);if(video)return video.url;let url;
 if(/^https?:\/\//i.test(text)||/^[\w.-]+\.bilibili\.com(?:[/:?#]|$)/i.test(text)){
  try{url=new URL(/^https?:\/\//i.test(text)?text:'https://'+text);}catch{throw Error('这个网址无法打开');}
  if(url.protocol!=='https:'||url.username||url.password||url.port||!BILIBILI_HOSTS.includes(url.hostname))throw Error('这里只打开哔哩哔哩的 HTTPS 网页');
 }else{url=new URL('https://search.bilibili.com/all');url.searchParams.set('keyword',text);}
 if(url.href.length>2048)throw Error('网址或搜索词太长，请缩短后再试');return url.href;
}
export function attachBilibiliBrowser({openPanel,getSelf,send,notice}){
 const $=s=>document.querySelector(s),dialog=$('#room-dialog');
 const panel=document.createElement('section');panel.dataset.panel='bilibili';panel.hidden=true;panel.className='bili-panel';
 panel.innerHTML='<form id="bili-address-form" class="bili-toolbar"><label for="bili-address">搜索或输入哔哩哔哩网址</label><div class="bili-address-row"><input id="bili-address" maxlength="2048" autocomplete="off" spellcheck="false" placeholder="搜索视频，或粘贴 B 站网址"><button class="primary" type="submit">前往</button></div></form><nav class="bili-navigation" aria-label="哔哩哔哩网页导航"><button id="bili-home" class="secondary" type="button">首页</button><button id="bili-back" class="secondary" type="button">后退</button><button id="bili-forward" class="secondary" type="button">前进</button><button id="bili-reload" class="secondary" type="button">刷新</button><button id="bili-share" class="secondary" type="button" hidden>分享入口到放映室</button><a id="bili-external" class="secondary" target="_blank" rel="noopener noreferrer" href="https://www.bilibili.com/">在 B 站打开 ↗</a></nav><p id="bili-status" role="status"></p><div class="bili-frame-host"></div><p class="bili-help">B站的部分链接会打开新标签页。网页内操作和播放由各自控制，分享入口只同步所选网址</p>';
 dialog.append(panel);
 const input=$('#bili-address'),status=$('#bili-status'),host=panel.querySelector('.bili-frame-host');
 let frame=null,current='https://www.bilibili.com/',history=[],position=-1,shared=null,opened=false,sharePending=false;
 const button=(id,label,container)=>{const b=document.createElement('button');b.type='button';b.id=id;b.className='secondary';b.textContent=label;container.append(b);return b;};
 const cinemaEntry=button('open-bilibili','哔哩哔哩网页',$('[data-panel="cinema"]'));
 const sharedEntry=button('open-shared-web','打开房主分享的网页',$('[data-panel="cinema"]'));sharedEntry.hidden=true;
 const place=button('bilibili-place','08 哔哩哔哩 · 浏览与搜索',$('.places'));
 cinemaEntry.onclick=place.onclick=()=>open();sharedEntry.onclick=()=>openShared();
 function update(){const self=getSelf();$('#bili-back').disabled=position<=0;$('#bili-forward').disabled=position>=history.length-1;$('#bili-external').href=current;$('#bili-share').hidden=self?.room!=='cinema';$('#bili-share').disabled=sharePending||!shared?.hostId||shared.hostId!==self?.participantId;sharedEntry.hidden=!shared?.url||shared?.kind!=='web';}
 function unload(){frame?.remove();frame=null;opened=false;}
 function render(){if(panel.hidden||!dialog.open)return;unload();frame=document.createElement('iframe');frame.title='哔哩哔哩完整网页';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation');frame.setAttribute('allow','autoplay; fullscreen; encrypted-media; picture-in-picture');frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;frame.src=current;host.append(frame);opened=true;input.value=current;update();}
 function navigate(value,{remember=true}={}){current=biliAddress(value);if(remember){if(history[position]!==current){history=history.slice(0,position+1);history.push(current);if(history.length>40)history.shift();position=history.length-1;}}status.textContent='可在网页区域直接浏览，也可以用上方地址栏搜索';render();}
 function open(value){openPanel('bilibili');navigate(value||current);}
 function openShared(){if(!shared?.url||shared.kind!=='web'){notice('房主还没有分享网页入口');return;}open(shared.url);}
 $('#bili-address-form').onsubmit=e=>{e.preventDefault();try{navigate(input.value);}catch(error){status.textContent=error.message;}};
 $('#bili-home').onclick=()=>navigate('https://www.bilibili.com/');
 $('#bili-back').onclick=()=>{if(position>0){position--;navigate(history[position],{remember:false});}};
 $('#bili-forward').onclick=()=>{if(position<history.length-1){position++;navigate(history[position],{remember:false});}};
 $('#bili-reload').onclick=render;
 $('#bili-share').onclick=async()=>{if(sharePending)return;sharePending=true;update();try{const result=await send('/media',{action:'load',kind:'web',url:current});if(result)status.textContent=biliVideo(current)?'已把视频分享到放映室银幕；点击播放器播放，各自控制进度和声音':'已把这个网页入口分享给放映室；页面内操作仍由各自控制';}catch(error){status.textContent=error.message;}finally{sharePending=false;update();}};
 const observer=new MutationObserver(()=>{if(panel.hidden||!dialog.open)unload();});observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
 dialog.addEventListener('close',unload);
 return{open,openShared,apply(movie){shared=movie?.kind==='web'?movie:null;if(!shared&&getSelf()?.room==='cinema')shared=movie||null;update();},clearShared(){shared=null;update();},isOpen:()=>opened&&!panel.hidden&&dialog.open,getStats:()=>({open:opened&&!panel.hidden&&dialog.open,url:opened?current:null,sharedKind:shared?.kind||null,entryHistory:history.length}),dispose(){observer.disconnect();dialog.removeEventListener('close',unload);unload();}};
}
