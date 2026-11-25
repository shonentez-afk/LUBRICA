"use strict";
/* Single master: scope -> missing basis -> walk/access/time -> calendar -> preview.
   No form change writes the database. Existing simple wizard remains available. */
(function(global){
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const arr=x=>Array.isArray(x)?x:[],str=x=>String(x??''),db=()=>global.LubricaCore?.State?.getDatabase?.();
 const date=v=>esc(v||''),option=(v,t)=>'<option value="'+esc(v)+'">'+esc(t)+'</option>';
 const min=v=>v==null?'не задано':Math.floor(v/60)+' ч '+Math.round(v%60)+' мин';
 const checkbox=(name,label,checked=false)=>'<label class="r5-check"><input type="checkbox" data-r5="'+name+'" '+(checked?'checked':'')+'>'+label+'</label>';
 const input=(name,label,type='text',v='',extra='')=>'<label>'+label+'<input data-r5="'+name+'" type="'+type+'" value="'+esc(v)+'" '+extra+'></label>';
 function open(view,dlg,{onQuick,onApplied}={}){
  const R=global.LubricaRouteAutomation,W=global.LubricaRouteWorkload,D=global.LubricaRouteDue,E=global.LubricaRouteEngine,d=db();
  if(!R||!W||!D||!E||!d||!dlg)return;
  const info=R.eligible(d),cfg=W.settings(d),auto=R.config(d),lines=arr(d.lines),areas=arr(d.areas),period=W.rangeFor('week');
  let report=null,order=[],orderChanged=false,currentArea='',selectedService='',scopeRows=[];
  const el=n=>dlg.querySelector('[data-r5="'+n+'"]'),val=n=>el(n)?.value||'',checked=n=>!!el(n)?.checked;
  const shiftRows=[1,2,3].map(i=>{const s=cfg?.shifts.find(x=>x.id===String(i));return '<div class="r5-shift"><b>Смена '+i+(i===1?' / дневная':'')+'</b>'+input('workers-'+i,'Смазчиков','number',s?.workers||1,'min="1" max="100" step="1"')+input('minutes-'+i,'Минут на одного','number',s?.minutesPerWorker??'','min="0" max="1440" step="1" placeholder="0 — отключена"')+(s?.legacyAggregate?'<small>Уточните прежний суммарный ресурс.</small>':'')+'</div>'}).join('');
  dlg.innerHTML='<div class="r5-shell"><div class="dialog-head"><div><span class="eyebrow">LUBRICA · МАСТЕР МАРШРУТОВ</span><h2>От карты смазки до рабочего задания</h2><p class="dialog-copy">Участок + один вид обслуживания + одна периодичность. Сначала проверьте предложения, затем подтвердите единую запись. Открытые задания, ручные маршруты и история защищены.</p></div><button class="icon-btn" type="button" data-r5="close">×</button></div>'+
   '<div class="r5-body"><section class="r5-section"><h3>1. Охват и состав</h3><div class="r5-grid"><label>Линия<select data-r5="line">'+option('','Все линии')+lines.map(l=>option(l.id,l.name||l.id)).join('')+'</select></label><label>Участок<select data-r5="area"></select></label><label>Вид для настройки сроков и условий<select data-r5="service"></select></label></div><small>Маршруты сверяются по всему выбранному участку; фильтр вида применяется только к массовой настройке. Периодичность и нормы смазки не изменяются.</small><p class="r5-note" data-r5="scope-count"></p>'+checkbox('activate','Активировать готовые автомаршруты (только при наличии всех исходных сроков)',true)+'</section>'+
   '<details class="r5-section" open><summary>2. Первоначальные сроки и подтверждённая история</summary><div class="r5-inner">'+checkbox('history','Восстановить отсутствующие сроки по подтверждённым выполненным мероприятиям',true)+'<small>Только точное совпадение точки, вида и интервала. Заполненные сроки не заменяются; пропуски и отмены не считаются выполнением.</small>'+
   '<div class="r5-grid"><label>Календарное основание<select data-r5="initial-mode">'+option('next','Следующая дата')+option('last','Дата последнего обслуживания')+'</select></label>'+input('initial-date','Дата (необязательно)','date')+'</div><small>Если указана дата, она применяется ко всем отсутствующим календарным срокам выбранного охвата и вида. Не вводите приблизительную историю.</small>'+
   '<details><summary>Моточасы общего счётчика оборудования</summary><div class="r5-inner"><label>Оборудование<select data-r5="meter-eq"></select></label><div class="r5-grid">'+input('last-hours','Моточасы последнего обслуживания','number','','min="0" step="any"')+input('reading-hours','Фактическое показание','number','','min="0" step="any"')+input('reading-date','Дата показания','date')+input('rate','Прогноз, ч/сут (необязательно)','number','','min="0" max="24" step="any"')+'</div>'+checkbox('confirm-meter','Подтверждаю общий счётчик и основание последнего обслуживания для выбранных мероприятий')+'<small>Порог вычисляется как факт последнего обслуживания + индивидуальный интервал. Прогноз не разрешает запуск.</small></div></details></div></details>'+
   '<details class="r5-section"><summary>3. Общий порядок обхода участка</summary><div class="r5-inner"><p class="r5-note">Выберите один участок, затем задайте порядок оборудования. Новые маршруты его наследуют; применение к существующим — отдельное подтверждение.</p><div class="r5-order"><select data-r5="order" size="6"></select><div><button type="button" class="btn secondary" data-r5="up">↑ Выше</button><button type="button" class="btn secondary" data-r5="down">↓ Ниже</button></div></div>'+checkbox('apply-order','Применить порядок ко всем свободным автомаршрутам выбранного участка')+'</div></details>'+
   '<details class="r5-section"><summary>4. Условия доступа, допустимые сроки и трудоёмкость</summary><div class="r5-inner"><p class="r5-note">Выберите конкретные мероприятия. ППР — условие доступа к точке, а не новый тип постоянного маршрута.</p><div class="r5-grid"><label>Доступ<select data-r5="access">'+option('','Без изменения')+option('ppr','Только ППР своей линии')+option('normal','Обычный доступ')+'</select></label>'+input('early','Разрешённое досрочное окно, дней','number','','min="0" max="90" step="1"')+input('early-reason','Инженерное основание досрочного окна')+input('task-minutes','Минут на мероприятие (0 — по виду)','number','','min="0" max="1440" step="any"')+'</div><div class="r5-select-tools"><button type="button" class="btn secondary" data-r5="select-all">Выбрать доступные</button><button type="button" class="btn ghost" data-r5="select-none">Снять выбор</button><small data-r5="policy-count"></small></div><div class="r5-task-list" data-r5="tasks"></div>'+
   '<hr>'+checkbox('timing','Изменить настройки трудоёмкости и распределения')+'<div class="r5-grid">'+input('service-minutes','Минут по выбранному виду','number','','min="0.1" max="1440" step="any" placeholder="без изменения"')+input('transition','Минут между оборудованием','number',auto.transitionMinutes,'min="0" max="120" step="any"')+'</div>'+checkbox('split','Разделять новые большие задания по физическим точкам',auto.splitLargeJobs)+checkbox('balance','Выравнивать нагрузку в разрешённых окнах',auto.balance)+'<small>Без дробления мероприятия. Нормативы времени задаёт предприятие; при отсутствии используется прежнее значение маршрута. Досрочность не разрешается по моточасам.</small></div></details>'+
   '<details class="r5-section"><summary>5. Рабочие дни, численность смен и ППР</summary><div class="r5-inner">'+checkbox('workload','Изменить рабочий график и ППР в этой транзакции')+'<div class="r5-weekdays">'+['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((t,i)=>checkbox('weekday-'+(i+1),t,(cfg?.weekdays||[1,2,3,4,5]).includes(i+1))).join('')+'</div><div class="r5-grid">'+shiftRows+'</div><small>Для дневного смазчика заполните только первую смену. Укажите чистое время одного человека, не длину смены. Подтвердите рабочие дни.</small><h4>ППР каждой линии · раз в 14 дней</h4><div class="r5-grid">'+lines.map((l,i)=>input('ppr-'+i,esc(l.name||l.id),'date',cfg?.ppr.find(x=>x.lineId===String(l.id))?.anchorDate||'')).join('')+'</div><small>Старые маршрутные ограничения ППР сохраняются; новые можно задать для отдельных мероприятий выше.</small></div></details>'+
   '<details class="r5-section" open><summary>6. План и распределение</summary><div class="r5-inner">'+checkbox('plan','Сформировать план только для готовых автомаршрутов выбранного охвата')+'<div class="r5-grid">'+input('start','Начало','date',period.startDate)+input('end','Окончание','date',period.endDate)+'<label>Прогноз нагрузки<select data-r5="forecast-weeks">'+[4,12,26,52].map(n=>option(n,n+' нед.')).join('')+'</select></label></div>'+checkbox('allocate','Распределить новые и свободные задания по рабочим дням/сменам')+checkbox('delay','Разрешить перенос позднее исходного планового дня')+input('delay-reason','Причина согласованного переноса')+'<small>Исходный срок остаётся неизменным. Прогноз будущих повторов — только оценка, без фиктивных заданий.</small></div></details>'+
   '<div class="r5-report" data-r5="report"><p class="r5-note">Укажите необходимые параметры и нажмите «Проверить и рассчитать».</p></div></div>'+
   '<menu><button type="button" class="btn ghost" data-r5="quick">Быстрое создание</button><button type="button" class="btn secondary" data-r5="preview">Проверить и рассчитать</button><button type="button" class="btn primary" data-r5="apply" disabled>Подтвердить изменения</button></menu></div>';
  el('forecast-weeks').value='12';
  const invalidate=()=>{report=null;el('apply').disabled=true;el('report').innerHTML='<p class="r5-note">Параметры изменены. Повторите предварительный просмотр.</p>'};
  function inScope(g){return (!val('line')||String(g.lineId)===val('line'))&&(!val('area')||String(g.areaId)===val('area'))}
  function orderView(index=0){
   const eqs=new Map(arr(d.equipment).map(x=>[String(x.id),x]));
   el('order').innerHTML=order.map(id=>{const e=eqs.get(id);return option(id,[e?.externalCode,e?.name||id].filter(Boolean).join(' · '))}).join('');
   if(order.length)el('order').selectedIndex=Math.max(0,Math.min(index,order.length-1));
   el('up').disabled=el('down').disabled=!order.length;
  }
  function refreshScope(resetAreas=false){
   if(resetAreas){const a=val('area');el('area').innerHTML=option('','Все участки')+areas.filter(x=>!val('line')||String(x.lineId)===val('line')).map(x=>option(x.id,x.name||x.id)).join('');if([...el('area').options].some(x=>x.value===a))el('area').value=a}
   const entries=[...info.valid].filter(([id,g])=>inScope(g)),sv=new Map(entries.map(([id,g])=>[g.serviceKey,g.serviceLabel]));
   const old=selectedService||val('service');el('service').innerHTML=option('','Все виды')+[...sv].sort((a,b)=>a[1].localeCompare(b[1],'ru')).map(([k,v])=>option(k,v)).join('');
   el('service').value=sv.has(old)?old:'';selectedService=val('service');
   scopeRows=entries.filter(([id,g])=>!selectedService||g.serviceKey===selectedService).map(([id,g])=>({id,g,c:info.ix.get(id)}));
   const owners=new Set(arr(d.routes).filter(r=>r.status!=='archived'&&(r.source!=='auto'||!D.typed(r))).flatMap(r=>arr(r.taskIds).map(String))),reserved=new Set([...arr(d.routePlanItems).filter(x=>['planned','in_progress'].includes(x.status)).flatMap(x=>arr(x.taskIds).map(String)),...arr(d.checklistRuns).filter(x=>x.status==='in_progress').flatMap(x=>arr(x.routeTaskIds).map(String))]);
   let missing=0;const eligibleRows=scopeRows.map(row=>{const basis=D.parseBasis(row.c.task,d,info.ix),p=R.policy(row.c.task,d,info.ix),lock=owners.has(row.id)||reserved.has(row.id);if(!basis.ok)missing++;
    return '<label class="r5-task"><input type="checkbox" data-r5-task="'+esc(row.id)+'" '+(lock?'disabled':'')+'><span><b>'+esc([row.c.eq?.externalCode,row.c.eq?.name,row.c.lp?.name].filter(Boolean).join(' · '))+'</b><small>'+esc(row.g.serviceLabel+' · '+row.g.interval+' · '+row.id)+(p.access==='ppr'?' · ППР':'')+(basis.ok?'':' · нет срока')+(lock?' · защищено':'')+'</small></span></label>'});
   el('tasks').innerHTML=eligibleRows.join('')||'<small>Нет подходящих мероприятий.</small>';
   el('scope-count').textContent=entries.length+' инженерно готовых мероприятий в охвате; '+scopeRows.length+' в выбранном виде; '+missing+' без исходного срока.';
   const meters=new Map(scopeRows.filter(x=>x.g.scheduleKey.startsWith('runtime_hours:')).map(x=>[String(x.c.eq.id),x.c.eq]));
   const prevMeter=val('meter-eq');el('meter-eq').innerHTML=option('','Не задавать показания')+[...meters].map(([k,e])=>option(k,[e.externalCode,e.name||k].filter(Boolean).join(' · '))).join('');if(meters.has(prevMeter))el('meter-eq').value=prevMeter;
   if(currentArea!==val('area')){currentArea=val('area');order=currentArea?R.equipmentOrder(d,currentArea).map(e=>String(e.id)):[];orderChanged=false;el('apply-order').checked=false}
   orderView();policyCount();
  }
  function policyCount(){el('policy-count').textContent='Выбрано: '+dlg.querySelectorAll('[data-r5-task]:checked').length}
  const shift=delta=>{const i=el('order').selectedIndex,j=i+delta;if(i<0||j<0||j>=order.length)return;[order[i],order[j]]=[order[j],order[i]];orderChanged=true;orderView(j);invalidate()};
  function read(){
   const o={lineId:val('line'),areaId:val('area'),serviceKey:val('service'),recoverHistory:checked('history'),activateReady:checked('activate'),applyOrder:checked('apply-order'),plan:checked('plan'),allocate:checked('allocate'),allowDelay:checked('delay'),delayReason:val('delay-reason'),startDate:val('start'),endDate:val('end'),forecastWeeks:Number(val('forecast-weeks')),
    initial:{mode:val('initial-mode'),date:val('initial-date'),equipmentId:val('meter-eq'),lastHours:val('last-hours'),readingHours:val('reading-hours'),readingDate:val('reading-date'),hoursPerDay:val('rate'),confirmMeter:checked('confirm-meter')}};
   if(orderChanged)o.walkOrder=order.slice();
   if(o.applyOrder&&!o.areaId)throw Error('Для применения общего порядка выберите один участок.');
   const taskIds=[...dlg.querySelectorAll('[data-r5-task]:checked')].map(x=>x.dataset.r5Task);
   const p={taskIds,access:val('access'),earlyDays:val('early'),earlyReason:val('early-reason'),minutes:val('task-minutes')};
   if(p.access||p.earlyDays!==''||p.minutes!==''){if(!taskIds.length)throw Error('Выберите мероприятия для изменения условий.');o.policy=p}
   if(checked('timing'))o.timing={minutes:val('service-minutes'),transitionMinutes:val('transition'),splitLargeJobs:checked('split'),balance:checked('balance')};
   if(checked('workload')){
    const weekdays=[1,2,3,4,5,6,7].filter(i=>checked('weekday-'+i)),shifts=[];
    for(const i of [1,2,3]){const v=val('minutes-'+i);if(v!==''&&(!Number.isInteger(Number(v))||Number(v)<0||Number(v)>1440))throw Error('Проверьте минуты каждой смены.');if(Number(v)>0)shifts.push({id:String(i),workers:Number(val('workers-'+i)),minutesPerWorker:Number(v)})}
    o.workloadSettings={weekdays,shifts,ppr:lines.map((l,i)=>({lineId:String(l.id),anchorDate:val('ppr-'+i)})).filter(x=>x.anchorDate),pprRouteIds:cfg?.pprRouteIds||[]};
   }
   if(o.allocate&&!o.plan)throw Error('Для распределения включите формирование плана.');
   return o;
  }
  const detailList=(heading,items,fn)=>items.length?'<details class="r5-result-detail"><summary>'+heading+' · '+items.length+'</summary><div class="r5-scroll">'+items.map(fn).join('')+'</div></details>':'';
  const item=(title,sub,more='')=>'<div class="r5-item"><div><b>'+esc(title)+'</b><small>'+esc(sub)+'</small></div>'+(more?'<strong>'+esc(more)+'</strong>':'')+'</div>';
  function renderResult(res){
   const g=res.report||{},sum=g.summary||{},prep=res.prep||{},f=res.forecast;
   const stats=(v,t)=>'<div><b>'+esc(v??0)+'</b><small>'+t+'</small></div>';
   const errors=!res.ok?'<p class="r5-warning" role="alert">'+esc(res.message||res.reason||'Не удалось проверить')+'</p>':'';
   const label={create:'Создать',update:'Изменить',archive:'Архивировать',blocked:'Защищён / конфликт',none:'Без изменений'};
   const actionGroups=arr(g.groups).filter(x=>x.action!=='none');
   const plans=res.plan?.preview||res.plan||{};
   const allocation=res.allocation;
   el('report').innerHTML='<section class="r5-results"><h3>Предварительный результат · ничего не записано</h3>'+errors+
    '<div class="r5-summary">'+stats(sum.create,'Создать')+stats(sum.update,'Изменить')+stats(sum.archive,'Архивировать')+stats(sum.blocked,'Конфликты')+stats(arr(prep.changes).filter(x=>x.action==='basis').length,'Сроков заполнено')+stats(res.plan?.created,'Новых заданий')+'</div>'+
    detailList('Состав и изменения',actionGroups,x=>item(x.name,(x.addTaskIds?.length?'Добавить '+x.addTaskIds.join(', ')+' · ':'')+(x.removeTaskIds?.length?'Убрать '+x.removeTaskIds.join(', ')+' · ':'')+(x.basisMissing?.length?'Нет сроков: '+x.basisMissing.length+' · ':'')+(x.reason||'')+(x.action==='create'||x.action==='update'?' · '+(x.nextStatus==='active'?'активный':'черновик'):''),label[x.action]))+
    detailList('Сроки и условия',arr(prep.changes),x=>item(x.taskId,x.detail,x.value==null?'':String(x.value)))+
    detailList('Исключения и замечания',[...arr(g.issues),...arr(prep.issues),...arr(plans.warnings)],x=>item(x.taskId||x.routeId||x.code||'Проверка',x.message||x.reason))+
    detailList('Предлагаемые задания',arr(plans.items),x=>item(x.routeName,x.plannedDate+' · '+x.taskIds.length+' меропр. · '+min(x.plannedMinutes)+(x.access==='ppr'?' · только ППР':'')+(x.runtimeForecast?' · прогноз':'')+(x.earliestDate?' · допустимо с '+x.earliestDate:'')))+
    detailList('Материалы и готовность подготовки',arr(res.preparation),x=>item(x.routeName,x.text,x.ready?'Готово':'Требует проверки'))+
    (allocation?.ok?'<p class="r5-note">Назначено: '+allocation.summary.assigned+' · позднее срока: '+allocation.summary.delayed+' · без назначения: '+allocation.summary.unassigned+'</p>'+detailList('Рабочие назначения',allocation.proposals,x=>item(x.routeName,'Техническая дата '+x.technicalDate+' · '+min(x.minutes)+' · '+x.reason,x.date+' / смена '+x.shiftId))+detailList('Не распределены',allocation.remaining,x=>item(x.routeName,x.reason,x.plannedDate)): '')+
    (f?.ok?'<details class="r5-result-detail" open><summary>Прогноз технической нагрузки · '+f.weeks.length+' недель</summary><p class="r5-note">Гипотетические повторы при выполнении работ по срокам, без изменения плана. Моточасы — прогноз. ППР и доступность требуют проверки.</p><div class="r5-forecast">'+f.weeks.map(w=>{const cap=w.capacity,ratio=cap?Math.min(100,w.minutes/cap*100):0;return '<div class="r5-forecast-row"><b>'+esc(w.startDate.slice(5))+' — '+esc(w.endDate.slice(5))+'</b><div class="r5-bar"><i style="width:'+ratio+'%" class="'+(w.overloadMinutes?'over':'')+'"></i></div><small>'+min(w.minutes)+(cap!=null?' / '+min(cap):'')+(w.pprConflicts?' · конфликтов ППР '+w.pprConflicts:'')+'</small></div>'}).join('')+'</div>'+detailList('Без надёжного прогноза',f.unknown,x=>item(x.taskId||x.routeId||'—',x.message))+'</details>':'')+
    '<p class="r5-note">Подтверждение изменяет только указанные настройки, свободные автомаршруты и новые задания. Ни одна точка смазки не удаляется.</p></section>';
   el('apply').disabled=!res.ok;
  }
  el('close').onclick=()=>dlg.close();
  el('quick').onclick=()=>onQuick?.();
  el('line').onchange=()=>{selectedService='';refreshScope(true);invalidate()};
  el('area').onchange=()=>{selectedService='';refreshScope();invalidate()};
  el('service').onchange=()=>{selectedService=val('service');refreshScope();invalidate()};
  el('up').onclick=()=>shift(-1);el('down').onclick=()=>shift(1);
  el('select-all').onclick=()=>{dlg.querySelectorAll('[data-r5-task]:not(:disabled)').forEach(x=>x.checked=true);policyCount();invalidate()};
  el('select-none').onclick=()=>{dlg.querySelectorAll('[data-r5-task]').forEach(x=>x.checked=false);policyCount();invalidate()};
  dlg.oninput=e=>{if(!dlg.querySelector('.r5-shell')){dlg.oninput=null;return}if(e.target.matches('[data-r5-task]'))policyCount();if(e.target.matches('input,select')&&!e.target.matches('[data-r5="order"]'))invalidate()};
  el('preview').onclick=()=>{try{const options=read(),result=R.preview(options);report=result.ok?{options,token:result.token}:null;renderResult(result);el('report').scrollIntoView({block:'nearest'})}catch(e){renderResult({ok:false,message:e.message||String(e)})}};
  el('apply').onclick=()=>{if(!report)return;try{const result=R.apply(report.options,report.token);if(!result.ok){report=null;renderResult(result);return}dlg.close();onApplied?.(result);global.LubricaApp?.showToast?.('Мастер маршрутов: подтверждённые изменения сохранены')}catch(e){report=null;renderResult({ok:false,message:e.message||String(e)})}};
  refreshScope(true);if(!dlg.open)dlg.showModal();
 }
 global.LubricaRouteAutomationUI=Object.freeze({open});
})(window);
