const fs=require('fs'),vm=require('vm'),path=require('path');
const base=path.resolve(__dirname,'..');
global.window=global;global.LubricaCore={};
for(const rel of ['core/database-schema.js','core/database-normalizer.js','core/database-migrations.js','core/database.js']){
  vm.runInThisContext(fs.readFileSync(path.join(base,rel),'utf8'),{filename:rel});
}
function ok(cond,msg){if(!cond)throw new Error(msg)}
const DB=LubricaCore.Database;
ok(DB&&typeof DB.createEmpty==='function','Database facade missing');
const empty=DB.createEmpty('QA');
ok(empty.schemaVersion==='2.0','schema');ok(empty.project.name==='QA','project');
const legacy={project:'P',materials:[{name:'G'}],rules:{x:1},points:[{id:'LUB-1',line:'L1',scope:'A',equipment:'E',unit:'U',position:'100',type:'bearing',operation:'Досмазывание',material:'G',qty:'10',measure:'г',interval:'4 недели',strategy:'calendar',status:'ready',verified:true}]};
const db=DB.fromLegacy(legacy);ok(db.tasks.length===1,'fromLegacy task');ok(db.lubricationPoints.length===1,'fromLegacy point');ok(db.tasks[0].approvalStatus==='approved','status normalize');
const back=DB.toLegacy(db);ok(back.points.length===1,'toLegacy point');ok(back.points[0].equipment==='E','toLegacy equipment');
const sync=DB.syncLegacy(db,{...legacy,points:[{...legacy.points[0],operation:'Контроль состояния'}]});ok(sync.tasks[0].operation==='Контроль состояния','syncLegacy update');
const normalized=DB.normalize({schemaVersion:'2.0',project:{name:'N'},lines:[{id:'L1',name:'Line'}],lubricationPoints:[],tasks:[]});ok(normalized.plants.length===1,'plant migration');
console.log('DATABASE MODULE TEST PASS');
