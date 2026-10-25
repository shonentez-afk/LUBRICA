(function(global){
'use strict';
const B=global.LubricaBearings;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let filterSource='all',filterType='all',maxBore='all',query='';

function sourceLabel(v){return v==='override'?'Пользовательская':'Встроенная'}
function typeLabel(v){return {
  deep_groove_ball:'Радиальный шарикоподшипник однорядный',
  angular_contact_ball:'Радиально-упорный шарикоподшипник',
  self_aligning_ball:'Самоустанавливающийся шарикоподшипник',
  cylindrical_roller:'Роликоподшипник цилиндрический',
  spherical_roller:'Роликоподшипник сферический',
  tapered_roller:'Роликоподшипник конический',
  needle_roller:'Игольчатый роликоподшипник',
  thrust_ball:'Упорный шарикоподшипник',
  thrust_roller:'Упорный роликоподшипник',
  bearing_unit:'Корпусной подшипниковый узел',
  insert_ball:'Вставной шарикоподшипник',
  spherical_plain:'Сферический подшипник скольжения',
  track_roller:'Опорный ролик / ролик с цапфой',
  roller_bearing_unit:'Корпусной роликовый узел',
  slewing_ring_four_point_ball:'Опорно-поворотный подшипник, четырёхточечный контакт',
  plain_bearing:'Подшипник скольжения',
  unknown:'Другой / не определён'
}[v]||v||'Не задан'}
function render(view){
  if(!view||!B)return;
  const rows=B.search(query,{source:filterSource,type:filterType,maxBore});
  const overrides=B.getOverrides();
  view.innerHTML=`<section class="module-page bearing-library-page">
    <div class="module-header">
      <div><span class="eyebrow">ПОДШИПНИКИ</span><h1>Библиотека подшипников</h1><p>${B.catalog.length} встроенных записей · ${overrides.length} пользовательских</p></div>
      <div class="route-actions"><button class="btn secondary" id="bearingSourcesBtn">Источники расчёта</button><button class="btn secondary" id="bearingParseBtn">Распознать обозначение</button><button class="btn primary" id="bearingAddBtn">＋ Пользовательская запись</button></div>
    </div>
    <div class="bearing-library-summary">
      <div><span>Встроенная база</span><strong>${B.catalog.length}</strong><small>стартовый набор</small></div>
      <div><span>Пользовательские</span><strong>${overrides.length}</strong><small>в текущем JSON</small></div>
      <div><span>Найдено</span><strong>${rows.length}</strong><small>по текущему фильтру</small></div>
    </div>
    <div class="bearing-toolbar">
      <input id="bearingSearch" placeholder="Обозначение, серия, вставной подшипник, примечание…" value="${esc(query)}">
      <select id="bearingTypeFilter">
        <option value="all" ${filterType==='all'?'selected':''}>Все типы</option>
        <option value="deep_groove_ball" ${filterType==='deep_groove_ball'?'selected':''}>Шариковые радиальные</option>
        <option value="angular_contact_ball" ${filterType==='angular_contact_ball'?'selected':''}>Радиально-упорные шариковые</option>
        <option value="self_aligning_ball" ${filterType==='self_aligning_ball'?'selected':''}>Самоустанавливающиеся шариковые</option>
        <option value="cylindrical_roller" ${filterType==='cylindrical_roller'?'selected':''}>Цилиндрические роликовые</option>
        <option value="spherical_roller" ${filterType==='spherical_roller'?'selected':''}>Сферические роликовые</option>
        <option value="tapered_roller" ${filterType==='tapered_roller'?'selected':''}>Конические роликовые</option>
        <option value="bearing_unit" ${filterType==='bearing_unit'?'selected':''}>Корпусные узлы</option>
        <option value="insert_ball" ${filterType==='insert_ball'?'selected':''}>Вставные шарикоподшипники</option>
        <option value="spherical_plain" ${filterType==='spherical_plain'?'selected':''}>Сферические скольжения</option>
        <option value="track_roller" ${filterType==='track_roller'?'selected':''}>Опорные ролики</option>
        <option value="roller_bearing_unit" ${filterType==='roller_bearing_unit'?'selected':''}>Корпусные роликовые узлы</option>
        <option value="slewing_ring_four_point_ball" ${filterType==='slewing_ring_four_point_ball'?'selected':''}>Опорно-поворотные (slewing rings)</option>
      </select>
      <select id="bearingBoreFilter">
        <option value="all" ${maxBore==='all'?'selected':''}>Без ограничения d</option>
        <option value="50" ${maxBore==='50'?'selected':''}>d ≤ 50 мм</option>
        <option value="100" ${maxBore==='100'?'selected':''}>d ≤ 100 мм</option>
        <option value="150" ${maxBore==='150'?'selected':''}>d ≤ 150 мм</option>
        <option value="1200" ${maxBore==='1200'?'selected':''}>d ≤ 1200 мм</option>
      </select>
      <select id="bearingSourceFilter"><option value="all">Все источники</option><option value="builtin" ${filterSource==='builtin'?'selected':''}>Встроенные</option><option value="override" ${filterSource==='override'?'selected':''}>Пользовательские</option></select>
    </div>
    <div class="bearing-table-wrap"><table class="bearing-table"><thead><tr><th>Обозначение</th><th>d</th><th>D</th><th>B</th><th>Масса подш.</th><th>Масса узла</th><th>Тип</th><th>Источник</th><th></th></tr></thead>
      <tbody>${rows.length?rows.map(x=>`<tr>
        <td><strong>${esc(x.designation)}</strong>${x.insertDesignation?`<small>${esc(x.insertDesignation)} · ${esc(x.housingStyleLabel||'корпусной узел')}</small>`:(x.alias?`<small>${esc(x.alias)}</small>`:'')}</td>
        <td>${esc(x.d)}</td><td>${esc(x.D)}</td><td>${esc(x.B)}</td>
        <td>${x.insertMassKg!=null?`${esc(x.insertMassKg)} кг`:(x.massKg!=null?`${esc(x.massKg)} кг`:'—')}</td><td>${x.unitMassKg!=null?`${esc(x.unitMassKg)} кг`:'—'}</td>
        <td>${esc(typeLabel(x.bearingType))}</td>
        <td><span class="status-pill ${x.sourceType==='override'?'review':'ready'}">${sourceLabel(x.sourceType)}</span>${x.manufacturer?`<small>${esc(x.manufacturer)}</small>`:''}</td>
        <td>${x.sourceType==='override'?`<button class="mini-btn" data-edit-bearing="${esc(x.id)}">Изменить</button>`:''}</td>
      </tr>`).join(''):`<tr><td colspan="9" class="empty-cell">Ничего не найдено</td></tr>`}</tbody>
    </table></div>
    <div class="bearing-source-note"><b>Важно.</b> Встроенная библиотека содержит радиальные, радиально-упорные и самоустанавливающиеся шарикоподшипники, цилиндрические, сферические и конические роликоподшипники, а также корпусные узлы и опорно-поворотные подшипники INA/Schaeffler VLU20. Multi-OEM расчёт поддерживает SKF, NSK, FAG/Schaeffler, NTN-SNR и Timken с явным уровнем достоверности. Для корпусных узлов d/D/B относятся к вставному подшипнику UC, а не к габариту корпуса. Перед инженерным утверждением обязательно сверяйте исполнение, размеры и схему смазки с каталогом производителя/OEM.</div>
  </section>`;
  view.querySelector('#bearingSearch')?.addEventListener('input',e=>{query=e.target.value;render(view)});
  view.querySelector('#bearingSourceFilter')?.addEventListener('change',e=>{filterSource=e.target.value;render(view)});
  view.querySelector('#bearingTypeFilter')?.addEventListener('change',e=>{filterType=e.target.value;render(view)});
  view.querySelector('#bearingBoreFilter')?.addEventListener('change',e=>{maxBore=e.target.value;render(view)});
  view.querySelector('#bearingSourcesBtn')?.addEventListener('click',()=>global.LubricaBearingSources?.openRegistry?.());
  view.querySelector('#bearingParseBtn')?.addEventListener('click',openParser);
  view.querySelector('#bearingAddBtn')?.addEventListener('click',()=>openOverride());
  view.querySelectorAll('[data-edit-bearing]').forEach(b=>b.addEventListener('click',()=>openOverride(b.dataset.editBearing)));
}
function openParser(){
  const dlg=document.getElementById('actionDialog');if(!dlg)return;
  dlg.innerHTML=`<form method="dialog" class="bearing-dialog"><div class="dialog-head"><div><span class="eyebrow">РАСПОЗНАВАНИЕ ПОДШИПНИКА</span><h2>Распознать обозначение</h2></div><button class="icon-btn" value="cancel">×</button></div>
    <label>Обозначение<input id="bearingParseInput" autofocus placeholder="SKF 6205-2RS1/C3"></label>
    <div id="bearingParseResult" class="bearing-parse-result">Введите обозначение.</div>
    <menu><button class="btn ghost" value="cancel">Закрыть</button></menu></form>`;
  const input=dlg.querySelector('#bearingParseInput'),out=dlg.querySelector('#bearingParseResult');
  const update=()=>{
    const r=B.lookup(input.value),p=r.parsed;
    out.innerHTML=input.value.trim()?`<div class="bearing-resolve-grid">
      <div><small>Базовое обозначение</small><strong>${esc(p.baseDesignation||'—')}</strong></div>
      <div><small>Распознано</small><strong>${p.recognized?'Да':'Нет'}</strong></div>
      <div><small>Уплотнение</small><strong>${esc(p.sealingCode||p.sealing||'—')}</strong></div>
      <div><small>Зазор</small><strong>${esc(p.clearance||'—')}</strong></div>
      <div><small>d / D / B</small><strong>${p.dimensions?`${p.dimensions.d} / ${p.dimensions.D} / ${p.dimensions.B} мм`:'—'}</strong></div>
      <div><small>Источник</small><strong>${esc(r.sourceType==='override'?'Пользовательская запись':r.sourceType==='builtin'?'Встроенная библиотека':'Нет')}</strong></div>
      <div><small>Масса подшипника</small><strong>${r.record?.insertMassKg!=null?`${esc(r.record.insertMassKg)} кг`:(r.record?.massKg!=null?`${esc(r.record.massKg)} кг`:'—')}</strong></div>
      <div><small>Масса узла</small><strong>${r.record?.unitMassKg!=null?`${esc(r.record.unitMassKg)} кг`:'—'}</strong></div>
    </div>${p.warnings.length?`<div class="bearing-warning">${p.warnings.map(esc).join('<br>')}</div>`:''}`:'Введите обозначение.';
  };
  input.addEventListener('input',update);dlg.showModal();setTimeout(()=>input.focus(),0);
}
function openOverride(id=null){
  const dlg=document.getElementById('actionDialog');if(!dlg)return;
  const existing=id?B.getOverrides().find(x=>x.id===id):null;
  const bearingTypes=[
    ['deep_groove_ball','Радиальный шарикоподшипник однорядный'],
    ['angular_contact_ball','Радиально-упорный шарикоподшипник'],
    ['self_aligning_ball','Самоустанавливающийся шарикоподшипник'],
    ['cylindrical_roller','Роликоподшипник цилиндрический'],
    ['spherical_roller','Роликоподшипник сферический'],
    ['tapered_roller','Роликоподшипник конический'],
    ['needle_roller','Игольчатый роликоподшипник'],
    ['thrust_ball','Упорный шарикоподшипник'],
    ['thrust_roller','Упорный роликоподшипник'],
    ['bearing_unit','Корпусной подшипниковый узел'],
    ['insert_ball','Вставной шарикоподшипник'],
    ['spherical_plain','Сферический подшипник скольжения'],
    ['track_roller','Опорный ролик / ролик с цапфой'],
    ['roller_bearing_unit','Корпусной роликовый узел'],
    ['slewing_ring_four_point_ball','Опорно-поворотный подшипник, четырёхточечный контакт'],
    ['plain_bearing','Подшипник скольжения'],
    ['unknown','Другой / не определён']
  ];
  const typeOptions=bearingTypes.map(([value,label])=>`<option value="${value}" ${existing?.bearingType===value?'selected':''}>${label}</option>`).join('');
  dlg.innerHTML=`<form class="bearing-dialog bearing-editor-form" id="bearingOverrideForm" novalidate>
    <div class="dialog-head">
      <div><span class="eyebrow">ПОЛЬЗОВАТЕЛЬСКАЯ ЗАПИСЬ</span><h2>${existing?'Изменить':'Добавить'} подшипник</h2><p class="dialog-copy">Размеры используются в инженерных расчётах только как подтверждённые данные пользовательской записи.</p></div>
      <button type="button" class="icon-btn" data-cancel aria-label="Закрыть">×</button>
    </div>

    <div class="bearing-editor-section">
      <h3>Идентификация</h3>
      <div class="bearing-editor-grid identification">
        <label class="bearing-field designation">Обозначение *<input name="designation" value="${esc(existing?.designation||'')}" required placeholder="Например: 22212-E1-C3"></label>
        <label class="bearing-field alias">Алиас / вариант<input name="alias" value="${esc(existing?.alias||'')}" placeholder="Вариант записи в структуре"></label>
        <label class="bearing-field manufacturer">Производитель<input name="manufacturer" value="${esc(existing?.manufacturer||'')}" placeholder="SKF, FAG, NSK…"></label>
      </div>
    </div>

    <div class="bearing-editor-section">
      <h3>Размеры и тип</h3>
      <div class="bearing-editor-grid dimensions">
        <label>d — отверстие, мм *<input name="d" type="number" min="0.01" step="0.01" value="${esc(existing?.d||'')}" required></label>
        <label>D — наружный диаметр, мм *<input name="D" type="number" min="0.01" step="0.01" value="${esc(existing?.D||'')}" required></label>
        <label>B — ширина, мм *<input name="B" type="number" min="0.01" step="0.01" value="${esc(existing?.B||'')}" required></label>
        <label class="bearing-type-field">Тип подшипника<select name="bearingType">${typeOptions}</select></label>
      </div>
    </div>

    <div class="bearing-editor-section">
      <h3>Подтверждение данных</h3>
      <div class="bearing-editor-grid source">
        <label class="source-reference">Источник / документ<input name="sourceReference" value="${esc(existing?.sourceReference||'')}" placeholder="Каталог производителя, паспорт, чертёж, техническая документация…"></label>
        <label class="notes-field">Примечание<textarea name="notes" rows="3" placeholder="Дополнительные сведения: суффикс, исполнение, особенности установки, причина пользовательской записи…">${esc(existing?.notes||'')}</textarea></label>
      </div>
    </div>

    <div class="wizard-note"><b>Запись хранится в JSON текущего предприятия.</b><span>Если такое обозначение отсутствует во встроенной библиотеке, подтверждённые d / D / B этой записи будут использоваться вместо неизвестных размеров.</span></div>
    <menu>
      ${existing?'<button type="button" class="btn danger-link" data-delete>Удалить</button>':''}
      <span class="dialog-menu-spacer"></span>
      <button type="button" class="btn ghost" data-cancel>Отмена</button>
      <button type="button" class="btn primary" data-save>Сохранить</button>
    </menu>
  </form>`;
  const f=dlg.querySelector('#bearingOverrideForm');
  const close=()=>dlg.close();
  f.querySelectorAll('[data-cancel]').forEach(btn=>btn.addEventListener('click',close));
  f.querySelector('[data-save]').onclick=()=>{
    if(!f.reportValidity())return;
    try{
      B.saveOverride({id:existing?.id,...Object.fromEntries(new FormData(f).entries())});
      global.LubricaApp?.showToast('Запись подшипника сохранена');
      dlg.close();const view=document.getElementById('bearings');if(view)render(view);
    }catch(e){global.LubricaApp?.showToast(e.message||String(e),'error')}
  };
  f.querySelector('[data-delete]')?.addEventListener('click',()=>{
    if(confirm('Удалить пользовательскую запись подшипника?')){
      B.deleteOverride(existing.id);dlg.close();render(document.getElementById('bearings'));
    }
  });
  dlg.showModal();
}
global.renderBearings=render;
global.LubricaBearingUI=Object.freeze({render,openParser,openOverride});
global.LubricaSystem?.registerModule?.('Bearing UI','ok','Загружен');
})(window);
