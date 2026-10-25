const fs=require('fs'),vm=require('vm'),assert=require('assert');
global.window=global;global.LubricaSystem={registerModule(){}};
vm.runInThisContext(fs.readFileSync('bearings/multi-oem-data.js','utf8'));
vm.runInThisContext(fs.readFileSync('bearings/calculator.js','utf8'));
const C=global.LubricaBearingCalculator;
let r=C.calculate({designation:'23230',d:150,D:270,B:96,bearingType:'spherical_roller',manufacturer:'auto',rpm:300,temperatureC:70,housingFamily:'SNL',housingMarking:'SNL 530',snlFeedMethod:'side',snlServiceMode:'skf_snl'});
assert.equal(r.maintenancePolicy.id,'skf_snl_side_service');assert.equal(r.fullRenewal.value,1700);assert.ok(r.renewalInterval.value>0);
r=C.calculate({designation:'23230',d:150,D:270,B:96,bearingType:'spherical_roller',manufacturer:'auto',rpm:300,temperatureC:70,housingFamily:'SNL',housingMarking:'SNL 530',snlFeedMethod:'groove',snlServiceMode:'skf_snl'});
assert.equal(r.maintenancePolicy.id,'skf_snl_groove_service');assert.equal(r.maintenancePolicy.fullRenewal,true);assert.equal(r.fullRenewal.value,1100);assert.equal(r.fullRenewalLifecycleState,'CONDITION_BASED');assert.equal(r.renewalInterval.conditionBased,true);

r=C.calculate({designation:'UCP212',d:60,D:110,B:65,bearingType:'bearing_unit',manufacturer:'auto',rpm:300,temperatureC:70});
assert.equal(r.maintenancePolicy.id,'housed_relube_only');assert.equal(r.maintenancePolicy.fullRenewal,false);
r=C.calculate({designation:'23230',d:150,D:270,B:96,bearingType:'spherical_roller',manufacturer:'auto',rpm:300,temperatureC:70,bearingMassKg:14,greaseDensity:0.9});
assert.equal(r.maintenancePolicy.id,'standard_serviceable_bearing');assert.equal(r.maintenancePolicy.fullRenewal,true);

const ui=fs.readFileSync('lubrication/task-editor.js','utf8');
assert.ok(ui.includes('Вал / конвейер — SKF SNL'));assert.ok(ui.includes('fullConditionBased'));assert.ok(ui.includes('Подшипник без подтверждённого корпуса'));
console.log('PASS 1.0.33.44 unified shaft bearing support context');
