const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}},LubricaCalculationRegistry:(()=>{const m=new Map();return{register:x=>(m.set(x.id,x),x),byId:id=>m.get(id),list:()=>[...m.values()]}})()};window.window=window;const c={window,console};vm.createContext(c);const load=f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});
['calculations/oil-system-calculator.js','calculations/open-gear-calculator.js','calculations/wire-rope-calculator.js','calculations/central-lubrication-calculator.js'].forEach(load);const a=(x,m)=>{if(!x)throw Error(m)};
let r=window.LubricaOilSystemCalculator.calculate({approvedVolumeLiters:120,filterDpBar:2.1,filterDpLimitBar:2,changeHours:4000});a(r.volume.effective===120,'oil volume');a(r.filter.serviceRequired,'filter dp');
r=window.LubricaOpenGearCalculator.calculate({quantityMethod:'spray',nozzleDose:2,nozzleCount:4,cyclesPerService:3});a(r.quantity.value===24&&r.quantity.unit==='мл','open gear spray');
r=window.LubricaWireRopeCalculator.calculate({quantityMethod:'per_meter',serviceLengthM:30,ratePerM:2,quantityUnit:'г'});a(r.quantity.value===60,'rope quantity');a(r.warnings.some(x=>x.includes('не создаёт')),'rope no invented rate');
r=window.LubricaCentralLubricationCalculator.calculate({requiredPerCycle:10,meteringDose:2,outletCount:5,cyclesPerService:1,supplyConfirmed:'yes'});a(r.supply===10&&r.balancePercent===0,'central balance');
console.log('STAGE 8.11-8.14 CALCULATORS PASS');
