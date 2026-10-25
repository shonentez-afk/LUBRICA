const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const base=path.resolve(__dirname,'..');
global.window=global;global.LubricaCore={};
for(const rel of ['core/database-schema.js','core/database-normalizer.js'])vm.runInThisContext(fs.readFileSync(path.join(base,rel),'utf8'),{filename:rel});
const N=LubricaCore.DatabaseNormalizer;
const db=N.normalize({
  schemaVersion:'2.0',project:{name:'QA'},plants:[],lines:[],areas:[],equipment:[],components:[],nodes:[],
  lubricationPoints:[{id:'LP-1',equipmentId:'EQ-1',category:'bearing',name:'Левая опора'}],
  tasks:[
    {id:'TASK-OLD',lubricationPointId:'LP-1',activityType:'relubrication',operation:'Досмазывание',materialMode:'explicit',materialId:'MAT-1',toolId:'TOOL-1',quantity:{approved:'',unit:'г'},schedule:{strategy:'По календарю',legacyText:''},approvalStatus:'review',origin:'candidate',candidateOriginKey:'equipment:EQ-1:rotating_support_1|relubrication'},
    {id:'TASK-CALC',lubricationPointId:'LP-1',activityType:'regrease',operation:'Досмазывание',materialMode:'point_target',materialId:null,quantity:{approved:'15',calculated:15,unit:'г',source:'LUBRICA Universal'},schedule:{strategy:'По наработке',legacyText:'2250 ч',runtimeHours:2250,calculatedHours:2250,source:'LUBRICA Universal'},approvalStatus:'review',origin:'calculation'}
  ],
  materials:[],routes:[{id:'R1',taskIds:['TASK-OLD'],excludedTaskIds:[]}],checklistRuns:[],tools:[],imports:[],bearingOverrides:[],componentLibraryEntries:[]
});
assert.equal(db.tasks.length,1,'alias duplicate must merge into one task');
const t=db.tasks[0];
assert.equal(t.activityType,'regrease');
assert.equal(t.quantity.approved,'15');
assert.equal(t.schedule.runtimeHours,2250);
assert.equal(t.materialId,'MAT-1','candidate material must survive merge');
assert.equal(t.toolId,'TOOL-1','candidate tool must survive merge');
assert.deepEqual(db.routes[0].taskIds,[t.id],'route reference must follow survivor');
const onlyAlias=N.normalize({schemaVersion:'2.0',project:{name:'QA'},lubricationPoints:[{id:'LP-2',category:'bearing'}],tasks:[{id:'T1',lubricationPointId:'LP-2',activityType:'relubrication',operation:'Досмазывание'}]});
assert.equal(onlyAlias.tasks.length,1);assert.equal(onlyAlias.tasks[0].activityType,'regrease');
const multi=N.normalize({schemaVersion:'2.0',project:{name:'QA'},lubricationPoints:[{id:'LP-3',category:'bearing'}],tasks:[{id:'A',lubricationPointId:'LP-3',activityType:'regrease',operation:'Досмазывание'},{id:'B',lubricationPointId:'LP-3',activityType:'regrease',operation:'Досмазывание'}]});
assert.equal(multi.tasks.length,2,'ordinary multiple regrease events must remain valid');
const rot=fs.readFileSync(path.join(base,'rotating/rotating-arrangement.js'),'utf8');
assert(rot.includes("type:'regrease',label:'Досмазывание'"),'rotating constructor must create canonical regrease');
assert(!rot.includes("type:'relubrication',label:'Досмазывание'"),'legacy alias must not be generated');
console.log('PASS 1.0.33.23 rotating task dedup');
