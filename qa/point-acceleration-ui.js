(function(global){
'use strict';
const API=global.LubricaPointAccelerationUI=global.LubricaPointAccelerationUI||{};
const selectedByHost=new WeakMap();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clean=v=>String(v??'').trim();
const Core=global.LubricaCore;
function file(name,contents){
 const blob=new Blob(['\ufeff',contents],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),750);
}
function warning(x,t='warn'){global.LubricaApp?.showToast?.(x,t)}
function dialog(host,body){
 const dlg=document.createElement('dialog');dlg.className='qa-engineer-dialog point-accel-dialog';
 dlg.innerHTML=body;host.appendChild(dlg);
 const close=()=>{if(dlg.open)dlg.close();dlg.remove()};
 dlg.querySelectorAll('[data-pa-close]').forEach(x=>x.onclick=close);
 dlg.addEventListener('cancel',()=>setTimeout(()=>dlg.remove(),0),{once:true});
 dlg.showModal();return{dlg,close};
}
function buttonBlock(label,attrs=''){return '<button type="button" class="mini-btn" '+attrs+'>'+esc(label)+'</button>'}
const dd=(label,id,options,val)=>'<label><span>'+esc(label)+'</span><select '+id+'>'+options.map(o=>'<option value="'+esc(o.value)+'" '+(String(o.value)===String(val)?'selected':'')+'>'+esc(o.label)+'</option>').join('')+'</select></label>';
function bearingDialog(host,equipment,redraw){
 const engine=global.LubricaConveyorBearingVerification;
 if(!engine){warning('Реестр опор не загружен');return}
 const d=Core.State.getDatabase(),sources=engine.sources(d,equipment),old=equipment.conveyorBearingSurvey||{};
 const sourceOptions=[{value:'',label:'ТМЦ пока не определён'},...sources.map(s=>({value:String(s.id),label:(s.externalCode||s.id)+' · '+s.name}))];
 const title=`${equipment.externalCode||equipment.id} · ${equipment.name}`;
 const {dlg,close}=dialog(host,`<form class="structure-form point-accel-form" novalidate>
  <div class="dialog-head"><div><span class="eyebrow">ФИЗИЧЕСКИЕ ОПОРЫ</span><h2>Проверка подшипников конвейера</h2></div><button type="button" class="icon-btn" data-pa-close aria-label="Закрыть">×</button></div>
  <div class="wizard-note"><b>${esc(title)}</b><span>Обозначение подшипника не равно количеству. Укажите число и каждое реальное место отдельно. Один исходный ТМЦ может описывать несколько одинаковых подшипников, но это не создаёт точки автоматически.</span></div>
  <div class="point-accel-count-grid"><label>Количество опор, заявленное в документации / при осмотре<input type="number" min="0" max="1000" step="1" name="reportedCount" value="${esc(old.reportedCount??'')}" placeholder="Неизвестно"></label>
  <label class="checkline"><input name="physicalCountConfirmed" type="checkbox" ${old.physicalCountConfirmed?'checked':''}> Число и фактические места проверены</label></div>
  <section class="point-accel-positions"><div class="qa-section-head"><div><b>Физические позиции</b><small>Добавляйте только места, реально найденные при осмотре или в документации. Неизвестный подшипник можно оставить без модели, но не создавать из него точку.</small></div></div><div data-pa-position-rows></div>
   <button class="btn secondary" type="button" data-pa-add-position>Добавить подтверждаемое место</button></section>
  <label>Основание инженерной проверки<textarea rows="2" name="reason" placeholder="Что именно проверено и где расположен узел">${esc(old.reason||'')}</textarea></label>
  <label>Источник / фото / паспорт<input name="sourceReference" value="${esc(old.sourceReference||'')}" placeholder="№ чертежа, осмотр, ссылка на фотографию"></label>
  <section class="qa-decision-preview" data-pa-review><small>Реестр хранит только подтверждения. Нормы и операции не утверждаются автоматически.</small></section>
  <menu><button class="btn ghost" type="button" data-pa-close>Отмена</button><button type="button" class="btn secondary" data-pa-check>Проверить</button><button type="button" class="btn primary" data-pa-commit disabled>Сохранить результат проверки</button></menu>
 </form>`);
 const form=dlg.querySelector('form'),list=form.querySelector('[data-pa-position-rows]');
 let sequence=0,reviewed='';
 function add(row={}){
  const id=clean(row.positionId)||'physical_'+String(Date.now())+'_'+(++sequence);
  const block=document.createElement('article');block.className='point-accel-position';block.dataset.positionId=id;
  block.innerHTML='<div class="point-accel-position-row"><b>Физическое место</b>'+buttonBlock('Удалить','data-pa-delete-position')+'</div>'+
   '<label>Положение на машине<input name="location" value="'+esc(row.location||'')+'" placeholder="Например: вал приводной — левая доступная опора"></label>'+
   dd('Состояние обслуживания','name="state"',[{value:'review',label:'Не установлено / уточнить'},{value:'serviceable',label:'Реально обслуживаемая опора'},{value:'not_serviceable',label:'Не предназначена для внешней смазки (по источнику)'}],row.state||'review')+
   dd('Исходный подшипниковый ТМЦ','name="bearingSourceId"',sourceOptions,row.bearingSourceId||'')+
   '<label class="checkline"><input name="serviceAccessConfirmed" type="checkbox" '+(row.serviceAccessConfirmed?'checked':'')+'> Подтверждены маслёнка/канал и доступ к обслуживанию</label>'+
   '<label>Примечание<input name="notes" value="'+esc(row.notes||'')+'" placeholder="Подшипник герметичный; доступ с торца; фото и др."></label>';
  block.querySelector('[data-pa-delete-position]').onclick=()=>{block.remove();invalidate()};
  block.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',invalidate));
  list.appendChild(block);invalidate();
 }
 const parse=()=>({reportedCount:form.elements.reportedCount.value,
   physicalCountConfirmed:form.elements.physicalCountConfirmed.checked,
   reason:form.elements.reason.value,sourceReference:form.elements.sourceReference.value,
   positions:Array.from(list.children).map(el=>({positionId:el.dataset.positionId,
    location:el.querySelector('[name=location]').value,
    state:el.querySelector('[name=state]').value,
    bearingSourceId:el.querySelector('[name=bearingSourceId]').value,
    serviceAccessConfirmed:el.querySelector('[name=serviceAccessConfirmed]').checked,
    notes:el.querySelector('[name=notes]').value}))});
 const invalidate=()=>{reviewed='';form.querySelector('[data-pa-commit]').disabled=true};
 (old.positions||[]).forEach(add);
 for(const el of form.querySelectorAll('input,textarea,select'))el.addEventListener('input',invalidate);
 form.querySelector('[data-pa-add-position]').onclick=()=>add();
 const checked=()=>{
  const inp=parse(),p=engine.preview(Core.State.getDatabase(),equipment.id,inp);
  const msg=form.querySelector('[data-pa-review]');
  msg.innerHTML='<b>'+esc(p.allowed?'Проверка прошла: '+p.status:'Нужно исправить')+'</b><ul>'+p.errors.map(x=>'<li class="warn">'+esc(x)+'</li>').concat(p.warnings.map(x=>'<li>'+esc(x)+'</li>')).join('')+'</ul>'+
   '<small>Точек создано: 0. Обслуживаемые места могут быть затем выбраны в существующем конструкторе.</small>';
  reviewed=p.allowed?JSON.stringify(inp):'';form.querySelector('[data-pa-commit]').disabled=!p.allowed;
 };
 form.querySelector('[data-pa-check]').onclick=checked;
 form.querySelector('[data-pa-commit]').onclick=()=>{
  const inp=parse();if(reviewed!==JSON.stringify(inp)){warning('Повторно проверьте изменённые данные');checked();return}
  try{const working=Core.DatabaseSchema.clone(Core.State.getDatabase());
   const p=engine.commit(working,equipment.id,inp);
   Core.State.setDatabase(Core.Database.normalize(working));close();redraw();
   warning(p.status==='CONFIRMED'?'Позиции сохранены; выберите реальные места в конструкторе':'Схема сохранена на проверке без создания точек','ok');
  }catch(err){warning(err.message)}
 };
}
function workbookDialog(host,fileData){
 const {dlg}=dialog(host,`<div class="structure-form"><div class="dialog-head"><div><span class="eyebrow">EXCEL — ТОЛЬКО ПРЕДПРОСМОТР</span><h2>Сопоставление карты смазки</h2></div><button type="button" class="icon-btn" data-pa-close aria-label="Закрыть">×</button></div>
 <div class="wizard-note"><b>${esc(fileData.fileName)}</b><span>Строк: ${fileData.parsedRows}. Однозначно найдено код ТМЦ и место: ${fileData.uniquelyMatched}. Требуют инженерного разбора: ${fileData.needsReview}. Даже найденные строки не создают точки автоматически.</span></div>
 <div class="point-accel-workbook-rows">${fileData.rows.slice(0,70).map(row=>'<article class="qa-issue"><b>'+esc(row.equipmentCode||'Без кода')+' / '+esc(row.componentCode||'ТМЦ не указан')+'</b><span>'+esc(row.physicalLocation||'Физическое место неизвестно')+'</span><small>'+esc(row.status)+' · '+esc(row.warnings.join(' · '))+'</small></article>').join('')}</div>
 <p>Показаны первые 70 строк; исходный файл остаётся без изменений. Пункта «импортировать всё» нет намеренно.</p><menu><button class="btn ghost" type="button" data-pa-close>Закрыть</button></menu></div>`);
 return dlg;
}
function install(host,redraw){
 const accel=global.LubricaPointAcceleration; if(!accel||!Core?.State)return;
 const data=Core.State.getDatabase(),line=host.dataset.paLine||'all',kind=host.dataset.paFamily||'all',
   query=host.dataset.paQuery||'',pageNumber=Math.max(0,Number(host.dataset.paPage)||0),
   result=accel.audit(data,{lineId:line,family:kind,query});
 const selected=selectedByHost.get(host)||new Set();selectedByHost.set(host,selected);
 const size=12,totalPages=Math.max(1,Math.ceil(result.rows.length/size)),page=Math.min(pageNumber,totalPages-1),rows=result.rows.slice(page*size,(page+1)*size);
 const section=document.createElement('section');section.className='qa-issues-card point-acceleration';
 section.innerHTML=`<div class="qa-section-head"><div><b>Ускоренное заполнение — инженерная очередь</b><small>Существующие конструкторы · исходные ТМЦ · аналоги линий · проверка количества опор</small></div><small>Только предложения до подтверждения</small></div>
  <div class="point-accel-metrics"><span><b>${result.totalEquipment}</b> записей оборудования</span><span><b>${result.constructorGapHints}</b> возможных пробелов конструкторов</span><span><b>${result.needCandidateReview}</b> машин с ТМЦ на разбор</span><span><b>${result.conveyorUnknownBearings}</b> конвейеров с неподтверждённой схемой подшипников</span></div>
  <details class="point-accel-details" data-pa-panel ${host.dataset.paExpanded==='1'?'open':''}><summary>Развернуть инженерную очередь, аналоги, Excel и подтверждение опор</summary>
  <div class="qa-toolbar point-accel-toolbar">
  ${dd('Линия','data-pa-line',[{value:'all',label:'Все линии'},...result.lines.map(x=>({value:x.id,label:x.name}))],line)}
  ${dd('Семейство','data-pa-family',[{value:'all',label:'Все семейства'},...Object.entries(accel.FAMILIES).map(([k,v])=>({value:k,label:v.label}))],kind)}
  <label><span>Поиск по коду / модели / исходному ТМЦ</span><input data-pa-query value="${esc(query)}" placeholder="Код машины, ID, название"></label>
  <button type="button" class="btn secondary" data-pa-search>Найти</button><button type="button" class="btn ghost" data-pa-reset>Сброс</button>
  <button type="button" class="btn ghost" data-pa-export>CSV всей очереди</button>
  <button type="button" class="btn secondary" data-pa-import>Проверить Excel</button><input type="file" data-pa-file accept=".xlsx" hidden>
  </div><p class="point-accel-disclaimer">Семейства из названий — подсказки, а не установленная конструкция. Количество ТМЦ не доказывает число опор. Перенос норм и утверждений с аналога запрещён без проверки физики и OEM.</p>
  <div class="qa-issues-list point-accel-list">${rows.map(x=>`<article class="qa-issue"><span class="qa-severity">${x.status==='CONSTRUCTOR_GAP'?'Нужен конструктор':x.status==='EXISTING_REVIEW'?'Есть мастер':x.status==='PARTIAL'?'Частично':'Уточнить'}</span>
    <div class="qa-issue-body"><div><b>${esc(x.name)}</b> <code>${esc(x.externalCode||x.id)}</code></div>
      <p>${esc(x.lineName)} · ${esc(x.areaName)} · ${esc(x.familyLabel)}</p>
      <small>ТМЦ требуют разбора: ${x.candidateCount} · Физических точек: ${x.linkedPointCount}${x.bearing?' · '+esc(x.bearing.label):''}</small>
      <small>${esc(x.nextAction)}</small>
      ${x.analogSuggestions.length?'<small>Похожие машины на другой линии: '+x.analogSuggestions.map(a=>esc((a.externalCode||a.equipmentId)+' · '+a.name)).join('; ')+'. Только для сравнения!</small>':''}
      <details class="point-accel-evidence"><summary>Исходные компоненты (${x.components.length})</summary>
       <div class="point-accel-components">${x.components.slice(0,45).map(c=>'<label class="point-accel-component">'+
        (['candidate','review','unclassified'].includes(String(c.candidateState).toLowerCase())&&!c.pointIds.length?'<input type="checkbox" data-pa-component="'+esc(c.sourceId)+'" '+(selected.has(c.sourceId)?'checked':'')+'>':'')+
        '<span><b>'+esc(c.name)+'</b><small>'+esc(c.externalCode||c.sourceId)+' · '+esc(c.candidateState)+' · '+esc(c.category||'категория не задана')+' · точки '+esc(c.pointIds.join(', ')||'нет')+'</small></span></label>').join('')}</div>
       ${x.components.length>45?'<small>Показаны первые 45. Полный список — CSV.</small>':''}</details>
    </div><div class="point-accel-actions"><button type="button" class="mini-btn" data-pa-open="${esc(x.id)}">Открыть оборудование</button>
      ${x.status!=='CONSTRUCTOR_GAP'?'<button type="button" class="mini-btn" data-pa-constructor="'+esc(x.id)+'">Открыть действующий мастер</button>':''}
      ${x.family==='conveyor'?'<button type="button" class="mini-btn" data-pa-bearings="'+esc(x.id)+'">Число и места опор</button>':''}
    </div></article>`).join('')||'<div class="route-empty">По выбранному фильтру оборудования нет.</div>'}</div>
   <div class="qa-toolbar"><button type="button" class="btn ghost" data-pa-prev ${page===0?'disabled':''}>Назад</button><small>Страница ${page+1} из ${totalPages}, машин ${result.rows.length}</small><button type="button" class="btn ghost" data-pa-next ${page+1===totalPages?'disabled':''}>Далее</button></div>
   <div class="point-accel-batch"><b>Пакетное решение без создания точек</b><p>Для отмеченных ТМЦ можно только указать «конструктивный контекст» или «требует уточнения». Исключение из смазки и создание физической точки — только индивидуально.</p>
     <label>Действие<select data-pa-decision><option value="clarify">Требует уточнения</option><option value="context">Конструктивный контекст</option></select></label>
     <label>Обоснование<input data-pa-reason placeholder="Например, вал является конструкцией и не точкой"></label>
     <label>Источник<input data-pa-source placeholder="Осмотр, чертёж или ТМЦ ведомость"></label>
     <button type="button" class="btn secondary" data-pa-batch-check>Проверить отмеченные ТМЦ</button>
     <button type="button" class="btn primary" data-pa-batch-save disabled>Применить проверенное решение</button><section data-pa-batch-review aria-live="polite"></section>
   </div></details>`;
 const first=host.querySelector('.qa-issues-card');if(first)first.before(section);else host.prepend(section);
 const q=key=>section.querySelector(key),resetPage=()=>{host.dataset.paPage='0';redraw()};
 section.querySelector('[data-pa-panel]')?.addEventListener('toggle',e=>{host.dataset.paExpanded=e.target.open?'1':'0'});
 q('[data-pa-line]').onchange=()=>{host.dataset.paLine=q('[data-pa-line]').value;resetPage()};
 q('[data-pa-family]').onchange=()=>{host.dataset.paFamily=q('[data-pa-family]').value;resetPage()};
 q('[data-pa-search]').onclick=()=>{host.dataset.paQuery=q('[data-pa-query]').value;resetPage()};
 q('[data-pa-query]').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();q('[data-pa-search]').click()}};
 q('[data-pa-reset]').onclick=()=>{host.dataset.paLine='all';host.dataset.paFamily='all';host.dataset.paQuery='';resetPage()};
 q('[data-pa-export]').onclick=()=>file('LUBRICA_Инженерная_очередь_точек.csv',accel.csv(accel.audit(data,{})));
 q('[data-pa-import]').onclick=()=>q('[data-pa-file]').click();
 q('[data-pa-file]').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;
  try{const wb=await global.LubricaImport?.readWorkbook?.(f);if(!wb)throw Error('Модуль Excel недоступен');
    const preview=accel.previewWorkbook(Core.State.getDatabase(),wb);workbookDialog(host,preview);
  }catch(err){warning('Не удалось прочитать Excel: '+err.message)}finally{e.target.value=''}
 };
 q('[data-pa-prev]').onclick=()=>{host.dataset.paPage=String(Math.max(0,page-1));redraw()};
 q('[data-pa-next]').onclick=()=>{host.dataset.paPage=String(Math.min(totalPages-1,page+1));redraw()};
 section.querySelectorAll('[data-pa-open]').forEach(el=>el.onclick=()=>{
  if(global.LubricaProgramQAUI?.openIssue)global.LubricaProgramQAUI.openIssue({entityType:'equipment',entityId:el.dataset.paOpen});
  else global.LubricaStructure?.selectEntity?.('equipment',el.dataset.paOpen);
 });
 section.querySelectorAll('[data-pa-constructor]').forEach(el=>el.onclick=()=>{
  global.LubricaCandidateFinalizer?.open?.('equipment',el.dataset.paConstructor)
 });
 section.querySelectorAll('[data-pa-bearings]').forEach(el=>el.onclick=()=>{
  const eq=(Core.State.getDatabase().equipment||[]).find(x=>String(x.id)===String(el.dataset.paBearings));
  if(eq)bearingDialog(host,eq,redraw)
 });
 section.querySelectorAll('[data-pa-component]').forEach(el=>el.onchange=()=>{
  if(el.checked)selected.add(el.dataset.paComponent);else selected.delete(el.dataset.paComponent);
  q('[data-pa-batch-save]').disabled=true;
 });
 const action=q('[data-pa-decision]'),reason=q('[data-pa-reason]'),source=q('[data-pa-source]'),review=q('[data-pa-batch-review]');
 let reviewed='';const inp=()=>({action:action.value,params:{reason:reason.value,sourceReference:source.value}});
 const invalidate=()=>{reviewed='';q('[data-pa-batch-save]').disabled=true};
 for(const el of [action,reason,source])el.addEventListener('input',invalidate);
 const inspect=()=>{
  const v=inp(),p=accel.previewBatchDecisions(Core.State.getDatabase(),[...selected],v.action,v.params);
  review.innerHTML='<b>'+esc(p.allowed?'Проверка готова: '+p.ids.length+' ТМЦ':'Групповое решение заблокировано')+'</b><ul>'+p.errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul>'+
   '<small>Ни одна точка не будет создана; действующие утверждения не изменяются.</small>';
  reviewed=p.allowed?p.signature:'';q('[data-pa-batch-save]').disabled=!p.allowed;
 };
 q('[data-pa-batch-check]').onclick=inspect;
 q('[data-pa-batch-save]').onclick=()=>{const v=inp(),p=accel.previewBatchDecisions(Core.State.getDatabase(),[...selected],v.action,v.params);
  if(!p.allowed||reviewed!==p.signature){invalidate();inspect();warning('Повторно проверьте выбранные ТМЦ');return}
  try{const r=accel.applyBatchDecisions(Core.State.getDatabase(),[...selected],v.action,v.params);
   Core.State.setDatabase(Core.Database.normalize(r.database));selected.clear();redraw();warning('Инженерные решения сохранены; новые точки не создавались','ok');
  }catch(err){warning(err.message)}
 };
}
API.install=install;API.bearingDialog=bearingDialog;
})(window);
