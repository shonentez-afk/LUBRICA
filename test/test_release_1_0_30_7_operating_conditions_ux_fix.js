const fs=require('fs');
const s=fs.readFileSync('lubrication/task-editor.js','utf8');
function ok(v,m){if(!v){console.error('FAIL:',m);process.exit(1)}}
ok(s.includes('data-operating-context-note'),'operating context note missing');
ok(s.includes("Активная OEM-методика: REITZ"),'REITZ operating context explanation missing');
ok(s.includes('Нагрузка<select name="loadClass"'),'load field not in main form');
ok(s.includes('Загрязнение<select name="contamination"'),'contamination field not in main form');
ok(s.includes('Вибрация<select name="vibration"'),'vibration field not in main form');
ok(s.includes('Положение вала<select name="shaftOrientation"'),'shaft orientation field not in main form');
ok(s.includes('Инженерный fallback и ручное переопределение периода'),'advanced section not clarified');
const adv=s.indexOf('Инженерный fallback и ручное переопределение периода');
const before=s.slice(0,adv);
const after=s.slice(adv,adv+7000);
ok(before.includes('Температура корпуса подшипника, °C'),'temperature not moved to main inputs');
ok(after.includes('P/C<input name="loadRatioPC"'),'P/C must remain in advanced fallback');
ok(after.includes('Базовый интервал, ч'),'base interval must remain advanced');
ok(after.includes('data-speed-summary'),'speed diagnostics must remain advanced');
ok(!after.includes('Нагрузка<select name="loadClass"'),'load must not be duplicated in advanced fallback');
console.log('OPERATING CONDITIONS UX FIX TEST PASS');
