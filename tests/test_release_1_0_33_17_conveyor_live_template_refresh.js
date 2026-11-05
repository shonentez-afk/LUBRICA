// Legacy regression adapted for Stage 5B: live data is recomputed on opening,
// but the database is not mutated until the engineer confirms the changes.
const fs=require('fs');
const s=fs.readFileSync('import/candidate-finalizer.js','utf8');
function ok(v,m){if(!v)throw new Error(m)}
const refresh=s.indexOf('Stage 5B: opening a constructor is read-only');
const template=s.indexOf("const template=source==='equipment'?previewRecord.maintenanceTemplate:previewRecord.candidateTemplate;",refresh);
const specs=s.indexOf('const specs=specsFor(previewRecord,source);',refresh);
ok(refresh>=0,'live conveyor read-only refresh missing');
ok(s.includes('LubricaClassifier?.conveyorEvidence?.(database,equipment)'), 'live conveyorEvidence call missing');
ok(template>refresh && specs>template,'template/specs must be computed after live evidence refresh');
ok(s.includes("previewRecord={...record,maintenanceEquipmentType:'conveyor'"),'read-only rendering snapshot missing');
ok(!s.includes("record.maintenanceTemplate={...(record.maintenanceTemplate||{}),id:'conveyor_arrangement'"), 'must not modify persisted equipment merely by opening constructor');
ok(s.includes('four places')||s.includes('4 места'),'four-support suggestion remains evidence-driven');
console.log('PASS conveyor constructor: live evidence refresh with read-only preview');
