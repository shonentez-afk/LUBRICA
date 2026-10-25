
const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.resolve(__dirname,'..');
const ctx={console,window:{LubricaSystem:{registerModule(){}}}};ctx.window.window=ctx.window;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'calculations/coupling-calculator.js'),'utf8'),ctx);
const C=ctx.window.LubricaCouplingCalculator,a=(x,m)=>{if(!x)throw new Error(m)};
let r=C.quantity({quantityMethod:'oem_total',oemTotalG:350,greaseDensity:.9});a(r.massG===350,'OEM');
r=C.quantity({quantityMethod:'cavity',cavityVolumeCm3:500,fillRatio:.7,greaseDensity:.9});a(r.massG===315&&r.greaseVolumeCm3===350,'cavity');
r=C.quantity({quantityMethod:'cavity',cavityVolumeCm3:500,fillRatio:null,greaseDensity:.9});a(r.massG===null&&!!r.error,'no invented fill ratio');
let i=C.interval({intervalHours:4000,intervalMonths:12});a(i.rule==='whichever_first','combined interval');
let x=C.calculate({quantityMethod:'oem_total',oemTotalG:100,couplingType:'flexible_dry'});a(x.warnings.some(v=>v.includes('не требует')),'dry coupling warning');
console.log('COUPLING CALCULATOR TEST PASS');
r=C.quantity({quantityMethod:'cavity',cavityVolumeCm3:500,fillRatio:.7});a(r.massG===null&&!!r.error,'no invented coupling density');
