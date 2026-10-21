const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const {webcrypto}=require('node:crypto');
class Element{
 constructor(doc,tag='div'){this.doc=doc;this.tag=tag;this.children=[];this.dataset={};this.listeners={};this.value='';this.checked=false;this.hidden=false;this.disabled=false;this.attrs={};this.textContent='';this.classList={toggle(){},add(){},remove(){}};}
 set id(v){this._id=v;this.doc.ids[v]=this;}get id(){return this._id;}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}removeAttribute(k){delete this.attrs[k];}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}async fire(k){for(const fn of this.listeners[k]||[])await fn({preventDefault(){}});}
}
function harness(){
 const doc={ids:{},listeners:{},hidden:false,readyState:'loading',createElement(tag){return new Element(this,tag);},getElementById(id){return this.ids[id]||null;},addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);},querySelector(selector){const matches=[...selector.matchAll(/data-(exercise|set|field)="([^"]+)"/g)];const scan=el=>{if(matches.length&&matches.every(([,k,v])=>el.dataset?.[k]===v))return el;for(const child of el.children||[]){const found=scan(child);if(found)return found;}return null;};return Object.values(this.ids).map(scan).find(Boolean)||null;},querySelectorAll(){return [];}};
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');for(const m of html.matchAll(/id="([^"]+)"/g)){const e=new Element(doc);e.id=m[1];}
 const storage=new Map(),window={addEventListener(){},scrollTo(){}};
 const context=vm.createContext({document:doc,window,navigator:{},localStorage:{getItem:k=>storage.get(k)||null,setItem(k,v){storage.set(k,v);},removeItem:k=>storage.delete(k)},crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Intl,Date,JSON,structuredClone,setTimeout,clearTimeout,Blob,File,atob,btoa,confirm:()=>true,console,fetch:async()=>({ok:true,json:async()=>structuredClone(require('../plans/default-plan.json'))})});
 for(const filename of ['training-plans.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../'+filename),'utf8'),context);
 const run=code=>vm.runInContext(code,context);
 async function ready(){await window.RecompPlans.loadDefault(context.fetch);await run(`(async()=>{state=newState('2026-10-19',{train:2400,rest:2100,free:2600,protein:140},null,null);keyRef=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);saltRef=crypto.getRandomValues(new Uint8Array(16));trainDate='2026-10-21';trainDay=3;trainWeek=0;await persist();})();`);}
 return {doc,storage,context,run,window,ready};
}
module.exports={harness};
