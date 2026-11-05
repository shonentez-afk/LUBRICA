const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const win={console};win.window=win;
const nextFrom=(items,prefix,width=6)=>{
 const re=new RegExp('^'+prefix+'-(\\d+)$');let n=0;
 for(const x of items||[]){const m=String(x.id||'').match(re);if(m)n=Math.max(n,Number(m[1]));}
 return prefix+'-'+String(n+1).padStart(width,'0');
};
win.LubricaCore={IDs:{nextFrom},State:{getDatabase(){return win.__db||null}},DatabaseSchema:{clone:x=>JSON.parse(JSON.stringify(x))}};
const ctx=vm.createContext(win);
function load(file){vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file})}
load('structure/context.js');
load('qa/engineering-decisions.js');
load('import/candidate-finalizer.js');
load('import/component-classifier.js');
load('qa/qa-engine.js');
const E=win.LubricaEngineeringDecisions,F=win.LubricaCandidateFinalizer,C=win.LubricaClassifier,Q=win.LubricaProgramQA;
function fixture(){return{
 lines:[{id:'L1',name:'Линия 1'}],areas:[{id:'A1',lineId:'L1',name:'Участок'}],
 equipment:[{id:'EQ1',lineId:'L1',areaId:'A1',name:'Конвейер'}],
 components:[
 {id:'COMP1',equipmentId:'EQ1',externalCode:'110',name:'Подшипник UCP212',candidateCategory:'bearing',candidateState:'candidate',candidateReason:'Импорт'},
 {id:'COMP2',equipmentId:'EQ1',externalCode:'111',name:'Цепь 12B-2',candidateCategory:'chain',candidateState:'review'},
 {id:'COMP3',equipmentId:'EQ1',externalCode:'112',name:'Втулка',candidateCategory:'bushing',candidateState:'review'},
 {id:'COMP4',equipmentId:'EQ1',externalCode:'113',name:'Подшипник UC212',candidateCategory:'bearing',candidateState:'candidate'}
 ],
 nodes:[],lubricationPoints:[{id:'LP-000099',equipmentId:'EQ1',nodeId:'N99',name:'Существующая опора',
 category:'bearing',componentBinding:{sourceComponentId:'COMP4'},status:'review'}],
 tasks:[],materials:[],tools:[],routes:[],routeRevisions:[],routePlanItems:[],checklistRuns:[],imports:[]};}
let db=fixture(),before=JSON.stringify(db);win.__db=db;
assert(!E.preview(db,'COMP1','point',{reason:'Физическая левая опора',sourceReference:'Осмотр'}).allowed,'physical checkbox is required');
assert(!E.preview(db,'COMP1','point',{reason:'Физическая левая опора',physicalConfirmed:true}).allowed,'evidence source is required');
assert(!E.preview(db,'COMP4','point',{reason:'Физическая левая опора',physicalConfirmed:true,sourceReference:'Осмотр'}).allowed,'linked point must not be duplicated');
assert(!E.preview(db,'COMP3','not_lubricated',{reason:'Поставляется без смазки'}).allowed,'non-lubricated decision requires evidence');
assert(!E.preview(db,'MISSING','context',{reason:'Чертеж корпуса'}).allowed,'unknown source must be rejected');
assert.equal(JSON.stringify(db),before,'previews must be read-only');

let saved=E.commit(db,'COMP3','context',{reason:'Втулка используется только как монтажная деталь',sourceReference:'Чертёж узла'});
assert(saved.changed&&db.components[2].candidateState==='confirmed','context stays in structure but is not point');
assert.equal(db.lubricationPoints.length,1);
assert.equal(db.tasks.length,0);
assert.equal(db.components[2].engineeringDecision.sourceReference,'Чертёж узла');
assert.equal(db.components[2].engineeringDecisionHistory.length,1);
assert.equal(E.commit(db,'COMP3','context',{reason:'Втулка используется только как монтажная деталь',sourceReference:'Чертёж узла'}).changed,false,'repeat commit is idempotent');
assert.throws(()=>E.commit(db,'COMP3','not_lubricated',{reason:'Второе решение без отмены',sourceReference:'Осмотр'}),'cannot overwrite decision');
assert(E.previewUndo(db,'COMP3').allowed);
assert(E.undo(db,'COMP3').changed&&db.components[2].candidateState==='review','context undo restores previous state');
assert.equal(E.undo(db,'COMP3').changed,false,'undo is idempotent');

E.commit(db,'COMP2','not_lubricated',{reason:'Цепь не имеет отдельного узла подачи смазки',sourceReference:'Проверка на линии'});
assert.equal(db.components[1].candidateState,'rejected');
assert.equal(C.classifyComponent(db.components[1]).candidateState,'rejected','reclassification preserves explicit not lubricated');
assert(E.undo(db,'COMP2').changed);
assert.equal(db.components[1].candidateState,'review');

E.commit(db,'COMP2','clarify',{reason:'Нет данных о приводе и подаче смазки'});
assert.equal(C.classifyComponent(db.components[1]).candidateState,'review','clarify stays review across reclassification');
const q=Q.candidateQueue(db);
assert(q.groups.some(g=>g.items.some(i=>i.id==='COMP2'&&i.decision==='clarify')),'clarify remains visible in review queue');
assert(q.resolved.some(x=>x.componentId==='COMP2'&&x.action==='clarify'),'decision appears in history');
assert(E.undo(db,'COMP2').changed);

const check={reason:'Физическая левая опора проверена инженером',sourceReference:'Осмотр и схема вала',physicalConfirmed:true};
const step=E.prepareCreate(db,'COMP1',check);
assert.equal(db.lubricationPoints.length,1,'prepare is not apply');
const item={key:'component',name:'Подшипниковая опора, приводной вал',category:'bearing',
 position:'Приводной вал · левая опора',activities:[{type:'regrease',label:'Досмазывание'}]};
const c=db.components[0],applied=F.applyConfirmedSpecs(db,'component',c,db.equipment[0],null,[item]);
let confirmed=E.recordCreated(db,'COMP1',step,applied.createdPointIds);
assert.equal(confirmed.pointIds.length,1);
assert.equal(confirmed.taskIds.length,1);
assert.equal(db.lubricationPoints.length,2);assert.equal(db.tasks.length,1);
assert.equal(db.tasks[0].approvalStatus,'review','no automatic approval');
assert.equal(db.tasks[0].materialId,null,'no invented material');
assert.equal(db.tasks[0].quantity.approved,'','no invented dose');
assert.equal(db.components[0].engineeringDecision.action,'point');
assert.equal(Q.candidateQueue(db).resolved.filter(x=>x.action==='point').length,1);
assert.equal(Q.candidateQueue(db).groups.flatMap(g=>g.items).filter(x=>x.id==='COMP1').length,0,'created physical source leaves review queue');
assert(!E.preview(db,'COMP1','point',check).allowed,'no duplicate create after confirmation');
F.applyConfirmedSpecs(db,'component',c,db.equipment[0],null,[item]);
assert.equal(db.lubricationPoints.length,2&&db.tasks.length===1,'existing candidate wizard is idempotent');
assert(E.previewUndo(db,'COMP1').allowed,'freshly created unconfigured point may be safely undone');

db.tasks[0].quantity.approved='20';
assert(!E.previewUndo(db,'COMP1').allowed,'changed dose blocks deletion');
db.tasks[0].quantity.approved='';
db.routes=[{id:'R1',taskIds:[db.tasks[0].id]}];
assert(!E.previewUndo(db,'COMP1').allowed,'route reference blocks deletion');
db.routes=[];
db.tasks[0].approvalStatus='approved';
assert(!E.previewUndo(db,'COMP1').allowed,'approved task blocks deletion');
db.tasks[0].approvalStatus='review';
const snapshot=JSON.stringify(db);
const undoPlan=E.previewUndo(db,'COMP1');
assert.equal(JSON.stringify(db),snapshot,'undo preview does not mutate data');
const out=E.undo(db,'COMP1');
assert(out.changed&&db.lubricationPoints.length===1&&db.tasks.length===0,'undo removes only untouched new artifacts');
assert.equal(db.nodes.length,0);
assert.equal(db.components[0].candidateState,'candidate','candidate restored after safe rollback');
assert.equal(db.components[0].engineeringDecisionHistory.length,2);
assert(db.lubricationPoints.some(x=>x.id==='LP-000099'),'preexisting unrelated point protected');

const ui=fs.readFileSync(path.join(root,'qa/qa-ui.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('./qa/engineering-decisions.js')&&html.indexOf('./qa/engineering-decisions.js')<html.indexOf('./qa/qa-ui.js'),'decision engine loaded before UI');
for(const text of ['installCandidateDecisionUI','Проверить решение','Продолжить в мастер точек','Отменить решение','data-qa-candidate-line','data-qa-decide'])
 assert(ui.includes(text),'UI decision contract '+text);
assert(fs.readFileSync(path.join(root,'import/candidate-finalizer.js'),'utf8').includes('recordCreated(targetDatabase,id,decisionContext'),'created points must store decision provenance');

const productionPath=path.join(root,'project/sources/pp53736/Филиал_завода__Техно__г._Юрга(20260923-051134).json');
const prod=JSON.parse(fs.readFileSync(productionPath,'utf8'));
const original=JSON.stringify(prod);
let chosen=null,planned=null;
for(const x of prod.components||[]){
 const p=E.preview(prod,x.id,'clarify',{reason:'Требуется проверить реальные точки смазки'});
 if(p.allowed){chosen=x;planned=p;break}
}
assert(chosen&&planned.allowed,'actual production baseline has at least one unresolved physical candidate');
assert.equal(JSON.stringify(prod),original,'real production source is not modified during preview');
const totals=[prod.equipment.length,prod.components.length,prod.lubricationPoints.length,prod.tasks.length];
E.commit(prod,chosen.id,'clarify',{reason:'Требуется проверить реальные точки смазки'});
assert(Q.candidateQueue(prod).resolved.some(x=>x.componentId===chosen.id),'real production decision visible');
assert(E.undo(prod,chosen.id).changed,'real production decision can be undone');
assert.deepStrictEqual([prod.equipment.length,prod.components.length,prod.lubricationPoints.length,prod.tasks.length],totals,'real production structural counts preserved');
console.log('PASS 1.0.33.69 Stage2 engineer decisions: preview/evidence/state/undo/idempotency/reclassification/reload-safe no-virtual production QA');
