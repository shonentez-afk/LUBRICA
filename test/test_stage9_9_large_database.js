const fs=require('fs'),vm=require('vm'),path=require('path'),{performance}=require('perf_hooks');
const base=path.resolve(__dirname,'..');global.window=global;global.LubricaCore={};
function load(rel){vm.runInThisContext(fs.readFileSync(path.join(base,rel),'utf8'),{filename:rel})}
for(const rel of ['core/ids.js','core/database-schema.js','core/database-normalizer.js','core/database-migrations.js','core/database.js'])load(rel);

const C=LubricaCore,db=C.Database.createEmpty('RC Large DB');
db.plants=[{id:'PLANT-0001',name:'Завод'}];
db.lines=[{id:'LINE-1',plantId:'PLANT-0001',name:'Линия 1'},{id:'LINE-2',plantId:'PLANT-0001',name:'Линия 2'}];
for(let i=0;i<24;i++)db.areas.push({id:`AREA-${i+1}`,lineId:i<12?'LINE-1':'LINE-2',name:`Участок ${i+1}`});
for(let i=0;i<1244;i++)db.equipment.push({id:`EQ-${i+1}`,lineId:i<622?'LINE-1':'LINE-2',areaId:`AREA-${(i%24)+1}`,name:`Оборудование ${i+1}`,externalCode:`EQC-${i+1}`,status:'active'});
for(let i=0;i<5672;i++)db.components.push({id:`COMP-${i+1}`,externalCode:`C-${i+1}`,equipmentId:`EQ-${(i%1244)+1}`,name:`Компонент ${i+1}`,status:'active'});
for(let i=0;i<24;i++){db.materials.push({id:`MAT-${i+1}`,code:`M${i+1}`,name:`Материал ${i+1}`,kind:'Пластичная смазка',color:'#999999',approved:true});db.tools.push({id:`TOOL-${i+1}`,code:`TL${i+1}`,name:`Шприц ${i+1}`,type:'grease_gun',materialId:`MAT-${i+1}`,status:'active'});}
const pointCount=2400,taskCount=4800;
for(let i=0;i<pointCount;i++){
 const eq=`EQ-${(i%1244)+1}`,nid=`NODE-${i+1}`,pid=`LP-${i+1}`,mat=`MAT-${(i%24)+1}`,lib=`LIB-${i+1}`;
 db.nodes.push({id:nid,equipmentId:eq,name:`Узел ${i+1}`,quantity:1});
 db.componentLibraryEntries.push({id:lib,name:`Справочник ${i+1}`});
 db.lubricationPoints.push({id:pid,equipmentId:eq,nodeId:nid,name:`Точка ${i+1}`,category:'bearing',targetMaterialId:mat,materialRationale:'OEM',engineeringSources:{material:{reference:'OEM'},dose:{reference:'OEM'},interval:{reference:'OEM'}},componentBinding:{libraryEntryId:lib,actualLibraryEntryId:lib,sourceComponentId:`COMP-${(i%5672)+1}`,matchStatus:'matched'}});
}
for(let i=0;i<taskCount;i++){
 const pid=`LP-${(i%pointCount)+1}`,mat=`MAT-${(i%24)+1}`;
 db.tasks.push({id:`TASK-${i+1}`,lubricationPointId:pid,operation:'Досмазывание',activityType:'lubrication',materialMode:'point_target',toolId:`TOOL-${(i%24)+1}`,approvalStatus:'approved',quantity:{approved:'10',unit:'г',source:'OEM'},schedule:{legacyText:'4 недели',source:'OEM'}});
}
for(let r=0;r<80;r++){const ids=[];for(let j=r;j<taskCount;j+=80)ids.push(`TASK-${j+1}`);db.routes.push({id:`R-${r+1}`,code:`R-${r+1}`,name:`Маршрут ${r+1}`,lineId:r<40?'LINE-1':'LINE-2',areaId:`AREA-${(r%24)+1}`,status:'active',taskIds:ids});}

const t0=performance.now();const normalized=C.Database.normalize(db);const normalizeMs=performance.now()-t0;
global.LubricaCore.State={getDatabase:()=>normalized};global.state={points:[]};global.taskKey=p=>p.taskId||p.id;
load('qa/qa-engine.js');
const t1=performance.now();const qa=global.LubricaProgramQA.audit(normalized);const qaMs=performance.now()-t1;
load('export/final-excel.js');
const t2=performance.now();const rows=global.LubricaFinalExcel.taskRows();const excelRowsMs=performance.now()-t2;

function ok(v,m){if(!v)throw new Error(m)}
ok(normalized.components.length===5672,'component count changed');
ok(normalized.equipment.length===1244,'equipment count changed');
ok(rows.length===taskCount,'final Excel row count mismatch');
ok(qa.totalApplicable>0,'QA did not execute');
ok(normalizeMs<5000,`normalize too slow ${normalizeMs.toFixed(1)}ms`);
ok(qaMs<5000,`QA too slow ${qaMs.toFixed(1)}ms`);
ok(excelRowsMs<5000,`Excel row preparation too slow ${excelRowsMs.toFixed(1)}ms`);
console.log('STAGE 9.9 LARGE DATABASE PERFORMANCE PASS',JSON.stringify({components:5672,equipment:1244,points:pointCount,tasks:taskCount,routes:80,normalizeMs:+normalizeMs.toFixed(1),qaMs:+qaMs.toFixed(1),excelRowsMs:+excelRowsMs.toFixed(1),readiness:qa.readiness}));
