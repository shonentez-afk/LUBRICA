"use strict";
/* Stage 5.8: point/task editor owns detail rendering and save behavior. */
(function(){
  function api(){return window.LubricaMaterials}
  function db36(){return api()?.getDatabase?.()}
  function item36(arr,id){return api()?.find?.(arr,id)}
  function currentTask36(){const d=db36(),p=current();return d&&p?(d.tasks||[]).find(t=>String(t.id)===String(taskKey(p))):null}
  function currentPoint36(){const d=db36(),t=currentTask36();return d&&t?item36(d.lubricationPoints,t.lubricationPointId):null}
  function material36(id){return api()?.getMaterial?.(id)}
  function materialOptions36(selected='',includeEmpty=true){return api()?.materialOptions?.(selected,includeEmpty)||''}
  function taskNeedsMaterial36(operation){return api()?.taskNeedsMaterial?.(operation)??true}
  function effectiveMaterialId36(task,lp){return api()?.effectiveMaterialId?.(task,lp)??null}
  function toolOptions36(materialId,selected=''){return api()?.toolOptions?.(materialId,selected)||'<option value="">Не назначен</option>'}
  function refreshToolSelector36(){return api()?.refreshToolSelector?.()}
  function refreshMaterialMode36(){return api()?.refreshMaterialMode?.()}
  let workflowDirty=false,workflowTrackingBound=false;
  function workflowCalculationApplied(task){
    const q=task?.quantity||{},sch=task?.schedule||{};
    return !!(q.source||sch.source||q.calculated!=null||q.calculatedGrams!=null||q.calculatedStrokes!=null||sch.calculatedHours!=null||sch.calculatedDays!=null||sch.calculatedCalendarMonths!=null||sch.calculatedMachineCycles!=null);
  }
  function renderWorkflowUX(){
    const p=current(),task=currentTask36(),lp=currentPoint36(),box=$('#pointWorkflowSummary');if(!p||!task||!box)return;
    const selectedStatus=$('#fTaskStatus')?.value||task.approvalStatus||'review';
    const hasIssue=p.status==='issue'||(Array.isArray(p.issues)&&p.issues.length>0);
    let key='review',title='Требует проверки',note='Проверьте данные и утвердите мероприятие перед включением в план.';
    if(hasIssue||selectedStatus==='draft'){key='needs-data';title='Требуются данные';note=hasIssue?((p.issues||[]).join(', ')||'Есть незаполненные обязательные данные.'):'Мероприятие остаётся черновиком и пока не участвует в плане.';}
    else if(selectedStatus==='approved'){key='ready';title='Готово';note='Мероприятие утверждено и участвует в автоматическом формировании маршрутов.';}
    else if(selectedStatus==='disabled'){key='review';title='Требует проверки';note='Мероприятие отключено и не участвует в плане.';}
    const stateEl=box.querySelector('[data-workflow-state]');if(stateEl){stateEl.className=`workflow-state ${key}`;stateEl.innerHTML=`<span>${key==='ready'?'✓':key==='needs-data'?'×':'!'}</span><div><strong>${esc(title)}</strong><small>${esc(note)}</small></div>`;}
    const saveEl=box.querySelector('[data-workflow-save]');if(saveEl){saveEl.className=workflowDirty?'pending':'done';saveEl.textContent=workflowDirty?'1 · Есть несохранённые изменения':'1 · Данные сохранены';}
    const calcApplied=workflowCalculationApplied(task);const calcEl=box.querySelector('[data-workflow-calc]');if(calcEl){calcEl.className=calcApplied?'done':'muted';calcEl.textContent=calcApplied?'2 · Расчёт применён':'2 · Расчёт не применён';}
    const planEl=box.querySelector('[data-workflow-plan]');if(planEl){planEl.className=selectedStatus==='approved'?'done':'muted';planEl.textContent=selectedStatus==='approved'?'3 · Участвует в плане':'3 · Не участвует в плане';}
    const saveBtn=$('#savePointBtn');if(saveBtn){saveBtn.textContent=workflowDirty?'Сохранить изменения':'Сохранить';saveBtn.classList.toggle('workflow-dirty',workflowDirty);}
    const approveBtn=$('#approveTaskBtn');if(approveBtn){if(selectedStatus==='approved'){approveBtn.textContent='Вернуть на проверку';approveBtn.className='btn ghost';}else if(selectedStatus==='disabled'){approveBtn.textContent='Вернуть в работу';approveBtn.className='btn secondary';}else{approveBtn.textContent='Утвердить мероприятие';approveBtn.className='btn secondary';}}
  }
  function markWorkflowDirty(){workflowDirty=true;renderWorkflowUX();}
  function bindWorkflowTracking(){
    if(workflowTrackingBound)return;const panel=$('#detailPanel');if(!panel)return;workflowTrackingBound=true;
    const handler=e=>{const el=e.target;if(!el?.matches?.('input,select,textarea'))return;if(el.disabled||el.readOnly)return;markWorkflowDirty();};
    panel.addEventListener('input',handler);panel.addEventListener('change',handler);
  }
  function toggleTaskApprovalImpl(){
    const p=current(),statusEl=$('#fTaskStatus');if(!p||!statusEl)return false;
    const currentStatus=statusEl.value;
    if(currentStatus==='approved'){statusEl.value='review';workflowDirty=true;savePointImpl();return true;}
    if(currentStatus==='disabled'){statusEl.value='review';workflowDirty=true;savePointImpl();return true;}
    if(p.status==='issue'||(Array.isArray(p.issues)&&p.issues.length)){toast('Сначала устраните обязательные данные мероприятия.','warn');return false;}
    const strategy=$('#fStrategy')?.value||'По календарю';
    if(strategy!=='По состоянию'&&!String($('#fInterval')?.value||'').trim()){toast('Перед утверждением укажите периодичность мероприятия.','warn');return false;}
    statusEl.value='approved';workflowDirty=true;savePointImpl();return true;
  }
  function bearingTypeLabel36(type){const m={deep_groove_ball:'Радиальный шариковый',angular_contact_ball:'Радиально-упорный шариковый',self_aligning_ball:'Самоустанавливающийся шариковый',cylindrical_roller:'Цилиндрический роликовый',spherical_roller:'Сферический роликовый',tapered_roller:'Конический роликовый',needle_roller:'Игольчатый роликовый',bearing_unit:'Корпусной подшипниковый узел',slewing_ring_four_point_ball:'Опорно-поворотный подшипник',unknown:'Не определён'};return m[String(type||'unknown')]||'Не определён';}
  function resolveBearingFields(showToast=false){
    const lp=currentPoint36(),section=$('#bearingPointSection');if(!section||!lp)return null;
    const isBearing=lp.category==='bearing';section.hidden=!isBearing;if(!isBearing)return null;
    const structural=$('#fBearingStructural')?.value.trim()||'';
    const actual=$('#fBearingActual')?.value.trim()||'';
    const linked=window.LubricaComponentBinding?.ensurePointTechnical?.(lp);
    const input=actual||structural||linked?.designation||linked?.model||lp.bearing?.effectiveDesignation||'';
    const result=input?window.LubricaBearings?.lookup?.(input):null;
    const parsed=result?.parsed;
    if(parsed?.baseDesignation){
      lp.bearing={...(lp.bearing||{}),structuralDesignation:structural||lp.bearing?.structuralDesignation||linked?.designation||parsed.baseDesignation,actualDesignation:actual||lp.bearing?.actualDesignation||'',effectiveDesignation:actual||structural||linked?.designation||parsed.baseDesignation,baseDesignation:parsed.baseDesignation,d:parsed.dimensions?.d??lp.bearing?.d??null,D:parsed.dimensions?.D??lp.bearing?.D??null,B:parsed.dimensions?.B??lp.bearing?.B??null,bearingType:result?.record?.bearingType||parsed.inferredType||lp.bearing?.bearingType||'unknown',sealing:parsed.sealing||lp.bearing?.sealing||'unknown',sealingCode:parsed.sealingCode||lp.bearing?.sealingCode||'',clearance:parsed.clearance||lp.bearing?.clearance||'',cage:parsed.cage||lp.bearing?.cage||'',catalogId:parsed.catalogId||lp.bearing?.catalogId||linked?.id||null,sourceType:result?.sourceType||lp.bearing?.sourceType||'none'};
    }
    if($('#fBearingD'))$('#fBearingD').value=parsed?.dimensions?.d??'';
    if($('#fBearingOD'))$('#fBearingOD').value=parsed?.dimensions?.D??'';
    if($('#fBearingB'))$('#fBearingB').value=parsed?.dimensions?.B??'';
    if($('#fBearingSeal'))$('#fBearingSeal').value=parsed?.sealingCode||({sealed:'Закрытый',shielded:'Защитные шайбы',open_or_unspecified:'Открытый / не указан'}[parsed?.sealing]||'');
    if($('#fBearingTypeDetected'))$('#fBearingTypeDetected').value=bearingTypeLabel36(result?.record?.bearingType||parsed?.inferredType||lp.bearing?.bearingType||'unknown');
    const box=$('#bearingResolution');
    if(box){
      if(!input)box.innerHTML='Подшипник не выбран';
      else if(parsed?.recognized)box.innerHTML=`<b>${esc(parsed.baseDesignation)}</b> · ${esc(bearingTypeLabel36(result?.record?.bearingType||parsed?.inferredType))} · ${parsed.dimensions.d} × ${parsed.dimensions.D} × ${parsed.dimensions.B} мм · ${result.sourceType==='override'?'пользовательская запись':'встроенная библиотека'}`;
      else box.innerHTML=`<b>${esc(parsed?.baseDesignation||input)}</b> · ${esc(bearingTypeLabel36(parsed?.inferredType))} · размеры не подтверждены${parsed?.warnings?.length?`<small>${esc(parsed.warnings.join(' '))}</small>`:''}`;
    }
    if(showToast){
      if(parsed?.recognized)toast(`Подшипник ${parsed.baseDesignation}: ${parsed.dimensions.d} × ${parsed.dimensions.D} × ${parsed.dimensions.B} мм`);
      else toast('Размеры подшипника не найдены. Проверьте обозначение или добавьте запись в библиотеку.','warn');
    }
    return result;
  }
  function resolveBearingImpl(){return resolveBearingFields(true)}
  const numberValue=v=>{
    if(v==null||String(v).trim()==='')return null;
    const n=Number(String(v).replace(',','.'));
    return Number.isFinite(n)?n:null;
  };
  const canonicalActivityType36=(type,operation='')=>{const raw=String(type||'').trim();if(raw==='relubrication')return'regrease';return raw||(window.LubricaStructureContext?.activityTypeForLabel?.(operation)||'');};
  const scheduleUnits={days:'дн.',weeks:'нед.',months:'мес.',years:'года',hours:'ч',custom:''};
  function parseScheduleText(text,strategy='По календарю'){
    const raw=String(text||'').trim();
    if(!raw)return{value:'',unit:strategy==='По наработке'?'hours':'weeks'};
    const m=raw.match(/^\s*(\d+(?:[.,]\d+)?)\s*(.*)$/i);
    if(!m)return{value:raw,unit:'custom'};
    const value=m[1].replace(',','.'),u=(m[2]||'').toLowerCase();
    if(/\bч\b|час|моточас/.test(u))return{value,unit:'hours'};
    if(/дн|день|сут/.test(u))return{value,unit:'days'};
    if(/нед/.test(u))return{value,unit:'weeks'};
    if(/мес/.test(u))return{value,unit:'months'};
    if(/год|лет/.test(u))return{value,unit:'years'};
    return{value:raw,unit:'custom'};
  }
  function scheduleNumberText(value){
    const raw=String(value??'').trim();if(!raw)return'';
    const m=raw.match(/^\s*(\d+(?:[.,]\d+)?)/);return m?m[1].replace(',','.') : '';
  }
  function formatScheduleText(strategy,value,unit){
    const raw=String(value??'').trim();if(!raw||strategy==='По состоянию')return'';
    if(strategy==='По наработке'){const v=scheduleNumberText(raw);return v?`${v} ч`:'';}
    if(unit==='custom')return raw;
    const v=scheduleNumberText(raw)||raw;return `${v} ${scheduleUnits[unit]||'нед.'}`;
  }
  function updateScheduleControls(strategy,unit){
    const valueEl=$('#fInterval'),unitEl=$('#fIntervalUnit'),hint=$('#fIntervalHint');if(!valueEl||!unitEl)return;
    if(strategy==='По состоянию'){
      valueEl.disabled=true;unitEl.disabled=true;valueEl.value='';unitEl.innerHTML='<option value="custom">не требуется</option>';if(hint)hint.textContent='Для стратегии «По состоянию» календарный интервал не задаётся.';return;
    }
    valueEl.disabled=false;unitEl.disabled=false;
    if(strategy==='По наработке'){
      unitEl.innerHTML='<option value="hours">часы работы</option>';unitEl.value='hours';if(hint)hint.textContent='Периодичность задаётся в моточасах.';return;
    }
    unitEl.innerHTML='<option value="days">дни</option><option value="weeks">недели</option><option value="months">месяцы</option><option value="years">годы</option><option value="custom">ручной текст</option>';
    unitEl.value=[...unitEl.options].some(o=>o.value===unit)?unit:'weeks';if(hint)hint.textContent='Календарная периодичность: укажите число и единицу — дни, недели, месяцы или годы.';
  }
  function syncBearingCalculationToTask(lp,task){
    const bc=lp?.bearing?.calculation;if(!bc||!task)return false;
    const activity=canonicalActivityType36(task.activityType,task.operation);
    let changed=false,calcHours=null,approvedHours=null,scheduleSource='';
    if(activity==='regrease'){
      const calcDose=bc.calculatedRelubeDoseG??bc.calculatedDoseG??null,approvedDose=bc.approvedRelubeDoseG??bc.approvedDoseG??null;
      task.quantity=bc.relubeProcedureOnly?{...(task.quantity||{}),calculated:null,approved:'',unit:'процедура',source:bc.relubeDoseSource||bc.doseSource||task.quantity?.source||'',procedure:bc.relubeProcedure||'Через все точки до выхода свежей смазки'}:{...(task.quantity||{}),calculated:calcDose,unit:'г',source:bc.relubeDoseSource||bc.doseSource||task.quantity?.source||''};
      if(approvedDose!=null)task.quantity.approved=String(approvedDose);
      calcHours=bc.calculatedRelubeIntervalHours??bc.calculatedIntervalHours??null;approvedHours=bc.approvedRelubeIntervalHours??bc.approvedIntervalHours??null;scheduleSource=bc.relubeIntervalSource||bc.approvedIntervalSource||bc.intervalSource||'';changed=true;
    }else if(activity==='grease_full_replacement'){
      if(bc.fullRenewalApplicable===false)return false;
      task.quantity={...(task.quantity||{}),calculated:bc.calculatedFullRenewalG??null,unit:'г',source:bc.fullRenewalSource||task.quantity?.source||''};
      if(bc.approvedFullRenewalG!=null)task.quantity.approved=String(bc.approvedFullRenewalG);
      calcHours=bc.calculatedFullRenewalIntervalHours??null;approvedHours=bc.approvedFullRenewalIntervalHours??null;scheduleSource=bc.fullRenewalIntervalSource||'';changed=true;
    }
    if(activity==='regrease'||activity==='grease_full_replacement'){if(task.materialMode==='none'||!task.materialMode){task.materialMode=lp?.targetMaterialId?'point_target':'explicit';}task.schedule={...(task.schedule||{}),calculatedHours:calcHours,approvedHours,source:scheduleSource||task.schedule?.source||''};if(activity==='grease_full_replacement'&&String(bc.fullRenewalLifecycleState||'')==='CONDITION_BASED'&&approvedHours==null&&calcHours==null){task.schedule.strategy='По состоянию';task.schedule.legacyText='По состоянию / при ТО';task.schedule.runtimeHours=null;task.schedule.calendarValue=null;task.schedule.calendarUnit=null;task.schedule.runtimeUnit=null;}else if(approvedHours!=null){task.schedule.strategy='По наработке';task.schedule.legacyText=`${approvedHours} ч`;task.schedule.runtimeHours=approvedHours;task.schedule.calendarValue=null;task.schedule.calendarUnit=null;task.schedule.runtimeUnit='hours';}else if(calcHours!=null&&task.schedule?.strategy==='По наработке'){task.schedule.legacyText=`${calcHours} ч`;task.schedule.runtimeHours=calcHours;task.schedule.calendarValue=null;task.schedule.calendarUnit=null;task.schedule.runtimeUnit='hours';} }
    return changed;
  }
  function ensureBearingMaintenanceTasks(lp,d,seedTask){
    if(!lp||!d)return[];const tasks=d.tasks=d.tasks||[],same=tasks.filter(t=>String(t.lubricationPointId)===String(lp.id)),bc=lp.bearing?.calculation||{},fullApplicable=bc.fullRenewalApplicable!==false,lifecycle=String(bc.fullRenewalLifecycleState||''),fullReady=fullApplicable&&(lifecycle==='CALCULATED'||((bc.approvedFullRenewalG??bc.calculatedFullRenewalG)!=null&&(bc.approvedFullRenewalIntervalHours??bc.calculatedFullRenewalIntervalHours)!=null));const out=[];
    if(!fullApplicable){for(const t of same){const a=canonicalActivityType36(t.activityType,t.operation);if(a==='grease_full_replacement'&&t.origin==='calculation'){t.approvalStatus='review';t.verified=false;t.obsoleteByBearingPolicy=true;t.obsoleteReason=bc.maintenancePolicy==='zlg_relube_only'?'Для ZLG плановая полная замена не применяется: рабочий цикл ведётся по OEM-досмазыванию; мероприятие сохранено в истории, но исключено из утверждённого планирования.':bc.maintenancePolicy==='skf_snl_groove_service'?'SKF SNL с подачей через канавку/отверстия: плановая полная замена обычно не требуется; ранее созданное расчётное мероприятие сохранено в истории, но исключено из утверждённого планирования.':bc.maintenancePolicy==='slewing_ring_relube_procedure'?'Для опорно-поворотного подшипника рабочей операцией является OEM-досмазывание; мероприятие полной замены сохранено в истории, но исключено из утверждённого планирования.':'Для корпусного UC/UK/UEL полная замена не является штатной периодической операцией; мероприятие сохранено в истории, но исключено из утверждённого планирования.';t.schedule={...(t.schedule||{}),calculatedHours:null,approvedHours:null,runtimeHours:null,legacyText:''};t.quantity={...(t.quantity||{}),calculated:null};}}}
    if(fullApplicable&&!fullReady){for(const t of same){const a=canonicalActivityType36(t.activityType,t.operation);if(a==='grease_full_replacement'){t.approvalStatus='review';t.verified=false;t.pendingBearingPolicy=true;t.pendingReason=lifecycle==='FALLBACK_AVAILABLE'?'Период полного обновления требует подтверждения SKF SNL fallback.':'Полный цикл обновления ещё не определён полностью.';}}}
    const fullConditionBased=fullApplicable&&lifecycle==='CONDITION_BASED'&&(bc.approvedFullRenewalG??bc.calculatedFullRenewalG)!=null;
    const activities=(fullReady||fullConditionBased)?['regrease','grease_full_replacement']:['regrease'];
    for(const activityType of activities){let t=same.find(x=>canonicalActivityType36(x.activityType,x.operation)===activityType);if(!t){const seed=seedTask||same[0]||{},seedMode=seed.materialMode&&seed.materialMode!=='none'?seed.materialMode:(lp.targetMaterialId?'point_target':'explicit');t={id:LubricaCore.IDs.nextFrom(tasks,'TASK',6),lubricationPointId:lp.id,activityType,operation:window.LubricaStructureContext?.activityLabel?.(activityType)||(activityType==='regrease'?'Досмазывание':'Полная замена смазки'),materialMode:seedMode,materialId:seed.materialId??null,materialName:seed.materialName||'',toolId:seed.toolId??null,quantity:{approved:'',unit:'г'},schedule:{strategy:'По наработке',legacyText:''},approvalStatus:'review',verified:false,source:'Подшипниковый калькулятор',origin:'calculation',legacyManaged:false};tasks.push(t);}else{t.activityType=activityType;t.operation=window.LubricaStructureContext?.activityLabel?.(activityType)||t.operation;if(t.materialMode==='none'||!t.materialMode)t.materialMode=lp.targetMaterialId?'point_target':'explicit';}t.obsoleteByBearingPolicy=false;syncBearingCalculationToTask(lp,t);out.push(t);}return out;
  }
  function renderQuantityHint(task){
    const hint=$('#fQuantityHint');if(!hint)return;
    const calc=task?.quantity?.calculated,approved=task?.quantity?.approved,unit=task?.quantity?.unit||'';
    if(calc==null||calc===''){hint.textContent='';return}
    hint.textContent=approved!=null&&String(approved).trim()!==''?`Расчёт: ${calc} ${unit} · утверждено в мероприятии: ${approved} ${unit}`:`Расчёт: ${calc} ${unit} · утверждённое количество ещё не задано.`;
  }
  const calcValue=(calc,key)=>calc&&calc[key]!=null?calc[key]:null;
  function renderBearingCalcSummary(lp){
    const summary=$('#bearingCalcSummary'),note=$('#bearingCalcSummaryNote'),generic=$('#genericCalcSection');
    if(!summary||!lp)return;
    const isBearing=lp.category==='bearing';
    summary.hidden=!isBearing;summary.style.display=isBearing?'':'none';
    if(note){note.hidden=!isBearing;note.style.display=isBearing?'':'none'}
    if(generic){generic.hidden=isBearing;generic.style.display=isBearing?'none':''}
    if(!isBearing)return;

    // Motor bearing points are calculated by the Motor OEM engine. Never let a stale
    // generic bearing calculation override the active motor-service result in the side card.
    const motorCtx=window.LubricaMotorUI?.motorContext?.(lp,db36());
    const motorService=window.LubricaMotorUI?.savedMotorService?.(lp,db36())||lp.motorService||null;
    if(motorCtx&&motorService&&Object.keys(motorService).length){
      const r=motorService.result||{},task=currentTask36();
      const taskDose=task?.quantity?.approved??task?.quantity?.calculated??null;
      const taskHours=task?.schedule?.approvedHours??task?.schedule?.runtimeHours??task?.schedule?.calculatedHours??null;
      const dose=r.doseG??taskDose, hours=r.intervalHours??taskHours;
      const source=r.source||task?.quantity?.source||task?.schedule?.source||motorService.manufacturer||'Motor OEM';
      const confidence=r.confidence||'';
      const noRoutine=motorService.policy==='NO_ROUTINE_RELUBE';
      $('#bearingSummaryDose').textContent=noRoutine?'Не предусмотрено OEM':(dose!=null||hours!=null?`${dose??'—'} г / ${hours??'—'} ч`:'—');
      $('#bearingSummaryDoseApproved').textContent=noRoutine?'Плановое досмазывание отключено':(taskDose!=null||taskHours!=null?`Мероприятие: ${taskDose??dose??'—'} г / ${taskHours??hours??'—'} ч`:'Результат ещё не применён к мероприятию');
      $('#bearingSummaryFullFill').textContent='Не применяется';
      $('#bearingSummaryFullFillApproved').textContent='Для электродвигателя ведётся OEM-цикл досмазывания';
      $('#bearingSummaryInterval').textContent=noRoutine?'OEM · без планового досмазывания':'1 OEM-цикл';
      $('#bearingSummaryIntervalApproved').textContent=noRoutine?'Закрытая / необслуживаемая конструкция':`${motorService.manufacturer||motorCtx.profile?.manufacturer||'OEM'}${motorService.family?` · ${motorService.family}`:''}`;
      if(note)note.innerHTML=`<b>${confidence?'OEM · '+esc(confidence):'Motor OEM'}</b><span>${esc(source)}${motorService.mode==='machine_oem'?' · данные конкретного двигателя':' · каталожный baseline / OEM resolver'}</span>`;
      return;
    }

    const c=lp.bearing?.calculation||{};
    const doseCalc=calcValue(c,'calculatedRelubeDoseG')??calcValue(c,'calculatedDoseG'),doseApproved=calcValue(c,'approvedRelubeDoseG')??calcValue(c,'approvedDoseG'),relInt=calcValue(c,'calculatedRelubeIntervalHours')??calcValue(c,'calculatedIntervalHours'),relIntApproved=calcValue(c,'approvedRelubeIntervalHours')??calcValue(c,'approvedIntervalHours');
    const renewalCalc=calcValue(c,'calculatedFullRenewalG'),renewalApproved=calcValue(c,'approvedFullRenewalG'),renewalInt=calcValue(c,'calculatedFullRenewalIntervalHours'),renewalIntApproved=calcValue(c,'approvedFullRenewalIntervalHours');
    $('#bearingSummaryDose').textContent=doseCalc!=null?`${doseCalc} г / ${relInt??'—'} ч`:'—';
    $('#bearingSummaryDoseApproved').textContent=doseApproved!=null||relIntApproved!=null?`Утверждено: ${doseApproved??doseCalc??'—'} г / ${relIntApproved??relInt??'—'} ч`:'Не утверждено';
    const fullApplicable=c.fullRenewalApplicable!==false,lifecycle=String(c.fullRenewalLifecycleState||'');
    $('#bearingSummaryFullFill').textContent=!fullApplicable?'Не применяется планово':(renewalCalc!=null?`${renewalCalc} г / ${renewalInt!=null?renewalInt+' ч':(lifecycle==='FALLBACK_AVAILABLE'||lifecycle==='PARTIAL_OEM'?'период требует решения':'—')}`:'—');
    const policyId=String(c.maintenancePolicy||''); const noFullLabel=policyId==='zlg_relube_only'?'OEM-досмазывание ZLG':policyId==='skf_snl_groove_service'?'SKF SNL: обновление по состоянию / при ТО':policyId==='slewing_ring_relube_procedure'?'OEM-досмазывание опорно-поворотного подшипника':policyId==='housed_relube_only'?'UC/UK/UEL: обслуживание досмазыванием':'Обслуживание досмазыванием';
    $('#bearingSummaryFullFillApproved').textContent=fullApplicable?(renewalApproved!=null||renewalIntApproved!=null?`Утверждено: ${renewalApproved??renewalCalc??'—'} г / ${renewalIntApproved??renewalInt??'—'} ч`:'Не утверждено'):noFullLabel;
    $('#bearingSummaryInterval').textContent=c.calculationVersion?.includes('1.0.27.')?(fullApplicable?'2 независимых цикла':'1 рабочий цикл'):'—';
    $('#bearingSummaryIntervalApproved').textContent=c.calculationVersion?.includes('1.0.27.')?(fullApplicable?'Досмазывание + полная замена':'Только досмазывание'):'Рабочий цикл не пересчитан';
    const warnings=Array.isArray(c.warnings)?c.warnings:[];
    if(note)note.innerHTML=warnings.length?`<b>⚠ ${warnings.length}</b><span>${esc(warnings[0])}${warnings.length>1?` · ещё ${warnings.length-1}`:''}</span>`:'<b>Расчётный модуль</b><span>Откройте отдельное окно для исходных данных, формул и утверждения.</span>';
  }
  function renderGenericCalculationSummary(lp,task){
    const box=$('#genericCalcSection'),title=$('#genericCalcTitle'),text=$('#genericCalcText'),values=$('#genericCalcValues');
    if(!box||!lp)return;
    if(lp.category==='bearing'){box.hidden=true;return}
    box.hidden=false;
    const context={point:lp,task,category:lp.category,activityType:task?.activityType||null};
    const status=window.LubricaCalculations?.moduleStatus?.(context);
    const summary=window.LubricaCalculations?.summary?.(context);
    if(title)title.textContent=summary?.title||status?.module?.title||'Расчёт и утверждение';
    if(text)text.textContent=status?.ready?(summary?.calculatedAt?'Расчёт выполнен. Откройте модуль для просмотра или изменения исходных данных.':'Расчётный модуль доступен. Откройте его для ввода исходных данных.'):status?.registered?'Модуль зарегистрирован и будет подключён отдельным этапом.':'Для категории пока нет расчётного модуля.';
    if(values){
      const items=Array.isArray(summary?.items)?summary.items:[];
      values.innerHTML=items.length?items.map(x=>`<div><span>${esc(x.label)}</span><strong>${esc(x.value??'—')}</strong><small>${esc(x.approved||'')}</small></div>`).join(''):'';
    }
  }
  function bearingHousingContext36(lp){
    const d=db36();
    const binding=lp?.componentBinding||{};
    const sourceComponent=(d?.components||[]).find(x=>String(x.id)===String(binding.sourceComponentId||''))||null;
    const genericHousing=lp?.bearingHousing||{};
    const rawParts=[
      genericHousing.rawMarking,
      genericHousing.designation,
      lp?.fanLubrication?.rawHousingMarking,
      lp?.installedComponent?.sourceName,
      lp?.installedComponent?.name,
      binding.structuralText,
      sourceComponent?.name,
      sourceComponent?.model,
      sourceComponent?.designation,
      lp?.name
    ].filter(Boolean).map(String);
    const text=rawParts.join(' ');
    const explicit=String(genericHousing.family||lp?.fanLubrication?.housingFamily||(lp?.oscillatingLinkage?.connectionType==='snl'?'SNL':lp?.oscillatingLinkage?.connectionType==='snh'?'SNH':'')).trim().toUpperCase();
    const snlMatch=text.match(/\bSNL\s*[-_]?\s*\d{3}(?:-\d{3})?/i);
    const snhMatch=text.match(/\bSNH\s*[-_]?\s*\d{3}(?:\s*[A-Z]{1,3})?/i);
    const zlgMatch=text.match(/\bZLG\s*[-_]?\s*\d{3}[A-Z]*/i);
    let family=explicit;
    if(!family&&snlMatch)family='SNL';
    else if(!family&&snhMatch)family='SNH';
    else if(!family&&zlgMatch)family='ZLG';
    else if(!family&&/TROE?STER|TRÖSTER/i.test(text))family='TROESTER';
    else if(!family&&/FERRARI/i.test(text))family='FERRARI';
    let raw=String(genericHousing.rawMarking||genericHousing.designation||lp?.fanLubrication?.rawHousingMarking||'').trim();
    if(!raw&&family==='SNL'&&snlMatch)raw=snlMatch[0].replace(/\s+/g,' ').trim();
    if(!raw&&family==='SNH'&&snhMatch)raw=snhMatch[0].replace(/\s+/g,' ').trim();
    if(!raw&&family==='ZLG'&&zlgMatch)raw=zlgMatch[0].replace(/\s+/g,' ').trim();
    return {family,raw,text,sourceComponent};
  }
  function bearingCalcBaseInput(lp,form){
    const pointBearingDesignation=String(lp?.bearing?.actualDesignation||lp?.bearing?.structuralDesignation||lp?.bearing?.effectiveDesignation||'').trim();
    const isTroesterPoint=String(lp?.fanLubrication?.housingFamily||'').trim().toUpperCase()==='TROESTER';
    const inferredZoneBearing=!isTroesterPoint&&Array.isArray(lp?.fanLubrication?.internalBearings)&&lp.fanLubrication.internalBearings.length===1?lp.fanLubrication.internalBearings[0]:'';
    const resolved=window.LubricaBearings?.lookup?.(pointBearingDesignation||inferredZoneBearing||'');
    const parsed=resolved?.parsed||{},record=resolved?.record||{},b=lp?.bearing||{},c=b.calculation||{};
    const isSlewingRing=record?.bearingType==='slewing_ring_four_point_ball'||parsed?.inferredType==='slewing_ring_four_point_ball';
    const task=currentTask36(),mat=material36(effectiveMaterialId36(task,lp));
    const db=db36(),fanEquipment=(db?.equipment||[]).find(e=>e.id===lp?.equipmentId)||null,fanManufacturerStored=String(c.fanManufacturer||fanEquipment?.manufacturer||(isTroesterPoint?'Ventapp':'')).trim();
    const housingContext=bearingHousingContext36(lp);
    const snlRaw=housingContext.family==='SNL'?housingContext.raw:'';
    const snlFamily=housingContext.family==='SNL'?'SNL':'';
    const genericHousingFamily=['SNL','SNH'].includes(housingContext.family)?housingContext.family:'';
    const genericHousingMarking=genericHousingFamily?housingContext.raw:'';
    const val=name=>numberValue(form?.elements?.[name]?.value);
    const value=(name,fallback)=>form?.elements?.[name]?form.elements[name].value:fallback;
    const selectedManufacturer=value('manufacturer',c.manufacturer||record.manufacturer||'auto');
    const selectedNorm=window.LubricaBearingOEM?.normManufacturer?.(selectedManufacturer)||String(selectedManufacturer||'auto');
    const recordNorm=window.LubricaBearingOEM?.normManufacturer?.(record.manufacturer||'')||'auto';
    const allowCrossBrandMass=!!form?.elements?.allowCrossBrandMass?.checked;
    const explicitMass=val('bearingMassKg');
    let catalogMass=record.insertMassKg??record.massKg??null;
    if(selectedNorm!=='auto'&&recordNorm!=='auto'&&selectedNorm!==recordNorm&&!allowCrossBrandMass)catalogMass=null;
    const effectiveMassManufacturer=explicitMass!=null&&selectedNorm!=='auto'&&!allowCrossBrandMass?selectedNorm:(record.manufacturer||'');
    return {
      d:isTroesterPoint&&!pointBearingDesignation?null:(Number(parsed?.dimensions?.d??b.d)||null),
      D:isTroesterPoint&&!pointBearingDesignation?null:(Number(parsed?.dimensions?.D??b.D)||null),
      B:isTroesterPoint&&!pointBearingDesignation?null:(Number(parsed?.dimensions?.B??b.B)||null),
      bearingType:record.bearingType||parsed?.inferredType||b.bearingType||'unknown',
      sealing:parsed?.sealing||b.sealing||'unknown',
      sealingCode:parsed?.sealingCode||b.sealingCode||'',
      designation:parsed?.original||pointBearingDesignation||'',
      bearingGeometrySource:isTroesterPoint?'POINT_BEARING':(pointBearingDesignation?'POINT_BEARING':(inferredZoneBearing?'FAN_ZONE_SINGLE_BEARING_FALLBACK':'UNRESOLVED')),
      manufacturer:selectedManufacturer,
      insertDesignation:record.insertDesignation||'',
      unitMassKg:record.unitMassKg??null,
      bearingMassKind:record.insertMassKg!=null?'insert':'bearing',
      massManufacturer:effectiveMassManufacturer,
      massSource:record.sourceReference||record.massSource||record.sourceNote||'',
      allowCrossBrandMass,
      method:value('relubeMethod',c.relubeMethod||'lubrica_unified'),
      bearingMassKg:explicitMass??c.bearingMassKg??catalogMass,
      fillRatio:1,
      greaseDensity:val('greaseDensity')??c.greaseDensity??window.LubricaMaterialIntegration?.density?.(lp,{task})??numberValue(mat?.density)??null,
      rpm:val('rpm')??c.rpm??null,
      limitingRpm:val('limitingRpm')??c.limitingRpm??record.greaseLimitingRpm??record.limitingRpm??null,
      loadRatioPC:val('loadRatioPC')??c.loadRatioPC??null,
      oemFreeSpaceCm3:record.oemFreeSpaceCm3??c.oemFreeSpaceCm3??null,
      temperatureC:isSlewingRing?(val('vluTemperatureC')??c.temperatureC??null):(val('temperatureC')??c.temperatureC??70),
      shaftOrientation:value('shaftOrientation',c.shaftOrientation||'horizontal'),
      loadClass:value('loadClass',c.loadClass||'medium'),
      contamination:value('vluContamination',value('contamination',c.contamination||'normal')),
      vibration:value('vibration',c.vibration||'normal'),
      outerRingRotation:form?.elements?.outerRingRotation?!!form.elements.outerRingRotation.checked:!!c.outerRingRotation,
      baseHours:val('baseIntervalHours')??c.baseIntervalHours??null,
      intervalSource:value('intervalSource',c.intervalSource||'unified_auto'),
      conditionFactor:val('conditionFactor')??c.conditionFactor??1,
      fanLubrication:lp.fanLubrication?{...lp.fanLubrication}:null,
      fanManufacturer:lp?.fanLubrication?value('fanManufacturer',fanManufacturerStored):'',
      zlgServiceMode:value('zlgServiceMode',c.zlgServiceMode||(/reitz/i.test(value('fanManufacturer',fanManufacturerStored))?'reitz_kxe':'guarded_auto')),
      zlgVariant:value('zlgVariant',c.zlgVariant||'auto'),
      housingFamily:genericHousingFamily,
      housingMarking:genericHousingMarking,
      snlFeedMethod:value('snlFeedMethod',c.snlFeedMethod||'side'),
      snlServiceMode:housingContext.family==='SNL'&&!lp?.fanLubrication?'skf_snl':value('snlServiceMode',c.snlServiceMode||(/reitz/i.test(value('fanManufacturer',fanManufacturerStored))?'reitz_kxe_single':'auto')),
      ventappMachineDoseG:val('ventappMachineDoseG')??c.ventappMachineDoseG??null,
      ventappMachineIntervalHours:val('ventappMachineIntervalHours')??c.ventappMachineIntervalHours??null,
      ventappGrease:value('ventappGrease',c.ventappGrease||''),
      ventappLubricationSource:value('ventappLubricationSource',c.ventappLubricationSource||''),
      troesterBaseIntervalHours:val('troesterBaseIntervalHours')??c.troesterBaseIntervalHours??null,
      troesterBaseIntervalSource:value('troesterBaseIntervalSource',c.troesterBaseIntervalSource||''),
      troesterUseAutomaticDiagram:isTroesterPoint,
      ferrariCart01DoseG:val('ferrariCart01DoseG')??c.ferrariCart01DoseG??null,
      ferrariCart01IntervalHours:val('ferrariCart01IntervalHours')??c.ferrariCart01IntervalHours??null,
      ferrariMethodMode:value('ferrariMethodMode',c.ferrariMethodMode||'cart01'),
      ferrariSupportType:value('ferrariSupportType',c.ferrariSupportType||''),
      ferrariBearingSide:value('ferrariBearingSide',c.ferrariBearingSide||'pulley'),
      fullRenewalFallbackMode:value('fullRenewalFallbackMode',c.fullRenewalFallbackMode||'review')
    };
  }
  function calcMessages(result,input){
    const warnings=[...(result?.warnings||[])],infos=[],technical=[];
    const policy=result?.maintenancePolicy||{};
    if(String(input?.housingFamily||'').toUpperCase()==='SNH')warnings.push('Корпус SKF SNH распознан отдельно от SNL. Доза досмазывания рассчитывается по фактическому внутреннему подшипнику; полный запас смазки корпуса SNH не утверждается автоматически без отдельной SNH-методики.');
    if(result?.relube?.error&&input.method!=='oem'&&input.method!=='manual')warnings.push(result.relube.error);
    if(policy.fullRenewal){if(result?.fullRenewal?.error)warnings.push(result.fullRenewal.error);if(result?.renewalInterval?.error)warnings.push(result.renewalInterval.error);}
    if(result?.interval?.error)warnings.push(result.interval.error);
    const intervalSourceManufacturer=String(result?.relubeInterval?.sourceManufacturer||result?.interval?.sourceManufacturer||'');
    const applicationSpecificOEM=!!(result?.relube?.applicationSpecific||result?.relubeInterval?.sourceLevel==='oem_exact'||result?.interval?.sourceLevel==='oem_exact');
    if(!applicationSpecificOEM&&intervalSourceManufacturer==='engineering'&&result?.speed?.limit&&result?.speed?.speedFactor>result.speed.limit)technical.push('Инженерная проверка LUBRICA: расчётный скоростной фактор выше внутреннего ориентировочного диапазона. Это не OEM-предел; при наличии OEM-интервала данная оценка не применяется.');
    if(policy.id==='housed_relube_only')infos.push('Корпусной узел UC/UK/UEL: штатное обслуживание — досмазывание с вытеснением старой смазки. Полная замена и отдельный интервал полной замены автоматически не назначаются.');
    if(policy.id==='skf_snl_side_service')infos.push('SKF SNL: подача сбоку — рабочая доза рассчитывается по 0,005×D×B; полный запас корпуса восстанавливается по OEM-таблице 40% и планируется отдельным мероприятием примерно после пяти досмазываний.');
    if(policy.id==='skf_snl_groove_service')infos.push('SKF SNL: подача через канавку/отверстия — рабочая доза рассчитывается по 0,002×D×B; корпус обычно заполняется на 20%, а плановая полная замена автоматически не назначается.');
    if(policy.id==='reitz_kxe_single_service')infos.push('REITZ KXE: для одиночной опоры доза и период досмазывания, а также количество первичного/нового заполнения берутся из application-specific таблицы REITZ. Если отдельный период полного обновления у REITZ не задан, SKF SNL может быть принят только как явный fallback для периодичности.');
    const r=result?.relube||{};
    if(policy.id==='housed_relube_only'&&r.value!=null&&(r.constructionReference||r.antiOvergreaseGuard)){
      const ref=r.referenceDoseG||r.constructionReference?.relubeG||r.value;
      const gen=r.genericDoseG;
      infos.push(gen!=null?`Доза ${r.value} г определена по специализированным данным UC/UK/UEL; общая формула 0,005×D×B (${gen} г) не применена для защиты от передозировки.`:`Доза ${r.value} г определена по специализированным данным UC/UK/UEL; общая геометрическая формула не используется как основной метод для этой конструкции.`);
    }
    for(const a of (result?.assumptions||[])){
      const t=String(a||'').trim();if(!t)continue;
      if(/LUBM baseline|Опубликованный диапазон|коэффициент|коррекц|источник базового интервала/i.test(t))technical.push(t);
      else if(/полная замена|UC\/UK\/UEL|корпусн|передоз|не является OEM|неуказанного производителя/i.test(t))infos.push(t);
      else technical.push(t);
    }
    const uniq=a=>[...new Set(a.filter(Boolean))];
    const uw=uniq(warnings),ui=uniq(infos).filter(x=>!uw.includes(x)),ut=uniq(technical).filter(x=>!uw.includes(x)&&!ui.includes(x));
    return {warnings:uw,infos:ui,technical:ut};
  }
  function calcWarnings(result,input){return calcMessages(result,input).warnings;}
  function openBearingCalculationImpl(context=null){
    const lp=context?.point||currentPoint36();if(!lp||lp.category!=='bearing'){toast('Расчёт подшипника доступен только для точки категории «Подшипник».','warn');return false}
    const dialog=document.getElementById('bearingCalcDialog');if(!dialog)return false;
    const b=lp.bearing||{},c=b.calculation||{};
    const housingContext=bearingHousingContext36(lp);
    const resolvedHousingFamily=housingContext.family;
    const rawHousingMarking=housingContext.raw;
    const isZLG=resolvedHousingFamily==='ZLG';
    const isSNL=resolvedHousingFamily==='SNL';
    const isSNH=resolvedHousingFamily==='SNH';
    const snlRawMarking=isSNL?rawHousingMarking:'';
    const snlProfile=isSNL?window.LubricaBearingOEM?.snlHousingProfile?.(snlRawMarking):null;
    const zlgProfile=isZLG?window.LubricaBearingOEM?.zlgHousingProfile?.(rawHousingMarking):null;
    const equipmentRecord=(db36()?.equipment||[]).find(e=>e.id===lp.equipmentId)||null;
    const isFanContext=!!lp.fanLubrication;
    const fanEquipment=isFanContext?equipmentRecord:null,fanManufacturer=String(c.fanManufacturer||fanEquipment?.manufacturer||(resolvedHousingFamily==='TROESTER'?'Ventapp':'')).trim(),reitzFan=isFanContext&&/reitz/i.test(fanManufacturer);
    const zlgDetectedVariant=isZLG?(window.LubricaBearingOEM?.zlgVariant?.(lp.fanLubrication?.rawHousingMarking||'')||null):null;
    const savedZlgMode=c.zlgServiceMode||(reitzFan?'reitz_kxe':'guarded_auto');
    const savedSnlMode=isFanContext?(c.snlServiceMode||(reitzFan?'reitz_kxe_single':'auto')):'skf_snl';
    const reitzTableHtml=isZLG?(()=>{const O=window.LubricaBearingOEM||{},rows=[];for(const [variant,tab] of [['AA/AK',O.reitzZlgAAAK||{}],['AC',O.reitzZlgAC||{}]])for(const code of Object.keys(tab).sort((a,b)=>Number(a)-Number(b))){const r=tab[code];rows.push(`<tr><td>${variant}</td><td>ZLG${code}</td><td>${esc(r.floating||'—')}</td><td>${esc(r.locating||'—')}</td>${(r.intervals||[]).map(v=>`<td>${v??'—'}</td>`).join('')}<td>${r.relubeG??'—'}</td></tr>`);}return `<details class="expert-only reitz-zlg-table-details"><summary>Полная встроенная таблица REITZ KXE Table 11</summary><div class="table-wrap"><table class="compact-table"><thead><tr><th>Исп.</th><th>Корпус</th><th>Плавающий</th><th>Фиксирующий</th><th>3000–3600</th><th>1800–3000</th><th>1500–1800</th><th>1000–1500</th><th>≤1000</th><th>Доза, г</th></tr></thead><tbody>${rows.join('')}</tbody></table></div><small>Интервалы — рабочие часы при 75 °C. Доза — на один подшипник / соответствующую физическую точку досмазывания. Температурные коэффициенты REITZ: 75→1.00; 80→0.85; 85→0.70; 90→0.55; 95→0.45; 100→0.35.</small></details>`;})():'';
    const snlTableHtml=isSNL?(()=>{const O=window.LubricaBearingOEM||{},rows=[];for(const code of Object.keys(O.skfSnlHousingTable||{})){const r=O.skfSnlHousingTable[code];rows.push(`<tr><td>SNL ${esc(code)}</td><td>${r.fill20G}</td><td>${r.fill40G}</td><td>${r.guideRelubeG}</td></tr>`);}return `<details class="expert-only reitz-zlg-table-details"><summary>Встроенная таблица SKF SNL — заполнение корпуса и guideline</summary><div class="table-wrap"><table class="compact-table"><thead><tr><th>Корпус</th><th>20%, г</th><th>40%, г</th><th>Guideline досмазывания, г</th></tr></thead><tbody>${rows.join('')}</tbody></table></div><small>20% — рекомендуемое заполнение при подаче через канавку/отверстия наружного кольца; 40% — при подаче сбоку. Рабочая доза досмазывания рассчитывается по фактическому внутреннему подшипнику: 0,002×D×B или 0,005×D×B.</small></details>`;})():'';
    const reitzSingleTableHtml=isSNL?(()=>{const O=window.LubricaBearingOEM||{},rows=[];for(const [bearing,r] of Object.entries(O.reitzKxeSingleBearingTable||{})){rows.push(`<tr><td>${esc(r.housing)}</td><td>${esc(bearing)}</td><td>${r.intervals?.[3000]??'—'}</td><td>${r.intervals?.[1500]??'—'}</td><td>${r.intervals?.[1000]??'—'}</td><td>${r.refillG??'—'}</td><td>${r.relubeG??'—'}</td></tr>`);}return `<details class="expert-only reitz-zlg-table-details"><summary>Встроенная таблица REITZ KXE — одиночные подшипниковые опоры</summary><div class="table-wrap"><table class="compact-table"><thead><tr><th>Корпус REITZ</th><th>Подшипник</th><th>3000 об/мин</th><th>1500</th><th>1000</th><th>Первич./новое заполнение, г</th><th>Досмазывание, г</th></tr></thead><tbody>${rows.join('')}</tbody></table></div><small>Интервалы относятся к 75 °C. При другой температуре применяется коррекция REITZ. При наличии таблички «Wartung der Lager» на конкретном вентиляторе её значения имеют наивысший приоритет.</small></details>`;})():'';
    const pointBearingDesignation=String(b.actualDesignation||b.structuralDesignation||b.effectiveDesignation||'').trim();
    const inferredZoneBearing=resolvedHousingFamily!=='TROESTER'&&Array.isArray(lp.fanLubrication?.internalBearings)&&lp.fanLubrication.internalBearings.length===1?lp.fanLubrication.internalBearings[0]:'';
    const designation=pointBearingDesignation||inferredZoneBearing||'Не задан';
    const resolved=window.LubricaBearings?.lookup?.(designation),record=resolved?.record||{};
    const isSlewingRing=record?.bearingType==='slewing_ring_four_point_ball'||resolved?.parsed?.inferredType==='slewing_ring_four_point_ball';
    const isInsertUnit=record?.bearingType==='bearing_unit'||resolved?.parsed?.inferredType==='bearing_unit';
    const supportConstructionLabel=isSNL?'Корпусная опора SKF SNL':isSNH?'Корпусная опора SKF SNH':isInsertUnit?'Корпусной узел UC/UK':'Подшипник без подтверждённого корпуса';
    const task=context?.task||currentTask36(),mat=material36(effectiveMaterialId36(task,lp));
    const inferredSlewingManufacturer=isSlewingRing?'FAG':null;
    const defaultManufacturer=(c.manufacturerSelectionExplicit&&c.manufacturer)?c.manufacturer:(record.manufacturer||inferredSlewingManufacturer||'auto');
    const normM=v=>window.LubricaBearingOEM?.normManufacturer?.(v)||String(v||'auto');
    const defaultNorm=normM(defaultManufacturer),recordNorm=normM(record.manufacturer||'auto'),savedMassNorm=normM(c.massManufacturer||'auto');
    const savedMassUsable=c.bearingMassKg!=null&&(savedMassNorm==='auto'||defaultNorm==='auto'||savedMassNorm===defaultNorm);
    const recordMassUsable=recordNorm==='auto'||defaultNorm==='auto'||recordNorm===defaultNorm;
    const defaultBearingMass=savedMassUsable?c.bearingMassKg:(recordMassUsable?(record.insertMassKg??record.massKg??null):null);
    const defaultFillRatio=c.fillRatio??null;
    const defaultDensity=c.greaseDensity??window.LubricaMaterialIntegration?.density?.(lp,{task})??numberValue(mat?.density)??null;
    const fmt=v=>v==null?'':String(v);
    const housingFamilyCode=resolvedHousingFamily;
    const housingManufacturer=['SNL','SNH'].includes(housingFamilyCode)?'SKF':housingFamilyCode==='ZLG'?'NTN-SNR':housingFamilyCode==='TROESTER'?'Tröster':housingFamilyCode==='FERRARI'?'Ferrari':(/ferrari/i.test(rawHousingMarking)?'Ferrari':'Не определён');
    const housingDisplay=snlProfile?.designation||rawHousingMarking||housingFamilyCode||'Не указан';
    const equipmentDisplay=equipmentRecord?.name||equipmentRecord?.designation||equipmentRecord?.code||lp.equipmentId||'Оборудование';
    const equipmentMakerDisplay=fanManufacturer||'Не указан';
    const bearingManufacturerDisplay=defaultNorm==='auto'?'не указан':defaultNorm;
    const fanArrangement=fanEquipment?.fanBearingArrangement||null;
    const arrangementType=fanArrangement?.bearingArrangementType||'';
    const arrangementLabel=arrangementType==='TWO_SEPARATE_SUPPORTS'?'Две раздельные опоры':arrangementType==='MULTI_BEARING_BLOCK'?'Совмещённый подшипниковый блок':arrangementType==='CUSTOM_SUPPORT_ARRANGEMENT'?'Специальная / другая конструкция':(lp.fanLubrication?.housingFamily?'Подшипниковая схема подтверждена':'Не определена');
    const supportScopeLabel=arrangementType==='TWO_SEPARATE_SUPPORTS'?'Расчёт относится к одной фактической подшипниковой опоре.':arrangementType==='MULTI_BEARING_BLOCK'?'Расчёт относится к одной физической точке подачи совмещённого блока; число маслёнок не приравнивается автоматически к числу подшипников.':'';
    dialog.innerHTML=`<form class="bearing-calc-modal-form" id="bearingCalcForm" novalidate>
      <div class="dialog-head"><div><span class="eyebrow">РАСЧЁТ СМАЗКИ</span><h2>${esc(housingDisplay!=='Не указан'?`${housingDisplay} · ${designation}`:designation)}</h2><p class="dialog-copy">Подшипник точки: <b>${esc(designation)}</b> · производитель: <span data-header-bearing-maker>${esc(bearingManufacturerDisplay)}</span> · ${b.d||'—'} × ${b.D||'—'} × ${b.B||'—'} мм${fanEquipment?` · ${esc(arrangementLabel)}`:''}</p><div class="bearing-calc-mode-switch"><button type="button" class="mode-btn active" data-calc-mode="simple">Простой режим</button><button type="button" class="mode-btn" data-calc-mode="expert">Экспертный режим</button><button type="button" class="mode-btn" data-open-source-registry>Обоснование</button></div></div><button type="button" class="icon-btn" data-close>×</button></div>

      <section class="calc-simple-overview simple-only" data-simple-overview>
        <div class="calc-primary-result" data-primary-result>
          <small>Рекомендация</small>
          <strong data-primary-result-value>Введите исходные данные</strong>
          <span data-primary-result-action>После расчёта здесь останется только рабочая доза и периодичность.</span>
          <div class="calc-primary-result-meta"><b data-primary-method-human>Методика определяется автоматически</b><span data-primary-result-context>Технические детали скрыты в простом режиме.</span></div>
          <div class="simple-renewal-line" data-simple-renewal-line><b>Полное обновление:</b><span>статус будет определён после расчёта</span></div>
        </div>
        <div class="calc-simple-context">
          <div><small>Оборудование</small><strong>${esc(equipmentDisplay)}</strong><span>Производитель: <b data-simple-equipment-maker>${esc(equipmentMakerDisplay)}</b></span></div>
          <div><small>${isFanContext?'Подшипниковый узел':'Конструкция опоры'}</small><strong>${esc(isFanContext?(housingDisplay!=='Не указан'?housingDisplay:designation):supportConstructionLabel)}</strong><span>${isFanContext?'Производитель узла':isSNL?'Корпус':'Подшипник'}: <b>${esc(isFanContext?housingManufacturer:(isSNL?housingDisplay:designation))}</b>${isFanContext&&lp.fanLubrication?.portCount?` · точек подачи: ${esc(lp.fanLubrication.portCount)}`:''}</span></div>
          <div><small>Методика</small><strong data-simple-method-title>Определяется автоматически</strong><span data-simple-method-status>После ввода исходных данных LUBRICA выберет наиболее конкретную доступную методику.</span></div>
        </div>
        <div class="calc-simple-status" data-simple-status><b>Введите исходные данные</b><span>Для периодичности обычно нужны рабочие обороты.</span></div>
      </section>

      <section class="bearing-calc-modal-section oem-profile-section expert-only expert-advanced-section">
        <div class="bearing-calc-modal-title"><span>OEM</span><div><h3>Производитель и методика</h3><p>Система сначала ищет точное OEM-значение, затем официальную методику выбранного производителя. Если их нет, автоматический OEM-результат не подменяется методикой другого бренда.</p></div></div>
        <div class="bearing-calc-modal-grid cols-4">
          ${(isSNL||isZLG||isSlewingRing)?'<label class="expert-only">':'<label>'}Производитель подшипника / вставки<select name="manufacturer"><option value="auto" ${defaultManufacturer==='auto'?'selected':''}>Авто / не указан</option><option value="SKF" ${defaultManufacturer==='SKF'?'selected':''}>SKF</option><option value="NSK" ${defaultManufacturer==='NSK'?'selected':''}>NSK</option><option value="FAG" ${['FAG','SCHAEFFLER','INA'].includes(defaultManufacturer)?'selected':''}>FAG / Schaeffler</option><option value="NTN-SNR" ${['NTN','NTN-SNR','SNR'].includes(defaultManufacturer)?'selected':''}>NTN-SNR</option><option value="TIMKEN" ${defaultManufacturer==='TIMKEN'?'selected':''}>Timken</option></select></label>${isSlewingRing?'<div class="calc-inline-note"><b>INA / Schaeffler — определено по обозначению</b><span>VLU20 распознан по точной OEM-записи справочника.</span></div>':''}
          <div class="calc-result-box span-3"><small>Надёжность результата</small><strong data-oem-level>—</strong><span data-oem-source>Выберите производителя. LUBRICA сама подберёт лучший доступный OEM-метод.</span><small class="expert-only">A — точное OEM · B — OEM-метод · C — смешанные/с допущениями · D — инженерная оценка · X — автоматического результата недостаточно</small></div>
        </div>
      </section>
      ${isZLG?`<div class="calc-inline-note simple-only" data-zlg-simple-note><b>ZLG ${esc(zlgProfile?.code||'')} — OEM выбирается автоматически</b><span>${savedZlgMode==='reitz_kxe'||reitzFan?`REITZ распознан: LUBRICA автоматически применяет таблицу REITZ KXE и выбирает дозу/интервал по исполнению ZLG, оборотам и температуре корпуса.`:savedZlgMode==='housing_2024'&&zlgProfile?`Используется подтверждённая общая инструкция NTN-SNR: ${zlgProfile.relubeVolumeCm3} см³ на позицию; 3000 ч, не реже 2 раз в год.`:'Чтобы LUBRICA сама выбрала application-specific OEM, укажите производителя вентилятора один раз прямо здесь.'}</span>${savedZlgMode==='guarded_auto'&&!reitzFan?`<label class="zlg-simple-oem-choice">Производитель вентилятора<select name="fanManufacturer"><option value="" ${!fanManufacturer?'selected':''}>Не указан</option><option value="REITZ" ${reitzFan?'selected':''}>REITZ</option><option value="FERRARI" ${/ferrari/i.test(fanManufacturer)?'selected':''}>Ferrari</option><option value="VENTAPP" ${/ventapp/i.test(fanManufacturer)?'selected':''}>Ventapp</option><option value="OTHER" ${fanManufacturer&&!/reitz|ferrari|ventapp/i.test(fanManufacturer)?'selected':''}>Другой / неизвестный</option></select><small>Для REITZ методика KXE включится автоматически. Экспертный режим не требуется.</small></label>`:`<input type="hidden" name="fanManufacturer" value="${esc(fanManufacturer)}">`}</div>
      <section class="bearing-calc-modal-section expert-only calculation-step" data-ui-context="ZLG"><div class="bearing-calc-modal-title"><span>01</span><div><h3>Конструкция и OEM-методика ZLG</h3><p>Приоритет: REITZ конкретного применения → другой OEM вентилятора/узла → NTN-SNR корпуса. В простом режиме выбор запоминается.</p></div></div><div class="calc-inline-note calc-info-note"><b>Совмещённый блок ZLG</b><span>Выбор способа подачи SKF SNL к этому узлу не применяется. Расчёт ведётся по фактической схеме ZLG и выбранной OEM-методике.</span></div><div class="bearing-calc-modal-grid cols-4"><label class="span-2">Методика ZLG<select name="zlgServiceMode"><option value="guarded_auto" ${savedZlgMode==='guarded_auto'?'selected':''}>Авто — REITZ по производителю, иначе запросить подтверждение</option><option value="reitz_kxe" ${savedZlgMode==='reitz_kxe'?'selected':''}>REITZ KXE — Table 11 (приоритет для вентиляторов REITZ)</option><option value="application_oem" ${savedZlgMode==='application_oem'?'selected':''}>Другой OEM конкретного вентилятора / узла — вручную</option><option value="housing_2024" ${savedZlgMode==='housing_2024'?'selected':''}>NTN-SNR ZLG — общая инструкция корпуса 2024</option></select></label><label>Исполнение ZLG<select name="zlgVariant"><option value="auto" ${!c.zlgVariant||c.zlgVariant==='auto'?'selected':''}>Авто из маркировки (${esc(zlgDetectedVariant||'не распознано')})</option><option value="AA" ${c.zlgVariant==='AA'?'selected':''}>AA — шариковый / шариковый</option><option value="AK" ${c.zlgVariant==='AK'?'selected':''}>AK — таблица REITZ AA/AK</option><option value="AC" ${c.zlgVariant==='AC'?'selected':''}>AC — NJ + шариковый</option></select></label><div class="calc-result-box"><small>OEM корпуса NTN-SNR</small><strong>${zlgProfile?`${zlgProfile.relubeVolumeCm3} см³ / позицию`:'Размер не распознан'}</strong><span>Общий reference, используется только если выбран явно.</span></div><div class="calc-inline-note span-4"><b>REITZ KXE Table 11 встроена полностью</b><span>AA/AK: ZLG306–324; AC: ZLG315–324. Доза — на одну OEM-позицию смазывания; связь позиции с конкретной маслёнкой берётся из подтверждённой конструкции блока. Интервал зависит от оборотов; при температуре корпуса выше 75 °C применяется таблица коэффициентов REITZ. Пример ZLG316AA при 2980 об/мин и ≤75 °C: 96 г / 2760 ч на каждую из двух маслёнок.</span></div></div>${reitzTableHtml}</section>`:''}
      ${isSNL?`<section class="bearing-calc-modal-section calculation-step" data-ui-context="SNL"><div class="bearing-calc-modal-title"><span>01</span><div><h3>Конструкция и идентификация опоры</h3><p>Оборудование, фактическая схема опор, корпус, внутренний подшипник и способ подачи рассматриваются как разные данные.</p></div></div><div class="calc-context-strip"><div><small>${isFanContext?'Вентилятор':'Оборудование / вал'}</small><strong>${esc(equipmentDisplay)}</strong></div><div><small>Конструкция опоры</small><strong>${esc(isFanContext?arrangementLabel:supportConstructionLabel)}</strong></div><div><small>Корпус</small><strong>${esc(snlProfile?.designation||snlRawMarking||'SNL')}</strong><span>SKF</span></div><div><small>Подшипник</small><strong>${esc(designation)}</strong></div></div>${supportScopeLabel?`<div class="calc-inline-note calc-info-note"><b>Область расчёта</b><span>${esc(supportScopeLabel)}</span></div>`:''}<div class="bearing-calc-modal-grid cols-4"><label class="span-2">Способ подачи смазки<select name="snlFeedMethod"><option value="side" ${c.snlFeedMethod!=='groove'?'selected':''}>Сбоку подшипника</option><option value="groove" ${c.snlFeedMethod==='groove'?'selected':''}>Через канавку / отверстия наружного кольца</option></select><small>Выбор сохраняется. Если REITZ не применяется, SKF использует 0,005×D×B или 0,002×D×B соответственно.</small></label><div class="calc-result-box span-2"><small>Корпус SKF</small><strong>${esc(snlProfile?.designation||snlRawMarking||'SNL')}</strong><span>${snlProfile?`SKF reference заполнения: ${snlProfile.fill20G} г (20%) / ${snlProfile.fill40G} г (40%).`:'Точный типоразмер корпуса пока не сопоставлен с локальной таблицей.'}</span></div>${isFanContext?`<label class="span-2">Производитель вентилятора<select name="fanManufacturer"><option value="" ${!fanManufacturer?'selected':''}>Не указан</option><option value="REITZ" ${reitzFan?'selected':''}>REITZ</option><option value="FERRARI" ${/ferrari/i.test(fanManufacturer)?'selected':''}>Ferrari</option><option value="VENTAPP" ${/ventapp/i.test(fanManufacturer)?'selected':''}>Ventapp</option><option value="OTHER" ${fanManufacturer&&!/reitz|ferrari|ventapp/i.test(fanManufacturer)?'selected':''}>Другой / неизвестный</option></select><small>Производитель вентилятора не подменяет производителя корпуса или внутреннего подшипника.</small></label>${/ferrari/i.test(fanManufacturer)?`<div class="calc-inline-note span-2"><b>Ferrari + SKF SNL</b><span>CART01 Ferrari имеет приоритет только для явно заданных application-specific значений. Если поле Ferrari пустое, расчёт корпуса остаётся в подтверждённой SKF SNL-методике — без подмены производителя корпуса.</span></div><label>Доза Ferrari CART01, г<input name="ferrariCart01DoseG" type="number" min="0" step="0.1" value="${esc(c.ferrariCart01DoseG??'')}"><small>Необязательно. Заполняйте только по документу конкретного вентилятора.</small></label><label>Интервал Ferrari CART01, ч<input name="ferrariCart01IntervalHours" type="number" min="1" step="1" value="${esc(c.ferrariCart01IntervalHours??'')}"><small>Если не задан — применяется компонентная логика SKF SNL с собственным provenance.</small></label>`:''}`:`<input type="hidden" name="fanManufacturer" value=""><div class="calc-inline-note span-2 calc-info-note"><b>Вал / конвейер — SKF SNL</b><span>Это обычная подшипниковая опора вала, не вентилятор. Расчёт ведётся по фактическому корпусу SNL, внутреннему подшипнику и способу подачи смазки.</span></div>`}<input type="hidden" name="fullRenewalFallbackMode" value="${esc(c.fullRenewalFallbackMode||'review')}"><div class="calc-inline-note span-2 simple-only" data-snl-simple-note><b>${isFanContext&&(reitzFan||savedSnlMode==='reitz_kxe_single')?'REITZ KXE — application-specific OEM':'SKF SNL — OEM корпуса'}</b><span>${isFanContext&&(reitzFan||savedSnlMode==='reitz_kxe_single')?'Доза и период будут взяты из таблицы REITZ по фактическому внутреннему подшипнику, оборотам и температуре.':'Для SNL доза определяется по SKF из геометрии внутреннего подшипника; полный запас корпуса и сценарий обновления зависят от способа подачи смазки.'}</span></div><label class="span-2 expert-only">Основная методика досмазывания<select name="snlServiceMode"><option value="auto" ${savedSnlMode==='auto'?'selected':''}>Авто — REITZ по производителю, иначе SKF SNL</option><option value="reitz_kxe_single" ${savedSnlMode==='reitz_kxe_single'?'selected':''}>REITZ KXE — одиночная опора</option><option value="skf_snl" ${savedSnlMode==='skf_snl'?'selected':''}>SKF SNL — корпусная методика</option></select><small>REITZ используется только если внутренний подшипник точно найден в таблице KXE. Если не найден — результат блокируется, а не подменяется молча.</small></label></div>${snlTableHtml}${reitzSingleTableHtml}</section>`:''}
      ${isSNL?`<section class="bearing-calc-modal-section calculation-step expert-only" data-ui-context="SNL"><div class="bearing-calc-modal-title"><span>02</span><div><h3>Применённые методики</h3><p>Источник выбирается отдельно для каждой операции и, при необходимости, для отдельных параметров.</p></div></div><div class="calc-method-matrix" data-method-matrix><div><small>Доза досмазывания</small><strong data-method-relube-dose>—</strong></div><div><small>Период досмазывания</small><strong data-method-relube-interval>—</strong></div><div><small>Новое заполнение</small><strong data-method-renewal-dose>—</strong></div><div><small>Период полного обновления</small><strong data-method-renewal-interval>—</strong></div></div><div class="calc-inline-note" data-oem-fallback-note hidden></div></section>`:''}
      ${!isSNL?`<section class="bearing-calc-modal-section calculation-step expert-only" data-ui-context="CALCULATION_PACKAGE"><div class="bearing-calc-modal-title"><span>02</span><div><h3>Применённые методики</h3><p>Матрица формируется UI Presenter непосредственно из CalculationPackage и не зависит от конкретного OEM в task-editor.</p></div></div><div class="calc-method-matrix" data-method-matrix><div><small>Доза досмазывания</small><strong data-method-relube-dose>—</strong></div><div><small>Период досмазывания</small><strong data-method-relube-interval>—</strong></div><div><small>Новое заполнение</small><strong data-method-renewal-dose>—</strong></div><div><small>Период полного обновления</small><strong data-method-renewal-interval>—</strong></div></div></section>`:''}
      ${lp.fanLubrication&&!isZLG&&!isSNL?`<section class="bearing-calc-modal-section simple-fan-context calculation-step" data-ui-context="GENERIC_FAN"><div class="bearing-calc-modal-title"><span>01</span><div><h3>Конструкция и идентификация узла</h3><p>Производитель вентилятора и производитель подшипникового узла — разные данные. Выберите только то, что фактически известно.</p></div></div><div class="bearing-calc-modal-grid cols-4"><label class="span-2">Производитель вентилятора<select name="fanManufacturer"><option value="" ${!fanManufacturer?'selected':''}>Не указан</option><option value="REITZ" ${/reitz/i.test(fanManufacturer)?'selected':''}>REITZ</option><option value="FERRARI" ${/ferrari/i.test(fanManufacturer)?'selected':''}>Ferrari</option><option value="VENTAPP" ${/ventapp/i.test(fanManufacturer)?'selected':''}>Ventapp</option><option value="OTHER" ${fanManufacturer&&!/reitz|ferrari|ventapp/i.test(fanManufacturer)?'selected':''}>Другой / неизвестный</option></select></label><div class="calc-result-box span-2"><small>Подшипниковый узел</small><strong>${esc(housingDisplay)}</strong><span>Производитель узла: ${esc(housingManufacturer)}${housingFamilyCode==='TROESTER'?' · в проекте используется на вентиляторах Ventapp':''}. Конструкция и OEM-расчёт не считаются одной и той же сущностью.</span></div>${housingFamilyCode==='TROESTER'?`<div class="calc-inline-note span-4"><b>Приоритет Ventapp → Tröster</b><span>Если есть табличка смазки или Lubrication Instructions именно этого вентилятора Ventapp, её значения имеют приоритет. Пустые параметры не придумываются: для них применяется Tröster OEM по фактическому подшипнику текущей точки.</span></div><label>Ventapp: доза на эту точку, г<input name="ventappMachineDoseG" type="number" min="0" step="0.1" value="${esc(c.ventappMachineDoseG??'')}"><small>Только с таблички/инструкции этого вентилятора.</small></label><label>Ventapp: интервал, ч<input name="ventappMachineIntervalHours" type="number" min="1" step="1" value="${esc(c.ventappMachineIntervalHours??'')}"><small>Только фактическое OEM-значение конкретной машины.</small></label><label class="span-2">Ventapp: смазочный материал<input name="ventappGrease" value="${esc(c.ventappGrease||'')}" placeholder="например обозначение с таблички"><small>Информационный OEM-параметр; не подменяется материалом другой машины.</small></label><label class="span-4" data-ventapp-source-label>Источник Ventapp<input name="ventappLubricationSource" value="${esc(c.ventappLubricationSource||'')}" placeholder="№ вентилятора / Lubrication Instructions / фото таблички / документ"><small>Обязателен, если используются данные с таблички/инструкции Ventapp. Без источника такие данные не применяются.</small></label><div class="calc-inline-note span-4" data-ventapp-machine-status hidden><b>Данные Ventapp</b><span></span></div><div class="calc-inline-note span-2"><b>Fallback Tröster OEM</b><span>Если Ventapp не задаёт дозу, используется 0,005×D×B по подшипнику точки. Интервал tf берётся только из подтверждённого чтения OEM-диаграммы Tröster; n·d-аппроксимация удалена.</span></div><div class="calc-result-box span-2" data-troester-auto-tf><small>Tröster · tf по локальной OEM-диаграмме</small><strong>Рассчитывается автоматически</strong><span>Используются тип подшипника, d и рабочие обороты. Это оцифрованное чтение графика, а не придуманная формула.</span><button type="button" class="btn ghost" data-open-troester-chart>Открыть диаграмму Tröster</button></div><label class="expert-only">Tröster: подтверждённый tf вручную, ч<input name="troesterBaseIntervalHours" type="number" min="1" step="1" value="${esc(c.troesterBaseIntervalHours??'')}"><small>Экспертный резерв: значение, вручную прочитанное по OEM-диаграмме.</small></label><label class="span-3 expert-only">Источник ручного подтверждения tf<input name="troesterBaseIntervalSource" value="${esc(c.troesterBaseIntervalSource||'')}" placeholder="Tröster diagram p.7 / фото / проверка инженером"><small>Нужен только для ручного экспертного переопределения.</small></label>`:''}${housingFamilyCode==='FERRARI'?`<div class="calc-inline-note span-2"><b>Ferrari application OEM</b><span>Метод выбирается по фактической комплектации: CART01/Transmission specifications для комплектного вентилятора с трансмиссией либо точная Chart 8-2 для исполнения 1/6 без трансмиссии. Интерполяция таблицы запрещена.</span></div><label class="span-2">Источник Ferrari<select name="ferrariMethodMode"><option value="cart01" ${(c.ferrariMethodMode||'cart01')==='cart01'?'selected':''}>CART01 / Transmission specifications</option><option value="chart8_2" ${c.ferrariMethodMode==='chart8_2'?'selected':''}>Chart 8-2 — исполнение 1/6 без трансмиссии</option></select><small>Если точной строки Chart 8-2 нет, LUBRICA не интерполирует и запросит CART01/точные данные.</small></label><label>Доза CART01, г<input name="ferrariCart01DoseG" type="number" min="0" step="0.1" value="${esc(c.ferrariCart01DoseG??'')}"></label><label>Интервал CART01, ч<input name="ferrariCart01IntervalHours" type="number" min="1" step="1" value="${esc(c.ferrariCart01IntervalHours??'')}"></label><label class="span-2">Опора Ferrari по Chart 8-2<input name="ferrariSupportType" value="${esc(c.ferrariSupportType??'')}" placeholder="например SN 522 B-BL-C"><small>Введите точную маркировку из документации/шильдика.</small></label><label class="span-2">Сторона подшипника<select name="ferrariBearingSide"><option value="pulley" ${(c.ferrariBearingSide||'pulley')==='pulley'?'selected':''}>Сторона шкива</option><option value="opposite" ${c.ferrariBearingSide==='opposite'?'selected':''}>Противоположная сторона</option></select><small>Подбор выполняется по точной опоре, фактическому подшипнику и точным оборотам из Chart 8-2.</small></label>`:''}</div></section>`:''}
      <section class="bearing-calc-modal-section bearing-operating-inputs calculation-step" data-step="3">
        <div class="bearing-calc-modal-title"><span>03</span><div><h3>Исходные данные расчёта</h3><p>${isSlewingRing?'Для опорно-поворотного подшипника периодичность выбирается по OEM-условиям Schaeffler/INA. Обороты нужны для проверки области применимости (< 0,5 м/с), но не для базового guide-интервала.':'Для автоматического расчёта периодичности обязательно укажите рабочие обороты. Остальные условия уточняют оба цикла обслуживания.'}</p></div></div>
        <div class="bearing-calc-modal-grid cols-4">
          <label class="${isSlewingRing?'':'required-field'}">Обороты, об/мин ${isSlewingRing?'<small>необязательно</small>':'<b>*</b>'}<input name="rpm" inputmode="decimal" value="${fmt(c.rpm)}" placeholder="например 300"></label>
          ${isSlewingRing?`<label class="required-field">Условия загрязнения <b>*</b><select name="vluContamination"><option value="normal" ${c.contamination==='normal'||!c.contamination?'selected':''}>Чистая / сухая зона — ориентир 500 ч</option><option value="moderate" ${c.contamination==='moderate'?'selected':''}>Повышенное загрязнение / улица — 100–200 ч</option><option value="heavy" ${c.contamination==='heavy'?'selected':''}>Сильное загрязнение / улица — 100–200 ч</option><option value="severe" ${c.contamination==='severe'?'selected':''}>Экстремальное — непрерывная смазка</option></select></label><label>Температура, °C<input class="required-field" name="vluTemperatureC" inputmode="decimal" value="${fmt(c.temperatureC)}" placeholder="например 25"><small>OEM guide применяется ниже 70 °C.</small></label>`:`<label class="${isZLG||isSNL?'':'expert-only'}">${isZLG||isSNL?'Температура корпуса подшипника, °C':'Температура, °C'}<input name="temperatureC" inputmode="decimal" value="${fmt(c.temperatureC??70)}"></label>
          <label class="expert-only">Положение вала<select name="shaftOrientation"><option value="horizontal" ${c.shaftOrientation!=='vertical'?'selected':''}>Горизонтальный</option><option value="vertical" ${c.shaftOrientation==='vertical'?'selected':''}>Вертикальный</option></select></label>
          <label class="expert-only">Нагрузка<select name="loadClass"><option value="light" ${c.loadClass==='light'?'selected':''}>Лёгкая</option><option value="medium" ${c.loadClass==='medium'||!c.loadClass?'selected':''}>Средняя</option><option value="heavy" ${c.loadClass==='heavy'?'selected':''}>Тяжёлая</option></select></label>
          <label class="expert-only">Загрязнение<select name="contamination"><option value="normal" ${c.contamination==='normal'||!c.contamination?'selected':''}>Нормальное</option><option value="moderate" ${c.contamination==='moderate'?'selected':''}>Умеренное</option><option value="heavy" ${c.contamination==='heavy'?'selected':''}>Сильное</option><option value="severe" ${c.contamination==='severe'?'selected':''}>Очень сильное / жидкости</option></select></label>
          <label class="expert-only">Вибрация<select name="vibration"><option value="normal" ${c.vibration==='normal'||!c.vibration?'selected':''}>Нормальная</option><option value="high" ${c.vibration==='high'?'selected':''}>Высокая / ударная</option></select></label>`}
          <div class="calc-inline-note ${isSlewingRing?'span-4':'span-2'}" data-rpm-hint><b>${isSlewingRing?'INA / Schaeffler VLU: выберите условия для интервала.':'Обороты обязательны для периодичности.'}</b><span>${isSlewingRing?'Количество в граммах не требуется: операция выполняется через 4 точки до появления свежей смазки у уплотнений. Обороты используются только для проверки окружной скорости < 0,5 м/с.':'Введите рабочие обороты узла. Доза может быть рассчитана и без них, периодичность — нет.'}</span></div>
          ${!isSlewingRing?`<div class="calc-inline-note span-4 expert-only calc-info-note" data-operating-context-note><b>Условия эксплуатации сохранены</b><span>Нагрузка, загрязнение, вибрация и положение вала показываются для инженерной оценки. LUBRICA отдельно укажет, какие из них реально участвуют в активной методике.</span></div>`:''}
        </div>
      </section>
      <div class="bearing-calc-readiness" data-readiness-summary></div><div class="calc-inline-note" data-maintenance-policy hidden></div>
      <div class="calc-inline-note simple-only" data-stale-calc-banner hidden><b>Ранее утверждённые значения требуют проверки.</b><span data-stale-calc-text></span><button type="button" class="mini-btn" data-replace-stale>Пересчитать и заменить старые значения</button></div>
      <section class="bearing-simple-approval calculation-step" data-simple-approval data-step="4">
        <div class="bearing-calc-modal-title result-step-title"><span>04</span><div><h3>Результат обслуживания</h3><p>Главные рабочие значения и происхождение каждого параметра.</p></div></div><div class="simple-approval-head"><div><b>Результат расчёта</b><span>Главные рабочие значения. При применении источник и выбранная методика сохранятся автоматически.</span></div><button type="button" class="btn secondary" data-show-calc-details>Почему такой результат?</button><button type="button" class="btn secondary simple-legacy-approve" data-approve-all>Принять все доступные</button></div>
        <div class="simple-approval-grid">
          <article class="simple-approval-card" data-approval-card="relube"><small>Досмазывание</small><strong data-quick-relube>—</strong><span data-quick-relube-meta>Нет расчёта</span><button type="button" class="mini-btn" data-approve-relube>Принять цикл</button></article>
          <article class="simple-approval-card" data-approval-card="renewal" data-renewal-ui><small>Полное новое заполнение / замена</small><strong data-quick-renewal>—</strong><span data-quick-renewal-meta>Нет расчёта</span><div class="renewal-fallback-actions" data-renewal-fallback-actions hidden><button type="button" class="mini-btn" data-accept-skf-fallback>Применить SKF для периодичности</button><button type="button" class="mini-btn ghost" data-review-renewal>Оставить на уточнение</button></div><button type="button" class="mini-btn" data-approve-renewal>Принять цикл</button></article>
        </div>
        <div class="calc-inline-note simple-only" data-full-renewal-reminder hidden></div><div class="simple-approval-foot"><span>Для обычной работы достаточно проверить исходные данные и нажать «Применить расчёт». Экспертный режим нужен только для аудита или ручного переопределения.</span></div>
      </section>

      <section class="bearing-calc-modal-section expert-only expert-advanced-section compact-advanced-shell">
        <details class="bearing-calc-tech manual-result-override-details" data-manual-result-override>
          <summary><span><b>Изменить результат вручную</b><small>Только если нужно сознательно заменить рассчитанный OEM-результат.</small></span></summary>
        <div class="bearing-calc-modal-grid cols-4">
          <div class="simple-method-card span-2" data-simple-method><small>Выбранная методика</small><strong data-auto-method-label>LUBRICA Universal 3.2</strong><span data-auto-method-note>Метод по умолчанию: сначала точные OEM-данные, затем OEM-метод, затем универсальный расчёт LUBRICA. Пользователю не нужно выбирать формулу вручную.</span></div><label class="span-2 expert-only">Ручное переопределение метода дозы<select name="relubeMethod"><option value="lubrica_unified" data-owner="ANY" ${!c.relubeMethod||c.relubeMethod==='lubrica_unified'||c.relubeMethod==='auto_oem'?'selected':''}>Авто — лучший доступный OEM → LUBRICA</option><option value="oem_exact" data-owner="OEM" ${c.relubeMethod==='oem_exact'?'selected':''}>Точное OEM-значение — локальная таблица</option><option value="skf_side" data-owner="SKF" ${c.relubeMethod==='skf_side'?'selected':''}>SKF — подача сбоку (0,005 × D × B)</option><option value="skf_groove" data-owner="SKF" ${c.relubeMethod==='skf_groove'?'selected':''}>SKF — через канавку/отверстия (0,002 × D × B)</option><option value="nsk_unit_guidance" data-owner="NSK" ${c.relubeMethod==='nsk_unit_guidance'?'selected':''}>NSK — корпусной узел: OEM-процедура</option><option value="ntn_unit_exact" data-owner="NTN-SNR">NTN — корпусной узел: точная OEM-таблица</option><option value="ntn_zlg_housing_2024" data-owner="NTN-SNR">NTN-SNR ZLG — корпусная инструкция 2024</option><option value="ntn_snr_standard" data-owner="NTN-SNR" ${c.relubeMethod==='ntn_snr_standard'?'selected':''}>NTN-SNR — 0,005 × D × B</option><option value="schaeffler_weekly" data-owner="FAG" ${c.relubeMethod==='schaeffler_weekly'?'selected':''}>FAG/Schaeffler — еженедельно</option><option value="schaeffler_monthly" data-owner="FAG" ${c.relubeMethod==='schaeffler_monthly'?'selected':''}>FAG/Schaeffler — ежемесячно</option><option value="schaeffler_yearly" data-owner="FAG" ${c.relubeMethod==='schaeffler_yearly'?'selected':''}>FAG/Schaeffler — ежегодно</option><option value="schaeffler_multiyear" data-owner="FAG" ${c.relubeMethod==='schaeffler_multiyear'?'selected':''}>FAG/Schaeffler — многолетний период</option><option value="engineering_db005" data-owner="ENGINEERING" ${c.relubeMethod==='engineering_db005'?'selected':''}>Инженерная оценка — 0,005 × D × B (не OEM)</option><option value="oem" data-owner="OEM" ${c.relubeMethod==='oem'?'selected':''}>OEM / паспорт вручную</option><option value="manual" data-owner="MANUAL" ${c.relubeMethod==='manual'?'selected':''}>Ручное значение</option></select><small class="cross-brand-control"><input type="checkbox" name="allowCrossBrand"> Показать методики других производителей</small></label>
          <div class="calc-result-box calc-dom-only" aria-hidden="true"><small>Расчётная доза</small><strong data-result-dose>—</strong><span data-dose-formula></span><small data-dose-confidence></small><small data-dose-source></small></div>
          <label class="expert-only">Утверждённая доза, г<input name="approvedDoseG" inputmode="decimal" value="${fmt(c.approvedDoseG)}"></label>
          <label class="span-4 expert-only">Источник утверждённой дозы <b>*</b><input name="doseSource" value="${esc(c.doseSource||'')}" placeholder="Документ OEM / паспорт / номер инструкции / утверждённый инженерный расчёт…"></label>
        </div>
        </details>
      </section>

      <section class="bearing-calc-modal-section renewal-status-section" data-renewal-status-panel hidden>
        <div class="bearing-calc-modal-title"><span>•</span><div><h3>Полное обновление смазки</h3><p data-renewal-status-title>Статус операции определяется активной методикой и фактической конструкцией узла.</p></div></div>
        <div class="calc-inline-note" data-renewal-status-body></div>
      </section>

      <section class="bearing-calc-modal-section expert-only expert-advanced-section compact-advanced-shell" data-renewal-technical>
        <details class="bearing-calc-tech renewal-source-details" data-renewal-source-details>
          <summary><span><b>Источники и технические данные полного обновления</b><small>Основной результат уже показан выше. Здесь — только происхождение значений и ручное отклонение.</small></span></summary>
        ${record.manufacturer?`<div class="calc-catalog-strip" data-catalog-strip><b>Справочные данные каталога ${esc(record.manufacturer)}</b><span>${esc(record.designation||designation)}</span><span>${record.insertDesignation?`Вставка ${esc(record.insertDesignation)}: ${record.insertMassKg??'—'} кг`:`Масса подшипника: ${record.massKg??'—'} кг`}</span>${record.unitMassKg!=null?`<span>Узел целиком: ${record.unitMassKg} кг</span>`:''}<small>${esc(record.sourceReference||record.massSource||record.sourceNote||'Источник каталога')}</small><small data-catalog-oem-note></small></div>`:''}<div class="calc-catalog-strip" data-nsk-unit-strip hidden></div>
        <input type="hidden" name="fillRatio" value="1">
        <div class="bearing-calc-volume-row expert-only" ${isSNL?'style="display:none"':''}>
          <div class="calc-result-box"><small>Габаритный объём, не доза</small><strong data-result-envelope>—</strong><span>π/4 × (D² − d²) × B</span></div>
          <label>Масса подшипника, кг<input name="bearingMassKg" inputmode="decimal" value="${fmt(defaultBearingMass)}" placeholder="из каталога OEM"><small>Для корпусного узла используется масса вставки, не корпуса.</small><span class="cross-brand-control"><input type="checkbox" name="allowCrossBrandMass"> Разрешить справочную массу другого бренда</span></label>
          <label>Плотность смазки, г/см³<input name="greaseDensity" inputmode="decimal" value="${fmt(defaultDensity)}"><small>${defaultDensity!=null?'Подставлено из выбранного материала/расчёта.':'Укажите из TDS/SDS материала.'}</small></label>
        </div>
        <div class="bearing-calc-modal-grid cols-4">
          <div class="calc-result-box span-2"><small>Количество при полной замене</small><strong data-result-full>—</strong><span data-full-formula></span><small data-fill-confidence></small><small data-fill-source></small></div>
          <div class="calc-result-box span-2"><small>Периодичность полной замены</small><strong data-result-renewal-interval>—</strong><span data-renewal-interval-detail></span><small data-renewal-interval-confidence></small><small data-renewal-interval-source></small></div>
        </div>
        <div class="calc-inline-note"><b>Рабочий узел.</b><span>Полное обновление относится к уже эксплуатируемому подшипнику или подтверждённой полости корпуса/узла. Дополнительный объём корпуса учитывается только при подтверждённой OEM-методике.</span></div>
        <div class="calc-inline-note calc-warning-note" data-renewal-approval-status hidden></div>
        <details class="bearing-calc-tech manual-approval-details" data-renewal-manual-approval>
          <summary>Ручное утверждение / отклонение от расчёта</summary>
          <div class="bearing-calc-modal-grid cols-4 manual-approval-grid">
            <label>Утверждённое количество, г<input name="approvedFullRenewalG" inputmode="decimal" value="${fmt(c.approvedFullRenewalG)}"></label>
            <label>Источник количества <b>*</b><input name="fullRenewalSource" value="${esc(c.fullRenewalSource||'')}" placeholder="OEM / инструкция / расчёт"></label>
            <label>Утверждённый интервал, ч<input name="approvedFullRenewalIntervalHours" inputmode="decimal" value="${fmt(c.approvedFullRenewalIntervalHours)}"></label>
            <label>Источник интервала <b>*</b><input name="fullRenewalIntervalSource" value="${esc(c.fullRenewalIntervalSource||'')}" placeholder="OEM / инструкция / расчёт"></label>
          </div>
          <small>Заполняйте только если нужно вручную подтвердить или изменить рассчитанное значение. Сохранённое значение, отличающееся от текущего расчёта, помечается как устаревшее и не считается текущим результатом.</small>
        </details>
        </details>
      </section>

      <section class="bearing-calc-modal-section expert-only expert-advanced-section engineering-fallback-shell">
        <details class="bearing-calc-tech engineering-fallback-details" data-engineering-fallback>
          <summary data-legacy-label="Инженерный fallback и ручное переопределение периода"><span><b>Инженерный fallback LUBRICA</b><small data-engineering-fallback-status>Не используется текущей OEM-методикой без явного выбора.</small></span></summary>
          <div class="calc-inline-note calc-info-note"><b>Отдельный инженерный контур</b><span>P/C, предельные обороты, вращение наружного кольца, ручная база, коэффициент условий и скоростные показатели не считаются входами REITZ KXE сами по себе. Они применяются только специализированной методикой, которая прямо их требует, либо при явном выборе инженерного fallback/ручного переопределения.</span></div>
        <div class="bearing-calc-modal-grid cols-4">
          <label class="expert-only">Предельные обороты OEM<input name="limitingRpm" inputmode="decimal" value="${fmt(c.limitingRpm??record.greaseLimitingRpm??record.limitingRpm)}" placeholder="из каталога"></label>
          <label class="expert-only">P/C<input name="loadRatioPC" inputmode="decimal" value="${fmt(c.loadRatioPC)}" placeholder="например 0,10"><small>NSK: используется для OEM-коррекции интервала.</small></label>
          <label class="checkline span-2 expert-only"><input type="checkbox" name="outerRingRotation" ${c.outerRingRotation?'checked':''}> Вращается наружное кольцо</label>
          <label class="expert-only">Базовый интервал, ч<input name="baseIntervalHours" inputmode="decimal" value="${fmt(c.baseIntervalHours)}"></label>
          <label class="expert-only">Источник базы<select name="intervalSource"><option value="unified_auto" ${!c.intervalSource||c.intervalSource==='unified_auto'||c.intervalSource==='auto_oem'?'selected':''}>LUBRICA Universal — авто</option><option value="skf" ${c.intervalSource==='skf'?'selected':''}>SKF</option><option value="nsk" ${c.intervalSource==='nsk'?'selected':''}>NSK</option><option value="fag" ${c.intervalSource==='fag'?'selected':''}>FAG/Schaeffler</option><option value="ntn" ${c.intervalSource==='ntn'?'selected':''}>NTN-SNR</option><option value="timken" ${c.intervalSource==='timken'?'selected':''}>Timken</option><option value="oem" ${c.intervalSource==='oem'?'selected':''}>Другой OEM</option><option value="manual" ${c.intervalSource==='manual'?'selected':''}>Инженерный</option></select></label>
          <label class="expert-only">Коэффициент условий<input name="conditionFactor" inputmode="decimal" value="${fmt(c.conditionFactor??1)}"></label>
          <div class="calc-result-box expert-only"><small>Расчётный интервал</small><strong data-result-interval>—</strong><span data-interval-detail>после корректировок</span><small data-interval-confidence></small><small data-interval-source></small></div>
          <label class="expert-only">Утверждённый интервал, ч<input name="approvedRelubeIntervalHours" inputmode="decimal" value="${fmt(c.approvedRelubeIntervalHours??c.approvedIntervalHours)}"></label>
          <label class="span-3 expert-only">Источник утверждённого интервала <b>*</b><input name="approvedRelubeIntervalSource" value="${esc(c.approvedRelubeIntervalSource||c.approvedIntervalSource||'')}" placeholder="OEM / расчёт / опыт эксплуатации…"></label>
        </div>
        <div class="bearing-speed-summary modal-speed expert-only" data-speed-summary></div>
        </details>
      </section>

      <section class="bearing-calc-modal-section calculation-step expert-only" data-step="5"><div class="bearing-calc-modal-title"><span>05</span><div><h3>Проверка и применение</h3><p>Перед сохранением проверьте происхождение рабочих параметров и незакрытые решения.</p></div></div><div class="calc-check-list" data-expert-check></div><div class="calc-advanced-toggle"><button type="button" class="btn secondary" data-toggle-advanced>Дополнительные настройки</button></div></section>
      <div class="bearing-calc-warnings modal-warnings" data-calc-warnings></div>
      <div class="calc-inline-note expert-only"><b>Правило утверждения.</b><span>Расчётное значение — это предложение системы. Любое заполненное поле «Утверждённое…» требует собственного источника. Уровень X запрещает автоматическое принятие расчёта, но не мешает сохранить вручную подтверждённое значение с источником.</span></div>
      <menu><button type="button" class="btn ghost" data-close>Отмена</button><button type="button" class="btn secondary expert-only" data-recalc>Пересчитать</button><button type="button" class="btn primary" data-save-calc>Применить расчёт</button></menu>
    </form>`;
    const form=dialog.querySelector('#bearingCalcForm');
    const CURRENT_CALC_VERSION='multi-oem-1.0.33.44-shaft-support-context';
    const priorVersion=String(c.calculationVersion||'');
    const hasPriorApprovals=['approvedRelubeDoseG','approvedDoseG','approvedRelubeIntervalHours','approvedIntervalHours','approvedFullRenewalG','approvedFullRenewalIntervalHours'].some(k=>Number(c[k])>0);
    let staleCalculation=hasPriorApprovals&&priorVersion!==CURRENT_CALC_VERSION;
    let calcMode='simple';
    const methodSelect=form.elements.relubeMethod;
    const manufacturerSelect=form.elements.manufacturer;
    const normalizeUiManufacturer=v=>window.LubricaBearingOEM?.normManufacturer?.(v)||String(v||'auto');
    const exactAvailable=()=>!!window.LubricaBearingOEM?.exactProfile?.(normalizeUiManufacturer(manufacturerSelect?.value),designation);
    const recommendedMethod=()=>window.LubricaBearingOEM?.methodRecommendation?.({manufacturer:manufacturerSelect?.value,designation,bearingType:record.bearingType||b.bearingType||'unknown'})?.relubeMethod||'lubrica_unified';
    const setMode=mode=>{
      calcMode=mode==='expert'?'expert':'simple';
      form.classList.toggle('expert-mode',calcMode==='expert');
      form.classList.toggle('simple-mode',calcMode==='simple');
      dialog.querySelectorAll('[data-calc-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.calcMode===calcMode));
      if(calcMode==='simple'&&methodSelect)methodSelect.value='lubrica_unified';
      if(calcMode==='expert'&&methodSelect&&methodSelect.value==='oem_exact'&&!exactAvailable())methodSelect.value=recommendedMethod();
      const saveBtn=form.querySelector('[data-save-calc]');if(saveBtn)saveBtn.textContent='Применить расчёт';
      const visibleSteps=[...form.querySelectorAll('.calculation-step')].filter(el=>calcMode==='expert'?!el.classList.contains('simple-only'):!el.classList.contains('expert-only'));visibleSteps.forEach((el,i)=>{const badge=el.querySelector('.bearing-calc-modal-title>span');if(badge)badge.textContent=String(i+1).padStart(2,'0');});
      filterMethodOptions();
    };
    const filterMethodOptions=()=>{
      if(!methodSelect)return;
      const selected=normalizeUiManufacturer(manufacturerSelect?.value),cross=!!form.elements.allowCrossBrand?.checked,hasExact=exactAvailable();
      [...methodSelect.options].forEach(opt=>{
        const owner=opt.dataset.owner||'ANY';
        const own=owner==='ANY'||owner==='OEM'||owner==='ENGINEERING'||owner==='MANUAL'||owner===selected;
        opt.hidden=!cross&&!own;
        opt.disabled=!cross&&!own;
      });
      const exact=methodSelect.querySelector('option[value="oem_exact"]');
      if(exact){exact.disabled=!hasExact;exact.hidden=false;exact.textContent=hasExact?`${selected} — точное OEM-значение из локальной таблицы`:`${selected==='auto'?'OEM':selected} — точного локального значения нет`;}
      if(methodSelect.selectedOptions[0]?.disabled)methodSelect.value=recommendedMethod();
      if(!methodSelect.value||methodSelect.selectedOptions[0]?.disabled)methodSelect.value='lubrica_unified';
    };
    const updateSimpleMethodSummary=result=>{
      const label=dialog.querySelector('[data-auto-method-label]'),note=dialog.querySelector('[data-auto-method-note]');
      const topLabel=dialog.querySelector('[data-simple-method-title]'),topNote=dialog.querySelector('[data-simple-method-status]');
      const r=result?.relube||{},m=r.sourceManufacturer||result?.manufacturer?.id||'auto';
      let title='Инженерный расчёт LUBRICA',text='OEM-методика не определена; результат явно помечен как инженерный.';
      if(r.confidenceCode==='A'){title=`${m} · OEM`;text='Использованы точные данные производителя для этого обозначения.';}
      else if(r.confidenceCode==='B'){title=r.numericUnavailable?`${m} · OEM-процедура`:`${m} · OEM-методика`;text=r.numericUnavailable?(r.error||'Производитель задаёт процедуру обслуживания без универсальной фиксированной дозы.'):'Расчёт выполнен по встроенной методике производителя.';}
      else if(r.confidenceCode==='X'){title='Недостаточно данных';text=r.error||result?.manufacturer?.profile?.note||'Нужно уточнить исходные данные или подтверждённый источник.';}
      if(label)label.textContent=title;if(note)note.textContent=text;if(topLabel)topLabel.textContent=title;if(topNote)topNote.textContent=text;
    };
    dialog.querySelectorAll('[data-calc-mode]').forEach(btn=>btn.addEventListener('click',()=>{setMode(btn.dataset.calcMode);recalc();}));
    const openCalculationEvidence=(ev)=>{
      ev?.preventDefault?.();ev?.stopPropagation?.();
      const sourceApi=window.LubricaBearingSources;if(!sourceApi?.openRegistry){toast('Обоснование расчёта не загружено','warn');return}
      const x=recalc();if(!x)return;
      const sourceId=v=>v?.source?.sourceId||v?.source?.id||null;
      const parts=[x.result?.relube,x.result?.relubeInterval];if(x.result?.maintenancePolicy?.fullRenewal!==false)parts.push(x.result?.fullRenewal,x.result?.renewalInterval);
      const sourceIds=[...new Set(parts.map(sourceId).filter(Boolean))];
      const trace=[];
      const equipmentName=fanEquipment?.name||fanEquipment?.designation||lp?.equipmentName||lp?.name||'текущая точка';
      trace.push(`Объект: ${equipmentName}.`);
      if(resolvedHousingFamily)trace.push(`Узел: ${housingDisplay||resolvedHousingFamily}.`);
      trace.push(`Подшипник точки: ${x.input.designation||'не задан'}; d/D/B: ${x.input.d??'—'}/${x.input.D??'—'}/${x.input.B??'—'} мм; геометрия: ${x.input.bearingGeometrySource==='POINT_BEARING'?'из подшипника текущей точки':'из другого подтверждённого источника'}.`);
      if(x.input.rpm!=null)trace.push(`Рабочие обороты: ${x.input.rpm} об/мин.`);
      const dose=x.result?.relube,interval=x.result?.relubeInterval||x.result?.interval;
      if(dose)trace.push(`Досмазывание: ${dose.value!=null?dose.value+' г':'числовое значение не определено'}; методика/источник: ${dose.sourceManufacturer||'LUBRICA'}; уровень: ${dose.confidenceLabel||dose.confidenceCode||'—'}${dose.formula?`; расчёт: ${dose.formula}`:''}.`);
      if(interval)trace.push(`Периодичность: ${interval.value!=null?interval.value+' ч':'не определена'}; методика/источник: ${interval.sourceManufacturer||'LUBRICA'}; уровень: ${interval.confidenceLabel||interval.confidenceCode||'—'}.`);
      if(resolvedHousingFamily==='TROESTER'){const vs=String(x.input.ventappLubricationSource||'').trim();trace.push(vs?`Ventapp для конкретной машины: ${vs}.`:'Ventapp-specific значения для этой точки не заданы; применён следующий подтверждённый уровень методики.');}
      if(x.result?.maintenancePolicy?.fullRenewal===false)trace.push('Полная замена: планово не предусмотрена выбранной моделью обслуживания.');
      sourceApi.openRegistry({host:dialog,sourceIds,title:'Обоснование расчёта',intro:'Показана цепочка происхождения текущего результата: объект → узел → подшипник → входные данные → методика → источники → результат. Ниже перечислены только источники, связанные с этим CalculationPackage.',contextText:trace.join(' '),hideAudit:true});
    };
    dialog.querySelector('[data-show-calc-details]')?.addEventListener('click',openCalculationEvidence);
    dialog.querySelector('[data-open-source-registry]')?.addEventListener('click',openCalculationEvidence);
    form.elements.allowCrossBrand?.addEventListener('change',()=>{filterMethodOptions();recalc();});
    form.elements.allowCrossBrandMass?.addEventListener('change',()=>recalc());
    manufacturerSelect?.addEventListener('change',()=>{
      if(methodSelect)methodSelect.value='lubrica_unified';
      if(form.elements.intervalSource)form.elements.intervalSource.value='unified_auto';
      if(form.elements.baseIntervalHours)form.elements.baseIntervalHours.value='';
      const selectedNow=normalizeUiManufacturer(manufacturerSelect?.value),recordNow=normalizeUiManufacturer(record.manufacturer||'auto');
      if(form.elements.bearingMassKg&&selectedNow!=='auto'&&recordNow!=='auto'&&selectedNow!==recordNow&&!form.elements.allowCrossBrandMass?.checked)form.elements.bearingMassKg.value='';
      ['approvedDoseG','doseSource','approvedFullRenewalG','fullRenewalSource','approvedRelubeIntervalHours','approvedRelubeIntervalSource','approvedFullRenewalIntervalHours','fullRenewalIntervalSource'].forEach(n=>{if(form.elements[n])form.elements[n].value='';});
      filterMethodOptions();recalc();toast('Производитель изменён: старые OEM-методы, интервалы и утверждения сброшены в форме.');
    });
    const autoApprovalSource=(kind,result)=>{
      if(kind==='relubeDose'){const r=result?.relube||{};return r.source?.title||r.source?.name||(r.value!=null?`LUBRICA · ${r.formula||'расчёт дозы'} · ${r.confidenceLabel||'инженерный расчёт'}`:'');}
      if(kind==='relubeInterval'){const r=result?.relubeInterval||result?.interval||{};return r.source?.title||r.source?.name||(r.value!=null?`LUBRICA · период досмазывания ${r.value} ч · ${r.confidenceLabel||''}`:'');}
      if(kind==='renewalDose'){const r=result?.fullRenewal||{};return r.source?.title||r.source?.name||inputMassSource()||(r.value!=null?`LUBRICA · полный рабочий запас смазки · ${r.confidenceLabel||''}`:'');}
      if(kind==='renewalInterval'){const r=result?.renewalInterval||{};return r.source?.title||r.source?.name||(r.value!=null?`LUBRICA · цикл полной замены ${r.value} ч · ${r.confidenceLabel||''}`:'');}
      return '';
    };
    const inputMassSource=()=>String(form.elements.bearingMassKg?.value||'').trim()?String(c.massSource||record.massSource||record.sourceReference||'OEM-каталог подшипника'):'';
    const syncQuickApproval=(result)=>{
      const cycles={
        relube:{dose:result?.relube?.value,interval:result?.relubeInterval?.value??result?.interval?.value,doseApproved:'approvedDoseG',intervalApproved:'approvedRelubeIntervalHours',el:'relube'},
        renewal:{dose:result?.fullRenewal?.value,interval:result?.renewalInterval?.value,doseApproved:'approvedFullRenewalG',intervalApproved:'approvedFullRenewalIntervalHours',el:'renewal'}
      };
      Object.entries(cycles).forEach(([kind,x])=>{const card=dialog.querySelector(`[data-approval-card="${kind}"]`),valueEl=dialog.querySelector(`[data-quick-${x.el}]`),metaEl=dialog.querySelector(`[data-quick-${x.el}-meta]`),btn=dialog.querySelector(`[data-approve-${kind}]`);if(!card||!valueEl||!metaEl||!btn)return;const procedureOnly=x.el==='relube'&&!!result?.relube?.procedureOnly,hasDose=Number(x.dose)>0,hasInterval=Number(x.interval)>0,conditionRenewal=x.el==='renewal'&&hasDose&&!!result?.renewalInterval?.conditionBased,has=(procedureOnly||hasDose)&&hasInterval,partialRenewal=x.el==='renewal'&&hasDose&&!hasInterval&&!conditionRenewal,ad=numberValue(form.elements[x.doseApproved]?.value),ai=numberValue(form.elements[x.intervalApproved]?.value);valueEl.textContent=conditionRenewal?`${x.dose} г / по состоянию`:has?(procedureOnly?`OEM-процедура / ${x.interval} ч`:`${x.dose} г / ${x.interval} ч`):(partialRenewal?`${x.dose} г / период не определён`:'—');const matches=conditionRenewal?(ad>0&&Math.abs(ad-Number(x.dose))<0.001):(has&&ai>0&&Math.abs(ai-Number(x.interval))<0.001&&(procedureOnly||(ad>0&&Math.abs(ad-Number(x.dose))<0.001)));if(conditionRenewal)metaEl.textContent=matches?'✓ Принято: полная замена по состоянию / при ТО':'Количество определено; мероприятие будет создано как «По состоянию / при ТО»';else if(partialRenewal&&result?.renewalInterval?.fallbackAvailable)metaEl.textContent=`✓ Количество: ${result.fullRenewal?.sourceManufacturer||'OEM'} · ⚠ период REITZ не найден, доступен ${result.renewalInterval.fallbackMethod||'SKF SNL'} fallback`;else if(partialRenewal)metaEl.textContent='Количество определено OEM, период полного обновления требует уточнения';else metaEl.textContent=matches?`✓ Утверждено: ${procedureOnly?'OEM-процедура':ad+' г'} / ${ai} ч`:(ad>0||ai>0?`⚠ Сохранённое утверждение устарело: ${ad||'—'} г / ${ai||'—'} ч · примите новый расчёт`:(has?'Количество и период готовы · источники сохранятся автоматически':'Недостаточно данных для полного цикла'));card.classList.toggle('approved',matches);card.classList.toggle('unavailable',!has&&!partialRenewal);card.classList.toggle('partial',partialRenewal||conditionRenewal);btn.disabled=!(has||conditionRenewal);btn.hidden=partialRenewal||matches;if(conditionRenewal)btn.textContent='Принять по состоянию';else btn.textContent=(ad>0||ai>0)?'Применить новый результат':'Принять цикл';});
      const fallback=dialog.querySelector('[data-renewal-fallback-actions]');if(fallback){const show=!!result?.renewalInterval?.fallbackAvailable;fallback.hidden=!show;fallback.style.display=show?'flex':'none';}
      const allBtn=dialog.querySelector('[data-approve-all]');if(allBtn){const available=Object.values(cycles).filter(x=>((Number(x.dose)>0||(x.el==='relube'&&result?.relube?.procedureOnly))&&Number(x.interval)>0)||(x.el==='renewal'&&Number(x.dose)>0&&result?.renewalInterval?.conditionBased));allBtn.disabled=!available.length;allBtn.textContent=available.length>1?'Принять оба готовых цикла':available.length?'Принять готовый цикл':'Нет готовых циклов';}
    };
    const acceptQuick=(kind,result,silent=false)=>{const rel=kind==='relube';if(!rel&&result?.maintenancePolicy&&!result.maintenancePolicy.fullRenewal){if(!silent)toast('Для этого корпусного узла полная замена не является плановой операцией.','info');return false;}const dose=rel?result?.relube?.value:result?.fullRenewal?.value,interval=rel?(result?.relubeInterval?.value??result?.interval?.value):result?.renewalInterval?.value;if(rel&&result?.relube?.autoApprovalBlocked){if(!silent)toast('Автоматическое утверждение заблокировано защитой от передозировки. Выберите LUBRICA Universal 3.2 либо подтвердите иной метод вручную в экспертном режиме.','warn');return false;}const procedureOnly=rel&&!!result?.relube?.procedureOnly,conditionBasedRenewal=!rel&&Number(dose)>0&&!!result?.renewalInterval?.conditionBased;if(!conditionBasedRenewal&&!((procedureOnly||Number(dose)>0)&&Number(interval)>0)){if(!silent)toast('Для этого цикла пока нет полного расчёта периодичности','warn');return false;}const dn=rel?'approvedDoseG':'approvedFullRenewalG',ds=rel?'doseSource':'fullRenewalSource',inm=rel?'approvedRelubeIntervalHours':'approvedFullRenewalIntervalHours',ins=rel?'approvedRelubeIntervalSource':'fullRenewalIntervalSource';if(procedureOnly){form.elements[dn].value='';form.elements[ds].value=result.relube?.source?.title||'Schaeffler/INA OEM procedure';}else{form.elements[dn].value=dose;form.elements[ds].value=autoApprovalSource(rel?'relubeDose':'renewalDose',result)||'LUBRICA · автоматический расчёт';}if(conditionBasedRenewal){form.elements[inm].value='';form.elements[ins].value=result?.renewalInterval?.source?.title||'По состоянию / при ТО';if(!silent)toast(`Полная замена принята как операция по состоянию / при ТО: ${dose} г`);}else{form.elements[inm].value=interval;form.elements[ins].value=autoApprovalSource(rel?'relubeInterval':'renewalInterval',result)||'LUBRICA · автоматический расчёт';if(!silent)toast(procedureOnly?`Досмазывание принято: OEM-процедура / ${interval} ч`:`${rel?'Досмазывание':'Полная замена'} принято: ${dose} г / ${interval} ч`);}return true;
    };
    const recalc=()=>{
      let input=bearingCalcBaseInput(lp,form),result=window.LubricaBearingCalculator?.calculate?.(input);
      if(!result)return null;
      updateSimpleMethodSummary(result);
      syncQuickApproval(result);
      const presentationModel=window.LubricaCalculationUIPresenter?.render?.(dialog,result,input)||null;
      const maker=dialog.querySelector('[data-simple-equipment-maker]');if(maker)maker.textContent=String(input.fanManufacturer||fanManufacturer||'Не указан');const headerMaker=dialog.querySelector('[data-header-fan-maker]');if(headerMaker)headerMaker.textContent=String(input.fanManufacturer||fanManufacturer||'Не указан');
      const zNote=dialog.querySelector('[data-zlg-simple-note]');if(zNote){const rb=zNote.querySelector('b'),rs=zNote.querySelector('span'),sm=String(result?.relube?.sourceManufacturer||'');if(rb)rb.textContent=sm==='REITZ'?'ZLG — REITZ OEM':sm==='NTN-SNR'?'ZLG — NTN-SNR OEM':'ZLG — методика определяется автоматически';if(rs)rs.textContent=sm==='REITZ'?'Используется application-specific методика REITZ для вентилятора; доза и период выбираются по исполнению, оборотам и температуре.':sm==='NTN-SNR'?'Используется методика корпуса NTN-SNR для подтверждённой конфигурации.':'Выберите производителя вентилятора только если он известен; LUBRICA не будет приписывать OEM-методику без основания.';}
      const sNote=dialog.querySelector('[data-snl-simple-note]');if(sNote){const rb=sNote.querySelector('b'),rs=sNote.querySelector('span'),sm=String(result?.relube?.sourceManufacturer||'');if(rb)rb.textContent=sm==='REITZ'?'REITZ KXE — OEM вентилятора':sm==='SKF'?'SKF SNL — OEM узла':'SNL — методика определяется автоматически';if(rs)rs.textContent=sm==='REITZ'?'Application-specific методика REITZ имеет приоритет для подтверждённой комбинации вентилятора и подшипниковой опоры.':sm==='SKF'?'Используется методика фактического корпуса SNL; производитель вентилятора и производитель корпуса не смешиваются.':'Если application-specific OEM не найден, LUBRICA явно покажет используемый уровень расчёта.';}
      const methodText=(x,fallback='—')=>{if(!x)return fallback;const sm=String(x.sourceManufacturer||'').trim(),title=x.source?.title||x.confidenceLabel||'';return sm?`${sm}${title?` · ${title}`:''}`:(title||fallback);};
      const setText=(sel,v)=>{const e=dialog.querySelector(sel);if(e)e.textContent=v;};
      setText('[data-method-relube-dose]',methodText(result.relube));setText('[data-method-relube-interval]',methodText(result.relubeInterval||result.interval));setText('[data-method-renewal-dose]',result.fullRenewal?.value!=null?methodText(result.fullRenewal):'Не применяется / не определено');setText('[data-method-renewal-interval]',result.renewalInterval?.value!=null?methodText(result.renewalInterval):(result.renewalInterval?.fallbackAvailable?`${result.renewalInterval.fallbackMethod||'SKF SNL'} · доступен fallback`:(result.renewalInterval?.conditionBased?'По состоянию / ТО':'Не определён')));
      const fallbackNote=dialog.querySelector('[data-oem-fallback-note]');if(fallbackNote){const show=!!result.renewalInterval?.fallbackAvailable;fallbackNote.hidden=!show;fallbackNote.style.display=show?'grid':'none';if(show)fallbackNote.innerHTML=`<b>REITZ не задаёт период полного обновления</b><span>Количество нового заполнения ${esc(result.fullRenewal?.value??'—')} г взято из REITZ. Для фактического корпуса ${esc(snlProfile?.designation||snlRawMarking||'SNL')} можно применить SKF SNL только к отсутствующей периодичности; это требует явного подтверждения.</span>`;}
      const operatingNote=dialog.querySelector('[data-operating-context-note]');if(operatingNote){const sm=String(result?.relubeInterval?.sourceManufacturer||result?.interval?.sourceManufacturer||result?.relube?.sourceManufacturer||'').toUpperCase();const method=String(result?.relubeInterval?.method||result?.interval?.method||result?.relube?.method||'').toLowerCase();const b=operatingNote.querySelector('b'),sp=operatingNote.querySelector('span');if(sm==='REITZ'){if(b)b.textContent='Активная OEM-методика: REITZ';if(sp)sp.textContent='В рабочий интервал REITZ входят обороты и применимая температурная коррекция. Нагрузка, загрязнение, вибрация и положение вала сохраняются как эксплуатационный контекст, но не изменяют результат REITZ без прямого OEM-правила.';}else if(sm==='SKF'&&isSNL){if(b)b.textContent='Активная методика: SKF SNL';if(sp)sp.textContent='Способ подачи, обороты и применимые параметры SKF участвуют в расчёте. Нагрузка, загрязнение, вибрация и положение вала сохраняются для инженерной оценки; LUBRICA не выдаёт их за SKF-коррекции, если такой зависимости нет в выбранной OEM-методике.';}else if(sm==='NTN-SNR'&&isZLG){if(b)b.textContent='Активная методика: NTN-SNR ZLG';if(sp)sp.textContent='Показываются фактические условия эксплуатации, но автоматическая корпусная методика NTN-SNR не получает скрытых коэффициентов нагрузки/загрязнения/вибрации из Universal. При необходимости они требуют отдельной инженерной оценки.';}else if(method.includes('unified')||sm===''||sm==='LUBRICA'){if(b)b.textContent='Инженерный расчёт LUBRICA';if(sp)sp.textContent='Нагрузка, загрязнение, вибрация, положение вала и другие инженерные параметры могут участвовать в расчёте согласно Universal 3.2. Все применённые коэффициенты отображаются в технических деталях.';}else{if(b)b.textContent='Эксплуатационные условия';if(sp)sp.textContent='Условия сохраняются в карточке узла. LUBRICA применяет их к интервалу только тогда, когда выбранная OEM-методика или явно обозначенный инженерный fallback это предусматривает.';}}
      const expertCheck=dialog.querySelector('[data-expert-check]');if(expertCheck){const fr=result.fullRenewalLifecycleState||result.maintenancePolicy?.fullRenewalLifecycleState||'NOT_APPLICABLE';const items=[];items.push(`<div class="ok">✓ Конструкция: ${esc(arrangementLabel)}</div>`);items.push(`<div class="ok">✓ Досмазывание: ${esc(result.relube?.value??'—')} г / ${esc(result.relubeInterval?.value??result.interval?.value??'—')} ч · ${esc(result.relube?.sourceManufacturer||'LUBRICA')}</div>`);if(fr==='CALCULATED')items.push(`<div class="ok">✓ Полное обновление: ${esc(result.fullRenewal?.value??'—')} г / ${esc(result.renewalInterval?.value??'—')} ч · ${esc(result.renewalInterval?.sourceManufacturer||result.fullRenewal?.sourceManufacturer||'OEM')}</div>`);else if(fr==='FALLBACK_AVAILABLE')items.push(`<div class="need">⚠ Новое заполнение: ${esc(result.fullRenewal?.value??'—')} г REITZ; период требует решения · доступен SKF SNL fallback</div>`);else if(fr==='PARTIAL_OEM')items.push(`<div class="need">⚠ Количество полного обновления определено OEM, период требует уточнения</div>`);else if(fr==='CONDITION_BASED')items.push('<div class="info">ℹ Полное обновление: по состоянию / при ТО</div>');else items.push('<div class="info">ℹ Плановая полная замена не применяется выбранной политикой</div>');expertCheck.innerHTML=items.join('');}

      const primaryValue=dialog.querySelector('[data-primary-result-value]'),primaryAction=dialog.querySelector('[data-primary-result-action]'),primaryMethod=dialog.querySelector('[data-primary-method-human]'),primaryContext=dialog.querySelector('[data-primary-result-context]'),simpleRenewal=dialog.querySelector('[data-simple-renewal-line]');
      {
        const dose=result?.relube?.value, interval=result?.relubeInterval?.value??result?.interval?.value, procedureOnly=!!result?.relube?.procedureOnly;
        const blocked=!!result?.relube?.blocked||!!result?.interval?.blocked||(!procedureOnly&&dose==null)||interval==null;
        const maker=String(result?.relube?.sourceManufacturer||result?.relubeInterval?.sourceManufacturer||'').trim();
        const confidence=String(result?.relube?.confidenceCode||'');
        if(primaryValue)primaryValue.textContent=blocked?'Требуются исходные данные':(procedureOnly?`Процедура изготовителя · каждые ${interval} ч`:`${dose} г · каждые ${interval} ч`);
        if(primaryAction)primaryAction.textContent=blocked?(result?.relube?.error||result?.interval?.error||'Заполните недостающие данные для расчёта.'):'Это рабочая рекомендация для текущей точки смазки.';
        if(primaryMethod){
          if(confidence==='A'||confidence==='B')primaryMethod.textContent=`${maker||'Изготовитель'} · рассчитано по данным изготовителя`;
          else if(confidence==='X')primaryMethod.textContent='Требуются дополнительные данные';
          else primaryMethod.textContent='Инженерная методика LUBRICA';
        }
        if(primaryContext){const bits=[];if(input.designation)bits.push(`Подшипник ${input.designation}`);if(Number(input.rpm)>0)bits.push(`${input.rpm} об/мин`);if(resolvedHousingFamily&&resolvedHousingFamily!=='NONE')bits.push(housingDisplay);primaryContext.textContent=bits.length?bits.join(' · '):'Краткое объяснение появится после заполнения исходных данных.';}
        if(simpleRenewal){const sp=simpleRenewal.querySelector('span');const fullAllowed=result?.maintenancePolicy?.fullRenewal!==false;const rd=result?.fullRenewal?.value,ri=result?.renewalInterval?.value;if(sp){if(!fullAllowed)sp.textContent='планово не предусмотрено';else if(rd!=null&&ri!=null)sp.textContent=`${rd} г · каждые ${ri} ч`;else if(rd!=null&&result?.renewalInterval?.fallbackAvailable)sp.textContent=`${rd} г · период требует подтверждения (${result.renewalInterval?.fallbackMethod||'доступен OEM/корпусной fallback'})`;else if(rd!=null&&result?.renewalInterval?.conditionBased)sp.textContent=`${rd} г · по состоянию / при вскрытии корпуса`;else if(rd!=null)sp.textContent=`${rd} г · период требует уточнения`;else if(result?.renewalInterval?.conditionBased)sp.textContent='по состоянию / при ТО';else sp.textContent='не определено';}}
      }
      const simpleStatus=dialog.querySelector('[data-simple-status]');if(simpleStatus){const msgs=calcMessages(result,input),blocked=!!result?.relube?.blocked||!!result?.interval?.blocked||result?.relube?.value==null&& !result?.relube?.procedureOnly||result?.relubeInterval?.value==null&&result?.interval?.value==null;simpleStatus.className='calc-simple-status '+(blocked?'blocked':msgs.warnings.length?'review':result?.relube?.confidenceCode==='A'||result?.relube?.confidenceCode==='B'?'oem':'engineering');const sb=simpleStatus.querySelector('b'),ss=simpleStatus.querySelector('span');if(blocked){if(sb)sb.textContent='Расчёт пока нельзя применить';if(ss)ss.textContent=msgs.warnings[0]||result?.relube?.error||result?.interval?.error||'Недостаточно исходных данных.';}else if(msgs.warnings.length){if(sb)sb.textContent='Требуется проверка';if(ss)ss.textContent=msgs.warnings[0];}else if(result?.relube?.confidenceCode==='A'||result?.relube?.confidenceCode==='B'){if(sb)sb.textContent='Расчёт по данным производителя';if(ss)ss.textContent='Методика выбрана автоматически. Технические детали доступны по кнопке «Почему такой результат?». ';}else{if(sb)sb.textContent='Инженерный расчёт';if(ss)ss.textContent='OEM-методика для этой конфигурации не выбрана. Результат остаётся явно помеченным как инженерный.';}}
      const troesterTfBox=dialog.querySelector('[data-troester-auto-tf]');if(troesterTfBox){const strong=troesterTfBox.querySelector('strong'),span=troesterTfBox.querySelector('span'),ri=result?.relubeInterval||result?.interval;if(result?.methodPlan?.relube?.interval==='VENTAPP_MACHINE'){if(strong)strong.textContent='Не используется — приоритет Ventapp';if(span)span.textContent='Для конкретного вентилятора задан application-specific OEM-интервал Ventapp.';}else if(ri?.baseHours&&ri?.diagramReference?.digitized){if(strong)strong.textContent=`${ri.baseHours} ч · автоматически по диаграмме`;if(span)span.textContent=`Tröster OEM: шкала ${ri.diagramReference.scale}, d=${input.d??'—'} мм, n=${input.rpm??'—'} об/мин. Оцифрованное 2D-чтение стр. 7; допуск оцифровки ±${ri.diagramReference.tolerancePct||15}%. Затем применяются температурная и позиционная поправки.`;}else if(ri?.baseHours&&input?.troesterBaseIntervalSource){if(strong)strong.textContent=`${ri.baseHours} ч · подтверждено вручную`;if(span)span.textContent=`Tröster OEM: d=${input.d??'—'} мм, n=${input.rpm??'—'} об/мин, тип ${input.bearingType||'—'}; источник: ${input.troesterBaseIntervalSource}.`;}else{if(strong)strong.textContent='Нужна ручная проверка диаграммы';if(span)span.textContent=ri?.error||'Точка вне валидированной области автоматической оцифровки. Откройте локальную диаграмму Tröster.';}}
      const ventappStatus=dialog.querySelector('[data-ventapp-machine-status]');if(ventappStatus){const doseEl=form.elements.ventappMachineDoseG,intervalEl=form.elements.ventappMachineIntervalHours,greaseEl=form.elements.ventappGrease,sourceEl=form.elements.ventappLubricationSource;const doseV=numberValue(doseEl?.value),intervalV=numberValue(intervalEl?.value),greaseV=String(greaseEl?.value||'').trim(),sourceV=String(sourceEl?.value||'').trim(),hasMachineData=(doseV>0)||(intervalV>0)||!!greaseV;const appliedDose=result?.methodPlan?.relube?.quantity==='VENTAPP_MACHINE'||result?.relube?.sourceManufacturer==='Ventapp';const appliedInterval=result?.methodPlan?.relube?.interval==='VENTAPP_MACHINE'||result?.relubeInterval?.sourceManufacturer==='Ventapp';ventappStatus.hidden=!hasMachineData;ventappStatus.style.display=hasMachineData?'':'none';const vb=ventappStatus.querySelector('b'),vs=ventappStatus.querySelector('span');const sourceLabel=dialog.querySelector('[data-ventapp-source-label]');if(sourceEl){sourceEl.required=hasMachineData;sourceEl.setAttribute('aria-invalid',hasMachineData&&!sourceV?'true':'false');sourceEl.setCustomValidity(hasMachineData&&!sourceV?'Укажите источник данных Ventapp: номер вентилятора, Lubrication Instructions, фото таблички или документ.':'');}sourceLabel?.classList.toggle('calc-required-source',hasMachineData&&!sourceV);ventappStatus.classList.toggle('calc-warning-note',hasMachineData&&!sourceV);ventappStatus.classList.toggle('calc-info-note',hasMachineData&&!!sourceV);if(hasMachineData&&!sourceV){if(vb)vb.textContent='Данные Ventapp ещё не применены';if(vs)vs.textContent='Укажите источник ниже. Пока источник не подтверждён, LUBRICA сохраняет расчёт по Tröster OEM и не выдаёт введённые значения за OEM Ventapp.';}else if(sourceV&&(appliedDose||appliedInterval)){const used=[];if(appliedDose&&doseV>0)used.push(`доза ${doseV} г`);if(appliedInterval&&intervalV>0)used.push(`интервал ${intervalV} ч`);if(greaseV)used.push(`смазка ${greaseV}`);if(vb)vb.textContent='Данные Ventapp применены';if(vs)vs.textContent=`Приоритет конкретной машины активен: ${used.join(' · ')||'подтверждённые данные'}; источник: ${sourceV}. Пустые параметры продолжают рассчитываться по Tröster OEM.`;}else if(sourceV){if(vb)vb.textContent='Источник Ventapp указан';if(vs)vs.textContent='Источник подтверждён. Заполненные числовые значения будут применены автоматически; пустые параметры останутся на Tröster OEM.';}}
      dialog.querySelectorAll('[data-open-troester-chart]').forEach(b=>{b.onclick=()=>window.LubricaOfflineEvidence?.open?.('TROESTER-BLOCK-LUBRICATION-V1');});
      const rpmHint=dialog.querySelector('[data-rpm-hint]');if(rpmHint){const ok=Number(input.rpm)>0;rpmHint.classList.toggle('ready',isSlewingRing||ok);const rb=rpmHint.querySelector('b'),rs=rpmHint.querySelector('span');if(isSlewingRing){if(rb)rb.textContent=`INA / Schaeffler VLU · условия: ${{normal:'чистая / сухая зона',moderate:'повышенное загрязнение / улица',heavy:'сильное загрязнение / улица',severe:'экстремальное загрязнение'}[input.contamination]||'не выбраны'}`;if(rs)rs.textContent=ok?`Обороты ${input.rpm} об/мин используются для проверки области применимости. Количество: по процедуре через 4 точки до выхода свежей смазки.`:'Обороты необязательны для базового OEM-интервала. Количество: по процедуре через 4 точки до выхода свежей смазки.';}else{if(rb)rb.textContent=ok?`Обороты: ${input.rpm} об/мин`:'Обороты обязательны для периодичности.';if(rs)rs.textContent=ok?'Изменение оборотов и параметров, которые использует активная методика, сразу пересчитывает рабочие циклы. Дополнительные условия сохраняются отдельно.':'Введите рабочие обороты узла — без них LUBRICA не будет выдумывать периодичность.';}}
      const staleBanner=dialog.querySelector('[data-stale-calc-banner]');if(staleBanner){staleBanner.hidden=!staleCalculation;staleBanner.style.display=staleCalculation?'':'none';const st=staleBanner.querySelector('[data-stale-calc-text]');if(st)st.textContent=`Сохранён расчёт ${priorVersion||'предыдущей версии'}. Новый расчёт ${CURRENT_CALC_VERSION} показан отдельно и не заменит утверждённые значения без подтверждения.`;}
      const lvl=dialog.querySelector('[data-oem-level]'),src=dialog.querySelector('[data-oem-source]');
      if(lvl){const friendly={A:'Высокая — точные данные производителя',B:'Высокая — методика производителя',C:'Средняя — есть допущения',D:'Инженерная оценка — требуется проверка',X:'Недостаточно данных'};lvl.textContent=calcMode==='simple'?(friendly[result.overallConfidence||'X']||'Недостаточно данных'):`${result.overallConfidence||'X'} · досмазывание ${result.relube?.confidenceCode||'X'}/${result.relubeInterval?.confidenceCode||result.interval?.confidenceCode||'X'} · полная замена ${result.fullRenewal?.confidenceCode||'X'}/${result.renewalInterval?.confidenceCode||'X'}`;}
      if(src)src.textContent=calcMode==='simple'?(result.manufacturer?.profile?.note||'LUBRICA автоматически использует лучший доступный метод выбранного производителя.'):(result.manufacturer?.profile?.note||'Сводный уровень равен самому слабому из четырёх рабочих результатов: количество и периодичность досмазывания, количество и периодичность полной замены.');updateSimpleMethodSummary(result);
      const renewalLifecycle=result.fullRenewalLifecycleState||result.maintenancePolicy?.fullRenewalLifecycleState||'NOT_APPLICABLE',policyId=String(result.maintenancePolicy?.id||'');
      const ready=dialog.querySelector('[data-readiness-summary]');if(ready){const procedureOnly=!!result.relube?.procedureOnly,relInterval=result.relubeInterval?.value??result.interval?.value,relOk=(procedureOnly?true:result.relube?.value!=null)&&relInterval!=null,fullApplicable=result.maintenancePolicy?.fullRenewal!==false,renCondition=fullApplicable&&result.fullRenewal?.value!=null&&!!result.renewalInterval?.conditionBased,renOk=fullApplicable&&result.fullRenewal?.value!=null&&(result.renewalInterval?.value!=null||renCondition);const rpmMissing=!(Number(input.rpm)>0),blocks=[['Досмазывание',relOk,relOk?(procedureOnly?`по OEM-процедуре / ${relInterval} ч`:`${result.relube.value} г / ${relInterval} ч`):(isSlewingRing?'выберите допустимые условия эксплуатации':(rpmMissing?'введите обороты':'нужны данные'))]];if(fullApplicable)blocks.push(['Полная замена',renOk,renOk?(renCondition?`${result.fullRenewal.value} г / по состоянию`:`${result.fullRenewal.value} г / ${result.renewalInterval.value} ч`):(renewalLifecycle==='FALLBACK_AVAILABLE'?'доступен fallback периодичности':renewalLifecycle==='PARTIAL_OEM'?'OEM определил только количество':renewalLifecycle==='CONDITION_BASED'?'по состоянию / при ТО':(rpmMissing?'введите обороты':'нужны подтверждённые данные'))]);const count=blocks.filter(x=>x[1]).length;ready.innerHTML=`<b>Готовность рабочих циклов: ${count}/${blocks.length}</b>${blocks.map(x=>`<span class="${x[1]?'ok':'need'}">${x[1]?'✓':'!'} ${x[0]}: ${esc(x[2])}</span>`).join('')}`;}const policyBox=dialog.querySelector('[data-maintenance-policy]');if(policyBox){const p=result.maintenancePolicy;policyBox.hidden=!p;policyBox.style.display=p?'':'none';if(p)policyBox.innerHTML=`<b>${esc(p.label)}</b><span>${esc(p.reason)}</span>`;}
      dialog.querySelectorAll('[data-renewal-ui]').forEach(el=>{const hide=result.maintenancePolicy?.fullRenewal===false;el.hidden=hide;el.style.display=hide?'none':'';});
      const renewalTech=dialog.querySelector('[data-renewal-technical]');if(renewalTech){const showTech=['CALCULATED','FALLBACK_AVAILABLE','PARTIAL_OEM','REVIEW_REQUIRED'].includes(renewalLifecycle)&&result.maintenancePolicy?.fullRenewal!==false;renewalTech.hidden=!showTech;renewalTech.style.display=showTech?'':'none';}
      const renewalStatus=dialog.querySelector('[data-renewal-status-panel]');if(renewalStatus){let showStatus=false,title='',body='',tone='info';
        if(policyId==='zlg_relube_only'){showStatus=true;title='Плановый цикл полного обновления не установлен';body='Для совмещённого блока ZLG рабочая карта ведётся по подтверждённому OEM-досмазыванию. Масса подшипника, плотность смазки и геометрический объём не требуются для штатного ZLG-сценария. Инженерную оценку полного заполнения можно выполнять только отдельно и она не создаёт плановое мероприятие автоматически.';}
        else if(policyId==='slewing_ring_relube_procedure'){showStatus=true;title='Плановая полная замена не назначается автоматически';body='Для INA/Schaeffler VLU рабочая операция — OEM-досмазывание через все точки до выхода свежей смазки. Инженерный расчёт массы полного заполнения не является частью штатного VLU-сценария.';}
        else if(policyId==='housed_relube_only'){showStatus=true;title='Штатный цикл — досмазывание';body='Для стандартного корпусного узла со вставным подшипником LUBRICA не создаёт периодическую полную разборку и замену всего заполнения без отдельной OEM-методики. Пустые поля массы, плотности и полного заполнения не требуются.';}
        else if(renewalLifecycle==='CONDITION_BASED'){showStatus=true;title='Полное обновление — по состоянию / при ТО';body=result.fullRenewal?.value!=null?`Для текущей конструкции определено количество ${result.fullRenewal.value} г. Календарный интервал не назначается: операция предлагается при вскрытии корпуса, загрязнении/деградации смазки или по отдельному регламенту ТО.`:'Автоматическая периодичность не назначена выбранной методикой. Операция выполняется только по подтверждённому регламенту, состоянию узла или отдельному OEM-указанию.';}
        else if(renewalLifecycle==='PARTIAL_OEM'){showStatus=true;title='OEM определил только часть полного цикла';body=`Количество нового заполнения: ${result.fullRenewal?.value??'—'} г (${result.fullRenewal?.sourceManufacturer||'OEM'}). Период полного обновления пока не определён и не должен выдумываться.`;tone='warn';}
        else if(renewalLifecycle==='FALLBACK_AVAILABLE'){showStatus=true;title='Для полного цикла доступен подтверждаемый fallback';body=`Количество нового заполнения: ${result.fullRenewal?.value??'—'} г (${result.fullRenewal?.sourceManufacturer||'OEM'}). Для отсутствующей периодичности доступен ${result.renewalInterval?.sourceManufacturer||'OEM'} fallback; он применяется только после явного подтверждения пользователя.`;tone='warn';}
        if(showStatus){renewalStatus.hidden=false;renewalStatus.style.display='';const tt=renewalStatus.querySelector('[data-renewal-status-title]'),bb=renewalStatus.querySelector('[data-renewal-status-body]');if(tt)tt.textContent=title;if(bb){bb.classList.toggle('calc-warning-note',tone==='warn');bb.innerHTML=`<b>${esc(title)}</b><span>${esc(body)}</span>`;}}else{renewalStatus.hidden=true;renewalStatus.style.display='none';}}
      const renewalReminder=dialog.querySelector('[data-full-renewal-reminder]');if(renewalReminder){const lifecycle=result.fullRenewalLifecycleState||result.maintenancePolicy?.fullRenewalLifecycleState||'NOT_APPLICABLE',dbNow=db36(),sameTasks=(dbNow?.tasks||[]).filter(x=>String(x.lubricationPointId)===String(lp.id)),hasFull=sameTasks.some(x=>{const a=x.activityType||window.LubricaStructureContext?.activityTypeForLabel?.(x.operation)||'';return a==='grease_full_replacement'&&!x.obsoleteByBearingPolicy;});const show=(lifecycle==='CALCULATED'||lifecycle==='CONDITION_BASED')&&!hasFull;renewalReminder.hidden=!show;renewalReminder.style.display=show?'':'none';if(show)renewalReminder.innerHTML=lifecycle==='CONDITION_BASED'?'<b>Предлагается отдельное мероприятие «Полная замена смазки»</b><span>Количество рабочего заполнения определено, но календарный интервал не назначается. После применения расчёта мероприятие будет создано отдельно со стратегией «По состоянию / при ТО».</span>':'<b>Нужно отдельное мероприятие «Полная замена смазки»</b><span>Цикл полностью определён, но такого мероприятия у точки ещё нет. После применения расчёта LUBRICA создаст его отдельно от досмазывания.</span>'; }const dc=dialog.querySelector('[data-dose-confidence]'),ds=dialog.querySelector('[data-dose-source]');
      if(dc)dc.textContent=`${result.relube?.confidenceCode||'X'} — ${result.relube?.confidenceLabel||'недостаточно данных'}`;
      if(ds)ds.textContent=result.relube?.source?.title?`Источник: ${result.relube.source.title}`:'Источник автоматического расчёта отсутствует';
      {let g=dialog.querySelector('[data-overgrease-guard]');if(!g){g=document.createElement('div');g.setAttribute('data-overgrease-guard','');g.className='calc-inline-note';const anchor=dialog.querySelector('[data-result-dose]')?.closest('.calc-result-card')||dialog.querySelector('[data-result-dose]')?.parentElement;if(anchor)anchor.after(g);}if(g){const r=result.relube||{};if(r.antiOvergreaseGuard||r.overgreaseRisk){g.hidden=false;g.style.display='';g.innerHTML=r.overgreaseRisk?`<b>⚠ Защита от передозировки</b><span>Выбранный метод: ${esc(r.value)} г; конструктивный UC/UK/UEL reference: ${esc(r.referenceDoseG||r.constructionReference?.relubeG||'—')} г. Быстрое утверждение заблокировано.</span>`:`<b>✓ Защита от передозировки активна</b><span>Для корпусной конструкции использована специализированная порция ${esc(r.value)} г вместо общей геометрической оценки ${esc(r.genericDoseG||'—')} г.</span>`;}else{g.hidden=true;g.style.display='none';}}}
      {const doseEl=dialog.querySelector('[data-result-dose]'),doseFormula=dialog.querySelector('[data-dose-formula]');if(result.relube?.value!=null){doseEl.textContent=`${result.relube.value} г`;doseFormula.textContent=result.relube?.formula||'';}else if(result.relube?.numericUnavailable&&result.relube?.method==='nsk_unit_guidance'){doseEl.textContent='По процедуре NSK';doseFormula.textContent='Фиксированная универсальная доза в граммах для этого корпусного узла NSK не задана. В экспертном режиме можно внести утверждённое значение из регламента вашей точки или выполнить отдельно помеченную инженерную оценку.';}else{doseEl.textContent='—';doseFormula.textContent=result.relube?.error||result.relube?.formula||'';}}
      dialog.querySelector('[data-result-envelope]').textContent=result.fullRenewal?.freeVolumeCm3!=null?`${result.fullRenewal.freeVolumeCm3} см³`:'—';
      dialog.querySelector('[data-result-full]').textContent=result.fullRenewal?.value!=null?`${result.fullRenewal.value} г`:'—';
      dialog.querySelector('[data-full-formula]').textContent=result.fullRenewal?.error||result.fullRenewal?.formula||'';
      const fc=dialog.querySelector('[data-fill-confidence]'),fs=dialog.querySelector('[data-fill-source]');if(fc)fc.textContent=`${result.fullRenewal?.confidenceCode||'X'} — ${result.fullRenewal?.confidenceLabel||'недостаточно данных'}`;if(fs)fs.textContent=result.fullRenewal?.source?.title?`Источник: ${result.fullRenewal.source.title}`:'Источник: LUBRICA Universal';
      const ri=dialog.querySelector('[data-result-renewal-interval]'),ric=dialog.querySelector('[data-renewal-interval-confidence]'),ris=dialog.querySelector('[data-renewal-interval-source]'),rid=dialog.querySelector('[data-renewal-interval-detail]');if(ri)ri.textContent=result.renewalInterval?.value!=null?`${result.renewalInterval.value} ч`:'—';if(ric)ric.textContent=`${result.renewalInterval?.confidenceCode||'X'} — ${result.renewalInterval?.confidenceLabel||'недостаточно данных'}`;if(ris)ris.textContent=result.renewalInterval?.source?.title?`Источник: ${result.renewalInterval.source.title}`:'Источник: LUBRICA Universal';if(rid)rid.textContent=result.renewalInterval?.relubeCycles?`через ${result.renewalInterval.relubeCycles} цикл(а/ов) досмазывания`:(result.renewalInterval?.error||'');
      const renewalApprovalStatus=dialog.querySelector('[data-renewal-approval-status]');if(renewalApprovalStatus){const calcDose=Number(result.fullRenewal?.value),calcInt=Number(result.renewalInterval?.value),approvedDose=numberValue(form.elements.approvedFullRenewalG?.value),approvedInt=numberValue(form.elements.approvedFullRenewalIntervalHours?.value),doseMismatch=approvedDose>0&&calcDose>0&&Math.abs(approvedDose-calcDose)>0.001,intMismatch=approvedInt>0&&calcInt>0&&Math.abs(approvedInt-calcInt)>0.001;const mismatch=doseMismatch||intMismatch;renewalApprovalStatus.hidden=!mismatch;renewalApprovalStatus.style.display=mismatch?'grid':'none';if(mismatch)renewalApprovalStatus.innerHTML=`<b>Сохранённое утверждение отличается от текущего расчёта</b><span>${doseMismatch?`Количество: сохранено ${esc(approvedDose)} г, текущий расчёт ${esc(calcDose)} г. `:''}${intMismatch?`Период: сохранено ${esc(approvedInt)} ч, текущий расчёт ${esc(calcInt)} ч. `:''}Старое утверждение не считается текущим результатом. Откройте «Ручное утверждение / отклонение от расчёта» только если его нужно сохранить намеренно, либо примите текущий расчёт.</span>`;}
      const engineeringFallbackStatus=dialog.querySelector('[data-engineering-fallback-status]');if(engineeringFallbackStatus){const intervalMethod=String(result.interval?.method||result.relubeInterval?.method||'').toLowerCase(),sourceMaker=String(result.relubeInterval?.sourceManufacturer||result.interval?.sourceManufacturer||'').toUpperCase(),manualBase=String(form.elements.intervalSource?.value||'').toLowerCase()==='manual'||Number(form.elements.baseIntervalHours?.value)>0;const activeEngineering=manualBase||intervalMethod.includes('unified')||intervalMethod.includes('engineering')||sourceMaker==='LUBRICA';engineeringFallbackStatus.textContent=activeEngineering?'Используется в текущем расчёте/ручном переопределении.':(sourceMaker?`Не используется текущей методикой ${sourceMaker}.`:'Не используется без явного выбора.');}
      dialog.querySelector('[data-result-interval]').textContent=result.interval?.value!=null?`${result.interval.value} ч`:'—';const ic=dialog.querySelector('[data-interval-confidence]'),isrc=dialog.querySelector('[data-interval-source]'),idet=dialog.querySelector('[data-interval-detail]');if(ic)ic.textContent=`${result.interval?.confidenceCode||'X'} — ${result.interval?.confidenceLabel||'недостаточно данных'}`;if(isrc)isrc.textContent=result.interval?.source?.title?`Источник: ${result.interval.source.title}`:'Источник автоматической методики отсутствует';if(idet)idet.textContent=result.interval?.baseHours!=null?`база ${result.interval.baseHours} ч · источник ${result.interval.sourceManufacturer||'—'}`:'базовый интервал не определён';
      const speed=dialog.querySelector('[data-speed-summary]');
      if(result.speed?.error)speed.innerHTML=`<div><small>Скоростная оценка</small><b>${esc(result.speed.error)}</b></div>`;
      else speed.innerHTML=`<div><small>dₘ</small><b>${result.speed.dm??'—'} мм</b></div><div><small>n×${result.speed.outerRingRotation?'D':'dₘ'}</small><b>${result.speed.ndm??'—'}</b></div><div><small>Скоростной фактор n·dₘ·bƒ</small><b>${result.speed.speedFactor??'—'}</b></div><div><small>Предел</small><b>${result.speed.limit??'—'}</b></div>`;
      const nskStrip=dialog.querySelector('[data-nsk-unit-strip]'),catalogStrip=dialog.querySelector('[data-catalog-strip]');if(nskStrip){const up=window.LubricaBearingOEM?.nskBearingUnitProfile?.(input.designation),sel=String(result.manufacturer?.id||'auto').toUpperCase(),recM=String(record.manufacturer||'').toUpperCase();if(sel==='NSK'&&up){nskStrip.hidden=false;nskStrip.style.display='';if(catalogStrip){catalogStrip.hidden=true;catalogStrip.style.display='none';}nskStrip.innerHTML=`<b>OEM-данные NSK</b><span>${esc((up.coverPrefix?up.coverPrefix+'-':'')+up.family+up.code)} → вставка ${esc(up.insertDesignation)}</span>${up.insert?`<span>Размеры вставки: ${up.insert.d} × ${up.insert.D} × ${up.insert.B} мм</span><span>Масса вставки: ${up.insert.massKg} кг</span>`:'<span>Точная масса вставки ещё не оцифрована</span>'}${up.adapterSleeve?`<span>Втулка: ${esc(up.adapterSleeve)}</span>`:''}${up.unitMassKg!=null?`<span>Масса узла: ${up.unitMassKg} кг</span>`:''}${up.coverageNote?`<small>⚠ ${esc(up.coverageNote)}</small>`:''}<small>Источник: ${esc(up.source?.title||'NSK Ball Bearing Units / NSK Online Catalog')}</small>`;}else if(sel!=='AUTO'&&recM&&recM!==sel&&!input.allowCrossBrandMass){nskStrip.hidden=false;nskStrip.style.display='';if(catalogStrip){catalogStrip.hidden=true;catalogStrip.style.display='none';}nskStrip.innerHTML=`<b>OEM-данные ${esc(sel)} для полной замены не найдены локально</b><span>Исходная карточка относится к ${esc(recM)} и автоматически не используется.</span><small>Доза досмазывания может рассчитываться по методике ${esc(sel)} без массы; для полной замены нужна масса вставного подшипника ${esc(sel)} или OEM free-space. В экспертном режиме можно явно разрешить межбрендовую справочную массу.</small>`;}else{nskStrip.hidden=true;nskStrip.style.display='none';if(catalogStrip){catalogStrip.hidden=false;catalogStrip.style.display='';}}}const catNote=dialog.querySelector('[data-catalog-oem-note]');if(catNote){const recM=String(record.manufacturer||'').toUpperCase(),selM=String(result.manufacturer?.id||'auto').toUpperCase(),usedM=String(result.fullRenewal?.massManufacturer||input.massManufacturer||'').toUpperCase();if(selM==='NSK'&&usedM==='NSK')catNote.textContent=`✓ Для расчёта вставки использованы OEM-данные NSK ${result.fullRenewal?.insertDesignation||input.insertDesignation||''}: масса ${result.fullRenewal?.bearingMassKg??input.bearingMassKg??'—'} кг. Исходная каталожная карточка другого OEM больше не подменяет массу NSK.`;else catNote.textContent=recM&&selM!=='AUTO'&&recM!==selM?`⚠ Выбран ${selM}, а справочная масса/запись относится к ${recM}. Это не OEM-данные ${selM}; достоверность полной замены понижается.`:`Каталожная запись соответствует выбранному производителю или используется как явно обозначенная справочная.`;}const messages=calcMessages(result,input),warnings=messages.warnings,box=dialog.querySelector('[data-calc-warnings]');
      const warnHtml=messages.warnings.map(x=>`<div class="bearing-calc-warning">⚠ ${esc(x)}</div>`).join('');
      const infoHtml=messages.infos.map(x=>`<div class="bearing-calc-info">ℹ ${esc(x)}</div>`).join('');
      const techHtml=calcMode==='expert'&&messages.technical.length?`<details class="bearing-calc-tech"><summary>Технические детали расчёта (${messages.technical.length})</summary>${messages.technical.map(x=>`<div>${esc(x)}</div>`).join('')}</details>`:'';
      box.innerHTML=(warnHtml+infoHtml+techHtml)||'<div class="bearing-calc-ok">✓ Критичных предупреждений нет.</div>';
      // 1.0.31.1: final UI semantics are owned by the registry-driven presenter, after legacy detail rendering.
      window.LubricaCalculationUIPresenter?.render?.(dialog,result,input);
      return {input,result,warnings,messages,presentationModel};
    };
    const approvalControlNames=new Set(['approvedDoseG','doseSource','approvedFullRenewalG','fullRenewalSource','approvedRelubeIntervalHours','approvedRelubeIntervalSource','approvedFullRenewalIntervalHours','fullRenewalIntervalSource']);
    const manuallyTouchedApprovals=new Set();
    approvalControlNames.forEach(name=>{const el=form.elements[name];if(!el)return;const mark=()=>manuallyTouchedApprovals.add(name);el.addEventListener('input',mark);el.addEventListener('change',mark);});
    let recalcQueued=false;const scheduleRecalc=()=>{if(recalcQueued)return;recalcQueued=true;requestAnimationFrame(()=>{recalcQueued=false;recalc();});};
    // 1.0.32.14: operating-condition controls affect LUBRICA Universal immediately.
    // Use a direct recalculation on select/change instead of relying only on the queued
    // generic form handler. This keeps load / contamination / vibration / orientation
    // in parity with temperature and makes a saved approval visibly stale at once.
    const immediateConditionNames=new Set(['loadClass','contamination','vibration','shaftOrientation','temperatureC','rpm']);
    form.querySelectorAll('input,select').forEach(el=>{if(!['approvedDoseG','doseSource','approvedFullRenewalG','fullRenewalSource','approvedRelubeIntervalHours','approvedRelubeIntervalSource','approvedFullRenewalIntervalHours','fullRenewalIntervalSource'].includes(el.name)){el.addEventListener('input',scheduleRecalc);el.addEventListener('change',immediateConditionNames.has(el.name)?()=>{recalcQueued=false;recalc();}:scheduleRecalc);el.addEventListener('keyup',scheduleRecalc)}});
    form.addEventListener('input',scheduleRecalc,true);form.addEventListener('change',ev=>{if(!immediateConditionNames.has(ev.target?.name))scheduleRecalc();},true);
    form.querySelector('[data-approve-relube]')?.addEventListener('click',()=>{const x=recalc();if(x&&acceptQuick('relube',x.result))syncQuickApproval(x.result);});
    form.querySelector('[data-approve-renewal]')?.addEventListener('click',()=>{const x=recalc();if(x&&acceptQuick('renewal',x.result))syncQuickApproval(x.result);});
    form.querySelector('[data-replace-stale]')?.addEventListener('click',()=>{const x=recalc();if(!x)return;let n=0;(x.result.maintenancePolicy?.fullRenewal===false?['relube']:['relube','renewal']).forEach(k=>{if(acceptQuick(k,x.result,true))n++});if(n){staleCalculation=false;syncQuickApproval(x.result);recalc();toast(`Старые утверждённые значения заменены: ${n} рабочий цикл(а).`);}else toast('Сначала укажите обязательные данные, прежде всего рабочие обороты.','warn');});
    form.querySelector('[data-approve-all]')?.addEventListener('click',()=>{const x=recalc();if(!x)return;let n=0;(x.result.maintenancePolicy?.fullRenewal===false?['relube']:['relube','renewal']).forEach(k=>{if(acceptQuick(k,x.result,true))n++});syncQuickApproval(x.result);toast(n?`Принято рабочих циклов: ${n}. Источники сохранены автоматически.`:'Нет готовых циклов для утверждения',n?'info':'warn');});
    form.querySelector('[data-accept-skf-fallback]')?.addEventListener('click',()=>{if(form.elements.fullRenewalFallbackMode){form.elements.fullRenewalFallbackMode.value='skf_snl';if(form.elements.approvedFullRenewalIntervalHours)form.elements.approvedFullRenewalIntervalHours.value='';if(form.elements.fullRenewalIntervalSource)form.elements.fullRenewalIntervalSource.value='';recalc();toast('SKF SNL принят как fallback только для периодичности полного обновления. Старое утверждение периода сброшено; количество нового заполнения остаётся по REITZ.','info');}});
    form.querySelector('[data-review-renewal]')?.addEventListener('click',()=>{if(form.elements.fullRenewalFallbackMode){form.elements.fullRenewalFallbackMode.value='review';if(form.elements.approvedFullRenewalIntervalHours)form.elements.approvedFullRenewalIntervalHours.value='';if(form.elements.fullRenewalIntervalSource)form.elements.fullRenewalIntervalSource.value='';recalc();toast('Период полного обновления оставлен на уточнение. Старое утверждение периода сброшено.','info');}});
    form.querySelector('[data-toggle-advanced]')?.addEventListener('click',(ev)=>{const on=form.classList.toggle('show-advanced');ev.currentTarget.textContent=on?'Скрыть дополнительные настройки':'Дополнительные настройки';});
    form.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
    form.querySelector('[data-recalc]').onclick=()=>recalc();
    form.querySelector('[data-save-calc]').onclick=()=>{
      let computed=recalc();if(!computed)return;
      if(resolvedHousingFamily==='TROESTER'){const doseV=numberValue(form.elements.ventappMachineDoseG?.value),intervalV=numberValue(form.elements.ventappMachineIntervalHours?.value),greaseV=String(form.elements.ventappGrease?.value||'').trim(),sourceEl=form.elements.ventappLubricationSource,sourceV=String(sourceEl?.value||'').trim(),hasMachineData=(doseV>0)||(intervalV>0)||!!greaseV;if(hasMachineData&&!sourceV){sourceEl?.focus();sourceEl?.reportValidity?.();toast('Данные Ventapp не применены: укажите источник с таблички или инструкции конкретного вентилятора.','warn');return;}}
      if(calcMode==='simple'){let accepted=0;(computed.result.maintenancePolicy?.fullRenewal===false?['relube']:['relube','renewal']).forEach(k=>{if(acceptQuick(k,computed.result,true))accepted++;});if(!accepted){toast('Расчёт пока нельзя применить: проверьте обязательные исходные данные.','warn');return;}computed=recalc()||computed;}
      else {
        // 1.0.32.16: when operating conditions change, an old automatically accepted
        // cycle must not keep winning over the newly calculated result merely because
        // the dialog is in Expert mode. Preserve a differing value only when the user
        // explicitly touched the manual approval controls in this session.
        const r=computed.result;
        const cycles=[
          {kind:'relube',value:'approvedRelubeIntervalHours',source:'approvedRelubeIntervalSource',dose:'approvedDoseG',doseSource:'doseSource',calc:r?.relubeInterval?.value??r?.interval?.value,calcDose:r?.relube?.value},
          {kind:'renewal',value:'approvedFullRenewalIntervalHours',source:'fullRenewalIntervalSource',dose:'approvedFullRenewalG',doseSource:'fullRenewalSource',calc:r?.renewalInterval?.value,calcDose:r?.fullRenewal?.value}
        ];
        for(const c of cycles){
          if(c.kind==='renewal'&&r?.maintenancePolicy?.fullRenewal===false)continue;
          const oldValue=numberValue(form.elements[c.value]?.value),newValue=Number(c.calc);
          const oldDose=numberValue(form.elements[c.dose]?.value),newDose=Number(c.calcDose);
          const intervalStale=oldValue>0&&newValue>0&&Math.abs(oldValue-newValue)>0.001;
          const doseStale=oldDose>0&&newDose>0&&Math.abs(oldDose-newDose)>0.001;
          const manualTouched=manuallyTouchedApprovals.has(c.value)||manuallyTouchedApprovals.has(c.source)||manuallyTouchedApprovals.has(c.dose)||manuallyTouchedApprovals.has(c.doseSource);
          if((intervalStale||doseStale)&&!manualTouched)acceptQuick(c.kind,r,true);
        }
        computed=recalc()||computed;
      }
      const {input,result,warnings}=computed;
      const approvalPairs=[
        ['approvedDoseG','doseSource','утверждённой дозы досмазывания'],
        ['approvedRelubeIntervalHours','approvedRelubeIntervalSource','утверждённого интервала досмазывания'],
        ['approvedFullRenewalG','fullRenewalSource','утверждённого количества полной замены'],
        ['approvedFullRenewalIntervalHours','fullRenewalIntervalSource','утверждённого интервала полной замены']
      ];
      const approvalErrors=[];
      if(calcMode==='expert'){for(const [valueName,sourceName,label] of approvalPairs){if(result.maintenancePolicy?.fullRenewal===false&&['approvedFullRenewalG','approvedFullRenewalIntervalHours'].includes(valueName))continue;const raw=String(form.elements[valueName]?.value||'').trim();if(raw){const v=numberValue(raw);if(!(v>0))approvalErrors.push(`Значение ${label} должно быть больше нуля.`);if(!String(form.elements[sourceName]?.value||'').trim())approvalErrors.push(`Укажите источник ${label}.`);}}}
      if(approvalErrors.length){toast(approvalErrors[0],'warn');const box=dialog.querySelector('[data-calc-warnings]');if(box)box.innerHTML=approvalErrors.map(x=>`<div class="bearing-calc-warning">⚠ ${esc(x)}</div>`).join('')+box.innerHTML;return;}
      const approvalTargets={approvedDoseG:result.relube?.value,approvedRelubeIntervalHours:result.relubeInterval?.value??result.interval?.value,approvedFullRenewalG:result.fullRenewal?.value,approvedFullRenewalIntervalHours:result.renewalInterval?.value};
      const approvalValue=(valueName,sourceName)=>{const raw=String(form.elements[valueName]?.value||'').trim(),source=String(form.elements[sourceName]?.value||'').trim();if(!raw)return null;const v=numberValue(raw);if(calcMode==='simple'&&!source)return null;if(calcMode==='simple'&&Number(approvalTargets[valueName])>0&&Math.abs(v-Number(approvalTargets[valueName]))>0.001)return null;return v;};
      const orphanApprovals={};if(calcMode==='simple'){for(const [valueName,sourceName,label] of approvalPairs){const raw=String(form.elements[valueName]?.value||'').trim(),source=String(form.elements[sourceName]?.value||'').trim();if(raw&&!source)orphanApprovals[valueName]={value:numberValue(raw),reason:`Старое утверждённое значение без источника: ${label}`};}}
      lp.bearing=lp.bearing||{};
      lp.bearing.bearingType=input.bearingType||lp.bearing.bearingType||'unknown';
      lp.bearing.calculation={
        calculationVersion:CURRENT_CALC_VERSION,uiMode:calcMode,manufacturer:input.manufacturer,manufacturerSelectionExplicit:true,maintenancePolicy:result.maintenancePolicy?.id||'standard_serviceable_bearing',fullRenewalApplicable:result.maintenancePolicy?.fullRenewal!==false,fullRenewalLifecycleState:result.fullRenewalLifecycleState||result.maintenancePolicy?.fullRenewalLifecycleState||'NOT_APPLICABLE',fullRenewalFallbackMode:input.fullRenewalFallbackMode||'review',oemLevel:result.overallConfidence||'X',
        relubeDoseConfidence:result.relube?.confidenceCode||'X',relubeIntervalConfidence:result.relubeInterval?.confidenceCode||result.interval?.confidenceCode||'X',fullRenewalConfidence:result.fullRenewal?.confidenceCode||'X',fullRenewalIntervalConfidence:result.renewalInterval?.confidenceCode||'X',
        oemSource:result.relube?.source?.title||result.relubeInterval?.source?.title||result.fullRenewal?.source?.title||result.renewalInterval?.source?.title||'',relubeMethod:input.method,
        relubeProcedureOnly:!!result.relube?.procedureOnly,relubeProcedure:result.relube?.procedureOnly?(result.relube?.formula||'OEM procedure — до выхода свежей смазки'):null,calculatedRelubeDoseG:result.relube?.value??null,approvedRelubeDoseG:approvalValue('approvedDoseG','doseSource'),relubeDoseSource:form.elements.doseSource.value.trim(),
        calculatedRelubeIntervalHours:result.relubeInterval?.value??result.interval?.value??null,approvedRelubeIntervalHours:approvalValue('approvedRelubeIntervalHours','approvedRelubeIntervalSource'),relubeIntervalSource:form.elements.approvedRelubeIntervalSource.value.trim()||result.relubeInterval?.source?.title||result.interval?.source?.title||'',
        calculatedFullRenewalG:result.maintenancePolicy?.fullRenewal===false?null:(result.fullRenewal?.value??null),approvedFullRenewalG:result.maintenancePolicy?.fullRenewal===false?null:approvalValue('approvedFullRenewalG','fullRenewalSource'),fullRenewalSource:result.maintenancePolicy?.fullRenewal===false?'':(form.elements.fullRenewalSource.value.trim()||result.fullRenewal?.source?.title||''),
        geometricEnvelopeVolumeCm3:result.fullRenewal?.freeVolumeCm3??null,
        calculatedFullRenewalIntervalHours:result.maintenancePolicy?.fullRenewal===false?null:(result.renewalInterval?.value??null),approvedFullRenewalIntervalHours:result.maintenancePolicy?.fullRenewal===false?null:approvalValue('approvedFullRenewalIntervalHours','fullRenewalIntervalSource'),fullRenewalIntervalSource:result.maintenancePolicy?.fullRenewal===false?'':(form.elements.fullRenewalIntervalSource.value.trim()||result.renewalInterval?.source?.title||''),
        // aliases only for backward compatibility with reports/readers written before 1.0.27.3
        calculatedDoseG:result.relube?.value??null,approvedDoseG:approvalValue('approvedDoseG','doseSource'),doseSource:form.elements.doseSource.value.trim(),calculatedIntervalHours:result.relubeInterval?.value??result.interval?.value??null,approvedIntervalHours:approvalValue('approvedRelubeIntervalHours','approvedRelubeIntervalSource'),approvedIntervalSource:form.elements.approvedRelubeIntervalSource.value.trim(),
        bearingMassKg:input.bearingMassKg,bearingMassKind:input.bearingMassKind,massManufacturer:input.massManufacturer,massSource:input.massSource,unitMassKg:input.unitMassKg,insertDesignation:input.insertDesignation,greaseDensity:input.greaseDensity,bearingGeometrySource:input.bearingGeometrySource,pointBearingDesignation:input.bearingGeometrySource==='POINT_BEARING'?input.designation:null,ventappMachineDoseG:input.ventappMachineDoseG,ventappMachineIntervalHours:input.ventappMachineIntervalHours,ventappGrease:input.ventappGrease,ventappLubricationSource:input.ventappLubricationSource,zlgServiceMode:input.zlgServiceMode,zlgVariant:input.zlgVariant,fanManufacturer:input.fanManufacturer,troesterBaseIntervalHours:input.troesterBaseIntervalHours??null,troesterBaseIntervalSource:input.troesterBaseIntervalSource||result.relubeInterval?.baseIntervalSource||'',troesterAutoBaseIntervalHours:null,troesterDiagramReference:null,ferrariCart01DoseG:input.ferrariCart01DoseG,ferrariCart01IntervalHours:input.ferrariCart01IntervalHours,ferrariMethodMode:input.ferrariMethodMode,ferrariSupportType:input.ferrariSupportType,ferrariBearingSide:input.ferrariBearingSide,zlgHousingReference:result.relube?.zlgReference||result.relubeInterval?.zlgReference||null,snlFeedMethod:input.snlFeedMethod,snlServiceMode:input.snlServiceMode,snlHousingReference:result.relube?.snlReference||result.fullRenewal?.snlReference||result.renewalInterval?.snlReference||null,reitzSingleReference:result.relube?.reitzSingleReference||result.relubeInterval?.reitzSingleReference||null,
        calculatedFreeVolumeCm3:result.fullRenewal?.freeVolumeCm3??null,calculatedGreaseVolumeCm3:result.fullRenewal?.greaseVolumeCm3??null,
        rpm:input.rpm,limitingRpm:input.limitingRpm,loadRatioPC:input.loadRatioPC,temperatureC:input.temperatureC,shaftOrientation:input.shaftOrientation,loadClass:input.loadClass,contamination:input.contamination,vibration:input.vibration,outerRingRotation:input.outerRingRotation,baseIntervalHours:input.baseHours,intervalSource:form.elements.intervalSource.value,conditionFactor:input.conditionFactor,
        speedAssessment:result.speed||null,legacyUnverifiedApprovals:Object.keys(orphanApprovals).length?orphanApprovals:undefined,warnings,calculatedAt:new Date().toISOString()
      };
      window.LubricaCalculations?.markResult?.(lp,'bearing',{
        version:'8.4',
        status:'calculated',
        calculatedAt:lp.bearing.calculation.calculatedAt,
        approved:lp.bearing.calculation.approvedRelubeDoseG!=null||lp.bearing.calculation.approvedRelubeIntervalHours!=null||lp.bearing.calculation.approvedFullRenewalG!=null||lp.bearing.calculation.approvedFullRenewalIntervalHours!=null,
        warningCount:warnings.length,
        source:lp.bearing.calculation.relubeDoseSource||lp.bearing.calculation.relubeIntervalSource||lp.bearing.calculation.fullRenewalSource||lp.bearing.calculation.fullRenewalIntervalSource||'',
        summary:'Подшипниковый расчёт'
      });
      const d=db36(),task=context?.task||currentTask36();
      if(lp.fanLubrication&&String(input.fanManufacturer||'').trim()){
        const fe=(d?.equipment||[]).find(e=>e.id===lp.equipmentId),fm=String(input.fanManufacturer||'').trim();
        if(fe&&fm!=='OTHER'){fe.manufacturer=fm;fe.meta={...(fe.meta||{}),fanManufacturerSource:'USER_CONFIRMED_CALC_UI',fanManufacturerConfirmedAt:new Date().toISOString()};}
      }
      const syncedTasks=ensureBearingMaintenanceTasks(lp,d,task);
      const activeTask=task&&String(task.lubricationPointId)===String(lp.id)?task:(syncedTasks.find(t=>(t.activityType||'')==='regrease')||syncedTasks[0]||null);
      if(activeTask)syncBearingCalculationToTask(lp,activeTask);
      LubricaCore.State.setDatabase(d);state=LubricaCore.Database.toLegacy(d);if(activeTask)selectedId=activeTask.id;renderBearingCalcSummary(lp);renderAll();fillDetailImpl();toast(activeTask?'Расчёт применён к мероприятию: количество и периодичность обновлены':'Подшипниковый расчёт сохранён');dialog.close();
    };
    setMode(c.uiMode==='expert'?'expert':'simple');dialog.showModal();recalc();requestAnimationFrame(recalc);setTimeout(recalc,50);return true;
  }
  function calculationContextImpl(){
    const point=currentPoint36(),task=currentTask36(),d=db36(),p=current();
    if(!point)return null;
    window.LubricaComponentBinding?.ensurePointTechnical?.(point);
    if(point.category==='bearing'&&$('#bearingPointSection')&&!$('#bearingPointSection').hidden)resolveBearingFields(false);
    return {
      point,
      task,
      category:point.category||'other',
      activityType:task?.activityType||null,
      database:d,
      legacyPoint:p||null,
      taskKey:task?.id||null
    };
  }
  function openCalculationImpl(){
    const context=calculationContextImpl();
    if(!context){toast('Выберите точку смазки и мероприятие','warn');return false}
    return window.LubricaCalculations?.open?.(context)??false;
  }
  function recalculateBearingImpl(){return openCalculationImpl()}
  function fillDetailImpl(){const p=current();if(!p)return;const d=db36(),task=currentTask36(),lp=currentPoint36(),bind=bindingForCurrent();if(!task||!lp)return;window.LubricaComponentBinding?.ensurePointTechnical?.(lp);$('#detailId').textContent=lp.legacyId||lp.id;$('#detailOperation').textContent=task.operation||'Мероприятие';setSingleOption($('#fEquipment'),bind?.eq?.id||'',bind?.eq?.name||p.equipment||'—');setSingleOption($('#fUnit'),bind?.node?.id||'',bind?.node?.name||p.unit||'—');$('#fPosition').value=bind?.eq?.externalCode||p.position||'';$('#fPointName').value=lp.name||lp.id;$('#fPointLocation').value=[lp.positionLabel,lp.location].filter(Boolean).join(' · ');$('#fType').value=lp.category||'other';$('#fPointStatus').value=lp.status||'review';
  {
    const binding=lp.componentBinding||{},d=db36();
    const sourceComponent=(d?.components||[]).find(x=>x.id===binding.sourceComponentId);
    const libraryEntry=window.LubricaComponentBinding?.entryById?.(binding.libraryEntryId,binding.libraryCategory||'all');
    const actualEntry=window.LubricaComponentBinding?.entryById?.(binding.actualLibraryEntryId,binding.libraryCategory||'all');
    const sourceEl=$('#fSourceComponent'),libEl=$('#fLibraryEntry'),actualEl=$('#fActualLibraryEntry'),actualRow=$('#fActualEntryRow'),hint=$('#fBindingHint');
    if(sourceEl)sourceEl.textContent=sourceComponent?window.LubricaComponentBinding.componentLabel(sourceComponent):'Не привязан';
    if(libEl)libEl.textContent=libraryEntry?[libraryEntry.manufacturer,libraryEntry.designation||libraryEntry.model||libraryEntry.name].filter(Boolean).join(' · '):(binding.matchStatus==='suggested'?'Требует подтверждения':'Не найден');
    if(actualRow)actualRow.hidden=!actualEntry;
    if(actualEl)actualEl.textContent=actualEntry?[actualEntry.manufacturer,actualEntry.designation||actualEntry.model||actualEntry.name].filter(Boolean).join(' · '):'—';
    if(hint)hint.textContent=binding.libraryEntryId?'Технические данные связаны со Справочником и используются расчётными модулями.':'Если элемент известен в структуре, откройте «Изменить привязку» — повторно вводить его характеристики не нужно.';
  }
  const bearingSection=$('#bearingPointSection');if(bearingSection){
    bearingSection.hidden=lp.category!=='bearing';
    if(lp.category==='bearing'){
      const linkedBearing=window.LubricaComponentBinding?.entryById?.(lp.componentBinding?.libraryEntryId,'bearing');
      $('#fBearingStructural').value=lp.bearing?.structuralDesignation||linkedBearing?.designation||'';
      $('#fBearingActual').value=lp.bearing?.actualDesignation||'';
      resolveBearingFields(false);
      $('#fBearingStructural').onchange=()=>{resolveBearingFields(false);renderBearingCalcSummary(lp)};
      $('#fBearingActual').onchange=()=>{resolveBearingFields(false);renderBearingCalcSummary(lp)};
    }
  }
  renderBearingCalcSummary(lp);
  renderGenericCalculationSummary(lp,task);
  const ops=taskOperationsForType(lp.category),cur=task.operation||window.LubricaStructureContext?.activityLabel?.(task.activityType)||ops[0];$('#fOperation').innerHTML=[...new Set([cur,...ops])].map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');$('#fOperation').value=cur;$('#fMaterial').innerHTML=materialOptions36(task.materialId||'',true);$('#fCurrentMaterial').innerHTML=materialOptions36(lp.currentMaterialId||'',true);$('#fTargetMaterial').innerHTML=materialOptions36(lp.targetMaterialId||'',true);$('#fCurrentMaterial').value=lp.currentMaterialId||'';$('#fTargetMaterial').value=lp.targetMaterialId||'';$('#fOemMaterial').value=lp.oemMaterial||'';$('#fMaterialRationale').value=lp.materialRationale||'';let mode=task.materialMode||((task.materialId||task.materialName)?'explicit':(taskNeedsMaterial36(task.activityType||cur)?'explicit':'none'));if(task.materialId)mode='explicit';if(mode==='point_target'&&!lp.targetMaterialId)mode=taskNeedsMaterial36(task.activityType||cur)?'explicit':'none';$('#fMaterialMode').value=mode;$('#fMaterial').value=task.materialId||'';$('#fQuantity').value=task.quantity?.approved??p.qty??'';$('#fUnitMeasure').value=task.quantity?.unit||p.measure||'г';renderQuantityHint(task);$('#fStrategy').value=task.schedule?.strategy||p.strategy||'По календарю';{const strategy=$('#fStrategy').value,schedule=task.schedule||{};let scheduleParsed;if(strategy==='По наработке'&&schedule.runtimeHours!=null&&Number.isFinite(Number(schedule.runtimeHours)))scheduleParsed={value:String(Number(schedule.runtimeHours)),unit:'hours'};else if(strategy==='По календарю'&&schedule.calendarValue!=null&&schedule.calendarUnit)scheduleParsed={value:String(schedule.calendarValue),unit:schedule.calendarUnit};else scheduleParsed=parseScheduleText(schedule.legacyText||p.interval||'',strategy);updateScheduleControls(strategy,scheduleParsed.unit);$('#fInterval').value=scheduleParsed.value;$('#fIntervalUnit').value=strategy==='По наработке'?'hours':scheduleParsed.unit;}$('#fTaskStatus').value=task.approvalStatus==='ready'?'approved':(task.approvalStatus||'review');$('#fTool').innerHTML=toolOptions36(effectiveMaterialId36(task,lp),task.toolId||'');$('#fTool').value=task.toolId||'';workflowDirty=false;bindWorkflowTracking();renderWorkflowUX();{const calcContext={point:lp,task,category:lp.category,activityType:task.activityType},calcStatus=window.LubricaCalculations?.moduleStatus?.(calcContext),calcSummary=window.LubricaCalculations?.summary?.(calcContext);$('#calcText').textContent=calcSummary?.title||'Расчёт по категории точки';const hint=$('#calcSummaryHint');if(hint)hint.textContent=calcStatus?.ready?'Расчётный модуль доступен':calcStatus?.registered?'Модуль зарегистрирован · реализация запланирована':'Расчётный модуль не зарегистрирован'};renderTaskSiblings(p);window.LubricaAnalogs?.refreshButton?.(lp);refreshMaterialMode36();refreshToolSelector36();$('#fMaterialMode').onchange=refreshMaterialMode36;$('#fMaterial').onchange=refreshToolSelector36;$('#fTargetMaterial').onchange=refreshToolSelector36;$('#fTool').onchange=refreshToolSelector36;$('#fQuantity').oninput=refreshToolSelector36;$('#fUnitMeasure').onchange=refreshToolSelector36;$('#fStrategy').onchange=()=>{const parsed=parseScheduleText($('#fInterval').value,$('#fStrategy').value);updateScheduleControls($('#fStrategy').value,parsed.unit);if($('#fStrategy').value==='По состоянию')$('#fInterval').value='';markWorkflowDirty()};$('#fTaskStatus').onchange=()=>{markWorkflowDirty()};$('#fOperation').onchange=()=>{if(!taskNeedsMaterial36(window.LubricaStructureContext?.activityTypeForLabel?.($('#fOperation').value)||$('#fOperation').value)){$('#fMaterialMode').value='none';refreshMaterialMode36()}else if($('#fMaterialMode').value==='none'){$('#fMaterialMode').value='explicit';refreshMaterialMode36()}}}

  function savePointImpl(){const d=db36(),p=current(),task=currentTask36(),lp=currentPoint36();if(!d||!p||!task||!lp)return;const operation=$('#fOperation').value,activityType=window.LubricaStructureContext?.activityTypeForLabel?.(operation)||task.activityType||'custom',mode=$('#fMaterialMode').value,explicitId=mode==='explicit'?($('#fMaterial').value||null):null,targetId=$('#fTargetMaterial').value||null,effectiveId=mode==='explicit'?explicitId:mode==='point_target'?targetId:null,toolId=$('#fTool').value||null,tool=item36(d.tools,toolId);if(taskNeedsMaterial36(activityType)&&!effectiveId){toast('Для этого мероприятия необходимо выбрать смазочный материал из справочника','warn');return}if(tool?.materialId&&String(tool.materialId)!==String(effectiveId||'')){toast('Выбранное оборудование закреплено за другим смазочным материалом','error');return}lp.status=$('#fPointStatus').value;lp.currentMaterialId=$('#fCurrentMaterial').value||null;lp.targetMaterialId=targetId;lp.oemMaterial=$('#fOemMaterial').value.trim();lp.materialRationale=$('#fMaterialRationale').value.trim();
  if(lp.category==='bearing'){
    const structural=$('#fBearingStructural')?.value.trim()||'';
    const actual=$('#fBearingActual')?.value.trim()||'';
    const resolved=(actual||structural)?window.LubricaBearings?.lookup?.(actual||structural):null;
    const parsed=resolved?.parsed;
    lp.bearing={
      ...(lp.bearing||{}),
      structuralDesignation:structural,
      actualDesignation:actual,
      effectiveDesignation:actual||structural,
      baseDesignation:parsed?.baseDesignation||'',
      bearingType:resolved?.record?.bearingType||parsed?.inferredType||lp.bearing?.bearingType||'unknown',
      d:parsed?.dimensions?.d??null,
      D:parsed?.dimensions?.D??null,
      B:parsed?.dimensions?.B??null,
      sealing:parsed?.sealing||'unknown',
      sealingCode:parsed?.sealingCode||'',
      clearance:parsed?.clearance||'',
      cage:parsed?.cage||'',
      catalogId:parsed?.catalogId||null,
      sourceType:resolved?.sourceType||'none',
      resolvedAt:new Date().toISOString()
    };
  }
  task.activityType=activityType;task.operation=operation;task.materialMode=mode;task.materialId=explicitId;task.materialName=material36(effectiveId)?.name||'';task.toolId=toolId;{const qText=$('#fQuantity').value.trim(),unit=$('#fUnitMeasure').value,q=Number(String(qText).replace(',','.')),gps=Number(tool?.calibrationUnit==='г/качок'?(tool?.calibrationValue??tool?.gramsPerStroke):0)||0;task.quantity={...(task.quantity||{}),approved:qText,unit,calculatedStrokes:(gps&&q>0&&unit==='г')?Number((q/gps).toFixed(2)):null,calculatedGrams:(gps&&q>0&&unit==='качков')?Number((q*gps).toFixed(2)):null}};
  if(lp.category==='bearing'&&lp.bearing?.calculation){
    const bc=lp.bearing.calculation;
    if(activityType==='regrease'||activityType==='grease_full_replacement'){syncBearingCalculationToTask(lp,task);}
  }else if(lp.category==='linear_bearing'&&lp.linearBearing?.calculation&&activityType==='regrease'){
    const lc=lp.linearBearing.calculation;
    const approved=lc.approvedRelubeCm3??null;
    task.quantity={...(task.quantity||{}),calculated:lc.calculatedRelubeCm3??null,calculatedGrams:lc.calculatedRelubeG??null,approved:approved!=null?String(approved):(task.quantity?.approved||''),unit:'см³',source:lc.relubeSource||''};
    task.schedule={...(task.schedule||{}),calculatedCalendarMonthsMin:lc.calculatedInterval?.calendarMonthsMin??null,calculatedCalendarMonthsMax:lc.calculatedInterval?.calendarMonthsMax??null,approvedCalendarMonths:lc.approvedCalendarMonths??null,rule:'calendar',source:lc.approvedIntervalSource||lc.intervalSource||''};
  }else if(lp.category==='gearbox_oil'&&lp.gearboxOil?.calculation){
    const gc=lp.gearboxOil.calculation;
    if(activityType==='oil_change'){
      task.quantity={...(task.quantity||{}),calculated:gc.effectiveFillLiters??null,approved:gc.approvedFillLiters!=null?String(gc.approvedFillLiters):(gc.appliedAt&&gc.effectiveFillLiters!=null?String(gc.effectiveFillLiters):(task.quantity?.approved||'')),unit:'л',source:gc.fillSource||''};
      task.schedule={...(task.schedule||{}),firstChangeHours:gc.firstChangeHours??null,calculatedHours:gc.changeHours??null,calculatedCalendarMonths:gc.changeMonths??null,conditionBased:!!gc.conditionBased,rule:gc.interval?.rule||'unspecified',source:gc.intervalSource||''};
    }else if(activityType==='oil_topup'){
      task.quantity={...(task.quantity||{}),calculated:gc.topupLiters??null,approved:gc.topupLiters!=null?String(gc.topupLiters):(task.quantity?.approved||''),unit:'л',source:gc.fillSource||''};
    }
  }else if(lp.category==='chain'&&lp.chain?.calculation&&activityType==='lubricant_apply'){
    const cc=lp.chain.calculation;
    task.quantity={...(task.quantity||{}),calculated:cc.calculatedVolumeMl??null,calculatedGrams:cc.calculatedMassG??null,approved:cc.approvedVolumeMl!=null?String(cc.approvedVolumeMl):(task.quantity?.approved||''),unit:'мл',source:cc.quantitySource||''};
    task.schedule={...(task.schedule||{}),calculatedHours:cc.calculatedInterval?.hours??null,calculatedDays:cc.calculatedInterval?.days??null,calculatedMachineCycles:cc.calculatedInterval?.machineCycles??null,approvedHours:cc.approvedHours??null,approvedDays:cc.approvedDays??null,approvedMachineCycles:cc.approvedMachineCycles??null,rule:cc.calculatedInterval?.rule||'unspecified',source:cc.intervalSource||''};
  }else if(lp.category==='coupling'&&lp.coupling?.calculation&&['regrease','grease_full_replacement','lubrication_service'].includes(activityType)){
    const cp=lp.coupling.calculation;
    task.quantity={...(task.quantity||{}),calculated:cp.calculatedMassG??null,approved:cp.approvedMassG!=null?String(cp.approvedMassG):(task.quantity?.approved||''),unit:'г',source:cp.quantitySource||''};
    task.schedule={...(task.schedule||{}),calculatedHours:cp.calculatedInterval?.hours??null,calculatedCalendarMonths:cp.calculatedInterval?.months??null,approvedHours:cp.approvedHours??null,approvedCalendarMonths:cp.approvedMonths??null,rule:cp.calculatedInterval?.rule||'unspecified',source:cp.intervalSource||''};
  }else if(lp.category==='screw'&&lp.screwJack?.calculation&&['regrease','lubricant_apply','lubrication_service'].includes(activityType)){
    const sj=lp.screwJack.calculation, grams=sj.approvedMassG??sj.calibratedMassG??null;
    if(grams!=null)task.quantity={...(task.quantity||{}),calculated:sj.calibratedMassG??null,approved:sj.approvedMassG!=null?String(sj.approvedMassG):(task.quantity?.approved||''),unit:'г',source:sj.quantitySource||''};
    task.schedule={...(task.schedule||{}),calculatedHours:sj.calculatedInterval?.hours??null,calculatedMachineCycles:sj.calculatedInterval?.targetCycles??null,approvedMachineCycles:sj.approvedCycles??null,rule:sj.approvedCycles!=null||sj.calculatedInterval?.targetCycles!=null?'cycles':'unspecified',source:sj.intervalSource||''};
  }else if(['guide','joint','bushing','screw'].includes(lp.category)&&lp.greasePoint?.calculation&&['regrease','lubricant_apply','lubrication_service'].includes(activityType)){
    const gp=lp.greasePoint.calculation;
    task.quantity={...(task.quantity||{}),calculated:gp.calculatedMassG??null,approved:gp.approvedMassG!=null?String(gp.approvedMassG):(task.quantity?.approved||''),unit:'г',source:gp.quantitySource||''};
    task.schedule={...(task.schedule||{}),calculatedHours:gp.calculatedInterval?.hours??null,calculatedDays:gp.calculatedInterval?.days??null,calculatedCalendarMonths:gp.calculatedInterval?.months??null,calculatedMachineCycles:gp.calculatedInterval?.machineCycles??null,approvedHours:gp.approvedHours??null,approvedDays:gp.approvedDays??null,approvedCalendarMonths:gp.approvedMonths??null,rule:gp.calculatedInterval?.rule||'unspecified',source:gp.intervalSource||''};
  }else if(lp.category==='ball_screw'&&lp.ballScrew?.calculation&&activityType==='regrease'){
    const bs=lp.ballScrew.calculation;
    task.quantity={...(task.quantity||{}),calculated:bs.calculatedMassG??null,approved:bs.approvedMassG!=null?String(bs.approvedMassG):(task.quantity?.approved||''),unit:'г',source:bs.quantitySource||''};
    task.schedule={...(task.schedule||{}),calculatedHours:bs.calculatedInterval?.hours??null,calculatedDays:bs.calculatedInterval?.days??null,calculatedCalendarMonths:bs.calculatedInterval?.months??null,calculatedMachineCycles:bs.calculatedInterval?.machineCycles??null,approvedHours:bs.approvedHours??null,approvedCalendarMonths:bs.approvedMonths??null,rule:bs.calculatedInterval?.rule||'unspecified',source:bs.intervalSource||''};
  }{const strategy=$('#fStrategy').value,intervalRaw=$('#fInterval').value.trim(),intervalUnit=$('#fIntervalUnit')?.value||'custom',intervalValue=strategy==='По наработке'?scheduleNumberText(intervalRaw):intervalRaw;task.schedule={...(task.schedule||{}),strategy,legacyText:formatScheduleText(strategy,intervalValue,intervalUnit),calendarValue:strategy==='По календарю'?numberValue(intervalValue):null,calendarUnit:strategy==='По календарю'&&intervalUnit!=='custom'?intervalUnit:null,runtimeHours:strategy==='По наработке'?numberValue(intervalValue):null,runtimeUnit:strategy==='По наработке'?'hours':null};}task.approvalStatus=$('#fTaskStatus').value;task.verified=task.approvalStatus==='approved';task.source=task.source||'Ручное добавление';LubricaCore.State.setDatabase(d);state=LubricaCore.Database.toLegacy(d);selectedId=task.id;workflowDirty=false;renderAll();toast(task.approvalStatus==='approved'?'Изменения сохранены · мероприятие готово и участвует в плане':'Изменения сохранены')}

  window.LubricaTaskEditor=Object.freeze({fillDetail:fillDetailImpl,savePoint:savePointImpl,toggleTaskApproval:toggleTaskApprovalImpl,resolveBearing:resolveBearingImpl,recalculateBearing:recalculateBearingImpl,openBearingCalculation:openBearingCalculationImpl,getCalculationContext:calculationContextImpl,openCalculation:openCalculationImpl,resolveBearingHousingContext:bearingHousingContext36});
})();
