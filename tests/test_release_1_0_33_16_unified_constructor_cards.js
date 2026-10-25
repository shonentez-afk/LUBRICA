const fs=require('fs');
const ui=fs.readFileSync('structure/detail-ui.js','utf8');
const css=fs.readFileSync('assets/app.css','utf8');
function ok(v,m){if(!v)throw new Error(m)}
ok(ui.includes('structure-arrangement-card fan-structure-card'),'fan does not use unified arrangement card');
ok(ui.includes('structure-arrangement-card conveyor-structure-card'),'conveyor does not use unified arrangement card');
ok(ui.includes('КОНСТРУКЦИЯ ВЕНТИЛЯТОРА'),'fan card title missing');
ok(ui.includes('КОНСТРУКЦИЯ КОНВЕЙЕРА'),'conveyor card title missing');
ok((ui.match(/>Открыть конструктор<\/button>/g)||[]).length>=2,'constructor action label is not unified');
ok(ui.includes("data-fan-arrangement>Открыть конструктор"),'fan constructor label differs');
ok(ui.includes("data-conveyor-arrangement>Открыть конструктор"),'conveyor constructor label differs');
ok(!ui.includes('${fanAction}<button class="btn ghost"'),'fan action is still in admin action row');
ok(css.includes('.structure-arrangement-card'),'shared arrangement card styles missing');
console.log('PASS 1.0.33.16 unified fan/conveyor constructor cards');
