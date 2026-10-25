const fs=require('fs');
const task=fs.readFileSync('lubrication/task-editor.js','utf8');
const motor=fs.readFileSync('motors/motor-ui.js','utf8');
function ok(v,msg){if(!v)throw new Error(msg)}
ok(task.includes("const motorCtx=window.LubricaMotorUI?.motorContext?.(lp,db36())"),'motor context is not detected in right-side calculation summary');
ok(task.includes("const motorService=window.LubricaMotorUI?.savedMotorService?.(lp,db36())"),'saved DE/NDE motor service is not reused in side summary');
ok(task.includes('Motor bearing points are calculated by the Motor OEM engine'),'motor-side authority guard missing');
ok(task.includes("$('#bearingSummaryDose').textContent=noRoutine?'Не предусмотрено OEM'"),'motor dose/period is not rendered into bearing summary slot');
ok(task.includes("Для электродвигателя ведётся OEM-цикл досмазывания"),'motor full-renewal semantics missing');
ok(task.indexOf('const motorCtx=') < task.indexOf('const c=lp.bearing?.calculation||{};'),'generic bearing result still takes precedence over motor result');
ok(motor.includes("tp.bearing.calculation.supersededBy='motor_oem'"),'legacy bearing calculation is not marked superseded after motor apply');
ok(motor.includes("Active maintenance result is controlled by Motor OEM engine"),'supersession provenance missing');
console.log('Motor side summary authority 1.0.33.8: PASS');
