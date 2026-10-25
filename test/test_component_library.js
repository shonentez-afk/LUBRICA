
const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.resolve(__dirname,'..');
let database={componentLibraryEntries:[],bearingOverrides:[]};let seq=0;
const window={
  LubricaBearingCatalogData:[{id:'BRG-6205',designation:'6205',d:25,D:52,B:15,bearingType:'deep_groove_ball',sourceNote:'Радиальный шарикоподшипник однорядный'}],
  LubricaSystem:{registerModule(){}},
  LubricaCore:{State:{getDatabase:()=>database,setDatabase:d=>database=d},Database:{normalize:d=>d},IDs:{nextFrom:()=>`CMPREF-${++seq}`}},
  LubricaApp:{refreshFromCore(){}}
};window.window=window;
const ctx={window,console};vm.createContext(ctx);
for(const f of [
  'bearings/library.js',
  'components/registry.js',
  'components/category-schemas.js',
  'components/starter-data.js',
  'components/starter-adapter.js',
  'components/bearing-adapter.js'
])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const C=window.LubricaComponents,a=(x,m)=>{if(!x)throw new Error(m)};
a(C.categories().some(x=>x.id==='bearing'&&x.title.includes('качения')),'bearing category terminology');
a(C.categories().some(x=>x.id==='chain'&&x.title==='Цепные передачи'),'chain category terminology');
a(C.categories().some(x=>x.id==='ball_screw'&&x.title.includes('ШВП')),'ball screw category');
a(C.search('6205','bearing').length===1,'bearing adapter');
a(C.search('08B-1','chain').length===1,'starter chain');
a(C.search('RX77','gearbox_oil').length===1,'starter gearbox');
a(C.search('JPF1605-4','ball_screw').length===1,'starter ball screw');
a(C.search('1020T','coupling').length===1,'starter coupling');
a(C.search('LM8UU','linear_bearing').length===1,'starter linear bearing');
a(C.all().length>=38,'starter catalog population');
C.save({category:'chain',designation:'12B-2 TEST',manufacturer:'OEM',technicalData:{pitchMm:19.05},sourceReference:'manual'});
a(database.componentLibraryEntries.length===1,'custom persistence');
a(C.search('12B-2 TEST','chain')[0].technicalData.pitchMm===19.05,'custom search');
console.log('COMPONENT LIBRARY TEST PASS',C.all().length);
const saved=C.save({category:'coupling',designation:'QA-EDIT',manufacturer:'OEM-A',technicalData:{size:'10'},sourceReference:'QA source'});
a(C.getCustom().some(x=>x.id===saved.id),'saved entry visible');
const edited=C.save({id:saved.id,category:'coupling',designation:'QA-EDIT',manufacturer:'OEM-B',technicalData:{size:'20'},sourceReference:'QA source 2'});
a(C.getCustom().find(x=>x.id===saved.id).manufacturer==='OEM-B','saved entry editable');
a(C.search('QA-EDIT','coupling')[0].technicalData.size==='20','edited entry searchable');
a(C.remove(saved.id)===true&&!C.getCustom().some(x=>x.id===saved.id),'saved entry removable');
