const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const win={console};win.window=win;
win.LubricaCore={IDs:{nextFrom(arr,prefix,width=6){
 let max=0;for(const x of arr||[]){const m=String(x.id||'').match(new RegExp('^'+prefix+'-(\\d+)$'));if(m)max=Math.max(max,Number(m[1]));}
 return prefix+'-'+String(max+1).padStart(width,'0');
}}};
const ctx=vm.createContext(win);
for(const file of ['qa/task-readiness.js','qa/qa-engine.js','qa/task-readiness-ui.js','lubrication/analog-transfer.js']){
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
const QA=win.LubricaProgramQA,READ=win.LubricaTaskReadiness,ANALOG=win.LubricaAnalogs;
function fixture(){
 return{
 lines:[{id:'L1',name:'Линия 1'},{id:'L2',name:'Линия 2'}],
 areas:[{id:'A1',lineId:'L1',name:'Упаковки'},{id:'A2',lineId:'L2',name:'Упаковки'}],
 equipment:[{id:'E1',lineId:'L1',areaId:'A1',name:'Конвейер упаковки 1'},
            {id:'E2',lineId:'L2',areaId:'A2',name:'Конвейер упаковки 2'}],
 nodes:[{id:'N1',equipmentId:'E1',name:'Опора'},
        {id:'N2',equipmentId:'E2',name:'Опора'}],
 componentLibraryEntries:[{id:'LIB1',name:'UCP212'}],
 components:[],
 materials:[{id:'MAT1',name:'Пластичная смазка SKF LGEP 2',code:'LGEP2',kind:'Пластичная смазка',density:'0,9',
  sourceReference:'SKF TDS'}, {id:'MAT2',name:'Текущая установленная смазка',code:'CURRENT',kind:'Пластичная смазка'}],
 lubricationPoints:[
  {id:'LP1',equipmentId:'E1',nodeId:'N1',category:'bearing',name:'Приводная опора',
   status:'review',currentMaterialId:'MAT1',targetMaterialId:'MAT1',
   componentBinding:{actualLibraryEntryId:'LIB1',libraryCategory:'bearing'},
   bearing:{effectiveDesignation:'UCP212',bearingType:'bearing_unit',d:60,D:110,B:65,
    calculation:{calculatedAt:'2026-01-01',approvedRelubeDoseG:10,approved:true}}},
  {id:'LP2',equipmentId:'E2',nodeId:'N2',category:'bearing',name:'Приводная опора',
   status:'review',currentMaterialId:'MAT2',targetMaterialId:null,
   componentBinding:{actualLibraryEntryId:'LIB1',libraryCategory:'bearing'},
   bearing:{effectiveDesignation:'UCP212',bearingType:'bearing_unit',d:60,D:110,B:65,
    calculation:{calculatedAt:'2026-01-02',approvedRelubeDoseG:13,approved:true}}}
 ],
 tasks:[
  {id:'TASK-000001',lubricationPointId:'LP1',operation:'Досмазывание',activityType:'regrease',approvalStatus:'approved',
   materialMode:'explicit',materialId:'MAT1',quantity:{approved:'10',unit:'г',source:'SKF OEM'},
   schedule:{legacyText:'2000 ч',source:'SKF OEM'}},
  {id:'TASK-000002',lubricationPointId:'LP2',operation:'Досмазывание',activityType:'regrease',approvalStatus:'review',
   materialMode:'explicit',materialId:null,quantity:{approved:'',unit:'г'},
   schedule:{legacyText:''}},
  {id:'TASK-000003',lubricationPointId:'LP1',operation:'Контроль состояния',activityType:'condition_check',approvalStatus:'disabled',
   materialMode:'none',quantity:{approved:'',unit:''},schedule:{legacyText:'800 ч'}}
 ],
 routes:[],routeRevisions:[],checklistRuns:[],routePlanItems:[],routePlans:[],tools:[]
 };
}
function byTask(report,id){return report.taskCompletion.items.find(x=>x.taskId===id)}
function next(db,id){
 const r=QA.audit(db);
 assert(r.taskCompletion&&r.taskCompletion.total===db.tasks.length);
 return byTask(r,id);
}
let d=fixture(),before=JSON.stringify(d);
let r=QA.audit(d),sum=r.taskCompletion;
assert.equal(JSON.stringify(d),before,'readiness audit must never change DB');
assert.equal(sum.total,3,'every real task counted once, not one per physical point');
assert.equal(sum.disabled,1,'disabled tasks excluded from ready count');
assert.equal(byTask(r,'TASK-000002').next.code,'material','missing material is first repair step');
assert.equal(byTask(r,'TASK-000003').status,'disabled');
assert(sum.lines.some(l=>l.id==='L1')&&sum.lines.some(l=>l.id==='L2'));
const t=d.tasks[1];
t.materialId='MAT1';assert.equal(next(d,t.id).next.code,'quantity','quantity missing after material');
t.quantity.approved='11';assert.equal(next(d,t.id).next.code,'interval','missing interval after quantity');
t.schedule.legacyText='2000 ч';
assert.equal(next(d,t.id).next.code,'evidence','sources to confirm after interval');
t.quantity.source='Подтверждённая методика';t.schedule.source='Паспорт';
let ready=next(d,t.id);
assert.equal(ready.next.code,'approve','no automatic approval after filling data');
assert.equal(ready.status,'review');
t.approvalStatus='approved';
const afterApprove=next(d,t.id);
assert(['ready','attention'].includes(afterApprove.status),'approved task becomes ready or flagged for source review');

const src=d.lubricationPoints[0],target=d.lubricationPoints[1],proof={
 physicalConfirmed:true,reason:'Обследованы одинаковые опоры на двух линиях',
 sourceReference:'Фактический осмотр 05.11.2026 и чертёж вала'
};
d.tasks[1].approvalStatus='review';d.tasks[1].materialId=null;d.tasks[1].quantity.approved='';d.tasks[1].schedule.legacyText='';
const fields={technical:true,material:true,tasks:true,quantity:true,schedule:true,sources:true};
const sourceOriginal=JSON.stringify(src),targetCalc=JSON.stringify(target.bearing);
const p=ANALOG.previewTransfer(d,target,src,fields,proof);
assert.equal(p.ok,true,'same physical bearing plus evidence permits suggestions');
assert.equal(JSON.stringify(d.lubricationPoints[0]),sourceOriginal,'analog preview never modifies source');
assert.equal(JSON.stringify(target.bearing),targetCalc,'analog preview never modifies target OEM');
assert(!ANALOG.previewTransfer(d,target,src,fields,{}).ok,'unconfirmed physical match blocked');
assert(!ANALOG.previewTransfer(d,target,src,fields,{physicalConfirmed:true,reason:'same',sourceReference:''}).ok,
 'reason and evidence mandatory');

const out=ANALOG.applyTransfer(d,target,src,fields,proof);
assert(out.ok&&out.reviewRequired);
assert.equal(target.currentMaterialId,'MAT2','actual installed material must not be copied');
assert.equal(target.targetMaterialId,'MAT1','target lubricant suggested for empty target');
assert.equal(JSON.stringify(target.bearing),targetCalc,'actual geometry and OEM calculation kept');
assert.equal(target.id,'LP2');assert.equal(target.nodeId,'N2');assert.equal(target.equipmentId,'E2');
assert.equal(d.tasks[1].approvalStatus,'review');
assert.equal(d.tasks[1].quantity.approved,'','copied norm cannot be silently approved');
assert.equal(d.tasks[1].quantity.analogSuggested.value,'10','quantity suggestion retained for review');
assert.equal(d.tasks[1].schedule.legacyText,'','interval not silently applied');
assert.equal(d.tasks[1].schedule.analogSuggested.interval,'2000 ч');
assert.equal(target.analogTransfer.sourcePointId,'LP1');
assert.equal(target.analogTransfer.physicalConfirmed,true);
assert.equal(target.analogTransfer.amountsAndIntervalsSuggestedOnly,true);
assert.equal(ANALOG.applyTransfer(d,target,src,fields,proof).ok,true,'repeat transfer safe');
assert.equal(d.tasks.length,3,'repeat does not create duplicate tasks');

target.bearing.D=130;
assert(!ANALOG.previewTransfer(d,target,src,fields,proof).ok,'mismatched physical dimension hard-blocked');
target.bearing.D=110;
d.tasks[1].approvalStatus='approved';
assert(!ANALOG.previewTransfer(d,target,src,fields,proof).ok,'approved task cannot be overwritten');
d.tasks[1].approvalStatus='review';
d.routes=[{id:'R1',taskIds:['TASK-000002']}];
assert(!ANALOG.previewTransfer(d,target,src,fields,proof).ok,'route reference blocks overwrite');
d.routes=[];
d.nodes=d.nodes.filter(n=>n.id!=='N2');
assert(!ANALOG.previewTransfer(d,target,src,fields,proof).ok,'unbound virtual node cannot receive analog');
d.nodes.push({id:'N2',equipmentId:'E2',name:'Опора'});
target.bearing.effectiveDesignation='22212';
target.componentBinding.actualLibraryEntryId='';
target.componentBinding.libraryEntryId='';
assert(!ANALOG.previewTransfer(d,target,src,fields,proof).ok,'different bearing model is not sufficient physical analog');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('./qa/task-readiness.js')&&html.includes('./qa/task-readiness-ui.js'));
assert(html.indexOf('./qa/task-readiness.js')<html.indexOf('./qa/qa-engine.js'));
assert(html.indexOf('./qa/qa-ui.js')<html.indexOf('./qa/task-readiness-ui.js'));
const control=fs.readFileSync(path.join(root,'qa/qa-ui.js'),'utf8');
assert(control.includes('qaTaskCompletionPanel')&&control.includes('LubricaTaskReadinessUI?.render'));
const ui=fs.readFileSync(path.join(root,'qa/task-readiness-ui.js'),'utf8');
for(const token of ['data-ready-line','data-ready-status','data-ready-query','data-ready-open','Почему требуется действие'])
 assert(ui.includes(token),'readiness UI contract '+token);
const analog=fs.readFileSync(path.join(root,'lubrication/analog-transfer.js'),'utf8');
assert(analog.includes('Проверить соответствие')&&analog.includes('analogSafetyPreview'));
assert(!analog.includes('Применить к незаполненным аналогам'),'bulk analog transfer must not bypass physical confirmation');

// Programmatic read-only audit of the original accepted full-machine production fixture.
const production=JSON.parse(fs.readFileSync(path.join(root,
 'project/sources/pp53736/Филиал_завода__Техно__г._Юрга(20260923-051134).json'),'utf8'));
const original=JSON.stringify(production);
const prod=QA.audit(production),c=prod.taskCompletion;
assert.equal(JSON.stringify(production),original,'accepted production fixture must never be modified by audit');
assert.equal(c.total,production.tasks.length);
assert(c.items.every(x=>x.steps.length===7&&x.next.label&&x.taskId),'every production task has seven steps and a next action');
assert(c.total>250&&c.total<production.components.length,'real machine fixture scale is plausible');
console.log('PASS 1.0.33.71: task-specific readiness + safe proposed analog transfer + physical reference, no approval/route mutation',c.total,'tasks');
