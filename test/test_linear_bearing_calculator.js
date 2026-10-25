
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,window:{LubricaSystem:{registerModule(){}}}};ctx.window.window=ctx.window;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'calculations/linear-bearing-calculator.js'),'utf8'),ctx);
const C=ctx.window.LubricaLinearBearingCalculator;
const a=(x,m)=>{if(!x)throw new Error(m)};

let r=C.relubeQuantity({unitCount:4,qtyPerUnitCm3:0.8,greaseDensity:0.9,orientation:'horizontal',orientationRule:'none'});
a(r.volumeCm3===3.2,'horizontal OEM quantity');
a(r.massG===2.88,'cm3 to grams');

r=C.relubeQuantity({unitCount:4,qtyPerUnitCm3:0.8,greaseDensity:0.9,orientation:'vertical',orientationRule:'hiwin_50'});
a(r.factor===1.5&&r.volumeCm3===4.8,'HIWIN orientation +50%');

let i=C.interval({intervalSource:'thk_reference'});
a(i.calendarMonthsMin===3&&i.calendarMonthsMax===6,'THK calendar reference interval');

let calc=C.calculate({unitCount:2,qtyPerUnitCm3:0.5,orientation:'horizontal',orientationRule:'none',strokeMm:50,blockLengthMm:40,intervalSource:'oem'});
a(calc.warnings.some(x=>x.includes('Короткий ход')),'short stroke warning');

let noOem=C.relubeQuantity({unitCount:2,qtyPerUnitCm3:null});
a(noOem.volumeCm3===null&&!!noOem.error,'no invented quantity without OEM norm');

console.log('LINEAR BEARING CALCULATOR TEST PASS');
r=C.relubeQuantity({unitCount:4,qtyPerUnitCm3:0.8,orientation:'horizontal',orientationRule:'none'});a(r.volumeCm3===3.2&&r.massG===null,'no invented linear-bearing density');
