const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ROOT=require('path').resolve(__dirname,'..');
global.window=global;global.LubricaSystem={registerModule(){}};global.LubricaCore={State:{getDatabase:()=>({bearingOverrides:[],componentLibraryEntries:[]})}};
function load(f){vm.runInThisContext(fs.readFileSync(ROOT+'/'+f,'utf8'),{filename:f});}
for(const f of ['bearings/catalog-data.js','bearings/multi-oem-data.js','bearings/fleet-gap-data.js','bearings/library.js','bearings/calculator.js'])load(f);
const standard=['N 216 E.M1.C3','23234 CCK/W33','62305-2RS','2211 ETN9','2213','29317 E','32016 X/Q','33016 Q','51112','6015-2RS1','6016-2RS1','21313 СС','2204 E','32024 X','33108-2С','51105','51106','6013','6013-2RS1','6018-2RS1','6024-2RS1'];
const units=['CM-UCFC 208','SY 50 TF','SY 40 TF','TU 30 TF','SY 30 TF','SY 20 TF','SYF 40 TF','SY 45 TF','SYF 45 WF','UCPA 208','FYTB 30 TF','FY 40 TF','SYF 30 TF','UKF 209','UKP 205','FY 20 TF','FY 30 TF','FYC 25 TF','SY 60 TF','SYT 75 F','SYT 75 L','UKP 211','UKFL 209','FY 45 TF','FYC 30 TF','FYTB 45 TF','P 25 TF','SY 30 FM','SYF 20 TF','UCFC 214','UCFL 202','UCPA 209','UKF 207','FY 25 TF','SY 25 TF','UKFL 210','UKP 206','UKP 209'];
const special=['YAR 206-2F','GEH 35ES-2RS','KRE 40 PP','KR 40 PP'];
for(const n of [...standard,...units,...special]){const r=LubricaBearings.lookup('Подшипник '+n+' Линия №1');assert(r.record,`missing ${n}`);assert(r.parsed.recognized,`not recognized ${n}`);}
let r=LubricaBearings.lookup('N 216 E.M1.C3');assert.deepStrictEqual([r.record.d,r.record.D,r.record.B,r.record.bearingType],[80,140,26,'cylindrical_roller']);
r=LubricaBearings.lookup('23234 CCK/W33');assert.deepStrictEqual([r.record.d,r.record.D,r.record.B,r.record.bearingType],[170,310,110,'spherical_roller']);
r=LubricaBearings.lookup('6015-2RS1');assert.strictEqual(r.record.designation,'6015-2RS1');assert.strictEqual(r.parsed.sealingCode,'2RS1');
r=LubricaBearings.lookup('33108-2С');assert.strictEqual(r.record.designation,'33108-2C');
r=LubricaBearings.lookup('SY 50 TF');assert.deepStrictEqual([r.record.d,r.record.D,r.record.B,r.record.insertDesignation],[50,90,51.6,'YAR210-2F']);
r=LubricaBearings.lookup('UKP 211');assert.deepStrictEqual([r.record.d,r.record.D,r.record.B,r.record.adapterSleeve],[50,100,59,'H2311']);
r=LubricaBearings.lookup('SYT 75 F');assert.strictEqual(r.record.bearingType,'roller_bearing_unit');assert.strictEqual(LubricaBearingOEM.housedUnitCode('SYT 75 F'),null);
for(const [n,code] of [['SY 50 TF','210'],['SYF 40 TF','208'],['FYTB 30 TF','206'],['FYC 25 TF','205'],['TU 30 TF','206'],['P 25 TF','205'],['SY 30 FM','206'],['SYF 45 WF','209']])assert.strictEqual(LubricaBearingOEM.housedUnitCode(n),code,n);
for(const n of special){const x=LubricaBearings.lookup(n).record;assert(x);}
for(const n of ['YAR 206-2F','GEH 35ES-2RS','KR 40 PP','KRE 40 PP','SYT 75 F']){const x=LubricaBearings.lookup(n).record,q=LubricaBearingCalculator.relubeQuantity({designation:x.designation,bearingType:x.bearingType,d:x.d,D:x.D,B:x.B,rpm:1000,temperatureC:60}),i=LubricaBearingCalculator.adjustedInterval({designation:x.designation,bearingType:x.bearingType,d:x.d,D:x.D,B:x.B,rpm:1000,temperatureC:60});assert(q.blocked,`${n} generic dose must be blocked`);assert(i.blocked,`${n} generic interval must be blocked`);}
// Linear-motion fleet identifiers belong to the Component Library, not LubricaBearings.
load('components/starter-data.js');load('components/fleet-linear-motion-data.js');load('components/registry.js');load('components/starter-adapter.js');load('components/matcher.js');
const linear=['KUE 25 H W2 G4 V0/880-20/20','KUE 25 H W2 G4 V0/2760-30/30','KWVE 55 B G3 V1','LUND 40-2LS','LSNS 40','LQCD 20-2LS','KBE50UU','BRTF20-L','KTN-40-B-PP-AS','OGA-01-25','KGNO-50-B-PP-AS','LTCD 25-2LS','CSW43-190-2Z-K','CSW43-190-2Z-U','SBG25FLL-K1+MF','SBG25SLL-K1+MF','BRTF30-L'];
for(const n of linear){const m=LubricaComponentMatcher.best('Подшипник линейный '+n,'linear_bearing');assert(m.entry&&m.confidence>=.95,`linear fleet id missing ${n}`);assert.strictEqual(m.entry.technicalData?.subtype,'other');}
console.log(`PASS 1.0.33.54 fleet bearing library: ${standard.length} rolling + ${units.length} housed + ${special.length} special + ${linear.length} linear-motion identifiers`);
