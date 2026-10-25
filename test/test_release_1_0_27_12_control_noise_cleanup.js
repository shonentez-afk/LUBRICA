const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'qa','qa-engine.js'),'utf8');
function audit(db){const sb={window:{LubricaCore:{State:{getDatabase:()=>db}}}};vm.createContext(sb);vm.runInContext(engine,sb);return sb.window.LubricaProgramQA.audit(db)}
const base={equipment:[{id:'E1',lineId:'L1',areaId:'A1'}],nodes:[{id:'N1'}],materials:[{id:'M1',code:'GRE-1',name:'Grease',approved:true,sourceReference:''}],tools:[],routes:[],componentLibraryEntries:[{id:'BRG-UCP212'}],lubricationPoints:[
 {id:'P1',equipmentId:'E1',nodeId:'N1',name:'left',candidateOriginKey:'component:C1:left',componentBinding:{libraryEntryId:'BRG-UCP212'}},
 {id:'P2',equipmentId:'E1',nodeId:'N1',name:'right',candidateOriginKey:'component:C1:right',componentBinding:{libraryEntryId:'BRG-UCP212'}}
],tasks:[
 {id:'T1',lubricationPointId:'P1',operation:'Досмазывание',materialMode:'explicit',materialId:'M1',quantity:{approved:10,unit:'г',source:'calc'},schedule:{legacyText:'1000 ч',source:'calc'},approvalStatus:'approved'},
 {id:'T2',lubricationPointId:'P2',operation:'Досмазывание',materialMode:'explicit',materialId:'M1',quantity:{approved:10,unit:'г',source:'calc'},schedule:{legacyText:'1000 ч',source:'calc'},approvalStatus:'approved'}
]};
const r=audit(base);const codes=r.issues.map(x=>x.code);
if(codes.includes('COMPONENT_BOUND_TO_MULTIPLE_POINTS'))throw new Error('catalogue entry reuse must not be treated as physical duplicate');
if(codes.filter(x=>x==='MATERIAL_REFERENCE_MISSING').length!==1)throw new Error('material reference must be reported once per material');
if(codes.filter(x=>x==='ROUTES_NOT_CREATED').length!==1)throw new Error('missing routes must be one consolidated issue');
if(codes.some(x=>x==='APPROVED_TASK_NOT_ROUTED'))throw new Error('do not emit per-task route coverage before any route exists');
const dup=JSON.parse(JSON.stringify(base));dup.lubricationPoints[1].candidateOriginKey='component:C1:left';
const r2=audit(dup);if(!r2.issues.some(x=>x.code==='PHYSICAL_POINT_ORIGIN_DUPLICATE'))throw new Error('real physical origin duplicate must still be detected');
console.log('CONTROL NOISE CLEANUP PASS');
