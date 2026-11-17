// Stage 5B.12: comprehensive conveyor UI/UX and physical-evidence contract.
// Runtime editor smoke with a fake DOM + read-only checks of responsive UI.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),clone=x=>JSON.parse(JSON.stringify(x));
const win={};win.window=win;
let database={project:{name:'Тестовая база'},plants:[{id:'P1',name:'Завод'}],
 lines:[{id:'L1',plantId:'P1',name:'Линия 1'}],
 areas:[{id:'A1',lineId:'L1',name:'Участок'}],
 equipment:[{id:'E-IMPORTED',lineId:'L1',areaId:'A1',
  name:'Конвейер ленточный входной',externalCode:'10101093',
  equipmentType:'conveyor',origin:'import',status:'active'}],
 components:[],nodes:[],lubricationPoints:[],tasks:[],materials:[],tools:[],
 routes:[],routePlanItems:[],checklistRuns:[],meta:{}};
const alerts=[];win.LubricaCore={
 State:{getDatabase:()=>database,setDatabase:d=>{database=d}},
 Database:{normalize:x=>x},
 DatabaseSchema:{clone},
 IDs:{nextFrom(rows,prefix,digits){let i=1,id;do{id=prefix+'-'+String(i++).padStart(digits,'0')}while((rows||[]).some(x=>x.id===id));return id}}
};
win.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null};
win.LubricaApp={refreshFromCore(){},renderAll(){},showToast:t=>alerts.push(t)};
win.LubricaStructure={render(){}};
const events={},ui={};let currentForm=null,html='',saveBtn=null;
const classList=()=>({hidden:false,toggle(name,force){if(name==='hidden')this.hidden=!!force},
 add(){},remove(){}});
const field=(value='',checked=false)=>{
 const f={value,checked,disabled:false,required:false,
  listeners:{},addEventListener(type,cb){this.listeners[type]=cb},
  closest(){return{classList:classList()}},focus(){}};
 return f;
};
function createForm(values={}){
 const keys=['lineId','areaId','name','externalCode','equipmentType','manufacturer','model','machineProfilePreset',
  'conveyorSubtype','conveyorDriveShaftName','conveyorReturnShaftRole','conveyorReturnShaftName',
  'conveyorDriveLeftBearing','conveyorDriveRightBearing','conveyorReturnLeftBearing','conveyorReturnRightBearing',
  'conveyorChainEnabled','conveyorChainName','conveyorDriveMode','conveyorDriveName','conveyorGearboxName','conveyorMotorName'];
 const elements={};for(const key of keys)elements[key]=field(values[key]??'');
 elements.conveyorChainEnabled.checked=!!values.conveyorChainEnabled;
 saveBtn={onclick:null,click(){return this.onclick?.({preventDefault(){}})}};
 const panel=()=>({classList:classList(),querySelector:()=>({classList:classList()})});
 ui.conveyor=panel();ui.imported=panel();
 const widgets={
  '[data-manual-conveyor]':ui.conveyor,'[data-import-conveyor-hint]':ui.imported,
  '[data-manual-fan-assets]':panel(),'[data-manual-rotating]':panel(),
  '[data-manual-oscillating]':panel(),'[data-manual-pp53736]':panel(),
  '[data-save]':saveBtn
 };
 const form={elements,reportValidity:()=>true,
  querySelector:selector=>widgets[selector]||null,querySelectorAll:()=>[],
  addEventListener(){}};
 currentForm=form;return form;
}
const dlg={classList:classList(),set innerHTML(v){html=v},get innerHTML(){return html},
 querySelector:q=>q==='#structureForm'?currentForm:null,showModal(){},close(){}};
const doc={getElementById:id=>id==='structureDialog'?dlg:null};
const box=vm.createContext({window:win,document:doc,console,Date,JSON});
for(const file of ['structure/context.js','import/component-classifier.js',
 'conveyors/conveyor-arrangement.js','structure/entity-dialogs.js']){
 new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file}).runInContext(box);
}
const E=win.LubricaEntityDialogs,A=win.LubricaConveyorArrangement,C=win.LubricaClassifier;
function open(item,values){
 const form=createForm(values);E.open('equipment',item);return form;
}
function save(form){assert.equal(typeof saveBtn.onclick,'function');saveBtn.onclick({preventDefault(){}})}
const imp=database.equipment[0];
let form=open(imp,{lineId:'L1',areaId:'A1',name:imp.name,
 externalCode:imp.externalCode,equipmentType:'conveyor',
 conveyorSubtype:'belt',conveyorChainEnabled:false,conveyorDriveMode:'none'});
assert(ui.conveyor.classList.hidden,'imported machine must not expose manual structure as confirmed');
assert.equal(ui.imported.classList.hidden,false,'imported source warning visible');
assert(html.includes('Импортированный конвейер: конструкция не подтверждается'));
save(form);
assert.equal(database.equipment[0].confirmedConveyorSubtype,null,
 'editing an imported equipment card cannot confirm subtype inferred from name');
assert.equal(database.equipment[0].origin,'import','imported origin preserved');
assert.equal(database.components.length,0,'editing metadata never invents TMCs');
// New manual conveyor must default to unknown family, no chain, no drive.
form=open(null,{lineId:'L1',areaId:'A1',name:'Конвейер ручной испытательный',
 externalCode:'MAN-001',equipmentType:'conveyor',conveyorSubtype:'unknown',
 conveyorChainEnabled:false,conveyorDriveMode:'none'});
assert(html.includes('value="unknown" selected'),'new manual subtype must be unknown');
assert(!html.includes('name="conveyorChainEnabled" checked'),
 'a manual chain is not verified by default');
assert(ui.conveyor.classList.hidden,'new equipment initially opens generic type');
form.elements.equipmentType.value='conveyor';
assert(ui.imported.classList.hidden,'import warning hidden for manual entry');
// Synthetic mock is not a browser; call onChange via listener for actual type.
form.elements.equipmentType.listeners.change?.();
assert(!ui.conveyor.classList.hidden,'manual conveyor fields become visible');
save(form);
const manual=database.equipment.find(x=>x.externalCode==='MAN-001');
assert(manual,'manually added conveyor saved');
assert.equal(manual.confirmedConveyorSubtype,null);
assert.equal(manual.manualConveyorSetup.conveyorSubtype,'unknown');
assert.equal(database.components.length,0,'unknown/manual blank source creates no TMCs');
// Belt without shaft names must not infer two physical shafts and 4 bearings.
form=open(manual,{lineId:'L1',areaId:'A1',name:'Конвейер ленточный ручной',
 externalCode:'MAN-001',equipmentType:'conveyor',conveyorSubtype:'belt',
 conveyorChainEnabled:false,conveyorDriveMode:'none'});
save(form);
const belt=database.equipment.find(x=>x.id===manual.id);
assert.equal(belt.manualConveyorSetup.layout,'SHAFTS_REQUIRE_FIELD_CONFIRMATION');
assert.equal(database.components.filter(x=>x.status==='active').length,0,
 'blank shaft fields do not create physical components');
assert.equal(C.conveyorEvidence(database,belt).supportLayout,null,
 'no two-shaft UI from absent shaft records');
// Explicit shaft names are context, never automatic bearing/chain service.
form=open(belt,{lineId:'L1',areaId:'A1',name:belt.name,externalCode:'MAN-001',
 equipmentType:'conveyor',conveyorSubtype:'belt',conveyorDriveShaftName:'Вал приводной',
 conveyorReturnShaftName:'Вал натяжной',conveyorReturnShaftRole:'tension',
 conveyorChainEnabled:false,conveyorDriveMode:'none'});
save(form);
const shafts=database.components.filter(x=>x.equipmentId===belt.id&&x.status==='active');
assert.equal(shafts.length,2,'two explicitly named shaft records');
assert(shafts.every(x=>x.candidateEquipmentType==='rotating_shaft'));
assert.equal(database.lubricationPoints.length,0,'shafts alone do not create serviceable bearings');
// When switching to a roller without service points, old shaft context retires.
form=open(database.equipment.find(x=>x.id===belt.id),{lineId:'L1',areaId:'A1',
 name:'Конвейер роликовый ручной',externalCode:'MAN-001',
 equipmentType:'conveyor',conveyorSubtype:'roller',conveyorChainEnabled:false,conveyorDriveMode:'none'});
save(form);
assert.equal(database.components.filter(x=>x.equipmentId===belt.id&&x.status==='active').length,0,
 'switching from belt to roller leaves no phantom old shaft components');
assert.equal(database.equipment.find(x=>x.id===belt.id).confirmedConveyorSubtype,'roller');
// Presentation contract: source IDs, status wording, responsive layout and action feedback.
const finalizer=fs.readFileSync(path.join(root,'import/candidate-finalizer.js'),'utf8');
const qa=fs.readFileSync(path.join(root,'qa/qa-ui.js'),'utf8');
const detail=fs.readFileSync(path.join(root,'structure/detail-ui.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/app.css'),'utf8');
assert(finalizer.includes('data-conveyor-selected-count')&&finalizer.includes('aria-live="polite"'));
assert(finalizer.includes('name:s.physicalSupport?form.elements[`pos_${i}`].value.trim()'));
assert(finalizer.includes('Категория фиксирована: подшипник'));
assert(finalizer.includes('esc(b.externalCode||b.id)')&&finalizer.includes('esc(x.externalCode||x.id)'));
assert(qa.includes('data-qa-conveyor-one-csv')&&qa.includes('data-qa-conveyor-reset'));
assert(qa.includes('e.ownerEquipmentName')&&qa.includes('e.taskIds.join'));
assert(detail.includes('conveyorSubtypeStatus')&&detail.includes('предварительно'));
assert(css.includes('Stage 5B.12: scoped conveyor constructor/UI accessibility'));
assert(css.includes('.qa-conveyor-coverage .qa-issue')&&css.includes('max-width:760px'));
assert.equal(database.routes.length,0,'no routes generated in constructor/UI audit');
assert(alerts.every(x=>/Оборудование (изменён|добавлен)/.test(x)),'successful edits must not emit engineering warnings: '+alerts.join(' | '));
console.log('PASS Stage 5B.12 conveyor UI/UX: import safety, manual defaults, shaft switch, source IDs, accessibility and mobile layout');
