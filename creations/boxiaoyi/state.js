// Device-local, bounded prototype state. No account, network or medical data.
export const STORAGE_KEY = 'boyi-boxiaoyi-v1';
export const ACTIONS = Object.freeze({
  wave: {label:'招手',cooldown:4000,energy:0,mood:2,xp:2},
  pet: {label:'摸摸头',cooldown:8000,energy:0,mood:7,xp:4},
  feed: {label:'补充能量',cooldown:45000,energy:18,mood:3,xp:4},
  play: {label:'一起玩耍',cooldown:18000,energy:-7,mood:11,xp:8},
  study: {label:'陪读完成',cooldown:15000,energy:-5,mood:5,xp:24},
  rest: {label:'休息完成',cooldown:18000,energy:14,mood:3,xp:6},
  memory: {label:'记忆挑战',cooldown:25000,energy:-4,mood:9,xp:18}
});
const clamp = (n,lo,hi) => Math.min(hi,Math.max(lo,n));
const finite = (n,fallback) => typeof n === 'number' && Number.isFinite(n) ? n : fallback;
export function initialState(now = Date.now()) {
  return {version:1,energy:72,mood:65,xp:0,interactions:0,updatedAt:now,cooldowns:{},focusMs:0,restMs:0,mode:'idle',motion:true};
}
export function normalizeState(input,now = Date.now()) {
  const s = initialState(now);
  if (!input || input.version !== 1 || typeof input !== 'object') return s;
  for (const k of ['energy','mood']) s[k] = clamp(Math.round(finite(input[k],s[k])),0,100);
  s.xp = clamp(Math.floor(finite(input.xp,0)),0,100000);
  s.interactions = clamp(Math.floor(finite(input.interactions,0)),0,1000000);
  s.focusMs = clamp(finite(input.focusMs,0),0,30000);
  s.restMs = clamp(finite(input.restMs,0),0,8000);
  s.mode = ['idle','study','rest'].includes(input.mode) ? input.mode : 'idle';
  s.motion = input.motion !== false;
  for (const [key,rule] of Object.entries(ACTIONS)) {
    const until = finite(input.cooldowns?.[key],0);
    // A clock rollback or malformed future timestamp cannot lock care actions forever.
    if (until > now) s.cooldowns[key] = Math.min(until,now + rule.cooldown);
  }
  return s;
}
export function readState(storage,now = Date.now()) {
  try {
    const text = storage.getItem(STORAGE_KEY);
    return {state:normalizeState(text && text.length <= 8192 ? JSON.parse(text) : null,now),persistent:true};
  } catch { return {state:initialState(now),persistent:false}; }
}
export function saveState(storage,state) {
  try {storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;} catch {return false;}
}
export function stageFor(xp) {
  return xp < 60 ? {name:'初见',next:60,base:0,reward:'60 成长解锁星星徽章'} : xp < 160 ? {name:'同行',next:160,base:60,reward:'160 成长解锁书桌小花'} : {name:'默契',next:null,base:160,reward:'星星徽章与书桌小花已解锁'};
}
export function remaining(state,action,now = Date.now()) {return Math.max(0,(state.cooldowns[action] || 0) - now);}
export function applyCare(state,action,now = Date.now()) {
  const rule = ACTIONS[action];
  if (!rule) return {state,ok:false,reason:'这个互动还没有开放'};
  if (remaining(state,action,now)) return {state,ok:false,reason:`稍等 ${Math.ceil(remaining(state,action,now)/1000)} 秒再试`};
  if (rule.energy < 0 && state.energy < -rule.energy) return {state,ok:false,reason:'先补充能量，或休息一会儿吧'};
  const next = {...state,energy:clamp(state.energy+rule.energy,0,100),mood:clamp(state.mood+rule.mood,0,100),xp:clamp(state.xp+rule.xp,0,100000),interactions:clamp(state.interactions+1,0,1000000),updatedAt:now,cooldowns:{...state.cooldowns,[action]:now+rule.cooldown}};
  return {state:next,ok:true,reason:`${rule.label} · 成长 +${rule.xp}`};
}
export function beginSession(state,mode,now = Date.now()) {
  if (!['study','rest'].includes(mode)) return {state,ok:false,reason:'请选择陪读或休息'};
  if (state.mode !== 'idle') return {state,ok:false,reason:'先结束当前陪伴，再开始下一项'};
  if (remaining(state,mode,now)) return {state,ok:false,reason:`稍等 ${Math.ceil(remaining(state,mode,now)/1000)} 秒再试`};
  if (mode === 'study' && state.energy < 5) return {state,ok:false,reason:'先补充能量，或休息一会儿吧'};
  return {state:{...state,mode,updatedAt:now},ok:true,reason:mode === 'study' ? '一起专注 30 秒，留在页面上就好' : '休息 8 秒，慢慢恢复能量'};
}
export function cancelSession(state,now = Date.now()) {return {...state,mode:'idle',focusMs:0,restMs:0,updatedAt:now};}
export function tickSession(state,elapsedMs,now = Date.now()) {
  if (state.mode === 'idle') return {state,completed:null};
  // Caller ticks only while visible; a suspended tab or huge elapsed value earns no offline reward.
  const dt = clamp(finite(elapsedMs,0),0,1000),mode = state.mode,key = mode === 'study' ? 'focusMs' : 'restMs',goal = mode === 'study' ? 30000 : 8000;
  const next = {...state,[key]:Math.min(goal,state[key]+dt),updatedAt:now};
  if (next[key] < goal) return {state:next,completed:null};
  const reward = applyCare({...next,mode:'idle',focusMs:0,restMs:0},mode,now);
  return {state:reward.state,completed:reward.ok ? mode : null};
}
export function createSequence(length = 4,random = Math.random) {
  return Array.from({length:clamp(Math.floor(length),3,6)},() => clamp(Math.floor(finite(random(),0)*4),0,3));
}
export function matchSequence(sequence,input) {
  if (!Array.isArray(sequence) || sequence.length < 3 || sequence.length > 6 || sequence.some(v=>!Number.isInteger(v)||v<0||v>3) || !Array.isArray(input) || input.length > sequence.length || input.some(v=>!Number.isInteger(v)||v<0||v>3)) return 'miss';
  return input.some((v,i)=>v !== sequence[i]) ? 'miss' : input.length === sequence.length ? 'complete' : 'continue';
}
