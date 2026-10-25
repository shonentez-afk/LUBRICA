const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const bearing={id:'BRG-6205',category:'bearing',designation:'6205',technicalData:{d:25,D:52,B:15,bearingType:'deep_groove_ball'},sourceType:'builtin'};
const db={equipment:[],components:[],lubricationPoints:[]};
const window={
  LubricaSystem:{registerModule(){}},
  LubricaCore:{State:{getDatabase:()=>db}},
  LubricaComponents:{all:c=>c==='bearing'||c==='all'?[bearing]:[],search:(q,c)=>c==='bearing'&&String(q).includes('6205')?[bearing]:[]},
  LubricaBearings:{lookup:q=>({sourceType:'builtin',parsed:{recognized:String(q).includes('6205'),baseDesignation:'6205',catalogId:null,dimensions:{d:25,D:52,B:15},inferredType:'deep_groove_ball'}})}
};window.window=window;const ctx={window,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'components/binding.js'),'utf8'),ctx,{filename:'binding.js'});
const B=window.LubricaComponentBinding;
const point={id:'LP-OLD',category:'bearing',bearing:{structuralDesignation:'SKF 6205-2RS',effectiveDesignation:'SKF 6205-2RS'},componentBinding:{libraryCategory:'bearing',libraryEntryId:null,actualLibraryEntryId:null}};
const entry=B.ensurePointTechnical(point);
if(!entry||entry.id!=='BRG-6205')throw new Error('legacy bearing was not rehydrated from designation');
if(point.bearing.d!==25||point.bearing.D!==52||point.bearing.B!==15)throw new Error('legacy bearing dimensions were not restored');
if(point.componentBinding.libraryEntryId!=='BRG-6205')throw new Error('legacy bearing catalog binding was not repaired');
console.log('LEGACY BINDING REHYDRATION TEST PASS');
