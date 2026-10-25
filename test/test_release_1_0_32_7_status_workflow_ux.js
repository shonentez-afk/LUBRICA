const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const js=fs.readFileSync(__dirname+'/../lubrication/task-editor.js','utf8');
const app=fs.readFileSync(__dirname+'/../js/app.js','utf8');
const css=fs.readFileSync(__dirname+'/../assets/app.css','utf8');
function ok(v,m){if(!v)throw new Error(m)}
ok(html.includes('id="pointWorkflowSummary"'),'workflow summary missing');
ok(html.includes('Требуются данные')&&html.includes('Требует проверки')&&html.includes('Готово · включено в план'),'user workflow labels missing');
ok(html.includes('id="approveTaskBtn"'),'approval action missing');
ok(js.includes('function renderWorkflowUX()'),'workflow presenter missing');
ok(js.includes("1 · Есть несохранённые изменения"),'dirty state missing');
ok(js.includes("2 · Расчёт применён"),'calculation-applied step missing');
ok(js.includes("3 · Участвует в плане"),'plan participation step missing');
ok(js.includes('function toggleTaskApprovalImpl()'),'approval workflow handler missing');
ok(js.includes("strategy!=='По состоянию'"),'approval schedule guard missing');
ok(app.includes('toggleTaskApproval'),'approval button not wired');
ok(css.includes('.point-workflow-summary')&&css.includes('.workflow-state.needs-data'),'workflow styles missing');
ok(html.includes('только утверждённые мероприятия участвуют в автоматическом формировании маршрутов'),'route participation wording missing');
console.log('1.0.32.7 Status & Workflow UX: OK');
