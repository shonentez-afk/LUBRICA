
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,window:{LubricaSystem:{registerModule(){}}}};ctx.window.window=ctx.window;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'calculations/chain-calculator.js'),'utf8'),ctx);
const C=ctx.window.LubricaChainCalculator,a=(x,m)=>{if(!x)throw new Error(m)};
let r=C.quantity({quantityMethod:'oem_total',oemTotal:12,lubricantDensity:0.9});a(r.volumeMl===12&&r.massG===10.8,'OEM total');
r=C.quantity({quantityMethod:'per_meter',chainLengthM:18,ratePerM:1.2,lubricantDensity:0.9});a(r.volumeMl===21.6,'per meter');
r=C.quantity({quantityMethod:'injector',nozzleCount:8,nozzleDoseMl:0.08,cyclesPerService:5});a(r.volumeMl===3.2,'injector cycles');
r=C.quantity({quantityMethod:'per_meter',chainLengthM:18,ratePerM:null});a(r.volumeMl===null&&!!r.error,'no invented per-meter norm');
let i=C.interval({intervalHours:250,intervalDays:30});a(i.rule==='whichever_first'&&i.hours===250&&i.days===30,'combined interval');
let x=C.calculate({quantityMethod:'oem_total',oemTotal:5,applicationTarget:'surface'});a(x.warnings.some(v=>v.includes('палец–втулка')),'target warning');
console.log('CHAIN CALCULATOR TEST PASS');
r=C.quantity({quantityMethod:'oem_total',oemTotal:12});a(r.volumeMl===12&&r.massG===null,'no invented chain density');
