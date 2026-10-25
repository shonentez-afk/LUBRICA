"use strict";
function renderWorkspaceNavigator(){
  const lineSel=$("#lineScopeSelect"),areaSel=$("#areaScopeSelect"),loc=$("#mapLocationText");
  if(!lineSel||!areaSel)return;
  const selectedLine=scope.startsWith("line:")?scope.slice(5):scope==="line1"?"Линия 1":scope==="line2"?"Линия 2":"all";
  const selectedArea=scope.startsWith("area:")?scope.slice(5):(!scope.startsWith("line")&&scope!=="all"?(SCOPE_LABELS[scope]||scope):"all");
  const lines=workspaceLines();
  lineSel.innerHTML='<option value="all">Все линии</option>'+lines.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  lineSel.value=lines.includes(selectedLine)?selectedLine:"all";
  const areas=workspaceAreas(lineSel.value);
  areaSel.innerHTML='<option value="all">Все участки</option>'+areas.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  areaSel.value=areas.includes(selectedArea)?selectedArea:"all";
  const lineText=lineSel.value==="all"?"Все линии":lineSel.value;
  const areaText=areaSel.value==="all"?"Все участки":areaSel.value;
  if(loc)loc.textContent=`${lineText} · ${areaText}`;
}
function applyWorkspaceScope(){
  const line=$("#lineScopeSelect")?.value||"all",area=$("#areaScopeSelect")?.value||"all";
  if(area!=="all")scope=`area:${area}`;
  else if(line!=="all")scope=`line:${line}`;
  else scope="all";
  selectedRows.clear();renderAll();
}
function monthlyFactor(interval){const text=String(interval||"").toLowerCase().replace(",","."),n=parseFloat(text)||1;if(/час|ч\s*\/|наработ/.test(text))return 0;if(/дн|сут/.test(text))return 30/n;if(/нед/.test(text))return 4.345/n;if(/мес/.test(text))return 1/n;if(/год/.test(text))return 1/(12*n);return 0}
function renderMetrics(){const p=state.points,ready=p.filter(x=>x.status==="ready").length;const pointCount=uniquePointCount(p);$("#metricTotal").textContent=pointCount;const mt=$("#metricTasks");if(mt)mt.textContent=`${p.length} мероприятий`;$("#metricReady").textContent=ready;$("#metricReview").textContent=p.filter(x=>x.status==="review").length;$("#metricIssues").textContent=p.filter(x=>x.status==="issue").length;$("#metricReady").nextElementSibling.textContent=`${p.length?Math.round(ready/p.length*100):0}% мероприятий проверено`;const totals={g:0,ml:0,l:0};p.forEach(x=>{const q=parseFloat(String(x.qty||"").replace(",",".")),f=monthlyFactor(x.interval),u=String(x.measure||"").toLowerCase();if(Number.isFinite(q)&&f&&totals[u]!==undefined)totals[u]+=q*f});const parts=[];if(totals.g)parts.push(`${(totals.g/1000).toLocaleString("ru-RU",{maximumFractionDigits:2})} кг`);if(totals.ml)parts.push(`${(totals.ml/1000).toLocaleString("ru-RU",{maximumFractionDigits:2})} л`);if(totals.l)parts.push(`${totals.l.toLocaleString("ru-RU",{maximumFractionDigits:2})} л`);$("#metricDemand").textContent=parts.join(" + ")||"—";$("#metricMaterials").textContent=`${new Set(p.map(x=>x.material).filter(Boolean)).size} материалов · без интервалов по наработке`}

function scopeCount(s){return state.points.filter(p=>s==="line1"?p.line==="Линия 1":s==="line2"?p.line==="Линия 2":p.scope===s).length}
function renderTree(){const counts={all:state.points.length,line1:scopeCount("line1"),line2:scopeCount("line2"),silos:scopeCount("silos"),cupola:scopeCount("cupola"),forming:scopeCount("forming"),saw:scopeCount("saw"),pack:scopeCount("pack")};$$('.tree-row').forEach(r=>{r.classList.toggle("selected",r.dataset.scope===scope);const em=r.querySelector("em");if(em)em.textContent=counts[r.dataset.scope]??0})}
function renderTable(){
  const rows=visiblePoints(),tbody=$("#pointsBody");
  const groups=[],byPoint=new Map();
  rows.forEach(p=>{
    const key=String(p.lubricationPointId||pointDisplayId(p)||p.id||taskKey(p));
    let g=byPoint.get(key);
    if(!g){g={key,rows:[]};byPoint.set(key,g);groups.push(g)}
    g.rows.push(p);
  });
  tbody.innerHTML=rows.length?groups.map(g=>g.rows.map((p,index)=>{
    const span=g.rows.length,first=index===0;
    const shared=first?`
      <td class="point-code point-group-cell" rowspan="${span}">
        <strong>${esc(pointDisplayId(p))}</strong>
        <small>${esc(p.pointName||p.component||"")}</small>
        ${span>1?`<span class="point-task-count">${span} мер.</span>`:""}
      </td>
      <td class="location-cell point-group-cell" rowspan="${span}">
        <strong>${esc(p.line||"—")}</strong>
        <small>${esc(p.area||SCOPE_LABELS[p.scope]||p.scope||"—")}</small>
      </td>
      <td data-col="type" class="point-group-cell" rowspan="${span}">
        <span class="type-badge ${p.type}">${TYPE_ICONS[p.type]||"◆"} ${TYPE_LABELS[p.type]||"Другое"}</span>
      </td>
      <td class="equipment point-group-cell" rowspan="${span}">
        <strong>${esc(p.equipment)}</strong>
        <small>${esc(p.unit)} · ${esc(p.position)}</small>
      </td>`:"";
    return `<tr data-id="${esc(taskKey(p))}" data-point-group="${esc(g.key)}" class="${first?"point-group-start ":""}${selectedId===taskKey(p)?"active":""}">
      <td><input class="row-check" type="checkbox" ${selectedRows.has(taskKey(p))?"checked":""}></td>
      ${shared}
      <td class="operation-cell"><strong>${esc(p.operation||"Не задано")}</strong><small>${esc(p.strategy||"")}</small></td>
      <td data-col="material">${p.material?esc(p.material):'<span class="missing">Не назначен</span>'}</td>
      <td>${esc(p.interval)}</td>
      <td data-col="qty">${p.qty!=null&&String(p.qty).trim()!==''?`${esc(p.qty)} ${p.qty==="до уровня"?"":esc(p.measure)}`:(p.calculatedQty!=null&&String(p.calculatedQty).trim()!==''?`<span class="calculated-value">${esc(p.calculatedQty)} ${esc(p.measure)}<small>расч.</small></span>`:'')}</td>
      <td><span class="status-pill ${p.status}">${STATUS_LABELS[p.status]}</span></td>
    </tr>`
  }).join("")).join(""):`<tr><td colspan="10"><div class="empty-table"><b>Мероприятия не найдены</b><span>Измените фильтры или добавьте новую точку/мероприятие.</span></div></td></tr>`;
  hiddenColumns.forEach(c=>$$(`[data-col="${c}"]`).forEach(x=>x.classList.add("col-hidden")));
  $("#visibleCount").textContent=rows.length;
  $("#footerText").textContent=`Показано ${rows.length} мероприятий из ${state.points.length} · ${uniquePointCount(rows)} точек смазки`;
  const all=$("#selectAll"),selectedVisible=rows.filter(p=>selectedRows.has(taskKey(p))).length;
  all.checked=rows.length>0&&selectedVisible===rows.length;
  all.indeterminate=selectedVisible>0&&selectedVisible<rows.length;
  tbody.querySelectorAll("tr[data-id]").forEach(tr=>{
    tr.onclick=e=>{
      if(e.target.closest("input"))return;
      selectedId=tr.dataset.id;
      $("#detailPanel").classList.remove("hidden");
      $(".workbench")?.classList.remove("detail-closed");
      renderTable();
      fillDetail()
    };
    tr.querySelector(".row-check").onchange=e=>{
      e.target.checked?selectedRows.add(tr.dataset.id):selectedRows.delete(tr.dataset.id);
      updateBulkButton();
      renderTable()
    }
  })
}

function current(){return state.points.find(p=>taskKey(p)===selectedId||p.id===selectedId)}
function bindingForCurrent(){
  const db=window.LubricaCore?.State?.getDatabase();
  if(!db)return null;
  const task=(db.tasks||[]).find(t=>String(t.id)===String(selectedId)||String(t.legacy?.id||'')===String(selectedId));
  const lp=task&&(db.lubricationPoints||[]).find(x=>x.id===task.lubricationPointId);
  const eq=lp&&(db.equipment||[]).find(x=>x.id===lp.equipmentId);
  const node=lp&&(db.nodes||[]).find(x=>x.id===lp.nodeId);
  return {db,task,lp,eq,node};
}
function setSingleOption(selectEl,value,label){if(!selectEl)return;selectEl.innerHTML=`<option value="${esc(value||'')}">${esc(label||'—')}</option>`;selectEl.value=value||''}
function taskOperationsForType(type){return window.LubricaStructureContext?.operationOptions?.(type)||['Смазочное обслуживание','Контроль состояния']}
function fillDetail(){return window.LubricaTaskEditor?.fillDetail?.()}
function renderTaskSiblings(p){const bar=$("#taskSiblingBar");if(!bar)return;const pointId=p.lubricationPointId;const siblings=state.points.filter(x=>(x.lubricationPointId||pointDisplayId(x))===(pointId||pointDisplayId(p)));bar.innerHTML=`<span>Мероприятия точки</span><div>${siblings.map(x=>`<button class="task-chip ${taskKey(x)===selectedId?'active':''}" data-task="${esc(taskKey(x))}">${esc(x.operation||"Без названия")}</button>`).join('')}<button class="task-chip add" data-add-task>＋</button></div>`;bar.querySelectorAll('[data-task]').forEach(btn=>btn.onclick=()=>{selectedId=btn.dataset.task;renderTable();fillDetail()});bar.querySelector('[data-add-task]')?.addEventListener('click',()=>window.LubricaStructure?.addTaskForTask?.(taskKey(p)))}

function readForm(){const p=current(),bind=bindingForCurrent();return p?{...p,equipment:bind?.eq?.name||p.equipment,unit:bind?.node?.name||p.unit,position:bind?.eq?.externalCode||p.position,type:$("#fType").value,operation:$("#fOperation").value,material:$("#fMaterial").value.trim(),qty:$("#fQuantity").value.trim(),measure:$("#fUnitMeasure").value,strategy:$("#fStrategy").value,interval:$("#fInterval").value.trim()}:null}
function savePoint(){return window.LubricaTaskEditor?.savePoint?.()}
function duplicateTask(p){if(!p)return;const db=window.LubricaCore?.State?.getDatabase?.();if(!db){toast('База недоступна','error');return}const source=(db.tasks||[]).find(t=>String(t.id)===String(taskKey(p)));if(!source){toast('Мероприятие не найдено в базе','warn');return}const id=window.LubricaCore?.IDs?.nextFrom(db.tasks,'TASK',6)||`TASK-${String(db.tasks.length+1).padStart(6,'0')}`;db.tasks.push({...clone(source),id,verified:false,approvalStatus:'review',source:'Дублирование мероприятия',origin:'manual',legacyManaged:true,legacy:null});window.LubricaCore.State.setDatabase(db);refreshFromCore();selectedId=id;renderAll();toast('Мероприятие продублировано')}
function addPoint(copyFrom=null){if(!copyFrom){window.LubricaStructure?.openPointWizard?.();return}const p={...clone(copyFrom),id:nextId(),verified:false,status:"review",source:"Дублирование"};state.points.push(p);selectedId=p.id;persist("Копия точки создана");renderAll();$("#detailPanel").classList.remove("hidden")}

function detachCandidatePointReference(db,pointId){
  const point=(db.lubricationPoints||[]).find(lp=>String(lp.id)===String(pointId));if(!point)return;
  const origin=String(point.candidateOriginKey||''),m=origin.match(/^(component|equipment):([^:]+)/);if(!m)return;
  if(m[1]==='component'){const r=(db.components||[]).find(v=>String(v.id)===m[2]);if(r?.candidateCreatedPointIds)r.candidateCreatedPointIds=r.candidateCreatedPointIds.filter(x=>String(x)!==String(pointId));}
  else{const r=(db.equipment||[]).find(v=>String(v.id)===m[2]);if(r?.maintenanceCreatedPointIds)r.maintenanceCreatedPointIds=r.maintenanceCreatedPointIds.filter(x=>String(x)!==String(pointId));}
}
function confirmDelete(id){
  const p=state.points.find(x=>taskKey(x)===id||x.id===id),taskId=p?taskKey(p):id;
  const db=window.LubricaCore?.State?.getDatabase?.();if(!db)return toast('База недоступна','error');
  const task=(db.tasks||[]).find(t=>String(t.id)===String(taskId));
  const pointId=task?.lubricationPointId||p?.lubricationPointId||'';
  const routeRefs=(db.routes||[]).filter(r=>(r.taskIds||[]).some(x=>String(x)===String(taskId)));
  const runRefs=(db.checklistRuns||[]).filter(r=>(r.routeTaskIds||[]).some(x=>String(x)===String(taskId))||r.taskResults?.[taskId]);
  const revisionRefs=(db.routeRevisions||[]).filter(r=>(r.snapshot?.taskIds||[]).some(x=>String(x)===String(taskId)));
  if(routeRefs.length||runRefs.length||revisionRefs.length){
    openAction('Удаление недоступно',`Мероприятие связано с маршрутами или историей выполнения. Сначала исключите его из текущих маршрутов; исторические ревизии и выполненные работы удалять нельзя.`,[{label:'Закрыть',kind:'ghost'}]);return;
  }
  const siblings=(db.tasks||[]).filter(t=>String(t.lubricationPointId)===String(pointId)&&String(t.id)!==String(taskId));
  const removePoint=!!pointId&&siblings.length===0;
  const text=removePoint?`Это последнее мероприятие точки «${p?.pointName||p?.component||pointId}». После удаления мероприятия пустая физическая точка также будет удалена из Структуры.`:`Мероприятие «${p?.operation||taskId}» будет удалено. Физическая точка и остальные её мероприятия останутся.`;
  openAction(removePoint?'Удалить последнее мероприятие и точку?':'Удалить мероприятие?',text,[{label:'Отмена',kind:'ghost'},{label:removePoint?'Удалить мероприятие и точку':'Удалить мероприятие',kind:'danger',run:()=>{
    const live=window.LubricaCore?.State?.getDatabase?.();if(!live)return toast('База недоступна','error');
    live.tasks=(live.tasks||[]).filter(t=>String(t.id)!==String(taskId));
    if(removePoint){detachCandidatePointReference(live,pointId);live.lubricationPoints=(live.lubricationPoints||[]).filter(lp=>String(lp.id)!==String(pointId));}
    window.LubricaCore.State.setDatabase(live);refreshFromCore();selectedRows.delete(taskId);selectedId=state.points[0]?taskKey(state.points[0]):null;renderAll();toast(removePoint?'Мероприятие и пустая точка удалены':'Мероприятие удалено')
  }}])
}
function updateBulkButton(){const b=$("#bulkBtn");b.textContent=selectedRows.size?`Изменить выбранные (${selectedRows.size})`:"Групповое изменение"}
function bulkEdit(){return window.LubricaBulkEdit?.bulkEdit?.()}
function openAction(title,text,buttons,body=""){const d=$("#actionDialog");d.innerHTML=`<form method="dialog"><div class="dialog-head"><div><span class="eyebrow">ДЕЙСТВИЕ</span><h2>${esc(title)}</h2></div><button class="icon-btn" value="cancel">×</button></div><p class="dialog-copy">${esc(text)}</p><div class="dialog-fields">${body}</div><menu></menu></form>`;const menu=d.querySelector("menu");buttons.forEach(x=>{const b=document.createElement("button");b.className=`btn ${x.kind||"ghost"}`;b.textContent=x.label;b.value="default";b.onclick=e=>{if(x.run){e.preventDefault();const result=x.run();if(result!==false)d.close()}};menu.appendChild(b)});d.showModal()}


window.LubricaWorkspaceNavigation=Object.freeze({
 openTask(id){
  const key=String(id||'');if(!key)return false;
  refreshFromCore();const hit=state.points.find(p=>String(taskKey(p))===key||String(p.id)===key);if(!hit)return false;
  selectedId=taskKey(hit);renderAll();document.getElementById('detailPanel')?.classList.remove('hidden');return true;
 },
 openPoint(id){
  const key=String(id||'');if(!key)return false;
  refreshFromCore();const hit=state.points.find(p=>String(p.lubricationPointId||pointDisplayId(p)||p.id)===key);if(!hit)return false;
  selectedId=taskKey(hit);renderAll();document.getElementById('detailPanel')?.classList.remove('hidden');return true;
 }
});
