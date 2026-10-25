(function(global){
'use strict';
const C=global.LubricaStructureContext;
const Tree=global.LubricaStructureTree;
const Detail=global.LubricaStructureDetail;
const Dialogs=global.LubricaEntityDialogs;
const Wizard=global.LubricaPointWizard;
const S=global.LubricaStructure=global.LubricaStructure||{};
function render(){const d=C.db();if(!d)return;Tree.renderSummary(d);Tree.renderTree(d);Detail.render(d)}

function componentReferencedByPoint(d,component){const id=String(component?.id||'');if(!id)return false;return (d.lubricationPoints||[]).some(p=>String(p.componentBinding?.sourceComponentId||'')===id||String(p.candidateOriginKey||'').startsWith(`component:${id}:`))}
function safelyDiscardableImportedComponents(d,equipmentId){const components=(d.components||[]).filter(v=>String(v.equipmentId)===String(equipmentId));if(!components.length)return [];const allowed=new Set(['rejected','excluded']);return components.every(c=>c.origin==='import'&&allowed.has(String(c.candidateState||''))&&!componentReferencedByPoint(d,c))?components:null}

function detachCandidatePointReference(d,point){
 const id=String(point?.id||'');if(!id)return;
 const origin=String(point?.candidateOriginKey||'');const m=origin.match(/^(component|equipment):([^:]+)/);if(!m)return;
 if(m[1]==='component'){
  const r=(d.components||[]).find(v=>String(v.id)===m[2]);if(r?.candidateCreatedPointIds)r.candidateCreatedPointIds=r.candidateCreatedPointIds.filter(x=>String(x)!==id);
 }else{
  const r=(d.equipment||[]).find(v=>String(v.id)===m[2]);if(r?.maintenanceCreatedPointIds)r.maintenanceCreatedPointIds=r.maintenanceCreatedPointIds.filter(x=>String(x)!==id);
 }
}
function deletionBlockers(d,type,x){
 const out=[];
 if(type==='plant'&&(d.lines||[]).some(v=>v.plantId===x.id))out.push('в заводе есть линии');
 if(type==='line'&&((d.areas||[]).some(v=>v.lineId===x.id)||(d.equipment||[]).some(v=>v.lineId===x.id)))out.push('в линии есть участки или оборудование');
 if(type==='area'&&(d.equipment||[]).some(v=>v.areaId===x.id))out.push('в участке есть оборудование');
 if(type==='equipment'){
  if((d.equipment||[]).some(v=>v.parentEquipmentId===x.id))out.push('есть дочернее оборудование');
  if((d.nodes||[]).some(v=>v.equipmentId===x.id))out.push('есть узлы');
  if((d.lubricationPoints||[]).some(v=>v.equipmentId===x.id))out.push('есть точки смазки');
  const comps=(d.components||[]).filter(v=>v.equipmentId===x.id);
  if(comps.length&&safelyDiscardableImportedComponents(d,x.id)===null)out.push('есть рабочие или связанные импортированные компоненты');
 }
 if(type==='node'){
  if((d.nodes||[]).some(v=>v.parentNodeId===x.id))out.push('есть дочерние узлы');
  if((d.lubricationPoints||[]).some(v=>v.nodeId===x.id))out.push('есть точки смазки');
 }
 if(type==='lubricationPoint'&&(d.tasks||[]).some(v=>v.lubricationPointId===x.id))out.push('в точке есть мероприятия');
 if(type==='task'){
  if((d.routes||[]).some(r=>(r.taskIds||[]).some(id=>String(id)===String(x.id))))out.push('мероприятие включено в текущий маршрут');
  if((d.routeRevisions||[]).some(r=>(r.snapshot?.taskIds||[]).some(id=>String(id)===String(x.id))))out.push('мероприятие присутствует в истории ревизий');
  if((d.checklistRuns||[]).some(r=>(r.routeTaskIds||[]).some(id=>String(id)===String(x.id))||r.taskResults?.[x.id]))out.push('мероприятие присутствует в истории выполнения');
 }
 return out;
}
function deleteSelected(){
 const d=C.db(),x=C.entity(d),type=C.selected.type;if(!d||type==='project'||!x){global.LubricaApp?.showToast('Сначала выберите элемент структуры','warn');return}
 const blockers=deletionBlockers(d,type,x);
 if(blockers.length){global.LubricaApp?.showToast(`Удаление невозможно: ${blockers.join('; ')}. Сначала удалите или отвяжите дочерние данные.`,'warn');return}
 const label=C.labels[type]||'Элемент',name=x.name||x.operation||x.id;
 const disposable=type==='equipment'?safelyDiscardableImportedComponents(d,x.id):[];
 const suffix=disposable?.length?`\n\nВместе с оборудованием будут удалены ${disposable.length} импортир. компонент(а), которые уже отклонены/исключены и нигде не используются.`:'';
 const ok=global.confirm?.(`Удалить ${label.toLowerCase()} «${name}»?${suffix}

Действие нельзя отменить.`);
 if(!ok)return;
 if(type==='equipment'&&disposable?.length){
  const ids=new Set(disposable.map(v=>String(v.id)));
  d.components=(d.components||[]).filter(v=>!ids.has(String(v.id)));
 }
 const key={plant:'plants',line:'lines',area:'areas',equipment:'equipment',node:'nodes',lubricationPoint:'lubricationPoints',task:'tasks'}[type];
 if(type==='lubricationPoint')detachCandidatePointReference(d,x);
 d[key]=(d[key]||[]).filter(v=>String(v.id)!==String(x.id));
 C.selected={type:'project',id:null};
 C.save(d,disposable?.length?`${label} удалён вместе с ${disposable.length} отклонёнными импортированными компонентами`:`${label} удалён`);
}

function bind(){
 document.getElementById('addPlantBtn')?.addEventListener('click',()=>{const d=C.db();if(!d)return;if((d.plants||[]).length){global.LubricaApp?.showToast('В одной JSON-базе используется один завод. Выберите его в дереве и нажмите «Изменить».','warn');C.selected={type:'plant',id:d.plants[0].id};render();return}Dialogs.open('plant',null)});
 document.getElementById('structureAddBtn')?.addEventListener('click',()=>{const d=C.db();if(!d)return;if(C.selected.type==='project'&&!(d.plants||[]).length){Dialogs.open('plant',null);return}if(C.selected.type==='project'&&(d.plants||[]).length)C.selected={type:'plant',id:d.plants[0].id};const child=C.defaultChildType(C.selected.type);child==='lubricationPoint'?Wizard.open():Dialogs.open(child,null)});
 document.getElementById('structureEditBtn')?.addEventListener('click',()=>{const d=C.db(),x=C.entity(d);if(C.selected.type==='project'||!x){global.LubricaApp?.showToast('Сначала выберите объект структуры','warn');return}C.selected.type==='lubricationPoint'?Wizard.open(x):Dialogs.open(C.selected.type,x)});
 document.getElementById('structureSearch')?.addEventListener('input',()=>Tree.renderTree(C.db()));
 document.getElementById('structureExpandBtn')?.addEventListener('click',e=>{const d=C.db();if(!d)return;const expandable=[];(d.plants||[]).forEach(x=>expandable.push(`plant:${x.id}`));d.lines.forEach(x=>expandable.push(`line:${x.id}`));d.areas.forEach(x=>expandable.push(`area:${x.id}`));d.equipment.forEach(x=>expandable.push(`equipment:${x.id}`));d.nodes.forEach(x=>expandable.push(`node:${x.id}`));d.lubricationPoints.forEach(x=>expandable.push(`lubricationPoint:${x.id}`));const allOpen=expandable.length>0&&expandable.every(k=>C.expandedKeys.has(k));if(allOpen)C.expandedKeys.clear();else expandable.forEach(k=>C.expandedKeys.add(k));e.currentTarget.textContent=allOpen?'Развернуть всё':'Свернуть всё';Tree.renderTree(d)});
}
S.selectEntity=function(type,id){const d=C.db();if(!d)return;C.selected={type,id};if(type==='equipment'){const e=C.byId(d.equipment,id);if(e){C.expandedKeys.add(`equipment:${e.id}`);let cur=e;while(cur?.parentEquipmentId){cur=C.byId(d.equipment,cur.parentEquipmentId);if(cur)C.expandedKeys.add(`equipment:${cur.id}`)}const area=C.byId(d.areas,e.areaId);if(area){C.expandedKeys.add(`area:${area.id}`);const line=C.byId(d.lines,area.lineId);if(line){C.expandedKeys.add(`line:${line.id}`);const plant=C.byId(d.plants,line.plantId);if(plant)C.expandedKeys.add(`plant:${plant.id}`)}}}}render()};
S.render=render;S.deleteSelected=deleteSelected;S.deletionBlockers=deletionBlockers;S.openDialog=Dialogs.open;S.openPointWizard=Wizard.open;S.editPointForTask=Wizard.editPointForTask;S.editEquipmentForTask=Wizard.editEquipmentForTask;S.addTaskForPoint=Wizard.addTaskForPoint;S.addTaskForTask=Wizard.addTaskForTask;
document.addEventListener('DOMContentLoaded',bind,{once:true});
})(window);
