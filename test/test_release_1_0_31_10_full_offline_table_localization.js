const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}}};window.window=window;window.open=()=>{};
const sb={window,console};vm.createContext(sb);
for(const f of ['components/starter-data.js','components/screw-jack-data.js','bearings/multi-oem-data.js','bearings/offline-evidence.js','bearings/source-registry.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sb,{filename:f});
const E=window.LubricaOfflineEvidence,S=window.LubricaBearingSources;
function ok(v,m){if(!v)throw new Error(m)}
const required=['REITZ-KXE-SINGLE-V1','REITZ-KXE-ZLG-AAAK-V1','REITZ-KXE-ZLG-AC-V1','REITZ-KXE-TEMPERATURE-V1','SKF-SNL-HOUSING-V1','SKF-RELUBRICATION-RULES-V1','NTN-SNR-ZLG-2024-V1','NTN-HOUSED-RELUBE-V1','NSK-EMH-6200-V1','NSK-EMH-CYL200-V1','NSK-LOAD-CORRECTION-V1','NSK-FILL-GUIDANCE-V1','NTN-CONDITION-CORRECTION-V1','SEW-GEARBOX-FILL-V1','SEW-GEARBOX-MAINTENANCE-V1','CHAIN-B-SERIES-V1','FRANCIA-M42VR-V1','UNIT-DRIVE-WORM-V1','THK-BALL-SCREW-JPF-V1','THK-LINEAR-BEARING-V1','FALK-REXNORD-COUPLING-GREASE-V1'];
for(const id of required){const d=E.get(id);ok(d,`missing ${id}`);ok(Array.isArray(d.rows)&&d.rows.length,`empty ${id}`)}
for(const id of ['THK-BALL-SCREW-JPF','THK-LINEAR-BEARING','FALK-REXNORD-COUPLING'])ok(S.getById(id),`missing source ${id}`);
const audit=E.auditCoverage();ok(audit.ok,JSON.stringify(audit));
ok(E.get('THK-BALL-SCREW-JPF-V1').rows.length===11,'THK JPF coverage changed');
ok(E.get('FALK-REXNORD-COUPLING-GREASE-V1').rows.length===8,'Falk/Rexnord coverage changed');
ok(E.get('NTN-HOUSED-RELUBE-V1').rows.some(r=>r.code==='212'&&r.relubeG===8.5),'NTN 212 relube row missing');
ok(E.get('REITZ-KXE-TEMPERATURE-V1').rows.some(r=>r.temperatureC===90&&r.factor===0.55),'REITZ temp factor missing');
console.log('PASS 1.0.31.10 full offline table localization + source integrity');
