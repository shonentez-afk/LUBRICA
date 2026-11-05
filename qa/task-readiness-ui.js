(function(global){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LABELS={needs_data:'Нужно заполнить',review:'Требует утверждения',attention:'Утверждено с замечаниями',ready:'Готово',disabled:'Отключено'};
const PAGE_SIZE=10;
function render(host,completion,openIssue){
 if(!host||!completion)return;
 const filterLine=host.dataset.line||'all',filterStatus=host.dataset.status||'all',
  query=(host.dataset.query||'').trim().toLowerCase();
 const all=completion.items||[];
 const filtered=all.filter(x=>(filterLine==='all'||x.lineId===filterLine)&&
  (filterStatus==='all'||x.status===filterStatus)&&
  (!query||[x.taskId,x.pointId,x.equipmentName,x.pointName,x.operation,x.lineName,x.areaName]
   .join(' ').toLowerCase().includes(query)));
 const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
 const page=Math.min(totalPages-1,Math.max(0,Number(host.dataset.page)||0));
 const visible=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
 host.innerHTML=`
 <div class="qa-section-head">
  <div><b>Готовность физических точек и мероприятий</b>
   <small>Конкретный следующий шаг по каждому мероприятию, без автоматического утверждения</small></div>
  <div class="qa-data-counts">Готово: ${{completion.ready||0} · Исправить: ${{completion.needsData||0} · Проверить: ${{completion.review||0} · Утверждены с замечаниями: ${{completion.approvedWithGaps||0}</div>
 </div>
 <div class="qa-toolbar qa-task-filters">
  <label><span>Линия</span><select data-ready-line><option value="all">Все линии</option>
   ${{(completion.lines||[]).map(l=>`<option value="${{esc(l.id)}">${{esc(l.name)}</option>`).join('')}
   </select></label>
  <label><span>Состояние</span><select data-ready-status>
   <option value="all">Все мероприятия</option>
   <option value="needs_data">Не хватает данных</option><option value="review">Требует утверждения</option>
   <option value="attention">Утверждено с замечаниями</option><option value="ready">Готово</option>
   <option value="disabled">Отключено</option></select></label>
  <label class="qa-search"><span>Поиск по оборудованию / точке</span>
   <input data-ready-query value="${{esc(host.dataset.query||'')}" placeholder="Название, ID, операция…"></label>
  <small>${{filtered.length} из ${{completion.total||0} мероприятий</small>
 </div>
 <div class="qa-task-ready-list">${{visible.map(x=>`
   <article class="qa-task-ready-item ${{esc(x.status)}">
    <div class="qa-task-ready-top"><span class="qa-task-status">${{esc(LABELS[x.status]||x.status)}</span><span class="qa-task-score">${{x.completed}/${{x.total} шагов</span></div>
    <div class="qa-task-ready-title"><b>${{esc(x.equipmentName)} · ${{esc(x.pointName)}</b><small>${{esc(x.lineName)} · ${{esc(x.areaName)}</small></div>
    <div class="qa-task-ready-operation">${{esc(x.operation)} <code>${{esc(x.taskId)}</code></div>
    <div class="qa-task-steps">${{x.steps.map(st=>`<span class="${{st.ok?'done':'pending'}" title="${{esc(st.ok?'Готово':'Требует действия')}">${{st.ok?'✓':'○'} ${{esc(st.label)}</span>`).join('')}</div>
    <div class="qa-task-next"><div><b>${{esc(x.next.label)}</b><p>${{esc(x.next.hint)}</p>
     ${{x.analogSuggestion?`<small>Предложение по аналогу: ${{esc(x.analogSuggestion.value??'—')} ${{esc(x.analogSuggestion.unit??'')}. Требует подтверждения расчёта.</small>`:''}
    </div><button type="button" class="mini-btn" data-ready-open="${{esc(x.taskId)}">Открыть</button></div>
    ${{x.next.issueCode?`<details class="qa-task-evidence"><summary>Почему требуется действие</summary><p>${{esc(x.next.reason)}</p><small>Проверка: ${{esc(x.next.issueCode)}${{x.issueCount>1?` · Всего замечаний: ${{x.issueCount}`:''}</small></details>`:''}
   </article>`).join('')||'<div class="route-empty">Нет мероприятий по текущему фильтру.</div>'}</div>
 <div class="qa-toolbar qa-task-pager">
  <button type="button" class="btn ghost" data-ready-prev ${{page===0?'disabled':''}>Назад</button>
  <small>Страница ${{page+1} из ${{totalPages}</small>
  <button type="button" class="btn ghost" data-ready-next ${{page+1>=totalPages?'disabled':''}>Дальше</button>
 </div>
 `;
 const line=host.querySelector('[data-ready-line]'),status=host.querySelector('[data-ready-status]'),search=host.querySelector('[data-ready-query]');
 if(line){line.value=filterLine;line.onchange=()=>{host.dataset.line=line.value;host.dataset.page='0';render(host,completion,openIssue)}}
 if(status){status.value=filterStatus;status.onchange=()=>{host.dataset.status=status.value;host.dataset.page='0';render(host,completion,openIssue)}}
 if(search)search.oninput=()=>{
  host.dataset.query=search.value;host.dataset.page='0';
  const caret=search.selectionStart??search.value.length;
  clearTimeout(host._readinessSearchTimer);
  host._readinessSearchTimer=setTimeout(()=>{
   render(host,completion,openIssue);
   const next=host.querySelector('[data-ready-query]');
   if(next){next.focus();try{next.setSelectionRange(caret,caret)}catch(_){}}
  },180);
 };
 for(const [name,delta] of [['prev',-1],['next',1]]){
  const b=host.querySelector('[data-ready-'+name+']');
  if(b)b.onclick=()=>{host.dataset.page=String(Math.min(totalPages-1,Math.max(0,page+delta)));render(host,completion,openIssue)};
 }
 host.querySelectorAll('[data-ready-open]').forEach(b=>b.onclick=()=>{
  const x=all.find(t=>t.taskId===b.dataset.readyOpen);
  if(!x)return;
  if(x.next.code==='structure'&&x.pointId)
   openIssue({entityType:'point',entityId:x.pointId,code:'POINT_NODE_MISSING'});
  else openIssue({entityType:'task',entityId:x.taskId});
 });
}
global.LubricaTaskReadinessUI=Object.freeze({render});
})(window);