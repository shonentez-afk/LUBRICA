const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/gearbox-oem-data-1.0.33.59.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding, all=window.LubricaComponents.all('gearbox_oil');
const by=id=>all.find(x=>x.id===id);
assert.equal(window.LubricaGearboxOemDatasetVersion,'1.0.33.59-full-gearbox-audit');
// Bonfiglioli direct OEM tables.
let e=by('STD-GBX-BONF-A503-NR-81_5-P100-B3');assert(e);assert.equal(e.technicalData.mountingFillLiters.B3,6.1);assert.equal(e.technicalData.mountingFillLiters.VA,11);assert.equal(e.technicalData.mountingFillLiters.VB,7.5);assert.equal(e.technicalData.recognitionOnly,false);
assert.equal(by('STD-GBX-BONF-C-51-2-P-23-4-P132-B6').technicalData.mountingFillLiters.B6,2.9);
assert.equal(by('STD-GBX-BONF-C-51-3-P-93-P90-B3').technicalData.mountingFillLiters.B3,2.9);
assert.equal(by('STD-GBX-BONF-C-61-2-P-10-9-P132-B3').technicalData.mountingFillLiters.B3,4.1);
assert.equal(by('STD-GBX-BONF-RAN38-DA-2-B3').technicalData.mountingFillLiters.B3,3.0);
assert.equal(by('STD-GBX-BONF-MW110-U-64-B6-PAM80').technicalData.mountingFillLiters.B6,1.7);
assert.equal(by('STD-GBX-BONF-W75-U-10-PAM90').technicalData.fixedFillLiters,0.48);
// MVF parser: last mounting token wins, not motor flange token.
assert.equal(B.inferGearboxMountingPosition('MVF 44/F1 1:60 B5 B6 PAM 63'),'B6');
assert.equal(B.inferGearboxMountingPosition('MVF 86/FC 1:46 B5 B3 PAM 90'),'B3');
assert.equal(B.inferGearboxMountingPosition('MVF 30/F1 1:60 B14 B8 PAM 63'),'B8');
assert.equal(by('STD-GBX-BONF-MVF44-F1-60-B6-PAM63').technicalData.mountingFillLiters.B6,0.075);
assert.equal(by('STD-GBX-BONF-MVF44-F1-60-B6-PAM63').lubricationData.maintenancePolicy,'oem_long_life_no_periodic_change_without_basis');
// A413 must remain without A503 fill inheritance.
e=by('STD-GBX-BONF-A413-NR-92_8-P100-B3');assert(e);assert.equal(e.technicalData.mountingFillLiters?.B3,undefined);assert.equal(e.technicalData.fillVerificationRequired,true);
// SEW fleet tables and ambiguity preservation.
e=by('STD-GBX-SEW-SA47');assert.equal(e.technicalData.mountingFillLiters.M1,0.4);assert.equal(e.technicalData.recognitionOnly,false);
e=by('STD-GBX-SEW-K57');assert.equal(e.technicalData.mountingFillLiters.M1,1.3);assert.equal(e.technicalData.mountingFillLiters.M3,2.7);
e=by('STD-GBX-SEW-R97');assert.deepEqual(JSON.parse(JSON.stringify(e.technicalData.mountingFillOptionsLiters.M1)),[4.6,9.8]);
// Compound SEW remains verification-only.
e=by('STD-GBX-SEW-KF37R17');assert(e);assert.equal(e.technicalData.recognitionOnly,true);assert.equal(e.technicalData.fixedFillLiters,undefined);
// Tandler exact family additions.
e=by('STD-GBX-TANDLER-HWA1');assert(e);assert.equal(e.technicalData.fixedFillLiters,0.6);assert.equal(e.technicalData.lubricantExecutionConfirmationRequired,true);
let r=B.resolve('TANDLER Редуктор HW A1 1:1 III','gearbox_oil');assert.equal(r.entry?.id,'STD-GBX-TANDLER-HWA1');
// Wrong-domain and lifetime policies.
r=B.resolve('Редуктор угловой Z-50-SN i=7:1 ZIMM','gearbox_oil');assert.equal(r.status,'unmatched');assert.equal(r.entry,null);assert.equal(r.wrongDomain,true);assert.equal(r.serviceDomain,'screw_jack_fluid_grease');
r=B.resolve('LENZE Мотор-редуктор GKS04-3S HAR 09DC41/A','gearbox_oil');assert.equal(r.entry?.id,'STD-GBX-LENZE-GKS04');assert.equal(r.entry.lubricationData.maintenancePolicy,'lifetime_lubricated');
// Cross-OEM guard remains strict.
r=B.resolve('BONFIGLIOLI Редуктор MRV 81UO3A 1:50 B6 PAM 100','gearbox_oil');assert.equal(r.status,'unmatched');assert.equal(r.entry,null);assert(/Конфликт производителя/.test(r.reason));
r=B.resolve('SEW EURODRIVE Мотор-редуктор R97 DRE132M4/TF/ES7C/V i=25,03','gearbox_oil');assert.equal(r.entry?.id,'STD-GBX-SEW-R97');assert.equal(B.entryGearboxIdentity(r.entry).oem,'SEW-EURODRIVE');
console.log('PASS 1.0.33.59 full gearbox OEM dataset + MVF parser + domain policies + cross-OEM guard');
