const fs=require('fs'),vm=require('vm'),assert=require('assert');
const w={LubricaSystem:{registerModule(){}}};w.window=w;const s={window:w,console};vm.createContext(s);vm.runInContext(fs.readFileSync('motors/motor-oem-data.js','utf8'),s);
const raw=JSON.parse(fs.readFileSync('test/actual_components.json','utf8'));const items=Array.isArray(raw)?raw:raw.components||[];const motors=items.filter(x=>/электродвиг|вибромотор/i.test(x.name||''));assert.equal(motors.length,240);
const counts={};for(const x of motors){const p=w.LubricaMotorOEM.resolve(x.name);counts[p.manufacturer]=(counts[p.manufacturer]||0)+1;}
assert.equal(counts.ABB,127);assert.equal(counts.OLI,24);assert.equal(counts['SEW-EURODRIVE'],5);assert.equal(counts['SIEMENS/INNOMOTICS'],13);assert.equal(counts.EMOD,16);
console.log('Motor Structure Inventory: PASS',JSON.stringify(counts));
