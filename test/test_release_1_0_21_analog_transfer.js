const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('lubrication/analog-transfer.js','utf8');
const database={
  lubricationPoints:[
    {id:'LP-000001',category:'bearing',name:'Опора 1',bearing:{effectiveDesignation:'UCP 212',calculation:{approvedDoseG:35.8}},targetMaterialId:'MAT-1',status:'confirmed'},
    {id:'LP-000002',category:'bearing',name:'Опора 2',bearing:{structuralDesignation:'UCP212'},status:'review'}
  ],
  tasks:[
    {id:'TASK-000001',lubricationPointId:'LP-000001',activityType:'regrease',operation:'Досмазывание',materialMode:'point_target',materialId:null,toolId:'TOOL-1',quantity:{approved:'35.8',unit:'г',source:'SKF'},schedule:{strategy:'По календарю',legacyText:'4 нед.',source:'OEM'},approvalStatus:'approved',verified:true,source:'Инженер'},
    {id:'TASK-000002',lubricationPointId:'LP-000001',activityType:'grease_full_replacement',operation:'Полная замена смазки',materialMode:'point_target',quantity:{approved:'218.06',unit:'г'},schedule:{strategy:'По календарю',legacyText:'1 года'},approvalStatus:'approved',verified:true}
  ],materials:[{id:'MAT-1',name:'Gadus'}],equipment:[],nodes:[],areas:[],lines:[]
};
const context={window:null,document:{getElementById:()=>null},console,Date,JSON};
context.window=context;
context.LubricaCore={State:{getDatabase:()=>database,setDatabase:()=>{}},IDs:{nextFrom(items,prefix,width=6){let max=0;for(const x of items){const m=String(x.id).match(/(\d+)$/);if(m)max=Math.max(max,+m[1])}return `${prefix}-${String(max+1).padStart(width,'0')}`}}};
context.LubricaMaterials={taskNeedsMaterial:()=>true,effectiveMaterialId:(t,p)=>t.materialId||p.targetMaterialId||null};
vm.createContext(context);vm.runInContext(code,context);
const A=context.LubricaAnalogs,src=database.lubricationPoints[0],dst=database.lubricationPoints[1];
assert(A.sameModel(src,dst),'UCP 212 and UCP212 must match');
A.applyTransfer(database,dst,src,{technical:true,material:true,tasks:true,quantity:true,schedule:true,sources:true});
assert.equal(dst.targetMaterialId,'MAT-1');
assert.equal(dst.status,'review');
assert.equal(dst.bearing.calculation.approvedDoseG,35.8);
const copied=database.tasks.filter(t=>t.lubricationPointId==='LP-000002');
assert.equal(copied.length,2);
assert.equal(copied[0].approvalStatus,'review');
assert.equal(copied[0].verified,false);
assert(copied.every(t=>t.analogSourcePointId==='LP-000001'));
assert.equal(dst.id,'LP-000002');
console.log('ANALOG TRANSFER CONTRACT PASS');
