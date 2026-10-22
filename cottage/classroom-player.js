// The rendering bundle is deliberately loaded only after entering the classroom.
let rendererPromise;
const renderer=()=>rendererPromise||(rendererPromise=import('../vendor/pptx-renderer.js?v=ef8562bc841b').catch(error=>{rendererPromise=null;throw error;}));
export function createClassroomPlayer({THREE,getSocial,getWorld,openPanel=()=>{},notice=()=>{}}){
 const $=id=>document.getElementById(id),panel=document.querySelector('[data-panel="classroom"]'),listeners=[];
 let disposed=false,meta=null,deckId=null,viewer=null,offscreen=null,texture=null,attachedWorld=null,loadTask=null,renderTask=null,renderAbort=null,loadAbort=null,uploadAbort=null,deckEpoch=0,renderEpoch=0,uploadEpoch=0,renderedPage=0,failedDeck=null,uploading=false,commanding=false,pendingCommand=null,commandEpoch=0,projection=null,cancelUpload=null;
 const stats={downloads:0,parses:0,renders:0,texturesCreated:0,texturesDisposed:0,viewersCreated:0,viewersDisposed:0,staleResults:0,lastError:null,uploadStage:null,uploadBytes:0,uploadTotal:0,controlTimeouts:0};
 function self(){return getSocial()?.getSelf?.();}function present(){return!disposed&&self()?.room==='classroom';}function host(){return present()&&meta?.hostId===self()?.participantId;}
 function status(text){if($('classroom-status'))$('classroom-status').textContent=text;}
 function ui(){
  const active=present(),isHost=host(),count=meta?.pageCount||0,p=meta?.page||0;
  if($('classroom-page'))$('classroom-page').textContent=count?`${p} / ${count}`:'尚未分享课件';
  if($('classroom-presenter')){const people=[self(),...(getSocial()?.getOccupants?.()||[])],person=people.find(p=>p?.participantId===meta?.hostId);$('classroom-presenter').textContent=meta?.hostId?`讲者：${person?.nickname||person?.name||'同屋学员'}${isHost?'（你）':''}`:'讲台空闲，可认领';}
  const busy=uploading||commanding;for(const[id,disabled]of [['classroom-claim',!active||!!meta?.hostId||busy],['classroom-file',!isHost||busy],['classroom-prev',!isHost||busy||!count||p<=1],['classroom-next',!isHost||busy||!count||p>=count],['classroom-stop',!isHost||busy||!count]])if($(id))$(id).disabled=disabled;if(cancelUpload)cancelUpload.hidden=!uploading;
 }
 function dropTexture(){if(attachedWorld){attachedWorld.setPresentationTexture(null);attachedWorld=null;}if(texture){texture.dispose();stats.texturesDisposed++;texture=null;}projection?.replaceChildren();}
 function attachTexture(){const world=getWorld?.('classroom');if(texture&&world&&attachedWorld!==world){attachedWorld?.setPresentationTexture(null);world.setPresentationTexture(texture);attachedWorld=world;}}
 function dropViewer(){if(viewer){viewer.destroy();stats.viewersDisposed++;viewer=null;}offscreen?.remove();offscreen=null;}
 function cancelCommand(){const job=pendingCommand;pendingCommand=null;commanding=false;commandEpoch++;job?.controller.abort(new DOMException('课件状态已更新','AbortError'));}
 function resetLocal(){cancelCommand();deckEpoch++;renderEpoch++;uploadEpoch++;uploading=false;renderAbort?.abort();loadAbort?.abort();uploadAbort?.abort();renderAbort=loadAbort=uploadAbort=null;loadTask=null;renderTask=null;dropTexture();dropViewer();deckId=null;renderedPage=0;failedDeck=null;stats.uploadStage=null;}
 function clear(){if(disposed)return;resetLocal();meta=null;uploading=false;commanding=false;ui();status('进入教室后可查看或分享课件');}
 function errorMessage(error){return typeof error?.message==='string'&&/[\u3400-\u9fff]/.test(error.message)?error.message:'这份课件暂时无法解析，请用 PowerPoint 另存为普通 PPTX 后重试';}
 function makeOffscreen(){const node=document.createElement('div');node.dataset.classroomOffscreen='true';node.setAttribute('aria-hidden','true');node.inert=true;node.style.cssText='position:fixed;left:-20000px;top:0;pointer-events:none;contain:layout style paint;background:white;';document.body.append(node);return node;}
 function timed(task,controller,ms,message,cleanupLate){const guarded=Promise.resolve(task).then(value=>{if(controller.signal.aborted){cleanupLate?.(value);throw controller.signal.reason||new DOMException('课件操作已取消','AbortError');}return value;});let timer,cancel;const deadline=new Promise((_,reject)=>{cancel=()=>reject(controller.signal.reason||new DOMException('课件操作已取消','AbortError'));controller.signal.addEventListener('abort',cancel,{once:true});if(controller.signal.aborted)return cancel();timer=setTimeout(()=>controller.abort(Error(message)),ms);});return Promise.race([guarded,deadline]).finally(()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',cancel);});}
 async function showPage(){
  if(!viewer||!present()||!meta||meta.deckId!==deckId)return;
  const p=meta.page;if(renderedPage===p){attachTexture();return;}if(renderTask?.page===p)return renderTask.promise;
  const localViewer=viewer,localContainer=offscreen,currentDeck=deckId,epoch=deckEpoch,revision=++renderEpoch;
  renderAbort?.abort();const controller=new AbortController();renderAbort=controller;
  const job={page:p,promise:null};renderTask=job;status(`正在显示第 ${p} 页…`);
  // Serialize rendering so a late chart/image cannot collide with the next page's DOM.
  const predecessor=renderTaskPrevious;const operation=(async()=>{await predecessor?.catch(()=>{});if(!present()||epoch!==deckEpoch||revision!==renderEpoch)return;
   const api=await timed(renderer(),controller,60000,'课件组件下载超时，请重新读取投影'),canvas=await timed(api.renderPage(localViewer,p-1,localContainer,{signal:controller.signal}),controller,45000,'这一页渲染超时，请重试或切换页面',late=>{late.width=late.height=1;stats.staleResults++;});stats.renders++;
   if(!present()||epoch!==deckEpoch||revision!==renderEpoch||meta?.deckId!==currentDeck||meta?.page!==p){stats.staleResults++;canvas.width=canvas.height=1;return;}
   const next=new THREE.CanvasTexture(canvas);next.colorSpace=THREE.SRGBColorSpace;next.generateMipmaps=false;next.minFilter=THREE.LinearFilter;next.magFilter=THREE.LinearFilter;next.needsUpdate=true;stats.texturesCreated++;
   dropTexture();texture=next;renderedPage=p;canvas.style.cssText='display:block;width:100%;height:auto;max-height:70vh;object-fit:contain;';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${meta.title} 第${p}页`);if(projection)projection.replaceChildren(canvas);attachTexture();status(`${meta.title} · 第 ${p} / ${meta.pageCount} 页`);
  })().catch(error=>{if(present()&&epoch===deckEpoch&&revision===renderEpoch&&error?.name!=='AbortError'){stats.lastError=errorMessage(error);status(stats.lastError);notice(stats.lastError);}}).finally(()=>{if(renderTask===job)renderTask=null;if(renderAbort===controller)renderAbort=null;});
  job.promise=operation;renderTaskPrevious=operation;return operation;
 }
 let renderTaskPrevious=Promise.resolve();
 async function loadDeck(){
  if(!present()||!meta?.deckId||loadTask||failedDeck===meta.deckId)return;
  const target=meta.deckId,epoch=deckEpoch;deckId=target;const job={deckId:target},controller=new AbortController();loadAbort=controller;loadTask=job;status('正在读取共享课件…');
  try{stats.downloads++;const file=await getSocial().fetchPresentationFile(target,{signal:controller.signal,onProgress:({loaded,total})=>{if(epoch===deckEpoch)status(total?`正在读取共享课件 ${Math.min(100,Math.floor(loaded/total*100))}%`:`正在读取共享课件 ${(loaded/1048576).toFixed(1)}MB`);}});if(!file||!present()||epoch!==deckEpoch||meta?.deckId!==target){stats.staleResults++;return;}
   if(file.deckId!==target)throw Error('共享课件已变化，请重试');status('正在解析课件…');const api=await timed(renderer(),controller,60000,'课件组件下载超时，请重新读取投影');if(!present()||epoch!==deckEpoch)return;
   const container=makeOffscreen();let parsed;try{parsed=await timed(api.openDeck(file.buffer,container,{signal:controller.signal}),controller,90000,'课件解析超时，请重新读取投影',late=>{late.destroy();});stats.parses++;stats.viewersCreated++;}catch(error){container.remove();throw error;}
   if(!present()||epoch!==deckEpoch||meta?.deckId!==target){parsed.destroy();stats.viewersDisposed++;container.remove();stats.staleResults++;return;}
   if(parsed.slideCount!==meta.pageCount){parsed.destroy();stats.viewersDisposed++;container.remove();throw Error('共享课件的页数不一致');}
   viewer=parsed;offscreen=container;await showPage();
  }catch(error){if(present()&&epoch===deckEpoch){failedDeck=target;stats.lastError=errorMessage(error);status(stats.lastError);notice(stats.lastError);}}
  finally{if(loadTask===job)loadTask=null;if(loadAbort===controller)loadAbort=null;}
 }
 function apply(presentation){
  if(!present()){clear();return;}
  const next=presentation||{hostId:null,title:'',deckId:null,page:0,pageCount:0,revision:0};
  if(meta&&Number.isFinite(next.revision)&&next.revision<meta.revision)return;
  if(pendingCommand&&next.revision>pendingCommand.revision){const body=pendingCommand.body,confirmed=body.action==='claim'?next.hostId===self()?.participantId:body.action==='page'?next.deckId===body.deckId&&next.page===body.page:body.action==='stop'?!next.deckId:false;if(confirmed)cancelCommand();}
  if(next.deckId!==meta?.deckId){resetLocal();meta={...next};stats.lastError=null;}else meta={...next};ui();
  if(uploading)return;if(!meta.deckId){status('可认领讲台并分享 PPTX；课件仅在本次教室中临时保留');return;}
  if(viewer)void showPage();else void loadDeck();
 }
 async function command(body){if(!present()||commanding)return;const controller=new AbortController(),job={body,controller,id:++commandEpoch,revision:meta?.revision||0},epoch=deckEpoch;pendingCommand=job;commanding=true;ui();try{const result=await timed(getSocial().send('/presentation',body,{signal:controller.signal}),controller,10000,'课件控制响应超时，可重新操作；画面以当前教室状态为准');if(result&&present()&&pendingCommand===job&&job.id===commandEpoch)apply(result.presentation);}catch(error){if(present()&&epoch===deckEpoch&&pendingCommand===job&&job.id===commandEpoch){if(controller.signal.aborted&&error?.name!=='AbortError')stats.controlTimeouts++;status(errorMessage(error));notice(errorMessage(error));}}finally{if(pendingCommand===job){pendingCommand=null;commanding=false;ui();}}}
 async function upload(file){
  if(!file||!host()||uploading)return;
  if(!/\.pptx$/i.test(file.name)||file.size<22){notice('请选择 PPTX 文件；旧版 PPT 请先另存为 PPTX');return;}
  uploading=true;const epoch=++uploadEpoch,participant=self().participantId,controller=new AbortController();uploadAbort=controller;stats.lastError=null;stats.uploadStage='upload';stats.uploadBytes=0;stats.uploadTotal=file.size;ui();status('正在上传课件 0%');
  const current=()=>present()&&epoch===uploadEpoch&&self()?.participantId===participant&&host();
  try{const result=await getSocial().uploadPresentation(file,{signal:controller.signal,onProgress:({phase,loaded,total})=>{if(!current())return;stats.uploadStage=phase;stats.uploadBytes=loaded;stats.uploadTotal=total;status(phase==='validate'?'上传完成，正在校验课件…':`正在上传课件 ${Math.min(100,Math.floor(loaded/Math.max(1,total)*100))}% · ${(loaded/1048576).toFixed(1)} / ${(total/1048576).toFixed(1)}MB`);}});if(result&&current()){uploading=false;apply(result.presentation);}
  }catch(error){if(current()){if(error?.name==='AbortError'){stats.uploadStage='cancelled';status('已取消本次上传');}else{stats.uploadStage='failed';stats.lastError=errorMessage(error);status(stats.lastError);notice(stats.lastError);}}}
  finally{if(uploadAbort===controller)uploadAbort=null;if(epoch===uploadEpoch){uploading=false;ui();}}
 }
 function bind(id,event,callback){const node=$(id);if(node){node.addEventListener(event,callback);listeners.push(()=>node.removeEventListener(event,callback));}}
 bind('classroom-claim','click',()=>void command({action:'claim'}));bind('classroom-prev','click',()=>{if(host()&&meta.page>1)void command({action:'page',deckId:meta.deckId,page:meta.page-1});});bind('classroom-next','click',()=>{if(host()&&meta.page<meta.pageCount)void command({action:'page',deckId:meta.deckId,page:meta.page+1});});bind('classroom-stop','click',()=>void command({action:'stop',deckId:meta?.deckId}));bind('classroom-file','change',event=>{const file=event.target.files?.[0];event.target.value='';void upload(file);});
 if(panel){cancelUpload=document.createElement('button');cancelUpload.id='classroom-cancel-upload';cancelUpload.type='button';cancelUpload.textContent='取消上传';cancelUpload.hidden=true;cancelUpload.addEventListener('click',()=>uploadAbort?.abort());(panel.querySelector('.classroom-actions')||panel).append(cancelUpload);listeners.push(()=>cancelUpload.remove());projection=$('classroom-projection');const ownsProjection=!projection;if(!projection){projection=document.createElement('div');projection.id='classroom-projection';panel.append(projection);}const hint=document.createElement('p');hint.textContent='静态投影：字体、动画和复杂图表的显示可能与 PowerPoint 不同；课件中的链接与音视频不会打开。';hint.dataset.classroomHint='true';panel.append(hint);const retry=document.createElement('button');retry.type='button';retry.textContent='重新读取投影';retry.addEventListener('click',()=>{if(present()&&meta?.deckId){failedDeck=null;if(viewer)void showPage();else void loadDeck();}openPanel('classroom');});panel.append(retry);listeners.push(()=>{retry.remove();hint.remove();if(ownsProjection)projection.remove();else projection.replaceChildren();});}
 ui();
 return{apply,clear,dispose(){if(disposed)return;clear();disposed=true;for(const remove of listeners)remove();},getStats:()=>({...stats,disposed,deckId,renderedPage,loading:!!loadTask,rendering:!!renderTask,uploading,commanding,commandAction:pendingCommand?.body.action||null,viewer:!!viewer,texture:!!texture,attached:!!attachedWorld,pageCount:viewer?.slideCount||0,externalMedia:'block',cachedDecks:viewer?1:0})};
}
