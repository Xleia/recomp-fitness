'use strict';

// RECOMP PUBLIC TEMPLATE. Do not place private measurements, login credentials,
// personal calorie targets, or workout journals in this file or the GitHub repo.
const VAULT_KEY = 'recomp.encrypted.v2';
const LEGACY_KEY = 'recomp8week';
const DAILY_DB = 'recomp.daily-unlock.v1';
const DAILY_REVOKED_KEY = 'recomp.daily-unlock.revoked';
const TOKYO_DAY = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'});
const VAULT_VERSION = 2;
const ITERATIONS = 600000;
const AAD = new TextEncoder().encode('RECOMP|encrypted-vault|v2');
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const ORDER = [1,2,3,4,5,6,0];
const MEAL_NAMES = ['早餐', '午餐', '加餐 / 运动补给', '晚餐'];
const EXERCISES = {
  1: {title:'腿＋小腿',desc:'深蹲与髋铰链优先；篮球后疲劳明显时减少工作组。',items:[
    ['杠铃深蹲',3,'6–10','3分钟','2–3'],['罗马尼亚硬拉',3,'8–10','2–3分钟','2'],
    ['腿举机',3,'10–12','2分钟','2'],['腿弯举',3,'10–15','90秒','1–2'],['站姿提踵',3,'12–20','60–90秒','1–2']]},
  3: {title:'胸＋三头＋侧肩',desc:'先胸部复合推举，再做三头与肩中束。',items:[
    ['杠铃卧推',3,'6–10','3分钟','2'],['上斜哑铃卧推',3,'8–12','2分钟','2'],
    ['绳索夹胸',3,'10–15','90秒','1–2'],['绳索三头下压',3,'10–15','90秒','1–2'],
    ['过顶绳索臂屈伸',2,'10–15','90秒','1–2'],['哑铃侧平举',2,'12–20','60秒','1–2']]},
  4: {title:'背＋二头',desc:'兼顾垂直拉与水平拉。保持核心稳定，避免借力。',items:[
    ['辅助引体向上',3,'6–10','2–3分钟','2'],['胸托哑铃划船',3,'8–12','2分钟','2'],
    ['单臂绳索划船',3,'10–12','90秒','1–2'],['绳索直臂下拉',2,'12–15','90秒','1–2'],
    ['哑铃弯举',3,'8–12','90秒','1–2'],['锤式弯举',2,'10–15','60–90秒','1–2']]},
  5: {title:'肩＋核心＋胸部补充',desc:'侧束与后束优先；若肩部未恢复，减少肩推或胸部补充量。',items:[
    ['坐姿哑铃肩推',2,'8–12','2分钟','2–3'],['绳索侧平举',3,'12–20','60–90秒','1–2'],
    ['反向飞鸟',3,'12–20','60–90秒','1–2'],['器械推胸',2,'10–15','2分钟','2'],
    ['绳索卷腹',3,'10–15','60秒','1–2'],['Pallof Press',2,'每侧10–12','60秒','2–3']]}
};
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
const WEEK_ADVICE = [
  '第1周：熟悉动作与配重，维持 RIR 3 左右。',
  '第2周：继续校准重量，优先提高动作稳定性。',
  '第3周：逐步增加重复次数，主观保留 1–2 次。',
  '第4周：在动作规范前提下小幅加重。',
  '第5周：根据疲劳情况将工作组减少约 40%–50%。',
  '第6周：恢复正常训练量，重新渐进。',
  '第7周：争取重复次数或重量上的小幅进步。',
  '第8周：复测主要力量动作、体重与腰围趋势。'
];

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
const foldedExercises=new Set();
const foldedMeals=new Set();

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
  foldedExercises.clear();foldedMeals.clear();
  window.Nutrition?.clearSession();
  $('measure-date').value=formattedDate(new Date());
  renderHome();renderTraining();renderFood();renderProgress();renderSettings();
}
function unlockUI() {
  unlockedDay=todayInTokyo();
  hide('auth');hide('app',false);hide('nav',false);hide('lock-btn',false);
  trainWeek=Math.min(7,Math.max(0,weekDifference(state.settings.start,monday(formattedDate(new Date())))));
  trainDay=new Date().getDay();trainDate=shiftDays(state.settings.start,trainWeek*7+((trainDay+6)%7));
  foodDay=new Date().getDay();foodDate=formattedDate(new Date());
  renderEverything();navigate('home');
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
    keyRef=null;saltRef=null;state=null;unlockedDay=null;
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
function navigate(screen) {
  if(!state)return;
  currentScreen=screen;
  document.querySelectorAll('.screen').forEach(s=>{s.hidden=s.id!==`screen-${screen}`;});
  document.querySelectorAll('[data-screen]').forEach(b=>b.classList.toggle('active',b.dataset.screen===(screen==='library'?'food':screen)));
  if(screen==='home')renderHome();
  if(screen==='train')renderTraining();
  if(screen==='food')renderFood();
  if(screen==='library')window.Nutrition?.renderLibrary();
  if(screen==='progress')renderProgress();
  if(screen==='settings')renderSettings();
  window.scrollTo(0,0);
}
function currentWeek() {return Math.min(8,Math.max(1,weekDifference(state.settings.start,monday(formattedDate(new Date())))+1));}
function planTitle(d) {return EXERCISES[d]?.title||(d===6?'篮球／自由饮食':'休息与恢复');}
function dayTarget(d) {return d===6?state.settings.free:[0,2].includes(d)?state.settings.rest:state.settings.train;}
function latest(field) {const v=state.measurements.filter(m=>Number(m[field])>0).sort((a,b)=>b.date.localeCompare(a.date));return v.length?v[0][field]:null;}
function renderHome() {
  const d=new Date().getDay();
  text('today-label',`${formattedDate(new Date())} · 周${DAYS[d]} · 训练与营养计划`);
  text('stat-weight',latest('weight')??'—');text('stat-waist',latest('waist')??'—');
  text('stat-week',currentWeek());text('stat-protein',state.settings.protein);
  text('today-pill',EXERCISES[d]?'力量日':d===6?'篮球日':'恢复日');
  text('today-training',planTitle(d));text('today-description',EXERCISES[d]?.desc||(d===6?'篮球时注意能量补给；全天自由饮食无需暴食。':'保证睡眠与日常活动，安排恢复。'));
  text('today-calories',dayTarget(d).toLocaleString());
  text('week-advice',WEEK_ADVICE[currentWeek()-1]);
}
function drawDays(id,sel,onDay) {
  const container=$(id);container.replaceChildren();
  for(const d of ORDER){const b=el('button','',`周${DAYS[d]}`);b.type='button';b.classList.toggle('active',d===sel);b.addEventListener('click',()=>onDay(d));container.append(b);}
}
// Fold by hiding the live form controls. This preserves unsaved input values.
function makeFoldHeader(kind,title,summary,body,folded,key) {
  const heading=el('button',kind+' fold-heading');
  heading.type='button';
  heading.setAttribute('aria-controls',body.id);
  const headingText=el('span','fold-summary');
  headingText.append(el('strong','',title));
  if(summary)headingText.append(el('small','',summary));
  const indicator=el('span','fold-indicator');
  heading.append(headingText,indicator);
  const sync=()=>{
    const isClosed=folded.has(key);
    body.hidden=isClosed;
    heading.setAttribute('aria-expanded',String(!isClosed));
    indicator.textContent=isClosed?'展开 ▾':'收起 ▴';
  };
  heading.addEventListener('click',()=>{
    if(folded.has(key))folded.delete(key);else folded.add(key);
    sync();
  });
  sync();
  return heading;
}
function planDate(week,d) {return shiftDays(state.settings.start,week*7+((d+6)%7));}
function renderTraining() {
  text('train-week-title',`第 ${trainWeek+1} / 8 周`);
  text('train-week-range',`${shiftDays(state.settings.start,trainWeek*7)} — ${shiftDays(state.settings.start,trainWeek*7+6)}`);
  busy('week-prev',trainWeek===0);busy('week-next',trainWeek===7);
  drawDays('train-days',trainDay,d=>{trainDay=d;trainDate=planDate(trainWeek,d);renderTraining();});
  text('train-title',`周${DAYS[trainDay]} · ${planTitle(trainDay)}`);
  text('train-note',EXERCISES[trainDay]?.desc||(trainDay===6?'篮球约4小时：按实际强度补水补糖，注意恢复。':'无正式力量训练，允许轻松步行。'));
  $('workout-date').value=trainDate;
  const container=$('workout-list');container.replaceChildren();
  const plan=EXERCISES[trainDay];
  hide('save-workout',!plan);
  if(!plan){container.append(el('div','empty','今天不需要填写力量工作组。'));text('train-count','恢复 / 篮球');return;}
  const saved=state.workouts[trainDate];
  let sum=0;
  plan.items.forEach((ex,i)=>{sum+=ex[1];
    const box=el('div','exercise');
    const foldBody=el('div','fold-body');foldBody.id=`train-fold-${trainDate}-${i}`;
    const key=`${trainDate}:${i}`;
    box.append(makeFoldHeader('exercise-title',`${i+1}. ${ex[0]}`,`${ex[1]} 组 · ${ex[2]} 次`,foldBody,foldedExercises,key),foldBody);
    foldBody.append(el('div','exercise-meta',`${ex[2]} 次 · 休息 ${ex[3]} · RIR ${ex[4]}`));
    const prior=previousExercise(trainDate,ex[0]);
    if(prior)foldBody.append(el('div','prior',`上次：${prior}`));
    const hdr=el('div','set-head');for(const label of ['组','重量 kg','次数','完成'])hdr.append(el('span','',label));foldBody.append(hdr);
    for(let j=0;j<ex[1];j++){
      const vals=saved?.items?.[i]?.sets?.[j]||{};
      const row=el('div','set-row');row.append(el('span','',j+1));
      const weight=el('input');weight.type='number';weight.step='0.5';weight.min='0';weight.max='1000';weight.placeholder='kg';weight.value=vals.w??'';weight.dataset.field='w';weight.dataset.exercise=String(i);weight.dataset.set=String(j);weight.setAttribute('aria-label',`${ex[0]} 第${j+1}组重量`);
      const reps=el('input');reps.type='number';reps.step='1';reps.min='0';reps.max='1000';reps.placeholder='次';reps.value=vals.r??'';reps.dataset.field='r';reps.dataset.exercise=String(i);reps.dataset.set=String(j);reps.setAttribute('aria-label',`${ex[0]} 第${j+1}组次数`);
      const check=el('input');check.type='checkbox';check.checked=!!vals.done;check.dataset.field='done';check.dataset.exercise=String(i);check.dataset.set=String(j);check.setAttribute('aria-label',`${ex[0]} 第${j+1}组完成`);
      row.append(weight,reps,check);foldBody.append(row);
    }
    container.append(box);
  });
  text('train-count',`${sum} 工作组`);
}
function previousExercise(date,name) {
  const arr=Object.values(state.workouts).filter(w=>w&&w.date<date&&Array.isArray(w.items)).sort((a,b)=>b.date.localeCompare(a.date));
  for(const w of arr){const found=w.items.find(x=>x.name===name);if(found){const done=found.sets?.filter(x=>x.done);if(done?.length)return done.map(z=>`${z.w}kg×${z.r}`).slice(0,3).join(' / ');}}
  return null;
}
async function saveWorkout() {
  const p=EXERCISES[trainDay];if(!p)throw Error('当天没有力量训练');
  const date=$('workout-date').value;
  if(!/^\d{4}-\d\d-\d\d$/.test(date))throw Error('请选择有效训练日期');
  if(weekday(date)!==trainDay)throw Error('训练日期与所选星期不一致，请先调整日期');
  const items=p.items.map((ex,i)=>({name:ex[0],sets:Array.from({length:ex[1]},(_,j)=>{
    const f=k=>document.querySelector(`[data-exercise="${i}"][data-set="${j}"][data-field="${k}"]`);
    const w=f('w').value===''?null:Number(f('w').value),r=f('r').value===''?null:Number(f('r').value);
    if((w!==null&&!validRange(w,0,1000))||(r!==null&&!validRange(r,0,1000)))throw Error('重量或次数填写不合理');
    return {w,r,done:f('done').checked};
  })}));
  state.workouts[date]={date,day:trainDay,items};
  await persist();notify('训练记录已加密保存');renderTraining();
}
function blankEntry() {return {kcal:null,protein:null,fat:null,carbs:null,note:''};}
function renderFood() {
  drawDays('food-days',foodDay,d=>{foodDay=d;foodDate=shiftDays(monday(formattedDate(new Date())),(d+6)%7);renderFood();});
  text('food-title',`周${DAYS[foodDay]} · ${foodDay===6?'全天自由饮食':'饮食记录'}`);
  text('food-target',`${dayTarget(foodDay)} kcal 参考`);
  $('food-date').value=foodDate;
  hide('food-banner',foodDay!==6);
  if(foodDay===6)text('food-banner','周六全天自由饮食：火锅、烤肉、拉面等都可以。记录实际摄入与篮球补给，不需要刻意暴食或隔天断食。');
  const saved=state.nutrition[foodDate]||{};
  const manualDraft=window.Nutrition?.manualForDay(foodDate);
  const entries=manualDraft?.entries||(Array.isArray(saved.entries)?saved.entries:MEAL_NAMES.map(blankEntry));
  const container=$('meal-list');container.replaceChildren();
  for(let i=0;i<4;i++){
    const box=el('div','meal');
    const foldBody=el('div','fold-body');foldBody.id=`meal-fold-${foodDate}-${i}`;
    const desc=foodDay===6?'全天可自行选择，不设固定菜谱。':MENU[foodDay]?.[i]||'自行搭配';
    box.append(makeFoldHeader('meal-title',MEAL_NAMES[i],desc,foldBody,foldedMeals,`${foodDate}:${i}`),foldBody);
    if(i===1&&foodDay>=1&&foodDay<=5){
      const select=el('select','meal-options');select.setAttribute('aria-label','选择外食午餐');
      const opt0=el('option','', '选择常见外食（估算数据可修改）');opt0.value='';select.append(opt0);
      LUNCHES.forEach((m,j)=>{const option=el('option','',`${m.name} · ≈${m.kcal}kcal / ${m.protein}g蛋白`);option.value=String(j);select.append(option);});
      select.value=manualDraft?manualDraft.lunch:(Number.isInteger(saved.lunch)?String(saved.lunch):'');
      select.id='lunch-selector';foldBody.append(select);
      const apply=el('button','small-btn','把估算值填入午餐记录');apply.type='button';apply.addEventListener('click',()=>{
        const m=LUNCHES[Number(select.value)];if(select.value===''||!m){notify('请先选择午餐',true);return;}
        for(const k of ['kcal','protein','fat','carbs'])document.querySelector(`[data-meal="1"][data-nutrient="${k}"]`).value=m[k];
        updateTotals();notify('已填入估算值，确认实际份量后再保存');
      });foldBody.append(apply);
    }
    const grid=el('div','meal-grid');
    const current=entries[i]||blankEntry();
    for(const [field,label] of [['kcal','热量 kcal'],['protein','蛋白质 g'],['fat','脂肪 g'],['carbs','碳水 g']]){
      const lab=el('label','',label);const input=el('input','meal-input');input.type='number';input.step=field==='kcal'?'1':'0.1';input.min='0';input.max='10000';input.inputMode='decimal';input.placeholder='0';input.value=current[field]??'';input.dataset.meal=String(i);input.dataset.nutrient=field;input.addEventListener('input',updateTotals);lab.append(input);grid.append(lab);
    }
    foldBody.append(grid);
    const noteBox=el('label','meal-note');const note=el('input');note.type='text';note.maxLength=200;note.placeholder='食物、品牌、份量或备注（可选）';note.value=typeof current.note==='string'?current.note:'';note.dataset.meal=String(i);note.dataset.nutrient='note';noteBox.append(note);foldBody.append(noteBox);
    container.append(box);
  }
  window.Nutrition?.renderMeals();
  updateTotals();
}
function updateTotals() {
  const totals={kcal:0,protein:0,fat:0,carbs:0};
  for(const type of Object.keys(totals))document.querySelectorAll(`[data-nutrient="${type}"]`).forEach(e=>totals[type]+=Number(e.value)||0);
  const automatic=window.Nutrition?.draftTotals(foodDate)||{};
  for(const type of Object.keys(totals))totals[type]+=Number(automatic[type])||0;
  const {kcal,protein,fat,carbs}=totals;
  text('total-kcal',`${Math.round(kcal)} kcal`);text('total-protein',`${Math.round(protein*10)/10} g`);
  text('total-fat',`${Math.round(fat*10)/10} g`);text('total-carbs',`${Math.round(carbs*10)/10} g`);
  const goal=dayTarget(foodDay);$('kcal-fill').style.width=`${Math.min(100,Math.max(0,(kcal/goal)*100))}%`;
  text('remaining-kcal',`${kcal>goal?'高于参考目标':'距离参考目标'} ${Math.abs(Math.round(goal-kcal))} kcal · 以长期平均和训练恢复为准`);
}
async function saveFood() {
  const date=$('food-date').value;
  if(!/^\d{4}-\d\d-\d\d$/.test(date)||weekday(date)!==foodDay)throw Error('记录日期和星期不一致');
  const entries=[];
  for(let i=0;i<4;i++){
    let entry={};
    for(const k of ['kcal','protein','fat','carbs']){
      const input=document.querySelector(`[data-meal="${i}"][data-nutrient="${k}"]`);
      const n=input.value===''?null:Number(input.value);
      if(n!==null&&!validRange(n,0,10000))throw Error('请检查营养数字');
      entry[k]=n;
    }
    entry.note=document.querySelector(`[data-meal="${i}"][data-nutrient="note"]`).value.slice(0,200);
    entries.push(entry);
  }
  const lunch=$('lunch-selector');
  const foodItems=window.Nutrition?.collectRows(date)||Array.from({length:4},()=>[]);
  state.nutrition[date]={date,entries,lunch:lunch&&lunch.value!==''?Number(lunch.value):null,foodItems};
  await persist();window.Nutrition?.savedDay(date);window.Nutrition?.savedManual(date);notify('饮食已加密保存');renderFood();
}
async function saveMeasure() {
  const date=$('measure-date').value,w=num('measure-weight'),wa=num('measure-waist');
  if(!/^\d{4}-\d\d-\d\d$/.test(date))throw Error('请选择有效日期');
  if(w===null&&wa===null)throw Error('至少填写体重或腰围之一');
  if(w!==null&&!validRange(w,20,400)||wa!==null&&!validRange(wa,30,250))throw Error('身体测量数值超出合理范围');
  const idx=state.measurements.findIndex(x=>x.date===date);
  if(idx>=0)state.measurements[idx]={date,weight:w,waist:wa};else state.measurements.push({date,weight:w,waist:wa});
  await persist();notify('身体数据已加密保存');renderProgress();renderHome();
}
function chart(id,field,unit) {
  const svg=$(id);svg.replaceChildren();
  const data=state.measurements.filter(x=>validRange(Number(x[field])||null,0.01,500)).sort((a,b)=>a.date.localeCompare(b.date)).slice(-16);
  const ns='http://www.w3.org/2000/svg';
  const add=(tag,attrs,txt)=>{let x=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,String(v));if(txt!==undefined)x.textContent=String(txt);svg.append(x);};
  if(!data.length){add('text',{x:10,y:75,fill:'#b6c6d9','font-size':13},'尚无记录');return;}
  const values=data.map(x=>Number(x[field]));
  let low=Math.min(...values)-1,high=Math.max(...values)+1;
  const points=data.map((x,i)=>({x:data.length===1?170:20+i*300/(data.length-1),y:115-(Number(x[field])-low)/(high-low)*88}));
  add('line',{x1:15,x2:328,y1:120,y2:120,stroke:'#41566f','stroke-width':1});
  if(points.length>1)add('polyline',{points:points.map(p=>`${p.x},${p.y}`).join(' '),fill:'none',stroke:'#65e2b5','stroke-width':2.5,'stroke-linejoin':'round'});
  points.forEach((p,i)=>{add('circle',{cx:p.x,cy:p.y,r:3.5,fill:'#65e2b5'});if(i===0||i===points.length-1||points.length===1)add('text',{x:p.x,y:p.y-12,'font-size':11,fill:'#dcebf7','text-anchor':'middle'},`${values[i]}${unit}`);});
  add('text',{x:15,y:145,'font-size':10,fill:'#93a8c0'},data[0].date);
  add('text',{x:328,y:145,'text-anchor':'end','font-size':10,fill:'#93a8c0'},data[data.length-1].date);
}
function histRow(top,small,onDelete) {
  const d=el('div','history-item');const info=el('div');info.append(el('div','',top));if(small)info.append(el('small','',small));d.append(info);
  if(onDelete){const btn=el('button','','删除');btn.type='button';btn.addEventListener('click',onDelete);d.append(btn);}
  return d;
}
function renderProgress() {
  chart('weight-chart','weight','kg');chart('waist-chart','waist','cm');
  const measures=$('measure-history');measures.replaceChildren();
  const rows=state.measurements.slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(!rows.length)measures.append(el('div','empty','尚无测量记录'));
  for(const x of rows.slice(0,30))measures.append(histRow(x.date,`体重 ${x.weight??'—'} kg · 腰围 ${x.waist??'—'} cm`,async()=>{
    if(!confirm(`删除 ${x.date} 的测量记录？`))return;
    state.measurements=state.measurements.filter(m=>m.date!==x.date);
    try {await persist();notify('记录已删除');renderProgress();}catch(err){showError(err);}
  }));
  const workouts=$('workout-history');workouts.replaceChildren();
  const list=Object.values(state.workouts).filter(w=>w&&Array.isArray(w.items)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  if(!list.length)workouts.append(el('div','empty','还没有训练记录'));
  for(const x of list)workouts.append(histRow(`${x.date} · ${planTitle(x.day)}`,`完成 ${x.items.reduce((s,it)=>s+(it.sets||[]).filter(a=>a.done).length,0)} 组`));
  const food=$('food-history');food.replaceChildren();
  const fed=Object.entries(state.nutrition).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,20);
  if(!fed.length)food.append(el('div','empty','还没有饮食记录'));
  for(const [date,item] of fed){const entries=Array.isArray(item.entries)?item.entries:[];const items=Array.isArray(item.foodItems)?item.foodItems.flat():[];const kcal=entries.reduce((s,x)=>s+(Number(x.kcal)||0),0)+items.reduce((s,x)=>s+(Number(x.snap?.kcal)||0),0);const protein=entries.reduce((s,x)=>s+(Number(x.protein)||0),0)+items.reduce((s,x)=>s+(Number(x.snap?.protein)||0),0);food.append(histRow(date,`${Math.round(kcal)} kcal · 蛋白质 ${Math.round(protein*10)/10} g`));}
}
function renderSettings() {
  const goal=state.settings;
  $('setting-start').value=goal.start;
  $('setting-train').value=goal.train;
  $('setting-rest').value=goal.rest;
  $('setting-free').value=goal.free;
  $('setting-protein').value=goal.protein;
}
async function saveSettings() {
  const start=$('setting-start').value;
  if(!/^\d{4}-\d\d-\d\d$/.test(start))throw Error('请选择有效开始日期');
  const entries=[['setting-train',800,8000,'train'],['setting-rest',800,8000,'rest'],['setting-free',800,10000,'free'],['setting-protein',30,400,'protein']];
  const updates={start:monday(start)};
  for(const [id,min,max,key] of entries){const n=num(id);if(!validRange(n,min,max))throw Error('请检查营养目标');updates[key]=n;}
  state.settings=updates;await persist();notify('个人目标已加密保存');renderHome();
}
async function exportBackup() {
  await writeQueue;
  const raw=localStorage.getItem(VAULT_KEY);
  if(!raw)throw Error('当前没有可导出的加密保险库');
  parseEnvelope(raw);
  const blob=new Blob([JSON.stringify(JSON.parse(raw),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=el('a');a.href=url;a.download=`RECOMP_encrypted_backup_${formattedDate(new Date())}.json`;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
  notify('加密备份已生成，请妥善保存');
}
async function importBackup(file,password) {
  if(!file)throw Error('请先选择加密备份');
  if(file.size>8*1024*1024||file.size<100)throw Error('备份文件体积异常');
  if(!password)throw Error('请输入备份密码');
  const env=parseEnvelope(await file.text());
  let result;
  try{result=await unseal(env,password);}catch{throw Error('备份密码错误或文件已损坏');}
  if(!confirm('将用该加密备份替换本机现有记录。现有记录将被覆盖，确定继续？'))return;
  await writeQueue.catch(()=>{});
  authGeneration++;
  await forgetToday();
  localStorage.setItem(VAULT_KEY,JSON.stringify(env));
  localStorage.removeItem(LEGACY_KEY);
  state=result.value;keyRef=result.key;saltRef=b64ToBytes(env.salt);
  const remembered=await rememberToday(result.key,env.salt);
  resetSensitiveForms();unlockUI();notify(remembered?'已导入并验证加密备份':'备份已导入；此浏览器暂不支持当天免密码');
}
async function changePassword() {
  if(!state||!keyRef)throw Error('请先解锁');
  const pass=$('change-pass').value;
  if(pass.length<12||pass.length>200)throw Error('新密码至少12个字符');
  if(pass!==$('change-confirm').value)throw Error('两次密码不一致');
  if(!confirm('修改密码后，旧备份仍需要原密码。确定重新加密？'))return;
  await writeQueue;
  const salt=randomBytes(16),key=await deriveKey(pass,salt);
  const env=await seal(state,key,salt);
  authGeneration++;
  await forgetToday();
  localStorage.setItem(VAULT_KEY,JSON.stringify(env));
  saltRef=salt;keyRef=key;
  const remembered=await rememberToday(key,env.salt);
  resetSensitiveForms();notify(remembered?'密码已修改，所有记录重新加密':'密码已修改；此浏览器暂不支持当天免密码');
}
async function purgeVault() {
  if(!confirm('这会永久删除此设备的全部加密记录。请先确认已妥善备份。继续吗？'))return;
  if(!confirm('最后确认：真的删除整个本地保险库吗？'))return;
  authGeneration++;
  await writeQueue.catch(()=>{});
  await forgetToday();
  localStorage.removeItem(VAULT_KEY);
  window.Nutrition?.clearSession();
  state=null;keyRef=null;saltRef=null;unlockedDay=null;drawAuth();notify('本机加密保险库已删除');
}
function init() {
  window.Nutrition?.init();
  $('setup-start').value=monday(formattedDate(new Date()));
  $('measure-date').value=formattedDate(new Date());
  $('setup-form').addEventListener('submit',e=>guarded('setup-submit',()=>setup(e)));
  $('unlock-form').addEventListener('submit',e=>guarded('unlock-submit',()=>unlock(e)));
  $('lock-btn').addEventListener('click',()=>lock(true));
  $('manual-lock').addEventListener('click',()=>lock(true));
  $('home-train').addEventListener('click',()=>navigate('train'));
  $('home-food').addEventListener('click',()=>navigate('food'));
  document.querySelectorAll('[data-screen]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.screen)));
  $('week-prev').addEventListener('click',()=>{if(trainWeek>0){trainWeek--;trainDate=planDate(trainWeek,trainDay);renderTraining();}});
  $('week-next').addEventListener('click',()=>{if(trainWeek<7){trainWeek++;trainDate=planDate(trainWeek,trainDay);renderTraining();}});
  $('workout-date').addEventListener('change',()=>{const date=$('workout-date').value;if(date&&/^\d{4}-\d\d-\d\d$/.test(date)){trainDay=weekday(date);trainDate=date;trainWeek=Math.max(0,Math.min(7,weekDifference(state.settings.start,monday(date))));renderTraining();}});
  $('food-date').addEventListener('change',()=>{const date=$('food-date').value;if(date&&/^\d{4}-\d\d-\d\d$/.test(date)){foodDay=weekday(date);foodDate=date;renderFood();}});
  $('save-workout').addEventListener('click',()=>guarded('save-workout',saveWorkout));
  $('save-food').addEventListener('click',()=>guarded('save-food',saveFood));
  $('save-measure').addEventListener('click',()=>guarded('save-measure',saveMeasure));
  $('save-settings').addEventListener('click',()=>guarded('save-settings',saveSettings));
  $('backup-btn').addEventListener('click',()=>guarded('backup-btn',exportBackup));
  $('import-btn').addEventListener('click',()=>guarded('import-btn',()=>importBackup($('import-file').files[0],$('import-pass').value)));
  $('import-locked-btn').addEventListener('click',()=>guarded('import-locked-btn',()=>importBackup($('import-locked-file').files[0],$('import-locked-pass').value)));
  $('change-btn').addEventListener('click',()=>guarded('change-btn',changePassword));
  $('delete-vault').addEventListener('click',()=>guarded('delete-vault',purgeVault));
  $('delete-legacy').addEventListener('click',()=>{
    if(!confirm('确定删除旧版未加密记录吗？无法恢复，建议先确保你不再需要它。'))return;
    localStorage.removeItem(LEGACY_KEY);hide('legacy-notice');notify('旧版明文记录已删除');
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)void lock();else handleReturn();});
  window.addEventListener('pagehide',()=>{void lock();});
  window.addEventListener('pageshow',handleReturn);
  window.addEventListener('focus',handleReturn);
  setInterval(()=>{if(!document.hidden&&keyRef&&unlockedDay!==todayInTokyo())void lock(true);},60000);
  try{drawAuth();void restoreToday();}catch(err){showError(err);}
  if('serviceWorker' in navigator&&window.isSecureContext)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('offline cache unavailable',err)));
}
document.addEventListener('DOMContentLoaded',init);
