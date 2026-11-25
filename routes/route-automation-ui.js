"use strict";
/* R8 — one table of canonical route candidates, engineering controls remain optional. */
(function(global){
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const arr=x=>Array.isArray(x)?x:[],str=x=>String(x??''),db=()=>global.LubricaCore?.State?.getDatabase?.();
 const date=v=>esc(v||''),option=(v,t)=>'<option value="'+esc(v)+'">'+esc(t)+'</option>';
 const min=v=>v==null?'не задано':Math.floor(v/60)+' ч '+Math.round(v%60)+' мин';
 const weeklyCount=k=>{const m=/^days:(\d+)$/.exec(k||'');return m&&Number(m[1])>0&&Number(m[1])%7===0?Number(m[1])/7:0};
 const cadenceLabel=g=>{const n=weeklyCount(g.scheduleKey),last=n%10,teen=n%100;return n?n+' '+(teen>=11&&teen<=14?'недель':last===1?'неделя':last>=2&&last<=4?'недели':'недель')+' ('+n*7+' дней)':g.interval};
 const cadenceSort=(a,b)=>{const rank=k=>weeklyCount(k)?0:k.startsWith('days:')?1:k.startsWith('months:')?2:3;return rank(a.scheduleKey)-rank(b.scheduleKey)||Number(a.scheduleKey.split(':')[1])-Number(b.scheduleKey.split(':')[1])||a.scheduleKey.localeCompare(b.scheduleKey)};
 const checkbox=(name,label,checked=false)=>'<label class="r5-check"><input type="checkbox" data-r5="'+name+'" '+(checked?'checked':'')+'>'+label+'</label>';
 const input=(name,label,type='text',v='',extra='')=>'<label>'+label+'<input data-r5="'+name+'" type="'+type+'" value="'+esc(v)+'" '+extra+'></label>';

  function diagnosticItem(x){
   const name=[x.equipment,x.operation,x.interval].filter(Boolean).join(' · ')||x.taskId;
   const labels={excluded:'Не войдёт в маршрут',removed:'Будет исключено из текущего состава',retained:'Останется в существующем маршруте',included:'Будет включено',outside:'Не входит в выбранную группу',unselected:'Не выбрано вручную'};
   const status=labels[x.outcome]||'Требуется проверка';
   const where=x.routes.length?'Маршрут: '+x.routes.map(r=>r.name+' ('+(r.status==='draft'?'черновик':'активный')+')').join('; '):x.previousRoutes.length?'Прежний маршрут: '+x.previousRoutes.map(r=>r.name).join('; '):'Маршрут после сохранения: не назначен';
   return '<article class="r82-issue-card" data-r82-issue="'+esc(x.taskId)+'" data-outcome="'+esc(x.outcome)+'"><div class="r82-issue-status">'+esc(status)+'</div><b>'+esc(name)+'</b><small>'+esc([x.location,x.taskId].filter(Boolean).join(' · '))+'</small><small>'+esc(where)+'</small>'+(x.scope==='outside'?'<small>Замечание относится к другой группе обслуживания выбранного участка.</small>':x.scope==='unknown'?'<small>Группа маршрута не определена.</small>':'')+'<div><strong>Причина:</strong> '+esc(x.reasons.join(' · '))+'</div>'+(x.actions.length?'<div><strong>Что сделать:</strong> '+esc(x.actions.join(' · '))+'</div>':'')+'</article>';
  }
  function diagnosticResult(res){
   const d=res.diagnostics||{},rows=arr(d.rows),missing=arr(d.missing),general=arr(d.general);
   const groups=[['Не войдут в маршрут',rows.filter(x=>['excluded','removed'].includes(x.outcome))],['Останутся в существующих маршрутах',rows.filter(x=>x.outcome==='retained')],['Войдут в маршрут с замечаниями',rows.filter(x=>x.outcome==='included')],['Не выбраны вручную',rows.filter(x=>x.outcome==='unselected')],['Другие группы выбранного участка',rows.filter(x=>x.outcome==='outside')]];
   const sections=groups.filter(([,xs])=>xs.length).map(([title,xs])=>'<details class="r5-result-detail r82-issue-section" '+(title==='Не войдут в маршрут'?'open':'')+'><summary>'+title+' · '+xs.length+'</summary><div class="r5-scroll">'+xs.map(diagnosticItem).join('')+'</div></details>').join('');
   return sections+(missing.length?'<details class="r5-result-detail r82-issue-section"><summary>В составе маршрутов, но требуют настройки сроков · '+missing.length+'</summary><p class="r5-note">Эти мероприятия включены в состав. Без подтверждённого срока по ним нельзя сформировать новое задание.</p><div class="r5-scroll">'+missing.map(x=>'<article class="r82-issue-card" data-r82-missing-due="'+esc(x.taskId)+'"><b>'+esc([x.equipment,x.operation,x.interval].filter(Boolean).join(' · '))+'</b><small>'+esc([x.location,x.taskId].filter(Boolean).join(' · '))+'</small><small>'+esc(x.routeName+' · '+(x.routeStatus==='draft'?'черновик':'активный'))+'</small><div>'+esc(x.reason)+'</div><small>Настройте сроки в карточке маршрута.</small></article>').join('')+'</div></details>':'')+(general.length?'<details class="r5-result-detail"><summary>Общие замечания · '+general.length+'</summary><div class="r5-scroll">'+general.map(x=>'<div class="r5-item"><b>'+esc(x.routeId||x.code||'Проверка')+'</b><small>'+esc(x.message||x.reason)+'</small></div>').join('')+'</div></details>':'');
  }

 function open(view,dlg,{onApplied,bulk=false,resume=null}={}){
  const R=global.LubricaRouteAutomation,W=global.LubricaRouteWorkload,D=global.LubricaRouteDue,E=global.LubricaRouteEngine,d=db();
  if(!R||!W||!D||!E||!d||!dlg)return;
  const info=R.eligible(d),auto=R.config(d),lines=arr(d.lines),areas=arr(d.areas),isDemo=global.LubricaCore?.State?.isDemo?.()===true,lineNames=new Map(lines.map(l=>[String(l.id),l.name||l.id]));
  let report=null,order=[],orderChanged=false,currentArea='',selectedService='',scopeRows=[],advanced=false,rows=new Map();
  const el=n=>dlg.querySelector('[data-r5="'+n+'"]'),val=n=>el(n)?.value||'',checked=n=>!!el(n)?.checked,ui=q=>dlg.querySelector(q);
  dlg.innerHTML='<div class="r5-shell r5-simple"><div class="dialog-head"><div><span class="eyebrow">МАРШРУТЫ СМАЗЧИКА</span><h2>Автоматическое формирование маршрутов</h2><p class="dialog-copy">Выберите участок и нужные маршруты. Состав и периодичность взяты из карты смазки.</p></div><button class="icon-btn" type="button" data-r5="close" aria-label="Закрыть">×</button></div>'+
   '<div class="r5-body"><div class="r5-note r5-db-context" data-r5="database-context">'+(isDemo?'<b>Демонстрационная база.</b> Для маршрутов вашего завода закройте мастер и нажмите «Открыть JSON».':'База: <b>'+esc(d.project?.name||d.plants?.[0]?.name||'Рабочая база')+'</b> · участков: '+areas.length)+'</div>'+
   '<section class="r5-section r5-scope"><h3>1. Выберите участок</h3><div class="r5-grid r5-scope-grid"><label>Линия<select data-r5="line">'+option('','Все линии')+lines.map(l=>option(l.id,l.name||l.id)).join('')+'</select></label><label>Участок<select data-r5="area"></select></label><button type="button" class="btn secondary" data-r8-settings>Настройки предприятия</button></div><p class="r5-note" data-r5="scope-count"></p><p class="r5-note">Периодичность из карты смазки не меняется. Без исходного срока маршрут остаётся черновиком. ППР наследуется из графика линии.</p><div class="r8-toolbar"><button type="button" class="btn secondary" data-r8-select-all>Выбрать все доступные</button><button type="button" class="btn ghost" data-r8-select-none>Снять выбор</button><strong data-r8-selected></strong></div><div class="r8-batch"><label>Общее основание<select data-r8-bulk-basis>'+option('next','Первый срок')+option('last','Фактическое последнее обслуживание')+'</select></label><label>Общая дата<input type="date" data-r8-bulk-date></label><button type="button" class="btn secondary" data-r8-use-date>Применить дату к выбранным</button></div><small>Общая дата заполняет отсутствующие сроки. Для норм в часах можно выбрать безопасный календарный цикл.</small><label class="r5-check"><input type="checkbox" data-r81-confirm-calendar>Подтверждаю максимальную наработку и допустимость более ранней смазки для выбранных календарных циклов</label><div class="r8-table" data-r8-table></div><div class="r5-advanced-field" hidden><label>Вид для инженерных настроек<select data-r5="service"></select></label>'+checkbox('activate','Активировать готовые автомаршруты',true)+'</div></section>'+
   '<div class="r5-extra-toggle"><button type="button" class="btn ghost" data-r5="advanced" aria-expanded="false">Инженерные настройки ▾</button><small>Показания счётчиков, порядок обхода и индивидуальные условия</small></div><div class="r5-advanced-fields" hidden>'+
   '<details class="r5-section" open><summary>2. Первоначальные сроки и подтверждённая история</summary><div class="r5-inner">'+checkbox('history','Восстановить отсутствующие сроки по подтверждённым выполненным мероприятиям',true)+'<small>Только точное совпадение точки, вида и интервала. Заполненные сроки не заменяются; пропуски и отмены не считаются выполнением.</small>'+

   '<details><summary>Моточасы общего счётчика оборудования</summary><div class="r5-inner"><label>Оборудование<select data-r5="meter-eq"></select></label><div class="r5-grid">'+input('last-hours','Моточасы последнего обслуживания','number','','min="0" step="any"')+input('reading-hours','Фактическое показание','number','','min="0" step="any"')+input('reading-date','Дата показания','date')+input('rate','Прогноз, ч/сут (необязательно)','number','','min="0" max="24" step="any"')+'</div>'+checkbox('confirm-meter','Подтверждаю общий счётчик и основание последнего обслуживания для выбранных мероприятий')+'<small>Порог вычисляется как факт последнего обслуживания + индивидуальный интервал. Прогноз не разрешает запуск.</small></div></details></div></details>'+
   '<details class="r5-section"><summary>3. Общий порядок обхода участка</summary><div class="r5-inner"><p class="r5-note">Выберите один участок, затем задайте порядок оборудования. Новые маршруты его наследуют; применение к существующим — отдельное подтверждение.</p><div class="r5-order"><select data-r5="order" size="6"></select><div><button type="button" class="btn secondary" data-r5="up">↑ Выше</button><button type="button" class="btn secondary" data-r5="down">↓ Ниже</button></div></div>'+checkbox('apply-order','Применить порядок ко всем свободным автомаршрутам выбранного участка')+'</div></details>'+
   '<details class="r5-section"><summary>4. Условия доступа, допустимые сроки и трудоёмкость</summary><div class="r5-inner"><p class="r5-note">Не требуется для создания маршрута или задания даты отсчёта.</p>'+checkbox('policy-enabled','Изменить условия отдельных мероприятий')+'<div class="r5-grid"><label>Доступ<select data-r5="access">'+option('','Без изменения')+option('ppr','Только ППР своей линии')+option('normal','Обычный доступ')+'</select></label>'+input('early','Разрешить раньше срока, дней','number','','min="0" max="90" step="1" placeholder="не менять"')+input('early-reason','Основание (только для допуска > 0)')+input('task-minutes','Минут на мероприятие (0 — по виду)','number','','min="0" max="1440" step="any"')+'</div><div class="r5-select-tools"><button type="button" class="btn secondary" data-r5="select-all">Выбрать подходящие</button><button type="button" class="btn ghost" data-r5="select-none">Снять выбор</button><small data-r5="policy-count"></small></div><p class="r5-note" data-r5="policy-hint"></p><div class="r5-task-list" data-r5="tasks"></div>'+
   '<hr>'+checkbox('timing','Изменить настройки трудоёмкости и распределения')+'<div class="r5-grid">'+input('service-minutes','Минут по выбранному виду','number','','min="0.1" max="1440" step="any" placeholder="без изменения"')+input('transition','Минут между оборудованием','number',auto.transitionMinutes,'min="0" max="120" step="any"')+'</div>'+checkbox('split','Разделять новые большие задания по физическим точкам',auto.splitLargeJobs)+checkbox('balance','Выравнивать нагрузку в разрешённых окнах',auto.balance)+'<small>Без дробления мероприятия. Нормативы времени задаёт предприятие; при отсутствии используется прежнее значение маршрута. Досрочность не разрешается по моточасам.</small></div></details>'+

   '</div><div class="r5-report" data-r5="report"></div></div><menu><button type="button" class="btn ghost" data-r5="cancel">Отмена</button><button type="button" class="btn secondary" data-r5="preview">Проверить состав</button><button type="button" class="btn primary" data-r5="apply" disabled>Сохранить маршруты</button></menu></div>';
  const invalidate=()=>{report=null;el('apply').disabled=true;el('report').innerHTML='<div class="r5-results r5-empty-result"><h3>2. Проверьте состав</h3><p class="r5-note">Выберите маршруты и нажмите «Проверить состав». База не изменится.</p></div>'};
  const inScope=g=>(!val('line')||String(g.lineId)===val('line'))&&(!val('area')||String(g.areaId)===val('area'));
  const pprNote=row=>row.mode==='ppr'?(!row.g.pprAnchor?'Настройте ППР линии':row.g.weeks&&row.g.weeks%2?'Конфликт с ППР раз в 2 недели':'Ближайший ППР: '+row.g.nextPpr):'';
  const runtimeRule=row=>row.g.scheduleKey.startsWith('runtime_hours:')&&row.planning==='calendar_runtime'?D.calendarRule(Number(row.g.scheduleKey.split(':')[1]),row.maxRate,row.mode==='ppr'):null;
  const ruleLabel=row=>{const r=runtimeRule(row);return r?(r.ok?(r.weeks?r.weeks+' нед.':r.days+' дн.')+' · '+r.plannedHours+' из '+r.technicalHours+' ч':r.message):''};
  function orderView(index=0){
   const eqs=new Map(arr(d.equipment).map(x=>[String(x.id),x]));
   el('order').innerHTML=order.map(id=>{const e=eqs.get(id);return option(id,[e?.externalCode,e?.name||id].filter(Boolean).join(' · '))}).join('');
   if(order.length)el('order').selectedIndex=Math.max(0,Math.min(index,order.length-1));el('up').disabled=el('down').disabled=!order.length;
  }
  function updateSelected(refresh=false){
   const selected=[...rows.values()].filter(x=>x.selected);
   ui('[data-r8-selected]').textContent='Выбрано: '+selected.length+' · '+selected.reduce((v,x)=>v+x.g.taskIds.length,0)+' меропр.';
   ui('[data-r8-use-date]').disabled=!selected.length;
   if(refresh&&advanced)refreshAdvanced();invalidate();
  }
  function renderTable(){
   const box=ui('[data-r8-table]'),list=[...rows.values()],opts=(vs,value)=>vs.map(([v,label])=>'<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(label)+'</option>').join('');
   box.innerHTML=list.length?'<div class="r8-table-head"><span>Маршрут и состав</span><span>Доступ</span><span>Основание и дата</span><span>Цикл</span></div>'+list.map(row=>{
    const g=row.g,disabled=g.locked,run=g.scheduleKey.startsWith('runtime_hours:'),meter=run&&row.planning==='meter',check=disabled?' disabled':'',rule=runtimeRule(row),weekly=g.weeks||rule?.weeks;
    return '<article class="r8-route-row '+(disabled?'protected':'')+'" data-r8-row="'+esc(g.key)+'" data-r8-schedule="'+esc(g.scheduleKey)+'"><div class="r8-route-name"><label class="r8-pick"><input type="checkbox" data-r8-pick '+(row.selected?'checked':'')+check+'><span><b>'+esc(g.serviceLabel||g.name)+'</b><strong>'+esc(cadenceLabel(g))+'</strong></span></label><small>'+esc(lineNames.get(String(g.lineId))||g.lineId)+' · '+esc(areas.find(a=>String(a.id)===String(g.areaId))?.name||g.areaId)+'</small><small>'+g.pointCount+' точек · '+g.taskIds.length+' меропр. · '+(g.basisMissing?.length||0)+' без срока'+(g.deferredTaskIds?.length?' · '+g.deferredTaskIds.length+' новых ждут срока':'')+'</small><small class="r8-status">'+esc(disabled?'Защищён / '+(g.reason||'открытые задания'):g.action==='create'?'Новый':g.action==='archive'?'В архив':g.action==='update'?'Обновить':'Существующий')+'</small></div>'+
    '<label>Доступ<select data-r8-mode'+check+'>'+opts([['normal','Календарь'],['ppr','Только ППР']],row.mode)+'</select><small data-r8-ppr-note>'+esc(pprNote(row))+'</small></label>'+
    '<div>'+(run?'<label>Планирование<select data-r81-planning'+check+'>'+opts([['calendar_runtime','По календарю'],['meter','По счётчику']],row.planning)+'</select></label>':'')+(run&&!meter?'<label>Макс. ч/сут<input data-r81-rate type="number" min="0.1" max="24" step="0.1" value="'+esc(row.maxRate)+'"'+check+'></label><small data-r81-rule>'+esc(ruleLabel(row))+'</small>':'')+(meter?'<small>Общий счётчик оборудования — в инженерных настройках или в сроках маршрута</small>':'<label>Основание<select data-r8-basis'+check+'>'+opts([['next','Первый срок'],['last','Последнее выполнение']],row.basis)+'</select></label><label>Дата<input type="date" data-r8-date value="'+esc(row.date)+'"'+check+'></label>')+'</div>'+
    '<label>Цикл<select data-r8-cycle'+(disabled||!weekly?' disabled':'')+'>'+opts(weekly?[['actual','От выполнения'],['fixed_weekly','Фиксированные недели']]:[['actual',run?'По наработке':'От выполнения']],row.cycle)+'</select></label></article>';
   }).join(''):'<p class="r5-note">Нет доступных групп. Проверьте инженерную готовность мероприятий и выбранный участок.</p>';
   box.querySelectorAll('[data-r8-row]').forEach(card=>{
    const row=rows.get(card.dataset.r8Row),bind=(key,field,fn)=>{const node=card.querySelector('[data-r8-'+key+']');if(node)node.onchange=()=>{row[field]=fn?fn(node):node.value;if(key==='basis'){row.date='';card.querySelector('[data-r8-date]').value=''}if(key==='mode')card.querySelector('[data-r8-ppr-note]').textContent=pprNote(row);updateSelected(key==='pick')}};
    bind('pick','selected',node=>node.checked);bind('mode','mode');bind('basis','basis');bind('date','date');bind('cycle','cycle');
    const refreshRule=()=>{if(row.g.scheduleKey.startsWith('runtime_hours:')&&!runtimeRule(row)?.weeks)row.cycle='actual';renderTable()};
    const plan=card.querySelector('[data-r81-planning]');if(plan)plan.onchange=()=>{row.planning=plan.value;refreshRule()};const rate=card.querySelector('[data-r81-rate]');if(rate)rate.onchange=()=>{row.maxRate=rate.value;refreshRule()};
    const access=card.querySelector('[data-r8-mode]');if(access)access.onchange=()=>{row.mode=access.value;refreshRule()};
   });
   updateSelected(true);
  }
  function refreshScope(resetAreas=false){
   if(resetAreas){const a=val('area')||resume?.area||'';el('area').innerHTML=option('','Все участки')+areas.filter(x=>!val('line')||String(x.lineId)===val('line')).map(x=>option(x.id,(!val('line')?(lineNames.get(String(x.lineId))||'Без линии')+' — ':'')+(x.name||x.id))).join('');if([...el('area').options].some(x=>x.value===a))el('area').value=a}
   const result=R.candidates({lineId:val('line'),areaId:val('area')},d);
   rows=new Map(arr(result.groups).sort((a,b)=>cadenceSort(a,b)||a.name.localeCompare(b.name,'ru')).map(g=>[g.key,{g,selected:false,mode:g.routeMode,cycle:g.cycleMode,basis:'next',date:'',planning:g.scheduleDefaults?.planningMode||(g.existingMeter?'meter':'calendar_runtime'),maxRate:g.scheduleDefaults?.maxHoursPerDay||24}]));
   if(resume){for(const [key,old] of resume.rows||[]){const row=rows.get(key);if(row&&!row.g.locked)Object.assign(row,old)}resume=null}
   const entries=[...info.valid].filter(([id,g])=>inScope(g)),missing=entries.filter(([id])=>!D.parseBasis(info.ix.get(id).task,d,info.ix).ok).length;
   el('scope-count').textContent='Инженерно готовых мероприятий: '+entries.length+' · маршрутов: '+rows.size+(missing?' · '+missing+' без срока':'')+(result.ok?'':' · '+result.message);
   selectedService='';renderTable();
  }
  function refreshAdvanced(){
   const selected=new Set([...rows].filter(([,x])=>x.selected).map(([k])=>k)),groupEntries=[...info.valid].filter(([id,g])=>selected.has(g.key)),sv=new Map(groupEntries.map(([id,g])=>[g.serviceKey,g.serviceLabel]));
   const before=new Set([...dlg.querySelectorAll('[data-r5-task]:checked')].map(x=>x.dataset.r5Task));
   el('service').innerHTML=option('','Все виды')+[...sv].sort((a,b)=>a[1].localeCompare(b[1],'ru')).map(([k,v])=>option(k,v)).join('');
   el('service').value=sv.has(selectedService)?selectedService:'';selectedService=val('service');
   scopeRows=groupEntries.filter(([id,g])=>!selectedService||g.serviceKey===selectedService).map(([id,g])=>({id,g,c:info.ix.get(id)}));
   const ownership=global.LubricaRouteAutoGrouping.ownership(d),scopeOptions={lineId:val('line'),areaId:val('area'),groupKeys:[...selected]};
   let missing=0;const eligibleRows=scopeRows.map(row=>{const basis=D.parseBasis(row.c.task,d,info.ix),p=R.policy(row.c.task,d,info.ix),lock=!R.setupAllowed(d,row.id,scopeOptions,ownership,row.g),spec=global.LubricaRouteAutoGrouping.scheduleFor(row.c.task),limit=spec.kind==='runtime_hours'?0:Math.max(0,Math.min(90,spec.kind==='days'?spec.value-1:28*spec.value-1));if(!basis.ok)missing++;
    return '<label class="r5-task"><input type="checkbox" data-r5-task="'+esc(row.id)+'" data-early-limit="'+limit+'" data-locked="'+(lock?'1':'0')+'" '+(lock?'disabled':'')+'><span><b>'+esc([row.c.eq?.externalCode,row.c.eq?.name,row.c.lp?.name].filter(Boolean).join(' · '))+'</b><small>'+esc(row.g.serviceLabel+' · '+row.g.interval+' · '+row.id)+(p.access==='ppr'?' · ППР':'')+(basis.ok?'':' · нет срока')+(lock?' · защищено':'')+'</small></span></label>'});
   el('tasks').innerHTML=eligibleRows.join('')||'<small>Нет подходящих мероприятий.</small>';

   dlg.querySelectorAll('[data-r5-task]').forEach(x=>x.checked=!x.disabled&&before.has(x.dataset.r5Task));
   const meters=new Map(scopeRows.filter(x=>x.g.scheduleKey.startsWith('runtime_hours:')).map(x=>[String(x.c.eq.id),x.c.eq]));
   const prevMeter=val('meter-eq');el('meter-eq').innerHTML=option('','Не задавать показания')+[...meters].map(([k,e])=>option(k,[e.externalCode,e.name||k].filter(Boolean).join(' · '))).join('');if(meters.has(prevMeter))el('meter-eq').value=prevMeter;
   if(currentArea!==val('area')){currentArea=val('area');order=currentArea?R.equipmentOrder(d,currentArea).map(e=>String(e.id)):[];orderChanged=false;el('apply-order').checked=false}
   orderView();policyEnabled();
  }

  function policyEnabled(){const enabled=checked('policy-enabled');for(const n of ['access','early','early-reason','task-minutes','select-all','select-none'])el(n).disabled=!enabled;dlg.querySelectorAll('[data-r5-task]').forEach(x=>x.disabled=!enabled||x.dataset.locked==='1');policyCount()}
  function policyCount(){const all=[...dlg.querySelectorAll('[data-r5-task]:not(:disabled)')],positive=Number(val('early'))>0,days=Number(val('early')),bad=x=>positive&&Number(x.dataset.earlyLimit)<days,selected=all.filter(x=>x.checked),incompatible=selected.filter(bad);el('policy-count').textContent='Выбрано: '+selected.length+(incompatible.length?' · неподходящих для допуска: '+incompatible.length:'');el('policy-hint').textContent=positive?'Досрочный допуск применяется только к календарным мероприятиям с подходящим интервалом. '+(incompatible.length?'Нажмите «Выбрать подходящие», чтобы исключить неподходящие из выбора.':'Доступно для допуска: '+all.filter(x=>!bad(x)).length+'. Укажите основание.'):'Пустое поле дней не меняет допуск; 0 отменяет его. Для моточасов досрочность не применяется.';el('select-all').textContent=positive?'Выбрать подходящие':'Выбрать доступные'}
  const shift=delta=>{const i=el('order').selectedIndex,j=i+delta;if(i<0||j<0||j>=order.length)return;[order[i],order[j]]=[order[j],order[i]];orderChanged=true;orderView(j);invalidate()};

  function read(){
   // Read actual inputs as well, including date pickers that have not blurred.
   for(const card of dlg.querySelectorAll('[data-r8-row]')){const row=rows.get(card.dataset.r8Row);row.date=card.querySelector('[data-r8-date]')?.value||'';row.maxRate=card.querySelector('[data-r81-rate]')?.value||row.maxRate;}
   const batch=[...rows.values()].filter(x=>x.selected).map(x=>({key:x.g.key,pprMode:x.mode,cycleMode:x.cycle,initial:{mode:x.basis,date:x.date,...(x.g.scheduleKey.startsWith('runtime_hours:')?{planningMode:x.planning,maxHoursPerDay:x.maxRate,confirmCalendar:!!ui('[data-r81-confirm-calendar]')?.checked}: {})}}));
   if(!batch.length)throw Error('Выберите хотя бы один маршрут в таблице.');
   const o={lineId:val('line'),areaId:val('area'),batch,activateReady:true,recoverHistory:true,forecast:false};
   if(!advanced)return o;
   Object.assign(o,{serviceKey:val('service'),recoverHistory:checked('history'),activateReady:checked('activate'),applyOrder:checked('apply-order'),initial:{equipmentId:val('meter-eq'),lastHours:val('last-hours'),readingHours:val('reading-hours'),readingDate:val('reading-date'),hoursPerDay:val('rate'),confirmMeter:checked('confirm-meter')}});
   if(orderChanged)o.walkOrder=order.slice();
   if(o.applyOrder&&!o.areaId)throw Error('Для применения общего порядка выберите один участок.');
   const taskIds=[...dlg.querySelectorAll('[data-r5-task]:checked')].map(x=>x.dataset.r5Task);
   const p={taskIds,access:val('access'),earlyDays:val('early'),earlyReason:val('early-reason'),minutes:val('task-minutes')};
   if(checked('policy-enabled')&&(p.access||p.earlyDays!==''||p.minutes!=='')){if(!taskIds.length)throw Error('Выберите мероприятия для изменения условий.');if(p.earlyDays!==''&&(!Number.isInteger(Number(p.earlyDays))||Number(p.earlyDays)<0||Number(p.earlyDays)>90))throw Error('Укажите целое число дней от 0 до 90 или оставьте поле пустым.');if(Number(p.earlyDays)>0){if(!p.earlyReason.trim())throw Error('Укажите основание, разрешающее выполнять работы раньше срока, или очистите поле дней.');if([...dlg.querySelectorAll('[data-r5-task]:checked')].some(x=>Number(x.dataset.earlyLimit)<Number(p.earlyDays)))throw Error('Не все выбранные мероприятия допускают такое окно. В разделе «Условия» нажмите «Выбрать подходящие» или очистите поле дней.');}o.policy=p}
   if(checked('timing'))o.timing={minutes:val('service-minutes'),transitionMinutes:val('transition'),splitLargeJobs:checked('split'),balance:checked('balance')};

   return o;
  }
  const detailList=(heading,items,fn)=>items.length?'<details class="r5-result-detail"><summary>'+heading+' · '+items.length+'</summary><div class="r5-scroll">'+items.map(fn).join('')+'</div></details>':'';
  const item=(title,sub,more='')=>'<div class="r5-item"><div><b>'+esc(title)+'</b><small>'+esc(sub)+'</small></div>'+(more?'<strong>'+esc(more)+'</strong>':'')+'</div>';
  function pprResult(p){
   if(!p)return'';
   const rows=arr(p.dates),issues=rows.filter(x=>x.conflict);
   return '<section class="r5-ppr-result"><h4>ППР линии · каждые 14 дней</h4><p class="r5-note">Дата отсчёта: '+esc(p.anchor)+' · ближайший ППР: '+esc(p.firstPpr)+'</p>'+(issues.length?'<p class="r5-warning" role="status">Есть сроки, не совпадающие с допустимым ППР. Технический срок не изменён. Для переноса требуется согласование.</p>':'')+detailList('Сроки и возможные даты ППР',rows,x=>item((x.projected?'Прогноз следующего цикла: ':'Технический срок: ')+x.date,x.count+' меропр. · '+(x.suggested?'ППР '+x.suggested:'Нет даты ППР'),x.conflict?'Вне срока':'В допустимом окне'))+(p.unknown?'<p class="r5-note">Без подтверждённого срока или прогноза: '+p.unknown+'</p>':'')+(!p.capacityConfigured?'<p class="r5-note">График ППР сохранится отдельно. Перед назначением задания настройте рабочие дни и доступное время смен.</p>':'')+'</section>';
  }

  function renderResult(res){
   const g=res.report||{},sum=g.summary||{},prep=res.prep||{},f=res.forecast;
   const stats=(v,t)=>'<div><b>'+esc(v??0)+'</b><small>'+t+'</small></div>';
   if(!res.ok){el('report').innerHTML='<section class="r5-results"><h3>Нужно уточнить настройки</h3><p class="r5-warning" role="alert">'+esc(res.message||res.reason||'Не удалось проверить')+'</p>'+detailList('Подробнее',arr(res.details),x=>item(x.taskId||'Мероприятие',x.message||x.reason))+'<p class="r5-note">Ничего не записано. Исправьте настройки и повторите проверку.</p></section>';el('apply').disabled=true;return;}
   const label={create:'Создать',update:'Изменить',archive:'Архивировать',blocked:'Защищён / конфликт',none:'Без изменений'};
   const actionGroups=arr(g.groups).filter(x=>x.action!=='none');
   const plans=res.plan?.preview||res.plan||{};
   const allocation=res.allocation;
   if(!advanced){
    const draft=actionGroups.filter(x=>['create','update'].includes(x.action)&&x.nextStatus==='draft').length,diagnostics=res.diagnostics||{},excluded=arr(diagnostics.rows).filter(x=>['excluded','removed'].includes(x.outcome)).length,other=arr(diagnostics.rows).filter(x=>!['excluded','removed'].includes(x.outcome)).length,changed=(sum.create||0)+(sum.update||0)+(sum.archive||0),bases=arr(prep.changes).filter(x=>x.action==='basis'),pprChanges=arr(prep.changes).filter(x=>x.action==='ppr'||x.action==='cycle');
    const counts=[[sum.create,'Новых маршрутов'],[sum.update,'Обновить'],[sum.archive,'В архив'],[draft,'Из них без сроков'],[sum.blocked,'Защищено'],[excluded,'Не войдут в маршрут'],[other+arr(diagnostics.general).length,'Другие замечания'],[arr(diagnostics.missing).length,'В составе без срока'],[bases.length,'Сроков заполнено'],[pprChanges.length,'Режим / цикл']].filter(([v])=>v>0);
    el('report').innerHTML='<section class="r5-results"><h3>2. Результат проверки</h3><p class="r5-note">'+(changed||bases.length||pprChanges.length?'Проверьте изменения и сохраните маршруты.':'Новых изменений нет.')+'</p>'+
     (counts.length?'<div class="r5-summary r5-summary-simple">'+counts.map(([v,t])=>stats(v,t)).join('')+'</div>':'')+
     (draft?'<p class="r5-note">Маршруты без подтверждённых сроков будут черновиками. Настроить сроки можно позже.</p>':'')+
     (actionGroups.length?'<details class="r5-result-detail" open><summary>Что изменится · '+actionGroups.length+'</summary><div class="r5-scroll">'+actionGroups.map(x=>item(x.name,[x.pointCount+' точек',x.taskIds.length+' мероприятий',x.addTaskIds?.length?'Добавить '+x.addTaskIds.length:'',x.removeTaskIds?.length?'Убрать '+x.removeTaskIds.length:'',x.reason||'',['create','update'].includes(x.action)?(x.nextStatus==='active'?'Готов к планированию':'Черновик'):''].filter(Boolean).join(' · '),label[x.action])).join('')+'</div></details>':'')+
     detailList('Точный состав изменений',actionGroups.filter(x=>x.addTaskIds?.length||x.removeTaskIds?.length),x=>item(x.name,[x.addTaskIds?.length?'Добавить '+x.addTaskIds.join(', '):'',x.removeTaskIds?.length?'Убрать '+x.removeTaskIds.join(', '):''].filter(Boolean).join(' · ')))+
     diagnosticResult(res)+
     detailList('Даты и основания сроков',bases,x=>item(x.taskId,x.detail,x.value==null?'':String(x.value)))+pprResult(res.ppr)+arr(res.batchSchedules).map(x=>'<h4>'+esc(x.name)+'</h4>'+pprResult(x)).join('')+
     '<p class="r5-note">Это предварительный просмотр. Ручные и открытые задания защищены; точки смазки не удаляются.</p></section>';
    el('apply').disabled=!(changed||bases.length||pprChanges.length);return;
   }
   el('report').innerHTML='<section class="r5-results"><h3>Предварительный результат · ничего не записано</h3>'+
    '<div class="r5-summary">'+stats(sum.create,'Создать')+stats(sum.update,'Изменить')+stats(sum.archive,'Архивировать')+stats(sum.blocked,'Конфликты')+stats(arr(prep.changes).filter(x=>x.action==='basis').length,'Сроков заполнено')+stats(res.plan?.created,'Новых заданий')+'</div>'+
    detailList('Состав и изменения',actionGroups,x=>item(x.name,(x.addTaskIds?.length?'Добавить '+x.addTaskIds.join(', ')+' · ':'')+(x.removeTaskIds?.length?'Убрать '+x.removeTaskIds.join(', ')+' · ':'')+(x.basisMissing?.length?'Нет сроков: '+x.basisMissing.length+' · ':'')+(x.reason||'')+(x.action==='create'||x.action==='update'?' · '+(x.nextStatus==='active'?'активный':'черновик'):''),label[x.action]))+
    detailList('Сроки и условия',arr(prep.changes),x=>item(x.taskId,x.detail,x.value==null?'':String(x.value)))+pprResult(res.ppr)+arr(res.batchSchedules).map(x=>'<h4>'+esc(x.name)+'</h4>'+pprResult(x)).join('')+
    diagnosticResult(res)+detailList('Замечания формирования заданий',arr(plans.warnings),x=>item(x.taskId||x.routeId||x.code||'Проверка',x.message||x.reason))+
    detailList('Предлагаемые задания',arr(plans.items),x=>item(x.routeName,x.plannedDate+' · '+x.taskIds.length+' меропр. · '+min(x.plannedMinutes)+(x.access==='ppr'?' · только ППР':'')+(x.runtimeForecast?' · прогноз':'')+(x.earliestDate?' · допустимо с '+x.earliestDate:'')))+
    detailList('Материалы и готовность подготовки',arr(res.preparation),x=>item(x.routeName,x.text,x.ready?'Готово':'Требует проверки'))+
    (allocation?.ok?'<p class="r5-note">Назначено: '+allocation.summary.assigned+' · позднее срока: '+allocation.summary.delayed+' · без назначения: '+allocation.summary.unassigned+'</p>'+detailList('Рабочие назначения',allocation.proposals,x=>item(x.routeName,'Техническая дата '+x.technicalDate+' · '+min(x.minutes)+' · '+x.reason,x.date+' / смена '+x.shiftId))+detailList('Не распределены',allocation.remaining,x=>item(x.routeName,x.reason,x.plannedDate)): '')+
    (f?.ok?'<details class="r5-result-detail" open><summary>Прогноз технической нагрузки · '+f.weeks.length+' недель</summary><p class="r5-note">Гипотетические повторы при выполнении работ по срокам, без изменения плана. Моточасы — прогноз. ППР и доступность требуют проверки.</p><div class="r5-forecast">'+f.weeks.map(w=>{const cap=w.capacity,ratio=cap?Math.min(100,w.minutes/cap*100):0;return '<div class="r5-forecast-row"><b>'+esc(w.startDate.slice(5))+' — '+esc(w.endDate.slice(5))+'</b><div class="r5-bar"><i style="width:'+ratio+'%" class="'+(w.overloadMinutes?'over':'')+'"></i></div><small>'+min(w.minutes)+(cap!=null?' / '+min(cap):'')+(w.pprConflicts?' · конфликтов ППР '+w.pprConflicts:'')+'</small></div>'}).join('')+'</div>'+detailList('Без надёжного прогноза',f.unknown,x=>item(x.taskId||x.routeId||'—',x.message))+'</details>':'')+
    '<p class="r5-note">Подтверждение изменяет только указанные настройки, свободные автомаршруты и новые задания. Ни одна точка смазки не удаляется.</p></section>';
   el('apply').disabled=!res.ok;
  }

  el('close').onclick=el('cancel').onclick=()=>dlg.close();
  el('advanced').onclick=()=>{advanced=!advanced;ui('.r5-shell').classList.toggle('r5-simple',!advanced);ui('.r5-advanced-fields').hidden=!advanced;dlg.querySelectorAll('.r5-advanced-field').forEach(x=>x.hidden=!advanced);el('advanced').textContent=advanced?'Скрыть инженерные настройки ▴':'Инженерные настройки ▾';el('advanced').setAttribute('aria-expanded',String(advanced));if(advanced)refreshAdvanced();invalidate()};
  el('line').onchange=()=>refreshScope(true);el('area').onchange=()=>refreshScope();
  ui('[data-r8-select-all]').onclick=()=>{for(const x of rows.values())x.selected=!x.g.locked;renderTable()};
  ui('[data-r8-select-none]').onclick=()=>{for(const x of rows.values())x.selected=false;renderTable()};
  ui('[data-r8-use-date]').onclick=()=>{const date=ui('[data-r8-bulk-date]').value,basis=ui('[data-r8-bulk-basis]').value;for(const x of rows.values())if(x.selected&&(!x.g.scheduleKey.startsWith('runtime_hours:')||x.planning==='calendar_runtime')){x.basis=basis;x.date=date}renderTable()};
  ui('[data-r8-settings]').onclick=()=>{const target=document.getElementById('routePlanningDialog');if(!target||!global.LubricaRouteWorkloadUI)return;const saved={line:val('line'),area:val('area'),rows:[...rows].map(([k,r])=>[k,{selected:r.selected,mode:r.mode,cycle:r.cycle,basis:r.basis,date:r.date,planning:r.planning,maxRate:r.maxRate}])};dlg.close();global.LubricaRouteWorkloadUI.open(target,{settingsOnly:true,onBack:()=>{target.close();open(view,dlg,{onApplied,resume:saved})}})};
  el('policy-enabled').onchange=()=>{policyEnabled();invalidate()};el('service').onchange=()=>{selectedService=val('service');refreshAdvanced();invalidate()};
  el('up').onclick=()=>shift(-1);el('down').onclick=()=>shift(1);
  el('select-all').onclick=()=>{const days=Number(val('early'));dlg.querySelectorAll('[data-r5-task]:not(:disabled)').forEach(x=>x.checked=!(days>0&&Number(x.dataset.earlyLimit)<days));policyCount();invalidate()};
  el('select-none').onclick=()=>{dlg.querySelectorAll('[data-r5-task]').forEach(x=>x.checked=false);policyCount();invalidate()};
  dlg.oninput=e=>{if(!ui('.r5-shell')){dlg.oninput=null;return}if(e.target.matches('[data-r8-date]')){const row=rows.get(e.target.closest('[data-r8-row]')?.dataset.r8Row);if(row)row.date=e.target.value}if(e.target.matches('[data-r5-task],[data-r5="early"],[data-r5="early-reason"]'))policyCount();if(e.target.matches('input,select')&&!e.target.matches('[data-r5="order"]'))invalidate()};
  el('preview').onclick=()=>{try{const options=read(),result=R.preview(options);report=result.ok?{options,token:result.token}:null;renderResult(result);el('report').scrollIntoView({block:'nearest'})}catch(e){report=null;renderResult({ok:false,message:e.message||String(e)})}};
  el('apply').onclick=()=>{if(!report)return;try{const result=R.apply(report.options,report.token);if(!result.ok){report=null;renderResult(result);return}dlg.close();onApplied?.(result);global.LubricaApp?.showToast?.('Выбранные маршруты сохранены')}catch(e){report=null;renderResult({ok:false,message:e.message||String(e)})}};
  if(resume)el('line').value=resume.line;refreshScope(true);if(bulk)ui('[data-r8-select-all]').click();if(!dlg.open)dlg.showModal();
 }
 global.LubricaRouteAutomationUI=Object.freeze({open,diagnosticResult});
})(window);
