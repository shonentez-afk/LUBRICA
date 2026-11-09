// Stage 5B.6 — read-only conveyor constructor fleet coverage.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),win={};win.window=win;
win.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null};
const box=vm.createContext({window:win,console,Date,JSON});
for(const file of ['import/component-classifier.js','conveyors/conveyor-arrangement.js','conveyors/conveyor-coverage.js']){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 new vm.Script(source,{filename:file}).runInContext(box);
}
const C=win.LubricaClassifier,A=win.LubricaConveyorCoverage;
const eq=(id,name,type='conveyor',parent=null,lineId='L1')=>({id,name,equipmentType:type,
 parentEquipmentId:parent,lineId,areaId:lineId==='L1'?'A1':'A2',status:'active',externalCode:'EXT-'+id});
const comp=(id,equipmentId,name,category=null,equipmentType=null)=>({id,equipmentId,name,
 status:'active',candidateState:'candidate',candidateCategory:category,candidateEquipmentType:equipmentType});
const group=eq('GROUP','Конвейеры роликовые');
const turn=eq('TURN','Конвейер поворотный поз. 111');
const roller=eq('ROLLER','Конвейер роликовый SPZ1600xL=5500','conveyor','TURN');
const belt=eq('BELT','Конвейер ленточный вертикальный PTM800xL=4650','conveyor','TURN');
const lube=eq('LUBE','Система смазки цепей конвейера ленточного','conveyor','BELT');
const nestedCooling=eq('SKIP-NESTED-COOL','Система охлаждения привода конвейера','conveyor','BELT');
const unknown=eq('UNKNOWN','Конвейер отсева каменного материала','conveyor',null,'L2');
const screw=eq('SCREW','Конвейер шнековый','conveyor',null,'L2');
const manual=eq('MANUAL','Конвейер ременный RET-11-200xL=925','conveyor',null,'L2');
manual.origin='manual';
const extra=eq('IMPORTED-OTHER','Конвейер ленточный запасной','other',null,'L2');
const motorOfConveyor=eq('NOT-A-CONVEYOR','Мотор-редуктор конвейера','motor_gearbox',null,'L2');
const centrifuge=eq('CENT','Центрифуга №1','other');
const centrifugeConveyor=eq('SKIP-CENT','Конвейер у центрифуги','conveyor','CENT');
const cooling=eq('SKIP-COOL','Система охлаждения конвейера','conveyor');
const d={equipment:[group,turn,roller,belt,lube,unknown,screw,manual,extra,motorOfConveyor,centrifuge,
 centrifugeConveyor,cooling,nestedCooling],
 lines:[{id:'L1',name:'Линия 1'},{id:'L2',name:'Линия 2'}],
 areas:[{id:'A1',name:'Упаковка',lineId:'L1'},{id:'A2',name:'Распиловка',lineId:'L2'}],
 components:[
  comp('R-ROLLER','ROLLER','Ролик приводной 1200 мм'),
  comp('R-SY','ROLLER','Узел подшипниковый SY 30 TF','bearing'),
  comp('R-LEGACY','ROLLER','Подшипник UCP 208','bearing'),
  comp('R-TB','ROLLER','Втулка TB 1610-30','bushing'),
  comp('R-DRIVE','ROLLER','Мотор-редуктор R67DV100M4',null,'motor_gearbox'),
  comp('B-YAR','BELT','Подшипник YAR 206-2F','bearing'),
  comp('B-6005','BELT','Подшипник 6005-2RS1','bearing'),
  comp('A-CHAIN','LUBE','Цепь роликовая 12B-2','chain'),
  // Real 10101093 physically contains a belt and drive/tension drums. These
  // TMCs may have been rejected only as service candidates, not as equipment.
  {...comp('U-BELT','UNKNOWN','Лента конвейерная 500x54400 EP 400/3-4/2 Y'),candidateState:'rejected',externalCode:'10101098'},
  {...comp('U-DRIVE','UNKNOWN','Барабан приводной'),candidateState:'confirmed',externalCode:'10101099'},
  {...comp('U-RETURN','UNKNOWN','Барабан натяжной'),candidateState:'confirmed',externalCode:'10101103'},
  comp('S-SCREW','SCREW','Шнек L=5390 мм d=350 мм'),
  comp('S-MOTOR','SCREW','Электродвигатель M2AA 90L4 B5',null,'motor'),
  comp('S-GEAR','SCREW','Редуктор C513/P 1:93,0 B3 PAM 90',null,'gearbox'),
  comp('CENT-C','SKIP-CENT','Подшипник 22212','bearing'),
  comp('COOL-C','SKIP-COOL','Насос охлаждения','oil_system'),
  comp('N-COOL-BEAR','SKIP-NESTED-COOL','Подшипник 22218','bearing')
 ],
 lubricationPoints:[
  {id:'P-R1',equipmentId:'ROLLER',componentBinding:{sourceComponentId:'R-SY'}},
  {id:'P-R2',equipmentId:'ROLLER',candidateOriginKey:'component:R-LEGACY:bearing_left'},
  {id:'P-A1',equipmentId:'LUBE',componentBinding:{sourceComponentId:'A-CHAIN'}},
  {id:'P-NCOOL',equipmentId:'SKIP-NESTED-COOL',componentBinding:{sourceComponentId:'N-COOL-BEAR'}}
 ],
 tasks:[
  {id:'T1',lubricationPointId:'P-R1',approvalStatus:'review'},
  {id:'T2',lubricationPointId:'P-R1',approvalStatus:'approved'},
  {id:'T3',lubricationPointId:'P-R2',approvalStatus:'review'},
  {id:'T4',lubricationPointId:'P-A1',approvalStatus:'review'},
  {id:'T-COOL',lubricationPointId:'P-NCOOL',approvalStatus:'approved'}
 ],
 routes:[{id:'ROUTE-HIST',taskIds:['T2']}],
 routePlanItems:[{id:'PLAN-HIST',routeId:'ROUTE-HIST'}],
 checklistRuns:[{id:'RUN-HIST',routeId:'ROUTE-HIST'}]
};
const before=JSON.stringify(d);
const r=A.audit(d);
assert.equal(r.source,'live_database_read_only');
assert.equal(r.totalConveyorRecords,12,'11 conveyor-type records and one named conveyor imported as other');
assert.equal(r.extraNamedRecords,1,'other-typed named conveyor must not be missed');
assert.equal(r.excludedScope,3,'centrifuge descendant and independent/nested cooling stay out of scope');
assert.equal(r.byRole.group,1);
assert.equal(r.byRole.ancillary,1);
assert.equal(r.machineCount,7,'physical machines include an explicit conveyor mis-typed other');
assert.equal(r.bySubtype.turning,1);
assert.equal(r.bySubtype.roller,1);
assert.equal(r.bySubtype.belt,3,'belt child, manual RET and named conveyor typed other');
assert.equal(r.bySubtype.screw,1);
assert.equal(r.bySubtype.unknown,1);
const get=id=>r.rows.find(x=>x.id===id);
assert.equal(get('TURN').status,'COMPOSITE_REVIEW');
assert.equal(get('TURN').childConveyorCount,2);
assert.deepEqual(Array.from(get('TURN').childIds),['ROLLER','BELT']);
assert.equal(get('TURN').relatedPointCount,0,'parent never duplicates child lubrication points');
assert.equal(get('ROLLER').actualCount,2,'SY 30 TF and legacy UCP208 source bearing stay distinct, TB excluded');
assert.equal(get('ROLLER').excludedCount,1,'TB 1610 is an excluded mounting element');
assert.equal(get('ROLLER').ownPointCount,2);
assert.equal(get('ROLLER').relatedPointCount,2);
assert.equal(get('ROLLER').relatedTaskCount,3,'tasks counted exactly once per point');
assert.equal(get('ROLLER').unlinkedCandidateCount,0,'componentBinding and legacy candidateOriginKey both resolve source ID');
assert.equal(get('BELT').actualCount,2,'YAR plus chain from child lubrication subsystem');
assert.equal(get('BELT').excludedCount,1,'6005-2RS1 not a grease proposal');
assert.equal(get('BELT').ownPointCount,0,'no accidental transfer of ancillary source ownership');
assert.equal(get('BELT').relatedPointCount,1,'ancillary lubrication point counted on belt scope only');
assert.equal(get('BELT').relatedTaskCount,1);
assert(!get('SKIP-NESTED-COOL'),'nested cooling cannot become a conveyor entry');
const physicallyScoped=win.LubricaClassifier.conveyorEvidence(d,belt);
assert(physicallyScoped.ancillary.some(c=>c.id==='SKIP-NESTED-COOL'),
 'cooling may remain an inert structural label');
assert(!physicallyScoped.actual.some(c=>c.id==='N-COOL-BEAR'),
 'cooling lubrication TMC cannot leak into parent conveyor constructor');
assert(physicallyScoped.byCategory.bearing===1,
 'only the conveyor YAR bearing may be proposed, not cooling bearing');
assert(!physicallyScoped.assets.some(c=>c.id==='SKIP-NESTED-COOL'),
 'cooling cannot be a drive/oil proposal');
assert.equal(win.LubricaClassifier.conveyorOutOfScopeAncestor(d,nestedCooling),true);
assert.equal(get('UNKNOWN').status,'SUBTYPE_UNKNOWN');
assert.equal(get('UNKNOWN').subtype,'unknown','TMC hint cannot silently change type');
assert.equal(get('UNKNOWN').subtypeSuggestion?.subtype,'belt','physical belt + drums yield a review-only hint');
assert.equal(get('UNKNOWN').subtypeSuggestion?.status,'ENGINEERING_HINT_NOT_CONFIRMED');
assert.equal(get('UNKNOWN').subtypeSuggestion?.changesDatabase,false);
assert.deepEqual(Array.from(get('UNKNOWN').subtypeSuggestion?.sourceComponentIds||[]),['U-BELT','U-DRIVE']);
assert.equal(r.withSubtypeSuggestion,1);
assert.equal(get('MANUAL').status,'EVIDENCE_MISSING');
assert.equal(get('IMPORTED-OTHER').status,'EVIDENCE_MISSING');
assert.equal(get('IMPORTED-OTHER').importType,'other');
assert(!get('NOT-A-CONVEYOR'),'a motor-reducer mentioning a conveyor is not a conveyor machine');
assert.equal(get('SCREW').shaftContextCount,1,'real imported screw appears as context');
assert.equal(get('SCREW').driveCount,2,'ABB + Bonfiglioli remain independent assets');
assert(r.rows.every(x=>x.requiresPhysicalConfirmation===true),'names never mark a constructor as complete');
assert(!get('SKIP-CENT')&&!get('SKIP-COOL')&&!get('SKIP-NESTED-COOL'),
 'no mechanical or lubrication analysis for excluded systems');
const csv=A.csv(r);
assert(csv.includes('EXT-ROLLER')&&csv.includes('EXT-TURN'));
assert(!csv.includes('SKIP-CENT')&&!csv.includes('SKIP-COOL')&&!csv.includes('SKIP-NESTED-COOL'));
assert(csv.startsWith('"Оборудование ID";"Код";"Исходный тип";'));
assert(csv.includes('U-BELT')&&csv.includes('Ленточный / ременный конвейер'), 'CSV carries evidence hint but no automatic classification');
assert.equal(csv.split('\n').length,r.machineCount+1);
assert.equal(JSON.stringify(d),before,'entire existing database, approval, routes, plan and facts untouched');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('<script src="./conveyors/conveyor-coverage.js"></script>'));
assert(html.indexOf('conveyor-arrangement.js')<html.indexOf('conveyor-coverage.js'));
assert(html.indexOf('conveyor-coverage.js')<html.indexOf('qa/qa-ui.js'));
const qa=fs.readFileSync(path.join(root,'qa/qa-ui.js'),'utf8');
assert(qa.includes('function installConveyorCoverage(host,coverage,redraw)'));
assert(qa.includes('installConveyorCoverage(host,conveyorCoverage,draw)'));
assert(qa.includes('data-qa-conveyor-line')&&qa.includes('data-qa-conveyor-export'));
assert(qa.includes('data-qa-conveyor-filter')&&qa.includes('value="suggested"'));
assert(qa.includes('Подсказка по ТМЦ (тип не подтверждён)'), 'QA explicitly labels hint unapproved');
assert(qa.includes('data-qa-open-equipment'), 'equipment navigation uses existing QA infrastructure');
assert(!qa.includes('new LubricaRoute'),'coverage never creates a production route');
console.log('PASS Stage 5B.6 read-only conveyor constructor coverage: 2 lines, composite children, no-lube exclusions and unchanged production data');
