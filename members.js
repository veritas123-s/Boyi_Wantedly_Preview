(() => {
'use strict';
const script=document.currentScript,site=new URL('.',script.src),local=['127.0.0.1','localhost'].includes(location.hostname);
const origin=local?location.origin:'https://122.51.44.155',api=origin+'/boyi-members',account=local?new URL('account/',site).href:origin+'/boyi-preview/account/';
const testLogin=new URLSearchParams(location.hash.slice(1)).get('test_admin');if(testLogin)history.replaceState(null,'',location.pathname+location.search);
const roleNames={foundation:'基金会人员',teacher:'班主任老师',committee:'班委',student:'学生'};
const sectionNames={appointments:'职务与任职',works:'作品与成果索引',experience:'实践与社会工作',projects:'项目经历',academic:'学术或其他成果',honors:'荣誉奖项',education:'教育经历',updates:'近期活动更新',essays:'阅读随笔'};
const mandatory=['name','school','major','grade','className','cohort','adminGroup','functionalGroups','avatar','bio','interests','appointments','works','experience'];
const basicFields={name:'姓名',school:'学校或单位',major:'专业',grade:'年级',className:'班级',englishName:'英文名',headline:'一句话介绍'};
const moreFields={bio:'个人简介',interests:'研究 / 交叉领域兴趣',skills:'技能',languages:'语言',publicContact:'联系方式'};
let registrationStep=0;
let me=null,csrf='',config=null,avatar='',busy=false,dirty=false,lastUsername='';
let securityEpoch=0,profileSequence=0;
const profilePrefixes=new WeakMap();
function clearAccountState(){
 securityEpoch++;
 for(const id of ['member-recovery','member-private-list','member-private-view','member-manage-people','member-manage-claims','member-preview','member-candidates','member-onboarding-actions','member-basic-fields','member-more-fields','portal-security']){const node=document.getElementById(id);if(node)node.replaceChildren();}
 for(const id of ['member-recovery','member-private-view','member-preview','portal-security','member-site-editor','member-management','member-private-management']){const node=document.getElementById(id);if(node)node.hidden=true;}
 const root=document.getElementById('member-account-content');
 if(root){for(const form of root.querySelectorAll('form'))form.reset();for(const input of root.querySelectorAll('input,textarea')){input.setCustomValidity('');if(!['checkbox','radio','button','submit','hidden'].includes(input.type))input.value='';}for(const section of root.querySelectorAll('[data-section]'))section.replaceChildren();}
 for(const id of ['member-hello','member-identity','member-published-state','member-save-state','member-onboarding-note']){const node=document.getElementById(id);if(node)node.textContent='';}
 const image=document.getElementById('member-avatar-preview');if(image){image.removeAttribute('src');image.hidden=true;}
 const publicLink=document.getElementById('member-public-link');if(publicLink)publicLink.removeAttribute('href');
 me=null;csrf='';avatar='';dirty=false;lastUsername='';
}
function securityPanel(){let panel=$('#portal-security');if(!panel){panel=el('section',undefined,'member-panel');panel.id='portal-security';$('#member-dashboard').append(panel);}return panel;}
async function refreshSecurity(){
 if(!me)return;
 const epoch=++securityEpoch,userId=me.user.id,panel=securityPanel(),current=()=>!!me&&me.user.id===userId&&epoch===securityEpoch;
 panel.hidden=false;panel.replaceChildren(el('h2','账号安全'),el('p','正在读取登录会话……','member-help'));
 try{
  const data=await call('/api/me/security');if(!current())return;
  const count=Number.isInteger(data.activeSessions)&&data.activeSessions>=1?String(data.activeSessions):'暂未提供';
  const expiry=new Date(data.currentSessionExpiresAt),expiryText=data.currentSessionExpiresAt&&!Number.isNaN(expiry.getTime())?expiry.toLocaleString('zh-CN'):'暂未提供';
  panel.replaceChildren(el('h2','账号安全'),el('p','有效登录会话：'+count),el('p','当前会话到期：'+expiryText));
  if(data.passwordlessTest)panel.append(el('p','当前为临时测试会话，仍受管理员到期限制。','member-help'));
  const status=el('p','','member-help');status.setAttribute('role','status');
  panel.append(button('退出其他会话',()=>action(async()=>{
   if(!current())return;
   try{const result=await call('/api/me/logout-others','POST',{});if(!current())return;if(result.ok!==true)throw Error('退出其他会话未完成，请重试。');await refreshSecurity();if(me&&me.user.id===userId)message(Number.isInteger(result.revoked)&&result.revoked>=0?'已退出其他会话，共撤销 '+result.revoked+' 个；当前会话继续有效。':'已退出其他会话，当前会话继续有效。');}
   catch(e){if(current())status.textContent=e.message||'退出其他会话失败，请重试。';}
  })),status);
 }catch(e){if(!current())return;panel.replaceChildren(el('h2','账号安全'),el('p',e.message||'暂时无法读取登录会话。','member-help'),button('重新读取',()=>action(refreshSecurity)));}
}
function safeProfileUrl(value){try{const url=new URL(value,site);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}}
const $=(selector,root=document)=>root.querySelector(selector),$$=(selector,root=document)=>[...root.querySelectorAll(selector)];
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function button(label,action,secondary=true){const b=el('button',label,'member-button'+(secondary?' secondary':''));b.type='button';b.addEventListener('click',action);return b;}
function link(label,url,secondary=true){const a=el('a',label,'member-button'+(secondary?' secondary':''));a.href=url;return a;}
function message(value){const n=$('#member-message');if(n){n.textContent=value;n.scrollIntoView({block:'nearest',behavior:'smooth'});}}
async function call(route,method='GET',body){const response=await fetch(api+route,{method,credentials:'include',headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'&&csrf?{'X-Boyi-CSRF':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await response.json();}catch{throw Error('暂时连接不上账号服务，请稍后重试。');}if(!response.ok){const e=Error(data.error||'操作没有完成，请重试。');e.status=response.status;throw e;}return data;}
async function action(fn){if(busy)return;busy=true;const buttons=$$('.member-main button');const previous=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);try{await fn();}catch(e){message(e.message||'暂时无法完成，请稍后重试。');}finally{busy=false;buttons.forEach((b,i)=>b.disabled=previous[i]);}}
function profileUrl(id){return new URL('people/?id='+encodeURIComponent(id),site).href;}
function imageUrl(id){return api+'/api/images/'+id;}
function legacyAvatarUrl(value){
 if(typeof value!=='string'||!new RegExp('^media/[A-Za-z0-9_./-]+[.](webp|png|jpg|jpeg)$').test(value)||value.includes('..')||!value.split('/').every(Boolean))return '';
 try{const url=new URL(value,site);return url.origin===site.origin&&url.pathname.startsWith(site.pathname)?url.href:'';}catch{return '';}
}
function profileAvatar(img,uploaded,legacy){
 const fallback=uploaded?'':legacyAvatarUrl(legacy),src=uploaded?imageUrl(uploaded):fallback;
 img.hidden=!src;img.style.objectFit=fallback?'contain':'';img.classList.toggle('member-avatar-card',!!fallback);
 if(src)img.src=src;else img.removeAttribute('src');
 return !!src;
}
function identityText(u){return (u.siteOwner?'站点管理员 · ':'')+(u.cohort?'博医'+u.cohort+'期 · ':'')+u.roleLabel+(u.identityStatus==='verified'?' · 身份已确认':' · 身份待确认');}
function field(label,name,type='text',value='',help=''){const wrap=el('label',undefined,'member-field');wrap.append(el('span',label));const input=el(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.name=name;input.value=value;if(help)wrap.append(input,el('small',help));else wrap.append(input);return wrap;}
function renderProfile(host,item,preview=false){
 host.replaceChildren();
 if(!profilePrefixes.has(host))profilePrefixes.set(host,'portal-profile-'+(++profileSequence));
 const prefix=profilePrefixes.get(host),p=item.profile||{},layout=el('div',undefined,'member-profile-layout'),sidebar=el('aside',undefined,'portal-profile-sidebar'),content=el('div',undefined,'portal-profile-content'),hero=el('section',undefined,'member-profile-hero'),copy=el('div'),tabs=el('nav',undefined,'portal-profile-tabs');
 const nonempty=value=>typeof value==='string'?value.trim().length>0:value!==null&&value!==undefined&&value!=='';
 tabs.setAttribute('aria-label','个人主页分区');
 function section(key,title){const s=el('section',undefined,'member-profile-section');s.id=prefix+'-'+key;s.append(el('h2',title));content.append(s);const a=el('a',title);a.href='#'+s.id;tabs.append(a);return s;}
 copy.append(el('span',(item.cohort?'博医'+item.cohort+'期 · ':'')+(item.role||'个人主页')+(item.identityVerified?'':' · 本人填写'),'member-badge'),el('h1',p.name||'我的主页'));
 if(nonempty(p.englishName))copy.append(el('p',p.englishName,'member-help'));if(nonempty(p.headline))copy.append(el('p',p.headline,'member-headline'));if(nonempty(p.school)||nonempty(p.major))copy.append(el('p',[p.school,p.major].filter(nonempty).join(' · ')));
 const basics=[p.grade,p.className,item.adminGroup?'第'+item.adminGroup+'行政组':'',...(item.functionalGroups||[])].filter(nonempty).join(' · ');if(basics)copy.append(el('p',basics,'member-help'));
 const portrait=el('img',undefined,'member-avatar');portrait.alt=(p.name||'本人')+'的头像';
 if(profileAvatar(portrait,p.avatar,item.legacyAvatarSrc))hero.append(portrait);else{const placeholder=el('span',Array.from(String(p.name||'').trim())[0]||'我','portal-avatar-placeholder');placeholder.setAttribute('aria-hidden','true');hero.append(placeholder);}
 hero.append(copy);sidebar.append(hero);if(portrait.classList.contains('member-avatar-card')){const original=link('查看原人物卡片 ↗',portrait.src);original.target='_blank';original.rel='noopener';sidebar.append(original);}layout.append(sidebar,content);host.append(layout);
 for(const [key,title]of [['bio','关于我'],['interests','兴趣与方向'],['skills','技能'],['languages','语言']])if(nonempty(p[key]))section(key,title).append(el('p',p[key]));
 for(const [key,title]of Object.entries(sectionNames)){
  const rows=Array.isArray(p[key])?p[key].filter(row=>row&&typeof row==='object'&&['title','date','organization','role','status','category','subtitle','description','url','cover'].some(field=>nonempty(row[field]))):[];if(!rows.length)continue;
  const s=section(key,title);
  for(const row of rows){const r=el('article',undefined,'member-profile-item'),details=el('div');if(nonempty(row.title))details.append(el('h3',row.title));
   const coverUrl=row.cover&&safeProfileUrl(row.cover);if(coverUrl){const cover=el('img',undefined,'member-work-cover');cover.src=coverUrl;cover.alt=row.title||'';cover.loading='lazy';details.append(cover);}
   const meta=[row.organization,row.role,row.status,row.category].filter(nonempty).join(' · ');if(meta)details.append(el('p',meta));if(row.isPublic===false)details.append(el('span','不公开 · 内部可见','member-badge'));if(nonempty(row.subtitle))details.append(el('p',row.subtitle));if(nonempty(row.description))details.append(el('p',row.description));
   const rowUrl=row.url&&safeProfileUrl(row.url);if(rowUrl){const a=el('a','查看链接 ↗');a.href=rowUrl;a.target='_blank';a.rel='noopener noreferrer';details.append(a);}
   if(nonempty(row.date))r.append(el('time',row.date));r.append(details);s.append(r);
  }
 }
 const voices={'zhang-jiayu':['经验与凝视——浅谈现代临床语言的形成、断裂与弥合','zhang-jiayu'],'xin-zhengye':['七月稻禾青，健康伴童行','xin-zhengye'],'bao-jiahao':['一纸问卷的温度','bao-jiahao']};
 if(item.rosterId&&voices[item.rosterId]){const [title,id]=voices[item.rosterId];section('voices','博医之声').append(link(title+' ↗',new URL('voices/'+id+'.html',site).href));}
 if(nonempty(p.publicContact))section('publicContact','联系方式').append(el('p',p.publicContact));
 if(tabs.childElementCount)sidebar.append(tabs);
 if(!preview&&item.updatedAt){const date=new Date(item.updatedAt);if(!Number.isNaN(date.getTime()))content.append(el('p','最近更新：'+date.toLocaleDateString('zh-CN'),'member-help'));}
}
function visibilityButton(key,value,changed,required=mandatory.includes(key)){
 const b=button(required?'公开 · 必须公开':value?'公开':'不公开',()=>{if(required)return;value=!value;b.textContent=value?'公开':'不公开';b.setAttribute('aria-checked',String(value));b.classList.toggle('is-private',!value);changed(value);dirty=true;$('#member-save-state').textContent='公开设置有修改，请保存';});
 b.className='member-visibility'+(!value?' is-private':'');b.setAttribute('role','switch');b.setAttribute('aria-checked',String(required||value));b.setAttribute('aria-label',(basicFields[key]||moreFields[key]||sectionNames[key]||key)+'是否公开');if(required){b.disabled=true;b.dataset.locked='';b.setAttribute('aria-description','此项属于必须公开的基础信息');}return b;
}
function buildFields(p,u){
 for(const [host,fields]of [[$('#member-basic-fields'),basicFields],[$('#member-more-fields'),moreFields]]){host.replaceChildren();for(const [key,label]of Object.entries(fields)){const wrap=el('div',undefined,'member-field-item'),f=field(label,key,host.id==='member-more-fields'?'textarea':'text',p[key]||'',key==='name'?'改名后需重新核对同名主页，已认领的姓名请联系老师更正。':'');const control=visibilityButton(key,mandatory.includes(key)||p.visibility?.[key]===true,value=>{wrap.dataset.public=String(value);});wrap.dataset.key=key;wrap.dataset.public=String(mandatory.includes(key)||p.visibility?.[key]===true);if(key==='name')$('input',f).required=true;wrap.append(f,control);host.append(wrap);}}
 for(const [key,label,value] of [['cohort','博医期次',u.cohort?'博医'+u.cohort+'期':'不适用'],['adminGroup','行政组',u.adminGroup?'第'+u.adminGroup+'行政组':'待补 / 不适用'],['functionalGroups','职能组',u.functionalGroups.join('、')||'待补 / 不适用'],['avatar','肖像公开状态','使用下方上传入口添加肖像']]){const wrap=el('div',undefined,'member-field-item');wrap.append(el('span',label+'：'+value,'member-help'),visibilityButton(key,true,()=>{}));$('#member-more-fields').append(wrap);}
}
function rowForm(section,row={}){const box=el('div',undefined,'member-row');box.dataset.entry='';box.dataset.id=row.id||crypto.randomUUID();box.dataset.public=String(mandatory.includes(section)||row.isPublic===true);const head=el('div',undefined,'member-row-head');head.append(el('strong',sectionNames[section]),visibilityButton(section,box.dataset.public==='true',value=>{box.dataset.public=String(value);}),button('删除这一条',()=>{box.remove();dirty=true;}));box.append(head);
 const fields=[['date','起止时间','text'],['title',section==='appointments'?'职务名称':'名称或标题','text'],['organization','机构 / 单位','text'],['role','本人角色 / 职责','text'],['status','现任 / 既往等状态','text'],['subtitle','补充说明','text'],['description','具体内容','textarea'],['url','有效链接（选填）','url']];if(section==='works')fields.push(['category','分类（博医之声 / 访谈 / 播客等）','text'],['cover','封面 HTTPS 链接（选填）','url']);
 for(const [name,label,type]of fields){const f=field(label,name,type,row[name]||'');if(name==='title')$('input',f).required=true;box.append(f);}return box;}
function collect(){const form=$('#member-profile-form'),p={visibility:{}};for(const key of [...Object.keys(basicFields),...Object.keys(moreFields)]){p[key]=form.elements[key].value.trim();p.visibility[key]=$('[data-key="'+key+'"]',form).dataset.public==='true';}p.avatar=avatar;for(const key of mandatory)p.visibility[key]=true;
 for(const section of Object.keys(sectionNames)){p.visibility[section]=true;p[section]=$$('[data-entry]',$('[data-section="'+section+'"]')).map(box=>({id:box.dataset.id,isPublic:box.dataset.public==='true',...Object.fromEntries($$('input[name],textarea[name]',box).map(f=>[f.name,f.value.trim()]))}));}return p;}
function publicOnly(p){p=structuredClone(p);for(const key of [...Object.keys(basicFields),...Object.keys(moreFields)])if(!mandatory.includes(key)&&p.visibility?.[key]!==true)delete p[key];for(const key of Object.keys(sectionNames))p[key]=(p[key]||[]).filter(r=>mandatory.includes(key)||r.isPublic);delete p.visibility;return p;}
function registerStep(step){registrationStep=step;$$('[data-register-step]').forEach((f,i)=>{f.hidden=i!==step;f.disabled=i!==step;});$('#register-progress').textContent='第'+(step+1)+'步 / 共3步 · '+['选择身份','填写姓名','设置账号'][step];$('#register-back').hidden=step===0;$('#register-next').textContent=step===2?'注册并核对已有主页':'下一步';if(step===2)$('#register-cohort').required=$('#register-form').elements.role.value!=='foundation';const f=$('[data-register-step="'+step+'"] input');if(f)f.focus({preventScroll:true});}
function onboarding(data){
 const host=$('#member-onboarding'),actions=$('#member-onboarding-actions'),list=$('#member-candidates'),editable=data.onboarding.canEdit;
 const approved=data.claims.find(c=>c.status==='approved'),pending=data.claims.find(c=>c.status==='pending'),waiting=!!pending||data.onboarding.state==='claim_pending',rows=data.onboarding.candidates||[];
 host.hidden=editable&&!approved&&!waiting&&!rows.length;$('#member-profile-form').hidden=!editable;list.replaceChildren();actions.replaceChildren();list.hidden=false;
 $('h2',host).textContent=approved?'已有主页已关联':editable?'合并已有主页':'先确认你的主页';
 const current=[data.user.name,data.user.className||'班级待补',data.user.cohort?'博医'+data.user.cohort+'期':'期次待补'].join(' · ');
 $('#member-onboarding-note').textContent=approved?'已关联：'+approved.roster_id+'。已有内容已合并到草稿，公开内容以本人发布的版本为准。':waiting?'等待核对，尚未合并。当前账号：'+current+'。申请主页：'+(pending?.roster_id||'待核对')+'。':editable?'可继续维护当前主页；如发现以下同名主页属于本人，可申请核对合并。':rows.length?'找到了同名主页，请核对姓名、班级和期次。':'没有找到同名的已有主页，可以填写自己的个人信息。';
 if(approved)return;
 if(waiting){actions.append(button('刷新核对结果',()=>action(async()=>{if(dirty&&!confirm('刷新会放弃未保存的修改，确认继续？'))return;showDashboard(await call('/api/me'));})));return;}
 for(const r of rows){
  const card=el('article',undefined,'member-candidate');card.append(el('h3',r.name+' · '+(r.className||'班级待补')+' · '+(r.cohort?'博医'+r.cohort+'期':'期次待补')));
  const tools=el('div',undefined,'member-actions'),a=link('查看已有主页',new URL(r.url,site).href);a.target='_blank';a.rel='noopener';tools.append(a);
  tools.append(button('这是我的主页',()=>action(async()=>{
   if(!r.claimable){message(r.ownedByAccount?'这个主页已由账号维护，请登录原账号或使用恢复码找回；也可联系老师核对。':'这份主页的期次与注册信息不同，请联系老师核对。');return;}
   if(dirty)await save();
   await call('/api/me/claim','POST',{rosterId:r.id});showDashboard(await call('/api/me'));message('认领申请已提交，正在等待核对，尚未合并。');
  })));card.append(tools);list.append(card);
 }
 if(editable&&rows.length){
  list.hidden=true;const toggle=button('展开同名主页（'+rows.length+'）',()=>{list.hidden=!list.hidden;toggle.textContent=list.hidden?'展开同名主页（'+rows.length+'）':'收起同名主页';toggle.setAttribute('aria-expanded',String(!list.hidden));});toggle.setAttribute('aria-controls','member-candidates');toggle.setAttribute('aria-expanded','false');actions.append(toggle);return;
 }
 if(!editable)actions.append(button(rows.length?'这些都不是我的主页':'填写个人信息',()=>action(async()=>{if(rows.length&&!confirm('确认这些同名主页都不属于你？'))return;showDashboard(await call('/api/me/onboarding','POST',{choice:rows.length?'not-mine':'new',confirm:true}));message('现在可以填写自己的资料。');}),false));
}
async function privateDirectory(){const result=await call('/api/manage/profile-directory'),host=$('#member-private-list');host.replaceChildren();for(const u of result.items){const row=el('article',undefined,'member-manage-item');row.append(el('h3',u.name+' · '+(u.className||'班级待补')+' · '+(u.cohort?'博医'+u.cohort+'期':'不限定期别')),button('查看完整资料（含不公开项）',()=>action(async()=>{const result=await call('/api/manage/profiles/'+u.id),view=$('#member-private-view');view.replaceChildren(el('h2','内部查看 · '+result.user.name),el('p','包含不公开的已保存资料，仅供权限范围内查看，请勿对外转发。','member-help'));const content=el('div');renderProfile(content,{profile:result.profile,cohort:result.user.cohort,adminGroup:result.user.adminGroup,functionalGroups:result.user.functionalGroups,role:result.user.roleLabel},true);view.append(content);view.hidden=false;view.scrollIntoView({behavior:'smooth',block:'start'});})));host.append(row);}}
async function save(){const form=$('#member-profile-form');if(!form.reportValidity())throw Error('请先补全已添加条目的标题，或删除空条目。');const data=await call('/api/me/profile','PUT',{profile:collect(),version:me.version});me={...me,...data};dirty=false;if(data.onboarding.canEdit===false){showDashboard(me);throw Error('新姓名和草稿已保存，请先重新核对同名主页，再预览和公开。');}$('#member-save-state').textContent='已保存草稿 · '+new Date().toLocaleTimeString('zh-CN');return data;}
function recoveryBox(code){const box=$('#member-recovery');box.replaceChildren(el('h2','请保存账号恢复码'),el('p','忘记密码时，可以用它重设密码。恢复码只显示这一次，请单独保存，不要发到公开主页。'),el('p',code,'member-recovery-code'));const a=button('下载恢复码',()=>{const blob=new Blob(['博医云账号恢复码\n账号：'+(lastUsername||'注册时填写的账号')+'\n恢复码：'+code+'\n请妥善保存，不要公开。'],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),download=el('a');download.href=url;download.download='博医云账号恢复码.txt';download.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});box.append(a,button('我已保存',()=>{box.hidden=true;box.replaceChildren();}));box.hidden=false;}
function showAuth(tab='login'){clearAccountState();$('#member-auth').hidden=false;$('#member-dashboard').hidden=true;if(tab==='register')registerStep(0);for(const t of ['login','register','recover']){$('#'+t+'-form').hidden=t!==tab;const b=$('[data-auth-tab="'+t+'"]');if(b)b.setAttribute('aria-selected',String(t===tab));}message('');document.dispatchEvent(new CustomEvent('boyi:account-state',{detail:{authenticated:false}}));}
function showDashboard(data){
 const changedUser=!!me&&me.user.id!==data.user.id,registrationUsername=lastUsername;
 if(changedUser){clearAccountState();if(data.recoveryCode)lastUsername=registrationUsername;}
 me=data;csrf=data.csrf||csrf;avatar=data.profile.avatar||'';$('#member-auth').hidden=true;$('#member-dashboard').hidden=false;
 let editorLink=$('#member-site-editor');if(!editorLink){editorLink=document.createElement('a');editorLink.id='member-site-editor';editorLink.className='button primary';editorLink.href=api+'/editor/';editorLink.textContent='编辑网站';$('#member-hello').insertAdjacentElement('afterend',editorLink);}editorLink.hidden=!(data.user.siteOwner&&data.user.identityStatus==='verified');
 if(!editorLink.hidden&&new URLSearchParams(location.search).get('next')==='editor'){document.dispatchEvent(new CustomEvent('boyi:account-state',{detail:{authenticated:true}}));location.replace(editorLink.href);return;}
 $('#member-hello').textContent=data.profile.name+'，欢迎回来';$('#member-identity').textContent=identityText(data.user);$('#member-published-state').textContent=data.published?'已有公开版本；保存后会立即隐藏改为不公开的项目，其他正文待重新发布后更新。':'主页尚未公开；先补充资料，再预览和公开。';
 if(data.user.temporaryTest){$('#member-identity').textContent='Admin · 临时测试管理员 · '+new Date(data.user.testExpiresAt).toLocaleString('zh-CN')+' 到期';}$('#member-password-form').hidden=!!data.user.temporaryTest;$('#member-publish').hidden=!!data.user.temporaryTest;
 buildFields(data.profile,data.user);
 for(const section of Object.keys(sectionNames)){const host=$('[data-section="'+section+'"]');host.replaceChildren();for(const row of data.profile[section]||[])host.append(rowForm(section,row));}
 const img=$('#member-avatar-preview');profileAvatar(img,avatar,data.legacyAvatarSrc);$('#member-public-link').href=profileUrl(data.publicId);$('#member-unpublish').hidden=!data.published;
 $('#member-claim').hidden=true;onboarding(data);$('#member-private-management').hidden=!(data.user.identityStatus==='verified'&&(data.user.siteOwner||['foundation','teacher'].includes(data.user.approvedRole)));
 const management=data.user.siteOwner||['foundation','teacher'].includes(data.user.approvedRole)||data.user.approvedRole==='committee'&&data.user.canVerify;$('#member-management').hidden=!management;
 dirty=false;$('#member-save-state').textContent='';$('#member-preview').hidden=true;
 void refreshSecurity();
 document.dispatchEvent(new CustomEvent('boyi:account-state',{detail:{authenticated:true}}));
}
async function management(){
 const data=await call('/api/manage/pending'),members=$('#member-manage-people'),claims=$('#member-manage-claims');members.replaceChildren();claims.replaceChildren();
 if(!data.members.length)members.append(el('p','目前没有需要你核对的成员。','member-help'));
 for(const u of data.members){const box=el('article',undefined,'member-manage-item');box.append(el('h3',u.name),el('p',identityText(u)+(u.adminGroup?' · 行政'+u.adminGroup+'组':'')+(u.disabled?' · 已停用':''),'member-help'));const actions=el('div',undefined,'member-actions');const verification=el('label',undefined,'member-check'),toggle=el('input');toggle.type='checkbox';toggle.checked=u.canVerify;verification.append(toggle,el('span','允许协助核对本行政组学生'));if(u.requestedRole==='committee')box.append(verification);
  const update=type=>action(async()=>{if(['disable','revoke'].includes(type)&&!confirm(type==='disable'?'停用后，该账号不能登录，公开主页也会隐藏。确认停用？':'确认撤销这个账号已核对的身份与管理权限？'))return;await call('/api/manage/members/'+u.id,'POST',{action:type,canVerify:toggle.checked});await management();message('成员状态已更新。');});
  actions.append(button(u.identityStatus==='verified'?'重新确认身份':'确认身份',()=>update('approve')),button('撤销身份确认',()=>update('revoke')),button(u.disabled?'恢复账号':'停用账号',()=>update(u.disabled?'enable':'disable')));box.append(actions);members.append(box);
 }
 if(!data.claims.length)claims.append(el('p','目前没有待核对的主页认领。','member-help'));
 for(const c of data.claims){const box=el('article',undefined,'member-manage-item');box.append(el('h3',c.name),el('p','申请认领五期已有主页 · '+c.rosterId,'member-help'));const actions=el('div',undefined,'member-actions');for(const yes of [true,false])actions.append(button(yes?'确认认领':'暂不通过',()=>action(async()=>{await call('/api/manage/claims/'+c.id,'POST',{approve:yes});await management();message('认领申请已处理。');})));box.append(actions);claims.append(box);}
}
async function setupAccount(){
 if(!local&&location.origin!==origin){$('#member-account-content').replaceChildren(el('h1','登录博医云'),el('p','账号与个人资料保存在腾讯云。请从下面的入口注册、登录和维护主页。'),link('前往账号中心',account,false));return;}
 config=await call('/api/config');const cohorts=$('#register-cohort');for(const n of config.cohorts){const option=el('option','博医'+n+'期');option.value=n;option.selected=n===5;cohorts.append(option);}
 $$('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>showAuth(b.dataset.authTab)));
 $('#member-forgot').addEventListener('click',()=>showAuth('recover'));
 const register=$('#register-form');register.addEventListener('change',()=>{$('#register-cohort').required=register.elements.role.value!=='foundation';});$('#register-back').addEventListener('click',()=>registerStep(Math.max(0,registrationStep-1)));
 register.addEventListener('submit',e=>{e.preventDefault();if(registrationStep<2){registerStep(registrationStep+1);return;}action(async()=>{const get=k=>register.elements[k].value;lastUsername=get('username');const data=await call('/api/register','POST',{username:get('username'),password:get('password'),name:get('name'),role:get('role'),cohort:get('cohort')?Number(get('cohort')):null,className:get('className'),adminGroup:get('adminGroup'),functionalGroups:$$('[name="functionalGroups"]:checked',register).map(n=>n.value),invite:get('invite'),consent:register.elements.consent.checked});showDashboard(data);register.reset();recoveryBox(data.recoveryCode);message('注册成功，请先确认已有的同名主页是否属于你。');});});
 $('#member-private-refresh').addEventListener('click',()=>action(privateDirectory));
 $('#login-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{const d=new FormData(e.target),data=await call('/api/login','POST',{username:d.get('username'),password:d.get('password')});e.target.reset();showDashboard(data);message('登录成功。');});});
 $('#recover-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{const d=new FormData(e.target);lastUsername=d.get('username');const result=await call('/api/recover','POST',{username:d.get('username'),recoveryCode:d.get('recoveryCode'),password:d.get('password')});e.target.reset();showAuth('login');lastUsername=d.get('username');recoveryBox(result.recoveryCode);message('密码已重设，旧恢复码已失效。请保存新恢复码，再用新密码登录。');});});
 for(const section of Object.keys(sectionNames))$('[data-add="'+section+'"]').addEventListener('click',()=>{const host=$('[data-section="'+section+'"]');if($$('[data-entry]',host).length>=30)return message('这个分区最多添加30条。');host.append(rowForm(section));dirty=true;});
 $('#member-profile-form').addEventListener('input',()=>{dirty=true;$('#member-save-state').textContent='有未保存的修改';});$('#member-profile-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{await save();message('草稿已保存，未重新发布的正文保持原版本，设为不公开的项目已隐藏。');});});
 $('#member-preview-button').addEventListener('click',()=>{const host=$('#member-preview');renderProfile(host,{profile:publicOnly(collect()),adminGroup:me.user.adminGroup,functionalGroups:me.user.functionalGroups,role:me.user.roleLabel,identityVerified:me.user.identityStatus==='verified',cohort:me.user.cohort,rosterId:me.claims.find(c=>c.status==='approved')?.roster_id,legacyAvatarSrc:me.legacyAvatarSrc},true);host.hidden=false;host.scrollIntoView({behavior:'smooth',block:'start'});});
 $('#member-publish').addEventListener('click',()=>action(async()=>{if(!$('#member-public-consent').checked)throw Error('请先确认页面中的资料可以公开。');await save();const data=await call('/api/me/publish','POST',{version:me.version,confirm:true});showDashboard({...data,csrf});message('主页已公开。可以复制“查看公开主页”的地址发给别人。');}));
 $('#member-unpublish').addEventListener('click',()=>action(async()=>{if(!confirm('撤回后，访客将不能查看这份个人主页。草稿会保留，确认撤回？'))return;const data=await call('/api/me/unpublish','POST',{});showDashboard({...data,csrf});message('公开版本已撤回，草稿仍保留在本人账号。');}));
 $('#member-logout').addEventListener('click',()=>action(async()=>{if(dirty&&!confirm('还有未保存的修改，确认退出？'))return;await call('/api/logout','POST',{});me=null;csrf='';dirty=false;showAuth('login');$('#member-profile-form').reset();message('已退出登录。');}));
 $('#member-claim-button').addEventListener('click',()=>action(async()=>{await call('/api/me/claim','POST',{rosterId:$('#member-claim-id').value});const data=await call('/api/me');showDashboard(data);message('认领申请已提交。');}));
 $('#member-manage-refresh').addEventListener('click',()=>action(management));
 $('#member-password-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{const d=new FormData(e.target);await call('/api/me/password','POST',{oldPassword:d.get('oldPassword'),newPassword:d.get('newPassword')});e.target.reset();me=null;csrf='';dirty=false;showAuth('login');message('密码已修改，请重新登录。');});});
 $('#member-avatar-file').addEventListener('change',e=>action(async()=>{const file=e.target.files[0];if(!file)return;if(file.size>15000000)throw Error('请选择15MB以内的照片。');const bitmap=await createImageBitmap(file);const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const data=canvas.toDataURL('image/jpeg',.85).split(',')[1],result=await call('/api/me/avatar','POST',{data});avatar=result.id;const img=$('#member-avatar-preview');profileAvatar(img,avatar,me.legacyAvatarSrc);dirty=true;message('头像已上传，请保存草稿；公开版本暂未改变。');}));
 addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 try{showDashboard(testLogin?await call('/api/test-admin/login','POST',{token:testLogin}):await call('/api/me'));if(testLogin)message('Admin 免密码登录成功，可以测试成员核对与内部资料查看。');}catch(e){if(e.status===401)showAuth('login');else throw e;}
 $$('[data-auth-tab]').forEach(b=>b.disabled=false);$('#member-auth').dataset.ready='true';
}
async function directory(host){const query=new URLSearchParams();const form=$('#member-directory-form');if(form){const d=new FormData(form);if(d.get('cohort'))query.set('cohort',d.get('cohort'));if(d.get('q'))query.set('q',d.get('q'));}const data=await call('/api/public/profiles?'+query);host.replaceChildren();if(!data.items.length){host.append(el('p','这里会展示成员本人确认公开的主页。','member-help'));return;}for(const item of data.items){const a=el('a',undefined,'member-person');a.href=profileUrl(item.id);if(item.profile.avatar){const img=el('img');img.src=imageUrl(item.profile.avatar);img.alt='';img.loading='lazy';a.append(img);}a.append(el('span',(item.cohort?'博医'+item.cohort+'期 · ':'')+item.role,'member-help'),el('h3',item.profile.name));if(item.profile.headline||item.profile.major)a.append(el('p',item.profile.headline||item.profile.major));host.append(a);}}
async function publicPage(){const host=$('#member-public-profile'),id=new URLSearchParams(location.search).get('id');if(id){const data=await call('/api/public/profiles/'+encodeURIComponent(id));$('#member-profile-heading').hidden=true;renderProfile(host,data.item);document.title=data.item.profile.name+' | 博医云';$('#member-profile-heading').setAttribute('aria-label',data.item.profile.name);$('#member-directory-area').hidden=true;}else{$('#member-profile-heading').textContent='成员主页';const form=$('#member-directory-form');form.addEventListener('submit',e=>{e.preventDefault();action(()=>directory($('#member-directory')));});await directory($('#member-directory'));}}
async function legacyProfile(){
 const main=$('main[data-student-id]');if(!main)return;
 main.replaceChildren(el('p','正在加载个人主页……','member-help'));
 try{
  const data=await call('/api/public/legacy/'+encodeURIComponent(main.dataset.studentId));
  if(data.kind==='legacy'){
   if(typeof data.mainHtml!=='string')throw Error('档案内容暂时无法读取。');
   const parsed=new DOMParser().parseFromString(data.mainHtml,'text/html');
   parsed.querySelectorAll('script,iframe,object,embed,base,meta,link').forEach(node=>node.remove());
   for(const node of parsed.querySelectorAll('*'))for(const attribute of [...node.attributes]){
    const name=attribute.name.toLowerCase(),value=attribute.value.replace(/[\u0000-\u0020\u007f-\u009f]/g,'').toLowerCase();
    if(name.startsWith('on')||name==='srcdoc'||(['href','src','xlink:href','action','formaction'].includes(name)&&value.startsWith('javascript:')))node.removeAttribute(attribute.name);
   }
   const source=parsed.querySelector('main');if(!source)throw Error('档案内容暂时无法读取。');
   main.replaceChildren(...[...source.children].map(node=>document.importNode(node,true)));
  }else if(data.kind==='profile'&&data.item){const host=el('div');renderProfile(host,data.item);main.replaceChildren(host);main.classList.add('member-main');}
  else if(data.kind==='unpublished')main.replaceChildren(el('h1','主页暂未公开'),el('p','本人尚未公开这份资料。'));
  else throw Error('档案内容暂时无法读取。');
 }catch(e){main.replaceChildren(el('h1','暂时无法加载主页'),el('p','请稍后重试。当前未展示档案内容。','member-help'),button('重新加载',()=>{void legacyProfile();}));}
 document.dispatchEvent(new CustomEvent('boyi:profile-ready'));
}
async function init(){
 const header=$('.w-header'),menu=$('.w-menu',header||document);if(header&&menu){const a=el('a','我的主页','boyi-account-entry');a.href=account;header.insertBefore(a,menu);}
 if($('#member-account-content')){try{await setupAccount();}catch(e){message(e.message||'暂时无法连接账号服务。');}return;}
 if($('#member-public-profile')){try{await publicPage();}catch(e){message(e.message);$('#member-public-profile').replaceChildren(el('p','这个主页暂未公开，或账号服务暂时不可用。'));}return;}
 if($('main[data-student-id]'))void legacyProfile();
 if(location.pathname.endsWith('/window/students/')){const main=$('main');if(main){const section=el('section',undefined,'member-directory-slot');section.append(el('h2','成员自己维护的主页'),link('查看所有成员主页',new URL('people/',site).href),link('注册 / 维护我的主页',account));const list=el('div',undefined,'member-directory');section.append(list);main.append(section);directory(list).catch(()=>list.append(el('p','账号服务暂时不可用，请稍后查看。','member-help')));}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
