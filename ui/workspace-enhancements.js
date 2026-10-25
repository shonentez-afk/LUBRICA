"use strict";
/* Stage 3.3 — usability patterns: actionable KPIs, visible filter context, tabbed details */
(function enhanceWorkspaceUX(){
  const statusNames={ready:'Готово',review:'Требует проверки',issue:'Критичный пробел'};
  function refreshFilterContext(){
    const bar=document.getElementById('activeFilterBar'); if(!bar)return;
    const chips=[];
    const line=document.getElementById('lineScopeSelect')?.value||'all';
    const area=document.getElementById('areaScopeSelect')?.value||'all';
    const type=document.getElementById('typeFilter')?.value||'all';
    const status=document.getElementById('statusFilter')?.value||'all';
    const q=document.getElementById('tableSearch')?.value?.trim()||'';
    if(line!=='all')chips.push(['line',line]);
    if(area!=='all')chips.push(['area',document.getElementById('areaScopeSelect')?.selectedOptions?.[0]?.textContent||area]);
    if(type!=='all')chips.push(['type',TYPE_LABELS[type]||type]);
    if(status!=='all')chips.push(['status',statusNames[status]||status]);
    if(q)chips.push(['search',`Поиск: ${q}`]);
    bar.innerHTML=chips.length?chips.map(([kind,label])=>`<span class="filter-chip">${esc(label)} <button type="button" data-clear-filter="${kind}" aria-label="Убрать фильтр">×</button></span>`).join(''):'<span class="filter-context">Фильтры не применены · показана вся доступная карта</span>';
    bar.querySelectorAll('[data-clear-filter]').forEach(btn=>btn.onclick=()=>{
      const kind=btn.dataset.clearFilter;
      if(kind==='line'){document.getElementById('lineScopeSelect').value='all';scope='all';renderWorkspaceNavigator()}
      if(kind==='area'){document.getElementById('areaScopeSelect').value='all';scope='all';renderWorkspaceNavigator()}
      if(kind==='type')document.getElementById('typeFilter').value='all';
      if(kind==='status')document.getElementById('statusFilter').value='all';
      if(kind==='search')document.getElementById('tableSearch').value='';
      renderTable();
    });
    document.querySelectorAll('[data-metric-status]').forEach(m=>m.classList.toggle('active',(m.dataset.metricStatus==='all'&&status==='all')||m.dataset.metricStatus===status));
  }
  const baseRenderTable=renderTable;
  renderTable=function(){baseRenderTable();refreshFilterContext();const rows=visiblePoints();const selected=rows.filter(p=>selectedRows.has(taskKey(p))).length;const f=document.getElementById('footerText');if(f)f.textContent=`Показано ${rows.length} из ${state.points.length}${selected?` · выбрано ${selected}`:''}`};
  document.querySelectorAll('[data-metric-status]').forEach(m=>m.addEventListener('click',()=>{const select=document.getElementById('statusFilter');if(!select)return;const requested=m.dataset.metricStatus||'all';select.value=(requested!=='all'&&select.value===requested)?'all':requested;renderTable()}));
  document.querySelectorAll('[data-detail-tab]').forEach(tab=>tab.addEventListener('click',()=>{
    document.querySelectorAll('[data-detail-tab]').forEach(x=>x.classList.toggle('active',x===tab));
    document.querySelectorAll('[data-detail-pane]').forEach(x=>x.classList.toggle('active',x.dataset.detailPane===tab.dataset.detailTab));
  }));
  ['lineScopeSelect','areaScopeSelect','typeFilter','statusFilter'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>setTimeout(refreshFilterContext,0)));
  document.getElementById('tableSearch')?.addEventListener('input',refreshFilterContext);
  document.getElementById('resetFilters')?.addEventListener('click',()=>setTimeout(refreshFilterContext,0));
  refreshFilterContext();
  renderTable();
})();
