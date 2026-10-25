const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),w={LubricaSystem:{registerModule(){}}},c={window:w};vm.createContext(c);
for(const f of ['bearings/catalog-data.js','bearings/multi-oem-data.js','bearings/calculator.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
const O=w.LubricaBearingOEM,C=w.LubricaBearingCalculator;
for(const code of ['204','205','206','207','208','209','210','211','212']){const p=O.nskBearingUnitProfile('UCP'+code);assert(p,'NSK UCP '+code);assert(p.insert.massKg>0);assert(p.unitMassKg>0);}
let p=O.nskBearingUnitProfile('UCF212');assert(p&&p.insertDesignation==='UC212D1'&&p.insert.massKg===1.46);assert.strictEqual(p.unitMassKg,null,'do not invent UCF housing mass');
let r=C.calculate({designation:'UCP212',manufacturer:'NSK',bearingType:'bearing_unit',d:60,D:110,B:65.1,method:'auto_oem',bearingMassKg:1.5,bearingMassKind:'insert',massManufacturer:'SKF',fillRatio:0.25,greaseDensity:0.9});
assert.strictEqual(r.relube.confidenceCode,'B');assert.strictEqual(r.relube.value,null);assert.strictEqual(r.relube.numericUnavailable,true);let gf=C.geometricBearingFill({designation:'UCP212',manufacturer:'NSK',bearingType:'bearing_unit',d:60,D:110,B:65.1,bearingMassKg:1.5,bearingMassKind:'insert',massManufacturer:'SKF',fillRatio:0.25,greaseDensity:0.9});assert.strictEqual(gf.massManufacturer,'NSK');assert.strictEqual(gf.bearingMassKg,1.46);assert.strictEqual(gf.confidenceCode,'C');assert.strictEqual(r.maintenancePolicy.id,'housed_relube_only');
console.log('NSK BEARING UNITS 1.0.26.5 PASS');
