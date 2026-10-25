(function(global){
 'use strict';
 function db(){return global.LubricaCore?.State?.getDatabase?.()||null}
 function clean(v){return String(v??'').trim()}
 function round(v,d=2){const p=10**d;return Math.round((Number(v)||0)*p)/p}
 function parseQty(text,defaultUnit=''){
   const s=clean(text);if(!s)return null;
   const m=s.match(/(-?\d+(?:[.,]\d+)?)/);if(!m)return null;
   const value=Number(m[1].replace(',','.'));if(!Number.isFinite(value))return null;
   const lower=s.toLowerCase();let unit=clean(defaultUnit).toLowerCase();
   if(/\bкг\b/.test(lower))unit='кг';else if(/\bг\b/.test(lower))unit='г';
   else if(/\bмл\b/.test(lower))unit='мл';else if(/\bл\b/.test(lower))unit='л';
   else if(/см3|см³/.test(lower))unit='мл';
   return {value,unit};
 }
 function baseQty(q){
   if(!q)return null;
   if(q.unit==='кг')return{dimension:'mass',unit:'г',value:q.value*1000};
   if(q.unit==='г')return{dimension:'mass',unit:'г',value:q.value};
   if(q.unit==='л')return{dimension:'volume',unit:'мл',value:q.value*1000};
   if(q.unit==='мл')return{dimension:'volume',unit:'мл',value:q.value};
   return{dimension:q.unit||'unknown',unit:q.unit||'',value:q.value};
 }
 function taskRows(run,route){
   const E=global.LubricaChecklistEngine;
   const model=E?.modelForRun?.(route,run,db())||run?.routeSnapshot||null;
   return (model?.groups||[]).flatMap(g=>g.tasks||[]).map(x=>{
     const r=run?.taskResults?.[x.taskId]||{};
     const planned=parseQty(x.quantityPrimary||x.quantity||'');
     const actual=parseQty(r.actualQuantity||'',planned?.unit||'');
     const status=r.done?'completed':(['skipped','not_applicable'].includes(r.resultStatus)?r.resultStatus:'pending');
     return {taskId:x.taskId,pointId:x.pointId||'',pointName:x.pointName||'',operation:x.operation||'',materialCode:x.materialCode||'',materialName:x.materialName||'',plannedText:x.quantityPrimary||x.quantity||'',planned,actualText:r.actualQuantity||'',actual,status,reason:r.deviationReason||r.observations||''};
   });
 }
 function materialRows(rows){
   const map=new Map();
   for(const x of rows){
     if(!x.materialName&&!x.materialCode)continue;
     const pb=baseQty(x.planned),ab=baseQty(x.actual),dim=pb?.dimension||ab?.dimension||'unknown',unit=pb?.unit||ab?.unit||'';
     const key=`${x.materialCode||x.materialName}|${dim}|${unit}`;
     if(!map.has(key))map.set(key,{key,code:x.materialCode||'',name:x.materialName||'',dimension:dim,unit,planned:0,actual:0,plannedKnown:0,actualKnown:0,actualMissing:0,tasks:0});
     const m=map.get(key);m.tasks++;
     if(pb&&pb.dimension===dim){m.planned+=pb.value;m.plannedKnown++}
     if(ab&&ab.dimension===dim){m.actual+=ab.value;m.actualKnown++}
     else if(x.status==='completed'&&pb)m.actualMissing++;
   }
   return [...map.values()].map(x=>{const completeActual=x.actualMissing===0;return {...x,planned:round(x.planned),actual:round(x.actual),actualComplete:completeActual,delta:completeActual?round(x.actual-x.planned):null,deltaPercent:completeActual&&x.planned?round((x.actual-x.planned)/x.planned*100,1):null}});
 }
 function analyzeRun(run,route){
   if(!run)return null;
   const rows=taskRows(run,route),total=rows.length;
   const completed=rows.filter(x=>x.status==='completed').length,skipped=rows.filter(x=>x.status==='skipped').length,notApplicable=rows.filter(x=>x.status==='not_applicable').length,pending=rows.filter(x=>x.status==='pending').length;
   const plannedMinutes=Number(run?.routeSnapshot?.estimatedMinutes ?? route?.estimatedMinutes ?? 0)||0;
   const actualMinutes=Number(run.actualDurationMinutes),actualKnown=Number.isFinite(actualMinutes);
   return {
     runId:run.id,executionNo:run.executionNo||'',routeId:run.routeId,routeRevision:run.routeRevision||route?.revision||1,date:run.date||'',performer:run.performer||'',shift:run.shift||'',status:run.status,
     plannedMinutes,actualMinutes:actualKnown?actualMinutes:null,timeDelta:actualKnown?actualMinutes-plannedMinutes:null,timeDeltaPercent:actualKnown&&plannedMinutes?round((actualMinutes-plannedMinutes)/plannedMinutes*100,1):null,
     tasks:{total,completed,skipped,notApplicable,pending,completionPercent:total?round(completed/total*100,1):0,resolvedPercent:total?round((completed+skipped+notApplicable)/total*100,1):0},
     materials:materialRows(rows),taskRows:rows
   };
 }
 function routeAnalysis(routeId,route=null,d=db()){
   if(!d)return{runs:[],summary:null};
   const runs=global.LubricaChecklistEngine?.routeRuns?.(routeId,d)?.filter(r=>r.status==='completed')||[];
   const analyzed=runs.map(r=>analyzeRun(r,route)).filter(Boolean),timeKnown=analyzed.filter(x=>x.actualMinutes!=null);
   const summary=analyzed.length?{
     executions:analyzed.length,
     avgPlannedMinutes:round(analyzed.reduce((s,x)=>s+x.plannedMinutes,0)/analyzed.length,1),
     avgActualMinutes:timeKnown.length?round(timeKnown.reduce((s,x)=>s+x.actualMinutes,0)/timeKnown.length,1):null,
     avgTimeDeltaPercent:timeKnown.filter(x=>x.timeDeltaPercent!=null).length?round(timeKnown.filter(x=>x.timeDeltaPercent!=null).reduce((s,x)=>s+x.timeDeltaPercent,0)/timeKnown.filter(x=>x.timeDeltaPercent!=null).length,1):null,
     completedTasks:analyzed.reduce((s,x)=>s+x.tasks.completed,0),skippedTasks:analyzed.reduce((s,x)=>s+x.tasks.skipped,0),notApplicableTasks:analyzed.reduce((s,x)=>s+x.tasks.notApplicable,0)
   }:null;
   return{runs:analyzed,summary};
 }
 global.LubricaRoutePlanFact=Object.freeze({analyzeRun,routeAnalysis,parseQty,baseQty});
})(window);