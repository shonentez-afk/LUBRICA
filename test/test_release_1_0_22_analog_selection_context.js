'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const db={
  lubricationPoints:[
    {id:'LP-000007',category:'bearing',name:'Левая',bearing:{effectiveDesignation:'UCFC 208',catalogId:'BRG-SKF-UCFC208'}},
    {id:'LP-000008',category:'bearing',name:'Правая',bearing:{effectiveDesignation:'UCFC 208',catalogId:'BRG-SKF-UCFC208'}}
  ],
  tasks:[
    {id:'TASK-000011',lubricationPointId:'LP-000007',activityType:'regrease',materialId:'MAT-1',quantity:{approved:'19.68'},schedule:{legacyText:'4 нед.'},approvalStatus:'approved',verified:true},
    {id:'TASK-000012',lubricationPointId:'LP-000007',activityType:'grease_full_replacement',materialId:'MAT-1',quantity:{approved:'96.55'},schedule:{legacyText:'1 года'},approvalStatus:'approved',verified:true},
    {id:'TASK-000013',lubricationPointId:'LP-000008',activityType:'regrease',quantity:{approved:''},schedule:{legacyText:''}},
    {id:'TASK-000014',lubricationPointId:'LP-000008',activityType:'grease_full_replacement',quantity:{approved:''},schedule:{legacyText:''}}
  ],materials:[{id:'MAT-1',name:'Gadus'}],equipment:[],nodes:[],areas:[],lines:[]
};
const button={dataset:{},hidden:false,disabled:false,title:''};
const sandbox={window:{},document:{getElementById:id=>id==='fillFromAnalogBtn'?button:null},console,Date,JSON,Map,Set,String,Object,Array};
sandbox.window=sandbox;
sandbox.LubricaCore={State:{getDatabase:()=>db},IDs:{nextFrom:()=> 'TASK-X'}};
sandbox.LubricaMaterials={taskNeedsMaterial:()=>true,effectiveMaterialId:t=>t.materialId||null};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('lubrication/analog-transfer.js','utf8'),sandbox);
const A=sandbox.LubricaAnalogs;
assert.equal(A.currentPoint({taskId:'TASK-000013'}).id,'LP-000008');
A.refreshButton(db.lubricationPoints[1]);
assert.equal(button.dataset.pointId,'LP-000008');
assert.equal(A.currentPoint({}).id,'LP-000008');
const list=A.findAnalogs(db,db.lubricationPoints[1]);
assert.equal(list[0].id,'LP-000007');
assert(A.sourceScore(db,list[0])>A.sourceScore(db,db.lubricationPoints[1]));
console.log('ANALOG SELECTION CONTEXT PASS');
