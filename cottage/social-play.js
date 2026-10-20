export function attachSocialPlay({getSocial,notice,openPanel,onCameraShake}){
 const dialog=document.querySelector('#room-dialog'),chat=dialog?.querySelector('[data-panel="chat"]'),tools=document.querySelector('#room-hud .social-tools')||document.querySelector('.room-header');
 let target=null,busy=false,disconnected=false,disposed=false,serverOffset=0,generation=0;const seen=new Set();
 function element(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;}
 const button=element('button','背包');button.type='button';button.id='open-inventory';button.setAttribute('aria-label','打开背包，B键');tools?.append(button);
 const panel=element('section');panel.dataset.panel='inventory';panel.hidden=true;
 panel.append(element('p','每个人都有一根胡萝卜。带在手里，和走近的同伴轻轻玩一下。'));
 const card=element('div',null,'inventory-card'),carrot=element('span','🥕');carrot.setAttribute('aria-hidden','true');
 const item=element('div');item.append(element('h3','胡萝卜'),element('p','随身道具 · 可重复使用'));
 const equip=element('button','装备胡萝卜','primary');equip.type='button';equip.id='equip-carrot';
 const inventoryStatus=element('p');inventoryStatus.id='inventory-status';inventoryStatus.setAttribute('role','status');card.append(carrot,item,equip);panel.append(card,inventoryStatus);dialog?.append(panel);
 const actions=element('div',null,'social-play-actions voice-actions'),pet=element('button','摸摸头','secondary'),bonk=element('button','胡萝卜敲一下','secondary'),backpack=element('button','打开背包','secondary');
 for(const node of [pet,bonk,backpack])node.type='button';pet.id='pet-target';bonk.id='bonk-target';backpack.id='chat-open-inventory';
 const interactionStatus=element('p');interactionStatus.id='interaction-status';interactionStatus.setAttribute('role','status');
 actions.append(pet,bonk,backpack);chat?.insertBefore(actions,chat.querySelector('#chat-messages'));chat?.insertBefore(interactionStatus,chat.querySelector('#chat-messages'));
 function context(){const social=getSocial?.(),self=social?.getSelf?.(),other=target&&social?.getOccupants?.().find(p=>p.participantId===target.participantId&&p.room===self?.room);return{social,self,other,connected:!!self&&!disconnected};}
 function render(){
  if(disposed)return;const {self,other,connected}=context(),equipped=self?.equippedItemId==='carrot',distance=other&&self?Math.hypot(other.x-self.x,other.z-self.z):Infinity;
  button.disabled=!connected;equip.disabled=!connected||busy||!!self?.heldItemId;equip.textContent=equipped?'收回背包':'装备胡萝卜';equip.setAttribute('aria-pressed',String(equipped));
  inventoryStatus.textContent=!connected?'连接会客空间后，就能打开自己的背包。':self.heldItemId?'先放回手里的书本或茶杯，再装备胡萝卜。':equipped?'胡萝卜拿在手里了。走近同伴，点对方打开互动。':'胡萝卜在背包里。';
  pet.disabled=!connected||!other||busy||distance>2.2;bonk.disabled=!connected||!other||busy||!equipped||distance>2.6;backpack.hidden=equipped;backpack.disabled=!connected||busy;
  if(!other)interactionStatus.textContent='选择同一空间里的一位同伴，就能互动。';else if(distance>2.6)interactionStatus.textContent='走近'+other.nickname+'一点，再互动。';else if(!equipped)interactionStatus.textContent='可以摸摸头；装备胡萝卜后，还能轻轻敲一下。';else interactionStatus.textContent='轻轻玩一下，动作之间稍停片刻。';
 }
 function clearTarget(){target=null;generation++;render();}
 function chooseTarget(event){const detail=event.detail;if(!detail||typeof detail.participantId!=='string')return;target={participantId:detail.participantId,nickname:String(detail.nickname||'同伴')};generation++;render();}
 function openInventory(){if(disposed)return;render();openPanel?.('inventory');}
 async function equipCarrot(){const {social,self,connected}=context();if(!connected||busy)return;busy=true;render();try{await social.action(self.equippedItemId==='carrot'?'unequipCarrot':'equipCarrot');}catch(error){notice?.(error.message||'道具暂时未能取出，请重试');}finally{busy=false;render();}}
 async function interact(kind){const {social,other,connected}=context();if(!connected||!other||busy)return;const epoch=generation,id=other.participantId;busy=true;render();try{const ok=await social.action(kind,id);if(ok&&epoch===generation)notice?.(kind==='pet'?'摸了摸'+other.nickname+'的头':'用胡萝卜轻轻敲了'+other.nickname+'一下');}catch(error){if(epoch===generation)notice?.(error.message||'这次互动没有连上，请重试');}finally{busy=false;render();}}
 function apply(data={}){if(data.disconnected){disconnected=true;seen.clear();clearTarget();return;}if(data.self){disconnected=false;if(target&&!data.occupants?.some(p=>p.participantId===target.participantId&&p.room===data.self.room)&&Array.isArray(data.occupants))clearTarget();}if(Number.isFinite(data.serverTime))serverOffset=data.serverTime-Date.now();render();}
 function onInteraction(event){
  const {self,connected}=context();if(!connected||disposed||!event||event.type!=='interaction'||!['pet','bonk'].includes(event.kind)||event.room!==self.room||typeof event.id!=='string'||seen.has(event.id)||!Number.isFinite(event.expiresAt)||event.expiresAt<=Date.now()+serverOffset)return;
  seen.add(event.id);while(seen.size>128)seen.delete(seen.values().next().value);
  if(event.toId===self.participantId){notice?.(String(event.fromName||'同伴')+(event.kind==='pet'?'摸了摸你的头':'用胡萝卜轻轻敲了你一下'));if(event.kind==='bonk'&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)onCameraShake?.(Math.max(0,Math.min(180,Number(event.cameraShakeMs)||180)));}
 }
 button.addEventListener('click',openInventory);backpack.addEventListener('click',openInventory);equip.addEventListener('click',equipCarrot);pet.addEventListener('click',()=>interact('pet'));bonk.addEventListener('click',()=>interact('bonk'));
 document.addEventListener('boyi:chat-target',chooseTarget);document.addEventListener('boyi:chat-clear',clearTarget);dialog?.addEventListener('close',clearTarget);render();
 return{apply,onInteraction,openInventory,dispose(){disposed=true;generation++;document.removeEventListener('boyi:chat-target',chooseTarget);document.removeEventListener('boyi:chat-clear',clearTarget);dialog?.removeEventListener('close',clearTarget);button.remove();panel.remove();actions.remove();interactionStatus.remove();seen.clear();target=null;}};
}
