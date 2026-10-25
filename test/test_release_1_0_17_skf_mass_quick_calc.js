const fs=require('fs'),vm=require('vm');
const ctx={window:{}};ctx.window.window=ctx.window;ctx.window.LubricaSystem={registerModule(){}};vm.createContext(ctx);
for(const f of ['bearings/catalog-data.js','bearings/library.js','bearings/calculator.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const B=ctx.window.LubricaBearings,C=ctx.window.LubricaBearingCalculator;
const expected={
 'UCP 212':[1.50,5.05], 'UCP 216':[2.79,9.30], 'UCT 210':[0.74,2.50],
 'UCFC 208':[0.61,2.02], 'UCFC 211':[1.07,4.26], 'UCP 320':[10.9,36.7]
};
for(const [name,[insertMass,unitMass]] of Object.entries(expected)){
 const r=B.lookup(name); if(!r.record)throw new Error('missing '+name);
 if(r.record.manufacturer!=='SKF')throw new Error('manufacturer '+name);
 if(Math.abs(r.record.insertMassKg-insertMass)>1e-9)throw new Error('insert mass '+name);
 if(Math.abs(r.record.unitMassKg-unitMass)>1e-9)throw new Error('unit mass '+name);
}
const q=C.calculate({d:60,D:110,B:65.1,bearingType:'bearing_unit',bearingMassKg:1.5,bearingMassKind:'insert',insertDesignation:'UC212',manufacturer:'SKF',fillRatio:1,greaseDensity:.9,method:'oem'}).fullFill;
if(q.massG!==218.06)throw new Error('UCP212 quick full fill '+JSON.stringify(q));
const blocked=C.calculate({d:60,D:110,B:65.1,bearingType:'bearing_unit',bearingMassKg:5.05,bearingMassKind:'unit',fillRatio:1,greaseDensity:.9,method:'oem'}).fullFill;
if(!blocked.blocked)throw new Error('unit mass must never be used as insert mass');
console.log('SKF MASS + QUICK CALC CONTRACT PASS');
