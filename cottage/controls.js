const definitions=[
 ['forward','向前走',['KeyW','ArrowUp']],['backward','向后走',['KeyS','ArrowDown']],
 ['left','向左走',['KeyA','ArrowLeft']],['right','向右走',['KeyD','ArrowRight']],
 ['run','加快走动',['ShiftLeft','ShiftRight']],['interact','物品、房门与电梯互动',['KeyE']],
 ['companion','呼唤云伴',['KeyR']],['jump','跳跃（按住连跳）',['Space']],['wave','打招呼',['KeyH']],
 ['stand','起身',['KeyX']],['drop','放回物品',['KeyG']],
 ['freeLook','自由观察（按住）',['MouseRight','KeyF']],['inventory','打开背包',['KeyB']],
 ['view1','第一人称',['Digit1','Numpad1']],['view2','第二人称',['Digit2','Numpad2']],['view3','第三人称',['Digit3','Numpad3']]
];
const storageKey='boyi-cottage-keys-v1';
const names={MouseRight:'鼠标右键',Space:'空格',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',ShiftLeft:'左 Shift',ShiftRight:'右 Shift',Enter:'Enter',Backspace:'退格',Delete:'Delete',Insert:'Insert',Home:'Home',End:'End',PageUp:'Page Up',PageDown:'Page Down',Comma:',',Period:'.',Slash:'/',Semicolon:';',Quote:"'",BracketLeft:'[',BracketRight:']',Backslash:'\\',Minus:'-',Equal:'=',Backquote:'`',NumpadAdd:'数字键盘 +',NumpadSubtract:'数字键盘 -',NumpadMultiply:'数字键盘 ×',NumpadDivide:'数字键盘 /',NumpadDecimal:'数字键盘 .',NumpadEnter:'数字键盘 Enter'};
export function keyName(code){return names[code]||(/^Key[A-Z]$/.test(code)?code.slice(3):/^Digit[0-9]$/.test(code)?code.slice(5):/^Numpad[0-9]$/.test(code)?'数字键盘 '+code.slice(6):code);}
function allowed(code){return /^Key[A-Z]$/.test(code)||/^Digit[0-9]$/.test(code)||/^Numpad[0-9]$/.test(code)||Object.hasOwn(names,code);}
function defaults(){return Object.fromEntries(definitions.map(([id,,codes])=>[id,[...codes]]));}
// Migrate existing v1 bindings without replacing a user's custom keys.
function restore(value){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).some(id=>!definitions.some(row=>row[0]===id)))return null;
 const used=new Set(),result={};
 for(const[id]of definitions){if(!Object.hasOwn(value,id)){if(!['freeLook','inventory'].includes(id))return null;continue;}const codes=value[id];if(!Array.isArray(codes)||codes.length>2)return null;for(const code of codes){if(typeof code!=='string'||!allowed(code)||used.has(code))return null;used.add(code);}result[id]=[...codes];}
 for(const[id,,codes]of definitions)if(!Object.hasOwn(result,id)){result[id]=codes.filter(code=>!used.has(code));result[id].forEach(code=>used.add(code));}
 return result;
}
export function createKeyBindings({container,status,reset,onChange=()=>{}}){
 let bindings=defaults(),capture=null,suppressContextUntil=0,captureContextTarget=null;
 try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved?.version===1){const restored=restore(saved.bindings);if(restored)bindings=restored;}}catch{}
 const message=text=>{status.textContent=text;};
 function persist(){try{localStorage.setItem(storageKey,JSON.stringify({version:1,bindings}));return true;}catch{message('本次设置已生效；浏览器未允许保存，下次进入会恢复默认');return false;}}
 function changed(text){const saved=persist();render();onChange();if(saved)message(text);}
 function cancel(){if(!capture)return false;capture=null;render();message('已取消改键');return true;}
 function render(){container.replaceChildren();for(const[id,title]of definitions){const row=document.createElement('div');row.className='key-binding-row';row.dataset.binding=id;const name=document.createElement('strong');name.textContent=title;const slots=document.createElement('div');slots.className='key-binding-slots';for(let slot=0;slot<2;slot++){const group=document.createElement('span');group.className='key-binding-slot';const button=document.createElement('button');button.type='button';button.className='key-bind';button.dataset.action=id;button.dataset.slot=String(slot);const current=bindings[id][slot],waiting=capture?.id===id&&capture.slot===slot;button.textContent=waiting?'请按键或右键…':current?keyName(current):'未设置';button.setAttribute('aria-label',title+'，按键 '+(slot+1)+'，'+(current?keyName(current):'未设置')+'，点击修改');button.setAttribute('aria-pressed',String(waiting));button.onclick=()=>{capture={id,slot};render();container.querySelector(`[data-action="${id}"][data-slot="${slot}"]`).focus();message('按一个键或鼠标右键设置；Esc 取消。每个键只能用于一个操作');};const clear=document.createElement('button');clear.type='button';clear.className='key-clear';clear.textContent='清除';clear.disabled=!current;clear.setAttribute('aria-label','清除'+title+'的按键 '+(slot+1));clear.onclick=()=>{capture=null;bindings[id].splice(slot,1);changed(title+'的按键已清除');};group.append(button,clear);slots.append(group);}row.append(name,slots);container.append(row);}}
 function handleCapture(event){if(!capture)return;event.preventDefault();event.stopImmediatePropagation();if(event.code==='Escape'){cancel();return;}if(event.repeat)return;if(event.ctrlKey||event.altKey||event.metaKey||!allowed(event.code)){message('这个按键保留给浏览器或页面操作，请换一个单键；Esc 取消');return;}const owner=definitions.find(([id])=>id!==capture.id&&bindings[id].includes(event.code));if(owner){message(keyName(event.code)+' 已用于“'+owner[1]+'”，请先清除该处，或换一个键');return;}const{id,slot}=capture,other=bindings[id].indexOf(event.code);if(other>=0&&other!==slot){message('这个操作已经设置了 '+keyName(event.code)+'，请选择另一个键');return;}bindings[id][slot]=event.code;bindings[id]=bindings[id].filter(Boolean);capture=null;changed(definitions.find(row=>row[0]===id)[1]+'已设为 '+keyName(event.code));container.querySelector(`[data-action="${id}"][data-slot="${Math.min(slot,bindings[id].length-1)}"]`)?.focus();}
 window.addEventListener('keydown',handleCapture,true);
 window.addEventListener('pointerdown',event=>{if(!capture||event.button!==2)return;suppressContextUntil=performance.now()+800;captureContextTarget=event.target;handleCapture({code:'MouseRight',preventDefault:()=>event.preventDefault(),stopImmediatePropagation:()=>event.stopImmediatePropagation()});},true);
 window.addEventListener('contextmenu',event=>{if(capture||(event.target===captureContextTarget&&performance.now()<suppressContextUntil))event.preventDefault();},true);
 reset.onclick=()=>{capture=null;bindings=defaults();changed('全部键位已恢复默认');reset.focus();};
 render();
 return{actionFor:code=>definitions.find(([id])=>bindings[id].includes(code))?.[0]||null,isHeld:(action,keys)=>bindings[action]?.some(code=>keys.has(code))||false,label:(action,separator=' / ')=>bindings[action]?.map(keyName).join(separator)||'未设置',cancelCapture:cancel,isCapturing:()=>!!capture,snapshot:()=>Object.fromEntries(definitions.map(([id])=>[id,[...bindings[id]]]))};
}
