const fs=require('fs'),vm=require('vm');
const data=new Map();
let largeWrites=0;
const localStorage={
  getItem:k=>data.has(k)?data.get(k):null,
  setItem:(k,v)=>{v=String(v); if(v.length>900000){largeWrites++; const e=new Error('quota'); e.name='QuotaExceededError'; throw e;} data.set(k,v)},
  removeItem:k=>data.delete(k)
};
const notices=[];
const window={localStorage,LubricaCore:{Database:{normalize:x=>x}},LubricaSystem:{notify:(...x)=>notices.push(x)}};
const ctx={window,localStorage,console,Date,JSON,Promise,setTimeout,clearTimeout};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('core/storage.js','utf8'),ctx,{filename:'core/storage.js'});
const big={schemaVersion:'2.0',project:{name:'Big'},plants:[],payload:'x'.repeat(1200000)};
const ok=window.LubricaCore.Storage.saveRecoverySync(big,'pagehide');
if(ok!==false) throw new Error('without IndexedDB oversized sync fallback should be skipped');
if(largeWrites!==0) throw new Error('oversized payload was still written to localStorage');
if(notices.length!==0) throw new Error('pagehide quota-safe path must not spam diagnostics');
if(!data.get('lubrica-recovery-meta-v2')) throw new Error('recovery metadata must still be updated');
const app=fs.readFileSync('js/app.js','utf8');
if(!app.includes("flushRecovery('interval')")) throw new Error('30s autosave must use async IndexedDB recovery path');
if(app.includes("flushRecoverySync('interval')")) throw new Error('30s autosave must not use localStorage sync path');
console.log('PASS 1.0.33.45 recovery quota handling');
