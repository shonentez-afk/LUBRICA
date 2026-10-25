const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const sandbox={window:{}}; sandbox.window.window=sandbox.window;
sandbox.window.LubricaLubricationDomainCleanup={};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'import/component-classifier.js'),'utf8'),sandbox);
const C=sandbox.window.LubricaClassifier;
let r=C.classifyComponentText('Втулка закрепительная H 322 Линия №2','');
assert.equal(r.state,'excluded','H322 mounting sleeve must be excluded');
const db={equipment:[{id:'EQ1',name:'Конвейер ленточный тест',equipmentType:'conveyor'}],components:[
 {id:'B1',equipmentId:'EQ1',name:'Подшипник 22211 E',candidateCategory:'bearing',candidateState:'candidate'},
 {id:'B2',equipmentId:'EQ1',name:'Подшипник 23026 CC/W33',candidateCategory:'bearing',candidateState:'candidate'},
 {id:'B3',equipmentId:'EQ1',name:'Узел подшипниковый UKF 212',candidateCategory:'bearing',candidateState:'candidate'},
 {id:'B4',equipmentId:'EQ1',name:'Подшипник 22222 EK',candidateCategory:'bearing',candidateState:'candidate'},
 {id:'C1',equipmentId:'EQ1',name:'Муфта GE-T 38/45B',candidateCategory:'coupling',candidateState:'review'},
 {id:'H1',equipmentId:'EQ1',name:'Втулка закрепительная H 322',candidateCategory:'bushing',candidateState:'review'},
 {id:'G1',equipmentId:'EQ1',name:'Редуктор A412/UH45 1:11,7 B3 PAM112',candidateEquipmentType:'gearbox',candidateState:'equipment'}
]};
const ev=C.conveyorEvidence(db,db.equipment[0]);
assert(ev.supportLayout&&ev.supportLayout.supports.length===4,'four physical support slots expected');
assert(ev.excluded.some(x=>x.id==='H1'),'stale H322 bushing must be excluded inside conveyor evidence');
assert(!ev.actual.some(x=>x.id==='H1'),'H322 must not remain an actual service candidate');
const finalizer=fs.readFileSync(path.join(root,'import/candidate-finalizer.js'),'utf8');
assert(finalizer.includes("const autoSelected=['chain'].includes(a.category)"),'only chain should auto-select among extra point candidates');
assert(finalizer.includes('Включить точку'),'explicit include-point control missing');
assert(finalizer.includes("card.classList.toggle('is-disabled',!use.checked)"),'disabled row state missing');
const css=fs.readFileSync(path.join(root,'assets/app.css'),'utf8');
assert(css.includes('.candidate-finalize-item.is-disabled'),'disabled candidate style missing');
console.log('PASS 1.0.33.35 conveyor candidate cleanup + optional selection');
