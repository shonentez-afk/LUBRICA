"use strict";
/*
 * Stage R2 — compact route execution by physical point.
 * Pure presentation: the canonical task IDs, checklist snapshots, result engine,
 * operation templates and document/print formats remain untouched.
 */
(function(global){
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const arr=value=>Array.isArray(value)?value:[];
 const clean=value=>String(value??'').trim();
 function visits(model){
  const items=[];let last=null;
  for(const group of arr(model?.groups)){
   for(const task of arr(group.tasks)){
    const key=String(task.pointKey||task.pointId||task.taskId||'');
    const step=String(task.routeStep||items.length+1);
    if(!last||last.pointKey!==key||last.step!==step){
     last={pointKey:key,step,pointId:task.pointId||'',pointName:task.pointName||'',
      equipmentCode:group.equipmentCode||task.equipmentCode||'',equipment:group.equipment||task.equipment||'',
      node:group.node||task.node||'',tasks:[]};
     items.push(last);
    }
    last.tasks.push(task);
   }
  }
  return items;
 }
 function resultFor(run,taskId){return run?.taskResults?.[String(taskId)]||{}}
 function taskState(run,taskId){const r=resultFor(run,taskId);
  if(r.done===true)return'completed';
  if(r.resultStatus==='skipped')return'skipped';
  if(r.resultStatus==='not_applicable')return'not_applicable';
  return'pending';
 }
 function summary(visit,run){
  const value={done:0,skipped:0,pending:0,needsReason:0,total:visit.tasks.length};
  for(const task of visit.tasks){
   const state=taskState(run,task.taskId),r=resultFor(run,task.taskId);
   if(state==='completed')value.done++;
   else if(state==='pending')value.pending++;
   else{value.skipped++;if(!clean(r.deviationReason))value.needsReason++}
  }
  value.state=value.pending?'pending':value.skipped?'deviation':'completed';
  return value;
 }
 function statusSelect(id,state,editable){
  const options=[['pending','Не выполнено'],['completed','Выполнено'],['skipped','Пропущено'],['not_applicable','Не требуется']];
  return '<select data-task-result="'+esc(id)+'" aria-label="Результат мероприятия"'+(editable?'':' disabled')+'>'+
   options.map(x=>'<option value="'+x[0]+'"'+(x[0]===state?' selected':'')+'>'+x[1]+'</option>').join('')+'</select>';
 }
 function taskRow(task,run,editable){
  const id=String(task.taskId),r=resultFor(run,id),state=taskState(run,id);
  const deviation=state==='skipped'||state==='not_applicable',reasonMissing=deviation&&!clean(r.deviationReason);
  const operation=clean(task.operation)||'Мероприятие не задано';
  const material=clean(task.materialName)||'Не назначен',materialCode=clean(task.materialCode);
  const tool=clean(task.toolName)||'Не назначен',toolCode=clean(task.toolCode);
  const amount=clean(task.quantityPrimary)||clean(task.quantity)||'—';
  const steps=arr(task.steps);
  return '<div class="route-visit-task '+state+'" data-check-task="'+esc(id)+'">'+
   '<div class="route-visit-task-head"><div><strong>'+esc(operation)+'</strong><small>Мероприятие '+esc(id)+'</small></div>'+
   '<span class="route-task-state '+state+'">'+(state==='completed'?'Выполнено':state==='skipped'?'Пропущено':state==='not_applicable'?'Не требуется':'Ожидает')+'</span></div>'+
   '<div class="route-visit-task-facts">'+
    '<div><span>Материал</span><b>'+esc(materialCode||material)+'</b>'+(materialCode&&materialCode!==material?'<small>'+esc(material)+'</small>':'')+'</div>'+
    '<div><span>Смазочное оборудование</span><b>'+esc(toolCode||tool)+'</b>'+(toolCode&&toolCode!==tool?'<small>'+esc(tool)+'</small>':'')+'</div>'+
    '<div class="route-visit-planned"><span>Плановая норма</span><b>'+esc(amount)+'</b>'+(task.equipmentQuantity?'<small>'+esc(task.equipmentQuantity)+'</small>':'')+'</div>'+
   '</div>'+
   '<div class="route-visit-task-inputs">'+
    '<label>Результат'+statusSelect(id,state,editable)+'</label>'+
    '<label>Фактическое количество<input data-task-actual-quantity="'+esc(id)+'" value="'+esc(r.actualQuantity||'')+'"'+(editable?'':' disabled')+' placeholder="Укажите факт"></label>'+
    (task.dueEntry?.kind==='runtime_hours'?'<label class="route-meter-fact">Моточасы при обслуживании<input type="number" min="0" step="any" data-task-meter="'+esc(id)+'" value="'+esc(r.runtimeMeterHours??'')+'"'+(editable?'':' disabled')+'><small>Порог '+esc(task.dueEntry.nextHours)+' ч. Факт обязателен для выполненного мероприятия.</small></label>':'')+
    '<label class="route-visit-notes'+(reasonMissing?' reason-required':'')+'">'+(deviation?'Причина отклонения *':'Наблюдения / выявленные дефекты')+
     '<textarea data-task-observation="'+esc(id)+'"'+(editable?'':' disabled')+' placeholder="'+(deviation?'Обязательно укажите причину':'При необходимости добавьте замечания')+'">'+esc(r.observations||r.deviationReason||'')+'</textarea>'+
     (reasonMissing?'<small class="route-visit-warning">Для завершения маршрута необходимо указать причину.</small>':'')+'</label>'+
   '</div>'+
   (steps.length?'<details class="route-visit-procedure"><summary>'+esc(task.templateTitle||'Порядок выполнения')+'</summary><ol>'+
    steps.map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol></details>':'')+
   '</div>';
 }
 function statusLabel(s){
  return s.state==='pending'?'В работе / не начата':s.state==='deviation'?'Есть отклонения':'Выполнено';
 }
 function render(model,{run=null,editable=false,filter='all'}={}){
  const all=visits(model),withStatus=all.map(visit=>({...visit,summary:summary(visit,run)}));
  const pending=withStatus.filter(x=>x.summary.pending>0).length;
  const deviations=withStatus.filter(x=>x.summary.skipped>0).length;
  const done=withStatus.filter(x=>x.summary.pending===0).length;
  const filterValues=['all','pending','deviations','resolved'];
  if(!filterValues.includes(filter))filter='all';
  const shown=withStatus.filter(x=>filter==='all'||(filter==='pending'&&x.summary.pending>0)||
   (filter==='deviations'&&x.summary.skipped>0)||(filter==='resolved'&&x.summary.pending===0));
  const select='<label class="route-visit-filter">Показать точки<select data-route-visit-filter aria-label="Фильтр физических точек маршрута">'+
   [['all','Все · '+withStatus.length],['pending','Не обработаны · '+pending],['deviations','С отклонениями · '+deviations],['resolved','Обработаны · '+done]]
    .map(x=>'<option value="'+x[0]+'"'+(filter===x[0]?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></label>';
  const controls='<div class="route-visit-toolbar no-print"><div><strong>Обход по физическим точкам</strong>'+
   '<small>Идём по маршруту сверху вниз. Внутри каждой точки — все назначенные мероприятия.</small></div>'+
   '<div class="route-visit-toolbar-actions">'+select+
   '<button type="button" class="btn secondary" data-route-find-pending'+(pending?'':' disabled')+'>Найти необработанную</button></div></div>';
  const cards=shown.map(visit=>{
   const s=visit.summary;
   return '<section class="route-visit-card '+s.state+'" data-route-visit="'+esc(visit.pointKey)+'" data-route-visit-state="'+s.state+'">'+
    '<header class="route-visit-card-head"><span class="route-visit-step">'+esc(visit.step)+'</span>'+
     '<div class="route-visit-identification"><small>'+esc(visit.equipmentCode||'№ не указан')+' · '+esc(visit.equipment||'Оборудование')+
     (visit.node?' · '+esc(visit.node):'')+'</small><strong>'+esc(visit.pointName||'Физическая точка')+'</strong>'+
     '<span>ID точки: '+esc(visit.pointId||visit.pointKey)+'</span></div>'+
     '<div class="route-visit-point-status"><b>'+statusLabel(s)+'</b><small>'+s.done+' выполнено · '+s.skipped+' пропущено · '+s.pending+' осталось</small></div></header>'+
    '<div class="route-visit-activities">'+visit.tasks.map(task=>taskRow(task,run,editable)).join('')+'</div>'+
    '</section>';
  }).join('');
  return '<div class="route-visit-workspace">'+controls+
   '<div class="route-visit-list">'+(cards||'<div class="route-empty"><b>В выбранном фильтре точек нет</b><span>Измените фильтр, чтобы показать остальные точки маршрута.</span></div>')+'</div>'+
   '</div>';
 }
 global.LubricaRouteCompactUI=Object.freeze({visits,summary,taskState,render});
 global.LubricaSystem?.registerModule?.('Компактный обход маршрута','ok','Физические точки, мероприятия, факт и отклонения');
})(window);
