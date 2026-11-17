const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const copy=x=>JSON.parse(JSON.stringify(x));
const W={};W.window=W;W.LubricaSystem={registerModule(){}};
let db={project:{name:'Синтетический тест'},plants:[],
 lines:[{id:'L1',name:'Линия 1'},{id:'L2',name:'Линия 2'}],
 areas:[{id:'A1',lineId:'L1',name:'Вход'},{id:'A2',lineId:'L2',name:'Вход'}],
 equipment:[
 {id:'E1',lineId:'L1',areaId:'A1',externalCode:'10108215',name:'Конвейер роликовый SPZ1400',equipmentType:'conveyor',status:'active',origin:'import'},
 {id:'E2',lineId:'L2',areaId:'A2',externalCode:'10208215',name:'Конвейер роликовый SPZ1400',equipmentType:'conveyor',status:'active',origin:'import'},
 {id:'E3',lineId:'L1',areaId:'A1',externalCode:'10110511',name:'Конвейер шнековый',equipmentType:'conveyor',status:'active',origin:'import'},
 {id:'E4',lineId:'L1',areaId:'A1',externalCode:'10111111',name:'Пила продольная с кареткой',equipmentType:'other',status:'active'},
 {id:'E5',lineId:'L1',areaId:'A1',externalCode:'10122222',name:'Питатель дозирующий',equipmentType:'other',status:'active'},
 {id:'E6',lineId:'L1',areaId:'A1',externalCode:'10133333',name:'Система охлаждения',equipmentType:'other',status:'active'},
 {id:'E7',lineId:'L1',areaId:'A1',externalCode:'10144444',name:'Подшипник системы охлаждения',equipmentType:'other',parentEquipmentId:'E6',status:'active'}
 ],
 components:[
 {id:'B1',equipmentId:'E1',externalCode:'BB-1',name:'Подшипниковый узел UCP 210',candidateCategory:'bearing',candidateState:'candidate',status:'active'},
 {id:'S1',equipmentId:'E1',externalCode:'SH-1',name:'Вал приводной',candidateEquipmentType:'rotating_shaft',candidateState:'review',status:'active'},
 {id:'S2',equipmentId:'E1',externalCode:'SH-2',name:'Вал натяжной',candidateEquipmentType:'rotating_shaft',candidateState:'review',status:'active'},
 {id:'B2',equipmentId:'E2',externalCode:'BB-2',name:'Подшипниковый узел UCP 210',candidateCategory:'bearing',candidateState:'candidate',status:'active'},
 {id:'U1',equipmentId:'E3',externalCode:'X-1',name:'Неклассифицированная ТМЦ',candidateCategory:null,candidateState:'unclassified',status:'active'},
 {id:'ZZ',equipmentId:'E6',externalCode:'Z-1',name:'Подшипник охлаждения',candidateCategory:'bearing',candidateState:'candidate',status:'active'},
 ],
 nodes:[{id:'N1',equipmentId:'E1',name:'Оригинальный узел'}],
 lubricationPoints:[{id:'LP0',equipmentId:'E1',nodeId:'N1',name:'Существующая опора',category:'bearing',status:'review',candidateOriginKey:'already:01',componentBinding:{sourceComponentId:'B1'}}],
 tasks:[{id:'T0',lubricationPointId:'LP0',activityType:'regrease',operation:'Досмазывание',approvalStatus:'approved',verified:true,
  quantity:{approved:'12',unit:'г'},materialId:'M1',materialMode:'explicit',schedule:{legacyText:'250 ч'}}],
 routes:[{id:'R1',taskIds:['T0']}],routePlanItems:[{id:'P1',taskId:'T0'}],checklistRuns:[{id:'F1',taskResults:[{taskId:'T0'}]}],
 materials:[{id:'M1',name:'Проверенная смазка',status:'active'}],tools:[],componentLibraryEntries:[]};
W.LubricaCore={State:{getDatabase:()=>db,setDatabase:x=>db=x},Database:{normalize:x=>x},DatabaseSchema:{clone:copy},IDs:{nextFrom:(arr,p,len)=>{let i=1,k;do{k=p+'-'+String(i++).padStart(len,'0')}while(arr.some(x=>x.id===k));return k}}};
W.LubricaApp={showToast(){},refreshFromCore(){},renderAll(){}};
W.LubricaStructureContext={categoryLabels:{bearing:'Подшипник',chain:'Цепь'},activityOptions:()=>[],activityTypeForLabel:()=> 'regrease',activityLabel:()=> 'Досмазывание',activityNeedsMaterial:()=>true};
const ctx=vm.createContext({window:W,document:{},console,Date,JSON});
for(const p of ['import/component-classifier.js','conveyors/bearing-verification.js','qa/engineering-decisions.js','qa/point-acceleration.js',
 'qa/task-readiness.js','qa/qa-engine.js','qa/safe-bulk.js','import/candidate-finalizer.js']){
 new vm.Script(fs.readFileSync(path.join(root,p),'utf8'),{filename:p}).runInContext(ctx);
}
const B=W.LubricaConveyorBearingVerification,A=W.LubricaPointAcceleration,
 E=W.LubricaEngineeringDecisions,F=W.LubricaCandidateFinalizer,
 Bulk=W.LubricaSafeBulk;
const before=JSON.stringify(db);
let audit=A.audit(db);
assert.equal(audit.totalEquipment,7);
assert.equal(audit.rows.filter(x=>x.status==='OUT_OF_SCOPE').length,0,'OOS must stay outside default displayed queue');
assert(audit.outOfScope>=2,'cooling subtree explicitly outside scope');
assert(audit.gaps.some(x=>x.family==='saw_cut'&&x.count===1));
assert(audit.gaps.some(x=>x.family==='feeder'&&x.count===1));
assert(audit.rows.find(x=>x.id==='E1').analogSuggestions.some(x=>x.equipmentId==='E2'));
assert.equal(B.reviewState(db,db.equipment[0]).status,'MODEL_KNOWN_COUNT_UNKNOWN');
assert.equal(B.reviewState(db,db.equipment[2]).status,'BEARING_SOURCE_UNKNOWN');
assert.equal(audit.rows.find(x=>x.id==='E1').bearing.confirmedCount,null);
assert.equal(JSON.stringify(db),before,'source audit is read-only');
const bad=B.preview(db,'E1',{reportedCount:4,physicalCountConfirmed:true,sourceReference:'Осмотр 2026',reason:'Проверка опор'});
assert(!bad.allowed,'a number alone cannot generate physical supports');
const unknown=B.preview(db,'E1',{reportedCount:'4',physicalCountConfirmed:false});
assert(unknown.allowed&&unknown.status==='COUNT_REVIEW'&&unknown.serviceableCount===0);
let changed=copy(db);B.commit(changed,'E1',{reportedCount:'4',physicalCountConfirmed:false});
assert.equal(changed.lubricationPoints.length,1);assert.equal(changed.tasks.length,1);
assert.equal(B.reviewState(changed,changed.equipment[0]).status,'COUNT_REVIEW');
const src='B1',positions=[
 {positionId:'L',location:'Приводной вал — левая наружная',state:'serviceable',bearingSourceId:src,serviceAccessConfirmed:true},
 {positionId:'R',location:'Приводной вал — правая наружная',state:'serviceable',bearingSourceId:src,serviceAccessConfirmed:true}
];
const survey={reportedCount:2,physicalCountConfirmed:true,sourceReference:'Осмотр / фото E1: 2 физические опоры',reason:'Проверены два физических места',positions};
let p=B.preview(db,'E1',survey);assert(p.allowed&&p.status==='CONFIRMED'&&p.serviceableCount===2);
changed=copy(db);B.commit(changed,'E1',survey);
assert.equal(changed.lubricationPoints.length,1);assert.equal(changed.tasks.length,1);
assert.equal(changed.equipment[0].conveyorBearingSurvey.positions.length,2);
const ev=W.LubricaClassifier.conveyorEvidence(changed,changed.equipment[0]);
const preview={...changed.equipment[0],maintenanceTemplate:{id:'conveyor_arrangement',evidence:ev}};
const specs=F.specsFor(preview,'equipment');
const verified=specs.filter(x=>x.surveyPositionId);
assert.equal(verified.length,2,'one model source can yield 2 verified distinct physical locations');
assert(verified.every(x=>x.selected===false&&x.sourceRef.id==='B1'&&x.physicalSupport===true));
assert(!specs.some(x=>x.supportKey),'survey supersedes four hypothetical support slots');
assert(verified[0].key!==verified[1].key);
F.applyConfirmedSpecs(changed,'equipment',changed.equipment[0],changed.equipment[0],preview.maintenanceTemplate,verified);
assert.equal(changed.lubricationPoints.length,3);
assert.equal(new Set(changed.lubricationPoints.map(x=>x.candidateOriginKey)).size,3);
assert.equal(changed.tasks.length,3);
assert(changed.tasks.slice(1).every(t=>t.approvalStatus==='review'&&!t.verified));
assert.equal(changed.tasks[0].approvalStatus,'approved');assert.equal(changed.routes[0].taskIds[0],'T0');
F.applyConfirmedSpecs(changed,'equipment',changed.equipment[0],changed.equipment[0],preview.maintenanceTemplate,verified);
assert.equal(changed.lubricationPoints.length,3,'repeated apply cannot duplicate verified positions');
assert.equal(changed.tasks.length,3);
assert(!B.preview(changed,'E1',{...survey,positions:[positions[0]]}).allowed,
 'changing verified support positions after point creation requires separate review');
const registered=B.verifiedPositions(changed,changed.equipment[0]);
assert.equal(registered.length,2);
assert(!B.preview(db,'E1',{...survey,positions:positions.map(x=>({...x,bearingSourceId:'ZZ'}))}).allowed,
 'foreign bearing source forbidden');
const xls={fileName:'Карта смазки.xlsx',sheets:[{name:'Карта смазки',matrix:[
 ['Код оборудования','Код ТМЦ','Место смазки','Мероприятие','Материал','Норма'],
 ['10108215','BB-1','Приводной вал слева','Досмазывание','Смазка 1','10'],
 ['10108215','NO-ENTRY','Приводной вал справа','Досмазывание','Смазка 1','10'],
 ['10555555','','Без места','','','']]}]};
const wx=A.previewWorkbook(db,xls);
assert.equal(wx.parsedRows,3);assert.equal(wx.uniquelyMatched,1);assert.equal(wx.needsReview,2);
assert(wx.rows.every(x=>!x.createsPoint&&!x.approvesTask));
assert.equal(JSON.stringify(db),before,'Excel preview must be read-only');
const unknownDecision=E.preview(db,'U1','clarify',{reason:'Нужен осмотр перед классификацией'});
assert(unknownDecision.allowed,'uncategorized source can remain in review without fake category');
let batch=A.previewBatchDecisions(db,['U1'],'clarify',{reason:'Нужен осмотр перед классификацией'});
assert(batch.allowed);
const resolved=A.applyBatchDecisions(db,['U1'],'clarify',{reason:'Нужен осмотр перед классификацией'});
assert.equal(resolved.database.components.find(c=>c.id==='U1').candidateState,'review');
assert.equal(resolved.database.lubricationPoints.length,1);
assert.equal(resolved.database.tasks.length,1);
assert.equal(JSON.stringify(db),before,'batch decisions must be transactional');
const forbidden=A.previewBatchDecisions(db,['B1'],'not_lubricated',{reason:'Это только предположение'});
assert(!forbidden.allowed,'mass no-lube cannot be applied');
const blocked=Bulk.preview(db,['T0'],{materialId:'M1',approve:true});
assert(!blocked.allowed,'approved and route-connected task protected from bulk overwrites');
const incomplete=copy(db);incomplete.tasks.push({id:'T1',lubricationPointId:'LP0',activityType:'regrease',operation:'Досмазывание',approvalStatus:'review',quantity:{approved:'',unit:'г'},schedule:{legacyText:''}});
assert(!Bulk.preview(incomplete,['T1'],{approve:true}).allowed,'missing material, norm and interval cannot be bulk-approved');
const simple=Bulk.preview(incomplete,['T1'],{materialId:'M1'});assert(simple.allowed);
const applied=Bulk.apply(incomplete,['T1'],{materialId:'M1'});
assert.equal(applied.database.tasks.find(x=>x.id==='T1').materialId,'M1');
assert.equal(applied.database.tasks.find(x=>x.id==='T1').approvalStatus,'review');
assert.equal(incomplete.tasks.find(x=>x.id==='T1').materialId,undefined);
assert.equal(applied.database.tasks.find(x=>x.id==='T0').approvalStatus,'approved');
assert.equal(applied.database.routes[0].taskIds[0],'T0');
console.log('PASS 5C point acceleration: fleet gaps, paired analogs, count-unknown, multi-position same model, source gates, Excel preview, batch decisions, bulk safety, no production mutations');
