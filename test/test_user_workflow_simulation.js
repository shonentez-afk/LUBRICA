const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.resolve(__dirname,'..');
const catalog=[
 {id:'C12',category:'chain',designation:'12B-2',manufacturer:'Renold',technicalData:{chainType:'Роликовая',pitchMm:19.05,strandCount:2},sourceType:'builtin'},
 {id:'RX77',category:'gearbox_oil',designation:'RX77',manufacturer:'SEW',technicalData:{mountingFillLiters:{M1:1.1}},sourceReference:'OEM',sourceType:'builtin'}
];
const db={equipment:[{id:'E1',name:'Привод',externalCode:'100'}],components:[{id:'C1',equipmentId:'E1',name:'Цепь 12B-2',externalCode:'200'}],lubricationPoints:[]};
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase:()=>db}},LubricaComponents:{all:c=>c==='all'?catalog:catalog.filter(x=>x.category===c)}};window.window=window;const ctx={window,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'components/binding.js'),'utf8'),ctx);
const B=window.LubricaComponentBinding;
const p={id:'LP1',category:'chain',equipmentId:'E1',name:'Цепь привода'};
B.bindPoint(p,{sourceComponent:db.components[0],equipment:db.equipment[0]});
if(p.componentBinding.sourceComponentId!=='C1'||p.componentBinding.libraryEntryId!=='C12')throw new Error('structure→catalog binding failed');
if(p.chain.pitchMm!==19.05||p.chain.strandCount!==2)throw new Error('catalog→point autofill failed');
db.lubricationPoints.push(p);
if(B.linkedPointForComponent('C1',null,db)!==p)throw new Error('duplicate guard lookup failed');
const gearbox={id:'LP2',category:'gearbox_oil',equipmentId:'E1',name:'Редуктор',gearboxOil:{mountingPosition:'M1'}};
B.setLibraryEntry(gearbox,'RX77');
if(gearbox.gearboxOil.calculation.oemFillLiters!==1.1)throw new Error('catalog→gearbox calculation autofill failed');
console.log('USER WORKFLOW SIMULATION PASS');
