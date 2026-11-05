const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({window:{},console});ctx.window.window=ctx.window;
vm.runInContext(fs.readFileSync(path.join(root,'qa/qa-engine.js'),'utf8'),ctx,{filename:'qa/qa-engine.js'});
const QA=ctx.window.LubricaProgramQA;
function fixture(){
 return {
  lines:[{id:'L1',name:'Линия 1'},{id:'L2',name:'Линия 2'}],
  areas:[{id:'A1',lineId:'L1',name:'Упаковки'},{id:'A2',lineId:'L2',name:'Упаковки'}],
  equipment:[{id:'EQ1',lineId:'L1',areaId:'A1',name:'Конвейер 1'},{id:'EQ2',lineId:'L2',areaId:'A2',name:'Конвейер 2'}],
  nodes:[{id:'N1'},{id:'N2'}],
  materials:[{id:'MAT1',code:'GRE',name:'Смазка',kind:'Пластичная смазка',density:'0,9',sourceReference:'TDS'},
    {id:'MAT3',code:'GEAR-001',name:'Mobilgear 600 XP 220',kind:'Редукторное масло',isoVg:'220',baseViscosity40:'150',density:'15,6',sourceReference:''}],
  tools:[{id:'TOOL1',name:'Шприц'}],
  components:[
   {id:'CMP1',equipmentId:'EQ1',name:'BS2-2208-2CS/VT143',candidateCategory:'bearing',candidateState:'candidate'},
   {id:'CMP2',equipmentId:'EQ1',name:'Цепь 12B-2',candidateCategory:'chain',candidateState:'candidate'},
   {id:'CMP3',equipmentId:'EQ2',name:'Втулка',candidateCategory:'bushing',candidateState:'review'},
   {id:'CMP4',equipmentId:'EQ2',name:'Пластина',candidateCategory:'other',candidateState:'candidate'},
   {id:'CMP5',equipmentId:'EQ1',name:'Звездочка',candidateCategory:'chain',candidateState:'excluded'}
  ],
  lubricationPoints:[{id:'LP1',equipmentId:'EQ1',nodeId:'N1',name:'Приводной вал, левая опора',targetMaterialId:'MAT1',componentBinding:{sourceComponentId:'CMP1'},
     bearing:{effectiveDesignation:'BS2-2208-2CS/VT143',bearingType:'spherical_roller',D:80,B:28,sealing:'sealed',sealingCode:'2CS',
       calculation:{manufacturer:'SKF',relubeMethod:'lubrica_unified',approvedRelubeDoseG:11.2,oemSource:'SKF Selecting grease or oil'}}}],
  tasks:[
    {id:'T1',lubricationPointId:'LP1',operation:'Досмазывание',activityType:'regrease',materialId:'MAT1',materialMode:'explicit',approvalStatus:'review',toolId:'TOOL1',quantity:{approved:'11.2',unit:'г',source:'SKF Selecting grease or oil'},schedule:{legacyText:'1463 ч',source:'fallback'}},
    {id:'T2',lubricationPointId:'LP1',operation:'Полная замена смазки',activityType:'grease_full_replacement',materialId:'MAT1',materialMode:'explicit',approvalStatus:'review',quantity:{approved:'29.23',unit:'г',source:'fallback'},schedule:{legacyText:'7315 ч',source:'fallback'}}
  ],routes:[],componentLibraryEntries:[]
 };
}
let d=fixture(),snapshot=JSON.stringify(d);
let r=QA.audit(d);
assert.equal(JSON.stringify(d),snapshot,'QA must not mutate production DB');
const issue=(code,id)=>r.issues.find(x=>x.code===code&&x.entityId===id);
assert(issue('SKF_SEALED_RELUBE_REVIEW','T1'),'conditional SKF relube must be reviewed');
assert(issue('SKF_SEALED_RELUBE_REVIEW','T1').message.includes('3.36 г'),'SKF-specific 0.0015*80*28 guidance should be shown');
assert(!issue('SKF_SEALED_RELUBE_REVIEW','T1').message.includes('запрещено'),'sealed SKF relube must not be declared impossible');
assert(issue('SKF_SEALED_FULL_RENEWAL_REVIEW','T2'),'full grease renewal of sealed bearing requires OEM procedure');
assert(issue('MATERIAL_DENSITY_IMPLAUSIBLE','MAT3'),'implausible density is detected');
assert(issue('MATERIAL_OIL_VG_CONFLICT','MAT3'),'ISO VG vs viscosity at 40C is detected');
assert.equal(issue('SKF_SEALED_RELUBE_REVIEW','T1').severity,'warn','review task gets warning');
d.tasks[0].approvalStatus='approved';
r=QA.audit(d);assert.equal(r.issues.find(x=>x.code==='SKF_SEALED_RELUBE_REVIEW'&&x.entityId==='T1').severity,'error','approved sealed task is a high priority finding');
d.tasks[0].approvalStatus='review';d.lubricationPoints[0].bearing.calculation.sealedRelubeConfirmed=true;
d.lubricationPoints[0].bearing.calculation.sealedRelubeSource='SKF sealed spherical bearing procedure + physical grease feed confirmed';
d.lubricationPoints[0].bearing.calculation.relubeMethod='skf_sealed';
r=QA.audit(d);assert(!r.issues.some(x=>x.code==='SKF_SEALED_RELUBE_REVIEW'),'explicit evidence can resolve warning');
let q=QA.candidateQueue(d);
assert.equal(q.totalCandidates,3);assert.equal(q.alreadyLinked,1);assert.equal(q.unlinked,2);
assert.equal(q.groups.length,2);assert.equal(q.byCategory.chain,1);assert.equal(q.byCategory.bushing,1);
assert(q.groups.find(x=>x.equipmentId==='EQ1').items.some(x=>x.id==='CMP2'));
assert(!q.groups.some(x=>x.items.some(y=>y.id==='CMP1')),'already linked actual component is not a new candidate');
const ui=fs.readFileSync(path.join(root,'qa/qa-ui.js'),'utf8');
assert(ui.includes('Очередь разбора фактических ТМЦ')&&ui.includes('data-qa-candidate-line'));
assert(ui.includes("selectEntity?.('equipment',x.entityId)"),'group opens real equipment');
const candidates=JSON.parse(fs.readFileSync(path.join(root,'project/sources/pp53736/Филиал_завода__Техно__г._Юрга(20260923-051134).json'),'utf8'));
const before=JSON.stringify(candidates);
const ra=QA.audit(candidates);
assert.equal(JSON.stringify(candidates),before,'production baseline read-only');
assert(ra.candidateQueue.totalCandidates>=ra.candidateQueue.unlinked,'candidate totals must make sense');
assert(ra.counts.points>0&&ra.counts.tasks>0,'production baseline must have points and tasks');
console.log('PASS 1.0.33.69: sealed SKF conditional OEM review + material sanity + physical candidate queue; production baseline read-only',ra.counts,ra.candidateQueue.unlinked);
