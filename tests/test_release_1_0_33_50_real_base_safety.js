const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
function assert(x,m){if(!x)throw new Error(m)}
const nextFrom=(arr,prefix,width=6)=>{let max=0;for(const x of arr||[]){const m=String(x.id||'').match(new RegExp('^'+prefix+'-(\\d+)$'));if(m)max=Math.max(max,Number(m[1]));}return `${prefix}-${String(max+1).padStart(width,'0')}`};
const database={equipment:[],components:[],nodes:[],lubricationPoints:[],tasks:[],routes:[],routeRevisions:[],checklistRuns:[],componentLibraryEntries:[]};
const window={LubricaCore:{State:{getDatabase:()=>database,setDatabase:()=>{}},Database:{normalize:x=>x},IDs:{nextFrom}}};window.window=window;
const context={window,console};vm.createContext(context);
for(const rel of ['structure/context.js','bearings/catalog-data.js','bearings/multi-oem-data.js','bearings/library.js','components/registry.js','components/bearing-adapter.js','components/binding.js','import/component-classifier.js','import/candidate-finalizer.js','oscillating/oscillating-linkage-arrangement.js'])vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
const O=window.LubricaOscillatingLinkageArrangement,C=window.LubricaClassifier,F=window.LubricaCandidateFinalizer;

// Real-base safety 1: already excluded adapter sleeves never enter service evidence.
const osc={id:'OSC',name:'Система качания Линия №1',lineId:'L1',areaId:'A1',equipmentType:'oscillating_mechanism'};
const crank={id:'KSHM',name:'Механизм кривошипно-шатунный основной Линия №1',lineId:'L1',areaId:'A1',parentEquipmentId:'P',oscillatingContextRootId:'OSC'};
database.equipment.push(osc,crank);
const adapter={id:'H322',equipmentId:'KSHM',name:'Втулка закрепительная H 322 Линия №1',candidateState:'excluded',candidateCategory:null,status:'active'};
const brg={id:'BRG',equipmentId:'KSHM',name:'Подшипник 22222 EK Линия №1',candidateState:'candidate',candidateCategory:'bearing',status:'active'};
const snh={id:'SNH',equipmentId:'KSHM',name:'Корпус подшипника SNH 522 TC Линия №1',candidateState:'candidate',candidateCategory:'bearing',status:'active'};
database.components.push(adapter,brg,snh);
let ev=O.evidence(database,osc);
assert(!ev.serviceComponents.some(x=>x.id==='H322'),'excluded H322 adapter sleeve leaked into service list');
assert(ev.serviceComponents.some(x=>x.id==='BRG'),'real internal bearing missing from service list');

// Real-base safety 2: TOLLOK TLK400 is a locking device, not lubrication bushing.
const tlk=C.classifyComponent({id:'TLK',equipmentId:'OSC',name:'Втулка TOLLOK TLK 400 110x155',candidateState:'review',candidateCategory:'bushing',status:'active'});
assert(tlk.candidateState==='excluded'&&tlk.candidateCategory===null,'TLK400 locking assembly not excluded');

// Real-base safety 3: sealed bearings are visible as evidence, but cannot silently create routine relube.
const sealed={id:'6316',equipmentId:'KSHM',name:'Подшипник 6316-2RS1 Линия №1',candidateState:'candidate',candidateCategory:'bearing',status:'active'};database.components.push(sealed);
let draft=[{key:'axis',name:'Ось вращения левая',role:'pivot_shaft',side:'left',connections:[{key:'a',label:'Опора A',type:'bearing',componentId:'6316',manualDesignation:''}]}];
let result=O.validateAndBuild(database,osc,draft,ev.serviceComponents);
assert(result.specs.length===0&&result.unresolved.some(x=>/закрытое исполнение/i.test(x)),'sealed 2RS1 bearing created a routine relube point');

// Real-base safety 4: SNH is explicit, uses inner bearing as source and keeps housing context separately.
draft=[{key:'crank',name:'Механизм кривошипно-шатунный основной',role:'crank_linkage',side:'unknown',connections:[{key:'support',label:'Корпусная опора',type:'snh',componentId:'BRG',manualDesignation:''}]}];
result=O.validateAndBuild(database,osc,draft,ev.serviceComponents);
assert(result.specs.length===1&&result.unresolved.length===0,'SNH + internal bearing did not validate');
assert(result.specs[0].sourceRef.id==='BRG','SNH point source must remain the internal bearing');
assert(result.specs[0].housingRef?.id==='SNH'&&result.specs[0].housingFamily==='SNH','SNH housing not carried separately');
F.applyConfirmedSpecs(database,'equipment',osc,osc,{id:'oscillating_linkage',title:'Osc'},result.specs);O.refreshPointContext(database,osc,result.specs);
const p=database.lubricationPoints[0];
assert(p.bearing?.baseDesignation==='22222','inner bearing was not parsed for SNH point');
assert(p.bearingHousing?.family==='SNH'&&/SNH 522/i.test(p.bearingHousing.rawMarking||''),'SNH housing context not stored');
window.LubricaMaterials={getDatabase:()=>database};
vm.runInContext(fs.readFileSync(path.join(root,'lubrication/task-editor.js'),'utf8'),context,{filename:'lubrication/task-editor.js'});
const hc=window.LubricaTaskEditor.resolveBearingHousingContext(p);
assert(hc.family==='SNH'&&/SNH 522/i.test(hc.raw),'Task Editor lost SNH housing context');

// Wrong selection: a housing itself is not accepted as the internal bearing.
result=O.validateAndBuild(database,osc,[{key:'x',name:'КШМ',role:'crank_linkage',side:'unknown',connections:[{key:'a',label:'Опора',type:'snh',componentId:'SNH',manualDesignation:''}]}],ev.serviceComponents);
assert(result.specs.length===0&&result.unresolved.some(x=>/выберите фактический внутренний подшипник/i.test(x)),'SNH housing was incorrectly accepted as inner bearing');

// Manual input follows the same sealed-bearing guard as selected TMC.
result=O.validateAndBuild(database,osc,[{key:'manual-sealed',name:'Ось вращения',role:'pivot_shaft',side:'unknown',connections:[{key:'a',label:'Опора',type:'bearing',componentId:'',manualDesignation:'6316-2RS1'}]}],ev.serviceComponents);
assert(result.specs.length===0&&result.unresolved.some(x=>/закрытое исполнение/i.test(x)),'manual sealed bearing bypassed the sealed-bearing guard');

// A housing selected under the generic bearing type must not become a bearing point by mistake.
result=O.validateAndBuild(database,osc,[{key:'generic-housing',name:'КШМ',role:'crank_linkage',side:'unknown',connections:[{key:'a',label:'Опора',type:'bearing',componentId:'SNH',manualDesignation:''}]}],ev.serviceComponents);
assert(result.specs.length===0&&result.unresolved.some(x=>/выберите тип корпусной опоры/i.test(x)),'generic bearing type accepted a housing as the calculated bearing');

console.log('PASS 1.0.33.50 real-base safety: exclusions + TLK400 + sealed bearing guard + SNH context');
