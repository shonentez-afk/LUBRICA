'use strict';
const assert=require('assert/strict');
const fs=require('fs');
const source=fs.readFileSync('core/database-session-ui.js','utf8');
const json=x=>JSON.stringify(x,null,2),copy=x=>JSON.parse(JSON.stringify(x));
function defer(){let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
function stale(){const e=new Error('An operation that depends on state cached in an interface object was made but the state had changed since it was read from disk.');e.name='InvalidStateError';return e}
function file(name='base.json',initial={v:0}){
 let bytes=json(initial),writers=0;
 const h={name,attempts:0,commits:0,aborts:0,maxWriters:0,reads:0,failRead:0,failCreate:0,failClose:0,commitThenFail:0,beforeWrite:null,afterWrite:null,
  get bytes(){return bytes},set bytes(v){bytes=v},
  async isSameEntry(other){return this===other},
  async getFile(){h.reads++;const captured=bytes;return {async text(){if(h.failRead){h.failRead--;throw stale()}return captured}}},
  async createWritable(options){
   assert.equal(options.mode,'exclusive');h.attempts++;if(h.failCreate){h.failCreate--;throw stale()}
   writers++;h.maxWriters=Math.max(h.maxWriters,writers);let tmp='',closed=false;
   const finish=()=>{if(!closed){closed=true;writers--}};
   return {async write(s){if(h.beforeWrite)await h.beforeWrite();tmp=s;if(h.afterWrite)await h.afterWrite()},async close(){if(h.failClose){h.failClose--;throw stale()}bytes=tmp;h.commits++;finish();if(h.commitThenFail){h.commitThenFail--;throw stale()}},async abort(){h.aborts++;finish()}};
  }
 };return h;
}
function fixture(){
 let db={v:0},demo=false;const notes=[],toasts=[],recovery=[],timers=new Map(),el={textContent:''},listeners={};let id=0,valid=true;
 const core={State:{getDatabase:()=>db,isDemo:()=>demo},Storage:{saveRecovery:async d=>{recovery.push(copy(d));return true},archiveCurrent:async()=>true},DatabaseSafety:{inspect:()=>({ok:valid,issues:valid?[]:['bad']})}};
 const window={LubricaCore:core,LubricaSystem:{notify:m=>notes.push(m)},addEventListener:(n,f)=>{listeners[n]=f}};
 const fire=reason=>listeners['lubrica:database-changed']({detail:{reason}});
 const handleFiles=async files=>{db=JSON.parse(await files[0].text());fire('activate')};
 const api=new Function('window','LubricaCore','console','setTimeout','clearTimeout','$','toast','APP_VERSION','handleFiles','flushRecovery','confirm','updateProjectName',source+'\nreturn{bindDatabaseFile,queueFileSave,autosaveActiveFile,scheduleFileAutosave,exportJson,openJsonSelected,session:()=>activeFileSession,drain:()=>fileWriteTail};')(window,core,{warn(){}},fn=>{timers.set(++id,fn);return id},n=>timers.delete(n),()=>el,m=>toasts.push(m),'TEST',handleFiles,async()=>true,()=>false,()=>{});
 const bind=h=>api.bindDatabaseFile(h,h.bytes);
 return {api,window,notes,toasts,recovery,el,bind,fire,timers,set:v=>{db=v},invalid:()=>{valid=false},demo:()=>{demo=true},async tick(){const a=[...timers.values()];timers.clear();for(const fn of a)fn();await api.drain()}};
}
async function main(){
 let passed=0;
 async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
 await test('simultaneous manual and auto writes serialize, latest edit survives',async()=>{
  const x=fixture(),h=file(),started=defer(),resume=defer();x.bind(h);x.set({v:1});
  h.beforeWrite=async()=>{h.beforeWrite=null;started.resolve();await resume.promise};
  const a=x.api.autosaveActiveFile();await started.promise;x.set({v:2});const b=x.api.exportJson();x.set({v:3});x.fire('update');const timer=x.tick();resume.resolve();await Promise.all([a,b,timer]);assert.equal(h.maxWriters,1);assert.equal(JSON.parse(h.bytes).v,3);assert.equal(x.notes.length,0);
 });
 await test('stale read and stale stream creation retry with fresh state',async()=>{const x=fixture(),h=file();x.bind(h);x.set({v:1});h.failRead=1;h.failCreate=1;assert(await x.api.autosaveActiveFile());assert.equal(h.attempts,2);assert.equal(JSON.parse(h.bytes).v,1);assert.equal(x.notes.length,0)});
 await test('stale close aborts and retries once',async()=>{const x=fixture(),h=file();x.bind(h);x.set({v:1});h.failClose=1;assert(await x.api.autosaveActiveFile());assert.equal(h.aborts,1);assert.equal(h.commits,1);assert.equal(h.maxWriters,1)});
 await test('close already committed before error is not rewritten',async()=>{const x=fixture(),h=file();x.bind(h);x.set({v:1});h.commitThenFail=1;assert(await x.api.autosaveActiveFile());assert.equal(h.commits,1);assert.equal(h.attempts,1)});
 await test('external edit before write preserved, recovery updated once',async()=>{const x=fixture(),h=file();x.bind(h);x.set({v:1});h.bytes=json({v:9});assert.equal(await x.api.autosaveActiveFile(),false);assert.equal(h.bytes,json({v:9}));assert.equal(h.attempts,0);assert.deepEqual(x.recovery,[{v:1}]);assert.equal(x.notes.length,1);assert.equal(await x.api.autosaveActiveFile(),false);assert.equal(x.notes.length,1)});
 await test('external edit during write aborts temporary stream',async()=>{const x=fixture(),h=file();x.bind(h);x.set({v:1});h.afterWrite=async()=>{h.bytes=json({v:8})};assert.equal(await x.api.autosaveActiveFile(),false);assert.equal(h.bytes,json({v:8}));assert.equal(h.commits,0);assert.equal(h.aborts,1)});
 await test('database activation invalidates queued and current old-file writes',async()=>{const x=fixture(),h=file(),started=defer(),resume=defer();x.bind(h);x.set({v:1});h.beforeWrite=async()=>{started.resolve();await resume.promise};const a=x.api.autosaveActiveFile();await started.promise;const b=x.api.autosaveActiveFile();x.set({v:99});x.fire('activate');resume.resolve();await Promise.all([a,b]);assert.equal(h.bytes,json({v:0}));assert.equal(x.api.session(),null);assert.equal(x.notes.length,0)});
 await test('manual save after conflict rejects old file and preserves separate copy',async()=>{const x=fixture(),h=file(),other=file('copy.json');x.bind(h);x.set({v:1});h.bytes=json({v:7});assert.equal(await x.api.autosaveActiveFile(),false);x.window.showSaveFilePicker=async()=>h;await x.api.exportJson();assert.equal(h.bytes,json({v:7}));x.window.showSaveFilePicker=async()=>other;await x.api.exportJson();assert.equal(JSON.parse(other.bytes).v,1);assert.equal(x.api.session().handle,other);x.set({v:2});assert(await x.api.autosaveActiveFile());assert.equal(JSON.parse(other.bytes).v,2);assert.equal(JSON.parse(h.bytes).v,7)});
 await test('no-op autosave does not open writer, repeated edits debounce',async()=>{const x=fixture(),h=file();x.bind(h);assert(await x.api.autosaveActiveFile());assert.equal(h.attempts,0);x.set({v:1});x.fire('update');x.set({v:2});x.fire('update');assert.equal(x.timers.size,1);await x.tick();assert.equal(JSON.parse(h.bytes).v,2);assert.equal(h.commits,1);assert(await x.api.autosaveActiveFile());assert.equal(h.commits,1)});
 await test('invalid JSON does not rebind previous session',async()=>{const x=fixture(),h=file(),bad=file('bad.json');x.bind(h);bad.bytes='broken';assert.equal(await x.api.openJsonSelected({name:bad.name,text:async()=>bad.bytes},bad),false);assert.equal(x.api.session().handle,h);x.set({v:4});assert(await x.api.autosaveActiveFile());assert.equal(JSON.parse(h.bytes).v,4)});
 await test('persistent stale error pauses without repeated writes',async()=>{const x=fixture(),h=file();x.bind(h);x.set({v:1});h.failCreate=3;assert.equal(await x.api.autosaveActiveFile(),false);assert.equal(h.attempts,2);assert.equal(h.commits,0);assert.equal(x.notes.length,1);assert.equal(await x.api.autosaveActiveFile(),false);assert.equal(h.attempts,2)});
 await test('integrity errors block disk write and retain current recovery',async()=>{const x=fixture(),h=file();x.bind(h);x.set({v:6});x.invalid();assert.equal(await x.api.autosaveActiveFile(),false);assert.equal(h.attempts,0);assert.deepEqual(x.recovery,[{v:6}])});
 console.log('JSON AUTOSAVE QUEUE PASS: '+passed+' scenarios');
}
main().catch(e=>{console.error(e);process.exitCode=1});
