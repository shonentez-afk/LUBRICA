
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,window:{LubricaSystem:{registerModule(){},notify(){}}}};
ctx.window.window=ctx.window;
vm.createContext(ctx);
for(const rel of ['calculations/registry.js','calculations/framework.js','calculations/catalog.js']){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});
}
const R=ctx.window.LubricaCalculationRegistry,C=ctx.window.LubricaCalculations;
const assert=(x,m)=>{if(!x)throw new Error(m)};

let m=R.resolve({category:'chain'});
assert(m&&m.id==='chain'&&m.status==='planned','chain planned module');
m=R.resolve({category:'gearbox_oil'});
assert(m&&m.id==='gearbox-oil','gearbox module resolution');
m=R.resolve({category:'linear_bearing'});
assert(m&&m.id==='linear-bearing','linear bearing module resolution');

const point={id:'LP-1',category:'bearing'};
const meta=C.markResult(point,'bearing',{version:'8.2',status:'calculated',approved:true,warningCount:2,source:'OEM'});
assert(point.calculations.bearing.moduleId==='bearing','result metadata store');
assert(meta.approved===true&&meta.warningCount===2,'result metadata content');
assert(C.getResultMeta(point,'bearing').source==='OEM','result metadata lookup');

let opened=false;
R.register({id:'test-ready',title:'Test',categories:['test_category'],status:'ready',priority:999,open(){opened=true;return true}});
assert(C.moduleStatus({category:'test_category'}).ready===true,'ready status');
assert(C.open({category:'test_category'})===true&&opened,'ready module open');

console.log('CALCULATION FRAMEWORK TEST PASS');
