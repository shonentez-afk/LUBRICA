const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');const ctx={console,window:{LubricaSystem:{registerModule(){}}}};ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'calculations/gearbox-oil-calculator.js'),'utf8'),ctx);const C=ctx.window.LubricaGearboxOilCalculator;const a=(x,m)=>{if(!x)throw new Error(m)};
let r=C.calculate({oemFillLiters:12.5,approvedFillLiters:12.2,changeHours:10000,changeMonths:18,conditionBased:true,lubricationMethod:'splash'});a(r.fill.effectiveFillLiters===12.2,'approved fill priority');a(r.interval.rule==='whichever_first','combined interval');a(r.interval.hours===10000&&r.interval.months===18,'hours/months');
r=C.calculate({oemFillLiters:null,approvedFillLiters:null});a(r.warnings.some(x=>x.includes('рабочий объём')),'missing fill warning');
r=C.calculate({oemFillLiters:5,lubricationMethod:'pressure',oilSystemIncluded:false,changeMonths:12});a(r.warnings.some(x=>x.includes('внешнего контура')),'external circuit warning');
console.log('GEARBOX OIL CALCULATOR TEST PASS');
