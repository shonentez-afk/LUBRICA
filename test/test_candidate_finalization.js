const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const nextFrom=(arr,prefix,width=6)=>{let max=0;for(const x of arr||[]){const m=String(x.id||'').match(new RegExp('^'+prefix+'-(\\d+)$'));if(m)max=Math.max(max,Number(m[1]));}return `${prefix}-${String(max+1).padStart(width,'0')}`};
const context={console,window:{LubricaCore:{State:{getDatabase(){return null}},Database:{normalize:x=>x},IDs:{nextFrom}}}};
context.window.window=context.window;
vm.createContext(context);
for(const rel of ['structure/context.js','import/candidate-finalizer.js'])vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
const C=context.window.LubricaStructureContext, F=context.window.LubricaCandidateFinalizer;
const assert=(x,m)=>{if(!x)throw new Error(m)};

// Classifier template vocabulary must normalize to stable activity types, not accidental custom values.
const normalized=F.normalizeActivities(['Проверка уровня','Долив','Замена масла','Отбор пробы'],'oil_system');
assert(normalized.map(x=>x.type).join(',')==='oil_level_check,oil_topup,oil_change,oil_sample','oil activity aliases');
const filter=F.normalizeActivities(['Контроль перепада','Замена / фильтрация'],'other');
assert(filter.map(x=>x.type).join(',')==='filter_dp_check,filter_service','filter activity aliases');
const breather=F.normalizeActivities(['Осмотр','Очистка','Замена'],'other');
assert(breather.map(x=>x.type).join(',')==='inspection,cleaning,replacement','inspection/replacement aliases');

// Simulate candidate confirmation -> node -> point -> tasks, then repeat to verify idempotency.
const db={nodes:[],lubricationPoints:[],tasks:[]};
const equipment={id:'EQ-000001',name:'Редуктор 1'};
const record={id:'COMP-1',name:'Редуктор 1',candidateState:'candidate'};
const template={title:'Редуктор',items:[]};
const chosen=[{key:'oil',name:'Картер / масляная полость',category:'gearbox_oil',position:'',activities:[
 {type:'oil_level_check',label:'Проверка уровня'},
 {type:'oil_change',label:'Замена масла'}
]}];
F.applyConfirmedSpecs(db,'component',record,equipment,template,chosen);
assert(db.nodes.length===1,'one node created');
assert(db.lubricationPoints.length===1,'one point created');
assert(db.tasks.length===2,'two tasks created');
assert(db.tasks.every(t=>t.approvalStatus==='review'),'candidate tasks stay review');
assert(db.tasks.find(t=>t.activityType==='oil_level_check').materialMode==='none','level check material mode');
assert(db.tasks.find(t=>t.activityType==='oil_change').materialMode==='explicit','oil change uses direct material selection by default');
assert(record.candidateState==='confirmed','candidate marked confirmed');
F.applyConfirmedSpecs(db,'component',record,equipment,template,chosen);
assert(db.nodes.length===1&&db.lubricationPoints.length===1&&db.tasks.length===2,'repeat confirmation is idempotent');

// Bearing choices must include full grease replacement.
const bearing=C.activityOptions('bearing').map(x=>x.type);
assert(bearing.includes('regrease')&&bearing.includes('grease_full_replacement')&&bearing.includes('condition_check'),'bearing activity set');
console.log('CANDIDATE FINALIZATION TEST PASS');
