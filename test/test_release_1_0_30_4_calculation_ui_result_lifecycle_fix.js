
const fs=require('fs');
const s=fs.readFileSync('lubrication/task-editor.js','utf8');
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exit(1)}}
ok(/updateSimpleMethodSummary\(result\);\s*syncQuickApproval\(result\);/.test(s),
   'normal recalc must synchronize simple result cards');
ok(s.includes('data-full-renewal-reminder'),
   'simple UI must contain full-renewal lifecycle reminder');
ok(s.includes('Нужно отдельное мероприятие «Полная замена смазки»'),
   'missing full-renewal task reminder text must exist');
ok(s.includes("lifecycle==='CALCULATED'&&!hasFull"),
   'reminder must only appear when full-renewal cycle is fully calculated and task is missing');
ok(s.includes('Производитель подшипника / вставки'),
   'expert UI must distinguish bearing/insert manufacturer');
ok(s.includes('Основная методика досмазывания'),
   'expert UI must distinguish active SNL relube methodology');
ok(s.includes('Ручное переопределение метода дозы'),
   'expert UI must label manual override explicitly');
ok(s.includes('Авто — лучший доступный OEM → LUBRICA'),
   'auto method must not be mislabeled as active Universal method');
console.log('CALCULATION UI RESULT/LIFECYCLE FIX TEST PASS');
