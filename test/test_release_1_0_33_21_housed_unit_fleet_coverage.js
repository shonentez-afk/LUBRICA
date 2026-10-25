const assert=require('assert');
global.window=global;
global.LubricaCore={State:{getDatabase:()=>({bearingOverrides:[]})}};
global.LubricaSystem={registerModule:()=>{}};
require('../bearings/catalog-data.js');
require('../bearings/library.js');
const B=global.LubricaBearings;
const cases=[
 ['Узел подшипниковый UCPA 210 Линия №2','UCPA210'],
 ['Узел подшипниковый UKHA 212 Линия №2','UKHA212'],
 ['Узел подшипниковый UKF 212 Линия №2','UKF212'],
 ['Узел подшипниковый UKF 216 Линия №1','UKF216'],
 ['Узел подшипниковый UKFC 211 Линия №1','UKFC211'],
 ['Узел подшипниковый UKFC 211D Линия №2','UKFC211'],
 ['Узел подшипниковый UKFC 215 Линия №1','UKFC215'],
 ['Узел подшипниковый UKFC 215D Линия №2','UKFC215'],
 ['Узел подшипниковый UKFL 205 Линия №1','UKFL205'],
 ['Узел подшипниковый FY 50 TF Линия №1','FY50TF'],
 ['Узел подшипниковый FY 50 TR Линия №2','FY50TR'],
 ['Узел подшипниковый FYTB 20 TF','FYTB20TF'],
 ['Узел подшипниковый UCFC 208 (LK)','UCFC208'],
 ['Узел подшипниковый UCP 212','UCP212'],
 ['Узел подшипниковый UCP 216','UCP216'],
 ['Узел подшипниковый UCP 320','UCP320'],
 ['Узел подшипниковый UCT 210','UCT210']
];
for(const [raw,expected] of cases){
 const r=B.lookup(raw);
 assert(r.parsed.recognized,raw+' must resolve in built-in library');
 assert.equal(r.parsed.baseDesignation,expected,raw+' normalized designation');
 assert.equal(r.record.bearingType,'bearing_unit',raw+' bearing_unit');
}
assert.equal(B.lookup('UKFC 211D').parsed.unitVariant,'closed_end_cover','UKFC D suffix must be preserved as cover execution while using base unit');
console.log('RELEASE 1.0.33.21 HOUSED UNIT FLEET COVERAGE PASS');
