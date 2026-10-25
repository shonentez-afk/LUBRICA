const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');

// 1) Real binding lifecycle: stale automatic UNIT DRIVE result must be fully invalidated and rebound to SEW R97.
const database={componentLibraryEntries:[],equipment:[{id:'EQ-000480',name:'Конвейер ленточный с вертикальными регулирующими валами'}],components:[
 {id:'COMP-0001583',equipmentId:'EQ-000480',manufacturer:'SEW EURODRIVE',name:'Мотор-редуктор R97 DRE132M4/TF/ES7C/V i=25,03'}
],lubricationPoints:[{
 id:'LP-000213',equipmentId:'EQ-000480',category:'gearbox_oil',
 componentBinding:{sourceComponentId:'COMP-0001583',sourceEquipmentId:'EQ-000480',libraryCategory:'gearbox_oil',libraryEntryId:'STD-GBX-UNITDRIVE-UDPC080',actualLibraryEntryId:null,matchStatus:'suggested',matchConfidence:.86,matchReason:'legacy fuzzy',structuralText:'SEW EURODRIVE Мотор-редуктор R97 DRE132M4/TF/ES7C/V i=25,03 10108061 Конвейер ленточный с вертикальными регулирующими валами'},
 linkedTechnicalData:{gearboxType:'Цилиндрическая предступень',series:'UD-PC',size:'080',fixedFillLiters:.15,oilVolumeIndependentOfMountingPosition:true},
 linkedLubricationData:{recommendedOil:{isoViscosity:'VG320'},fillPolicy:'catalog_fixed'},
 gearboxOil:{manufacturer:'UNIT DRIVE / ООО ПТЦ «Привод»',model:'UD-PC080',mountingPosition:'',calculation:{calculationVersion:'8.9',manufacturer:'UNIT DRIVE / ООО ПТЦ «Привод»',model:'UD-PC080',fillSource:'ООО ПТЦ «Привод» / UNIT DRIVE — legacy',viscosityGrade:'ISO VG320',oemFillLiters:.15,approvedFillLiters:.15,effectiveFillLiters:.15,appliedFillLiters:.15,oilBaseType:'auto',intervalMode:'auto',lubricationMethod:'splash',oilCondition:'unknown',leakage:'no',temperatureClass:'le65',provenance:{sourceId:'UNIT-DRIVE-WORM'},calculationContext:{family:'UNIT_DRIVE'},methodPlan:{fill:'UNIT_DRIVE_OEM_FILL'},calculationPackage:{packageVersion:'1.0.33.39'}}},
 calculations:{'gearbox-oil':{moduleId:'gearbox-oil',status:'calculated',approved:true,source:'ООО ПТЦ «Привод» / UNIT DRIVE — legacy'}}
}],tasks:[{
 id:'TASK-000263',lubricationPointId:'LP-000213',activityType:'oil_change',operation:'Замена масла',materialMode:'explicit',materialName:'Масло редукторное Mobilgear 600 XP 220',materialId:'MAT-0003',toolId:'TOOL-0005',
 quantity:{approved:'0.15',unit:'л',calculated:.15,calculatedGrams:null,calculatedStrokes:null,source:'ООО ПТЦ «Привод» / UNIT DRIVE — legacy'},
 schedule:{legacyText:'',strategy:'По календарю',calculatedHours:null,source:''},approvalStatus:'review',verified:false
}]};
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase(){return database}}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding;
const rec=B.reconcileDatabase(database);assert(rec.changed>=1);
const lp=database.lubricationPoints[0],task=database.tasks[0];
assert.equal(lp.componentBinding.libraryEntryId,'STD-GBX-SEW-R97');
assert.equal(lp.componentBinding.matchStatus,'matched');
assert.equal(lp.gearboxOil.manufacturer,'SEW-EURODRIVE');
assert.equal(lp.gearboxOil.model,'R97');
assert.equal(lp.linkedTechnicalData.family,'R97');
assert.notEqual(lp.linkedTechnicalData.series,'UD-PC');
assert.equal(lp.gearboxOil.calculation.oemFillLiters,null,'stale OEM fill must not survive approvedFillLiters');
assert.ok(!('approvedFillLiters' in lp.gearboxOil.calculation),'stale approved fill must be removed');
assert.ok(!('calculationPackage' in lp.gearboxOil.calculation),'stale calculation package must be removed');
assert.ok(!lp.calculations['gearbox-oil'],'stale point calculation summary must be invalidated');
assert.equal(task.quantity.approved,'','stale approved task quantity must be cleared');
assert.equal(task.quantity.calculated,null,'stale calculated task quantity must be cleared');
assert.equal(task.quantity.source,'','stale task source must be cleared');
assert.equal(task.materialId,'MAT-0003','material selection must be preserved');
assert.equal(task.toolId,'TOOL-0005','tool selection must be preserved');

// 2) Manual actual binding is authoritative and must not be auto-migrated.
const manual={id:'LP-MAN',equipmentId:'EQ-000480',category:'gearbox_oil',componentBinding:{sourceComponentId:'COMP-0001583',libraryCategory:'gearbox_oil',libraryEntryId:'STD-GBX-UNITDRIVE-UDPC080',actualLibraryEntryId:'STD-GBX-UNITDRIVE-UDPC080',structuralText:'SEW EURODRIVE R97'},gearboxOil:{manufacturer:'UNIT DRIVE / ООО ПТЦ «Привод»',model:'UD-PC080',calculation:{approvedFillLiters:.15,oemFillLiters:.15}}};
database.lubricationPoints.push(manual);B.reconcileDatabase(database);assert.equal(manual.componentBinding.actualLibraryEntryId,'STD-GBX-UNITDRIVE-UDPC080');assert.equal(manual.componentBinding.libraryEntryId,'STD-GBX-UNITDRIVE-UDPC080');

// 3) State activation must reconcile before recovery persistence and first UI state conversion.
const order=[];const w2={window:null,console,CustomEvent:function(){},dispatchEvent(){},LubricaComponentBinding:{reconcileDatabase(db){order.push('reconcile');db.reconciled=true;return{changed:1}}},LubricaCore:{Database:{normalize(x){order.push('normalize');return x},toLegacy(x){order.push('toLegacy');assert(x.reconciled,'reconcile must happen before toLegacy');return{points:[]}},fromLegacy(x){return x},syncLegacy(a,b){return b}},Storage:{saveRecovery(db){order.push('saveRecovery');assert(db.reconciled,'reconcile must happen before recovery save')},loadRecovery(){return null}}}};w2.window=w2;
const c2={window:w2,console,CustomEvent:w2.CustomEvent};vm.createContext(c2);vm.runInContext(fs.readFileSync(path.join(root,'core/state.js'),'utf8'),c2,{filename:'core/state.js'});
w2.LubricaCore.State.activateDatabase({x:1},'json');assert.deepEqual(order.slice(0,4),['normalize','reconcile','saveRecovery','toLegacy']);

// 4) Point card must rehydrate before rendering the displayed library entry.
const te=fs.readFileSync(path.join(root,'lubrication/task-editor.js'),'utf8');
const fillStart=te.indexOf('function fillDetailImpl()');const ensureAt=te.indexOf('ensurePointTechnical?.(lp)',fillStart);const bindingAt=te.indexOf('const binding=lp.componentBinding||{}',fillStart);assert(fillStart>=0&&ensureAt>fillStart&&bindingAt>ensureAt,'point card must reconcile binding before displaying Справочник');
console.log('PASS 1.0.33.58 persisted gearbox binding migration + task invalidation + activate lifecycle');
