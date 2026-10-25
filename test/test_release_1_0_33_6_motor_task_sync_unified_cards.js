const fs=require('fs');
const ui=fs.readFileSync('motors/motor-ui.js','utf8');
const css=fs.readFileSync('assets/app.css','utf8');
function ok(v,msg){if(!v)throw new Error(msg)}
ok(ui.includes('function motorSiblingPoints'), 'motor sibling resolver missing');
ok(ui.includes('targets.forEach(tp=>{tp.motorService='), 'result is not propagated to DE/NDE sibling points');
ok(ui.includes('task.schedule.calculatedHours=Number(result.relube.intervalHours)'), 'calculated task interval not synchronized');
ok(ui.includes('task.quantity.calculated=Number(result.relube.doseG)'), 'calculated task dose not synchronized');
ok(ui.includes('task.schedule.source=result.relube.source'), 'task schedule source not synchronized');
ok(ui.includes('task.quantity.source=result.relube.source'), 'task quantity source not synchronized');
ok(ui.includes('motor-recommendation-card'), 'unified recommendation card missing');
ok(ui.includes('motor-auto-grid'), 'automatic OEM data card missing');
ok(ui.includes("const saved=savedMotorService(point,d)"), 'sibling saved motor context is not reused');
ok(css.includes('LUBRICA 1.0.33.6 — unified motor calculator cards'), 'unified motor card CSS missing');
console.log('Motor task sync + unified cards 1.0.33.6: PASS');
