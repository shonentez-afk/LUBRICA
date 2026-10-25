const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{}};ctx.window.window=ctx.window;vm.createContext(ctx);
vm.runInContext(fs.readFileSync('bearings/catalog-data.js','utf8'),ctx);
ctx.window.LubricaCore={State:{getDatabase:()=>({bearingOverrides:[]})}};vm.runInContext(fs.readFileSync('bearings/library.js','utf8'),ctx);
let r=ctx.window.LubricaBearings.lookup('INA VLU20 1094');assert(r.record,'VLU20 1094 must resolve');assert.strictEqual(r.record.massKg,62.5);assert.strictEqual(r.record.d,984);assert.strictEqual(r.record.D,1198);assert.strictEqual(r.record.bearingType,'slewing_ring_four_point_ball');
ctx.window.LubricaBearingOEM={normManufacturer:v=>'FAG',methodRecommendation:()=>({}),exactProfile:()=>null,sourceRefs:{SCHAEFFLER_SLEWING:{title:'TPI13'},LUBRICA_UNIFIED:{title:'LUBM'},FAG:{title:'FAG'}}};vm.runInContext(fs.readFileSync('bearings/calculator.js','utf8'),ctx);
const C=ctx.window.LubricaBearingCalculator;let x=C.calculate({designation:'VLU201094',manufacturer:'INA',bearingType:'slewing_ring_four_point_ball',d:984,D:1198,B:56,temperatureC:50,contamination:'normal',vibration:'normal',method:'lubrica_unified'});assert.strictEqual(x.relube.value,null);assert.strictEqual(x.relube.procedureOnly,true);assert.strictEqual(x.relubeInterval.value,500);assert.strictEqual(x.maintenancePolicy.fullRenewal,false);
console.log('PASS 1.0.27.14 INA VLU20');
