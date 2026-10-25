const fs=require('fs');
const ui=fs.readFileSync('structure/detail-ui.js','utf8');
const css=fs.readFileSync('assets/app.css','utf8');
function ok(v,m){if(!v)throw new Error(m)}
ok(ui.includes('КОНСТРУКЦИЯ КОНВЕЙЕРА'),'missing conveyor structure card');
ok(ui.includes('data-conveyor-arrangement'),'missing conveyor action');
ok(ui.includes("LubricaCandidateFinalizer?.open?.('equipment',x.id)"),'action does not open finalizer for equipment');
ok(ui.includes("conveyorTemplate?.id==='conveyor_arrangement'"),'entrypoint is not classifier-driven');
ok(ui.includes('isConveyorGroup'),'group guard missing');
ok(css.includes('.structure-arrangement-card'),'card styles missing');
console.log('PASS 1.0.33.12 conveyor structure entrypoint');
