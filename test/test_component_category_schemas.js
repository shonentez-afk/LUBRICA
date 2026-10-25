const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase:()=>({componentLibraryEntries:[]})}}};window.window=window;const ctx={window,console};vm.createContext(ctx);
for(const f of ['components/registry.js','components/category-schemas.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const C=window.LubricaComponents,a=(x,m)=>{if(!x)throw new Error(m)};
const get=id=>C.categories().find(x=>x.id===id);a(get('chain').fields.some(x=>x.key==='pitchMm'),'chain pitch');a(get('gearbox_oil').fields.some(x=>x.key==='oemFillLiters'),'gearbox oil');a(get('ball_screw').fields.some(x=>x.key==='leadMm'),'ball screw lead');a(get('coupling').fields.some(x=>x.key==='cavityVolumeCm3'),'coupling cavity');console.log('COMPONENT CATEGORY SCHEMAS TEST PASS');
