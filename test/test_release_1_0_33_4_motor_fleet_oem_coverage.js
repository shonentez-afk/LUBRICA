const fs=require('fs'),vm=require('vm'),assert=require('assert');
const sandbox={window:{LubricaSystem:{registerModule(){}}}};sandbox.window.window=sandbox.window;vm.createContext(sandbox);
for(const f of ['motors/motor-oem-data.js','motors/motor-method-resolver.js','motors/motor-calculator.js'])vm.runInContext(fs.readFileSync(f,'utf8'),sandbox,{filename:f});
const O=sandbox.window.LubricaMotorOEM,C=sandbox.window.LubricaMotorCalculator;
let p=O.resolve('Электродвигатель 1TZ9501-3AA43-4AB4-Z 315L IMB3 N=160кВт n=2982 мин-1');
assert.equal(p.manufacturer,'LAMMERS');assert.equal(p.family,'1TZ9');assert.equal(p.frame,315);assert.equal(p.bearingConstruction.de,'6316 C3');assert.equal(p.bearingConstruction.nde,'6316 C3');
let r=C.calculate({motorText:'Электродвигатель 1TZ9501-3AA43-4AB4-Z 315L IMB3 N=160кВт n=2982 мин-1'});assert.equal(r.policy,'RELUBE');assert.equal(r.relube.doseG,30);assert.equal(r.relube.intervalHours,3000);assert.equal(r.relube.servicePoints,2);
p=O.resolve('Электродвигатель 1LE1001-1DB23-4AB4 160 M4-B3-IE2-PTC N=11 кВт, n=1450 об/мин');assert.equal(p.manufacturer,'SIEMENS/INNOMOTICS');assert.equal(p.bearingConstruction.de,'6209 2ZC3');assert.equal(p.bearingConstruction.nde,'6209 2ZC3');
r=C.calculate({motorText:'Электродвигатель 1LE1001-1DB23-4AB4 160 M4-B3-IE2-PTC N=11 кВт, n=1450 об/мин',nippleConfirmed:'no'});assert.equal(r.policy,'NO_ROUTINE_RELUBE');
r=C.calculate({motorText:'Электродвигатель 1LE1001-1DB23-4AB4 160 M4-B3-IE2-PTC N=11 кВт, n=1450 об/мин',nippleConfirmed:'yes'});assert.equal(r.policy,'MACHINE_PLATE');assert(r.needs.length);
p=O.resolve('Электродвигатель M2BAX 280SMG4 IMB3 N=90 кВт, n=1485 мин-1');assert.equal(p.policy,'ABB_L1_STANDARD');assert.equal(p.bearingConstruction.de,'6316/C3');assert.equal(p.bearingConstruction.nde,'6316/C3');
r=C.calculate({motorText:'Электродвигатель M2BAX 280SMG4 IMB3 N=90 кВт, n=1485 мин-1'});assert.equal(r.policy,'RELUBE');assert.equal(r.relube.intervalHours,9600);
p=O.resolve('Мотор-редуктор FH77/G DRE132S4/TF i=58.32 N=4 кВт n=1460 об/мин');assert.equal(p.manufacturer,'SEW-EURODRIVE');assert.equal(p.policy,'NO_ROUTINE_RELUBE');
p=O.resolve('Электродвигатель WK 160/2-215T N=37кВт n=9000об/мин');assert.equal(p.manufacturer,'EMOD');assert.equal(p.frame,160);assert.equal(p.policy,'MACHINE_PLATE');
p=O.resolve('Электродвигатель HQL 160SL B5');assert.equal(p.manufacturer,'OEMER');assert.equal(p.policy,'NO_ROUTINE_RELUBE');
for(const x of ['Электродвигатель QCA 112M4 B5','Электродвигатель 71B4 B5','Электродвигатель KA7250M-CB01B-Z N=37кВт n=975мин-1'])assert.equal(O.resolve(x).policy,'REQUIRE_IDENTIFICATION',x);

let sew=O.resolve('Мотор-редуктор R77DR63L6/M1');assert.equal(sew.manufacturer,'SEW-EURODRIVE');assert.equal(sew.policy,'NO_ROUTINE_RELUBE');assert(/6303/.test(sew.bearingConstruction.de));
sew=O.resolve('Мотор-редуктор K37DV100M4/M1/A+B i=5,36');assert.equal(sew.policy,'NO_ROUTINE_RELUBE');assert(/6306/.test(sew.bearingConstruction.de));

console.log('Motor fleet OEM coverage 1.0.33.4: PASS');
