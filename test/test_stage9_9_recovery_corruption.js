const fs=require('fs'),vm=require('vm'),path=require('path');
const base=path.resolve(__dirname,'..'),store=new Map();
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const window={localStorage,LubricaCore:{},LubricaSystem:{notify:()=>{}},dispatchEvent:()=>{},addEventListener:()=>{}};
const ctx={window,localStorage,console,Date,JSON,Promise,TextEncoder,CustomEvent:function(){},setTimeout,clearTimeout};vm.createContext(ctx);
for(const rel of ['core/ids.js','core/database-schema.js','core/database-normalizer.js','core/database-migrations.js','core/database.js','core/migration.js','core/database-safety.js','core/storage.js'])vm.runInContext(fs.readFileSync(path.join(base,rel),'utf8'),ctx,{filename:rel});
const C=window.LubricaCore;
function ok(v,m){if(!v)throw new Error(m)}
(async()=>{
 const legacy={project:'Legacy recovery',materials:[],rules:{},points:[{id:'P1',line:'L1',scope:'A',equipment:'E',unit:'U',type:'bearing',operation:'Осмотр',interval:'1 неделя',status:'ready',verified:true}]};
 store.set(C.Storage.KEY_V2,'{"broken":');
 store.set(C.Storage.KEY_V1,JSON.stringify(legacy));
 const recovered=await C.Storage.loadRecovery();
 ok(recovered&&recovered.schemaVersion==='2.0','did not fall back from corrupt v2 recovery to legacy v1');
 ok(recovered.tasks.length===1,'legacy recovery task lost');

 const bad=C.Database.createEmpty('Bad');bad.tasks=[{id:'DUP'},{id:'DUP'}];
 store.set(C.Storage.KEY_V2,JSON.stringify(bad));
 store.delete(C.Storage.KEY_V1);
 const rejected=await C.Storage.loadRecovery();
 ok(rejected===null,'semantically corrupt recovery was opened');

 const valid=C.Database.createEmpty('Valid');valid.lines=[{id:'L1',name:'Line'}];
 store.set(C.Storage.KEY_V2,JSON.stringify(valid));
 const restored=await C.Storage.loadRecovery();
 ok(restored&&restored.project.name==='Valid','valid recovery failed');
 console.log('STAGE 9.9 RECOVERY CORRUPTION TEST PASS');
})().catch(e=>{console.error(e);process.exit(1)});
