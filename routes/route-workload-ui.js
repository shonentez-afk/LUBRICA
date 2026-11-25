"use strict";
/* R4 — day/shift workload and line-specific 14-day PPR calendar,
   shown inside the existing planning dialog. */
(function(global){
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const fmt=v=>{if(v==null)return'не задано';const n=Math.max(0,Math.round(Number(v)||0));return n>=60?Math.floor(n/60)+' ч '+(n%60?n%60+' мин':''):n+' мин'};
 const labels=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
 const displayDate=s=>{const d=new Date(s+'T00:00:00Z');return Number.isNaN(d.getTime())?s:d.toLocaleDateString('ru-RU',{day:'numeric',month:'short',weekday:'short',timeZone:'UTC'})};
 function open(dlg,{startDate,endDate,onBack}={}){
  const E=global.LubricaRouteWorkload;if(!dlg||!E)return;
  let range={startDate:startDate||E.today(),endDate:endDate||E.today()},report=null,manualId='',allowDelay=false,delayReason='',notice='',settingsOpen=!E.settings(),mode='custom';
  const db=()=>global.LubricaCore?.State?.getDatabase?.();
  const options=()=>({...range,allowDelay,reason:delayReason});
  const rows=L=>[...L.unassigned,...L.days.flatMap(b=>[...b.slots.flatMap(s=>s.jobs),...b.unknownJobs])];
  const switchRange=kind=>{range=E.rangeFor(kind,range.startDate);mode=kind;report=null;manualId='';notice='';render()};
  function jobCard(row,d){
   const x=row.item,a=row.a,tech=E.technicalDate(x),ppr=E.pprOnly(x,d),late=(a?.date||row.date)>tech;
   const next=ppr&&!a?E.nextPpr(E.lineFor(x,d),[row.date,E.today()].sort().at(-1),d):'';
   return '<div class="rw-job"><div><b>'+esc(x.routeCode||x.id)+' · '+esc(x.routeName||x.routeId)+'</b><small>'+esc(x.line||'')+(x.area?' / '+esc(x.area):'')+' · '+fmt(row.minutes)+' · '+(x.taskIds?.length||0)+' меропр.</small><small>Срок: '+esc(tech)+(x.runtimeForecast?' (прогноз)':'')+(late?' · после срока':'')+(ppr?' · только ППР':'')+(next?' · ближайший ППР '+esc(next):'')+'</small></div>'+
   (row.fixed?'<span class="rw-status">'+esc(row.status==='completed'?'Выполнено':row.status==='in_progress'?'В работе':'Зафиксировано')+'</span>':'<button type="button" class="btn ghost" data-rw-move="'+esc(x.id)+'">'+(a?'Перенести':'Назначить')+'</button>')+'</div>';
  }
  function render(){
   const d=db(),L=E.load(range,d),cfg=E.settings(d),good=L.ok,days=good?L.days:[],tot=good?L.totals:{capacity:0,assignedMinutes:0,unassigned:0,unassignedMinutes:0,overloadMinutes:0,unknownJobs:0,pprConflicts:0};
   const row=good?rows(L).find(x=>String(x.item.id)===manualId):null;
   const storedDays=cfg?.weekdays||[1,2,3,4,5],lines=(d?.lines||[]),routes=(d?.routes||[]).filter(r=>r.status!=='archived');
   const stat=(name,value)=>'<div><b>'+esc(value)+'</b><small>'+name+'</small></div>';
   const status=notice?'<p class="rw-notice" role="status">'+esc(notice)+'</p>':'';
   const next=row&&E.pprOnly(row.item,d)?E.nextPpr(E.lineFor(row.item,d),[row.date||E.today(),E.today()].sort().at(-1),d):'';
   const manual=row?'<section class="rw-manual"><h3>Назначение задания</h3>'+jobCard(row,d)+'<div class="rw-fields"><label>Рабочий день<input type="date" data-rw-move-date value="'+esc([row.date||E.today(),E.today()].sort().at(-1))+'"></label><label>Смена<select data-rw-move-shift>'+((cfg?.shifts||[]).map(s=>'<option value="'+s.id+'" '+(row.a?.shiftId===s.id?'selected':'')+'>Смена '+s.id+'</option>').join(''))+'</select></label><label>Причина переноса / снятия назначения<input data-rw-move-reason placeholder="Причина изменения"></label></div>'+(next?'<p class="rw-note">Ближайший расчётный ППР своей линии: <b>'+esc(next)+'</b>. Перенос позже исходной даты требует причины.</p>':'')+'<p data-rw-move-error class="rw-warning" role="alert"></p><div class="rw-actions"><button type="button" class="btn primary" data-rw-save-move>Сохранить назначение</button>'+(row.a?'<button type="button" class="btn secondary" data-rw-clear-move>Снять назначение</button>':'')+'<button type="button" class="btn ghost" data-rw-cancel-move>Закрыть</button></div></section>':'';
   const previews=report?.ok?'<section class="rw-preview"><h3>Предварительное распределение · не сохранено</h3><p>'+report.summary.assigned+' назначений · '+report.summary.delayed+' переносов · '+fmt(report.summary.minutes)+' · '+report.summary.unassigned+' не распределено</p><div class="rw-proposals">'+report.proposals.map(x=>'<div class="rw-proposal"><div><b>'+esc(x.routeName)+'</b><small>Исходный день: '+esc(x.plannedDate)+' · срок '+esc(x.technicalDate)+' · '+fmt(x.minutes)+(x.delayDays?' · перенос на '+x.delayDays+' дн.':'')+'</small></div><strong>'+esc(x.date)+' · смена '+esc(x.shiftId)+(x.pprOnly?' · ППР':'')+'</strong></div>').join('')+report.remaining.map(x=>'<div class="rw-proposal rw-unplaced"><div><b>'+esc(x.routeName)+'</b><small>'+esc(x.plannedDate)+' · '+fmt(x.minutes)+'</small></div><strong>'+esc(x.reason)+'</strong></div>').join('')+'</div><button type="button" class="btn primary" data-rw-apply '+(report.proposals.length?'':'disabled')+'>Подтвердить распределение</button></section>':report&&!report.ok?'<p class="rw-warning">'+esc(report.message)+'</p>':'';
   const calendar=days.map(b=>'<article data-rw-day="'+esc(b.date)+'" class="rw-day '+(b.overloadMinutes||b.unknownJobs.length||b.pprConflicts.length?'warn':!b.working?'nonwork':'')+'"><header><b>'+esc(displayDate(b.date))+'</b><small>'+fmt(b.assignedMinutes)+' / '+fmt(b.capacity)+(b.working?'':' · нерабочий день')+'</small></header>'+
    (b.pprLines.length?'<div class="rw-ppr-marker">ППР: '+b.pprLines.map(l=>esc(l.name)).join(', ')+'</div>':'')+
    (b.pprConflicts.length?'<div class="rw-warning">Назначено вне ППР: '+b.pprConflicts.length+'</div>':'')+
    b.slots.map(s=>'<section class="rw-slot"><div class="rw-slot-head"><b>Смена '+esc(s.shiftId)+'</b><small>'+fmt(s.minutes)+' / '+fmt(s.capacity)+(s.overloadMinutes?' · перегрузка '+fmt(s.overloadMinutes):'')+'</small></div><div class="rw-track"><i class="'+(s.overloadMinutes?'over':'')+'" style="width:'+Math.min(100,s.capacity?100*s.minutes/s.capacity:s.minutes?100:0)+'%"></i></div>'+s.jobs.map(x=>jobCard(x,d)).join('')+'</section>').join('')+
    (b.unknownJobs.length?'<div class="rw-warning">Не определена смена/длительность · '+b.unknownJobs.length+' заданий'+b.unknownJobs.map(x=>jobCard(x,d)).join('')+'</div>':'')+(b.unassigned.length?'<small class="rw-day-unassigned">Не назначено: '+b.unassigned.length+' · '+fmt(b.unassignedMinutes)+'</small>':'')+'</article>').join('');
   const pprRows=lines.map(l=>'<label>'+esc(l.name||l.id)+'<input type="date" data-rw-ppr-line="'+esc(l.id)+'" value="'+esc(cfg?.ppr.find(x=>x.lineId===String(l.id))?.anchorDate||'')+'"><small>Каждые 14 календарных дней</small></label>').join('');
   const routeRows=routes.map(r=>'<label><input type="checkbox" data-rw-ppr-route="'+esc(r.id)+'" '+(cfg?.pprRouteIds.includes(String(r.id))?'checked':'')+'><span>'+esc(r.code||r.id)+' · '+esc(r.name||r.id)+'<small>'+esc(lines.find(l=>String(l.id)===String(r.lineId))?.name||'Линия не задана')+'</small></span></label>').join('');
   dlg.innerHTML='<div class="rw-shell"><div class="dialog-head"><div><span class="eyebrow">ПЛАН СМАЗОЧНЫХ РАБОТ</span><h2>Нагрузка, смены и ППР</h2><p class="dialog-copy">Распределяйте зафиксированные задания по рабочим дням. Сроки, состав и нормы обслуживания не меняются.</p></div><button type="button" class="icon-btn" data-rw-close>×</button></div>'+
    '<div class="rw-body"><div class="rw-toolbar"><button type="button" class="btn '+(mode==='week'?'primary':'secondary')+'" data-rw-range="week">Неделя</button><button type="button" class="btn '+(mode==='month'?'primary':'secondary')+'" data-rw-range="month">Месяц</button><label>С<input type="date" data-rw-start value="'+esc(range.startDate)+'"></label><label>По<input type="date" data-rw-end value="'+esc(range.endDate)+'"></label></div>'+
    '<details class="rw-settings" '+(settingsOpen?'open':'')+'><summary>График работы и ППР '+(cfg?'· настроено':'· требуется настройка')+'</summary><div class="rw-settings-inner"><h3>Доступная загрузка</h3><div class="rw-weekdays">'+labels.map((s,i)=>'<label><input type="checkbox" data-rw-weekday="'+(i+1)+'" '+(storedDays.includes(i+1)?'checked':'')+'>'+s+'</label>').join('')+'</div><div class="rw-shifts">'+[1,2,3].map(i=>'<label>Смена '+i+' · мин<input type="number" min="0" max="10080" step="1" data-rw-capacity="'+i+'" value="'+esc(cfg?.shifts.find(s=>s.id===String(i))?.minutes??'')+'" placeholder="0 — не работает"></label>').join('')+'</div><small>Укажите суммарное чистое время смазочных работ всех исполнителей в смену. Пн–Пт — начальный вариант, не подтверждённый график.</small><h3>ППР линий · 14 дней</h3><p class="rw-note">Укажите известную дату ППР каждой линии. Остальные даты рассчитываются от неё через 14 дней. Это график, не факт проведения ППР.</p><div class="rw-ppr-lines">'+(pprRows||'<p>Нет линий в базе.</p>')+'</div><details class="rw-ppr-routes"><summary>Маршруты, выполняемые только в ППР</summary><p class="rw-note">Отмечайте только маршруты, все задания которых нужно выполнять в ППР. Тип оборудования и периодичность смазки не меняются.</p><div class="rw-route-options">'+(routeRows||'<p>Нет текущих маршрутов.</p>')+'</div></details><p class="rw-warning" data-rw-settings-error role="alert"></p><button type="button" class="btn secondary" data-rw-save-settings>Сохранить график и ППР</button><small>Изменение графика не переносит уже назначенные задания: система покажет конфликты.</small></div></details>'+
    status+(!good?'<p class="rw-warning">'+esc(L.message)+'</p>':'')+
    '<div class="rw-summary">'+stat('Доступное время',fmt(tot.capacity))+stat('Назначено',fmt(tot.assignedMinutes))+stat('Не распределено',tot.unassigned+' / '+fmt(tot.unassignedMinutes))+stat('Перегрузка смен',fmt(tot.overloadMinutes))+stat('Конфликты ППР',tot.pprConflicts||0)+stat('Неизвестная нагрузка',tot.unknownJobs||0)+'</div>'+
    '<div class="rw-controls"><div><b>Автоматическое распределение</b><small>Только незапущенные задания без назначения. Сначала ранние сроки. Уже назначенные задания не перемещаются.</small></div><label class="rw-delay"><input type="checkbox" data-rw-delay '+(allowDelay?'checked':'')+'>Разрешить перенос после исходного планового дня</label><label '+(!allowDelay?'hidden':'')+'>Причина разрешённого переноса<input data-rw-delay-reason value="'+esc(delayReason)+'" placeholder="Причина согласованного переноса"></label><button type="button" class="btn secondary" data-rw-preview '+(!cfg||!good?'disabled':'')+'>Предварительный просмотр</button></div>'+
    previews+manual+'<section class="rw-queue"><h3>Нераспределённые задания · '+(good?L.unassigned.length:0)+'</h3><small>Включая просроченные работы до начала периода.</small><div class="rw-jobs">'+(good?L.unassigned.map(x=>jobCard(x,d)).join(''):'')+(!good||!L.unassigned.length?'<p class="rw-empty">Нет нераспределённых заданий.</p>':'')+'</div></section>'+
    '<section><h3>Рабочий календарь · '+days.length+' дн.</h3><small class="rw-note">Нагрузка по плановым минутам, включая закрытые задания. Неизвестная загрузка блокирует автоматическое назначение в этот день.</small><div class="rw-calendar">'+calendar+'</div></section></div>'+
    '<menu><button type="button" class="btn ghost" data-rw-back>К плану смазочных работ</button><button type="button" class="btn secondary" data-rw-close>Закрыть</button></menu></div>';
   const rerender=(message='')=>{notice=message;render()};
   dlg.querySelectorAll('[data-rw-close]').forEach(x=>x.onclick=()=>dlg.close());
   dlg.querySelector('[data-rw-back]').onclick=()=>onBack?.(range);
   dlg.querySelectorAll('[data-rw-range]').forEach(x=>x.onclick=()=>switchRange(x.dataset.rwRange));
   dlg.querySelector('[data-rw-start]').onchange=e=>{range.startDate=e.target.value;mode='custom';report=null;manualId='';rerender()};
   dlg.querySelector('[data-rw-end]').onchange=e=>{range.endDate=e.target.value;mode='custom';report=null;manualId='';rerender()};
   dlg.querySelector('.rw-settings').ontoggle=e=>{settingsOpen=e.target.open};
   dlg.querySelector('[data-rw-save-settings]').onclick=()=>{
    const weekdays=[...dlg.querySelectorAll('[data-rw-weekday]:checked')].map(x=>Number(x.dataset.rwWeekday)),all=[...dlg.querySelectorAll('[data-rw-capacity]')];
    const error=dlg.querySelector('[data-rw-settings-error]');
    if(all.some(x=>x.validity.badInput||x.value!==''&&(!Number.isInteger(Number(x.value))||Number(x.value)<0||Number(x.value)>10080))){error.textContent='Проверьте целое доступное время каждой смены';return}
    const shifts=all.filter(x=>Number(x.value)>0).map(x=>({id:x.dataset.rwCapacity,minutes:Number(x.value)}));
    const ppr=[...dlg.querySelectorAll('[data-rw-ppr-line]')].filter(x=>x.value).map(x=>({lineId:x.dataset.rwPprLine,anchorDate:x.value}));
    const pprRouteIds=[...dlg.querySelectorAll('[data-rw-ppr-route]:checked')].map(x=>x.dataset.rwPprRoute);
    const res=E.saveSettings({weekdays,shifts,ppr,pprRouteIds});if(!res.ok){error.textContent=res.message;return}
    report=null;manualId='';settingsOpen=false;rerender('Рабочий график и ППР сохранены');
   };
   dlg.querySelector('[data-rw-delay]').onchange=e=>{allowDelay=e.target.checked;report=null;rerender()};
   dlg.querySelector('[data-rw-delay-reason]').oninput=e=>{delayReason=e.target.value;report=null;dlg.querySelector('.rw-preview')?.remove()};
   dlg.querySelector('[data-rw-preview]').onclick=()=>{report=E.preview(options());manualId='';rerender()};
   dlg.querySelector('[data-rw-apply]')?.addEventListener('click',()=>{if(!report?.ok)return;const res=E.apply(options(),report.token);report=null;rerender(res.ok?'Назначено заданий: '+res.updated:res.message)});
   dlg.querySelectorAll('[data-rw-move]').forEach(x=>x.onclick=()=>{manualId=x.dataset.rwMove;report=null;rerender();dlg.querySelector('.rw-manual')?.scrollIntoView({block:'nearest'})});
   dlg.querySelector('[data-rw-cancel-move]')?.addEventListener('click',()=>{manualId='';rerender()});
   const doMove=clear=>{const res=E.move(manualId,{date:dlg.querySelector('[data-rw-move-date]')?.value,shiftId:dlg.querySelector('[data-rw-move-shift]')?.value,reason:dlg.querySelector('[data-rw-move-reason]')?.value,clear});if(!res.ok){dlg.querySelector('[data-rw-move-error]').textContent=res.message;return}manualId='';report=null;rerender(clear?'Назначение снято':'Назначение сохранено')};
   dlg.querySelector('[data-rw-save-move]')?.addEventListener('click',()=>doMove(false));
   dlg.querySelector('[data-rw-clear-move]')?.addEventListener('click',()=>doMove(true));
  }
  render();if(!dlg.open)dlg.showModal();
 }
 global.LubricaRouteWorkloadUI=Object.freeze({open});
})(window);
