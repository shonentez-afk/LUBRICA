const fs=require('fs'),vm=require('vm'),p=require('path');
const root=p.resolve(__dirname,'..');
const ctx={window:{},console};ctx.window.window=ctx.window;ctx.window.LubricaSystem={registerModule(){}};vm.createContext(ctx);
for(const f of ['components/starter-data.js','components/screw-jack-data.js','bearings/offline-evidence.js','bearings/source-registry.js']) vm.runInContext(fs.readFileSync(p.join(root,f),'utf8'),ctx,{filename:f});
const E=ctx.window.LubricaOfflineEvidence,S=ctx.window.LubricaBearingSources;
function ok(x,m){if(!x)throw new Error(m)}
ok(E.get('SEW-GEARBOX-FILL-V1').rows.length>=10,'SEW rows missing');
ok(E.get('CHAIN-B-SERIES-V1').rows.length>=10,'chain rows missing');
ok(E.get('FRANCIA-M42VR-V1').rows.length>=2,'FRANCIA split rows missing');
ok(S.getById('SEW-GEARBOX-FILL').datasetIds[0]==='SEW-GEARBOX-FILL-V1','SEW source link');
ok(S.getById('CHAIN-ISO606-RENOLD').supports.relubeQuantity===false,'chain product/method isolation');
ok(S.getById('FRANCIA-SCREW-JACK').supports.relubeInterval===false,'must not invent FRANCIA interval');
console.log('PASS 1.0.31.4 Non-Bearing Source Registry & Offline Evidence');
