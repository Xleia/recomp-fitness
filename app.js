'use strict';

// RECOMP PUBLIC TEMPLATE. Do not place private measurements, login credentials,
// personal calorie targets, or workout journals in this file or the GitHub repo.
const VAULT_KEY = 'recomp.encrypted.v2';
const LEGACY_KEY = 'recomp8week';
const DAILY_DB = 'recomp.daily-unlock.v1';
const DAILY_REVOKED_KEY = 'recomp.daily-unlock.revoked';
// Remember only the last UI tab (no measurements, food logs or passwords).
const LAST_SCREEN_KEY = 'recomp.last-screen.v1';
const VALID_SCREENS = ['home','train','food','library','progress','settings'];
const TOKYO_DAY = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'});
const VAULT_VERSION = 2;
const ITERATIONS = 600000;
const AAD = new TextEncoder().encode('RECOMP|encrypted-vault|v2');
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const ORDER = [1,2,3,4,5,6,0];
const MEAL_NAMES = ['早餐', '午餐', '加餐 / 运动补给', '晚餐'];
const LUNCHES = [
  {name:'猪肉蔬菜定食（图片款）',kcal:780,protein:38,fat:29,carbs:85},
  {name:'卤肉饭＋卤蛋＋蔬菜',kcal:820,protein:30,fat:36,carbs:94},
  {name:'猪肉定食（非油炸）',kcal:760,protein:40,fat:26,carbs:90},
  {name:'牛丼＋鸡蛋＋沙拉',kcal:750,protein:32,fat:26,carbs:96},
  {name:'拉面＋鸡蛋／肉',kcal:850,protein:32,fat:34,carbs:103},
  {name:'荞麦面＋蛋白质配菜',kcal:650,protein:35,fat:18,carbs:87},
  {name:'乌冬面＋鸡肉／鸡蛋',kcal:680,protein:33,fat:16,carbs:100},
  {name:'便利店饭团＋鸡胸＋鸡蛋＋沙拉',kcal:720,protein:46,fat:19,carbs:91}
];
const MENU = {
  1:['燕麦70g、牛奶250ml、鸡蛋100g、香蕉120g','工作日外食，自由选择定食/饭/面','高蛋白酸奶200g、苹果180g、坚果10g','熟米饭200g、瘦牛肉150g、豆腐150g、蔬菜250g、油5g'],
  2:['全麦面包80g、鸡蛋100g、牛奶250ml、香蕉100g','工作日外食，注意补足蛋白质','高蛋白酸奶200g、苹果150g、坚果10g','土豆200g、豆腐250g、三文鱼120g、蔬菜250g、油5g'],
  3:['燕麦70g、牛奶250ml、鸡蛋100g、苹果150g','工作日外食，自由选择定食/饭/面','高蛋白酸奶250g、香蕉120g','熟米饭220g、鸡胸肉170g、豆腐150g、蔬菜250g、油10g'],
  4:['全麦面包90g、鸡蛋100g、高蛋白酸奶200g、香蕉120g','工作日外食，自由选择定食/饭/面','牛奶250ml、坚果20g、苹果180g','熟米饭150g、三文鱼150g、豆腐200g、蔬菜250g、油5g'],
  5:['燕麦75g、牛奶250ml、鸡蛋100g、香蕉120g','工作日外食，自由选择定食/饭/面','高蛋白酸奶250g、坚果15g、苹果150g','熟米饭220g、瘦牛肉140g、豆腐150g、蔬菜250g、油5g'],
  0:['燕麦50g、牛奶250ml、鸡蛋100g、苹果150g','熟米饭180g、鸡胸肉180g、蔬菜250g、油10g','高蛋白酸奶200g、坚果15g','土豆300g、三文鱼140g、豆腐200g、蔬菜250g、油5g']
};
const $ = id => document.getElementById(id);
const text = (id, value) => {$(id).textContent = String(value);};
const hide = (id, hidden=true) => {$(id).hidden = hidden;};
function el(tag, cls, content) {let e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=String(content);return e;}
function formattedDate(d) {return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function fromDate(s) {return new Date(`${s}T12:00:00`);}
function weekday(s) {return fromDate(s).getDay();}
function monday(s) {let d=fromDate(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return formattedDate(d);}
function shiftDays(s, n) {let d=fromDate(s);d.setDate(d.getDate()+n);return formattedDate(d);}
function weekDifference(a,b) {return Math.floor((Date.UTC(...b.split('-').map((x,i)=>i===1?Number(x)-1:Number(x)))-Date.UTC(...a.split('-').map((x,i)=>i===1?Number(x)-1:Number(x))))/(7*86400000));}
function num(id) {const v=$(id).value.trim();return v===''?null:Number(v);}
function validRange(n,min,max) {return n!==null && Number.isFinite(n)&&n>=min&&n<=max;}
function showError(error) {notify(error instanceof Error?error.message:String(error),true);}
let toastTimeout;
function notify(message,isError=false) {let target=$('toast');target.textContent=message;target.classList.toggle('error',isError);target.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>target.hidden=true,4500);}
function busy(id, flag) {$(id).disabled=flag;}
function bytesToB64(bytes) {let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(result);}
function b64ToBytes(str) {const raw=atob(str);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
function randomBytes(n) {return crypto.getRandomValues(new Uint8Array(n));}
function parseEnvelope(json) {
  const v=typeof json==='string'?JSON.parse(json):json;
  if(!v||typeof v!=='object'||v.version!==VAULT_VERSION||v.format!=='recomp-encrypted-vault'||v.kdf!=='PBKDF2-SHA256'||v.cipher!=='AES-256-GCM'||v.iterations!==ITERATIONS)throw Error('不是受支持的 RECOMP 加密备份');
  for(const [field,min,max] of [['salt',20,100],['iv',12,70],['ciphertext',20,15000000]]){
    if(typeof v[field]!=='string'||v[field].length<min||v[field].length>max||!/^[A-Za-z0-9+/]*={0,2}$/.test(v[field]))throw Error('备份格式不正确');
  }
  if(b64ToBytes(v.salt).length!==16||b64ToBytes(v.iv).length!==12)throw Error('备份的加密参数不正确');
  return v;
}
async function deriveKey(password,salt) {
  const base=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function seal(data,key,salt) {
  const iv=randomBytes(12);
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD,tagLength:128},key,encoder.encode(JSON.stringify(data)));
  return {format:'recomp-encrypted-vault',version:VAULT_VERSION,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-256-GCM',salt:bytesToB64(salt),iv:bytesToB64(iv),ciphertext:bytesToB64(new Uint8Array(ciphertext))};
}
async function unseal(env,password) {
  const key=await deriveKey(password,b64ToBytes(env.salt));
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(env.iv),additionalData:AAD,tagLength:128},key,b64ToBytes(env.ciphertext));
  const value=JSON.parse(decoder.decode(plain));
  assertState(value);
  return {key,value};
}
function assertState(v) {
  if(!v||typeof v!=='object'||!v.profile||typeof v.profile!=='object'||!v.settings||typeof v.settings!=='object'||!v.nutrition||typeof v.nutrition!=='object'||!v.workouts||typeof v.workouts!=='object'||!Array.isArray(v.measurements))throw Error('加密备份里的数据格式不正确');
  if(v.measurements.length>5000||Object.keys(v.workouts).length>10000||Object.keys(v.nutrition).length>10000)throw Error('备份数据超过安全限制');
}
function newState(start,goals,weight,waist) {
  const initial=[];
  if(weight!==null||waist!==null)initial.push({date:formattedDate(new Date()),weight,waist});
  return {schema:2,profile:{created:formattedDate(new Date())},settings:{start:monday(start),train:goals.train,rest:goals.rest,free:goals.free,protein:goals.protein},measurements:initial,workouts:{},nutrition:{},legacyHistory:[]};
}
function migrateLegacy(state) {
  const raw=localStorage.getItem(LEGACY_KEY);
  if(!raw)return;
  const old=JSON.parse(raw);
  if(!old||typeof old!=='object')throw Error('旧版记录数据异常');
  if(Array.isArray(old.measures))for(const m of old.measures.slice(0,1000)){
    if(m&&/^\d{4}-\d\d-\d\d$/.test(m.date||''))state.measurements.push({date:m.date,weight:Number(m.weight)>0?Number(m.weight):null,waist:Number(m.waist)>0?Number(m.waist):null});
  }
  if(Array.isArray(old.workouts))for(const w of old.workouts.slice(-1500)){
    if(!w||!/^\d{4}-\d\d-\d\d$/.test(w.date||''))continue;
    const day=Number(w.day);
    const name=typeof w.title==='string'?w.title.slice(0,100):'旧版训练';
    const k=`legacy-${w.date}-${state.legacyHistory.length}`;
    state.legacyHistory.push({date:w.date,title:name,sets:Number(w.completed)||0});
    if(Array.isArray(w.entries))state.workouts[k]={date:w.date,day,items:w.entries.slice(0,40).map(z=>({name:String(z.exercise||'').slice(0,100),sets:Array.isArray(z.sets)?z.sets.slice(0,20).map(t=>({w:Number(t.w)||0,r:Number(t.r)||0,done:!!t.done})):[]}))};
  }
  if(old.food&&typeof old.food==='object')for(const item of Object.values(old.food).slice(0,1500)){
    if(!item||!/^\d{4}-\d\d-\d\d$/.test(item.date||''))continue;
    let vals=[{kcal:Math.max(0,Number(item.kcal)||0),protein:Math.max(0,Number(item.protein)||0),fat:0,carbs:0,note:typeof item.memo==='string'?item.memo.slice(0,300):'旧版当日合计'},...Array.from({length:3},()=>({kcal:0,protein:0,fat:0,carbs:0,note:''}))];
    state.nutrition[item.date]={entries:vals,lunch:null};
  }
}

let state=null;
let keyRef=null;
let saltRef=null;
let writeQueue=Promise.resolve();
let trainDay=new Date().getDay();
let trainWeek=0;
let trainDate=formattedDate(new Date());
let foodDay=new Date().getDay();
let foodDate=formattedDate(new Date());
let currentScreen='home';
let locking=false;
let manualLockRequested=false;
let unlockedDay=null;
let authGeneration=0;
let restoring=false;
// UI-only accordion state; never written to the encrypted nutrition/workout records.
// The default is collapsed. These sets track only sections the user opens.
let renderedWorkout=null;
const expandedExercises=new Set();
const expandedMeals=new Set();

function todayInTokyo() {
  const parts=TOKYO_DAY.formatToParts(new Date());
  const part=type=>parts.find(p=>p.type===type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
// Store only the non-extractable CryptoKey, never the password or decrypted journal.
// IndexedDB uses structured cloning, supported by current Safari / WebKit versions.
function dailyKeyStore(action, value) {
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(Error('浏览器不支持当天免密码'));return;}
    const opening=indexedDB.open(DAILY_DB,1);
    opening.onupgradeneeded=()=>opening.result.createObjectStore('session');
    opening.onerror=()=>reject(opening.error||Error('无法读取本地密钥'));
    opening.onblocked=()=>reject(Error('本地密钥数据库被占用'));
    opening.onsuccess=()=>{
      const db=opening.result;
      try {
        const tx=db.transaction('session',action==='get'?'readonly':'readwrite');
        const store=tx.objectStore('session');
        let result;
        const request=action==='get'?store.get('today'):action==='put'?store.put(value,'today'):store.delete('today');
        request.onsuccess=()=>{result=request.result;};
        tx.oncomplete=()=>{db.close();resolve(result);};
        tx.onabort=()=>{db.close();reject(tx.error||Error('无法保存本地密钥'));};
      }catch(err){db.close();reject(err);}
    };
  });
}
async function rememberToday(key,salt) {
  try {
    await dailyKeyStore('put',{day:todayInTokyo(),salt,key});
    localStorage.removeItem(DAILY_REVOKED_KEY);
    return true;
  }catch(err){console.warn('RECOMP: daily unlock unavailable',err);return false;}
}
async function forgetToday() {
  // A local tombstone also prevents restoration when IndexedDB deletion fails.
  localStorage.setItem(DAILY_REVOKED_KEY,'1');
  try{await dailyKeyStore('delete');}catch(err){console.warn('RECOMP: failed to clear remembered key',err);}
}
async function restoreToday() {
  if(restoring||locking||keyRef||document.hidden||!hasVault()||localStorage.getItem(DAILY_REVOKED_KEY))return;
  if(!window.isSecureContext||!window.crypto?.subtle)return;
  const generation=authGeneration;
  restoring=true;
  try {
    const remembered=await dailyKeyStore('get');
    if(!remembered)return;
    if(remembered.day!==todayInTokyo()){
      if(generation===authGeneration&&!keyRef)await dailyKeyStore('delete');
      return;
    }
    const env=parseEnvelope(localStorage.getItem(VAULT_KEY));
    if(remembered.salt!==env.salt||!remembered.key||remembered.key.type!=='secret')throw Error('记住的密钥已失效');
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(env.iv),additionalData:AAD,tagLength:128},remembered.key,b64ToBytes(env.ciphertext));
    const value=JSON.parse(decoder.decode(plaintext));
    assertState(value);
    if(generation!==authGeneration||locking||document.hidden||keyRef||localStorage.getItem(DAILY_REVOKED_KEY))return;
    state=value;keyRef=remembered.key;saltRef=b64ToBytes(env.salt);
    unlockUI();
  }catch(err){
    console.warn('RECOMP: remembered unlock rejected',err);
    if(generation===authGeneration&&!keyRef){
      try{await dailyKeyStore('delete');}catch(e){console.warn('RECOMP: failed to discard expired key',e);}
    }
  }finally{restoring=false;}
}
function handleReturn() {
  if(document.hidden)return;
  if(keyRef){if(unlockedDay!==todayInTokyo())void lock(true);}
  else void restoreToday();
}
function hasVault() {return !!localStorage.getItem(VAULT_KEY);}
function drawAuth() {
  const ready=!!(window.isSecureContext&&window.crypto&&crypto.subtle);
  hide('security-error',ready);
  hide('setup-panel',hasVault());
  hide('unlock-panel',!hasVault());
  hide('legacy-notice',!localStorage.getItem(LEGACY_KEY));
  hide('auth',false);hide('app');hide('nav');hide('lock-btn');
  if(!ready){busy('setup-submit',true);busy('unlock-submit',true);busy('import-locked-btn',true);}
}
function renderEverything() {
  expandedExercises.clear();expandedMeals.clear();
  window.Nutrition?.clearSession();
  $('measure-date').value=formattedDate(new Date());
  renderHome();renderTraining();renderFood();renderProgress();renderSettings();
}
function unlockUI() {
  unlockedDay=todayInTokyo();
  hide('auth');hide('app',false);hide('nav',false);hide('lock-btn',false);
  trainWeek=Math.min(planLength()-1,Math.max(0,weekDifference(state.settings.start,monday(formattedDate(new Date())))));
  trainDay=new Date().getDay();trainDate=shiftDays(state.settings.start,trainWeek*7+((trainDay+6)%7));
  foodDay=new Date().getDay();foodDate=formattedDate(new Date());
  renderEverything();navigate(readLastScreen());
}
function resetSensitiveForms() {
  ['setup-pass','setup-confirm','unlock-pass','import-pass','import-locked-pass','change-pass','change-confirm'].forEach(id=>$(id).value='');
}
async function lock(forgetRememberedKey=false) {
  if(forgetRememberedKey)manualLockRequested=true;
  if(locking||(!keyRef&&!manualLockRequested))return;
  locking=true;
  authGeneration++;
  try {
    await writeQueue.catch(()=>{});
    if(manualLockRequested)await forgetToday();
  }finally{
    keyRef=null;saltRef=null;state=null;unlockedDay=null;renderedWorkout=null;
    resetSensitiveForms();
    window.Nutrition?.clearSession();
    hide('app');hide('nav');hide('lock-btn');
    drawAuth();
    const resume=!manualLockRequested&&!document.hidden;
    manualLockRequested=false;locking=false;
    if(resume)void restoreToday();
  }
}
function persist() {
  if(!state||!keyRef||!saltRef)return Promise.reject(Error('请先解锁保险库'));
  const snapshot=structuredClone(state);
  const key=keyRef,salt=saltRef;
  writeQueue=writeQueue.catch(()=>{}).then(async()=>{
    const env=await seal(snapshot,key,salt);
    localStorage.setItem(VAULT_KEY,JSON.stringify(env));
  });
  return writeQueue;
}
function getSetupNumber(id,min,max) {const v=num(id);if(!validRange(v,min,max))throw Error('请检查营养目标数字是否在合理范围内');return v;}
async function setup(e) {
  e.preventDefault();
  const pass=$('setup-pass').value;
  if(pass.length<12)throw Error('请使用至少12个字符的密码');
  if(pass!==$('setup-confirm').value)throw Error('两次密码不一致');
  if(hasVault())throw Error('已存在加密保险库，请先解锁');
  const start=$('setup-start').value;
  if(!/^\d{4}-\d\d-\d\d$/.test(start))throw Error('请选择计划开始日期');
  const w=num('setup-weight'),wa=num('setup-waist');
  if(w!==null&&!validRange(w,20,400))throw Error('体重填写不正确');
  if(wa!==null&&!validRange(wa,30,250))throw Error('腰围填写不正确');
  const goals={train:getSetupNumber('setup-train-kcal',800,8000),rest:getSetupNumber('setup-rest-kcal',800,8000),free:getSetupNumber('setup-free-kcal',800,10000),protein:getSetupNumber('setup-protein',30,400)};
  const fresh=newState(start,goals,w,wa);
  const legacyExists=!!localStorage.getItem(LEGACY_KEY);
  const migrate=legacyExists&&$('legacy-migrate').checked;
  if(legacyExists&&!migrate&&!confirm('不迁移旧版未加密记录：创建新保险库后将删除旧版明文数据，确定继续？'))return;
  if(migrate)migrateLegacy(fresh);
  const salt=randomBytes(16),key=await deriveKey(pass,salt);
  const env=await seal(fresh,key,salt);
  localStorage.setItem(VAULT_KEY,JSON.stringify(env));
  if(legacyExists)localStorage.removeItem(LEGACY_KEY);
  state=fresh;keyRef=key;saltRef=salt;authGeneration++;
  const remembered=await rememberToday(key,env.salt);
  resetSensitiveForms();unlockUI();
  notify(remembered?(migrate?'旧版记录已迁移并加密':'加密保险库已创建'):'保险库已创建；此浏览器暂不支持当天免密码');
}
async function unlock(e) {
  e.preventDefault();
  const pass=$('unlock-pass').value;
  const env=parseEnvelope(localStorage.getItem(VAULT_KEY));
  let result;
  try {result=await unseal(env,pass);}catch {$('unlock-pass').value='';throw Error('密码不正确，或保险库数据已损坏');}
  state=result.value;keyRef=result.key;saltRef=b64ToBytes(env.salt);authGeneration++;
  const remembered=await rememberToday(result.key,env.salt);
  resetSensitiveForms();unlockUI();notify(remembered?'私人记录已解锁，今天无需重复输入密码':'私人记录已解锁；此浏览器暂不支持当天免密码');
}
async function guarded(btnId,fn) {
  if($(btnId).disabled)return;
  busy(btnId,true);
  try {await fn();}catch(err){showError(err);}finally{busy(btnId,false);}
}
function readLastScreen() {
  try {
    const screen=localStorage.getItem(LAST_SCREEN_KEY);
    return VALID_SCREENS.includes(screen)?screen:'home';
  } catch(err) {
    return 'home';
  }
}
function navigate(screen) {
  if(!state)return;
  if(!VALID_SCREENS.includes(screen))screen='home';
  currentScreen=screen;
  document.querySelectorAll('.screen').forEach(s=>{s.hidden=s.id!==`screen-${screen}`;});
  document.querySelectorAll('[data-screen]').forEach(b=>b.classList.toggle('active',b.dataset.screen===(screen==='library'?'food':screen)));
  if(screen==='home')renderHome();
  if(screen==='train')renderTraining();
  if(screen==='food')renderFood();
  if(screen==='library')window.Nutrition?.renderLibrary();
  if(screen==='progress')renderProgress();
  if(screen==='settings')renderSettings();
  // Keep the last visited page across app closures and same-day re-unlocks.
  try{localStorage.setItem(LAST_SCREEN_KEY,screen);}catch(err){console.warn('RECOMP: last page could not be remembered',err);}
  window.scrollTo(0,0);
}
function activePlan() {return window.RecompPlans.getDefault();}
function planLength() {return activePlan()?.duration_weeks || 8;}
function currentWeek() {return Math.min(planLength(),Math.max(1,weekDifference(state.settings.start,monday(formattedDate(new Date())))+1));}
function trainingDay(d,week=trainWeek+1) {return window.RecompPlans.dayFor(activePlan(),d,week);}
function planTitle(d,week=currentWeek()) {return trainingDay(d,week)?.name || '训练计划未就绪';}
async function loadTrainingPlan() {
  try {await window.RecompPlans.loadDefault();}catch(error){showError(error);}
  if(state){renderHome();renderTraining();}
}
function dayTarget(d) {return d===6?state.settings.free:[0,2].includes(d)?state.settings.rest:state.settings.train;}
function latest(field) {const v=state.measurements.filter(m=>Number(m[field])>0).sort((a,b)=>b.date.localeCompare(a.date));return v.length?v[0][field]:null;}
function renderHome() {
  const d=new Date().getDay();
  const day=trainingDay(d,currentWeek());
  text('today-label',`${formattedDate(new Date())} · 周${DAYS[d]} · 训练与营养计划`);
  text('stat-weight',latest('weight')??'—');text('stat-waist',latest('waist')??'—');
  text('stat-week',currentWeek());text('stat-protein',state.settings.protein);
  text('today-pill',day?({strength:'力量日',basketball:'篮球日',cardio:'有氧日',rest:'恢复日'}[day.type]):'计划未就绪');
  text('today-training',planTitle(d));text('today-description',day?.home_description || day?.description || '请在训练页面重试加载默认计划。');
  text('today-calories',dayTarget(d).toLocaleString());
  text('week-advice',activePlan()?.week_advice?.[currentWeek()-1] || '按当前计划安排训练与恢复。');
}
function drawDays(id,sel,onDay) {
  const container=$(id);container.replaceChildren();
  for(const d of ORDER){const b=el('button','',`周${DAYS[d]}`);b.type='button';b.classList.toggle('active',d===sel);b.addEventListener('click',()=>onDay(d));container.append(b);}
}
// Fold by hiding the live form controls. This preserves unsaved input values.
function makeFoldHeader(kind,title,summary,body,expanded,key) {
  const heading=el('button',kind+' fold-heading');
  heading.type='button';
  heading.setAttribute('aria-controls',body.id);
  const headingText=el('span','fold-summary');
  headingText.append(el('strong','',title));
  if(summary)headingText.append(el('small','',summary));
  const indicator=el('span','fold-indicator');
  heading.append(headingText,indicator);
  const sync=()=>{
    const isOpen=expanded.has(key);
    body.hidden=!isOpen;
    heading.setAttribute('aria-expanded',String(isOpen));
    indicator.textContent=isOpen?'收起 ▴':'展开 ▾';
  };
  heading.addEventListener('click',()=>{
    if(expanded.has(key))expanded.delete(key);else expanded.add(key);
    sync();
  });
  sync();
  return heading;
}
function planDate(week,d) {return shiftDays(state.settings.start,week*7+((d+6)%7));}
function renderTraining() {
  const api=window.RecompPlans,plan=activePlan();
  trainWeek=Math.max(0,Math.min(planLength()-1,trainWeek));
  const day=trainingDay(trainDay),saved=state.workouts[trainDate];
  const actual=saved && Array.isArray(saved.items) ? structuredClone(saved) : null;
  text('train-week-title',`第 ${trainWeek+1} / ${planLength()} 周`);
  text('train-week-range',`${shiftDays(state.settings.start,trainWeek*7)} — ${shiftDays(state.settings.start,trainWeek*7+6)}`);
  busy('week-prev',trainWeek===0);busy('week-next',trainWeek===planLength()-1);
  drawDays('train-days',trainDay,d=>{trainDay=d;trainDate=planDate(trainWeek,d);renderTraining();});
  text('current-plan-label',plan?`${plan.name} · v${plan.plan_version}`:'默认计划尚未加载');
  text('plan-load-status',api.getError()?'默认计划加载失败。历史记录仍可读取，请联网重试。':'');
  hide('plan-retry',!api.getError());
  text('train-title',`周${DAYS[trainDay]} · ${actual?(actual.title || actual.plan_snapshot?.day?.name || '已保存训练（未记录计划名称）'):(day?.name || '训练计划未就绪')}`);
  text('train-note',actual?'正在查看已保存记录，动作和组数来自该记录；保存时仅更新你填写的实际数据。':(day?.description || '计划尚未就绪，可重试加载；已有训练记录不受影响。'));
  $('workout-date').value=trainDate;
  const container=$('workout-list');container.replaceChildren();
  const items=actual?actual.items.map((item,i)=>{
    const snap=actual.plan_snapshot?.day?.exercises;
    const ex=Array.isArray(snap)?(snap.find(x=>x.exercise_id===item.exercise_id)||snap[i]):null;
    return {...(ex || {}),name:item.name,sets:Array.isArray(item.sets)?item.sets.length:0};
  }):(day?.exercises || []).slice().sort((a,b)=>a.order-b.order);
  renderedWorkout={date:trainDate,day:trainDay,week:trainWeek+1,plan,template:day,actual,items,original:JSON.stringify(saved)};
  hide('save-workout',!items.length);
  if(!items.length){container.append(el('div','empty',day?.type==='rest'?'今天不需要填写力量工作组。':actual?'此条记录没有动作组。':'今天没有可填写的动作组。'));text('train-count',day?.name || '计划未就绪');return;}
  let sum=0;
  items.forEach((ex,i)=>{sum+=ex.sets;
    const reps=api.displayRange(ex.reps),rest=api.restLabel(ex.rest_seconds);
    const meta=[reps?`${reps} 次`:null,rest?`休息 ${rest}`:null,ex.rir!==undefined?`RIR ${api.displayRange(ex.rir)}`:null,ex.rpe!==undefined?`RPE ${api.displayRang…13413 tokens truncated…on`、`alternatives`。RIR 为 0–20，RPE 为 1–10，可用单值或 min/max 范围。

计划建议重量不会填入实际训练记录，实际完成状态也不会自动勾选。

未来周次差异使用可选的 `weeks`，例如 `{ "week": 5, "days": [完整的周一配置] }`；仅覆盖指定周的指定星期，未指定的日期沿用 `days`。覆盖后的整周仍须通过相同校验，不维护另一套格式。

不支持日期字符串形式的排程；星期须为 0–6 的数字，周次为 1–duration_weeks。私有计划不要提交到公开仓库，默认配置与 JSON Schema 仅为公共模板。

# 计划与实际记录

计划定义未来模板；历史记录的 `items[].name` 和 `sets` 永远是实际记录来源。日期已有记录时按原动作和原组数回显，手动保存只更新实际输入并保留原有附加字段。旧记录不补造计划名或版本；新记录增加 `plan_id`、`plan_version`、`plan_snapshot`，快照只用于保存当时的计划关联，不能替代实际重量/次数/完成情况。

默认 JSON 加载失败时显示错误与重试按钮，不使用第二份嵌入计划；历史记录仍可读取。计划文件纳入 Service Worker 缓存，已成功加载的 PWA 可离线使用。
