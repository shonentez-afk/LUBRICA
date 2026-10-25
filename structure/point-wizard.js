(function(global){
'use strict';
const Core=global.LubricaCore;const C=global.LubricaStructureContext;const P=global.LubricaPointWizard=global.LubricaPointWizard||{};
  const activityChecks=category=>(C.activityOptions(category)||[]).filter(x=>x.type!=='custom').map((x,i)=>`<label class="wizard-check"><input type="checkbox" name="activityTypes" value="${C.esc(x.type)}" ${i===0?'checked':''}> ${C.esc(x.label)}</label>`).join('');
  function open(existingLp=null){
    const d=C.db(),dlg=document.getElementById('structureDialog');if(!d||!dlg)return;
    if(!d.equipment.length){global.LubricaApp?.showToast('Сначала создайте оборудование в разделе «Структура»','warn');return}
    const initialEq=existingLp?.equipmentId||C.selected.type==='equipment'&&C.selected.id||C.selected.type==='node'&&C.entity(d)?.equipmentId||d.equipment[0].id;
    const eq=C.byId(d.equipment,initialEq),nodes=d.nodes.filter(n=>n.equipmentId===initialEq),initialNode=existingLp?.nodeId||C.selected.type==='node'&&C.selected.id||nodes[0]?.id||'';
    if(!nodes.length&&!existingLp){global.LubricaApp?.showToast('У выбранного оборудования нет узла. Сначала создайте узел — точка смазки должна быть к нему привязана.','warn');return}
    const cat=existingLp?.category||'bearing';
    const equipmentOpts=C.options(d.equipment,initialEq,x=>`${x.name}${x.externalCode?' · '+x.externalCode:''}`);
    const Binding=global.LubricaComponentBinding;
    const initialComponentId=existingLp?.componentBinding?.sourceComponentId||'';
    const componentOptions=(equipmentId,selectedId='')=>{
      const items=Binding?.componentsForEquipment?.(equipmentId,d)||[];
      return `<option value="">Без привязки к компоненту</option>`+items.map(x=>`<option value="${C.esc(x.id)}" ${x.id===selectedId?'selected':''}>${C.esc(Binding.componentLabel(x))}</option>`).join('');
    };
    const libraryOptions=(category,selectedId='')=>{
      const libCategory=Binding?.libraryCategory?.(category)||category;
      const items=global.LubricaComponents?.all?.(libCategory)||[];
      return `<option value="">Не выбрано</option>`+items.map(x=>`<option value="${C.esc(x.id)}" ${String(x.id)===String(selectedId)?'selected':''}>${C.esc([x.manufacturer,x.designation||x.model||x.name].filter(Boolean).join(' · '))}</option>`).join('');
    };
    const categoryOpts=Object.entries(C.categoryLabels).map(([k,v])=>`<option value="${k}" ${k===cat?'selected':''}>${v}</option>`).join('');
    const positionOpts=['','DE','NDE','Приводная сторона','Ведомая сторона','Левая','Правая','Верхняя','Нижняя','Другое'].map(v=>`<option value="${C.esc(v)}" ${v===(existingLp?.positionLabel||'')?'selected':''}>${C.esc(v||'Не задано')}</option>`).join('');
    dlg.innerHTML=`<form id="pointWizardForm"><div class="dialog-head"><div><span class="eyebrow">${existingLp?'ПРИВЯЗКА ТОЧКИ':'НОВАЯ ТОЧКА СМАЗКИ'}</span><h2>${existingLp?'Изменить привязку':'Создать точку смазки'}</h2></div><button type="button" class="icon-btn" data-cancel>×</button></div><div class="wizard-note"><b>Точка создаётся только после сохранения.</b><span>Электродвигатель и вентилятор выбираются как оборудование. Если точка — подшипник, система сама покажет контекст «подшипник электродвигателя/вентилятора».</span></div><div class="dialog-fields">
      ${C.select('Оборудование *','equipmentId',equipmentOpts)}
      ${C.select('Элемент из структуры','sourceComponentId',componentOptions(initialEq,initialComponentId))}
      <div class="wizard-binding-summary" id="wizardBindingSummary"><span>Связь со Справочником</span><b>Не выбрана</b><small>Если элемент уже есть в структуре, выберите его — категория и технические данные будут подставлены автоматически.</small></div>
      <details class="wizard-binding-details"><summary>Справочник и фактически установленный элемент</summary><div class="dialog-fields compact">
        ${C.select('По структуре','libraryEntryId',libraryOptions(cat,existingLp?.componentBinding?.libraryEntryId||''))}
        ${C.select('Фактически установлен','actualLibraryEntryId',libraryOptions(cat,existingLp?.componentBinding?.actualLibraryEntryId||''))}
        <div class="field-help span-2">Обычно эти поля заполняются автоматически. «Фактически установлен» нужен только если реальный элемент отличается от проектного/структурного.</div>
      </div></details>
      <div class="wizard-readonly"><span>Код позиции</span><b id="wizardPositionCode">${C.esc(eq?.externalCode||'—')}</b></div>
      ${C.select('Узел *','nodeId',C.options(nodes,initialNode))}
      ${C.select('Категория точки смазки *','category',categoryOpts)}
      ${C.select('Положение на механизме','positionLabel',positionOpts)}
      ${C.input('Название точки смазки','name',existingLp?.name||'',false)}
      ${C.input('Местоположение / комментарий','location',existingLp?.location||'')}
      ${C.input('Способ подачи','feedMethod',existingLp?.feedMethod||'')}
      ${existingLp?'':`<label>Мероприятия точки</label><div class="wizard-checks" id="wizardTaskChecks">${activityChecks(cat)}</div>`}
      ${existingLp?'':C.input('Базовая периодичность','intervalValue','')+C.select('Единица базовой периодичности','intervalUnit','<option value="weeks">недели</option><option value="days">дни</option><option value="months">месяцы</option><option value="years">годы</option>')}
    </div><menu><button type="button" class="btn ghost" data-cancel>Отмена</button><button type="button" class="btn primary" data-save>${existingLp?'Сохранить привязку':'Создать точку'}</button></menu></form>`;
    const form=dlg.querySelector('#pointWizardForm');
    function refreshBinding({autofill=false}={}){
      const componentId=form.elements.sourceComponentId.value,summary=dlg.querySelector('#wizardBindingSummary');
      const component=componentId?C.byId(d.components,componentId):null;
      if(!component){
        const cat=form.elements.category.value;
        if(form.elements.libraryEntryId)form.elements.libraryEntryId.innerHTML=libraryOptions(cat,existingLp?.componentBinding?.libraryEntryId||form.elements.libraryEntryId.value||'');
        if(form.elements.actualLibraryEntryId)form.elements.actualLibraryEntryId.innerHTML=libraryOptions(cat,existingLp?.componentBinding?.actualLibraryEntryId||form.elements.actualLibraryEntryId.value||'');
        summary.innerHTML='<span>Связь со Справочником</span><b>Без компонента структуры</b><small>Можно выбрать запись Справочника вручную либо оставить точку без связи.</small>';return
      }
      const classified=global.LubricaClassifier?.classifyComponentText?.(component.name||'')||{};
      const category=classified.category||component.candidateCategory||form.elements.category.value;
      if(autofill&&category&&C.categoryLabels[category]){
        form.elements.category.value=category;
        if(!form.elements.name.value.trim())form.elements.name.value=component.name||'';
        const box=dlg.querySelector('#wizardTaskChecks');if(box)box.innerHTML=activityChecks(category);
      }
      const match=Binding?.resolve?.(Binding.structuralText(component,C.byId(d.equipment,form.elements.equipmentId.value)),category);
      const sameExistingBinding=!!(existingLp&&existingLp.componentBinding?.sourceComponentId===component.id);
      const linked=sameExistingBinding?null:Binding?.linkedPointForComponent?.(component.id,existingLp?.id,d);
      const entry=match?.entry;
      const structuralSelect=form.elements.libraryEntryId,actualSelect=form.elements.actualLibraryEntryId;
      if(structuralSelect){
        const keep=structuralSelect.value||existingLp?.componentBinding?.libraryEntryId||'';
        structuralSelect.innerHTML=libraryOptions(category,entry?.id||keep);
        if(entry?.id)structuralSelect.value=entry.id;
      }
      if(actualSelect){
        const keepActual=actualSelect.value||existingLp?.componentBinding?.actualLibraryEntryId||'';
        actualSelect.innerHTML=libraryOptions(category,keepActual);
      }
      summary.innerHTML=`<span>Связь со Справочником</span><b>${entry?C.esc(entry.designation||entry.model||entry.name):'Совпадение не найдено'}</b><small>${sameExistingBinding?'Текущая точка уже привязана к этому элементу структуры. Можно безопасно изменить название, положение и другие поля точки. ':linked?'⚠ Этот компонент уже связан с точкой «'+C.esc(linked.name)+'». ':''}${match?.reason||''}</small>`;
    }
    function refreshNodes(){
      const eId=form.elements.equipmentId.value,n=d.nodes.filter(n=>n.equipmentId===eId);
      form.elements.nodeId.innerHTML=C.options(n,existingLp?.nodeId);
      form.elements.sourceComponentId.innerHTML=componentOptions(eId,existingLp?.equipmentId===eId?initialComponentId:'');
      const e=C.byId(d.equipment,eId);dlg.querySelector('#wizardPositionCode').textContent=e?.externalCode||'—';
      form.querySelector('[data-save]').disabled=!n.length||!e?.externalCode;
      refreshBinding();
      if(!n.length)global.LubricaApp?.showToast('У этого оборудования нет узлов. Создайте узел в структуре.','warn');else if(!e?.externalCode)global.LubricaApp?.showToast('У оборудования не задан код позиции. Сначала заполните его в карточке оборудования.','warn')
    }
    form.elements.equipmentId.onchange=refreshNodes;
    form.elements.sourceComponentId.onchange=()=>refreshBinding({autofill:true});
    form.elements.libraryEntryId.onchange=()=>{
      const entry=Binding?.entryById?.(form.elements.libraryEntryId.value,Binding?.libraryCategory?.(form.elements.category.value)||form.elements.category.value);
      const summary=dlg.querySelector('#wizardBindingSummary');
      if(entry&&summary)summary.innerHTML=`<span>Связь со Справочником</span><b>${C.esc([entry.manufacturer,entry.designation||entry.model||entry.name].filter(Boolean).join(' · '))}</b><small>Выбрано пользователем. Технические данные будут перенесены в точку после сохранения.</small>`;
    };
    form.elements.actualLibraryEntryId.onchange=()=>{
      const entry=Binding?.entryById?.(form.elements.actualLibraryEntryId.value,Binding?.libraryCategory?.(form.elements.category.value)||form.elements.category.value);
      if(entry){const summary=dlg.querySelector('#wizardBindingSummary');if(summary)summary.innerHTML=`<span>Фактически установлен</span><b>${C.esc([entry.manufacturer,entry.designation||entry.model||entry.name].filter(Boolean).join(' · '))}</b><small>Эта запись будет иметь приоритет над элементом «По структуре».</small>`}
    };
    form.elements.category.onchange=()=>{const box=dlg.querySelector('#wizardTaskChecks');if(box)box.innerHTML=activityChecks(form.elements.category.value);refreshBinding()};
    form.querySelectorAll('[data-cancel]').forEach(btn=>btn.onclick=e=>{e.preventDefault();dlg.close('cancel')});
    form.querySelector('[data-save]').onclick=e=>{e.preventDefault();const eId=form.elements.equipmentId.value,nId=form.elements.nodeId.value,eqSelected=C.byId(d.equipment,eId);if(!eId||!nId){global.LubricaApp?.showToast('Выберите оборудование и узел','warn');return}if(!eqSelected?.externalCode){global.LubricaApp?.showToast('У выбранного оборудования не задан код позиции','warn');return}const database=Core.Database.normalize(C.db());const node=C.byId(database.nodes,nId),category=form.elements.category.value,sourceComponentId=form.elements.sourceComponentId.value||null;const sameExistingBinding=!!(existingLp&&existingLp.componentBinding?.sourceComponentId===sourceComponentId);const duplicate=!sameExistingBinding&&sourceComponentId&&Binding?.linkedPointForComponent?.(sourceComponentId,existingLp?.id,database);if(duplicate){global.LubricaApp?.showToast(`Элемент уже связан с точкой «${duplicate.name}». Откройте существующую точку вместо создания дубликата.`,'warn');return}let lp=existingLp?{...existingLp}:{};lp={...lp,id:lp.id||Core.IDs.nextFrom(database.lubricationPoints,'LP',6),legacyId:lp.legacyId||'',equipmentId:eId,nodeId:nId,name:form.elements.name.value.trim()||C.pointContextLabel(database,{category,equipmentId:eId}),category,positionLabel:form.elements.positionLabel.value,location:form.elements.location.value.trim(),feedMethod:form.elements.feedMethod.value.trim(),accessibility:lp.accessibility||'unknown',serviceMode:lp.serviceMode||'unknown',status:lp.status||'review',source:lp.source||'Ручное добавление',origin:lp.origin||'manual'};if(Binding){
  const sourceComponent=sourceComponentId?C.byId(database.components,sourceComponentId):null;
  const equipment=C.byId(database.equipment,eId);
  Binding.bindPoint(lp,{sourceComponent,equipment});
  const structuralEntryId=form.elements.libraryEntryId?.value||lp.componentBinding?.libraryEntryId||null;
  const actualEntryId=form.elements.actualLibraryEntryId?.value||null;
  if(structuralEntryId)Binding.setLibraryEntry(lp,structuralEntryId,{actual:false});
  if(actualEntryId)Binding.setLibraryEntry(lp,actualEntryId,{actual:true});
}const ix=database.lubricationPoints.findIndex(x=>x.id===lp.id);if(ix>=0)database.lubricationPoints[ix]=lp;else database.lubricationPoints.push(lp);if(!existingLp){const activityTypes=Array.from(form.querySelectorAll('input[name="activityTypes"]:checked')).map(x=>x.value);if(!activityTypes.length){global.LubricaApp?.showToast('Выберите хотя бы одно мероприятие','warn');return}for(const activityType of activityTypes){const operation=C.activityLabel(activityType);database.tasks.push({id:Core.IDs.nextFrom(database.tasks,'TASK',6),lubricationPointId:lp.id,activityType,operation,materialMode:C.activityNeedsMaterial(activityType)?'explicit':'none',materialName:'',materialId:null,toolId:null,quantity:{approved:'',unit:category==='gearbox_oil'||category==='oil_system'?'л':'г'},schedule:{legacyText:form.elements.intervalValue.value.trim()?`${form.elements.intervalValue.value.trim()} ${{days:'дн.',weeks:'нед.',months:'мес.',years:'года'}[form.elements.intervalUnit.value]||'нед.'}`:'',strategy:'По календарю',calendarValue:Number(String(form.elements.intervalValue.value).replace(',','.'))||null,calendarUnit:form.elements.intervalUnit.value},approvalStatus:'review',verified:false,source:'Ручное добавление',origin:'manual',legacyManaged:false})}C.selected={type:'lubricationPoint',id:lp.id}}C.save(database,existingLp?'Привязка точки изменена':'Точка смазки создана');dlg.close('save')};
    refreshNodes();dlg.showModal();
  }
  function editPointForTask(taskId){const d=C.db();if(!d)return;const task=d.tasks.find(t=>String(t.id)===String(taskId)||String(t.legacy?.id||'')===String(taskId));const lp=task&&C.byId(d.lubricationPoints,task.lubricationPointId);if(!lp){global.LubricaApp?.showToast('Точка смазки не найдена в структуре','warn');return}open(lp)}

  function editEquipmentForTask(taskId){const d=C.db();if(!d)return;const task=d.tasks.find(t=>String(t.id)===String(taskId)||String(t.legacy?.id||'')===String(taskId));const lp=task&&C.byId(d.lubricationPoints,task.lubricationPointId),eq=lp&&C.byId(d.equipment,lp.equipmentId);if(!eq){global.LubricaApp?.showToast('Оборудование не найдено','warn');return}C.selected={type:'equipment',id:eq.id};global.LubricaEntityDialogs.open('equipment',eq)}
  function addTaskForPoint(pointId){const d=C.db();if(!d)return;const lp=C.byId(d.lubricationPoints,pointId);if(!lp){global.LubricaApp?.showToast('Точка смазки не найдена','warn');return}C.selected={type:'lubricationPoint',id:lp.id};global.LubricaEntityDialogs.open('task',null)}
  function addTaskForTask(taskId){const d=C.db();if(!d)return;const task=d.tasks.find(t=>String(t.id)===String(taskId)||String(t.legacy?.id||'')===String(taskId));if(!task){global.LubricaApp?.showToast('Мероприятие не найдено','warn');return}addTaskForPoint(task.lubricationPointId)}

P.open=open;P.editPointForTask=editPointForTask;P.editEquipmentForTask=editEquipmentForTask;P.addTaskForPoint=addTaskForPoint;P.addTaskForTask=addTaskForTask;
})(window);
