const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const W={};W.window=W;W.LubricaSystem={registerModule(){}};
let db={project:{name:'Stage 5D synthetic only'},lines:[{id:'L1',name:'Линия 1'},{id:'L2',name:'Линия 2'}],areas:[],
 equipment:[
  {id:'GROUP',lineId:'L1',externalCode:'10110181',name:'Пилы ленточные',equipmentType:'other'},
  {id:'SAW1',parentEquipmentId:'GROUP',lineId:'L1',externalCode:'10110182',name:'Пила ленточная №1',equipmentType:'other'},
  {id:'WHEEL',parentEquipmentId:'SAW1',lineId:'L1',externalCode:'10110196',name:'Колесо №1 пилы по толщине',equipmentType:'other'},
  {id:'CART',lineId:'L1',externalCode:'10110384',name:'Каретка поперечной резки №1',equipmentType:'other'},
  {id:'SHAFT',lineId:'L1',externalCode:'SHAFT-01',name:'Вал приводной',equipmentType:'rotating_shaft'},
  {id:'CONVEYOR',lineId:'L1',externalCode:'10110031',name:'Конвейер ленточный №3',equipmentType:'conveyor'},
  {id:'CENT',lineId:'L1',name:'Центрифуги',equipmentType:'other'},
  {id:'CENT_SHAFT',parentEquipmentId:'CENT',lineId:'L1',name:'Шпиндель №1',equipmentType:'spindle'}
 ],
 components:[
  {id:'SEALED',equipmentId:'SAW1',externalCode:'10110186',name:'Подшипник 6211-2RS1-C3',candidateCategory:'bearing',candidateState:'candidate',status:'active'},
  {id:'IGUS',equipmentId:'SAW1',externalCode:'10110188',name:'Подшипник линейный OGA-01-25',manufacturer:'IGUS',candidateCategory:'linear_bearing',candidateState:'candidate',status:'active'},
  {id:'INA',equipmentId:'SAW1',externalCode:'10110189',name:'Подшипник линейный KGNO-50-B-PP-AS',manufacturer:'INA',candidateCategory:'linear_bearing',candidateState:'candidate',status:'active'},
  {id:'B51105',equipmentId:'WHEEL',externalCode:'10110197',name:'Подшипник 51105',candidateCategory:'bearing',candidateState:'candidate',status:'active'},
  {id:'MOTOR',equipmentId:'SAW1',externalCode:'10110192',name:'Электродвигатель 1LA7163-6AA60',candidateEquipmentType:'motor',candidateState:'equipment',status:'active'},
  {id:'GUIDE',equipmentId:'SAW1',externalCode:'10110190',name:'Направляющая TSNW50',candidateCategory:'guide',status:'active'},
  {id:'S-BEAR',equipmentId:'SHAFT',externalCode:'SHAFT-B',name:'Узел подшипниковый UCPA 210',candidateCategory:'bearing',status:'active'},
  {id:'S-SEALED',equipmentId:'SHAFT',externalCode:'SHAFT-S',name:'Подшипник 6204-2RS1',candidateCategory:'bearing',status:'active'},
  {id:'CENT-B',equipmentId:'CENT_SHAFT',name:'Подшипник 6205',candidateCategory:'bearing',status:'active'}
 ],
 nodes:[{id:'NODE0',equipmentId:'CART',name:'Legacy'}],lubricationPoints:[{id:'LP0',equipmentId:'CART',nodeId:'NODE0',name:'Факт подтверждённой смазки',category:'bearing',candidateOriginKey:'old:fact'}],
 tasks:[{id:'T0',lubricationPointId:'LP0',operation:'Досмазывание',approvalStatus:'approved',quantity:{approved:'15',unit:'г'},materialId:'M1',schedule:{legacyText:'1000 ч'},verified:true}],
 routes:[{id:'R1',taskIds:['T0']}],routePlanItems:[{id:'P1',taskId:'T0'}],checklistRuns:[{id:'RUN1',taskResults:[{taskId:'T0'}]}],materials:[],tools:[]};
W.LubricaCore={State:{getDatabase:()=>db,setDatabase:x=>{db=x}},Database:{normalize:x=>x},DatabaseSchema:{clone:copy},IDs:{nextFrom:(rows,prefix,size)=>{let k=1,id;do{id=prefix+'-'+String(k++).padStart(size||6,'0')}while(rows.some(x=>x.id===id));return id}}};
W.LubricaApp={showToast(){},refreshFromCore(){},renderAll(){}};
W.LubricaStructureContext={categoryLabels:{},activityOptions:()=>[],activityTypeForLabel:()=> 'regrease',activityLabel:()=> 'Досмазывание',activityNeedsMaterial:()=>true};
const ctx=vm.createContext({window:W,document:{},console,Date,JSON});
for(const file of ['import/component-classifier.js','import/candidate-finalizer.js','rotating/rotating-arrangement.js','machines/saw-cut-arrangement.js']){
 new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(ctx);
}
const S=W.LubricaSawCutArrangement,R=W.LubricaRotatingArrangement;
let original=JSON.stringify(db);
assert.equal(S.isSaw(db.equipment.find(x=>x.id==='CONVEYOR')),false);
assert.equal(S.isSaw({name:'Заслонка дисковая K22010',equipmentType:'other'}),false);
assert.equal(S.isSaw(db.equipment.find(x=>x.id==='SAW1')),true);
assert.equal(S.isSaw(db.equipment.find(x=>x.id==='CART')),true);
const group=S.inventory(db,'GROUP');assert(group.isGroup&&group.children.length===2);
assert(group.rows.some(r=>r.id==='B51105'&&r.ownerId==='WHEEL'));
assert(group.rows.some(r=>r.id==='SEALED'&&r.sealed&&!r.canCreate));
assert(group.rows.some(r=>r.id==='IGUS'&&r.dry&&!r.canCreate));
assert.equal(S.preview(db,'GROUP',{positions:[{positionId:'P',sourceId:'B51105',location:'Левая',state:'serviceable',accessConfirmed:true}],sourceReference:'Фото'}).allowed,false);
const noPoints=S.commit('SAW1',{positions:[],reason:'Уточняется по чертежу'});
assert(noPoints.ok&&noPoints.selectedCount===0);
assert.equal(db.lubricationPoints.length,1);
assert.equal(db.equipment.find(x=>x.id==='SAW1').sawCutSurvey.status,'SURVEY_ONLY');
assert.equal(JSON.stringify(db.tasks[0]),JSON.stringify(JSON.parse(original).tasks[0]));
let bad=S.preview(db,'SAW1',{positions:[{positionId:'P1',sourceId:'SEALED',location:'Привод слева',state:'serviceable',accessConfirmed:true}],sourceReference:'Фото 1'});
assert(!bad.allowed,'sealed bearings must not trigger routine regrease');
bad=S.preview(db,'SAW1',{positions:[{positionId:'P1',sourceId:'IGUS',location:'Каретка 1',state:'serviceable',accessConfirmed:true,oemConfirmed:true}],sourceReference:'Фото 1'});
assert(!bad.allowed,'dry IGUS linear rail cannot become grease point');
bad=S.preview(db,'SAW1',{positions:[{positionId:'P1',sourceId:'INA',location:'Каретка 1',state:'serviceable',accessConfirmed:true}],sourceReference:'OEM'});
assert(!bad.allowed,'linear bearing requires explicit OEM verification');
let layout={positions:[
 {positionId:'P1',sourceId:'B51105',location:'Колесо 1 — левая наружная',state:'serviceable',accessConfirmed:true},
 {positionId:'P2',sourceId:'B51105',location:'Колесо 1 — правая наружная',state:'serviceable',accessConfirmed:true}
],sourceReference:'Проверено у станка 10110182; фото 22',reason:'Два реально обслуживаемых места'};
assert(S.preview(db,'SAW1',layout).allowed);
const commit1=S.commit('SAW1',layout);assert(commit1.ok&&commit1.selectedCount===2);
assert.equal(db.lubricationPoints.length,3);
assert(db.lubricationPoints.slice(1).every(x=>x.equipmentId==='WHEEL'));
assert.equal(new Set(db.lubricationPoints.map(p=>p.candidateOriginKey)).size,3);
assert.equal(db.tasks.length,3);assert(db.tasks.slice(1).every(t=>t.approvalStatus==='review'&&!t.verified));
assert.equal(db.tasks[0].approvalStatus,'approved');assert.equal(db.routes[0].taskIds[0],'T0');
S.commit('SAW1',layout);assert.equal(db.lubricationPoints.length,3);assert.equal(db.tasks.length,3);
assert(!S.preview(db,'SAW1',{...layout,positions:[layout.positions[0]]}).allowed,'cannot remove verified physical positions without migration');
assert(!S.commit('SAW1',{...layout,positions:[layout.positions[0]]}).ok,'transaction must protect preserved points');
const fresh=copy(db),count=fresh.lubricationPoints.length;
assert(!S.preview(fresh,'SAW1',{sourceReference:'Фото',positions:[{positionId:'XX',sourceId:'B51105',location:'Колесо 1 — левая наружная',state:'serviceable',accessConfirmed:true}]}).allowed);
assert.equal(fresh.lubricationPoints.length,count);
assert(!S.inventory(db,'CENT_SHAFT'));
assert(!R.preview(db,'equipment','CENT_SHAFT',{reportedCount:2,positions:[]}).allowed);
const E=R.evidence(db,db.equipment.find(x=>x.id==='SHAFT'),db.equipment.find(x=>x.id==='SHAFT'),'equipment');
assert.equal(R.defaultSupportCount(E),0,'never infer two supports from one bearing source');
assert(R.preview(db,'equipment','SHAFT',{reportedCount:'',positions:[],physicalCountConfirmed:false}).allowed);
assert(R.commit('equipment','SHAFT',{reportedCount:'',positions:[],physicalCountConfirmed:false}).ok);
assert.equal(db.lubricationPoints.length,3);
assert(!R.preview(db,'equipment','SHAFT',{reportedCount:2,physicalCountConfirmed:true,positions:[{positionId:'1',location:'Левая',state:'serviceable',bearingSourceId:'S-BEAR',serviceAccessConfirmed:true}]}).allowed,'must confirm all places');
assert(!R.preview(db,'equipment','SHAFT',{reportedCount:1,physicalCountConfirmed:true,positions:[{positionId:'1',location:'Левая',state:'serviceable',bearingSourceId:'S-SEALED',serviceAccessConfirmed:true}],sourceReference:'Фото'}).allowed,'sealed bearing restriction');
const shaft={reportedCount:2,physicalCountConfirmed:true,sourceReference:'Фото, шильдики 01.11.2026',reason:'Реальные опоры',positions:[
 {positionId:'1',location:'Вал приводной — левая',state:'serviceable',bearingSourceId:'S-BEAR',serviceAccessConfirmed:true},
 {positionId:'2',location:'Вал приводной — правая',state:'serviceable',bearingSourceId:'S-BEAR',serviceAccessConfirmed:true}
]};
assert(R.preview(db,'equipment','SHAFT',shaft).allowed);
assert(R.commit('equipment','SHAFT',shaft).ok);
assert.equal(db.lubricationPoints.length,5);assert.equal(db.tasks.length,5);
assert(db.tasks.slice(1).every(t=>t.approvalStatus==='review'));
assert(R.commit('equipment','SHAFT',shaft).ok);assert.equal(db.lubricationPoints.length,5);
assert(!R.commit('equipment','SHAFT',{...shaft,positions:[shaft.positions[0]]}).ok);
assert.equal(db.routes.length,1);assert.equal(db.checklistRuns.length,1);
const man={id:'E-MAN',externalCode:'M',origin:'manual',name:'Вал ручной',equipmentType:'rotating_shaft'};
const cBefore=db.components.length;
R.ensureManualComponents(db,man,{supportCount:0,supports:[]});assert.equal(db.components.length,cBefore);
R.ensureManualComponents(db,man,{supportCount:2,supports:['UCP210','UCP210']});
assert.equal(db.components.length,cBefore+2);assert(db.components.slice(-2).every(c=>c.candidateState==='review'));
console.log('PASS Stage 5D: saw hierarchy, no invented shafts/positions, OEM guards, verified multiple sites, idempotency, approved/route/fact preservation');
