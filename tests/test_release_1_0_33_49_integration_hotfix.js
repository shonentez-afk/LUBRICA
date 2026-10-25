const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
function assert(x,m){if(!x)throw new Error(m)}
const nextFrom=(arr,prefix,width=6)=>{let max=0;for(const x of arr||[]){const m=String(x.id||'').match(new RegExp('^'+prefix+'-(\\d+)$'));if(m)max=Math.max(max,Number(m[1]));}return `${prefix}-${String(max+1).padStart(width,'0')}`};
const database={equipment:[],components:[],nodes:[],lubricationPoints:[],tasks:[],routes:[],routeRevisions:[],checklistRuns:[],componentLibraryEntries:[]};
const window={LubricaCore:{State:{getDatabase:()=>database,setDatabase:()=>{}},Database:{normalize:x=>x},IDs:{nextFrom}}};window.window=window;
const context={window,console};vm.createContext(context);
for(const rel of ['structure/context.js','bearings/catalog-data.js','bearings/multi-oem-data.js','bearings/library.js','components/registry.js','components/bearing-adapter.js','components/binding.js','import/component-classifier.js','import/candidate-finalizer.js','oscillating/oscillating-linkage-arrangement.js'])vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
const O=window.LubricaOscillatingLinkageArrangement,F=window.LubricaCandidateFinalizer,C=window.LubricaClassifier;

// HIGH-01: stale point/task is removed when confirmed construction becomes non-serviceable.
const eq={id:'OSC',name:'Система качания Линия №1',areaId:'A',lineId:'L',equipmentType:'oscillating_mechanism'};database.equipment.push(eq);
const bearing={id:'COMP-1',equipmentId:eq.id,name:'Подшипник 6205',candidateCategory:'bearing',status:'active'};database.components.push(bearing);
let draft=[{key:'rod',name:'Шатун левый',role:'connecting_rod',side:'left',connections:[{key:'a',label:'Шарнир A',type:'bearing',componentId:bearing.id,manualDesignation:''}]}];
let built=O.validateAndBuild(database,eq,draft,[bearing]);
F.applyConfirmedSpecs(database,'equipment',eq,eq,{id:'oscillating_linkage',title:'Osc'},built.specs);O.refreshPointContext(database,eq,built.specs);
assert(database.lubricationPoints.length===1&&database.tasks.length===1,'initial oscillating point/task not created');
const oldTaskId=database.tasks[0].id;database.routes.push({id:'R1',taskIds:[oldTaskId]});
draft=[{key:'rod',name:'Шатун левый',role:'connecting_rod',side:'left',connections:[{key:'a',label:'Шарнир A',type:'non_serviceable',componentId:'',manualDesignation:''}]}];
built=O.validateAndBuild(database,eq,draft,[bearing]);O.syncGeneratedArtifacts(database,eq,built.specs);
assert(built.specs.length===0&&built.unresolved.length===0,'non-serviceable should be confirmed without a point');
assert(database.lubricationPoints.length===0&&database.tasks.length===0,'stale oscillating point/task survived reconfiguration');
assert(database.routes[0].taskIds.length===0,'stale task remained in active route');

// MEDIUM-01: semantics are distinct and legacy none migrates safely.
assert(O.CONNECTION_TYPES.non_serviceable&&O.CONNECTION_TYPES.no_connection,'distinct no-point connection states missing');
const noConn=O.validateAndBuild(database,eq,[{key:'x',name:'Тяга',role:'link_rod',side:'left',connections:[{key:'a',label:'A',type:'no_connection'}]}],[]);
assert(noConn.specs.length===0&&noConn.unresolved.length===0&&noConn.noPointConfirmed===1,'no_connection semantics incorrect');
const legacyNone=O.validateAndBuild(database,eq,[{key:'x',name:'Тяга',role:'link_rod',side:'left',connections:[{key:'a',label:'A',type:'none'}]}],[]);
assert(legacyNone.specs.length===0&&legacyNone.unresolved.length===0,'legacy none migration broken');

// HIGH-02: unrelated role element under another machine must not attach to the sole root.
const db2={equipment:[
{id:'OSC2',name:'Система качания Линия №2',areaId:'A2',lineId:'L2',equipmentType:'oscillating_mechanism'},
{id:'PUMP',name:'Насос гидравлический',areaId:'A2',lineId:'L2'},
{id:'ROD',name:'Тяга гидроцилиндра правая',areaId:'A2',lineId:'L2',parentEquipmentId:'PUMP'}
],components:[]};
const classified=C.classifyEquipment(db2,db2.equipment[2]);
assert(classified.oscillatingContextRootId!=='OSC2','unrelated hydraulic rod attached to sole oscillating root');
assert(O.rootForEquipment(db2,db2.equipment[2])===null,'arrangement root resolver weakly attached unrelated equipment');

// Strong evidence still works: explicit hierarchy and exact line token.
const child={id:'CH',name:'Шатун левый',parentEquipmentId:'OSC2',areaId:'A2',lineId:'L2'};db2.equipment.push(child);
assert(O.rootForEquipment(db2,child)?.id==='OSC2','ancestor linkage no longer resolves');
const exact={id:'EX',name:'Ось вращения левая Линия №2',areaId:'A2',lineId:'L2'};db2.equipment.push(exact);
assert(O.rootForEquipment(db2,exact)?.id==='OSC2','exact line token linkage no longer resolves');

// HIGH-03: manual SNL creates generic housing context consumed by Task Editor.
database.lubricationPoints=[];database.tasks=[];database.nodes=[];
draft=[{key:'shaft',name:'Ось вращения левая',role:'pivot_shaft',side:'left',connections:[{key:'a',label:'Опора A',type:'snl',componentId:'',manualDesignation:'SNL 522 + 22222 EK/C3'}]}];
built=O.validateAndBuild(database,eq,draft,[]);F.applyConfirmedSpecs(database,'equipment',eq,eq,{id:'oscillating_linkage',title:'Osc'},built.specs);O.refreshPointContext(database,eq,built.specs);
const p=database.lubricationPoints[0];
assert(p.bearingHousing?.family==='SNL','generic SNL bearingHousing not stored');
assert(/SNL 522/i.test(p.bearingHousing?.rawMarking||''),'SNL raw housing marking missing');
window.LubricaMaterials={getDatabase:()=>database};
vm.runInContext(fs.readFileSync(path.join(root,'lubrication/task-editor.js'),'utf8'),context,{filename:'lubrication/task-editor.js'});
const hc=window.LubricaTaskEditor.resolveBearingHousingContext(p);
assert(hc.family==='SNL'&&/SNL 522/i.test(hc.raw),'Task Editor did not resolve manual SNL context');

// MEDIUM-02: saved manual element is removable and cleanup is scoped.
const manual={id:'COMP-M1',equipmentId:eq.id,name:'Тяга ручная',componentType:'manual_oscillating_element',origin:'manual',manualOscillatingKey:'manual_keep_or_remove',manualOscillatingRole:'link_rod',status:'active'};database.components.push(manual);
const removed=O.removeMissingManualElements(database,eq,[]);
assert(removed.includes('COMP-M1')&&!database.components.some(c=>c.id==='COMP-M1'),'saved manual oscillating element was not removed');
assert(database.components.some(c=>c.id==='COMP-1'),'manual cleanup touched unrelated component');

console.log('PASS 1.0.33.49 oscillating integration hotfix: cleanup + strong context + manual SNL + semantics + manual delete');
