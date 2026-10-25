const fs=require('fs'),vm=require('vm');
const ctx={window:{LubricaSystem:{registerModule(){}}},console};ctx.window.window=ctx.window;vm.createContext(ctx);
for(const f of ['bearings/multi-oem-data.js','bearings/offline-evidence.js','bearings/source-registry.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const O=ctx.window.LubricaBearingOEM,S=ctx.window.LubricaBearingSources,E=ctx.window.LubricaOfflineEvidence;
function ok(x,m){if(!x)throw new Error(m)}
ok(S.getById('REITZ-KXE-SINGLE'),'REITZ single source missing');ok(S.getById('REITZ-KXE-ZLG'),'REITZ ZLG source missing');ok(S.getById('NTN-ZLG-2024'),'NTN ZLG source missing');
ok(O.sourceRefs.REITZ_KXE_SINGLE.sourceId==='REITZ-KXE-SINGLE','sourceId bridge missing');ok(O.sourceRefs.SKF_SNL.datasetId==='SKF-SNL-HOUSING-V1','SKF dataset bridge missing');
const r=E.get('REITZ-KXE-SINGLE-V1').rows.find(x=>x.bearing==='22222K');ok(r&&r.relubeG===100&&r.newFillG===1100&&r.h1500===460,'REITZ baseline changed');
const z=E.get('REITZ-KXE-ZLG-AAAK-V1').rows.find(x=>x.code==='316');ok(z&&z.relubeG===96&&z.h3000===2760,'REITZ ZLG baseline changed');
const n=E.get('NTN-SNR-ZLG-2024-V1').rows.find(x=>x.code==='316');ok(n&&n.relubeVolumeCm3===227&&n.baselineIntervalHours===3000,'NTN ZLG offline row missing');
const snl=E.get('SKF-SNL-HOUSING-V1').rows.find(x=>x.code==='522-619');ok(snl&&snl.fill20G===530&&snl.fill40G===850,'SKF SNL baseline changed');
ok(S.getById('REITZ-KXE-SINGLE').supports.renewalInterval===false,'REITZ evidence scope wrong');
console.log('OK 1.0.31.2 source registry + offline evidence');
