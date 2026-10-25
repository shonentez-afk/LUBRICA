const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/gearbox-oem-data-1.0.33.60.js','components/gearbox-oem-data-1.0.33.61.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding, all=window.LubricaComponents.all('gearbox_oil');
const by=id=>all.find(x=>x.id===id);
assert.equal(window.LubricaGearboxOemDatasetVersion,'1.0.33.61-bonfiglioli-legacy-fill');
const fill=(id,pos)=>by(id)?.technicalData?.mountingFillLiters?.[pos];

// Legacy Bonfiglioli A-series tables.
assert.equal(fill('STD-GBX-BONF-A-20-2-UH30-29-2-P90-VB','VB'),2.3);
assert.equal(fill('STD-GBX-BONF-A-41-2-NH-7-1-P132-B3','B3'),3.8);
assert.equal(fill('STD-GBX-BONF-A412-UH45-11_7-P112-B3','B3'),3.8);
assert.equal(fill('STD-GBX-BONF-A-41-2-UH45-45-1-P100-B3','B3'),3.8);
assert.equal(fill('STD-GBX-BONF-A413-NR-92_8-P100-B3','B3'),4.6);
assert.equal(fill('STD-GBX-BONF-A503-NR-81_5-P100-B3','B3'),5.1);
assert.equal(fill('STD-GBX-BONF-A503-NR-81_5-P100-B3','VA'),11.0);
assert.equal(fill('STD-GBX-BONF-A503-NR-81_5-P100-B3','VB'),9.2);
// B5 is not a legacy A-series mounting position: do not invent a value.
assert.equal(fill('STD-GBX-BONF-A-41-2-NR-28-3-P112-B5','B5'),undefined);
assert.equal(by('STD-GBX-BONF-A-41-2-NR-28-3-P112-B5').technicalData.fillVerificationRequired,true);

// Legacy Bonfiglioli C-series tables.
assert.equal(fill('STD-GBX-BONF-C-31-2-P-15-6-P100-B7','B7'),1.4);
assert.equal(fill('STD-GBX-BONF-C-31-2-P-22-6-P90-B8','B8'),1.4);
assert.equal(fill('STD-GBX-BONF-C412-P-25-P100-B3','B3'),2.2);
assert.equal(fill('STD-GBX-BONF-C-41-2-P-9-6-P100-B7','B7'),2.1);
assert.equal(fill('STD-GBX-BONF-C-41-2-P-15-8-P100-B7','B7'),2.1);
assert.equal(fill('STD-GBX-BONF-C412-P-31_4-P100-B6','B6'),2.0);
assert.equal(fill('STD-GBX-BONF-C-41-3-P-31-2-P100-B6','B6'),1.9);
assert.equal(fill('STD-GBX-BONF-C412-UFB-9_6-P100-B5','B5'),2.2);
assert.equal(fill('STD-GBX-BONF-C412-U-11_2-P112-B5','B5'),2.2);
assert.equal(fill('STD-GBX-BONF-C-51-2-P-23-4-P132-B6','B6'),3.0);
assert.equal(fill('STD-GBX-BONF-C-51-3-P-93-P90-B3','B3'),3.0);
assert.equal(fill('STD-GBX-BONF-C-61-2-P-10-9-P132-B3','B3'),4.2);
assert.equal(fill('STD-GBX-BONF-F603-H60-32_1-P132-H1','H1'),14.0);

// Resolver must now expose available fill for the exact problem case.
let r=B.resolve('BONFIGLIOLI Редуктор C412/P 1:25 B3 PAM 100','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-BONF-C412-P-25-P100-B3');
assert.equal(r.entry.technicalData.fillVerificationRequired,false);
assert.equal(r.entry.technicalData.legacyReferenceFill,true);
assert.equal(r.entry.technicalData.mountingFillLiters.B3,2.2);
r=B.resolve('BONFIGLIOLI Редуктор C412/P 1:31,4 B6 PAM 100','gearbox_oil');
assert.equal(r.entry?.id,'STD-GBX-BONF-C412-P-31_4-P100-B6');
assert.equal(r.entry.technicalData.mountingFillLiters.B6,2.0);
assert.equal(r.entry.technicalData.technicalSupportRequired,false);

// Persisted obsolete auto fill is invalidated so the new reference is shown, not the stale applied value.
const db={equipment:[{id:'EQ-B',name:'Test'}],components:[{id:'COMP-B',equipmentId:'EQ-B',manufacturer:'BONFIGLIOLI',name:'Редуктор C412/P 1:25 B3 PAM 100'}],lubricationPoints:[{id:'LP-B',equipmentId:'EQ-B',category:'gearbox_oil',componentBinding:{sourceComponentId:'COMP-B',sourceEquipmentId:'EQ-B',libraryCategory:'gearbox_oil',libraryEntryId:'STD-GBX-BONF-C412-P-25-P100-B3',actualLibraryEntryId:null,matchStatus:'matched',matchConfidence:1,structuralText:'BONFIGLIOLI Редуктор C412/P 1:25 B3 PAM 100'},gearboxOil:{manufacturer:'BONFIGLIOLI',model:'C 41 2 P 25 P100 B3',mountingPosition:'B3',calculation:{oemFillLiters:3,approvedFillLiters:3,effectiveFillLiters:3,appliedFillLiters:3,fillSource:'ООО ПТЦ «Привод» / UNIT DRIVE — legacy wrong source',provenance:{sourceId:'BONFIGLIOLI-GEARBOX-FILL'}}},calculations:{'gearbox-oil':{status:'calculated'}}}],tasks:[{id:'TASK-B',lubricationPointId:'LP-B',activityType:'oil_change',quantity:{approved:'3',calculated:3,unit:'л',source:'UNIT DRIVE'},schedule:{},approvalStatus:'approved',verified:true}]};
B.reconcileDatabase(db);
const c=db.lubricationPoints[0].gearboxOil.calculation;
assert.equal(c.oemFillLiters,2.2);
assert.equal(c.approvedFillLiters,undefined);
assert.equal(c.effectiveFillLiters,undefined);
assert.equal(c.fillRevisionId,'bonfiglioli-legacy-1.0.33.61');
assert.equal(db.tasks[0].quantity.approved,'');
assert.equal(db.tasks[0].quantity.calculated,null);
assert.equal(db.tasks[0].approvalStatus,'review');
assert.equal(db.tasks[0].verified,false);

console.log('PASS 1.0.33.61 legacy Bonfiglioli reference fills + stale fill migration');
