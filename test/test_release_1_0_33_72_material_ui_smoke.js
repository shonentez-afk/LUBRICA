const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const db={
 materials:[{id:'MAT-0003',code:'GEAR-001',name:'Mobilgear 600 XP 220',kind:'Редукторное масло',
  density:'15,6',isoVg:'220',baseViscosity40:'150',sourceReference:'',approved:true,status:'active'}],
 lubricationPoints:[{id:'LP1',targetMaterialId:'MAT-0003'}],
 tasks:[{id:'TASK1',lubricationPointId:'LP1',materialMode:'point_target',approvalStatus:'approved',
  quantity:{approved:'2',unit:'л'}}],
 routes:[{id:'R1',taskIds:['TASK1']}],checklistRuns:[{id:'F1',taskResults:[{taskId:'TASK1'}]}],
 tools:[]
};
const before=JSON.stringify(db),events=[],pending=[],dialogs=[],inputs={};
let currentDb=db;
function field(name,props){inputs['#'+name]={value:'',checked:false,...props}}
for(const [name,value] of Object.entries({
 libMatName:'Mobilgear 600 XP 220',libMatKind:'Редукторное масло',libMatDensity:'0,89',
 libMatVis40:'220',libMatIsoVg:'220',libMatSourceReference:'TDS Mobilgear 600 XP 220 verified revision',
 libMatDensitySource:'Product TDS @15.6 C',libMatStatus:'active'
}))field(name,{value});
field('libMatApproved',{checked:true});
field('matCorrectionReason',{value:'Correction from product technical datasheet'});
const $=name=>inputs[name]||(inputs[name]={value:'',checked:false});
const view={dataset:{},innerHTML:'',querySelectorAll:()=>[]};
const win={
 console,window:null,
 LubricaCore:{
  IDs:{nextFrom:()=> 'MAT-0004'},
  State:{getDatabase:()=>currentDb,setDatabase:next=>{events.push('setDatabase');currentDb=next;return {points:[]}}}
 },
 LubricaApp:{showToast:()=>{}}
};
win.window=win;
const ctx=vm.createContext({
 window:win,LubricaCore:win.LubricaCore,console,view,materialRef:db.materials[0],$,
 state:null,toast:()=>{},esc:v=>String(v??''),
 openAction:(title,text,buttons,body)=>dialogs.push({title,text,buttons,body}),
 queueMicrotask:fn=>pending.push(fn),
 document:{body:{appendChild:()=>{}},createElement:()=>({
  click(){events.push('download');assert(this.download.includes('LUBRICA_material_backup_'))},
  remove(){}
 })},
 Blob:class{constructor(parts){assert(parts[0].includes('"density": "15,6"'),'backup contains prior values')}},
 URL:{createObjectURL:()=> 'blob:local-backup',revokeObjectURL:()=>{}},
 setTimeout:()=>{},Date,JSON
});
for(const rel of ['materials/material-correction.js','materials/library-ui.js']){
 vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
}
vm.runInContext('materialDialog36(view,materialRef)',ctx);
assert.equal(dialogs.length,1);
assert.equal(dialogs[0].title,'Материал');
dialogs[0].buttons.find(b=>b.label==='Сохранить').run();
assert.equal(JSON.stringify(db),before,'first form must not mutate working DB');
assert.equal(currentDb,db,'preview must not replace DB');
assert.equal(pending.length,1);
pending.shift()();
assert.equal(dialogs[1].title,'Проверить изменения материала');
assert(dialogs[1].body.includes('15,6')&&dialogs[1].body.includes('0,89'),'shows before and after');
assert(!dialogs[1].body.includes('matCorrectionEvidence'),'source cannot be silently revised after preview');
const result=dialogs[1].buttons.find(b=>b.label==='Подтвердить и сохранить').run();
assert.notEqual(result,false,'confirmed save should work');
assert.equal(JSON.stringify(db),before,'original live DB must remain intact after isolated commit');
assert.deepEqual(events,['download','setDatabase'],'request backup before changing working DB');
assert.notEqual(currentDb,db,'apply committed a new DB object');
assert.equal(currentDb.materials[0].density,'0,89');
assert.equal(currentDb.materials[0].engineeringCorrectionHistory.length,1);
assert.equal(currentDb.tasks[0].approvalStatus,'approved');
assert.equal(currentDb.routes[0].taskIds[0],'TASK1');
assert.equal(currentDb.checklistRuns[0].taskResults[0].taskId,'TASK1');
console.log('PASS Stage 4 offline editor smoke: two-step preview, backup order, isolated commit and fact/route preservation');
