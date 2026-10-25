const fs=require('fs'),vm=require('vm'),path=require('path');
function assert(x,m){if(!x)throw new Error(m)}
const db={equipment:[{id:'EQ-1',lineId:'L1',areaId:'A1'}],nodes:[{id:'N1',equipmentId:'EQ-1'}],lubricationPoints:[{id:'LP-1',equipmentId:'EQ-1',nodeId:'N1',name:'Опора левая',componentBinding:{}}],tasks:[],materials:[],tools:[],routes:[],componentLibraryEntries:[]};
const context={window:{LubricaCore:{State:{getDatabase:()=>db}}}};context.window.window=context.window;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../qa/qa-engine.js'),'utf8'),context);
const report=context.window.LubricaProgramQA.audit(db);const orphan=report.issues.find(x=>x.code==='POINT_WITHOUT_TASKS');
assert(orphan,'orphan point must be reported');
assert(orphan.entityId==='LP-1','correct point id');
assert(/не попадает в Карту/.test(orphan.title),'clear title');
assert(/Карта смазки показывает мероприятия/.test(orphan.message),'clear explanation');
assert(orphan.action==='Открыть в Структуре','correct action label');
const ui=fs.readFileSync(path.join(__dirname,'../qa/qa-ui.js'),'utf8');
assert(ui.includes("x.code==='POINT_WITHOUT_TASKS'"),'special orphan navigation');
assert(ui.includes("selectEntity?.('lubricationPoint',x.entityId)"),'opens structure point');
console.log('CONTROL ORPHAN POINT CONTRACT PASS');
