"use strict";
/* Release 1.0.22 — analog transfer selection-context fix. */
(function(global){
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s||'').toUpperCase().replace(/[\s_\-–—/]+/g,'').replace(/[^A-ZА-ЯЁ0-9]/g,'');
  const byId=(arr,id)=>(arr||[]).find(x=>String(x.id)===String(id));
  const toast=(m,t='info')=>global.LubricaApp?.showToast?.(m,t)||global.toast?.(m,t);
  function db(){return global.LubricaCore?.State?.getDatabase?.()}
  function currentTask(context={}){
    const d=db();if(!d)return null;
    const id=context.taskId||global.selectedId||document.getElementById('fillFromAnalogBtn')?.dataset?.taskId||'';
    return (d.tasks||[]).find(t=>String(t.id)===String(id)||String(t.legacy?.id||'')===String(id))||null;
  }
  function currentPoint(context={}){
    const d=db();if(!d)return null;
    const directId=context.pointId||document.getElementById('fillFromAnalogBtn')?.dataset?.pointId||'';
    if(directId){const direct=byId(d.lubricationPoints,directId);if(direct)return direct}
    const t=currentTask(context);return t?byId(d.lubricationPoints,t.lubricationPointId):null;
  }
  function designation(point){
    if(!point)return'';
    const b=point.bearing||{};
    const bind=point.componentBinding||{};
    const linked=global.LubricaComponentBinding?.entryById?.(bind.actualLibraryEntryId||bind.libraryEntryId,bind.libraryCategory||'bearing');
    return b.actualDesignation||b.effectiveDesignation||linked?.designation||linked?.model||b.baseDesignation||b.structuralDesignation||'';
  }
  function signature(point){
    const bind=point?.componentBinding||{};
    const lib=bind.actualLibraryEntryId||bind.libraryEntryId||point?.bearing?.catalogId||'';
    return lib?`LIB:${String(lib)}`:`DES:${norm(designation(point))}`;
  }
  function sameModel(a,b){const sa=signature(a),sb=signature(b);return !!sa&&!/DES:$/.test(sa)&&sa===sb}
  function tasksFor(d,point){return (d.tasks||[]).filter(t=>String(t.lubricationPointId)===String(point.id))}
  function needsMaterial(task){return global.LubricaMaterials?.taskNeedsMaterial?.(task.activityType||task.operation)??true}
  function effectiveMaterial(task,point){return global.LubricaMaterials?.effectiveMaterialId?.(task,point)||(task.materialId||point.targetMaterialId||null)}
  function isComplete(d,point){
    const ts=tasksFor(d,point);if(!ts.length)return false;
    return ts.every(t=>(!needsMaterial(t)||!!effectiveMaterial(t,point))&&String(t.quantity?.approved??'').trim()!==''&&((t.schedule?.strategy==='По состоянию')||String(t.schedule?.legacyText||'').trim()!==''));
  }
  function locationLabel(d,point){
    const eq=byId(d.equipment,point.equipmentId),node=byId(d.nodes,point.nodeId),area=eq&&byId(d.areas,eq.areaId),line=eq&&byId(d.lines,eq.lineId);
    return [line?.name,area?.name,eq?.name,node?.name,point.name].filter(Boolean).join(' · ');
  }
  function sourceScore(d,p){
    const ts=tasksFor(d,p);let n=0;
    n+=ts.length*3;n+=ts.filter(t=>effectiveMaterial(t,p)).length*2;n+=ts.filter(t=>String(t.quantity?.approved??'').trim()).length*2;n+=ts.filter(t=>String(t.schedule?.legacyText||'').trim()).length*2;n+=ts.filter(t=>t.approvalStatus==='approved'||t.verified).length;
    if(p.bearing?.calculation)n+=5;if(p.targetMaterialId)n+=3;if(p.materialRationale)n+=1;return n;
  }
  function analogs(d,target){return (d.lubricationPoints||[]).filter(p=>p.id!==target.id&&p.category===target.category&&sameModel(p,target)).sort((a,b)=>sourceScore(d,b)-sourceScore(d,a))}
  function taskKey(t){return t.activityType||norm(t.operation)}
  function profileSummary(d,p){
    const ts=tasksFor(d,p),mats=[...new Set(ts.map(t=>effectiveMaterial(t,p)).filter(Boolean).map(id=>byId(d.materials,id)?.name||id))];
    return `${designation(p)||'Без обозначения'} · ${ts.length} мер. · ${mats.length?mats.join(', '):'материал не задан'}${p.bearing?.calculation?' · расчёт есть':''}`;
  }

  function approved(t){return ['approved','ready'].includes(String(t?.approvalStatus||'').toLowerCase())||t?.verified===true}
  function protectedByHistory(d,point,ts){
    const ids=[String(point.id),...ts.map(t=>String(t.id))],lookup=new Set(ids);
    const collections=['routes','routeRevisions','checklistRuns','routePlanItems','routeHistory','routePlans'];
    for(const name of collections)for(const record of (d[name]||[])){
      const raw=JSON.stringify(record);
      if(ids.some(id=>raw.includes('"'+id+'"')))return name;
    }
    return '';
  }
  function physicalMismatch(target,source){
    const a=target.bearing||{},b=source.bearing||{},issues=[];
    if(a.bearingType&&b.bearingType&&!['unknown','other'].includes(a.bearingType)&&
      !['unknown','other'].includes(b.bearingType)&&a.bearingType!==b.bearingType)
      issues.push('Не совпадает фактический тип подшипника.');
    for(const k of ['d','D','B']){
      const aa=Number(a[k]),bb=Number(b[k]);
      if(a[k]!=null&&b[k]!=null&&Number.isFinite(aa)&&Number.isFinite(bb)&&aa>0&&bb>0&&Math.abs(aa-bb)>0.01)
        issues.push('Не совпадает размер '+k+' (мм).');
    }
    const sa=String(a.housingFamily||target.fanLubrication?.bearingHousingFamily||'').toUpperCase();
    const sb=String(b.housingFamily||source.fanLubrication?.bearingHousingFamily||'').toUpperCase();
    if(sa&&sb&&sa!==sb)issues.push('Разные типы подшипникового корпуса.');
    return issues;
  }
  function previewTransfer(d,target,source,fields,proof={}){
    const errors=[],warnings=[];
    if(!d||!target||!source||target.id===source.id)errors.push('Выберите две разные существующие физические точки.');
    if(!target||!source)return{ok:false,errors,warnings};
    if(target.category!=='bearing'||source.category!=='bearing')errors.push('Сейчас инженерный перенос доступен только для подшипников.');
    if(!sameModel(target,source))errors.push('Не совпадает подтверждённое обозначение/каталожная запись подшипника.');
    const ts=tasksFor(d,target),srcTasks=tasksFor(d,source);
    if(!srcTasks.length)errors.push('У исходной точки отсутствуют мероприятия.');
    if(ts.some(approved))errors.push('На целевой точке есть утверждённое мероприятие; его нельзя перезаписывать по аналогу.');
    const history=protectedByHistory(d,target,ts);
    if(history)errors.push('На целевую точку есть ссылки в '+history+'. Перенос запрещён.');
    const difference=physicalMismatch(target,source);
    errors.push(...difference);
    if((fields.technical||fields.quantity||fields.schedule)&&!proof.physicalConfirmed)
      errors.push('Подтвердите одинаковую фактическую конструкцию и условия обслуживания.');
    if(!proof.physicalConfirmed)errors.push('Подтвердите фактическое соответствие двух физических узлов.');
    if(String(proof.reason||'').trim().length<8)errors.push('Укажите, почему конкретные узлы являются аналогами (не менее 8 символов).');
    if(!String(proof.sourceReference||'').trim())errors.push('Укажите источник проверки: осмотр, чертёж или OEM.');
    if(fields.quantity)for(const st of srcTasks){
      const dt=ts.find(t=>taskKey(t)===taskKey(st));
      if(dt&&String(dt.quantity?.approved??'').trim())warnings.push('Норма '+(dt.operation||dt.id)+' у цели уже заполнена: она будет сохранена, предложение по аналогу записано отдельно.');
    }
    if(fields.technical)warnings.push('Фактические размеры, положение и рассчитанный OEM-профиль целевого подшипника не копируются.');
    if(fields.quantity||fields.schedule)warnings.push('Норма и периодичность сохраняются как предложения; применить их должен инженер через соответствующую карточку/расчёт.');
    if(fields.tasks)warnings.push('Новые мероприятия создаются только на существующей физической точке и остаются review.');
    return {ok:errors.length===0,errors,warnings,targetId:String(target.id),sourceId:String(source.id),
     taskCount:srcTasks.length,fields:{...fields},proof:{reason:String(proof.reason||'').trim(),sourceReference:String(proof.sourceReference||'').trim()}};
  }
  function transferPointFields(target,source,fields){
    // Do not replace current lubricant, OEM bearing record, geometry or machine-specific mounting position.
    if(fields.material){
      target.targetMaterialId=source.targetMaterialId||target.targetMaterialId||null;
      target.materialRationale=target.materialRationale||'Материал предложен из аналога; требуется инженерное подтверждение';
    }
    if(target.status!=='review')target.status='review';
  }
  function copyTaskPayload(dst,src,fields,sourcePointId,proof){
    if(fields.material){
      if(!dst.materialId)dst.materialId=src.materialId||null;
      if(!dst.materialName)dst.materialName=src.materialName||'';
      if(!dst.toolId)dst.toolId=src.toolId||null;
      if(!dst.materialMode)dst.materialMode=src.materialMode||'point_target';
    }
    if(fields.quantity){
      const value=src.quantity?.approved??src.approvedQuantity??null;
      if(value!==null&&String(value).trim()!==''){
        dst.quantity={...(dst.quantity||{}),analogSuggested:{
          value,unit:src.quantity?.unit||'',sourcePointId,
          reason:proof.reason,sourceReference:proof.sourceReference}};
      }
      // Never transfer quantity.approved or approved calculations from another physical point.
    }
    if(fields.schedule){
      const interval=src.schedule?.legacyText||src.schedule?.interval||src.interval||'';
      if(interval)dst.schedule={...(dst.schedule||{}),analogSuggested:{
        interval,sourcePointId,reason:proof.reason,sourceReference:proof.sourceReference}};
    }
    dst.approvalStatus='review';dst.verified=false;
    dst.analogSourcePointId=sourcePointId;dst.analogTransferredAt=new Date().toISOString();
    dst.analogEvidence={reason:proof.reason,sourceReference:proof.sourceReference,
      physicalConfirmed:true,fields:Object.keys(fields).filter(k=>fields[k])};
  }
  function applyTransfer(d,target,source,fields,proof={}){
    const result=previewTransfer(d,target,source,fields,proof);
    if(!result.ok)throw new Error(result.errors.join(' '));
    transferPointFields(target,source,fields);
    const srcTasks=tasksFor(d,source),dstTasks=tasksFor(d,target),byKey=new Map(dstTasks.map(t=>[taskKey(t),t]));
    if(fields.tasks){
      for(const st of srcTasks){
        const k=taskKey(st);let dt=byKey.get(k);
        if(!dt){
          dt={id:global.LubricaCore.IDs.nextFrom(d.tasks,'TASK',6),lubricationPointId:target.id,
            activityType:st.activityType||'',operation:st.operation||'',origin:'analog',
            legacyManaged:false,approvalStatus:'review'};
          d.tasks.push(dt);byKey.set(k,dt);
        }
        dt.activityType=st.activityType||dt.activityType;dt.operation=st.operation||dt.operation;
        copyTaskPayload(dt,st,fields,source.id,result.proof);
      }
    }else{
      for(const dt of dstTasks){
        const st=srcTasks.find(x=>taskKey(x)===taskKey(dt));
        if(st)copyTaskPayload(dt,st,fields,source.id,result.proof);
      }
    }
    target.analogTransfer={sourcePointId:source.id,sourceDesignation:designation(source),
      transferredAt:new Date().toISOString(),fields:Object.keys(fields).filter(k=>fields[k]),
      physicalConfirmed:true,reason:result.proof.reason,sourceReference:result.proof.sourceReference,
      approvalTransferred:false,amountsAndIntervalsSuggestedOnly:true};
    return{ok:true,reviewRequired:true,targetPointId:String(target.id),sourcePointId:String(source.id)};
  }
  function selectedFields(form){
    const mode=form.elements.mode.value;
    if(mode==='all')return{technical:true,material:true,tasks:true,quantity:true,schedule:true,sources:true};
    if(mode==='material')return{technical:false,material:true,tasks:false,quantity:false,schedule:false,sources:false};
    return{technical:form.elements.technical.checked,material:form.elements.material.checked,tasks:form.elements.tasks.checked,quantity:form.elements.quantity.checked,schedule:form.elements.schedule.checked,sources:form.elements.sources.checked};
  }
  function renderDetails(d,source,target){
    const box=document.getElementById('analogSourcePreview');if(!box)return;
    if(!source){box.innerHTML='<div class="analog-empty">Выберите исходную точку.</div>';return}
    const ts=tasksFor(d,source);
    box.innerHTML=`<div class="analog-preview-head"><b>${esc(source.name||source.id)}</b><span>${esc(profileSummary(d,source))}</span></div><div class="analog-task-list">${ts.map(t=>`<div><b>${esc(t.operation||t.activityType||'Мероприятие')}</b><span>${esc(byId(d.materials,effectiveMaterial(t,source))?.name||'Материал не задан')}</span><span>${esc(t.quantity?.approved??'—')} ${esc(t.quantity?.unit||'')}</span><span>${esc(t.schedule?.legacyText||'Периодичность не задана')}</span></div>`).join('')}</div><small>Привязка к оборудованию, ID точки, положение и candidate-связи не копируются.</small>`;
  }
  function open(context={}){
    const d=db(),target=currentPoint(context);if(!d||!target){toast('Не удалось определить выбранную физическую точку. Повторно выберите строку карты и попробуйте ещё раз.','warn');return}
    if(target.category!=='bearing'){toast('На этом этапе перенос по аналогу доступен для подшипниковых точек','warn');return}
    const list=analogs(d,target),dlg=document.getElementById('analogDialog');if(!dlg)return;
    if(!list.length){toast(`Не найдено других точек с тем же подшипником ${designation(target)||''}`,'warn');return}
    const recommended=list[0],bulk=list.filter(p=>p.id!==recommended.id&&!isComplete(d,p));
    dlg.innerHTML=`<form method="dialog" class="analog-form"><div class="dialog-head"><div><span class="eyebrow">АНАЛОГ ТОЧКИ</span><h2>Заполнить по аналогичной точке</h2><p>Точный подшипник: <b>${esc(designation(target)||'не определён')}</b></p></div><button class="icon-btn" value="cancel">×</button></div>
      <section class="analog-target"><span>Заполняемая точка</span><b>${esc(target.name||target.id)}</b><small>${esc(locationLabel(d,target))}</small></section>
      <label>Источник данных<select name="sourcePoint">${list.map((p,i)=>`<option value="${esc(p.id)}" ${i===0?'selected':''}>${esc(p.name||p.id)} — ${esc(locationLabel(d,p))} [${sourceScore(d,p)}]</option>`).join('')}</select></label>
      <div id="analogSourcePreview" class="analog-source-preview"></div>
      <fieldset class="analog-modes"><legend>Что перенести</legend>
        <label><input type="radio" name="mode" value="all" checked> <span><b>Всё из аналога</b><small>Технический профиль, материал, мероприятия, количества, периодичность, расчёты и источники.</small></span></label>
        <label><input type="radio" name="mode" value="material"> <span><b>Только материал и инструмент</b><small>Не меняет норму, расчёт и периодичность.</small></span></label>
        <label><input type="radio" name="mode" value="custom"> <span><b>Выбрать данные</b><small>Настройте поля вручную.</small></span></label>
      </fieldset>
      <div class="analog-custom-fields" id="analogCustomFields" hidden>
        <label><input type="checkbox" name="technical" checked> Технический профиль и расчёт</label><label><input type="checkbox" name="material" checked> Материал и инструмент</label><label><input type="checkbox" name="tasks" checked> Создать отсутствующие мероприятия</label><label><input type="checkbox" name="quantity" checked> Количество</label><label><input type="checkbox" name="schedule" checked> Периодичность</label><label><input type="checkbox" name="sources" checked> Источники и обоснование</label>
      </div>
      <label class="analog-bulk"><input type="checkbox" name="bulk" ${bulk.length?'':'disabled'}> <span><b>Применить к незаполненным аналогам</b><small>${bulk.length?`Ещё ${bulk.length} точек ${esc(designation(target))}. Уже заполненные точки не перезаписываются.`:'Других незаполненных аналогов нет.'}</small></span></label>
      <div class="analog-warning">После переноса новая точка и её мероприятия получают статус <b>«Требует проверки»</b>. Утверждение источника не копируется автоматически.</div>
      <menu><button class="btn ghost" value="cancel">Отмена</button><button class="btn primary" type="button" id="applyAnalogBtn">Перенести данные</button></menu></form>`;
    const form=dlg.querySelector('form'),sel=form.elements.sourcePoint;
    const update=()=>renderDetails(d,byId(d.lubricationPoints,sel.value),target);update();sel.onchange=update;
    form.querySelectorAll('input[name="mode"]').forEach(r=>r.onchange=()=>{form.querySelector('#analogCustomFields').hidden=form.elements.mode.value!=='custom'});
    form.querySelector('#applyAnalogBtn').onclick=()=>{
      const source=byId(d.lubricationPoints,sel.value),fields=selectedFields(form);if(!source)return;
      applyTransfer(d,target,source,fields);let count=1;
      if(form.elements.bulk.checked){for(const p of analogs(d,target)){if(p.id===source.id||p.id===target.id||isComplete(d,p))continue;applyTransfer(d,p,source,fields);count++}}
      global.LubricaCore.State.setDatabase(d);global.refreshFromCore?.();global.renderAll?.();dlg.close();toast(count>1?`Данные перенесены в ${count} аналогичных точек. Требуется инженерное подтверждение.`:'Данные перенесены по аналогу. Требуется инженерное подтверждение.');
    };
    dlg.showModal();
  }
  function refreshButton(point){
    const btn=document.getElementById('fillFromAnalogBtn');if(!btn)return;const d=db();
    btn.hidden=point?.category!=='bearing';
    btn.dataset.pointId=point?.id||'';
    const firstTask=d&&point?(d.tasks||[]).find(t=>String(t.lubricationPointId)===String(point.id)):null;btn.dataset.taskId=firstTask?.id||'';
    if(point?.category==='bearing'){const n=d?analogs(d,point).length:0;btn.disabled=!n;btn.title=n?`Найдено аналогичных точек: ${n}`:'Нет точек с тем же обозначением'}
  }
  global.LubricaAnalogs=Object.freeze({open,refreshButton,designation,sameModel,applyTransfer,isComplete,currentPoint,findAnalogs:analogs,sourceScore});
})(window);
