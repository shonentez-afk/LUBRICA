const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase(){return {componentLibraryEntries:[]}}}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/starter-adapter.js','components/matcher.js']) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const M=window.LubricaComponentMatcher;
const models=[
'KA77B/DV112M4','KA57B/DT90L4','KA87B/DV132M4','KA87B/DV132S4','KA107B/DV180L4 /BMG/HP','R77DV100M4/M2/0','S77DRE90M4',
'FH67/GDRE90M4/TF i=36,3','KH77/TDRE10M4/TF i=29.27','R77DR63L6/M1','R67DRE132S4/TF i=8,7','FT127DRE180L4/TF/EG7C/V N=18,5 кВт n=1470 об/мин',
'MW75/U 1:80 B5PAM 80','MRV 50UO3A 1:25 B3 PAM 80','MRV 80UO3A 1:20 B3 PAM 100','MRV 63UO3A 1:16','MRV 50UO3A 1:15 V6 PAM 80',
'C412/UFB 1:9,6 B5 PAM 100','C412/UFB 1:11,2 B5 PAM 112','F603 H60 1:32,1 H1 PAM 132','A503/NR 1:81,5 B3 PAM 100','A413/NR 1:92,8 B3 PAM 100','A412/UH45 1:11,7 B3 PAM 112','SL3003/FS/62.5/61141201980'
];
for(const model of models){const r=M.best(model,'gearbox_oil'); assert(r.entry,`unmatched: ${model}`); assert(r.confidence>=0.86,`weak match ${model}: ${r.confidence}`)}
assert.equal(M.best('Редуктор','gearbox_oil').entry,null,'generic reducer must not be guessed');
const all=window.LubricaComponents.all('gearbox_oil');
const by=id=>all.find(x=>x.id===id);
assert.equal(by('STD-GBX-SEW-S77').technicalData.mountingFillLiters.M1,1.9);
assert.deepEqual(Array.from(by('STD-GBX-SEW-S77').technicalData.mountingFillOptionsLiters.M3),[3.7,5.4]);
assert.equal(by('STD-GBX-SEW-FH67').technicalData.mountingFillLiters.M1,2.7);
assert.equal(by('STD-GBX-SEW-FT127').technicalData.mountingFillLiters.M1,39);
assert.equal(by('STD-GBX-SEW-KH77').technicalData.mountingFillLiters.M1,2.1);
assert.equal(by('STD-GBX-BONF-A412-UH45-11_7-P112-B3').technicalData.fixedFillLiters,4.3);
assert.equal(by('STD-GBX-BONF-C412-UFB-9_6-P100-B5').technicalData.fixedFillLiters,2.4);
assert.equal(by('STD-GBX-BONF-F603-H60-32_1-P132-H1').technicalData.fixedFillLiters,14);
for(const id of ['STD-GBX-BONF-A413-NR-92_8-P100-B3','STD-GBX-BONF-A503-NR-81_5-P100-B3','STD-GBX-BONF-MRV50-25-B3','STD-GBX-BONF-MRV50-15-V6','STD-GBX-BONF-MRV80-20-B3','STD-GBX-BONF-MW75-80-B5','STD-GBX-BREVINI-SL3003-FS-62_5']){
 const e=by(id);assert(e, id);assert(!Number(e.technicalData.fixedFillLiters),`${id} must not invent fill`);assert.equal(e.technicalData.fillVerificationRequired,true);
}
const rossi=by('STD-GBX-ROSSI-MRV63-16');assert(rossi);assert.equal(rossi.manufacturer,'ROSSI');assert.equal(rossi.technicalData.mountingFillLiters.B3,0.8);
const mismatch=by('STD-GBX-BONF-C412-U-11_2-P112-B5');assert.equal(mismatch.technicalData.fixedFillLiters,2.4);assert.equal(mismatch.technicalData.executionDoesNotAffectFill,true);assert.equal(mismatch.lubricationData.fillPolicy,'catalog_fixed');
// architecture: exact Bonfiglioli fill gets OEM method, recognition-only doesn't
window.LubricaNonBearingProvenance={gearbox(entry){return String(entry?.manufacturer||'').includes('BONFIGLIOLI')?{sourceId:'BONFIGLIOLI-GEARBOX-FILL',datasetId:'BONFIGLIOLI-GEARBOX-FILL-V1',datasetVersion:'1'}:null}};
window.LubricaOfflineEvidence={bySource(id){return id==='BONFIGLIOLI-GEARBOX-FILL'?[{id:'BONFIGLIOLI-GEARBOX-FILL-V1',version:'1'}]:[]}};
vm.runInContext(fs.readFileSync(path.join(root,'calculations/gearbox-architecture.js'),'utf8'),ctx);
const A=window.LubricaGearboxArchitecture;
let c=A.buildContext({entry:by('STD-GBX-BONF-A412-UH45-11_7-P112-B3'),input:{}}),p=A.resolveMethods(c,{},{});assert.equal(c.family,'BONFIGLIOLI');assert.equal(p.fill,'BONFIGLIOLI_OEM_FILL');
c=A.buildContext({entry:by('STD-GBX-BONF-A413-NR-92_8-P100-B3'),input:{}});p=A.resolveMethods(c,{},{});assert.equal(p.fill,'UNSPECIFIED');
// unified gearbox UX
const ui=fs.readFileSync(path.join(root,'calculations/gearbox-oil-adapter.js'),'utf8');
assert(ui.includes('Рекомендация'));assert(ui.includes('data-simple-fill'));assert(ui.includes('data-simple-interval'));assert(ui.includes('Применить расчёт'));assert((ui.match(/expert-only/g)||[]).length>=3);assert(ui.includes('unifyCalculatorShell'));
const schema=fs.readFileSync(path.join(root,'core/database-schema.js'),'utf8');assert(/appVersion:'1\.0\.33\.(?:28|29|3[0-9])'/.test(schema));
console.log('PASS 1.0.33.27 gearbox fleet OEM coverage + 1.0.33.28 U/UFB fill equivalence');
