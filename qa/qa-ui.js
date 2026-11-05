(function(global){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sevLabel={blocker:'Блокирующая',error:'Требует исправления',warn:'Предупреждение',info:'Информация'};
function download(name,text,type='text/csv;charset=utf-8'){const b=new Blob(["\ufeff",text],{type}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function openIssue(x){
 if(x.entityType==='route'){const v=document.getElementById('routes');if(v){v.dataset.routeStatusFilter='working';v.dataset.selectedRoute=x.entityId}global.switchView?.('routes');return}
 if(x.entityType==='task'){global.switchView?.('workspace');setTimeout(()=>global.LubricaWorkspaceNavigation?.openTask?.(x.entityId),0);return}
 if(x.entityType==='point'){if(x.code==='POINT_WITHOUT_TASKS'){global.switchView?.('structureView');setTimeout(()=>global.LubricaStructure?.selectEntity?.('lubricationPoint',x.entityId),0);return}global.switchView?.('workspace');setTimeout(()=>global.LubricaWorkspaceNavigation?.openPoint?.(x.entityId),0);return}
 if(x.entityType==='equipment'){global.switchView?.('structureView');setTimeout(()=>global.LubricaStructure?.selectEntity?.('equipment',x.entityId),0);return}
 if(x.entityType==='material'){global.switchView?.('materials');return}
}
function csv(report){const q=v=>`"${String(v??'').replace(/"/g,'""')}"`,rows=[['Категория','Готовность','Пройдено','Применимо','Проблем']];for(const c of report.categories)rows.push([c.label,`${c.score}%`,c.passed,c.applicable,c.failed]);rows.push([],['ИТОГО',`${report.readiness}%`,report.totalPassed,report.totalApplicable,report.totalFailed],[],['Уровень','Категория','Код','Тип объекта','ID объекта','Проблема','Описание']);for(const x of report.issues)rows.push([sevLabel[x.severity]||x.severity,global.LubricaProgramQA.CATEGORY_LABELS[x.category]||x.category,x.code,x.entityType,x.entityId,x.title,x.message]);return rows.map(r=>r.map(q).join(';')).join('\n')}
function render(view){
 const host=view?.querySelector?.('#programQaView')||view;if(!host)return;
 const API=global.LubricaProgramQA,report=API?.audit?.();if(!report){host.innerHTML='<div class="route-empty">Модуль контроля недоступен.</div>';return}
 let severity=host.dataset.qaSeverity||'all',category=host.dataset.qaCategory||'all',query=host.dataset.qaQuery||'',searchTimer=null;
 const draw=()=>{
  const filtered=report.issues.filter(x=>(severity==='all'||x.severity===severity)&&(category==='all'||x.category===category)&&(!query||`${x.entityId} ${x.title} ${x.message} ${x.code}`.toLowerCase().includes(query.toLowerCase())));
  const scoreClass=n=>n>=95?'good':n>=85?'warn':'bad';
  const cq=report.candidateQueue||{groups:[],lines:[],unlinked:0,totalCandidates:0,alreadyLinked:0,byCategory:{},categoryLabels:{}};
  const qLine=host.dataset.qaCandidateLine||'all';
  const qGroups=cq.groups.filter(g=>qLine==='all'||g.lineId===qLine);
  const qPages=Math.max(1,Math.ceil(qGroups.length/12));
  const qPage=Math.min(qPages-1,Math.max(0,Number(host.dataset.qaCandidatePage)||0));
  const qVisible=qGroups.slice(qPage*12,(qPage+1)*12);

  host.innerHTML=`<div class="qa-program">
   <section class="qa-summary">
    <div class="qa-total ${scoreClass(report.readiness)}"><span>Готовность программы смазки</span><b>${report.readiness}%</b><small>${report.totalPassed} из ${report.totalApplicable} конкретных проверок пройдено</small></div>
    <div><span>Блокирующих</span><b>${report.severityCounts.blocker||0}</b><small>нарушают целостность данных</small></div>
    <div><span>Требуют исправления</span><b>${report.severityCounts.error||0}</b><small>влияют на эксплуатационную готовность</small></div>
    <div><span>Предупреждений</span><b>${report.severityCounts.warn||0}</b><small>требуют инженерной проверки</small></div>
   </section>
   <section class="qa-issues-card">
    <div class="qa-section-head"><div><b>Очередь разбора фактических ТМЦ</b><small>Для инженерного подтверждения, не для автоматического создания точек</small></div><div class="qa-data-counts">Нуждаются в разборе: ${cq.unlinked} · Уже связаны с точками: ${cq.alreadyLinked} · Всего кандидатов: ${cq.totalCandidates}</div></div>
    <p>Реальные компоненты из структуры сгруппированы по оборудованию. Валы и корпуса — не виртуальные точки. Откройте машину, проверьте фактический смазываемый узел и только затем создайте/подтвердите точку.</p>
    <div class="qa-toolbar"><label><span>Линия</span><select data-qa-candidate-line><option value="all">Все линии</option>${cq.lines.map(l=>`<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('')}</select></label><small>${qGroups.length} единиц оборудования с кандидатами</small></div>
    <div class="qa-issues-list">${qVisible.map(g=>`<article class="qa-issue warn"><span class="qa-severity">${g.count} ТМЦ</span><div class="qa-issue-body"><div><b>${esc(g.equipmentName)}</b><code>${esc(g.equipmentId)}</code></div><p>${esc(g.lineName)} · ${esc(g.areaName)}</p><small>${Object.entries(g.byCategory).map(([k,n])=>`${esc(cq.categoryLabels[k]||k)}: ${n}`).join(' · ')}</small></div><button type="button" class="mini-btn" data-qa-open-equipment="${esc(g.equipmentId)}">Открыть оборудование</button></article>`).join('')||'<div class="route-empty">На этой линии кандидатов нет.</div>'}</div>
    <div class="qa-toolbar"><button type="button" class="btn ghost" data-qa-prev ${qPage===0?'disabled':''}>Назад</button><small>Страница ${qPage+1} из ${qPages}</small><button type="button" class="btn ghost" data-qa-next ${qPage+1>=qPages?'disabled':''}>Дальше</button></div>
   </section>
   <section class="qa-readiness-grid">${report.categories.map(c=>`<article class="${scoreClass(c.score)}" data-qa-category-card="${esc(c.key)}"><div><span>${esc(c.label)}</span><b>${c.score}%</b></div><progress max="100" value="${c.score}"></progress><small>${c.passed}/${c.applicable} пройдено · ${c.failed} проблем</small></article>`).join('')}</section>
   <section class="qa-toolbar">
    <label><span>Уровень</span><select data-qa-severity><option value="all">Все</option><option value="blocker">Блокирующие</option><option value="error">Требуют исправления</option><option value="warn">Предупреждения</option></select></label>
    <label><span>Раздел</span><select data-qa-category><option value="all">Все разделы</option>${report.categories.map(c=>`<option value="${esc(c.key)}">${esc(c.label)}</option>`).join('')}</select></label>
    <label class="qa-search"><span>Поиск</span><input data-qa-query value="${esc(query)}" placeholder="ID точки, мероприятия, код проверки…"></label>
    <button type="button" class="btn ghost" data-qa-export>Экспорт контроля CSV</button>
    <button type="button" class="btn secondary" data-qa-refresh>Перепроверить базу</button>
   </section>
   <section class="qa-issues-card">
    <div class="qa-section-head"><div><b>Реестр проблем контроля</b><small>${filtered.length} показано из ${report.issues.length}</small></div><div class="qa-data-counts">Оборудование ${report.counts.equipment} · Точки ${report.counts.points} · Мероприятия ${report.counts.tasks} · Маршруты ${report.counts.routes}</div></div>
    <div class="qa-issues-list">${filtered.map(x=>`<article class="qa-issue ${esc(x.severity)}"><span class="qa-severity">${esc(sevLabel[x.severity]||x.severity)}</span><div class="qa-issue-body"><div><b>${esc(x.title)}</b><code>${esc(x.code)}</code></div><p>${esc(x.message)}</p><small>${esc(API.CATEGORY_LABELS[x.category]||x.category)} · ${esc(x.entityType)} · ${esc(x.entityId)}</small></div><button type="button" class="mini-btn" data-qa-open="${esc(x.id)}">${esc(x.action||'Открыть')}</button></article>`).join('')||'<div class="route-empty"><b>Проблем по выбранному фильтру нет</b><span>Измените фильтр или продолжайте исправление базы.</span></div>'}</div>
   </section>
   <section class="qa-method"><b>Как считается готовность</b><p>Каждая применимая инженерная проверка имеет результат «пройдена / не пройдена». Готовность раздела = пройденные проверки / применимые проверки. Итог = все пройденные проверки / все применимые проверки по базе. Процент нельзя редактировать вручную.</p></section>
  </div>`;
  host.querySelector('[data-qa-severity]').value=severity;host.querySelector('[data-qa-category]').value=category;
  host.querySelector('[data-qa-severity]').onchange=e=>{severity=e.target.value;host.dataset.qaSeverity=severity;draw()};
  host.querySelector('[data-qa-category]').onchange=e=>{category=e.target.value;host.dataset.qaCategory=category;draw()};
  host.querySelector('[data-qa-query]').oninput=e=>{query=e.target.value;host.dataset.qaQuery=query;clearTimeout(searchTimer);const caret=e.target.selectionStart??query.length;searchTimer=setTimeout(()=>{draw();const q=host.querySelector('[data-qa-query]');if(q){q.focus();try{q.setSelectionRange(caret,caret)}catch(_){}}},160)};
  const qSelect=host.querySelector('[data-qa-candidate-line]');if(qSelect){qSelect.value=qLine;qSelect.onchange=e=>{host.dataset.qaCandidateLine=e.target.value;host.dataset.qaCandidatePage='0';draw()}}
  host.querySelectorAll('[data-qa-open-equipment]').forEach(b=>b.onclick=()=>openIssue({entityType:'equipment',entityId:b.dataset.qaOpenEquipment}));
  const qPrev=host.querySelector('[data-qa-prev]'),qNext=host.querySelector('[data-qa-next]');
  if(qPrev)qPrev.onclick=()=>{host.dataset.qaCandidatePage=String(Math.max(0,qPage-1));draw()};
  if(qNext)qNext.onclick=()=>{host.dataset.qaCandidatePage=String(Math.min(qPages-1,qPage+1));draw()};
  host.querySelector('[data-qa-refresh]').onclick=()=>render(view);
  host.querySelector('[data-qa-export]').onclick=()=>download('LUBRICA_Контроль_программы_смазки.csv',csv(report));
  host.querySelectorAll('[data-qa-open]').forEach(b=>b.onclick=()=>{const x=report.issues.find(i=>i.id===b.dataset.qaOpen);if(x)openIssue(x)});
  host.querySelectorAll('[data-qa-category-card]').forEach(c=>c.onclick=()=>{category=c.dataset.qaCategoryCard;host.dataset.qaCategory=category;draw()});
 };
 draw();
}
global.renderProgramQA=render;
global.LubricaProgramQAUI=Object.freeze({render,openIssue});
})(window);