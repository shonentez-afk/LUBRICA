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

function installCandidateDecisionUI(view,host,report){
 const Engine=global.LubricaEngineeringDecisions,Core=global.LubricaCore,queue=report.candidateQueue||{};
 const board=host.querySelector('.qa-issues-card');
 if(!Engine||!Core?.State||!board)return;
 const state=()=>Core.State.getDatabase();
 const byId=id=>(state()?.components||[]).find(c=>String(c.id)===String(id));
 const persist=working=>{Core.State.setDatabase(working);global.LubricaApp?.refreshFromCore?.();render(view)};
 const toast=(message,level='warn')=>global.LubricaApp?.showToast?.(message,level);
 const expanded=host.dataset.qaCandidateExpanded||'';
 const groups=queue.groups||[],selected=groups.find(g=>g.equipmentId===expanded);
 function element(tag,cls){const el=document.createElement(tag);if(cls)el.className=cls;return el}
 function button(label,cls,onClick){const b=element('button',cls||'mini-btn');b.type='button';b.textContent=label;b.onclick=onClick;return b}
 for(const b of board.querySelectorAll('[data-qa-open-equipment]')){
  const id=b.dataset.qaOpenEquipment,g=groups.find(x=>x.equipmentId===id);
  if(!g)continue;
  const holder=element('div','qa-candidate-actions');
  b.parentElement.replaceChild(holder,b);
  holder.appendChild(b);
  holder.appendChild(button(expanded===id?'Свернуть':'Разобрать ТМЦ','mini-btn',()=>{
   host.dataset.qaCandidateExpanded=expanded===id?'':id;host.dataset.qaCandidateItemPage='0';render(view);
  }));
 }
 const dlg=element('dialog','qa-engineer-dialog');
 dlg.setAttribute('data-qa-decision-dialog','');
 host.appendChild(dlg);
 const close=()=>{if(dlg.open)dlg.close();dlg.innerHTML=''};
 const dialogHeader=(eyebrow,title)=>'<div class="dialog-head"><div><span class="eyebrow">'+esc(eyebrow)+'</span><h2>'+esc(title)+'</h2></div><button type="button" class="icon-btn" data-qa-dialog-close>×</button></div>';
 const attachClose=()=>{dlg.querySelector('[data-qa-dialog-close]').onclick=close;const cancel=dlg.querySelector('[data-qa-dialog-cancel]');if(cancel)cancel.onclick=close};
 function decide(id){
  const c=byId(id);if(!c){toast('ТМЦ больше нет в базе');return}
  const owner=(state()?.equipment||[]).find(e=>String(e.id)===String(c.equipmentId));
  dlg.innerHTML='<form class="structure-form qa-engineer-form">'+dialogHeader('ИНЖЕНЕРНОЕ РЕШЕНИЕ',c.name)+
   '<div class="wizard-note"><b>'+esc(owner?.name||c.equipmentId)+'</b><span>Код ТМЦ: '+esc(c.externalCode||'—')+' · Категория: '+esc(c.candidateCategory||'—')+'. Выбирайте только фактическую конструкцию, не создавайте виртуальные точки.</span></div>'+
   '<label>Решение<select name="decisionChoice" required><option value="">Выберите действие</option>'+
   Object.entries(Engine.ACTIONS).map(([code,label])=>'<option value="'+esc(code)+'">'+esc(label)+'</option>').join('')+'</select></label>'+
   '<label>Почему принято такое решение<textarea name="reason" rows="3" required placeholder="Например: проверен узел на Линии 1, подшипниковая опора на приводном валу"></textarea></label>'+
   '<label>Источник подтверждения<input name="sourceReference" placeholder="Осмотр на месте, паспорт, чертёж, № документа"></label>'+
   '<label class="qa-physical-confirm"><input type="checkbox" name="physicalConfirmed"> Подтверждаю фактическое место обслуживания (для создания точки)</label>'+
   '<section class="qa-decision-preview" data-qa-preview></section>'+
   '<menu><button type="button" class="btn ghost" data-qa-dialog-cancel>Отмена</button>'+
   '<button type="button" class="btn secondary" data-qa-check>Проверить решение</button>'+
   '<button type="button" class="btn primary" data-qa-commit disabled>Подтвердить и сохранить</button></menu></form>';
  attachClose();
  const form=dlg.querySelector('form'),btn=dlg.querySelector('[data-qa-commit]'),panel=dlg.querySelector('[data-qa-preview]');
  let reviewedKey='';
  const vals=()=>({action:form.elements.decisionChoice.value,params:{
   reason:form.elements.reason.value,sourceReference:form.elements.sourceReference.value,
   physicalConfirmed:form.elements.physicalConfirmed.checked}});
  function update(markReviewed=false){
   const v=vals(),key=JSON.stringify(v);
   const p=Engine.preview(state(),id,v.action,v.params);
   if(markReviewed)reviewedKey=p.allowed?key:'';
   const lines=[...p.errors.map(x=>'<li class="qa-decision-error">'+esc(x)+'</li>'),
    ...p.warnings.map(x=>'<li>'+esc(x)+'</li>')];
   panel.innerHTML='<b>'+esc(p.allowed?(p.change||'Предварительный просмотр'):'Проверка не пройдена')+'</b>'+
    '<ul>'+lines.join('')+'</ul><small>Изменение сохранится только после подтверждения. Существующие утверждённые мероприятия не затрагиваются.</small>';
   btn.disabled=!p.allowed||reviewedKey!==key;
   btn.textContent=v.action==='point'?'Продолжить в мастер точек':'Подтвердить и сохранить';
   form.querySelector('.qa-physical-confirm').hidden=v.action!=='point';
  }
  for(const x of form.querySelectorAll('input,textarea,select')){
   x.addEventListener('input',()=>{reviewedKey='';update()});
   x.addEventListener('change',()=>{reviewedKey='';update()});
  }
  dlg.querySelector('[data-qa-check]').onclick=()=>update(true);
  btn.onclick=()=>{
   const v=vals(),key=JSON.stringify(v);
   if(reviewedKey!==key){toast('Сначала проверьте решение');return}
   const p=Engine.preview(state(),id,v.action,v.params);
   if(!p.allowed){update();toast(p.errors.join(' '));return}
   if(v.action==='point'){
    let context;try{context=Engine.prepareCreate(state(),id,v.params)}
    catch(e){toast(e.message);return}
    close();
    global.LubricaCandidateFinalizer?.open?.('component',id,context);
    return;
   }
   try{
    const working=JSON.parse(JSON.stringify(state()));
    Engine.commit(working,id,v.action,v.params);close();persist(working);toast('Инженерное решение сохранено','ok');
   }catch(e){toast(e.message)}
  };
  update();dlg.showModal();
 }
 function undoDialog(id){
  const c=byId(id);if(!c)return;
  const p=Engine.previewUndo(state(),id);
  dlg.innerHTML='<div class="structure-form">'+dialogHeader('ОТМЕНА РЕШЕНИЯ',c.name)+
   '<p>Текущее решение: <b>'+esc(Engine.ACTIONS[p.action]||p.action||'—')+'</b></p>'+
   (p.allowed?'<p>Точки и мероприятия удалятся только если их ещё не настраивали и они не связаны с маршрутами.</p>':'<p>Безопасная автоматическая отмена недоступна:</p>')+
   '<ul>'+[...p.errors,...p.warnings].map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
   '<menu><button type="button" class="btn ghost" data-qa-dialog-cancel>Закрыть</button>'+
   (p.allowed?'<button type="button" class="btn secondary" data-qa-undo>Отменить решение</button>':'')+'</menu></div>';
  attachClose();
  const confirm=dlg.querySelector('[data-qa-undo]');
  if(confirm)confirm.onclick=()=>{
   try{
    const working=JSON.parse(JSON.stringify(state()));
    Engine.undo(working,id);close();persist(working);toast('Решение отменено. ТМЦ возвращена в очередь.','ok');
   }catch(e){toast(e.message)}
  };
  dlg.showModal();
 }
 if(selected){
  const perPage=15,pageCount=Math.max(1,Math.ceil(selected.items.length/perPage));
  const page=Math.min(pageCount-1,Math.max(0,Number(host.dataset.qaCandidateItemPage)||0));
  const items=selected.items.slice(page*perPage,(page+1)*perPage);
  const detail=element('section','qa-candidate-details');
  detail.innerHTML='<div class="qa-section-head"><div><b>ТМЦ: '+esc(selected.equipmentName)+'</b><small>Рассмотрите каждую физическую позицию отдельно. Найденный компонент не равен точке смазки.</small></div></div>'+
   '<div class="qa-candidate-items">'+items.map(it=>'<div class="qa-candidate-item"><div><b>'+esc(it.name)+'</b><small>'+esc(it.externalCode||it.id)+' · '+esc(queue.categoryLabels?.[it.category]||it.category)+(it.decision?' · ожидает уточнения: '+esc(it.decisionReason):'')+'</small></div><button type="button" class="mini-btn" data-qa-decide="'+esc(it.id)+'">'+(it.decision?'Просмотр':'Принять решение')+'</button></div>').join('')+'</div>'+
   '<div class="qa-decision-nav"><button type="button" class="btn ghost" data-qa-item-prev '+(page===0?'disabled':'')+'>Назад</button><small>Компоненты: страница '+(page+1)+' из '+pageCount+'</small><button type="button" class="btn ghost" data-qa-item-next '+(page+1>=pageCount?'disabled':'')+'>Дальше</button></div>';
  board.appendChild(detail);
  for(const b of detail.querySelectorAll('[data-qa-decide]'))b.onclick=()=>{
   const c=byId(b.dataset.qaDecide);
   if(c?.engineeringDecision){undoDialog(c.id);return}decide(b.dataset.qaDecide);
  };
  for(const [selector,delta] of [['[data-qa-item-prev]',-1],['[data-qa-item-next]',1]]){
   const b=detail.querySelector(selector);b.onclick=()=>{
    host.dataset.qaCandidateItemPage=String(Math.max(0,Math.min(pageCount-1,page+delta)));render(view);
   };
  }
 }
 const decisions=(queue.resolved||[]).filter(x=>!host.dataset.qaCandidateLine||host.dataset.qaCandidateLine==='all'||x.lineId===host.dataset.qaCandidateLine);
 if(decisions.length){
  const perPage=10,pageCount=Math.max(1,Math.ceil(decisions.length/perPage));
  const page=Math.min(pageCount-1,Math.max(0,Number(host.dataset.qaResolvedPage)||0));
  const recent=element('section','qa-candidate-decisions');
  recent.innerHTML='<div class="qa-section-head"><div><b>История принятых решений</b><small>'+decisions.length+' ТМЦ · решения сохраняются вместе с базой</small></div></div>'+
   '<div class="qa-candidate-items">'+decisions.slice(page*perPage,(page+1)*perPage).map(x=>'<div class="qa-candidate-item"><div><b>'+esc(x.componentName)+'</b><small>'+esc(x.equipmentName)+' · '+esc(Engine.ACTIONS[x.action]||x.action)+' · '+esc(x.reason)+'</small></div><button type="button" class="mini-btn ghost" data-qa-undo-preview="'+esc(x.componentId)+'">Проверить отмену</button></div>').join('')+'</div>'+
   '<div class="qa-decision-nav"><button type="button" class="btn ghost" data-qa-resolved-prev '+(page===0?'disabled':'')+'>Назад</button><small>История: '+(page+1)+' / '+pageCount+'</small><button type="button" class="btn ghost" data-qa-resolved-next '+(page+1>=pageCount?'disabled':'')+'>Дальше</button></div>';
  board.appendChild(recent);
  for(const b of recent.querySelectorAll('[data-qa-undo-preview]'))b.onclick=()=>undoDialog(b.dataset.qaUndoPreview);
  for(const [selector,delta] of [['[data-qa-resolved-prev]',-1],['[data-qa-resolved-next]',1]]){
   recent.querySelector(selector).onclick=()=>{host.dataset.qaResolvedPage=String(Math.max(0,Math.min(pageCount-1,page+delta)));render(view)};
  }
 }
}

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
  installCandidateDecisionUI(view,host,report);
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