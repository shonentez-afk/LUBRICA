
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const database={bearingOverrides:[]};
const ctx={console,window:{
  LubricaCore:{
    State:{getDatabase(){return database},setDatabase(db){Object.assign(database,db)}},
    Database:{normalize(db){return db}},
    IDs:{nextFrom(arr,prefix,width){return `${prefix}-${String(arr.length+1).padStart(width,'0')}`}}
  },
  LubricaSystem:{registerModule(){}}
}};
ctx.window.window=ctx.window;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'bearings/catalog-data.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'bearings/library.js'),'utf8'),ctx);
const B=ctx.window.LubricaBearings;
function assert(x,m){if(!x)throw new Error(m)}
let r=B.lookup('SKF 6205-2RS1/C3');
assert(r.parsed.baseDesignation==='6205','6205 base designation');
assert(r.parsed.dimensions.d===25&&r.parsed.dimensions.D===52&&r.parsed.dimensions.B===15,'6205 dimensions');
assert(r.parsed.sealing==='sealed','6205 sealing');
assert(r.parsed.clearance==='C3','6205 clearance');
r=B.lookup('FAG 22212-E1-C3');
assert(r.parsed.baseDesignation==='22212','22212 generic recognition');
assert(r.parsed.recognized===true,'22212 now included in expanded built-in library');
assert(r.parsed.dimensions.d===60&&r.parsed.dimensions.D===110&&r.parsed.dimensions.B===28,'22212 built-in dimensions');
r=B.lookup('UCP 212');
assert(r.parsed.baseDesignation==='UCP212','UCP212 recognition');
assert(r.parsed.recognized===true,'UCP212 now included in housed-unit library');
assert(r.record?.insertDesignation==='UC212','UCP212 insert bearing link');
B.saveOverride({designation:'22212',d:60,D:110,B:28,bearingType:'spherical_roller',manufacturer:'TEST',sourceReference:'QA fixture'});
r=B.lookup('22212 C3');
assert(r.sourceType==='override','override preferred');
assert(r.parsed.dimensions.d===60&&r.parsed.dimensions.D===110&&r.parsed.dimensions.B===28,'override dimensions');
console.log('BEARING LIBRARY TEST PASS');
