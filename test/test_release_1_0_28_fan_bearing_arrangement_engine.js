const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'../fans/fan-bearing-arrangement.js'),'utf8');
const sandbox={window:{},console};vm.createContext(sandbox);vm.runInContext(code,sandbox);
const F=sandbox.window.LubricaFanBearingArrangement;
const db={components:[
 {id:'C-FAN',equipmentId:'EQ1',name:'Вентилятор центробежный E 345/71-35.407',status:'active'},
 {id:'C-MOTOR',equipmentId:'EQ1',name:'Электродвигатель M3AA 160MLC2 B3',status:'active'},
 {id:'C-VFD',equipmentId:'EQ1',name:'Преобразователь частоты VFPS1-4370PL-WP',status:'active'}
]};
const eq={id:'EQ1',externalCode:'V22011',name:'Вентилятор центробежный V22011'};
const assets=F.identifyAssets(db,eq);assert.equal(assets.fan.id,'C-FAN');assert.equal(assets.motor.id,'C-MOTOR');
assert.equal(F.normalizeFamily('SNR ZLG317AK'),'ZLG');assert.equal(F.normalizeFamily('31 T 60 L-3R 54905.07'),'TROESTER');assert.equal(F.normalizeFamily('Tröster Blocklager XYZ'),'TROESTER');assert.equal(F.defaultPortCount('ZLG'),2);assert.equal(F.defaultPortCount('TROESTER'),2);assert.equal(F.defaultPortCount('TROESTER_31_33_TL'),2);assert.equal(F.defaultPortCount('SNL'),null);
let a={id:'A1',driveType:'DIRECT_MOTOR_SHAFT',directOnMotorShaft:true,bearingArrangementType:'NO_SEPARATE_FAN_BEARINGS',housings:[]};assert.equal(F.readiness(a).code,'NO_SEPARATE_FAN_BEARINGS');assert.equal(F.buildPortSpecs(a).length,0);
a={id:'A2',driveType:'COUPLING_DRIVE',directOnMotorShaft:false,bearingArrangementType:'MULTI_BEARING_BLOCK',housings:[{id:'H1',family:'ZLG',rawMarking:'ZLG317AK',position:'NOT_APPLICABLE',lubricationPortCount:2,internalBearings:[],lubricationZones:[{id:'H1:ZONE:1',portIndex:1,internalBearings:[]},{id:'H1:ZONE:2',portIndex:2,internalBearings:[]}]}]};
let specs=F.buildPortSpecs(a);assert.equal(specs.length,2);assert.ok(specs[0].name.includes('ZLG317AK'));assert.ok(!specs[0].name.includes('стороны')); assert.equal(specs[0].fanLubrication.portCount,2);assert.equal(F.readiness(a).code,'NEEDS_CLARIFICATION');assert.ok(F.readiness(a).missing[0].includes('внутренних'));
a.housings[0].internalBearings=['6317 C3','NU 317'];assert.equal(F.readiness(a).code,'NEEDS_CLARIFICATION');a.housings[0].lubricationZones[0].internalBearings=['6317 C3'];a.housings[0].lubricationZones[1].internalBearings=['NU 317'];assert.equal(F.readiness(a).code,'OEM_METHOD_UNRESOLVED');specs=F.buildPortSpecs(a);assert.deepEqual(Array.from(specs[0].fanLubrication.internalBearings),['6317 C3']);
console.log('PASS 1.0.28 Fan Bearing Arrangement Engine');
