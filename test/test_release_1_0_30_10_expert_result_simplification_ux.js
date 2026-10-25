const fs=require('fs');
const s=fs.readFileSync('lubrication/task-editor.js','utf8');
const css=fs.readFileSync('assets/app.css','utf8');
function ok(x,m){if(!x)throw new Error(m)}
ok(s.includes('Изменить результат вручную'),'manual override drawer missing');
ok(s.includes('Источники и технические данные полного обновления'),'renewal source drawer missing');
ok(s.includes('Инженерный fallback LUBRICA'),'engineering fallback drawer missing');
ok(s.includes("btn.hidden=partialRenewal||matches"),'approved-cycle action is not hidden');
ok(s.includes("btn.textContent=(ad>0||ai>0)?'Применить новый результат':'Принять цикл'"),'stale-result action label missing');
ok(css.includes('.calc-dom-only{display:none!important}'),'duplicate calculated-dose box not suppressed');
ok(s.includes('Дополнительные настройки'),'compact advanced toggle missing');
console.log('PASS 1.0.30.10 expert result simplification UX');
