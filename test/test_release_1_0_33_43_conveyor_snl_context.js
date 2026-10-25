const fs=require('fs'),vm=require('vm');
global.window=global;global.LubricaSystem={registerModule(){}};
for(const f of ['bearings/multi-oem-data.js','bearings/calculator.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const C=global.LubricaBearingCalculator;
function ok(x,m){if(!x)throw new Error(m)}
let r=C.calculate({designation:'23230',d:150,D:270,B:96,bearingType:'spherical_roller',manufacturer:'auto',rpm:300,temperatureC:70,housingFamily:'SNL',housingMarking:'SNL 530',snlFeedMethod:'side',snlServiceMode:'auto'});
ok(r.relube.value===129.6,'SNL 530 + 23230 side relube');
ok(r.fullRenewal.value===1700,'SNL 530 40% fill');
ok(r.maintenancePolicy.id==='skf_snl_side_service','SNL policy');
r=C.calculate({designation:'23220',d:100,D:180,B:60.3,bearingType:'spherical_roller',manufacturer:'auto',rpm:300,temperatureC:70,housingFamily:'SNL',housingMarking:'SNL 520-617',snlFeedMethod:'side',snlServiceMode:'auto'});
ok(r.fullRenewal.value===630,'SNL 520-617 40% fill');
const ui=fs.readFileSync('lubrication/task-editor.js','utf8');
ok(ui.includes('binding.structuralText'),'UI must resolve housing from structure binding');
ok(ui.includes('sourceComponent?.name'),'UI must inspect source structure component');
ok(ui.includes('(?:-\\d{3})?'),'compound SNL designation support');
console.log('OK 1.0.33.43 conveyor SNL housing context');
