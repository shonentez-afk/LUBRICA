
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const catalog=[
 {id:'BRG-6205',category:'bearing',designation:'6205',manufacturer:'SKF',technicalData:{d:25,D:52,B:15,bearingType:'deep_groove_ball'},sourceType:'builtin'},
 {id:'STD-CHN-12B-2',category:'chain',designation:'12B-2',manufacturer:'Renold',technicalData:{chainType:'Роликовая приводная',pitchMm:19.05,strandCount:2},sourceType:'builtin'},
 {id:'STD-GBX-RX77',category:'gearbox_oil',designation:'RX77',model:'RX77',manufacturer:'SEW-EURODRIVE',technicalData:{mountingFillLiters:{M1:1.1,M2:1.5}},sourceReference:'SEW manual',sourceType:'builtin'},
 {id:'STD-BS-JPF1605',category:'ball_screw',designation:'JPF1605-4',model:'JPF1605-4',manufacturer:'THK',technicalData:{diameterMm:16,leadMm:5},sourceType:'builtin'}
];
const database={
 equipment:[{id:'EQ-1',name:'Привод SEW RX77',externalCode:'1001'}],
 components:[
  {id:'CMP-1',equipmentId:'EQ-1',name:'Цепь роликовая 12B-2',externalCode:'2001'},
  {id:'CMP-2',equipmentId:'EQ-1',name:'Подшипник SKF 6205-2RS',externalCode:'2002'}
 ],
 lubricationPoints:[]
};
const window={
 LubricaSystem:{registerModule(){}},
 LubricaCore:{State:{getDatabase:()=>database}},
 LubricaComponents:{all:(cat='all')=>cat==='all'?catalog:catalog.filter(x=>x.category===cat)},
 LubricaBearings:{lookup:q=>{
   const ok=String(q).includes('6205');
   return {record:ok?catalog[0]:null,sourceType:ok?'builtin':'none',parsed:{baseDesignation:ok?'6205':'',recognized:ok,dimensions:ok?{d:25,D:52,B:15}:null,inferredType:'deep_groove_ball',sealing:'sealed',sealingCode:'2RS'}};
 }}
};
window.window=window;
const ctx={window,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'components/binding.js'),'utf8'),ctx);
const B=window.LubricaComponentBinding;
const a=(x,m)=>{if(!x)throw new Error(m)};

a(B.libraryCategory('screw')==='screw_drive','screw alias');
a(B.libraryCategory('rope')==='wire_rope','rope alias');

let r=B.resolve('Цепь роликовая 12B-2','chain');
a(r.status==='matched'&&r.entry.id==='STD-CHN-12B-2','chain match');

const chainPoint={id:'LP-1',equipmentId:'EQ-1',category:'chain',name:'Цепь'};
B.bindPoint(chainPoint,{sourceComponent:database.components[0],equipment:database.equipment[0]});
a(chainPoint.componentBinding.sourceComponentId==='CMP-1','source component binding');
a(chainPoint.componentBinding.libraryEntryId==='STD-CHN-12B-2','library binding');
a(chainPoint.chain.pitchMm===19.05&&chainPoint.chain.strandCount===2,'chain autofill');

const bearingPoint={id:'LP-2',equipmentId:'EQ-1',category:'bearing',name:'Подшипник',candidateOriginKey:'component:CMP-2:component'};
database.lubricationPoints.push(chainPoint,bearingPoint);
const rec=B.reconcileDatabase(database);
a(bearingPoint.componentBinding.sourceComponentId==='CMP-2','reconcile source component');
a(bearingPoint.componentBinding.libraryEntryId==='BRG-6205','reconcile bearing library');
a(bearingPoint.bearing.d===25&&bearingPoint.bearing.D===52,'bearing dimensions inherited');

const gearboxPoint={id:'LP-3',equipmentId:'EQ-1',category:'gearbox_oil',name:'Редуктор',gearboxOil:{mountingPosition:'M1'}};
B.bindPoint(gearboxPoint,{equipment:database.equipment[0]});
a(gearboxPoint.componentBinding.libraryEntryId==='STD-GBX-RX77','equipment-level gearbox match');
a(gearboxPoint.gearboxOil.calculation.oemFillLiters===1.1,'gearbox OEM M1 autofill');

a(B.linkedPointForComponent('CMP-1',null,database).id==='LP-1','duplicate source component detection');

// Regression: manually selected bearing catalog entry must populate point dimensions even without source component.
const manualBearing={id:'LP-4',equipmentId:'EQ-1',category:'bearing',name:'Подшипник вручную'};
B.setLibraryEntry(manualBearing,'BRG-6205',{actual:false});
a(manualBearing.bearing.structuralDesignation==='6205','manual bearing designation transfer');
a(manualBearing.bearing.d===25&&manualBearing.bearing.D===52&&manualBearing.bearing.B===15,'manual bearing dimensions transfer');
// Regression: linked data must be restored if a legacy/other UI path lost technical fields.
manualBearing.bearing.d=null;manualBearing.bearing.D=null;manualBearing.bearing.B=null;
B.ensurePointTechnical(manualBearing);
a(manualBearing.bearing.d===25&&manualBearing.bearing.D===52&&manualBearing.bearing.B===15,'linked bearing technical rehydration');
// All implemented catalog-backed categories must transfer their known reference fields.
const ball={id:'LP-5',category:'ball_screw',equipmentId:'EQ-1'};B.setLibraryEntry(ball,'STD-BS-JPF1605');
a(ball.ballScrew.screwDiameterMm===16&&ball.ballScrew.leadMm===5,'ball screw transfer');

console.log('COMPONENT BINDING TEST PASS');
const customActual={id:'CUSTOM-CHAIN',category:'chain',designation:'12B-2 CUSTOM',manufacturer:'Plant verified',technicalData:{chainType:'Роликовая приводная',pitchMm:20,strandCount:3},sourceType:'custom'};catalog.push(customActual);B.setLibraryEntry(chainPoint,'CUSTOM-CHAIN',{actual:true});a(chainPoint.componentBinding.actualLibraryEntryId==='CUSTOM-CHAIN','actual installed catalog link');a(chainPoint.chain.pitchMm===20&&chainPoint.chain.strandCount===3,'actual installed data has priority');
