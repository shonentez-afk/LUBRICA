(function(global){
'use strict';
const C=global.LubricaComponents,B=global.LubricaBearings;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sourceLabel=v=>v==='custom'?'Пользовательская запись':v==='builtin'?'Встроенная запись':v==='override'?'Пользовательская запись':String(v||'—');
let query='',category='all',sourceFilter='all';
function render(view){
 if(!view||!C)return;const cats=C.categories(),allRows=C.search(query,category),rows=allRows.filter(x=>sourceFilter==='all'||(sourceFilter==='custom'?x.sourceType==='custom':x.sourceType!=='custom')),custom=C.all().filter(x=>x.sourceType==='custom');
 view.innerHTML=`<section class="module-page bearing-library-page component-library-page">
 <div class="module-header"><div><span class="eyebrow">СПРАВОЧНИК ЭЛЕМЕНТОВ</span><h1>Справочник</h1><p>Подшипники, цепные передачи, редукторы, ШВП, муфты и другие элементы в едином локальном реестре.</p></div><div class="route-actions"><button class="btn primary" id="componentAdd">＋ Добавить запись</button></div></div>
 <div class="bearing-library-summary"><div><span>Категории</span><strong>${cats.length}</strong><small>единый реестр</small></div><div><span>Записи</span><strong>${C.all().length}</strong><small>встроенные + пользовательские</small></div><div><span>Пользовательские</span><strong>${custom.length}</strong><small>в текущем JSON</small></div></div>
 <div class="component-library-toolbar"><input id="componentSearch" placeholder="Обозначение, модель, производитель…" value="${esc(query)}"><select id="componentCategory"><option value="all">Все категории</option>${cats.map(x=>`<option value="${x.id}" ${category===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select><select id="componentSource"><option value="all" ${sourceFilter==='all'?'selected':''}>Все записи</option><option value="custom" ${sourceFilter==='custom'?'selected':''}>Сохранённые пользователем</option><option value="builtin" ${sourceFilter==='builtin'?'selected':''}>Встроенные</option></select></div>
 <div class="bearing-table-wrap"><table class="bearing-table"><thead><tr><th>Категория</th><th>Обозначение / модель</th><th>Производитель</th><th>Технические данные</th><th>Источник</th><th></th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td><strong>${esc(x.categoryTitle)}</strong></td><td><strong>${esc(x.designation||x.model||x.name||'—')}</strong>${x.name&&x.name!==x.designation?`<small>${esc(x.name)}</small>`:''}</td><td>${esc(x.manufacturer||'—')}</td><td><small>${esc(formatTechnical(x))}</small></td><td><small>${esc(x.sourceReference||sourceLabel(x.sourceType))}</small></td><td><div class="component-row-actions"><button class="mini-btn" data-view-component="${esc(x.id)}" data-view-category="${esc(x.category)}">Просмотр</button>${x.sourceType==='custom'?`<button class="mini-btn" data-edit-component="${esc(x.id)}" data-edit-category="${esc(x.category)}">Изменить</button>`:''}</div></td></tr>`).join(''):`<tr><td colspan="6" class="empty-cell">Записей нет. Добавьте подтверждённую запись или выберите другую категорию.</td></tr>`}</tbody></table></div>
 <div class="bearing-source-note"><b>Принцип.</b> Справочник хранит идентификацию, геометрию и подтверждённые OEM-данные. Фактически утверждённые нормы конкретной точки смазки остаются в точке и её расчёте.</div></section>`;
 view.querySelector('#componentSearch')?.addEventListener('input',e=>{query=e.target.value;render(view)});
 view.querySelector('#componentCategory')?.addEventListener('change',e=>{category=e.target.value;render(view)});
 view.querySelector('#componentSource')?.addEventListener('change',e=>{sourceFilter=e.target.value;render(view)});
 view.querySelector('#componentAdd')?.addEventListener('click',()=>openEditor());
 view.querySelectorAll('[data-view-component]').forEach(b=>b.onclick=()=>openViewer(b.dataset.viewComponent,b.dataset.viewCategory));
 view.querySelectorAll('[data-edit-component]').forEach(b=>b.onclick=()=>openEditor(b.dataset.editComponent,b.dataset.editCategory));
}
function formatTechnical(x){
 const t=x.technicalData||{};
 if(x.category==='bearing'&&t.d!=null)return `d ${t.d} · D ${t.D} · B ${t.B} мм${t.bearingType?` · ${t.bearingType}`:''}`;
 if(x.category==='linear_bearing')return [t.shaftDiameterMm?`вал Ø${t.shaftDiameterMm} мм`:'',t.outerDiameterMm?`наружный Ø${t.outerDiameterMm} мм`:'',t.lengthMm?`L ${t.lengthMm} мм`:'',t.railSize||''].filter(Boolean).join(' · ')||'—';
 if(x.category==='chain')return [t.pitchMm?`шаг ${t.pitchMm} мм`:'',t.strandCount?`${t.strandCount} ряд.`:'',t.insideWidthMm?`внутр. ширина ${t.insideWidthMm} мм`:'',t.rollerDiameterMm?`ролик Ø${t.rollerDiameterMm} мм`:''].filter(Boolean).join(' · ')||'—';
 if(x.category==='gearbox_oil'){
   const fills=t.mountingFillLiters;
   if(fills)return Object.entries(fills).map(([k,v])=>`${k}: ${v} л`).join(' · ');
   return [t.ratio?`i=${t.ratio}`:'',t.mountingPosition||'',t.oemFillLiters?`${t.oemFillLiters} л`:'' ].filter(Boolean).join(' · ')||'—';
 }
 if(x.category==='ball_screw')return [t.diameterMm?`Ø${t.diameterMm} мм`:'',t.leadMm?`ход ${t.leadMm} мм`:'' ,t.nutType||''].filter(Boolean).join(' · ')||'—';
 if(x.category==='coupling')return [t.couplingType||'',t.size?`размер ${t.size}`:'',t.cavityVolumeCm3?`полость ${t.cavityVolumeCm3} см³`:''].filter(Boolean).join(' · ')||'—';
 return [t.pitchMm?`шаг ${t.pitchMm} мм`:'',t.diameterMm?`Ø ${t.diameterMm} мм`:'',t.ratio?`i=${t.ratio}`:''].filter(Boolean).join(' · ')||x.standard||'—'
}
function technicalFields(categoryId,data={}){const def=C.categories().find(x=>x.id===categoryId),fields=def?.fields||[];return fields.map(f=>`<label>${esc(f.label)}${f.unit?` <small>${esc(f.unit)}</small>`:''}<input data-tech="${esc(f.key)}" type="${f.type==='number'?'number':'text'}" step="any" value="${esc(data?.[f.key]??'')}" placeholder="${esc(f.placeholder||'')}"></label>`).join('')||'<div class="bearing-source-note span-2">Для категории нет специализированных полей.</div>'}
function lubricationFields(data={}){return `<label>Тип источника<select data-lube="sourceType"><option value="oem" ${data.sourceType!=='measured'&&data.sourceType!=='engineer'?'selected':''}>OEM / руководство</option><option value="measured" ${data.sourceType==='measured'?'selected':''}>Измерение</option><option value="engineer" ${data.sourceType==='engineer'?'selected':''}>Решение инженера</option></select></label><label>OEM материал<input data-lube="material" value="${esc(data.material||'')}" placeholder="обозначение / класс"></label><label>OEM вязкость / NLGI<input data-lube="grade" value="${esc(data.grade||'')}"></label><label>OEM количество<input data-lube="quantity" type="number" step="any" value="${esc(data.quantity??'')}"></label><label>Ед. количества<input data-lube="quantityUnit" value="${esc(data.quantityUnit||'')}" placeholder="г / мл / л"></label><label>OEM интервал<input data-lube="interval" type="number" step="any" value="${esc(data.interval??'')}"></label><label>Ед. интервала<input data-lube="intervalUnit" value="${esc(data.intervalUnit||'')}" placeholder="ч / дней / мес."></label>`}
function getEntry(id,category){
 if(category==='bearing'){
   const all=C.all('bearing');return all.find(x=>String(x.id)===String(id))||null;
 }
 return C.all(category).find(x=>String(x.id)===String(id))||null;
}
function dataRows(obj={},labels={}){
 return Object.entries(obj).filter(([,v])=>v!==''&&v!=null&&typeof v!=='object').map(([k,v])=>`<div><span>${esc(labels[k]||k)}</span><b>${esc(v)}</b></div>`).join('');
}
function technicalLabels(category){const def=C.categories().find(x=>x.id===category);return Object.fromEntries((def?.fields||[]).map(f=>[f.key,`${f.label}${f.unit?' ('+f.unit+')':''}`]));}
const lubricationLabels={sourceType:'Тип источника',material:'Материал',grade:'Вязкость / NLGI',quantity:'Количество',quantityUnit:'Единица количества',interval:'Интервал',intervalUnit:'Единица интервала',density:'Плотность',densitySource:'Источник плотности'};
function openViewer(id,category){
 const dlg=document.getElementById('actionDialog');if(!dlg)return;
 const x=getEntry(id,category);if(!x)return;
 const t=x.technicalData||{},l=x.lubricationData||{};
 const cat=C.categories().find(c=>c.id===category);
 dlg.innerHTML=`<div class="component-viewer">
   <div class="dialog-head"><div><span class="eyebrow">СПРАВОЧНИК</span><h2>${esc(x.designation||x.model||x.name||'Запись')}</h2><p class="dialog-copy">${esc(cat?.title||category)}${x.manufacturer?' · '+esc(x.manufacturer):''}</p></div><button type="button" class="icon-btn" data-close>×</button></div>
   <div class="component-view-summary">
     <div><span>Наименование</span><b>${esc(x.name||'—')}</b></div>
     <div><span>Обозначение / модель</span><b>${esc(x.designation||x.model||'—')}</b></div>
     <div><span>Производитель</span><b>${esc(x.manufacturer||'—')}</b></div>
     <div><span>Стандарт</span><b>${esc(x.standard||'—')}</b></div>
   </div>
   <h3>Технические данные</h3><div class="component-view-data">${dataRows(t,technicalLabels(category))||'<span class="field-help">Дополнительные технические данные не заданы.</span>'}</div>
   <h3>OEM-данные смазки</h3><div class="component-view-data">${dataRows(l,lubricationLabels)||'<span class="field-help">OEM-данные смазки не заданы.</span>'}</div>
   <div class="component-view-source"><span>Источник / документ</span><b>${esc(x.sourceReference||'—')}</b>${x.notes?`<small>${esc(x.notes)}</small>`:''}</div>
   <menu><button type="button" class="btn ghost" data-close>Закрыть</button>${x.sourceType==='custom'?`<button type="button" class="btn primary" data-edit>Изменить</button>`:''}</menu>
 </div>`;
 dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());
 dlg.querySelector('[data-edit]')?.addEventListener('click',()=>{dlg.close();openEditor(id,category)});
 dlg.showModal();
}
function openEditor(id=null,categoryHint=null){
 const dlg=document.getElementById('actionDialog');if(!dlg)return;
 const bearingExisting=id&&categoryHint==='bearing'?B?.getOverrides?.().find(x=>x.id===id):null;
 const existing=bearingExisting|| (id?C.getCustom().find(x=>x.id===id):null);
 const cats=C.categories();
 dlg.innerHTML=`<form class="bearing-dialog bearing-editor-form" id="componentEditor" novalidate><div class="dialog-head"><div><span class="eyebrow">СПРАВОЧНИК</span><h2>${existing?'Изменить':'Добавить'} запись</h2><p class="dialog-copy">Вносите только подтверждённые технические/OEM-данные. Утверждённые нормы конкретного оборудования сюда не переносятся.</p></div><button type="button" class="icon-btn" data-close>×</button></div>
 <div class="bearing-editor-grid"><label>Категория<select name="category" ${existing?'disabled':''}>${cats.map(x=>`<option value="${x.id}" ${(bearingExisting?'bearing':existing?.category||categoryHint)===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select>${existing?'<small class="field-help">Категория фиксируется при создании записи, чтобы не создавать дубликаты при смене типа элемента.</small>':''}</label><label>Обозначение<input name="designation" value="${esc(existing?.designation||'')}"></label><label>Наименование<input name="name" value="${esc(existing?.name||'')}"></label><label>Производитель<input name="manufacturer" value="${esc(existing?.manufacturer||'')}"></label><label>Модель / серия<input name="model" value="${esc(existing?.model||'')}"></label><label>Стандарт<input name="standard" value="${esc(existing?.standard||'')}"></label></div><h3>Технические данные</h3><div class="bearing-editor-grid" data-technical-fields></div><h3>OEM-данные смазки</h3><div class="bearing-editor-grid" data-lubrication-fields>${lubricationFields(existing?.lubricationData||{})}</div><div class="bearing-editor-grid"><label class="span-2">Источник / документ<input name="sourceReference" value="${esc(existing?.sourceReference||'')}" placeholder="Каталог, паспорт, руководство OEM"></label><label class="span-2">Примечание<textarea name="notes">${esc(existing?.notes||'')}</textarea></label></div>
 <menu><button type="button" class="btn ghost" data-close>Отмена</button>${existing?'<button type="button" class="btn danger" data-delete>Удалить</button>':''}<button type="button" class="btn primary" data-save>Сохранить</button></menu></form>`;
 const f=dlg.querySelector('#componentEditor'),tech=f.querySelector('[data-technical-fields]');
 const existingCategory=bearingExisting?'bearing':existing?.category;
 const initialTech=bearingExisting?{d:bearingExisting.d,D:bearingExisting.D,B:bearingExisting.B,bearingType:bearingExisting.bearingType||'',sealing:bearingExisting.sealing||''}:existing?.technicalData||{};
 const drawTech=()=>{tech.innerHTML=technicalFields(f.elements.category.value,f.elements.category.value===existingCategory?initialTech:{})};drawTech();if(!existing)f.elements.category.addEventListener('change',drawTech);f.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());
 f.querySelector('[data-save]').onclick=()=>{
   const technicalData={},lubricationData={};
   f.querySelectorAll('[data-tech]').forEach(el=>{if(el.value!=='')technicalData[el.dataset.tech]=el.type==='number'?Number(el.value):el.value.trim()});
   f.querySelectorAll('[data-lube]').forEach(el=>{if(el.value!=='')lubricationData[el.dataset.lube]=el.type==='number'?Number(el.value):el.value.trim()});
   const selectedCategory=f.elements.category.value;
   if(selectedCategory==='bearing'){
     const designation=f.elements.designation.value.trim();
     const d=Number(technicalData.d),D=Number(technicalData.D),Bwidth=Number(technicalData.B);
     if(!designation){global.LubricaApp?.showToast?.('Укажите обозначение подшипника','warn');return}
     if(!(d>0&&D>d&&Bwidth>0)){global.LubricaApp?.showToast?.('Для подшипника укажите корректные d / D / B','warn');return}
     B.saveOverride({id:bearingExisting?.id,designation,d,D,B:Bwidth,bearingType:technicalData.bearingType||'unknown',manufacturer:f.elements.manufacturer.value,sourceReference:f.elements.sourceReference.value,notes:f.elements.notes.value});
   }else{
     C.save({id:existing?.id,category:selectedCategory,designation:f.elements.designation.value,name:f.elements.name.value,manufacturer:f.elements.manufacturer.value,model:f.elements.model.value,standard:f.elements.standard.value,sourceReference:f.elements.sourceReference.value,notes:f.elements.notes.value,technicalData,lubricationData});
   }
   dlg.close();render(document.getElementById('bearings'))
 };
 f.querySelector('[data-delete]')?.addEventListener('click',()=>{if(categoryHint==='bearing'||existing?.source==='user_override')B.deleteOverride(existing.id);else C.remove(existing.id);dlg.close();render(document.getElementById('bearings'))});dlg.showModal();
}
global.renderComponents=render;global.LubricaComponentLibraryUI=Object.freeze({render,openEditor,openViewer});
})(window);
