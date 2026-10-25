const assert=require('assert');
global.window=global;global.LubricaSystem={registerModule(){}};
require('../bearings/multi-oem-data.js');
require('../bearings/calculator.js');
const C=global.LubricaBearingCalculator;
const cases=[
 ['UCPA210',50,90,51.6,4.6],
 ['UKHA212',55,110,62,8.5],
 ['UKF216',70,140,78,15.5],
 ['FY50TF',50,90,51.6,4.6],
 ['FYTB20TF',20,47,31,1.1]
];
for(const [designation,d,D,B,expected] of cases){
  const r=C.calculate({designation,d,D,B,bearingType:'bearing_unit',manufacturer:'auto',rpm:500,temperatureC:50,greaseDensity:0.9});
  assert.equal(r.maintenancePolicy.id,'housed_relube_only',designation+' policy');
  assert.equal(r.relube.selectedRule,'housed_construction_reference',designation+' Universal housed rule');
  assert.equal(r.relube.value,expected,designation+' reference dose');
  assert.equal(r.fullRenewalLifecycleState,'NOT_APPLICABLE',designation+' no automatic full renewal');
}
console.log('RELEASE 1.0.33.21 UNIVERSAL HOUSED LOGIC PASS');
