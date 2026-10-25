const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase:()=>({bearingOverrides:[]})}}};window.window=window;
const ctx={window,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'bearings/catalog-data.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'bearings/library.js'),'utf8'),ctx);
const B=ctx.window.LubricaBearings;
const a=(x,m)=>{if(!x)throw new Error(m)};
a(B.catalog.length>=340,'expanded catalog count');
a(Math.max(...B.catalog.map(x=>Number(x.d)||0))===150,'max bore 150');
for(const d of ['NU230','NJ230','NUP230','22230','30230','32230','UCP330','UCF330','UCFL330','UCT330']){
 const r=B.lookup(d); a(r.record,`lookup ${d}`); a(Number(r.record.d)<=150,`bore ${d}`);
}
a(B.lookup('SKF 22230 CCK/W33').record?.designation==='22230','spherical suffix parse');
a(B.lookup('UCP 328').record?.designation==='UCP328','housed spacing parse');
const hu=B.lookup('UCP330').record;
a(hu.bearingType==='bearing_unit','bearing unit type');
a(hu.insertDesignation==='UC330','insert designation');
a(hu.housingStyle==='UCP','housing style');
const filtered=B.search('',{type:'spherical_roller',maxBore:100});
a(filtered.length>0 && filtered.every(x=>x.bearingType==='spherical_roller'&&x.d<=100),'type/bore filters');
console.log('RELEASE 1.0.12 BEARING LIBRARY EXPANSION PASS',B.catalog.length);
