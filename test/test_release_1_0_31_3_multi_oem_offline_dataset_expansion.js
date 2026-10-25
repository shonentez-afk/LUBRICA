const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx=vm.createContext({window,console});
for(const f of ['bearings/multi-oem-data.js','bearings/offline-evidence.js','bearings/source-registry.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const E=window.LubricaOfflineEvidence,S=window.LubricaBearingSources,O=window.LubricaBearingOEM;
function ok(v,m){if(!v)throw new Error(m)}
for(const id of ['SKF-RELUBRICATION-RULES-V1','NSK-EMH-6200-V1','NSK-EMH-CYL200-V1','NSK-HOUSED-UNITS-V1','INA-SLEWING-PROCEDURE-V1','SCHAEFFLER-TPI228-RULES-V1','TIMKEN-GREASE-METHOD-V1'])ok(E.get(id),`missing ${id}`);
ok(E.get('NSK-EMH-6200-V1').rows.length===Object.keys(O.nsk6200).length,'NSK 6200 row parity');
ok(E.get('NSK-EMH-CYL200-V1').rows.length===Object.keys(O.nskCyl200).length,'NSK cyl row parity');
ok(S.getById('NSK-EMH').datasetIds.length===2,'NSK source datasets');
ok(S.getById('INA-SLEWING-TPI13').datasetIds.includes('INA-SLEWING-PROCEDURE-V1'),'VLU procedure source');
ok(O.sourceRefs.TIMKEN.sourceId==='TIMKEN-HELP','Timken sourceId must resolve registry');
ok(S.getById(O.sourceRefs.TIMKEN.sourceId),'Timken registry source missing');
console.log('PASS 1.0.31.3 Multi-OEM Offline Dataset Expansion');
