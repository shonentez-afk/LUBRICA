const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const win={};win.window=win;win.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null};
win.LubricaCore={IDs:{nextFrom(rows,prefix,digits){let x=1;while((rows||[]).some(v=>v.id===prefix+'-'+String(x).padStart(digits,'0')))x++;return prefix+'-'+String(x).padStart(digits,'0')}}};
win.LubricaStructureContext={activityCatalog:{regrease:{label:'Досмазывание'},oil_level_check:{label:'Проверка уровня'},oil_change:{label:'Замена масла'}},
 activityLabel:k=>({regrease:'Досмазывание',oil_level_check:'Проверка уровня',oil_change:'Замена масла'}[k]||k),
 activityTypeForLabel:label=>({'Досмазывание':'regrease','Проверка уровня':'oil_level_check','Замена масла':'oil_change'}[label]||'custom'),
 activityNeedsMaterial:k=>k==='regrease'||k==='oil_change',
 operationOptions:()=>['Досмазывание']
};
const box=vm.createContext({window:win,console,Date,JSON});box.LubricaCore=win.LubricaCore;
for(const rel of ['import/component-classifier.js','conveyors/conveyor-arrangement.js','import/candidate-finalizer.js']){
 const code=fs.readFileSync(path.join(root,rel),'utf8');
 new vm.Script(code,{filename:rel});vm.runInContext(code,box,{filename:rel});
}
const C=win.LubricaClassifier,F=win.LubricaCandidateFinalizer,Arr=win.LubricaConveyorArrangement;
const cases=[
 ['10107255','Конвейер ленточный приемный','belt'],
 ['10107181','Конвейер скребковый L=25150 мм Линия №1','chain_scraper'],
 ['10111009','Конвейер ременный RET-11-200xL=925','belt'],
 ['10108215','Конвейер роликовый нижний','roller'],
 ['10208276','Конвейер ламельный верхний','lamella'],
 ['10112094','Конвейер цепной KTR3250xL=3600','chain'],
 ['10110511','Конвейер шнековый','screw'],
 ['10111293','Конвейер поворотный поз. 111','turning'],
 ['10111262','Конвейер угловой поз. 110','turning'],
 ['10111014','Конвейер весовой поз. 101','weighing'],
 ['10212029','Конвейер ленточно-роликовый','hybrid'],
 ['10101093','Конвейер отсева каменного материала','unknown']
];
for(const [externalCode,name,subtype] of cases){
 const result=C.classifyEquipmentText(name,'conveyor');
 assert.equal(result.equipmentType,'conveyor',externalCode+' type');
 assert.equal(result.equipmentSubtype,subtype,externalCode+' subtype');
 assert.equal(result.template.id,'conveyor_arrangement',externalCode+' template');
 assert.equal(result.template.conveyorSubtype,subtype,externalCode+' subtype in constructor');
 const identity=C.conveyorIdentity(name,'conveyor');
 assert.equal(identity.twoShaft,['belt','chain_scraper'].includes(subtype),externalCode+' layout policy');
}
assert.equal(C.conveyorIdentity('Конвейеры роликовые','conveyor').role,'group');
assert.equal(C.classifyEquipmentText('Конвейер с мотор-редуктором R37','conveyor').equipmentType,'conveyor',
 'named conveyor must not be misclassified as reducer/motor');
assert.equal(C.classifyEquipmentText('Мотор-редуктор привода конвейера','motor_gearbox').equipmentType,'motor_gearbox',
 'a separate motor reducer remains its own asset');

assert.equal(C.conveyorIdentity('Система смазки цепей конвейера ламельного','conveyor').role,'ancillary');
assert.equal(C.conveyorIdentity('Система фильтрации','conveyor').role,'ancillary','type-tagged ancillary without conveyor token');
assert.equal(C.classifyEquipmentText('Система смазки цепей конвейера ламельного','conveyor').template,null);
function equipment(id,name,parent=null){return{id,name,equipmentType:'conveyor',parentEquipmentId:parent,lineId:'L1',areaId:'A1',status:'active'}}
function component(id,equipmentId,name,category=null,type=null){return {id,equipmentId,name,status:'active',candidateCategory:category,candidateEquipmentType:type,
 candidateState:category?'candidate':'review'}}
const group=equipment('GROUP','Конвейеры роликовые');
const roller=equipment('R','Конвейер роликовый SPZ1400xL=3700','GROUP');
const accessory=equipment('OIL','Система смазки цепей конвейера ламельного','LAM');
const lamella=equipment('LAM','Конвейер ламельный верхний','GROUP');
const nested=equipment('OTHER','Конвейер роликовый вспомогательный','LAM');
const rollerBearing=component('RB','R','Подшипник корпуса ролика','bearing');
const chain=component('CH','OIL','Цепь конвейерная 12B-2','chain');
const nestedBearing=component('NB','OTHER','Подшипник ролика','bearing');
const db={meta:{},equipment:[group,roller,lamella,accessory,nested],components:[rollerBearing,chain,nestedBearing],
 nodes:[],lubricationPoints:[],tasks:[],routes:[],checklistRuns:[],routePlanItems:[]};
const snap=JSON.stringify(db);
const grouped=C.classifyEquipment(db,group);
assert.equal(grouped.maintenanceCandidateKind,'structure_container');
assert.equal(grouped.maintenanceTemplate,null);
const ev=C.conveyorEvidence(db,lamella);
assert.equal(ev.conveyorSubtype,'lamella');
assert.equal(ev.descendantEquipmentCount,1,'oil-system child is included');
assert.equal(ev.byCategory.chain,1,'lubricated chain from nested ancillary system is visible');
const rejected=component('REJ','OIL','Подшипник 6210','bearing');
rejected.candidateState='rejected';db.components.push(rejected);
const rejectedEvidence=C.conveyorEvidence(db,lamella);
assert.equal(rejectedEvidence.byCategory.bearing||0,0,'rejected stale bearing category cannot create a candidate');
assert(rejectedEvidence.excluded.some(c=>c.id==='REJ'),'rejected bearing must be shown as excluded context');
db.components.pop();

assert.equal(ev.byCategory.bearing||0,0,'neighbor independent roller cannot leak into lamella');
assert.equal(ev.supportLayout,null,'lamella must not infer a four support layout');
const rEv=C.conveyorEvidence(db,roller);
assert.equal(rEv.count,1);
assert.equal(rEv.supportLayout,null);
const actualRoller=F.specsFor(C.classifyEquipment(db,roller),'equipment');
assert.equal(actualRoller.length,1,'one actual bearing gives one proposal');
assert.equal(actualRoller[0].selected,false,'no automatic bearing grease event on a roller');

let typed=C.classifyEquipment(db,lamella);
assert.equal(typed.maintenanceTemplate.evidence.byCategory.chain,1);
const lamellaRoles=Arr.composeEvidence(typed.maintenanceTemplate);
assert.equal(lamellaRoles.subtype,'lamella');
assert.equal(lamellaRoles.createsPoints,false,'composition must not create any points');
assert.equal(lamellaRoles.sections.find(x=>x.role==='chains').count,1);
assert.equal(lamellaRoles.sections.find(x=>x.role==='ancillary').count,1,'chain-lube subsystem must appear');
for(const subtype of ['roller','lamella','chain','screw','turning','hybrid','weighing']){
 const profile=Arr.composeEvidence({conveyorSubtype:subtype,evidence:{actual:[],assets:[],context:[],ancillary:[]}});
 assert.equal(profile.subtype,subtype);
 assert(profile.unsupportedGeometry,'compound variant cannot assume 2x2 supports: '+subtype);
 assert(profile.sections.every(x=>x.count===0),'no implicit physical support: '+subtype);
}

assert.equal(JSON.stringify(db),snap,'classification and evidence are read-only');
const breaker=equipment('B','Конвейер ленточный');
db.equipment.push(breaker);
db.components.push(component('B1','B','Подшипник 1','bearing'),component('B2','B','Подшипник 2','bearing'));
assert.equal(C.conveyorEvidence(db,breaker).supportLayout,null,'two bearings alone cannot prove two physical shafts');
db.components.push(component('S1','B','Вал приводной',null,'rotating_shaft'),component('S2','B','Вал натяжной',null,'rotating_shaft'));
const layout=C.conveyorEvidence(db,breaker).supportLayout;
assert(layout&&layout.supports.length===4,'two physical shafts can enable a four-place belt layout');
const rollerWithShaft=equipment('R2','Конвейер роликовый');
db.equipment.push(rollerWithShaft);
db.components.push(component('R1','R2','Вал приводной',null,'rotating_shaft'),
 component('R2B','R2','Вал натяжной',null,'rotating_shaft'),
 component('R3','R2','Подшипник 6205','bearing'));
assert.equal(C.conveyorEvidence(db,rollerWithShaft).supportLayout,null,'roller not forced into belt layout');
const manual=equipment('M','Конвейер роликовый');
manual.origin='manual';manual.externalCode='MAN-ROLL';db.equipment.push(manual);
Arr.ensureManualComponents(db,manual,{conveyorSubtype:'roller',chainEnabled:false,driveMode:'motor_gearbox',driveName:''});
assert.equal(manual.manualConveyorSetup.layout,'ACTUAL_COMPONENTS_ONLY');
assert.equal(db.components.filter(x=>x.equipmentId==='M').length,0,'no shaft/roller/drive/chain created from type alone');
Arr.ensureManualComponents(db,manual,{conveyorSubtype:'chain',chainEnabled:true,chainName:'Цепь роликовая 12B-2',
 driveMode:'gearbox',gearboxName:'SEW R37'});
assert.equal(manual.manualConveyorSetup.layout,'ACTUAL_COMPONENTS_ONLY');
assert.equal(db.components.filter(x=>x.equipmentId==='M'&&x.status==='active').length,2,'explicit chain and gearbox only');
assert.equal(db.components.filter(x=>x.equipmentId==='M'&&x.manualConveyorSupport).length,0);
Arr.ensureManualComponents(db,manual,{conveyorSubtype:'roller',chainEnabled:false,driveMode:'none'});
assert.equal(db.components.filter(x=>x.equipmentId==='M'&&x.status==='active').length,0,
 'explicitly removed drive/chain choices must not remain active');

const selected=F.specsFor(typed,'equipment');
assert.equal(selected.length,1,'one actual chain should give one actual chain proposal');
assert.equal(selected[0].sourceRef.id,'CH');
assert.equal(selected[0].category,'chain');
assert.equal(selected[0].selected,false,'compound chain service must require deliberate selection');
assert(selected[0].key.includes('CH'),'stable actual component key');
const ui=fs.readFileSync(path.join(root,'structure/entity-dialogs.js'),'utf8');
for(const subtype of ['roller','lamella','chain','screw','turning','hybrid','weighing']){
 assert(ui.includes('value="'+subtype+'"'),subtype+' shown in manual creator');
}
const detail=fs.readFileSync(path.join(root,'structure/detail-ui.js'),'utf8');
assert(detail.includes('isConveyorAncillary?.(x)'), 'legacy ancillary record must not expose standalone conveyor constructor');
const finalizer=fs.readFileSync(path.join(root,'import/candidate-finalizer.js'),'utf8');
assert(finalizer.includes('transactionalConveyor'),'conveyor save uses cloned database');
assert(finalizer.includes('usedTaskIds'),'approved/route/fact reapply protection');
assert(finalizer.includes('физическое место обслуживания'),'service positions required');
assert(finalizer.includes('conveyorSubtypeChoice'),'all conveyor subtypes selectable in the constructor');
assert(finalizer.includes('Сохранить тип без точек'),'subtype can be stored without virtual service points');
assert(finalizer.includes('previewConveyorSubtype'),'subtype change rebuilds read-only evidence');


// Real-site screenshot regression: 10108276, upper lamella conveyor (Nov 05).
// Two identical bearing designations are two distinct TMC records, not a single
// service point, and their actual service positions still need confirmation.
const upper=equipment('LAM-10108276','Конвейер ламельный верхний');
upper.externalCode='10108276';
const cooling=equipment('COOL-10108276','Система охлаждения привода конвейера ламельного верхнего',upper.id);
const upperDb={equipment:[upper,cooling],components:[],lubricationPoints:[],tasks:[],routes:[],checklistRuns:[],routePlanItems:[],nodes:[]};
upperDb.components.push(
 component('CHAIN-1524',upper.id,'Цепь тяговая P=152,4','chain'),
 component('BEARING-DRIVE',upper.id,'23234 CCK/W33','bearing'),
 component('BEARING-RETURN',upper.id,'23234 CCK/W33','bearing'),
 component('SHAFT-DRIVE',upper.id,'Вал КП верхний приводной усиленный L=3763 мм',null,'rotating_shaft'),
 component('SHAFT-RETURN',upper.id,'Вал КП верхний холостой L=3553 мм',null,'rotating_shaft'),
 component('MOTOR-1',upper.id,'Электродвигатель HQL 160SL B5',null,'motor'),
 component('GEARBOX',upper.id,'Редуктор SL8504FAR 1:233,5 EPIC PAM 200',null,'gearbox'),
 component('MOTOR-2',upper.id,'Электродвигатель M2AA 080A4 B5',null,'motor')
);
for(const [i,name] of ['Втулка закрепительная H 2334','Втулка закрепительная H 2330',
 'Звездочка P=152,4 Z=21 D=235','Болт M18x1,5x45 8.8 DIN 961',
 'Гайка M18x1,5 8 V M DIN 980'].entries()){
 const x=component('PASSIVE-'+i,upper.id,name);
 x.candidateState='excluded';
 upperDb.components.push(x);
}
const beforeUpper=JSON.stringify(upperDb);
const upperClass=C.classifyEquipment(upperDb,upper),upperEv=upperClass.maintenanceTemplate.evidence;
assert.equal(upperClass.maintenanceEquipmentSubtype,'lamella','10108276 is lamella');
assert.equal(upperEv.byCategory.bearing,2,'two distinct bearing records preserved');
assert.equal(upperEv.byCategory.chain,1,'one imported chain TMC; not a count of physical strands');
assert.equal(upperEv.context.length,2,'two installed shafts are context, not extra bearing points');
assert.equal(upperEv.assets.length,3,'two motors and one reducer');
assert.equal(upperEv.ancillary.length,1,'drive cooling system is ancillary');
assert.equal(upperEv.ancillary[0].id,'COOL-10108276');
assert.equal(upperEv.excluded.length,5,'fasteners, sprocket and sleeves are not points');
assert.equal(upperEv.supportLayout,null,'lamella cannot inherit 2x2 supports');
const upperCompose=Arr.composeEvidence(upperClass.maintenanceTemplate);
assert.equal(upperCompose.createsPoints,false,'visualization is read-only');
for(const [role,count] of [['bearings',2],['chains',1],['shafts',2],['drives',3],['ancillary',1]]){
 assert.equal(upperCompose.sections.find(x=>x.role===role).count,count,'10108276 '+role);
}
const upperSpecs=F.specsFor(upperClass,'equipment');
const bearingSpecs=upperSpecs.filter(x=>x.category==='bearing');
assert.equal(bearingSpecs.length,2,'one proposal per actual bearing source record');
assert.notEqual(bearingSpecs[0].key,bearingSpecs[1].key,'identical catalog designation cannot collapse two bearings');
assert.deepEqual(new Set(bearingSpecs.map(x=>x.sourceRef.id)),
 new Set(['BEARING-DRIVE','BEARING-RETURN']));
assert(upperSpecs.every(x=>x.selected===false),'no unconfirmed automatic grease/oil actions');
assert(!upperSpecs.some(x=>x.sourceRef?.id==='COOL-10108276'),'cooling system is not a lubrication point');
assert.equal(JSON.stringify(upperDb),beforeUpper,'read-only analysis cannot modify site structure');


// Field screenshot: lower lamella 10108299. Keep two separate 23234 bearings
// and one 23230 bearing as three distinct physical-source records, not an
// assumed "two shafts x two bearings" service layout.
const lower=equipment('LAM-10108299','Конвейер ламельный нижний');
lower.externalCode='10108299';
const lowerDb={equipment:[lower],components:[],lubricationPoints:[],tasks:[],routes:[],checklistRuns:[],routePlanItems:[],nodes:[]};
lowerDb.components.push(
 component('LOWER-CHAIN',lower.id,'Цепь тяговая P=152,4','chain'),
 component('LOWER-23234-A',lower.id,'23234 CCK/W33','bearing'),
 component('LOWER-23234-B',lower.id,'23234 CCK/W33','bearing'),
 component('LOWER-23230',lower.id,'23230 CCK/W33','bearing'),
 component('LOWER-DRIVE-SHAFT',lower.id,'Вал КП нижний приводной усиленный L=3385 мм G1.F23142',null,'rotating_shaft'),
 component('LOWER-IDLE-SHAFT',lower.id,'Вал нижний холостой L=3229 мм G1.F23098',null,'rotating_shaft'),
 component('LOWER-MOTOR-1',lower.id,'Электродвигатель HQL 160SL B5',null,'motor'),
 component('LOWER-GEARBOX',lower.id,'Редуктор SL8504FAR 1:233,5 EPIC PAM 200',null,'gearbox'),
 component('LOWER-MOTOR-2',lower.id,'Электродвигатель M2AA 080A4 B5',null,'motor')
);
for(const [i,name] of ['Втулка закрепительная H 2334','Втулка закрепительная H 2330',
 'Звездочка P=152,4 Z=21 D=235','Болт M18x1,5x45 8.8 DIN 961',
 'Гайка M18x1,5 8 V M DIN 980'].entries()){
 const x=component('LOWER-PASSIVE-'+i,lower.id,name);
 x.candidateState='excluded';
 lowerDb.components.push(x);
}
const lowerBefore=JSON.stringify(lowerDb);
const lowerClass=C.classifyEquipment(lowerDb,lower),lowerEv=lowerClass.maintenanceTemplate.evidence;
assert.equal(lowerClass.maintenanceEquipmentSubtype,'lamella','10108299 detected as lower lamella');
assert.equal(lowerEv.byCategory.bearing,3,'10108299 requires three independent bearing source records');
assert.equal(lowerEv.byCategory.chain,1,'one chain record, number of physical chains unverified');
assert.equal(lowerEv.context.length,2,'lower conveyor: two separate installed shaft records');
assert.equal(lowerEv.assets.length,3,'lower conveyor: two motors plus one reducer');
assert.equal(lowerEv.excluded.length,5,'non-service fasteners remain excluded');
assert.equal(lowerEv.supportLayout,null,'do not fabricate a fourth support from two shafts');
const lowerCompose=Arr.composeEvidence(lowerClass.maintenanceTemplate);
assert.equal(lowerCompose.sections.find(x=>x.role==='bearings').count,3);
assert.equal(lowerCompose.sections.find(x=>x.role==='shafts').count,2);
assert.equal(lowerCompose.sections.find(x=>x.role==='chains').count,1);
const lowerSpecs=F.specsFor(lowerClass,'equipment');
const lowerBearingSpecs=lowerSpecs.filter(x=>x.category==='bearing');
assert.equal(lowerBearingSpecs.length,3,'one proposal per imported bearing source');
assert.equal(new Set(lowerBearingSpecs.map(x=>x.key)).size,3,'same designation must retain distinct physical IDs');
assert.equal(lowerBearingSpecs.filter(x=>x.name==='23234 CCK/W33').length,2);
assert.equal(lowerBearingSpecs.filter(x=>x.name==='23230 CCK/W33').length,1);
assert(lowerBearingSpecs.every(x=>x.selected===false),'no unconfirmed automatic relubrication');
assert(lowerSpecs.every(x=>x.selected===false),'chain lubrication remains unconfirmed');
assert.equal(lowerDb.lubricationPoints.length,0,'screen analysis must not create service points');
assert.equal(lowerDb.tasks.length,0,'screen analysis must not create tasks');
assert.equal(JSON.stringify(lowerDb),lowerBefore,'screen evidence analysis is read-only');


// Field screenshot: chain conveyor #1 / 10109145 is NOT the KTR 10112094.
// Distinguish installed SKF flange-bearing TMC, chain, drive and three
// PA 6 G OILAMID guides without assuming that polymer guides need greasing.
const chainOne=equipment('CHAIN-10109145','Конвейер цепной 1');
chainOne.externalCode='10109145';
const chainDb={equipment:[chainOne],components:[],lubricationPoints:[],tasks:[],
 routes:[],checklistRuns:[],routePlanItems:[],nodes:[]};
chainDb.components.push(
 component('CHAIN-TKF',chainOne.id,'Цепь конвейерная TKF, L=23588','chain'),
 component('CHAIN-FY55',chainOne.id,'FY 55 TF','bearing'),
 component('CHAIN-GEARMOTOR',chainOne.id,'Мотор-редуктор FH77/G DRE132S4/TF i=58,32 N=4 кВт',null,'motor_gearbox'),
 component('CHAIN-GUIDE-1',chainOne.id,'Направляющая 35x50x600 PA 6-G OILAMID','guide'),
 component('CHAIN-GUIDE-2',chainOne.id,'Направляющая 15x50x600 PA 6-G OILAMID','guide'),
 component('CHAIN-GUIDE-3',chainOne.id,'Направляющая 35x50x1050 PA 6-G OILAMID','guide')
);
// Local engineer confirmed: all OILAMID guides in this conveyor require NO external lubricant.
for(const g of chainDb.components.filter(x=>x.name.includes('OILAMID'))){
 assert.equal(C.isNonLubricatedOilamidGuide(g.name),true);
 const classified=C.classifyComponentText(g.name);
 assert.equal(classified.state,'excluded','OILAMID component classification');
 assert.equal(classified.category,null,'OILAMID is no longer grease-point category');
 const upgraded=C.classifyComponent(g);
 assert.equal(upgraded.candidateState,'excluded','old candidate updates on reclassification');
 assert.equal(upgraded.candidateCategory,null,'no stale guide category after reclassification');
}
assert.notEqual(C.classifyComponentText('Направляющая рельсовая подшипниковая').state,'excluded',
 'unrelated mechanical guides and linear bearings retain normal classification');
assert.equal(C.classifyComponentText('Направляющая PA 6 G + Oil').state,'excluded',
 'the alternative PA 6 G + Oil spelling must be supported');
const chainBefore=JSON.stringify(chainDb);
const chainTyped=C.classifyEquipment(chainDb,chainOne),chainEv=chainTyped.maintenanceTemplate.evidence;
assert.equal(chainTyped.maintenanceEquipmentSubtype,'chain','10109145 is chain, not KTR-specific profile');
assert.equal(chainEv.byCategory.chain,1,'one actual imported chain source');
assert.equal(chainEv.byCategory.bearing,1,'one actual imported FY 55 TF source');
assert.equal(chainEv.byCategory.guide||0,0,'OILAMID guides are not lubrication candidates');
assert.equal(chainEv.excluded.length,3,'three OILAMID source rows are excluded from lubrication, not erased');
assert(chainEv.excluded.every(x=>x.reason.includes('внешняя смазка не требуется')),'site-approved exclusion reason visible');
assert.equal(chainEv.assets.length,1,'one FH77/G gearede motor asset');
assert.equal(chainEv.context.length,0,'no confirmed shaft records in screenshot');
assert.equal(chainEv.supportLayout,null,'never invent four bearing supports');
assert.equal(chainDb.components.filter(x=>x.name.includes('OILAMID')).length,3,'source mechanical components remain in plant structure');
const chainProfile=Arr.composeEvidence(chainTyped.maintenanceTemplate);
assert.equal(chainProfile.sections.find(x=>x.role==='chains').count,1);
assert.equal(chainProfile.sections.find(x=>x.role==='bearings').count,1);
assert.equal(chainProfile.sections.find(x=>x.role==='drives').count,1);
assert(!chainProfile.sections.some(x=>x.role==='other'&&x.count>0),'OILAMID guides no longer appear as potentially lubricated pairs');
const chainSpecs=F.specsFor(chainTyped,'equipment');
assert.equal(chainSpecs.filter(x=>x.category==='bearing').length,1);
assert.equal(chainSpecs.filter(x=>x.category==='chain').length,1);
assert.equal(chainSpecs.filter(x=>x.category==='guide').length,0,'no OILAMID grease point proposals');
assert.equal(chainSpecs.filter(x=>x.category==='gearbox_oil').length,1);
assert(chainEv.excluded.every(x=>x.servicePolicy==='NO_EXTERNAL_LUBRICATION'),
 'exclusion is explicit for imported pre-classified legacy guide components');
assert(chainSpecs.filter(x=>x.category==='bearing'||x.category==='chain').every(x=>!x.selected),
 'no machine-specific lubricant dose or approval from component names');
assert.equal(new Set(chainSpecs.map(x=>x.key)).size,chainSpecs.length,'TMC identity is stable and distinct');
assert.equal(chainDb.lubricationPoints.length,0,'read-only screenshot analysis cannot create points');
assert.equal(chainDb.tasks.length,0,'read-only screenshot analysis cannot create tasks');
assert.equal(JSON.stringify(chainDb),chainBefore,'classification must not mutate user database');


// Site screenshot: KTR3250xL=3600 (10112094) is nested under the palletizer's
// turning conveyor 504. A unit's parent is not an extra conveyor drive/support.
const ktr=equipment('KTR-10112094','Конвейер цепной KTR3250xL=3600');
ktr.externalCode='10112094';
ktr.parentEquipmentId='TURNING-504';
const ktrParent=equipment('TURNING-504','Конвейер угловой поз. 504');
const ktrDb={equipment:[ktrParent,ktr],components:[],lubricationPoints:[],tasks:[],
 routes:[],checklistRuns:[],routePlanItems:[],nodes:[]};
ktrDb.components.push(
 component('KTR-CHAIN',ktr.id,'Цепь роликовая 12B-2GL','chain'),
 component('KTR-BEARING',ktr.id,'Узел подшипниковый SY 45 TF','bearing'),
 component('KTR-DRIVE',ktr.id,'Мотор-редуктор SA67DV100M4/M1-A/180°',null,'motor_gearbox'),
 component('KTR-SLEEVE-OTHER',ktr.id,'Втулка 30/40x30-50x5','bushing'),
 component('KTR-TAPER',ktr.id,'Втулка TB 2012-45','bushing')
);
for(const [i,name] of ['Звездочка цепная 12В-2 Z=19 TB2012',
 'Звездочка цепная P=3/4" S Z=17 с подшипниками 6205-2RS1'].entries()){
 const item=component('KTR-SPROCKET-'+i,ktr.id,name);
 item.candidateState='excluded';
 item.candidateCategory=null;
 ktrDb.components.push(item);
}
const ktrBefore=JSON.stringify(ktrDb);
assert.equal(C.isMountingTaperBushing('Втулка TB 2012-45'),true);
assert.equal(C.isMountingTaperBushing('Втулка TB2012-45'),true);
assert.equal(C.isMountingTaperBushing('Втулка 30/40x30-50x5'),false,
 'ambiguous generic sleeves stay under review');
assert.equal(C.classifyComponentText('Втулка TB 2012-45').state,'excluded',
 'Taper Lock must not be treated as lubricated sliding bearing');
assert.notEqual(C.classifyComponentText('Втулка 30/40x30-50x5').state,'excluded',
 'do not sweep other bushings into Taper Lock exclusions');
const reclassified=C.classifyComponent(ktrDb.components.find(c=>c.id==='KTR-TAPER'));
assert.equal(reclassified.candidateState,'excluded','KTR taper lock is mounting-only');
assert.equal(reclassified.candidateCategory,null);
const ktrClass=C.classifyEquipment(ktrDb,ktr),ktrEv=ktrClass.maintenanceTemplate.evidence;
assert.equal(ktrClass.maintenanceEquipmentSubtype,'chain','KTR family must be chain');
assert.equal(ktrEv.byCategory.chain,1,'one chain item is not proven number of parallel strands');
assert.equal(ktrEv.byCategory.bearing,1,'one SY 45 TF source row');
assert.equal(ktrEv.byCategory.bushing,1,'only unknown dimensional sleeve remains review');
assert.equal(ktrEv.assets.length,1,'one SA67 gearmotor');
assert.equal(ktrEv.context.length,0,'no imported shafts');
assert.equal(ktrEv.supportLayout,null,'do not create 2x2 supports');
assert.equal(ktrEv.excluded.length,3,'two sprockets plus the Taper Lock');
assert(ktrEv.excluded.some(x=>x.id==='KTR-TAPER'&&x.servicePolicy==='NON_LUBRICATED_MOUNTING_ELEMENT'));
assert(ktrEv.excluded.some(x=>x.name.includes('6205-2RS1')),
 'sealed bearing in sprocket assembly remains part of excluded assembly, not a grease point');
const ktrComposition=Arr.composeEvidence(ktrClass.maintenanceTemplate);
assert.equal(ktrComposition.sections.find(x=>x.role==='bearings').count,1);
assert.equal(ktrComposition.sections.find(x=>x.role==='chains').count,1);
assert.equal(ktrComposition.sections.find(x=>x.role==='drives').count,1);
assert.equal(ktrComposition.sections.find(x=>x.role==='other').count,1);
const ktrSpecs=F.specsFor(ktrClass,'equipment');
assert.equal(ktrSpecs.filter(x=>x.category==='bearing').length,1);
assert.equal(ktrSpecs.filter(x=>x.category==='chain').length,1);
assert.equal(ktrSpecs.filter(x=>x.category==='bushing').length,1);
assert.equal(ktrSpecs.filter(x=>x.category==='gearbox_oil').length,1);
assert(!ktrSpecs.some(x=>x.sourceRef?.id==='KTR-TAPER'),'mounting bush never yields service proposal');
assert(!ktrSpecs.some(x=>x.key.includes('KTR-SPROCKET')),'sprockets do not yield service proposals');
assert(ktrSpecs.every(x=>!x.selected),'no automatic lubrication approval for KTR without service evidence');
assert.equal(ktrDb.lubricationPoints.length,0,'preview cannot add phantom grease points');
assert.equal(ktrDb.tasks.length,0,'preview cannot add maintenance tasks');
assert.equal(JSON.stringify(ktrDb),ktrBefore,'evidence preview cannot mutate a plant database');


// Plant JSON audit of 2026-11-05: 10110511 and 10210511 actually contain
// a screw mechanical component, though older classifier showed "shafts: 0".
// It is context only, not a bearing or autonomous lubrication point.
for(const [line,external,eqid,parts] of [
 ['1','10110511','EQ-000767',['COMP-0002854','COMP-0002855','COMP-0002856']],
 ['2','10210511','EQ-000819',['COMP-0003226','COMP-0003227','COMP-0003228']]
]){
 const eq=equipment(eqid,'Конвейер шнековый');
 eq.externalCode=external;eq.lineId='L'+line;
 const screw=component(parts[0],eq.id,'Шнек L=5390 мм d=350 мм A-G3247147 06');
 screw.candidateState='unclassified';
 const motor=component(parts[1],eq.id,'Электродвигатель M2AA 90L4 B5',null,'motor');
 const gearbox=component(parts[2],eq.id,'Редуктор C513/P 1:93,0 B3 PAM 90',null,'gearbox');
 const site={equipment:[eq],components:[screw,motor,gearbox],lubricationPoints:[],tasks:[],
  nodes:[],routes:[],routePlanItems:[],checklistRuns:[]};
 const sourceSnapshot=JSON.stringify(site);
 const type=C.classifyEquipment(site,eq);
 assert.equal(type.maintenanceEquipmentSubtype,'screw',external+' screw subtype');
 const ev=type.maintenanceTemplate.evidence;
 assert.equal(ev.count,0,external+' no imported grease-point TMCs');
 assert.equal(ev.assets.length,2,external+' one ABB motor plus one BONFIGLIOLI gearbox');
 assert.equal(ev.context.length,1,external+' imported screw shaft must appear in structure');
 assert.equal(ev.context[0].id,parts[0],external+' exact screw TMC identity');
 assert.equal(ev.supportLayout,null,external+' never infer two shafts or four bearings');
 assert.equal(ev.byCategory.bearing||0,0,external+' bearing points are not confirmed');
 const composed=Arr.composeEvidence(type.maintenanceTemplate);
 assert.equal(composed.subtype,'screw');
 assert.equal(composed.sections.find(x=>x.role==='shafts').count,1,
   external+' "Шнек и вращающийся вал" must show actual imported screw');
 assert.equal(composed.sections.find(x=>x.role==='bearings').count,0);
 assert.equal(composed.sections.find(x=>x.role==='drives').count,2);
 assert.equal(composed.createsPoints,false);
 const suggested=F.specsFor(type,'equipment');
 assert.equal(suggested.length,1,external+' only gearbox OEM-review candidate');
 assert.equal(suggested[0].category,'gearbox_oil',external+' gearbox category proposed, not confirmed');
 assert.equal(suggested[0].sourceRef.id,parts[2],external+' reducer sourceRef');
 assert.equal(suggested[0].selected,false,external+' gearbox point requires engineer confirmation');
 assert.equal(suggested[0].requiresOemVerification,true,external+' OEM lubrication policy pending');
 assert.equal(suggested[0].position,'',external+' physical location not auto-filled as generic drive');
 assert.equal(suggested[0].activities.length,0,external+' do not preselect level check or oil change');
 assert(!suggested.some(x=>x.sourceRef?.id===parts[0]),external+' screw cannot be a grease point');
 assert(!suggested.some(x=>x.sourceRef?.id===parts[1]),external+' motor has separate bearing policy');
 assert.equal(site.lubricationPoints.length,0);
 assert.equal(site.tasks.length,0);
 assert.equal(JSON.stringify(site),sourceSnapshot,external+' read-only audit must not mutate DB');
}


// Stage 5B — actual Line 1 packaging hierarchy shown by user:
// 10111293 (turning station) = 10111294 roller SPZ1600 + 10111321 vertical belt PTM800.
// The two children must keep independent mechanical/evidence/service ownership.
const turn111=equipment('EQ-000855','Конвейер поворотный поз. 111');
turn111.externalCode='10111293';
const roller111=equipment('EQ-000856','Конвейер роликовый SPZ1600xL=5500',turn111.id);
roller111.externalCode='10111294';
const belt111=equipment('EQ-000857','Конвейер ленточный вертикальный PTM800xL=4650',turn111.id);
belt111.externalCode='10111321';
const turnDb={equipment:[turn111,roller111,belt111],components:[],
 nodes:[],lubricationPoints:[],tasks:[],routes:[],checklistRuns:[],routePlanItems:[]};
const cmp=(id,eq,name,cat=null,type=null)=>turnDb.components.push(component(id,eq.id,name,cat,type));
for(const [i,len] of [440,785,1130,1425,1480,1665].entries())
 cmp('ROLLER-P-'+i,roller111,'Ролик SSK2-76-FFK-SPZ-'+len);
cmp('ROLLER-SY',roller111,'Узел подшипниковый SY 30 TF','bearing');
cmp('ROLLER-TU',roller111,'Узел подшипниковый TU 30 TF','bearing');
cmp('ROLLER-DRIVE',roller111,'Мотор-редуктор R67DV100M4/TF/M1',null,'motor_gearbox');
for(const code of ['TB 1610-30','TB 2012-30','TB 1610-35'])cmp('ROLLER-'+code.replace(/\s/g,''),roller111,'Втулка '+code,'bushing');
cmp('BELT-DRIVE',belt111,'Мотор-редуктор S47DT80N4/TF/M5/B/180',null,'motor_gearbox');
cmp('BELT-YAR',belt111,'Подшипник YAR 206-2F','bearing');
cmp('BELT-6005',belt111,'Подшипник 6005-2RS1','bearing');
for(const code of ['TB 1615-30','TB 1615-25'])cmp('BELT-'+code.replace(/\s/g,''),belt111,'Втулка '+code,'bushing');
const beforeTurn=JSON.stringify(turnDb);
const parentAssembly=C.conveyorAssembly(turnDb,turn111);
assert.equal(parentAssembly.kind,'multi_conveyor');
assert.equal(parentAssembly.parentEquipmentId,'EQ-000855');
assert.equal(parentAssembly.childCount,2,'real machine has two independently serviceable sub-conveyors');
assert.deepEqual(Array.from(parentAssembly.children.map(ch=>ch.externalCode)),['10111294','10111321']);
assert.deepEqual(Array.from(parentAssembly.children.map(ch=>ch.subtype)),['roller','belt']);
assert(parentAssembly.children.every(ch=>ch.maintenanceOwnerEquipmentId===ch.id),'each child owns its own maintenance records');
assert.equal(C.conveyorAssembly(turnDb,roller111),null,'roller child is not a composite');
assert.equal(C.conveyorAssembly(turnDb,belt111),null,'vertical belt child is not a composite');
const parentClass=C.classifyEquipment(turnDb,turn111);
const parentEv=parentClass.maintenanceTemplate.evidence;
assert.equal(parentClass.maintenanceEquipmentSubtype,'turning');
assert.equal(parentClass.maintenanceTemplate.mode,'composite');
assert(parentClass.maintenanceTemplate.summary.includes('2 самостоятельных механизма'));
assert.equal(parentEv.assembly.childCount,2);
assert.equal(parentEv.actual.length,0,'parent must not absorb actual child bearings');
assert.equal(parentEv.assets.length,0,'parent must not duplicate independent drives');
assert.equal(parentEv.context.length,0,'parent must not copy children rollers');
assert.equal(parentEv.supportLayout,null);
assert.equal(F.specsFor(parentClass,'equipment').length,0,'parent has no duplicate lubrication proposals');
assert.equal(C.conveyorDescendants(turnDb,turn111).length,0,'independent children excluded from parent evidence traversal');
const r111=C.classifyEquipment(turnDb,roller111);
const rv=r111.maintenanceTemplate.evidence;
assert.equal(r111.maintenanceEquipmentSubtype,'roller');
assert.equal(rv.context.length,6,'six actual roller component records retained');
assert.equal(rv.byCategory.bearing,2,'SY 30 TF and TU 30 TF belong only to roller child');
assert.equal(rv.assets.length,1);
assert.equal(rv.excluded.filter(x=>x.servicePolicy==='NON_LUBRICATED_MOUNTING_ELEMENT').length,3,
 'three TB1610/2012 mounting bushes are not lubrication points');
assert.equal(rv.supportLayout,null);
const rSpecs=F.specsFor(r111,'equipment');
assert.equal(rSpecs.filter(x=>x.category==='bearing').length,2,'two separate roller bearing sources');
assert(!rSpecs.some(x=>x.sourceRef?.name.includes('Втулка TB')),'TB mountings omitted from grease proposals');
const b111=C.classifyEquipment(turnDb,belt111);
const bv=b111.maintenanceTemplate.evidence;
assert.equal(b111.maintenanceEquipmentSubtype,'belt');
assert.equal(bv.byCategory.bearing,1,'YAR 206-2F stays in bearing evidence');
assert.equal(bv.assets.length,1);
assert.equal(bv.excluded.filter(x=>x.servicePolicy==='NON_LUBRICATED_MOUNTING_ELEMENT').length,2,
 'both TB1615 mounting bushes excluded');
assert.equal(bv.excluded.filter(x=>x.servicePolicy==='FACTORY_SEALED_NO_REGREASE').length,1,
 '6005-2RS1 stays mechanical but is not a routine regrease point');
assert.equal(bv.supportLayout,null,'old importer must not infer 2x2 shafts in belt child');
const bSpecs=F.specsFor(b111,'equipment');
assert.equal(bSpecs.filter(x=>x.category==='bearing').length,1);
assert.equal(bSpecs.find(x=>x.category==='bearing').sourceRef.id,'BELT-YAR');
assert(!bSpecs.some(x=>x.sourceRef?.id==='BELT-6005'));
assert(C.isFactorySealed6005Bearing('Подшипник 6005-2RS1'));
assert.equal(C.isFactorySealed6005Bearing('Подшипник YAR 206-2F'),false,
 'YAR 206-2F must not be confused with sealed 6005-2RS1');
assert.equal(C.classifyComponentText('Подшипник 6005-2RS1').state,'excluded');
for(const bushing of ['Втулка TB 1610-30','Втулка TB 1610-35','Втулка TB 2012-30','Втулка TB 1615-25','Втулка TB 1615-30']){
 assert(C.isMountingTaperBushing(bushing),bushing+' should not be offered for relubrication');
}
assert(!C.isMountingTaperBushing('Втулка 30/40x30-50x5'),'unverified sliding sleeve must not be excluded');
const compositeFinalizerUi=fs.readFileSync(path.join(root,'import/candidate-finalizer.js'),'utf8');
const compositeDetailUi=fs.readFileSync(path.join(root,'structure/detail-ui.js'),'utf8');
assert(compositeFinalizerUi.includes('conveyorAssemblyPanel(template)'),'parent wizard shows independent child machines');
assert(compositeFinalizerUi.includes('data-open-conveyor-child'),'parent wizard has child-opening controls');
assert(compositeDetailUi.includes('data-conveyor-child-id'),'Structure detail shows child machine constructors');
assert.equal(JSON.stringify(turnDb),beforeTurn,'parent and child previews must leave original data unchanged');
assert.equal(turnDb.lubricationPoints.length,0);
assert.equal(turnDb.tasks.length,0);

console.log('PASS Stage 5B conveyor families: 13 real naming examples, groups, nested lube, layouts, manual, physical specs, guards');
