const root=new URL('.',import.meta.url),version='2026-10-21.1';
let knowledgePromise;
const normal=s=>s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}]/gu,'');
async function knowledge(){return knowledgePromise??=fetch(new URL('guide-knowledge.json?v='+version,root)).then(r=>{if(!r.ok)throw Error('知识资料暂时无法加载');return r.json();}).catch(e=>{knowledgePromise=null;throw e;});}
export async function requestGuide(question,{signal,onProgress=()=>{}}={}){
 if(typeof question!=='string'||!question.trim()||question.length>800)throw Error('请输入800字以内的问题');
 question=question.trim();signal?.throwIfAborted();
 try{const data=await knowledge();signal?.throwIfAborted();const q=normal(question),item=data.quick.find(e=>e.questions.some(a=>normal(a)===q));if(item){onProgress('已找到对应资料');return {...item,mode:'verified-quick',knowledgeVersion:data.version};}}catch(e){if(signal?.aborted)throw e;}
 onProgress('正在查阅相关资料并整理回答');
 const target=new URL('/boyi-members/api/cottage/guide',location.protocol==='https:'&&location.hostname!=='veritas123-s.github.io'?location.origin:'https://122.51.44.155');
 if(location.hostname==='127.0.0.1'||location.hostname==='localhost')target.href=new URL('/boyi-members/api/cottage/guide',location.origin).href;
 const response=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal});
 if(response.status===204)return {suppressed:true};
 const data=await response.json();if(!response.ok||typeof data.answer!=='string')throw Error(data.error||'这次没有收到回答，请稍后重试');return data;
}
export function safeGuideSource(source){
 try{const u=new URL(source.url,root);if(u.protocol!=='https:'&&u.origin!==location.origin)return null;
 if(u.origin===root.origin&&u.pathname.startsWith(root.pathname)||u.origin==='https://veritas123-s.github.io'&&/^\/(Boyi_SHSMU|Boyi_Wantedly_Preview)\//.test(u.pathname)||u.origin==='https://122.51.44.155'&&u.pathname.startsWith('/boyi-preview/'))return u;
 }catch{}return null;
}
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function boot(){
 const home=location.pathname===root.pathname||location.pathname===root.pathname+'index.html';if(home||document.querySelector('#boyi-guide-widget'))return;
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('portal-guide.css?v='+version,root);document.head.append(css);
 const host=node('aside',undefined,'guide-widget');host.id='boyi-guide-widget';host.setAttribute('aria-label','博医云伴');
 const launcher=node('button',undefined,'guide-launcher');launcher.type='button';launcher.setAttribute('aria-label','打开博医云伴');launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','boyi-guide-panel');
 const icon=node('img');icon.src=new URL('media/brand/boyi-cloud-companion.png',root);icon.alt='';icon.width=44;icon.height=52;launcher.append(icon,node('span','博医云伴'));
 const panel=node('section',undefined,'guide-panel');panel.id='boyi-guide-panel';panel.hidden=true;panel.setAttribute('aria-label','与博医云伴对话');
 const head=node('header'),art=node('div',undefined,'guide-art'),canvas=node('canvas');canvas.setAttribute('aria-hidden','true');const fallback=icon.cloneNode();art.append(canvas,fallback);
 const heading=node('div');heading.append(node('h2','博医云伴'),node('p','想了解什么，尽管问我'));
 const close=node('button','收起','guide-close');close.type='button';close.setAttribute('aria-label','收起博医云伴');head.append(art,heading,close);
 const output=node('div',undefined,'guide-output');output.setAttribute('role','log');output.setAttribute('aria-live','polite');output.setAttribute('aria-relevant','additions');
 const welcome=node('p','你好，我是博医云伴。可以问我博医计划、活动，或网站怎么用。','guide-message guide-assistant');output.append(welcome);
 const prompts=node('div',undefined,'guide-prompts');for(const text of ['博医计划是什么','怎么进入博医小屋']){const b=node('button',text);b.type='button';b.addEventListener('click',()=>{input.value=text;input.focus();});prompts.append(b);}
 const form=node('form'),label=node('label','你的问题'),input=node('textarea');input.id='boyi-guide-question';label.htmlFor=input.id;input.rows=2;input.maxLength=800;input.required=true;input.placeholder='从一个想了解的问题开始';
 const controls=node('div',undefined,'guide-form-controls'),send=node('button','发送'),cancel=node('button','取消');send.type='submit';cancel.type='button';cancel.hidden=true;controls.append(cancel,send);form.append(label,input,controls);
 const status=node('p','','guide-status');status.setAttribute('role','status');panel.append(head,output,prompts,form,status);host.append(launcher,panel);document.body.append(host);
 let model,modelPending,controller,keepAnswer;
 async function gesture(action,busy=false){try{if(!model&&!modelPending){modelPending=import(new URL('portal-companion-3d.js?v=64a8514ffed1',root)).then(api=>{model=api.createBoyiModel(canvas,{onError:()=>{canvas.hidden=true;fallback.hidden=false;}});if(model.getStats().ready){fallback.hidden=true;canvas.hidden=false;}return model;});}const m=model||await modelPending;m?.setPaused(panel.hidden||document.hidden);m?.play(action,{busy,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches});}catch{canvas.hidden=true;fallback.hidden=false;}}
 function show(open){panel.hidden=!open;launcher.hidden=open;launcher.setAttribute('aria-expanded',String(open));model?.setPaused(!open||document.hidden);if(open){document.exitPointerLock?.();gesture(controller?'think':'wave',!!controller);input.focus({preventScroll:true});}else launcher.focus({preventScroll:true});}
 launcher.addEventListener('click',()=>show(true));close.addEventListener('click',()=>show(false));cancel.addEventListener('click',()=>controller?.abort());
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();show(false);}});document.addEventListener('visibilitychange',()=>model?.setPaused(panel.hidden||document.hidden));addEventListener('pagehide',event=>{controller?.abort();model?.setPaused(true);if(!event.persisted){model?.dispose();model=null;modelPending=null;}});addEventListener('pageshow',()=>model?.setPaused(panel.hidden||document.hidden));
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(controller||!form.reportValidity())return;const q=input.value.trim();if(!q)return;
  output.append(node('p',q,'guide-message guide-user'));input.value='';send.disabled=true;cancel.hidden=false;form.setAttribute('aria-busy','true');status.textContent='正在查阅资料';gesture('think',true);
  const own=new AbortController();controller=own;const timer=setTimeout(()=>own.abort(),40000);
  try{const data=await requestGuide(q,{signal:own.signal,onProgress:text=>status.textContent=text});own.signal.throwIfAborted();
   if(data.suppressed){status.textContent='可以换一个问题继续聊';return;}
   const item=node('div',undefined,'guide-message guide-assistant');item.append(node('p',data.answer));const links=node('ul');for(const source of data.sources||[]){const u=safeGuideSource(source);if(!u)continue;const li=node('li'),a=node('a','['+source.number+'] '+source.title);a.href=u.href;li.append(a);links.append(li);}if(links.children.length)item.append(links);output.append(item);keepAnswer=item;status.textContent='';gesture('nod');
  }catch(error){status.textContent=own.signal.aborted?'已停止等待，可以重新提问':error.message;gesture('listen');}
  finally{clearTimeout(timer);controller=null;send.disabled=false;cancel.hidden=true;form.removeAttribute('aria-busy');output.scrollTop=output.scrollHeight;}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
