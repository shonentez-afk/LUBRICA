"use strict";
(function(global){
 function db(){return global.LubricaCore?.State?.getDatabase?.()||null}
 function clean(v){return String(v??'').trim()}
 function num(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null}
 function taskIdFromPoint(p){return String(p?.taskId||p?.id||'')}
 function unitKey(u){const x=clean(u).toLowerCase().replace(/³/g,'3').replace(/\s+/g,'');if(['г','гр','g'].includes(x))return{dim:'mass',base:'g',factor:1,label:'г'};if(['кг','kg'].includes(x))return{dim:'mass',base:'g',factor:1000,label:'кг'};if(['мл','ml','см3','см^3','cm3','cc'].includes(x))return{dim:'volume',base:'ml',factor:1,label:'мл'};if(['л','l','литр','литра','литров'].includes(x))return{dim:'volume',base:'ml',factor:1000,label:'л'};return x?{dim:'other',base:x,factor:1,label:clean(u)}:null}
 function fmt(n,d=2){return Number(n).toLocaleString('ru-RU',{maximumFractionDigits:d})}
 function demand(task){const q=task?.quantity||{},unit=clean(q.unit),u=unitKey(unit);let value=num(q.approved);if(value==null)value=num(q.calculated);if(u&&value!=null)return{amount:value*u.factor,dim:u.dim,base:u.base,source:'approved',raw:value,unit};if(/кач|ход|цикл|имп/.test(unit.toLowerCase())&&num(q.calculatedGrams)!=null)return{amount:num(q.calculatedGrams),dim:'mass',base:'g',source:'calculatedGrams',raw:num(q.calculatedGrams),unit:'г'};return null}
 function demandLabel(dim,amount,base){if(dim==='mass'){return amount>=1000?`${fmt(amount/1000,3)} кг`:`${fmt(amount,2)} г`}if(dim==='volume'){return amount>=1000?`${fmt(amount/1000,3)} л`:`${fmt(amount,2)} мл`}return`${fmt(amount,3)} ${base}`}
 function build(route,d=db()){
  if(!route||!d)return null;
  const checklist=global.LubricaChecklistEngine?.model?.(route,d);if(!checklist)return null;
  const taskMap=new Map((d.tasks||[]).map(t=>[String(t.id),t]));
  const materials=new Map(),tools=new Map(),errors=[],warnings=[];
  const routeReport=global.LubricaRouteEngine?.validateRoute?.(route.id,d);
  for(const x of routeReport?.errors||[])errors.push({code:x.code||'ROUTE_ERROR',message:x.message||'Ошибка маршрута',taskId:x.taskId||''});
  for(const x of routeReport?.warnings||[])warnings.push({code:x.code||'ROUTE_WARNING',message:x.message||'Предупреждение маршрута',taskId:x.taskId||''});
  const tasks=checklist.groups.flatMap(g=>g.tasks);
  for(const x of tasks){
   const t=taskMap.get(String(x.taskId))||{};
   const materialMode=clean(t.materialMode||'');
   const materialRequired=materialMode!==''&&materialMode!=='none';
   if(!clean(x.operation))errors.push({code:'OPERATION_MISSING',taskId:x.taskId,pointId:x.pointId,message:`${x.pointId}: не задано мероприятие/операция`});
   if(materialRequired&&!clean(x.materialName))errors.push({code:'MATERIAL_MISSING',taskId:x.taskId,pointId:x.pointId,message:`${x.pointId} · ${x.operation||x.taskId}: не назначен материал`});
   const dm=demand(t);
   if(materialRequired&&clean(x.materialName)&&!dm){warnings.push({code:'QUANTITY_NOT_AGGREGATABLE',taskId:x.taskId,pointId:x.pointId,message:`${x.pointId} · ${x.operation}: количество материала не задано числом или не может быть пересчитано`})}
   if(materialRequired&&!clean(x.toolName)&&!clean(x.toolCode))warnings.push({code:'TOOL_MISSING',taskId:x.taskId,pointId:x.pointId,message:`${x.pointId} · ${x.operation}: не назначено смазочное оборудование`});
   if(clean(x.materialName)){
    const matKey=clean(x.materialCode)||clean(x.materialName),dimKey=dm?`${dm.dim}:${dm.base}`:'unknown',key=`${matKey}|${dimKey}`;
    if(!materials.has(key))materials.set(key,{key,code:x.materialCode||'',name:x.materialName,dimension:dm?.dim||'unknown',baseUnit:dm?.base||'',total:0,taskIds:new Set(),pointIds:new Set(),unknownQty:0});
    const m=materials.get(key);m.taskIds.add(x.taskId);m.pointIds.add(x.pointId);if(dm)m.total+=dm.amount;else m.unknownQty++;
   }
   if(clean(x.toolName)||clean(x.toolCode)){
    const key=clean(x.toolCode)||clean(x.toolName);if(!tools.has(key))tools.set(key,{key,code:x.toolCode||'',name:x.toolName||'',taskIds:new Set(),pointIds:new Set(),calibrations:new Set()});
    const tool=tools.get(key);tool.taskIds.add(x.taskId);tool.pointIds.add(x.pointId);if(clean(x.toolCalibration))tool.calibrations.add(x.toolCalibration);
   }
  }
  if(route.status==='draft')warnings.push({code:'ROUTE_DRAFT',message:'Маршрут имеет статус «Черновик». Перед эксплуатацией проверьте и активируйте его.'});
  const materialRows=[...materials.values()].map(m=>({code:m.code,name:m.name,taskCount:m.taskIds.size,pointCount:m.pointIds.size,total:m.total,dimension:m.dimension,baseUnit:m.baseUnit,unknownQty:m.unknownQty,totalLabel:m.dimension==='unknown'?'Количество уточнить':demandLabel(m.dimension,m.total,m.baseUnit)}));
  const toolRows=[...tools.values()].map(t=>({code:t.code,name:t.name,taskCount:t.taskIds.size,pointCount:t.pointIds.size,calibrations:[...t.calibrations]}));
  const status=errors.length?'blocked':warnings.length?'warning':'ready';
  return{routeId:route.id,routeCode:route.code||route.id,title:route.name||route.id,status,ready:errors.length===0,complete:errors.length===0&&warnings.length===0,pointCount:checklist.pointCount||0,taskCount:checklist.taskCount||tasks.length,estimatedMinutes:checklist.estimatedMinutes||route.estimatedMinutes||0,materials:materialRows,tools:toolRows,errors,warnings,generatedAt:new Date().toISOString()};
 }
 function statusLabel(status){return status==='ready'?'Готов к выполнению':status==='warning'?'Готов с предупреждениями':'Требует исправления'}
 global.LubricaRoutePreparation=Object.freeze({build,statusLabel,demand,demandLabel});
 global.LubricaSystem?.registerModule?.('Подготовка маршрута','ok','Материалы, оборудование и готовность к выполнению');
})(window);
