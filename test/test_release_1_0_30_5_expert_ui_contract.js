const fs=require('fs');const s=fs.readFileSync('lubrication/task-editor.js','utf8');
function ok(x,m){if(!x){console.error('FAIL:',m);process.exit(1)}}
ok(s.includes('Конструкция и идентификация опоры'),'step 01 exists');
ok(s.includes('Применённые методики'),'step 02 exists');
ok(s.includes('Исходные данные расчёта'),'step 03 exists');
ok(s.includes('Результат обслуживания'),'step 04 exists');
ok(s.includes('Проверка и применение'),'step 05 exists');
ok(s.includes('fullRenewalFallbackMode'),'parameter-level fallback is persisted');
ok(s.includes('Применить SKF для периодичности'),'explicit SKF fallback action exists');
ok(s.includes('Количество нового заполнения'),'REITZ refill quantity is represented separately');
ok(s.includes('Расчёт относится к одной фактической подшипниковой опоре.'),'separate-support scope warning exists');
ok(s.includes('Совмещённый подшипниковый блок'),'combined-block context remains supported');
ok(s.includes('expert-advanced-section'),'technical fields moved behind advanced toggle');
ok(s.includes("visibleSteps=[...form.querySelectorAll('.calculation-step')]") ,'dynamic step numbering exists');
console.log('EXPERT UI CONTRACT 1.0.30.5 PASS');
