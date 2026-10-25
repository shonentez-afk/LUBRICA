const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const window={};window.window=window;const ctx={window,console,Date,Map,Set,Array,Object,String,Number,Boolean,Math,JSON,RegExp};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'core/database-schema.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'core/database-normalizer.js'),'utf8'),ctx);
const db={schemaVersion:'2.0',appVersion:'1.0.33.24',project:{name:'T'},plants:[],lines:[],areas:[],equipment:[],components:[],nodes:[],materials:[],routes:[],checklistRuns:[],tools:[],imports:[],bearingOverrides:[],componentLibraryEntries:[],lubricationPoints:[
 {id:'LP-C',category:'chain',chain:{calculation:{calculatedAt:'2026-09-15T00:00:00Z',calculatedVolumeMl:12.5,calculatedMassG:10,approvedVolumeMl:12.5,approvedHours:500,calculatedInterval:{hours:500,rule:'hours'},quantitySource:'LUBRICA Chain',intervalSource:'LUBRICA Chain'}}},
 {id:'LP-G',category:'gearbox_oil',gearboxOil:{calculation:{calculatedAt:'2026-09-15T00:00:00Z',effectiveFillLiters:2.4,approvedFillLiters:2.4,changeMonths:36,interval:{rule:'calendar'},fillSource:'OEM',intervalSource:'OEM'}}}
],tasks:[
 {id:'TC',lubricationPointId:'LP-C',activityType:'lubricant_apply',operation:'Нанесение смазки',quantity:{approved:'',unit:'мл'},schedule:{legacyText:'',strategy:'По календарю'},approvalStatus:'review'},
 {id:'TG',lubricationPointId:'LP-G',activityType:'oil_change',operation:'Замена масла',quantity:{approved:'',unit:'л'},schedule:{legacyText:'',strategy:'По календарю'},approvalStatus:'review'}
]};
const out=window.LubricaCore.DatabaseNormalizer.normalize(db);
const tc=out.tasks.find(x=>x.id==='TC'),tg=out.tasks.find(x=>x.id==='TG');
assert.equal(tc.quantity.approved,'12.5');assert.equal(tc.schedule.legacyText,'500 ч');assert.equal(tc.schedule.runtimeHours,500);assert.equal(tc.schedule.strategy,'По наработке');
assert.equal(tg.quantity.approved,'2.4');assert.equal(tg.schedule.legacyText,'36 мес.');assert.equal(tg.schedule.calendarValue,36);assert.equal(tg.schedule.calendarUnit,'months');
const chain=fs.readFileSync(path.join(root,'calculations/chain-adapter.js'),'utf8');
assert(chain.includes("filter(t=>String(t.lubricationPointId||'')===String(point.id||'')"));assert(chain.includes("task.schedule.legacyText=`${hours} ч`"));
const gb=fs.readFileSync(path.join(root,'calculations/gearbox-oil-adapter.js'),'utf8');
assert(gb.includes("task.schedule.legacyText=`${m} мес.`"));assert(gb.includes("filter(t=>String(t.lubricationPointId||'')===String(point.id||''))"));
console.log('PASS 1.0.33.25 chain + gearbox task sync');
