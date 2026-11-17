// Stage 5B.9: two physical shafts DO NOT establish four serviceable supports.
// Exercise constructor save, evidence gate, one real point, subtype-only save,
// idempotency and approval/route protection with a mocked offline Edge dialog.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const clone=x=>JSON.parse(JSON.stringify(x));
const machine={id:'E-BELT',name:'Конвейер ленточный испытательный',
 equipmentType:'conveyor',externalCode:'10101093',origin:'import',
 maintenanceEquipmentType:'conveyor',status:'active'};
const comp=(id,name,fields={})=>({id,name,equipmentId:machine.id,status:'active',...fields});
const initial={equipment:[machine],components:[
 comp('S-DRIVE','Вал приводной',{candidateEquipmentType:'rotating_shaft'}),
 comp('S-TENSION','Вал натяжной',{candidateEquipmentType:'rotating_shaft'}),
 comp('B-REAL','Узел подшипниковый SY 30 TF',{candidateCategory:'bearing',candidateState:'candidate'}),
 comp('CH-REAL','Цепь роликовая 12B-2',{candidateCategory:'chain',candidateState:'candidate'})
 ],nodes:[],lubricationPoints:[],tasks:[],routes:[],routePlanItems:[],checklistRuns:[]};
let db=clone(initial),html='',opens=0,closes=0,notices=[],saved=0;
const submit={onclick:null};
const elements={};
const mk=(value='',checked=false)=>({value,checked,disabled:false,addEventListener(){},focus(){}});
const form={
 elements,
 querySelector(q){
  if(q==='[data-save]')return submit;
  if(/^\[data-spec-index=/.test(q))return {
   classList:{toggle(){}},querySelectorAll(){return []}
  };
  return null;
 },
 querySelectorAll(q){
  const match=q.match(/^input\[name="activity_(\d+)"\]:checked$/);
  if(match){const i=Number(match[1]);return elements['use_'+i]?.checked?[{value:'regrease'}]:[]}
  return [];
 }
};
const dlg={classList:{add(){},remove(){}},set innerHTML(v){html=v},
 get innerHTML(){return html},querySelector(q){return q==='form'?form:null},
 showModal(){opens++},close(){closes++}};
const doc={getElementById:id=>id==='structureDialog'?dlg:null};
const win={};win.window=win;
win.LubricaCore={
 State:{getDatabase:()=>db,setDatabase:value=>{db=value;saved++}},
 IDs:{nextFrom(rows,prefix,size){let i=1;while(rows.some(x=>x.id===prefix+'-'+String(i).padStart(size,'0')))i++;return prefix+'-'+String(i).padStart(size,'0')}},
 DatabaseSchema:{clone},Database:{normalize:value=>value}
};
win.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null};
win.LubricaStructureContext={
 categoryLabels:{bearing:'Подшипник',chain:'Цепь',gearbox_oil:'Редуктор'},
 activityCatalog:{regrease:{label:'Досмазывание'}},
 operationOptions:()=>['Досмазывание'],
 activityOptions:()=>[{type:'regrease',label:'Досмазывание'}],
 activityLabel:k=>k==='regrease'?'Досмазывание':k,
 activityTypeForLabel:label=>label==='Досмазывание'?'regrease':'custom',
 activityNeedsMaterial:()=>true
};
win.LubricaApp={showToast:v=>notices.push(v),refreshFromCore(){},renderAll(){}};
win.LubricaStructure={render(){}};
win.LubricaCandidates={render(){}};
const sandbox={window:win,document:doc,console,Date,JSON};
vm.createContext(sandbox);
for(const src of ['import/component-classifier.js','conveyors/conveyor-arrangement.js','import/candidate-finalizer.js'])
 vm.runInContext(fs.readFileSync(path.join(root,src),'utf8'),sandbox,{filename:src});
const C=win.LubricaClassifier, F=win.LubricaCandidateFinalizer,A=win.LubricaConveyorArrangement;
function prepare(){
 for(const k of Object.keys(elements))delete elements[k];
 const classified=C.classifyEquipment(db,db.equipment[0]);
 const specs=F.specsFor(classified,'equipment');
 specs.forEach((s,i)=>{
  elements['use_'+i]=mk('',s.selected);
  elements['name_'+i]=mk(s.name);
  elements['cat_'+i]=mk(s.category);
  elements['pos_'+i]=mk(s.position||'');
  elements['custom_'+i]=mk('');
 });
 elements.conveyorSubtypeChoice=mk('belt');
 elements.conveyor_support_confirm=mk('',false);
 elements.conveyor_support_source=mk('');
 const layout=classified.maintenanceTemplate.evidence.supportLayout;
 if(layout)for(const support of layout.supports)
  elements['bearing_assign_'+support.key]=mk('');
 const openedBefore=opens;
 F.open('equipment',machine.id);
 assert.equal(opens,openedBefore+1);
 assert.equal(typeof submit.onclick,'function');
 return {specs,layout};
}
let {specs,layout}=prepare();
assert(layout&&layout.supports.length===4,'four positions may be displayed as hypotheses');
assert(specs.filter(s=>s.physicalSupport).length===4);
assert(specs.every(s=>s.selected===false),'none of the possible supports/chains is preselected');
assert(html.includes('Возможные места опор'));
assert(html.includes('conveyor_support_source')&&html.includes('conveyor_support_confirm'));
assert(!html.includes('Физические подшипниковые опоры'),'UI cannot imply four verified bearings');
const selectedKey='drive_left',bearing=layout.bearings.find(x=>x.id==='B-REAL');
assert(bearing,'physical source TMC required');
const blocked=A.validateSelectedSupports(layout,[selectedKey],{[selectedKey]:bearing},{physicalConfirmed:false,sourceReference:''});
assert(!blocked.allowed&&blocked.errors.length===2,'physical confirmation and source are both required');
assert(!A.validateSelectedSupports(layout,[selectedKey],{},{
 physicalConfirmed:true,sourceReference:'Осмотр 09.11.2026'}).allowed,'must assign real bearing TMC');
assert(A.validateSelectedSupports(layout,[selectedKey],{[selectedKey]:bearing},{
 physicalConfirmed:true,sourceReference:'Осмотр 09.11.2026'}).allowed);
const before=JSON.stringify(db);
submit.onclick(); // no selected point -> save the subtype, but zero physical point
assert.equal(db.equipment[0].confirmedConveyorSubtype,'belt');
assert.equal(db.equipment[0].maintenanceCandidateState,'review');
assert.equal(db.lubricationPoints.length,0);
assert.equal(db.tasks.length,0);
assert.equal(db.components.length,initial.components.length);
assert.equal(saved,1,'subtype-only save is transactional, not a fake lubrication point');
({specs,layout}=prepare());
let chosenIndex=specs.findIndex(s=>s.supportKey===selectedKey);
assert(chosenIndex>=0);
elements['use_'+chosenIndex].checked=true;
elements['pos_'+chosenIndex].value='Приводной вал, левая опора · пресс-маслёнка';
elements['bearing_assign_'+selectedKey].value='B-REAL';
const unchanged=JSON.stringify(db),savedBefore=saved;
submit.onclick();
assert.equal(JSON.stringify(db),unchanged,'missing evidence cannot mutate DB');
assert.equal(saved,savedBefore,'missing evidence cannot call setDatabase');
assert(notices.some(x=>String(x).includes('Подтвердите фактическое наличие')),'explicit warning shown');
elements.conveyor_support_confirm.checked=true;
submit.onclick();
assert.equal(JSON.stringify(db),unchanged,'confirmation without source is insufficient');
elements.conveyor_support_source.value='Осмотр / фотография опоры 09.11.2026';
submit.onclick();
assert.equal(db.lubricationPoints.length,1,'exactly one confirmed support, not four');
assert.equal(db.tasks.length,1);
assert.equal(db.tasks[0].approvalStatus,'review','no implicit approval');
assert.equal(db.lubricationPoints[0].positionLabel,elements['pos_'+chosenIndex].value);
assert.equal(db.lubricationPoints[0].componentBinding?.sourceComponentId||db.lubricationPoints[0].installedComponent?.id,'B-REAL');
const state=db.equipment[0].conveyorArrangement;
assert.deepEqual(Array.from(state.supportVerification.confirmedSupportKeys),['drive_left']);
assert(state.supportVerification.sourceReference.includes('фотография'));
assert.equal(state.layout.supports.filter(x=>x.assignmentStatus==='confirmed_engineer').length,1);
assert.equal(state.layout.supports.filter(x=>x.assignmentStatus==='not_confirmed').length,3);
assert.equal(state.supportVerification.physicalConfirmed,true);
assert(db.components.some(x=>x.id==='S-DRIVE'&&x.candidateState==='confirmed'),
 'shaft context is marked confirmed only with physical support evidence');
assert(db.tasks.every(x=>x.approvalStatus==='review'));
({specs,layout}=prepare());
chosenIndex=specs.findIndex(s=>s.supportKey===selectedKey);
elements['use_'+chosenIndex].checked=true;
elements['bearing_assign_'+selectedKey].value='B-REAL';
elements['pos_'+chosenIndex].value='Приводной вал, левая опора · пресс-маслёнка';
elements.conveyor_support_confirm.checked=true;
elements.conveyor_support_source.value='Контрольное подтверждение';
submit.onclick();
assert.equal(db.lubricationPoints.length,1,'repeated save never duplicates the physical point');
assert.equal(db.tasks.length,1,'repeated save never duplicates task');
db.tasks[0].approvalStatus='approved';
db.routes.push({id:'OLD-ROUTE',taskIds:[db.tasks[0].id]});
const approvedBefore=JSON.stringify(db),savesBefore=saved;
({specs,layout}=prepare());
chosenIndex=specs.findIndex(s=>s.supportKey===selectedKey);
elements['use_'+chosenIndex].checked=true;
elements['bearing_assign_'+selectedKey].value='B-REAL';
elements.conveyor_support_confirm.checked=true;
elements.conveyor_support_source.value='Перепривязка';
submit.onclick();
assert.equal(saved,savesBefore,'approved/route task blocks silent reapplication');
assert.equal(JSON.stringify(db),approvedBefore,'approved task and existing route remain unmodified');
console.log('PASS Stage5B.9: zero automatic 4-support points, subtype-only save, one confirmed support, source gate, idempotency, approved route safe');
