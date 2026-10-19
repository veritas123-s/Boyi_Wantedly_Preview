(() => {
'use strict';
const script=document.currentScript;
const site=script&&script.src?new URL('.',script.src):null;
let generatedId=0;
function node(tag,text,className){const result=document.createElement(tag);if(text!==undefined)result.textContent=text;if(className)result.className=className;return result;}
function uniqueId(prefix){let id;do{id=prefix+'-'+(++generatedId);}while(document.getElementById(id));return id;}
function ensureId(element,prefix){if(!element.id)element.id=uniqueId(prefix);return element.id;}
function visible(element,root){if(!element||!root.contains(element))return false;for(let current=element;current;current=current.parentElement){if(current.hidden)return false;const style=getComputedStyle(current);if(style.display==='none'||style.visibility==='hidden')return false;if(current===root)break;}return true;}
function enhancePasswords(root){
 const passwords=[...root.querySelectorAll('input[type=password]')];
 function wrap(input){
  if(input.parentElement.classList.contains('portal-password-wrap'))return;
  const wrapper=node('span',undefined,'portal-password-wrap'),button=node('button','显示','portal-password-toggle');
  const id=ensureId(input,'portal-password');
  button.type='button';button.setAttribute('aria-controls',id);button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','显示密码');button.style.minWidth='44px';button.style.minHeight='44px';
  input.before(wrapper);wrapper.append(input,button);
  button.addEventListener('click',event=>{event.preventDefault();const shown=input.type==='password';input.type=shown?'text':'password';button.textContent=shown?'隐藏':'显示';button.setAttribute('aria-pressed',String(shown));button.setAttribute('aria-label',shown?'隐藏密码':'显示密码');});
 }
 passwords.forEach(wrap);
 const resetVisibility=()=>{for(const input of passwords){input.type='password';const button=input.parentElement.querySelector('.portal-password-toggle');if(button){button.textContent='显示';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','显示密码');}}};
 for(const [formId,passwordName] of [['register-form','password'],['recover-form','password'],['member-password-form','newPassword']]){
  const form=document.getElementById(formId);if(!form)continue;
  const original=form.elements.namedItem(passwordName);if(!(original instanceof HTMLInputElement))continue;
  const field=node('label',undefined,'member-field portal-password-confirm'),confirm=node('input');
  confirm.id=uniqueId('portal-password-confirm');confirm.type='password';confirm.required=true;confirm.autocomplete='new-password';
  const label=node('span',formId==='member-password-form'?'再次输入新密码':'再次输入密码');
  field.append(label,confirm);
  const anchor=original.closest('label')||original.parentElement;anchor.after(field);wrap(confirm);passwords.push(confirm);
  function validate(){const disabled=confirm.matches(':disabled');const mismatch=!disabled&&confirm.value!==original.value;confirm.setCustomValidity(mismatch?'两次输入的密码不一致，请重新确认。':'');if(mismatch)confirm.setAttribute('aria-invalid','true');else confirm.removeAttribute('aria-invalid');return !mismatch;}
  original.addEventListener('input',validate);confirm.addEventListener('input',validate);
  form.addEventListener('submit',event=>{if(!validate()){event.preventDefault();event.stopImmediatePropagation();confirm.reportValidity();}},true);
  form.addEventListener('reset',()=>{confirm.setCustomValidity('');confirm.removeAttribute('aria-invalid');resetVisibility();});
 }
 root.querySelectorAll('form').forEach(form=>form.addEventListener('reset',resetVisibility));
 document.addEventListener('boyi:account-state',resetVisibility);
}
function setup(){
 const root=document.getElementById('member-account-content');if(!root)return;
 const auth=document.getElementById('member-auth'),dashboard=document.getElementById('member-dashboard');if(!auth||!dashboard)return;
 const heading=[...root.querySelectorAll('h1')].find(element=>!auth.contains(element)&&!dashboard.contains(element));if(heading)heading.classList.add('portal-account-heading');
 const authLayout=node('div',undefined,'portal-auth-layout'),brand=node('aside',undefined,'portal-auth-brand'),card=node('div',undefined,'portal-auth-card');
 brand.append(node('p','博医云','portal-auth-eyebrow'),node('h2','你的博医主页'),node('p','更新肖像、昵称和简单介绍。已有主页可以申请合并。'));
 if(site){const image=node('img');image.src=new URL('media/liuan-selection/053-full.webp',site).href;image.alt='六安实践途中';image.loading='lazy';const fallback=node('p','照片暂时无法加载。','member-help');fallback.hidden=true;image.addEventListener('error',()=>{image.hidden=true;fallback.hidden=false;});brand.append(image,fallback);}
 auth.before(authLayout);authLayout.append(brand,card);card.append(auth);
 const dashboardLayout=node('div',undefined,'portal-dashboard-layout'),nav=node('nav',undefined,'portal-editor-nav');nav.setAttribute('aria-label','个人主页维护导航');dashboard.before(dashboardLayout);dashboardLayout.append(nav,dashboard);
 enhancePasswords(root);
 const recover=document.getElementById('recover-form');if(recover){const back=node('button','返回登录','member-button secondary');back.type='button';back.addEventListener('click',()=>{const tab=root.querySelector('[data-auth-tab=login]');if(tab)tab.click();});recover.append(back);}
 function buildNavigation(){
  nav.replaceChildren();if(dashboardLayout.hidden)return;
  const entries=[],used=new Set();
  function add(target,label){if(!target||!visible(target,dashboard)||!label||used.has(target))return;ensureId(target,'portal-editor-section');used.add(target);entries.push({target,label});}
  function titleFor(target){const title=target.querySelector('h2');return title&&visible(title,dashboard)?title.textContent.trim():'';}
  for(const panel of dashboard.querySelectorAll('.member-panel'))if(visible(panel,dashboard))ensureId(panel,'portal-panel');
  for(const section of dashboard.querySelectorAll('[data-section]'))if(visible(section,dashboard))ensureId(section,'portal-editor-section');
  const basic=document.getElementById('member-basic-fields');
  if(basic&&visible(basic,dashboard))add(basic,'基本资料');
  const more=document.getElementById('member-more-fields');if(more&&visible(more,dashboard))add(more,'介绍与联系方式');
  const sectionLabels={appointments:'职务与任职',works:'作品与成果索引',experience:'实践与社会工作',projects:'项目经历',academic:'学术或其他成果',honors:'荣誉奖项',education:'教育经历',updates:'近期活动更新',essays:'阅读随笔'};
  const profileForm=document.getElementById('member-profile-form');
  for(const title of dashboard.querySelectorAll('h2')){
   if(!visible(title,dashboard)||title.closest('#member-preview,#member-private-view,#member-recovery'))continue;
   let target=title.closest('.member-panel,section,fieldset')||title.parentElement;
   if(!target||target===dashboard)target=title;
   if(basic&&(target===basic||target.contains(basic)))continue;
   if(more&&(target===more||target.contains(more)))continue;
   if(target===profileForm)target=title;
   add(target,title.textContent.trim());
  }
  for(const section of dashboard.querySelectorAll('[data-section]')){
   if(!visible(section,dashboard))continue;
   const container=section.closest('section,fieldset,.member-panel');
   const already=entries.some(entry=>entry.target===section||(container&&entry.target===container));
   if(!already){const title=container&&titleFor(container);add(section,title||sectionLabels[section.dataset.section]||'经历资料');}
  }
  const password=document.getElementById('member-password-form');if(password&&visible(password,dashboard)&&!entries.some(entry=>entry.target===password||entry.target.contains(password)))add(password,'修改密码');
  const security=document.getElementById('portal-security');if(security&&visible(security,dashboard)&&!used.has(security))add(security,'账号安全');
  const list=node('ul');for(const entry of entries){const row=node('li'),link=node('a',entry.label);link.href='#'+entry.target.id;row.append(link);list.append(row);}nav.append(list);nav.hidden=entries.length===0;
 }
 function sync(authenticated){const signedIn=typeof authenticated==='boolean'?authenticated:!dashboard.hidden&&auth.hidden;authLayout.hidden=signedIn||auth.hidden;dashboardLayout.hidden=!signedIn||dashboard.hidden;buildNavigation();}
 document.addEventListener('boyi:account-state',event=>sync(event.detail&&event.detail.authenticated));
 let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;sync();});});
 observer.observe(dashboard,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 observer.observe(auth,{attributes:true,attributeFilter:['hidden']});
 sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
