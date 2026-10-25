const fs=require('fs'),vm=require('vm'),path=require('path');
global.window=global;
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../import/lubrication-domain-cleanup.js'),'utf8'));
function assert(v,m){if(!v)throw new Error(m)}
const fixture=JSON.parse(fs.readFileSync('/mnt/data/Филиал_завода__Техно__г._Юрга(20260909-071640).json','utf8'));
const before={eq:fixture.equipment.length,comp:fixture.components.length,lp:fixture.lubricationPoints.length,tasks:fixture.tasks.length,routes:fixture.routes.length};
const r=global.LubricaLubricationDomainCleanup.apply(fixture);
assert(fixture.equipment.length===before.eq,'equipment deleted');
assert(fixture.components.length===before.comp,'components deleted');
assert(fixture.lubricationPoints.length===before.lp,'lubrication points deleted');
assert(fixture.tasks.length===before.tasks,'tasks deleted');
assert(fixture.routes.length===before.routes,'routes deleted');
const pipe=fixture.equipment.find(e=>/Труба ваграночных газов/i.test(e.name||''));assert(pipe&&pipe.maintenanceCandidateState==='excluded','static pipe not excluded');
const frame=fixture.equipment.find(e=>/^Рама вентилятора/i.test(e.name||''));assert(frame&&frame.maintenanceCandidateState==='excluded','fan frame not excluded');
const fan=fixture.equipment.find(e=>/Вентилятор центробежный V22011/i.test(e.name||''));assert(fan&&fan.lubricationDomainStatus==='RELEVANT','confirmed fan not relevant');
const screw=fixture.equipment.find(e=>/Шнек грубой очистки/i.test(e.name||''));assert(screw&&screw.maintenanceCandidateState!=='excluded','screw was over-excluded');
console.log('PASS 1.0.29 Lubrication Domain Cleanup',JSON.stringify(r.summary));
