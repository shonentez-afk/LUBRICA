const fs=require('fs'),vm=require('vm'),path=require('path');
function assert(x,m){if(!x)throw new Error(m)}
const ctx={window:{}};ctx.window.window=ctx.window;ctx.window.LubricaSystem={registerModule(){}};vm.createContext(ctx);
for(const f of ['bearings/multi-oem-data.js','bearings/calculator.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx,{filename:f});
const C=ctx.window.LubricaBearingCalculator;
let r=C.calculate({designation:'UCP208',manufacturer:'auto',bearingType:'bearing_unit',d:40,D:80,B:49.2,rpm:300,temperatureC:70,greaseDensity:0.9,fillRatio:1,loadClass:'medium',contamination:'normal',vibration:'normal',shaftOrientation:'horizontal'});
assert(r.maintenancePolicy.id==='housed_relube_only','housed policy');
assert(r.warnings.length===1,'only real manufacturer warning must remain');
assert(/Производитель не указан/.test(r.warnings[0]),'manufacturer warning text');
assert(!r.warnings.some(x=>/полной замены|Доля заполнения|Universal 3\.1/.test(x)),'obsolete housed/fill warnings removed');
assert(!r.assumptions.some(x=>/полная замена/.test(x)),'full-renewal assumptions excluded for relube-only policy');
const task=fs.readFileSync(path.join(__dirname,'..','lubrication/task-editor.js'),'utf8');
assert(task.includes('function calcMessages(result,input)'), 'message classifier exists');
assert(task.includes('bearing-calc-info'), 'info messages rendered separately');
assert(task.includes('Технические детали расчёта'), 'technical assumptions collapsed in expert mode');
console.log('RELEASE 1.0.27.8 SERVICE MESSAGE DEDUP PASS');
