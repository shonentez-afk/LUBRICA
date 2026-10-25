const fs=require('fs');
const s=fs.readFileSync('import/candidate-finalizer.js','utf8');
function ok(v,m){if(!v)throw new Error(m)}
const refresh=s.indexOf("rebuild conveyor evidence every time the constructor opens");
const template=s.indexOf("const template=source==='equipment'?record.maintenanceTemplate:record.candidateTemplate;", refresh);
const specs=s.indexOf('const specs=specsFor(record,source);', refresh);
ok(refresh>=0,'live conveyor refresh missing');
ok(s.includes('LubricaClassifier?.conveyorEvidence?.(database,equipment)'), 'live conveyorEvidence call missing');
ok(template>refresh && specs>template,'template/specs must be built after live refresh');
ok(s.includes("record.maintenanceTemplate={...(record.maintenanceTemplate||{}),id:'conveyor_arrangement'"),'stale template replacement missing');
ok(s.includes("подшипниковые точки: 4 (2 вала × 2 опоры)"),'four-support summary missing');
console.log('PASS 1.0.33.17 conveyor constructor live template refresh');
