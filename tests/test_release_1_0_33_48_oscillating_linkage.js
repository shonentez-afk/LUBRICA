const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const nextFrom=(arr,prefix,width=6)=>{let max=0;for(const x of arr||[]){const m=String(x.id||'').match(new RegExp('^'+prefix+'-(\\d+)$'));if(m)max=Math.max(max,Number(m[1]));}return `${prefix}-${String(max+1).padStart(width,'0')}`};
const context={console,window:{LubricaCore:{State:{getDatabase(){return null}},Database:{normalize:x=>x},IDs:{nextFrom}}}};
context.window.window=context.window;vm.createContext(context);
for(const rel of ['structure/context.js','import/component-classifier.js','import/candidate-finalizer.js','oscillating/oscillating-linkage-arrangement.js'])vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
const CL=context.window.LubricaClassifier,F=context.window.LubricaCandidateFinalizer,O=context.window.LubricaOscillatingLinkageArrangement;
const assert=(x,m)=>{if(!x)throw new Error(m)};
const eqType=n=>CL.classifyEquipmentText(n)?.equipmentType;
assert(eqType('Система качания Линия №1')==='oscillating_mechanism','system recognition');
assert(eqType('Механизм качания')==='oscillating_mechanism','mechanism recognition');
assert(eqType('Механизм кривошипно-шатунный основной')==='crank','legacy crank type preserved');
assert(eqType('Шатун левый Линия №1')==='connecting_rod','connecting rod recognition');
assert(eqType('Тяга правая')==='link_rod','link rod recognition');
assert(eqType('Компенсатор левый')==='compensator','mechanical compensator recognition');
assert(eqType('Кронштейн правый')==='support_bracket','support bracket recognition');
assert(eqType('Компенсатор тканевый DN500')!=='compensator','fabric compensator excluded');
assert(CL.classifyEquipmentText('Ручная система','oscillating_mechanism').equipmentType==='oscillating_mechanism','manual explicit type recognition');
assert(O.sideOf('Ось вращения левая')==='left'&&O.sideOf('Тяга правая')==='right','left/right recognition');
assert(O.defaultConnections('connecting_rod').length===2,'connecting rod has A/B confirmation slots');
assert(O.defaultConnections('pivot_shaft').length===2,'pivot shaft has two support slots');
assert(O.defaultConnections('crank_linkage').length===0,'crank linkage connection count is not hard-coded');

function base(){return {equipment:[],components:[],nodes:[],lubricationPoints:[],tasks:[]};}
const db1=base();
const r1={id:'EQ-ROOT1',name:'Система качания Линия №1',equipmentType:'oscillating_mechanism',maintenanceEquipmentType:'oscillating_mechanism',areaId:'AREA1',lineId:'LINE1',status:'active'};
db1.equipment.push(r1,
 {id:'E1',name:'Шатун правый Линия №1',areaId:'AREA1',lineId:'LINE1',parentEquipmentId:'EQ-ROOT1'},
 {id:'E2',name:'Шатун левый Линия №1',areaId:'AREA1',lineId:'LINE1',parentEquipmentId:'EQ-ROOT1'},
 {id:'E3',name:'Ось вращения левая Линия №1',areaId:'AREA1',lineId:'LINE1',parentEquipmentId:'EQ-ROOT1'},
 {id:'E4',name:'Ось вращения правая Линия №1',areaId:'AREA1',lineId:'LINE1',parentEquipmentId:'EQ-ROOT1'},
 {id:'E5',name:'Механизм кривошипно-шатунный основной',areaId:'AREA1',lineId:'LINE1',parentEquipmentId:'EQ-ROOT1'},
 {id:'E6',name:'Механизм кривошипно-шатунный дополнительный',areaId:'AREA1',lineId:'LINE1',parentEquipmentId:'EQ-ROOT1'}
);
let ev=O.evidence(db1,r1);
assert(ev.counts.connecting_rod===2,'line1 two connecting rods');
assert(ev.counts.pivot_shaft===2,'line1 two pivot shafts');
assert(ev.counts.crank_linkage===2,'line1 two crank linkages');

const db2=base();
const r2={id:'EQ-ROOT2',name:'Система качания Линия №2',equipmentType:'oscillating_mechanism',maintenanceEquipmentType:'oscillating_mechanism',areaId:'AREA2',lineId:'LINE2',status:'active'};
const names=['Шатун правый','Шатун левый','Тяга правая','Тяга левая','Компенсатор правый','Компенсатор левый','Кронштейн правый','Кронштейн левый'];
db2.equipment.push(r2,...names.map((name,i)=>({id:`L2-${i}`,name,areaId:'AREA2',lineId:'LINE2',parentEquipmentId:'EQ-ROOT2'})));
ev=O.evidence(db2,r2);
assert(ev.counts.connecting_rod===2,'line2 two connecting rods');
assert(ev.counts.link_rod===2,'line2 two link rods');
assert(ev.counts.compensator===2,'line2 two compensators');
assert(ev.counts.support_bracket===2,'line2 two support brackets');

const unrelated={id:'EQ-X',name:'Насос технологический',areaId:'AREA2',lineId:'LINE2'};db2.equipment.push(unrelated);
assert(O.rootForRecord(db2,unrelated,'equipment')===null,'unrelated equipment must not be hijacked by oscillating engine');
const rod=db2.equipment.find(x=>x.name==='Шатун левый');assert(O.rootForRecord(db2,rod,'equipment')?.id===r2.id,'role element routes to oscillating root');

// Unknown construction must not create a virtual point.
const unknownDraft=[{key:'rod_left',name:'Шатун левый',role:'connecting_rod',side:'left',connections:[{key:'a',label:'Шарнир A',type:'unknown',componentId:'',manualDesignation:''},{key:'b',label:'Шарнир B',type:'none',componentId:'',manualDesignation:''}]}];
let built=O.validateAndBuild(db2,r2,unknownDraft,[]);
assert(built.specs.length===0,'unknown/non-serviceable connections create no points');
assert(built.unresolved.length===1,'unknown connection remains explicit unresolved item');

// A bearing requires factual TMC/designation and reuses candidate finalizer lifecycle.
const bearingComp={id:'COMP-6205',equipmentId:rod.id,name:'Подшипник 6205-2RS1',candidateCategory:'bearing',status:'active'};db2.components.push(bearingComp);
const confirmedDraft=[{key:'rod_left',name:'Шатун левый',role:'connecting_rod',side:'left',connections:[{key:'a',label:'верхний шарнир',type:'bearing',componentId:bearingComp.id,manualDesignation:''},{key:'b',label:'нижний шарнир',type:'unknown',componentId:'',manualDesignation:''}]}];
built=O.validateAndBuild(db2,r2,confirmedDraft,[bearingComp]);
assert(built.specs.length===1&&built.unresolved.length===1,'partial confirmation creates only factual point');
assert(built.specs[0].serviceLocationName==='Шатун левый · верхний шарнир','physical service-location naming');
F.applyConfirmedSpecs(db2,'equipment',r2,r2,{id:'oscillating_linkage',title:'Система качания / рычажный механизм'},built.specs);
assert(db2.lubricationPoints.length===1&&db2.tasks.length===1,'confirmed bearing produces one point and one existing regrease task');
assert(db2.lubricationPoints[0].candidateOriginKey.includes('osc_rod_left_a'),'stable candidate origin key');
F.applyConfirmedSpecs(db2,'equipment',r2,r2,{id:'oscillating_linkage',title:'Система качания / рычажный механизм'},built.specs);
assert(db2.lubricationPoints.length===1&&db2.tasks.length===1,'repeat confirmation is idempotent');
// Simulate approved deletion lifecycle: remove task/point and rebuild from the confirmed mechanism.
db2.tasks=[];db2.lubricationPoints=[];
F.applyConfirmedSpecs(db2,'equipment',r2,r2,{id:'oscillating_linkage',title:'Система качания / рычажный механизм'},built.specs);
assert(db2.lubricationPoints.length===1&&db2.tasks.length===1,'recreate after deletion produces one point/task without duplicates');

// Bearing with no TMC/designation is rejected; bushing can be confirmed without invented designation.
let missing=O.validateAndBuild(db2,r2,[{key:'shaft',name:'Ось вращения левая',role:'pivot_shaft',side:'left',connections:[{key:'a',label:'Опора A',type:'bearing',componentId:'',manualDesignation:''},{key:'b',label:'Опора B',type:'bushing',componentId:'',manualDesignation:''}]}],[]);
assert(missing.specs.length===1&&missing.specs[0].category==='bushing','confirmed bushing allowed without invented bearing designation');
assert(missing.unresolved.length===1,'bearing without designation remains unresolved');
const housingDb=base();housingDb.equipment.push(r2);housingDb.components.push({id:'COMP-UC',equipmentId:r2.id,name:'UC 208',candidateCategory:'bearing',status:'active'},{id:'COMP-SNL',equipmentId:r2.id,name:'SNL 522 + 22222 EK/C3',candidateCategory:'bearing',status:'active'});
const housing=O.validateAndBuild(housingDb,r2,[{key:'shaft2',name:'Ось вращения правая',role:'pivot_shaft',side:'right',connections:[{key:'a',label:'Опора A',type:'housed_bearing',componentId:'COMP-UC',manualDesignation:''},{key:'b',label:'Опора B',type:'snl',componentId:'COMP-SNL',manualDesignation:''}]}],housingDb.components);
assert(housing.specs.length===2&&housing.specs.every(x=>x.category==='bearing'),'UC/UK and SNL reuse bearing point/calculation path');
assert(housing.specs[0].connectionType==='housed_bearing'&&housing.specs[1].connectionType==='snl','housing context retained');
const pump={id:'EQ-PUMP',name:'Насос',areaId:'AREA2',lineId:'LINE2',parentEquipmentId:'GROUP-PUMP'};const pumpBracket={id:'EQ-BR',name:'Кронштейн правый',areaId:'AREA2',lineId:'LINE2',parentEquipmentId:'EQ-PUMP'};db2.equipment.push(pump,pumpBracket);assert(O.rootForRecord(db2,pumpBracket,'equipment')===null,'unrelated bracket under another aggregate is not hijacked');

const engineText=fs.readFileSync(path.join(root,'oscillating/oscillating-linkage-arrangement.js'),'utf8');
assert(engineText.includes('data-save>Создать точки')&&engineText.includes('data-cancel>Отмена'),'transactional final/cancel controls present');
console.log('PASS 1.0.33.48 oscillating/linkage engine: classification + line1/line2 assembly + no virtual points + idempotency + recreate');
