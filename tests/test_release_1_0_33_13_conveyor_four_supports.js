const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m)}
const f=fs.readFileSync('import/candidate-finalizer.js','utf8');
const c=fs.readFileSync('import/candidates.js','utf8');
ok(f.includes('conveyor_support_${support.key}'),'four physical support spec generation missing');
ok(f.includes('layout?.supports?.length===4'),'four-support layout guard missing');
ok(f.includes("['gearbox','motor_gearbox'].includes(x.equipmentType)"),'gearbox/motor-gearbox aggregate missing');
ok(f.includes("'gearbox_oil','Привод'"),'gearbox service point missing');
ok(f.includes('record.conveyorArrangement'),'arrangement persistence missing');
ok(c.includes('conveyorOwner(db,c.equipmentId)'),'candidate queue conveyor ownership guard missing');
ok(c.includes('.filter(c=>!conveyorOwner(db,c.equipmentId))'),'covered conveyor components are not hidden from common queue');
console.log('PASS 1.0.33.13 conveyor four supports + contextual candidate queue');
