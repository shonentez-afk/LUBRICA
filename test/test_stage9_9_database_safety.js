const fs=require('fs'),vm=require('vm'),path=require('path');
const base=path.resolve(__dirname,'..');
global.window=global;global.LubricaCore={};global.LubricaSystem={notify:()=>{}};
for(const rel of ['core/ids.js','core/database-schema.js','core/database-normalizer.js','core/database-migrations.js','core/database.js','core/migration.js','core/database-safety.js']){
 vm.runInThisContext(fs.readFileSync(path.join(base,rel),'utf8'),{filename:rel});
}
const S=LubricaCore.DatabaseSafety;
function ok(v,m){if(!v)throw new Error(m)}
let failed=false;try{S.parse('{"x":','broken.json')}catch(e){failed=/повреждён|некорректный JSON/i.test(e.message)}ok(failed,'corrupt JSON not rejected');
failed=false;try{S.prepare(['not','database'])}catch(e){failed=true}ok(failed,'array root not rejected');
failed=false;try{S.prepare({hello:'world'})}catch(e){failed=true}ok(failed,'unknown format not rejected');

const legacy={project:'Legacy',materials:[{name:'G'}],rules:{},points:[{id:'L1',line:'Линия 1',scope:'A',equipment:'E',unit:'U',position:'100',type:'bearing',operation:'Досмазывание',material:'G',qty:'5',measure:'г',interval:'4 недели',status:'ready',verified:true}]};
const migrated=S.prepare(legacy);ok(migrated.migrated===true,'legacy not marked migrated');ok(migrated.database.schemaVersion==='2.0','legacy not migrated to v2');ok(migrated.database.tasks.length===1,'legacy task lost');

const v2=LubricaCore.Database.createEmpty('V2');v2.lines=[{id:'LINE-1',plantId:'PLANT-0001',name:'L'}];v2.areas=[{id:'AREA-1',lineId:'LINE-1',name:'A'}];
v2.equipment=[{id:'EQ-1',lineId:'LINE-1',areaId:'AREA-1',name:'E'}];v2.nodes=[{id:'N-1',equipmentId:'EQ-1',name:'N'}];
v2.lubricationPoints=[{id:'LP-1',equipmentId:'EQ-1',nodeId:'N-1',name:'P'}];v2.tasks=[{id:'T-1',lubricationPointId:'LP-1',operation:'Осмотр'}];
const p=S.prepare(v2);ok(!p.migrated,'v2 marked migrated');ok(p.report.ok,'valid v2 failed');

const dup=JSON.parse(JSON.stringify(v2));dup.tasks.push({...dup.tasks[0]});failed=false;try{S.prepare(dup)}catch(e){failed=/Дубли ID/.test(e.message)}ok(failed,'duplicate IDs not rejected');

const broken=JSON.parse(JSON.stringify(v2));broken.tasks[0].lubricationPointId='MISSING';
const br=S.prepare(broken);ok(br.report.warnings.some(x=>/точка MISSING/.test(x)),'broken reference warning missing');
console.log('STAGE 9.9 DATABASE SAFETY TEST PASS');
