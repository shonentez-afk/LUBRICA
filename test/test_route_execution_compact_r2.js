'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx=vm.createContext({window,console});
vm.runInContext(fs.readFileSync('routes/route-compact-ui.js','utf8'),ctx,{filename:'route-compact-ui.js'});
const U=window.LubricaRouteCompactUI,copy=o=>JSON.stringify(o);
const model={groups:[{equipmentCode:'10110182',equipment:'Пила',node:'Привод',tasks:[
 {taskId:'T1',pointKey:'P1',pointId:'LP-001',pointName:'Вал DE',routeStep:1,operation:'Досмазывание',materialName:'SKF LGHP 2',materialCode:'GRE-01',toolName:'Шприц',toolCode:'TOOL-1',quantityPrimary:'12 г',templateTitle:'Подшипник',steps:['Очистить маслёнку','Смазать']},
 {taskId:'T2',pointKey:'P1',pointId:'LP-001',pointName:'Вал DE',routeStep:1,operation:'Контроль <скрипт>',quantityPrimary:'—',steps:['Осмотреть уплотнение']},
 {taskId:'T3',pointKey:'P2',pointId:'LP-002',pointName:'Вал NDE',routeStep:2,operation:'Досмазывание',quantityPrimary:'15 г',steps:['Очистить']},
 ]}]};
const run={status:'in_progress',taskResults:{T1:{done:true,resultStatus:'completed',actualQuantity:'12'},T2:{done:false,resultStatus:'skipped',observations:'',deviationReason:''},T3:{done:false,resultStatus:'pending'}}};
const before=copy(model)+copy(run),visits=U.visits(model);
assert.equal(visits.length,2,'Two physical positions, not three task cards');
assert.equal(visits[0].tasks.length,2,'Two operations belong to one physical point');
assert.equal(visits[1].pointId,'LP-002','Preserve point sequence');
assert.equal(U.summary(visits[0],run).done,1);
assert.equal(U.summary(visits[0],run).skipped,1);
assert.equal(U.summary(visits[0],run).needsReason,1);
assert.equal(U.summary(visits[1],run).pending,1);
assert.equal(U.taskState(run,'T2'),'skipped');
let html=U.render(model,{run,editable:true});
assert.equal((html.match(/class="route-visit-card /g)||[]).length,2);
assert.equal((html.match(/data-task-result=/g)||[]).length,3,'One editable result per task');
assert.equal((html.match(/data-task-actual-quantity=/g)||[]).length,3);
assert(html.includes('data-route-find-pending')&&html.includes('data-route-visit-filter'));
assert(html.includes('LP-001')&&html.includes('GRE-01'));
assert(html.includes('Причина отклонения *')&&html.includes('reason-required'));
assert(html.includes('&lt;скрипт&gt;')&&!html.includes('<скрипт>'),'Escape untrusted task text');
assert(html.includes('<li>Очистить маслёнку</li>'));
const pending=U.render(model,{run,editable:true,filter:'pending'});
const deviations=U.render(model,{run,editable:true,filter:'deviations'});
assert.equal((pending.match(/class="route-visit-card /g)||[]).length,1);
assert(pending.includes('LP-002')&&!pending.includes('LP-001'));
assert.equal((deviations.match(/class="route-visit-card /g)||[]).length,1);
assert(deviations.includes('LP-001')&&!deviations.includes('LP-002'));
const readOnly=U.render(model,{run,editable:false});
assert(readOnly.includes('data-task-result="T1" aria-label="Результат мероприятия" disabled'));
assert.equal(before,copy(model)+copy(run),'Rendering must never mutate snapshot or results');
const empty=U.render({groups:[]},{run:null});
assert(empty.includes('В выбранном фильтре точек нет'));
console.log('ROUTE COMPACT R2 CORE TEST PASS');
