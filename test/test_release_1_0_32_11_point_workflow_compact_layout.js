const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m)}
const css=fs.readFileSync('assets/app.css','utf8');
const html=fs.readFileSync('index.html','utf8');
ok(css.includes('1.0.32.11 — compact point-card workflow control'),'hotfix marker missing');
ok(css.includes('.task-workflow-control{\n  grid-template-columns:minmax(0,1fr);'),'workflow must be one column');
ok(css.includes('.task-workflow-control .btn{\n  width:100%;'),'approval button must fit card');
ok(css.includes('.task-workflow-control select{\n  width:100%;'),'status select must fit card');
ok(html.includes('Сначала сохраните изменения, затем утвердите мероприятие.'),'compact help text missing');
console.log('PASS 1.0.32.11 point workflow compact layout');
