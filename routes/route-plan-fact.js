(function(global){
 'use strict';
 function db(){return global.LubricaCore?.State?.getDatabase?.()||null}
 function clean(v){return String(v??'').trim()}
 function round(v,d=2){const p=10**d;return Math.round((Number(v)||0)*p)/p}
 function parseQty(text,defaultUnit=''){return global.LubricaRouteUnits?.parse(text,defaultUnit)||null}
 function baseQty(q){const x=global.LubricaRouteUnits?.base(q);return x?{dimension:x.dim==='other'?x.base:x.dim,unit:x.unit,value:x.amount}:null}
 function inPeriod(run,{startDate='',endDate=''}={}){const date=String(run?.date||run?.completedAt||'').slice(0,10);return (!startDate||date>=startDate)&&(!endDate||date<=endDate)&&(!startDate&&!endDate||!!date)}
 function taskRows(run,route,d=db()){
   const E=global.LubricaChecklistEngine;
   const model=run?.routeSnapshot||E?.modelForRun?.(route,run,d)||null;
   return (model?.groups||[]).flatMap(g=>g.tasks||[]).map(x=>{
     const r=run?.executionFact?.tasks?.[x.taskId]||run?.taskResults?.[x.taskId]||{};
     const planned=parseQty(x.quantityPrimary||x.quantity||'');
     const actual=parseQty(r.actualQuantity??'',r.actualQuantityUnit||planned?.unit||'');
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
 function analyzeRun(run,route,d=db()){
   if(!run)return null;
   const rows=taskRows(run,route,d),total=rows.length;
   const completed=rows.filter(x=>x.status==='completed').length,skipped=rows.filter(x=>x.status==='skipped').length,notApplicable=rows.filter(x=>x.status==='not_applicable').length,pending=rows.filter(x=>x.status==='pending').length;
   const plannedMinutes=Number(run?.routeSnapshot?.estimatedMinutes ?? route?.estimatedMinutes ?? 0)||0;
   const rawActual=run.executionFact?.actualDurationMinutes??run.actualDurationMinutes,actualMinutes=Number(rawActual),actualKnown=rawActual!=null&&clean(rawActual)!==''&&Number.isFinite(actualMinutes)&&actualMinutes>=0;
   return {
     runId:run.id,executionNo:run.executionNo||'',routeId:run.routeId,routeRevision:run.routeRevision||route?.revision||1,date:run.date||'',performer:run.performer||'',shift:run.shift||'',status:run.status,
     plannedMinutes,actualMinutes:actualKnown?actualMinutes:null,timeDelta:actualKnown?actualMinutes-plannedMinutes:null,timeDeltaPercent:actualKnown&&plannedMinutes?round((actualMinutes-plannedMinutes)/plannedMinutes*100,1):null,
     tasks:{total,completed,skipped,notApplicable,pending,completionPercent:total?round(completed/total*100,1):0,resolvedPercent:total?round((completed+skipped+notApplicable)/total*100,1):0},
     materials:materialRows(rows),taskRows:rows
   };
 }
 function routeAnalysis(routeId,route=null,d=db(),period={}){
   if(!d)return{runs:[],summary:null};
   const runs=global.LubricaChecklistEngine?.routeRuns?.(routeId,d)?.filter(r=>r.status==='completed'&&inPeriod(r,period))||[];
   const analyzed=runs.map(r=>analyzeRun(r,route,d)).filter(Boolean),timeKnown=analyzed.filter(x=>x.actualMinutes!=null);
   const summary=analyzed.length?{
     executions:analyzed.length,
     avgPlannedMinutes:round(analyzed.reduce((s,x)=>s+x.plannedMinutes,0)/analyzed.length,1),
     avgActualMinutes:timeKnown.length?round(timeKnown.reduce((s,x)=>s+x.actualMinutes,0)/timeKnown.length,1):null,
     avgTimeDeltaPercent:timeKnown.filter(x=>x.timeDeltaPercent!=null).length?round(timeKnown.filter(x=>x.timeDeltaPercent!=null).reduce((s,x)=>s+x.timeDeltaPercent,0)/timeKnown.filter(x=>x.timeDeltaPercent!=null).length,1):null,
     completedTasks:analyzed.reduce((s,x)=>s+x.tasks.completed,0),skippedTasks:analyzed.reduce((s,x)=>s+x.tasks.skipped,0),notApplicableTasks:analyzed.reduce((s,x)=>s+x.tasks.notApplicable,0)
   }:null;
   return{runs:analyzed,summary};
 }
 global.LubricaRoutePlanFact=Object.freeze({analyzeRun,routeAnalysis,parseQty,baseQty,inPeriod});
})(window);