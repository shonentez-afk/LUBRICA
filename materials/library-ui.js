"use strict";
/* Stage 3.6 — normalized point/task card, material library and calibrated tools */
const taskStatusLabels36={draft:'Черновик',review:'Требует проверки',approved:'Утверждено',disabled:'Отключено'};
const pointStatusLabels36={candidate:'Кандидат',review:'На проверке',confirmed:'Подтверждена',not_serviced:'Не обслуживается',retired:'Выведена'};
function db36(){return window.LubricaCore?.State?.getDatabase?.()}
function item36(arr,id){return (arr||[]).find(x=>String(x.id)===String(id))}
function currentTask36(){const d=db36(),p=current();return d&&p?(d.tasks||[]).find(t=>String(t.id)===String(taskKey(p))):null}
function currentPoint36(){const d=db36(),t=currentTask36();return d&&t?item36(d.lubricationPoints,t.lubricationPointId):null}
function material36(id){return item36(db36()?.materials,id)}
function materialOptions36(selected='',includeEmpty=true){const d=db36();const mats=(d?.materials||[]).filter(m=>m.status!=='retired'||String(m.id)===String(selected));return `${includeEmpty?'<option value="">Выберите материал</option>':''}${mats.map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(selected)?'selected':''}>${esc(m.code||m.id)} · ${esc(m.name)}${m.status==='retired'?' (выведен)':''}</option>`).join('')}`}
function taskNeedsMaterial36(value){const C=window.LubricaStructureContext;if(C?.activityCatalog?.[value])return C.activityNeedsMaterial(value);const type=C?.activityTypeForLabel?.(value);if(type&&type!=='custom')return C.activityNeedsMaterial(type);return !/контроль|проверка|осмотр|отбор|очист|фильтрац/i.test(String(value||''))}
function effectiveMaterialId36(task,lp){if(!task||task.materialMode==='none')return null;return task.materialMode==='explicit'?task.materialId:(lp?.targetMaterialId||null)}
function toolOptions36(materialId,selected=''){const d=db36();const opts=(d?.tools||[]).filter(t=>(t.status==='active'||!t.status||String(t.id)===String(selected))&&(!t.materialId||(materialId&&String(t.materialId)===String(materialId))));return `<option value="">Не назначен</option>${opts.map(t=>`<option value="${esc(t.id)}" ${String(t.id)===String(selected)?'selected':''}>${esc(t.code||t.id)} · ${esc(t.name||TOOL_TYPES36[t.type]?.label||'Инструмент')}</option>`).join('')}`}
function refreshToolSelector36(){const task=currentTask36(),lp=currentPoint36();if(!task||!lp||!$('#fTool'))return;const mode=$('#fMaterialMode').value;const matId=mode==='explicit'?$('#fMaterial').value:mode==='point_target'?$('#fTargetMaterial').value:null;const old=$('#fTool').value||task.toolId||'';$('#fTool').innerHTML=toolOptions36(matId,old);if(old&&Array.from($('#fTool').options).some(o=>o.value===old))$('#fTool').value=old;const tool=item36(db36()?.tools,$('#fTool').value),def=tool&&TOOL_TYPES36[tool.type];const hint=$('#toolCalibrationHint');if(!tool){hint.textContent=matId?'Выберите совместимое средство подачи или контроля.':'Сначала задайте материал, если мероприятие связано с его подачей.';return}const mat=material36(tool.materialId),cal=Number(tool.calibrationValue??tool.gramsPerStroke)||0,unit=tool.calibrationUnit||(tool.gramsPerStroke?'г/качок':'');const q=Number(String($('#fQuantity')?.value||'').replace(',','.')),qUnit=$('#fUnitMeasure')?.value;let calc='';if(cal&&unit==='г/качок'&&q>0&&qUnit==='г')calc=` · ${q} г ≈ ${(q/cal).toLocaleString('ru-RU',{maximumFractionDigits:1})} кач.`;else if(cal&&unit==='г/качок'&&q>0&&qUnit==='качков')calc=` · ${q} кач. ≈ ${(q*cal).toLocaleString('ru-RU',{maximumFractionDigits:1})} г`;hint.textContent=`${def?.label||'Инструмент'}${mat?` · закреплён за ${mat.name}`:''}${cal?` · ${cal} ${unit}`:''}${calc}`}

function refreshMaterialMode36(){const mode=$('#fMaterialMode')?.value||'explicit',wrap=$('#materialSelectWrap'),lp=currentPoint36(),targetOption=$('#fMaterialMode')?.querySelector('option[value="point_target"]');if(wrap)wrap.style.display=mode==='explicit'?'block':'none';if(targetOption){const hasTarget=!!lp?.targetMaterialId;targetOption.disabled=!hasTarget;targetOption.textContent=hasTarget?`Наследовать TARGET точки · ${material36(lp.targetMaterialId)?.name||lp.targetMaterialId}`:'Наследовать TARGET точки (TARGET не задан)'}refreshToolSelector36()}


function toolFor(p){if(p.toolName)return p.toolName;const d=db36(),t=(d?.tasks||[]).find(x=>String(x.id)===String(taskKey(p))),tool=t&&item36(d.tools,t.toolId);return tool?.name||'Инструмент не назначен'}

function materialUsage36(d,id){return (d.tasks||[]).filter(t=>t.materialId===id||(t.materialMode!=='explicit'&&(d.lubricationPoints||[]).find(lp=>lp.id===t.lubricationPointId)?.targetMaterialId===id)).length}
function toolUsage36(d,id){return (d.tasks||[]).filter(t=>t.toolId===id).length}
function nextDisplayCode36(prefix,arr){const re=new RegExp(`^${prefix}-(\\d+)$`,'i');let max=0;(arr||[]).forEach(x=>{const m=String(x.code||'').match(re);if(m)max=Math.max(max,Number(m[1])||0)});return `${prefix}-${String(max+1).padStart(3,'0')}`}
function materialPrefix36(kind){return kind==='Пластичная смазка'?'GRE':kind==='Редукторное масло'?'GEAR':kind==='Цепное масло'?'CHN':kind==='Гидравлическое масло'?'HYD':'MAT'}
const MATERIAL_SYMBOLS36=[
 {value:'●',label:'Круг заполненный'},{value:'○',label:'Круг контурный'},
 {value:'■',label:'Квадрат заполненный'},{value:'□',label:'Квадрат контурный'},
 {value:'▲',label:'Треугольник вверх'},{value:'△',label:'Треугольник вверх контур'},
 {value:'▼',label:'Треугольник вниз'},{value:'▽',label:'Треугольник вниз контур'},
 {value:'◆',label:'Ромб заполненный'},{value:'◇',label:'Ромб контурный'},
 {value:'★',label:'Звезда заполненная'},{value:'☆',label:'Звезда контурная'},
 {value:'✚',label:'Крест'},{value:'✖',label:'Косой крест'},
 {value:'⬟',label:'Пятиугольник'},{value:'⬢',label:'Шестиугольник'},
 {value:'◉',label:'Круг с точкой'},{value:'◎',label:'Двойной круг'},
 {value:'⊙',label:'Мишень'},{value:'▰',label:'Прямоугольник'},
 {value:'▮',label:'Вертикальная метка'},{value:'▬',label:'Горизонтальная метка'},
 {value:'✦',label:'Четырёхлучевая звезда'},{value:'✿',label:'Цветок'}
];
function materialSymbolOptions36(selected=''){
 const values=new Set(MATERIAL_SYMBOLS36.map(x=>x.value)),extra=selected&&!values.has(selected)?`<option value="${esc(selected)}" selected>${esc(selected)} · Существующая маркировка</option>`:'';
 return `<option value="">Не задан</option>${extra}${MATERIAL_SYMBOLS36.map(x=>`<option value="${esc(x.value)}" ${x.value===selected?'selected':''}>${esc(x.value)} · ${esc(x.label)}</option>`).join('')}`;
}
function labelSafe36(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function labelMarkup36(kind,item,material=null){
 const isTool=kind==='tool',m=isTool?material:item,color=m?.color||'#555555',symbol=m?.symbol||'●';
 const title=isTool?(item.name||TOOL_TYPES36[item.type]?.label||'Инструмент'):(item.name||'Материал');
 const code=item.code||item.id||'',matLine=isTool?(m?`${m.code||m.id||''} · ${m.name||''}`:'Материал не закреплён'):(item.kind||'Смазочный материал');
 const sub=isTool?[TOOL_TYPES36[item.type]?.label,item.serial?`№ ${item.serial}`:''].filter(Boolean).join(' · '):[item.manufacturer,item.nlgi?`NLGI ${item.nlgi}`:'',item.isoVg?`ISO VG ${item.isoVg}`:''].filter(Boolean).join(' · ');
 return `<div class="lubrica-label"><div class="label-mark" style="border-color:${labelSafe36(color)};color:${labelSafe36(color)}"><span>${labelSafe36(symbol)}</span></div><div class="label-body"><div class="label-code">${labelSafe36(code)}</div><div class="label-title">${labelSafe36(title)}</div><div class="label-material" style="border-left-color:${labelSafe36(color)}">${labelSafe36(matLine)}</div>${sub?`<div class="label-sub">${labelSafe36(sub)}</div>`:''}</div></div>`;
}
function printLubricationLabel36(kind,item){
 const m=kind==='tool'?material36(item.materialId):item;
 const w=window.open('','_blank','width=720,height=520');
 if(!w){toast('Браузер заблокировал окно печати. Разрешите всплывающие окна для этого файла.','warn');return}
 const title=kind==='tool'?'Этикетка инструмента':'Этикетка материала';
 w.document.open();
 w.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${title}</title><style>
 @page{size:60mm 30mm;margin:0}
 *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-family:"Segoe UI",Arial,sans-serif}
 body{width:60mm;height:30mm;display:flex;align-items:stretch;justify-content:stretch}
 .lubrica-label{width:60mm;height:30mm;border:0.35mm solid #20272b;display:grid;grid-template-columns:15mm 1fr;overflow:hidden;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 .label-mark{display:grid;place-items:center;border-right:2.3mm solid;background:#fff;font-weight:900}
 .label-mark span{font-size:10mm;line-height:1}
 .label-body{padding:2.2mm 2.4mm 1.8mm;min-width:0;display:flex;flex-direction:column}
 .label-code{font-size:3.5mm;font-weight:900;letter-spacing:.08em;line-height:1.05}
 .label-title{font-size:3.4mm;font-weight:800;line-height:1.1;margin-top:1.1mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .label-material{font-size:2.75mm;font-weight:800;line-height:1.2;margin-top:1.7mm;padding-left:1.5mm;border-left:1.3mm solid;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .label-sub{font-size:2.2mm;line-height:1.15;margin-top:auto;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 @media screen{body{margin:20px auto;box-shadow:0 4px 20px rgba(0,0,0,.18)}}
 </style></head><body>${labelMarkup36(kind,item,m)}<script>window.onload=()=>{setTimeout(()=>window.print(),120)}<\/script></body></html>`);
 w.document.close();
}
const TOOL_TYPES36={
 grease_gun:{label:'Ручной шприц',prefix:'GG',material:'grease',calibration:'г/качок',applications:'Подшипники, шарниры, втулки'},
 battery_grease_gun:{label:'Аккумуляторный шприц',prefix:'BGG',material:'grease',calibration:'г/качок',applications:'Подшипники, удалённые точки'},
 pneumatic_grease_gun:{label:'Пневматический шприц',prefix:'PGG',material:'grease',calibration:'г/качок',applications:'Подшипники, большие объёмы'},
 metered_grease_gun:{label:'Дозирующий шприц / счётчик смазки',prefix:'MGG',material:'grease',calibration:'г/качок',applications:'Точная дозировка подшипников'},
 grease_transfer_pump:{label:'Насос подачи пластичной смазки',prefix:'GP',material:'grease',calibration:'г/цикл',applications:'Заполнение, централизованные системы'},
 single_point_lubricator:{label:'Одноточечный автоматический лубрикатор',prefix:'SPL',material:'any',calibration:'мл/сутки',applications:'Подшипники, электродвигатели, цепи'},
 multi_point_lubricator:{label:'Многоточечный лубрикатор / насос',prefix:'MPL',material:'any',calibration:'мл/цикл',applications:'Группы точек, централизованная подача'},
 oil_can:{label:'Ручная маслёнка',prefix:'OC',material:'oil',calibration:'мл/ход',applications:'Цепи, шарниры, направляющие'},
 oil_transfer_pump:{label:'Насос перекачки масла',prefix:'OTP',material:'oil',calibration:'л/мин',applications:'Редукторы, маслостанции'},
 metered_oil_gun:{label:'Раздаточный пистолет со счётчиком',prefix:'MOG',material:'oil',calibration:'мл/импульс',applications:'Редукторы, точный долив'},
 filter_cart:{label:'Фильтровальная установка / фильтр-тележка',prefix:'FC',material:'oil',calibration:'л/мин',applications:'Редукторы, масляные системы'},
 oil_sampler:{label:'Насос / устройство отбора проб масла',prefix:'OS',material:'oil',calibration:'',applications:'Редукторы, гидросистемы'},
 chain_brush:{label:'Кисть / щётка для цепи',prefix:'CB',material:'oil',calibration:'',applications:'Ручная смазка цепей'},
 chain_drip:{label:'Капельная маслёнка для цепи',prefix:'CD',material:'oil',calibration:'кап/мин',applications:'Цепи'},
 chain_spray:{label:'Распылительная система / форсунка',prefix:'CS',material:'oil',calibration:'мл/цикл',applications:'Цепи, открытые передачи'},
 chain_auto:{label:'Автоматическая система смазки цепи',prefix:'CA',material:'oil',calibration:'мл/цикл',applications:'Конвейерные и приводные цепи'},
 general:{label:'Прочий инструмент',prefix:'TL',material:'any',calibration:'',applications:'Прочие операции'}
};
function isGreaseMaterial36(m){return /смазк/i.test(m?.kind||'')}
function isOilMaterial36(m){return /масл/i.test(m?.kind||'')}
function toolTypeOptions36(selected=''){return Object.entries(TOOL_TYPES36).map(([k,v])=>`<option value="${k}" ${k===selected?'selected':''}>${esc(v.label)}</option>`).join('')}
function compatibleMaterials36(type,d){const rule=TOOL_TYPES36[type]?.material||'any';return (d.materials||[]).filter(m=>m.status!=='retired'&&(rule==='any'||(rule==='grease'&&isGreaseMaterial36(m))||(rule==='oil'&&isOilMaterial36(m))))}
function autoToolName36(type,code){return `${TOOL_TYPES36[type]?.label||'Инструмент'} ${code}`}
// Stage 3.7: expanded material/tool reference libraries
const MATERIAL_KINDS37={
 'Пластичная смазка':{prefix:'GRE',group:'grease'},
 'Редукторное масло':{prefix:'GEAR',group:'oil'},
 'Цепное масло':{prefix:'CHN',group:'oil'},
 'Гидравлическое масло':{prefix:'HYD',group:'oil'},
 'Компрессорное масло':{prefix:'COMP',group:'oil'},
 'Циркуляционное масло':{prefix:'CIRC',group:'oil'},
 'Паста / монтажная смазка':{prefix:'PST',group:'paste'},
 'Сухая смазка':{prefix:'DRY',group:'other'},
 'Другое':{prefix:'MAT',group:'other'}
};
Object.assign(TOOL_TYPES36,{
 grease_fitting_coupler:{label:'Насадка / муфта для пресс-маслёнки',prefix:'GFC',material:'grease',calibration:'',applications:'Подшипники, шарниры'},
 grease_meter:{label:'Счётчик / дозатор пластичной смазки',prefix:'GM',material:'grease',calibration:'г/импульс',applications:'Контроль дозы пластичной смазки'},
 grease_transfer_pump:{label:'Бочковой насос пластичной смазки',prefix:'GTP',material:'grease',calibration:'г/ход',applications:'Заправка шприцов и систем'},
 grease_packer:{label:'Устройство набивки подшипников',prefix:'GBP',material:'grease',calibration:'г/цикл',applications:'Полная замена / первичная набивка подшипников'},
 oil_funnel:{label:'Воронка / закрытая заливная ёмкость',prefix:'OF',material:'oil',calibration:'',applications:'Редукторы, масляные полости'},
 oil_container:{label:'Переносная ёмкость для масла',prefix:'OCT',material:'oil',calibration:'л',applications:'Чистая транспортировка и долив масла'},
 oil_leveler:{label:'Маслёнка постоянного уровня',prefix:'COL',material:'oil',calibration:'мл',applications:'Подшипниковые корпуса, редукторы'},
 vacuum_dehydrator:{label:'Вакуумный дегидратор масла',prefix:'VD',material:'oil',calibration:'л/мин',applications:'Удаление воды из масел'},
 flushing_unit:{label:'Установка промывки / циркуляции масла',prefix:'FLU',material:'oil',calibration:'л/мин',applications:'Редукторы, маслосистемы'},
 chain_oiler:{label:'Ручной аппликатор для цепи',prefix:'CHO',material:'oil',calibration:'мл/ход',applications:'Цепи'},
 spray_gun:{label:'Ручной распылитель / пистолет',prefix:'SPG',material:'any',calibration:'мл/мин',applications:'Цепи, открытые передачи'},
 ultrasonic_device:{label:'Ультразвуковой прибор',prefix:'USD',material:'any',calibration:'',applications:'Контроль подшипников при досмазывании'},
 thermometer:{label:'Термометр / пирометр',prefix:'TMP',material:'any',calibration:'',applications:'Контроль температуры узлов'},
 inspection_tool:{label:'Инспекционный инструмент',prefix:'INS',material:'any',calibration:'',applications:'Контроль уровня, состояния и доступности'}
});
function matPrefix37(kind){return MATERIAL_KINDS37[kind]?.prefix||'MAT'}
function materialDialog36(view,item=null){
 const d=db36(),edit=!!item,initialKind=item?.kind||'Пластичная смазка',initialCode=item?.code||nextDisplayCode36(matPrefix37(initialKind),d.materials);
 openAction(edit?'Материал':'Новый материал',edit?'Карточка материала. Технические параметры используются при выборе, проверках и расчётах.':'Код назначается автоматически по типу материала.',[
 {label:'Отмена',kind:'ghost'},
 {label:edit?'Сохранить':'Добавить',kind:'primary',run:()=>{
   const name=$('#libMatName').value.trim(),kind=$('#libMatKind').value;if(!name){toast('Введите наименование материала','warn');return false}
   const x=item||{},code=item?.code||nextDisplayCode36(matPrefix37(kind),d.materials);
   Object.assign(x,{id:x.id||LubricaCore.IDs.nextFrom(d.materials,'MAT',4),code,name,kind,manufacturer:$('#libMatManufacturer').value.trim(),productCode:$('#libMatProductCode').value.trim(),nlgi:$('#libMatNlgi').value.trim(),isoVg:$('#libMatIsoVg').value.trim(),thickener:$('#libMatThickener').value.trim(),baseOil:$('#libMatBaseOil').value.trim(),baseViscosity40:$('#libMatVis40').value.trim(),density:$('#libMatDensity').value.trim(),densitySource:$('#libMatDensitySource').value.trim(),sourceReference:$('#libMatSourceReference').value.trim(),tempMin:$('#libMatTmin').value.trim(),tempMax:$('#libMatTmax').value.trim(),foodGrade:$('#libMatFood').checked,ep:$('#libMatEP').checked,waterResistance:$('#libMatWater').value,packageSize:$('#libMatPackage').value.trim(),packageUnit:$('#libMatPackageUnit').value,color:$('#libMatColor').value||'#e6a42a',symbol:$('#libMatSymbol').value,approved:$('#libMatApproved').checked,status:$('#libMatStatus').value,notes:$('#libMatNotes').value.trim()});
   if(!item)d.materials.push(x);LubricaCore.State.setDatabase(d);state=LubricaCore.Database.toLegacy(d);renderMaterials(view);toast(edit?'Материал изменён':`Материал добавлен: ${code}`)
 }}],`<div class="catalog-editor-form material-editor-form"><div class="form-grid"><label>Номер<input id="libMatCode" value="${esc(initialCode)}" readonly></label><label>Тип<select id="libMatKind">${Object.keys(MATERIAL_KINDS37).map(k=>`<option ${k===initialKind?'selected':''}>${esc(k)}</option>`).join('')}</select></label></div>
 <label class="catalog-span-2">Наименование *<input id="libMatName" value="${esc(item?.name||'')}"></label>
 <div class="form-grid"><label>Производитель<input id="libMatManufacturer" value="${esc(item?.manufacturer||'')}"></label><label>Артикул / код производителя<input id="libMatProductCode" value="${esc(item?.productCode||'')}"></label></div>
 <div class="form-grid"><label>NLGI<input id="libMatNlgi" value="${esc(item?.nlgi||'')}" placeholder="0, 1, 2..."></label><label>ISO VG<input id="libMatIsoVg" value="${esc(item?.isoVg||'')}" placeholder="68, 220, 320..."></label></div>
 <div class="form-grid"><label>Загуститель<input id="libMatThickener" value="${esc(item?.thickener||'')}" placeholder="Li, Li-complex, CaSul..."></label><label>Базовое масло<input id="libMatBaseOil" value="${esc(item?.baseOil||'')}" placeholder="Минеральное, PAO..."></label></div>
 <div class="form-grid"><label>Вязкость базового масла @40°C<input id="libMatVis40" value="${esc(item?.baseViscosity40||'')}"></label><label>Плотность, г/см³<input id="libMatDensity" value="${esc(item?.density||'')}" placeholder="только из паспорта / SDS / TDS"></label></div><div class="form-grid"><label>Источник плотности<input id="libMatDensitySource" value="${esc(item?.densitySource||'')}" placeholder="TDS / SDS / паспорт"></label><label>Источник данных материала<input id="libMatSourceReference" value="${esc(item?.sourceReference||'')}"></label></div><div class="form-grid"><label>Температура, °C<div class="inline-fields"><input id="libMatTmin" value="${esc(item?.tempMin||'')}" placeholder="min"><input id="libMatTmax" value="${esc(item?.tempMax||'')}" placeholder="max"></div></label></div>
 <div class="form-grid"><label>Водостойкость<select id="libMatWater"><option value="">Не указано</option><option ${item?.waterResistance==='низкая'?'selected':''}>низкая</option><option ${item?.waterResistance==='средняя'?'selected':''}>средняя</option><option ${item?.waterResistance==='высокая'?'selected':''}>высокая</option></select></label><label>Упаковка<div class="inline-fields"><input id="libMatPackage" value="${esc(item?.packageSize||'')}"><select id="libMatPackageUnit"><option ${item?.packageUnit==='кг'?'selected':''}>кг</option><option ${item?.packageUnit==='л'?'selected':''}>л</option><option ${item?.packageUnit==='г'?'selected':''}>г</option></select></div></label></div>
 <div class="form-grid"><label>Цвет маркировки<input id="libMatColor" type="color" value="${esc(item?.color||'#e6a42a')}"></label><label>Символ / маркировка<select id="libMatSymbol">${materialSymbolOptions36(item?.symbol||'')}</select><small class="field-help">Выберите отдельный символ для визуального различения материала и закреплённого инструмента.</small></label></div>
 <div class="check-grid catalog-span-4"><label class="checkline"><input id="libMatEP" type="checkbox" ${item?.ep?'checked':''}> EP / противозадирные свойства</label><label class="checkline"><input id="libMatFood" type="checkbox" ${item?.foodGrade?'checked':''}> Пищевой допуск</label><label class="checkline"><input id="libMatApproved" type="checkbox" ${item?.approved!==false?'checked':''}> Разрешён к применению</label></div>
 <label class="catalog-span-2">Статус<select id="libMatStatus"><option value="active" ${item?.status!=='retired'?'selected':''}>Активный</option><option value="retired" ${item?.status==='retired'?'selected':''}>Выведен из применения</option></select></label>
 <label class="catalog-span-4">Примечание<textarea id="libMatNotes" rows="2">${esc(item?.notes||'')}</textarea></label></div>`);
 if(!edit)$('#libMatKind').onchange=()=>{$('#libMatCode').value=nextDisplayCode36(matPrefix37($('#libMatKind').value),d.materials)}
}
function toolDialog36(view,item=null){
 const d=db36(),edit=!!item,initialType=item?.type||'grease_gun',initialDef=TOOL_TYPES36[initialType]||TOOL_TYPES36.general,initialCode=item?.code||nextDisplayCode36(initialDef.prefix,d.tools);
 openAction(edit?'Инструмент / оборудование':'Новое оборудование для смазки','Номер назначается автоматически. Контактирующее с продуктом оборудование рекомендуется закреплять за конкретным материалом.',[
 {label:'Отмена',kind:'ghost'},
 {label:edit?'Сохранить':'Добавить',kind:'primary',run:()=>{
   const type=$('#libToolType').value,def=TOOL_TYPES36[type]||TOOL_TYPES36.general,mats=compatibleMaterials36(type,d),mat=$('#libToolMaterial').value||null,cal=Number(String($('#libToolCalibration').value||'').replace(',','.')),calUnit=$('#libToolCalibrationUnit').value.trim(),isGun=/grease_gun/.test(type);
   if(isGun&&!mat){toast('Для шприца обязательно закрепите одну пластичную смазку','warn');return false}if(def.material!=='any'&&mats.length&&!mat){toast('Закрепите материал за этим оборудованием','warn');return false}if(def.calibration&&!cal){toast(`Укажите калибровку (${def.calibration})`,'warn');return false}
   const x=item||{},code=item?.code||nextDisplayCode36(def.prefix,d.tools),name=$('#libToolName').value.trim()||autoToolName36(type,code);
   Object.assign(x,{id:x.id||LubricaCore.IDs.nextFrom(d.tools,'TOOL',4),code,name,type,manufacturer:$('#libToolManufacturer').value.trim(),model:$('#libToolModel').value.trim(),serial:$('#libToolSerial').value.trim(),materialId:mat,calibrationValue:cal||null,calibrationUnit:calUnit||def.calibration||'',gramsPerStroke:/grease_gun/.test(type)&&calUnit==='г/качок'?cal:null,calibrationDate:$('#libToolDate').value,nextCalibrationDate:$('#libToolNextDate').value,location:$('#libToolLocation').value.trim(),responsible:$('#libToolResponsible').value.trim(),status:$('#libToolStatus').value,notes:$('#libToolNotes').value.trim()});
   if(!item)d.tools.push(x);LubricaCore.State.setDatabase(d);renderMaterials(view);toast(edit?'Оборудование изменено':`Оборудование добавлено: ${code}`)
 }}],`<div class="catalog-editor-form tool-editor-form"><div class="form-grid"><label>Номер<input id="libToolCode" value="${esc(initialCode)}" readonly></label><label>Тип *<select id="libToolType">${toolTypeOptions36(initialType)}</select></label></div>
 <label class="catalog-span-2">Название<input id="libToolName" value="${esc(item?.name||'')}" placeholder="Можно оставить пустым"></label>
 <div class="form-grid"><label>Производитель<input id="libToolManufacturer" value="${esc(item?.manufacturer||'')}"></label><label>Модель<input id="libToolModel" value="${esc(item?.model||'')}"></label></div>
 <div class="form-grid"><label>Серийный / инвентарный №<input id="libToolSerial" value="${esc(item?.serial||'')}"></label><label>Место хранения<input id="libToolLocation" value="${esc(item?.location||'')}"></label></div>
 <label id="libToolMaterialWrap" class="catalog-span-2">Закреплённый материал<select id="libToolMaterial"></select></label><small class="field-help catalog-span-2 catalog-help" id="libToolMaterialHelp"></small>
 <div class="form-grid"><label>Калибровка<input id="libToolCalibration" inputmode="decimal" value="${esc(item?.calibrationValue??item?.gramsPerStroke??'')}"></label><label>Единица<input id="libToolCalibrationUnit" value="${esc(item?.calibrationUnit||initialDef.calibration||'')}"></label></div>
 <div class="form-grid"><label>Дата калибровки<input id="libToolDate" type="date" value="${esc(item?.calibrationDate||'')}"></label><label>Следующая калибровка<input id="libToolNextDate" type="date" value="${esc(item?.nextCalibrationDate||'')}"></label></div>
 <div class="form-grid"><label>Ответственный<input id="libToolResponsible" value="${esc(item?.responsible||'')}"></label><label>Статус<select id="libToolStatus"><option value="active" ${item?.status!=='retired'&&item?.status!=='calibration'?'selected':''}>В работе</option><option value="calibration" ${item?.status==='calibration'?'selected':''}>На калибровке</option><option value="retired" ${item?.status==='retired'?'selected':''}>Выведен</option></select></label></div>
 <label class="catalog-span-4">Примечание<textarea id="libToolNotes" rows="2">${esc(item?.notes||'')}</textarea></label></div>`);
 const refresh=()=>{const type=$('#libToolType').value,def=TOOL_TYPES36[type]||TOOL_TYPES36.general,code=item?.code||nextDisplayCode36(def.prefix,d.tools),mats=compatibleMaterials36(type,d),old=item?.materialId||$('#libToolMaterial').value||'';$('#libToolCode').value=code;$('#libToolCalibrationUnit').value=item?.calibrationUnit||def.calibration||'';$('#libToolMaterial').innerHTML=`<option value="">Не закреплён</option>${mats.map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(old)?'selected':''}>${esc(m.code||m.id)} · ${esc(m.name)}</option>`).join('')}`;const isGun=/grease_gun/.test(type);$('#libToolMaterialHelp').textContent=isGun?'Обязательно: один шприц — одна закреплённая пластичная смазка.':def.material==='oil'?'Для ёмкостей, насосов и раздаточного оборудования рекомендуется закрепление за конкретным маслом.':'Если оборудование не контактирует со смазочным материалом, закрепление не требуется.';$('#libToolMaterialWrap').style.display=mats.length||def.material!=='any'?'block':'none'};$('#libToolType').onchange=refresh;refresh()
}
function renderMaterials(view){
 const d=db36();if(!d)return;const tab=view.dataset.libraryTab||'materials',q=(view.dataset.librarySearch||'').toLowerCase(),filter=view.dataset.libraryFilter||'all';
 const mats=(d.materials||[]).filter(m=>(filter==='all'||m.kind===filter)&&(!q||`${m.code} ${m.name} ${m.kind} ${m.manufacturer||''} ${m.isoVg||''} ${m.nlgi||''}`.toLowerCase().includes(q)));
 const tools=(d.tools||[]).filter(t=>(filter==='all'||t.type===filter)&&(!q||`${t.code} ${t.name} ${TOOL_TYPES36[t.type]?.label||''} ${t.manufacturer||''} ${t.model||''}`.toLowerCase().includes(q)));
 const activeM=(d.materials||[]).filter(m=>m.status!=='retired').length, activeT=(d.tools||[]).filter(t=>t.status!=='retired').length, due=(d.tools||[]).filter(t=>t.nextCalibrationDate&&new Date(t.nextCalibrationDate)<new Date()).length;
 view.innerHTML=`<section class="module-page"><div class="module-header"><div><span class="eyebrow">СПРАВОЧНИКИ</span><h1>Материалы и оборудование для смазки</h1><p>Единая библиотека материалов, средств подачи, чистого хранения и контроля.</p></div></div>
 <div class="library-summary"><div><small>Материалов</small><strong>${activeM}</strong></div><div><small>Инструментов</small><strong>${activeT}</strong></div><div><small>Просрочена калибровка</small><strong>${due}</strong></div></div>
 <div class="library-tabs"><button class="library-tab ${tab==='materials'?'active':''}" data-lib-tab="materials">Материалы</button><button class="library-tab ${tab==='tools'?'active':''}" data-lib-tab="tools">Инструменты и оборудование</button></div>
 <div class="library-toolbar"><input id="librarySearch" class="library-search" placeholder="Поиск по справочнику..." value="${esc(view.dataset.librarySearch||'')}"><select id="libraryFilter"><option value="all">Все типы</option>${tab==='materials'?Object.keys(MATERIAL_KINDS37).map(k=>`<option ${filter===k?'selected':''}>${esc(k)}</option>`).join(''):Object.entries(TOOL_TYPES36).map(([k,v])=>`<option value="${k}" ${filter===k?'selected':''}>${esc(v.label)}</option>`).join('')}</select><button class="btn primary" id="libraryAdd">${tab==='materials'?'+ Материал':'+ Оборудование'}</button></div>
 <div class="library-card-list">${tab==='materials'?mats.map(m=>`<div class="library-card library-card-rich"><span class="material-chip"><i class="material-color-dot" style="background:${esc(m.color||'#999')}"></i><span class="material-symbol-badge" style="color:${esc(m.color||'#555')};border-color:${esc(m.color||'#555')}">${esc(m.symbol||'●')}</span><span><strong>${esc(m.code||m.id)} · ${esc(m.name)}</strong><small>${esc(m.manufacturer||'Без производителя')} · ${esc(m.kind||'Материал')}</small></span></span><span><strong>${m.nlgi?`NLGI ${esc(m.nlgi)}`:m.isoVg?`ISO VG ${esc(m.isoVg)}`:'—'}</strong><small>${esc(m.thickener||m.baseOil||'')}</small></span><span>${m.approved!==false?'<span class="status-pill ready">Разрешён</span>':'<span class="status-pill review">Проверить</span>'}<small>${materialUsage36(d,m.id)} мероприятий</small></span><span><small>${m.tempMin||m.tempMax?`${esc(m.tempMin||'…')}…${esc(m.tempMax||'…')} °C`:''}</small></span><span class="actions"><button class="btn ghost" data-print-material="${esc(m.id)}">Этикетка</button><button class="btn ghost" data-edit-material="${esc(m.id)}">Открыть</button></span></div>`).join('')||'<div class="all-good">Материалы не найдены</div>':tools.map(t=>{const m=material36(t.materialId),def=TOOL_TYPES36[t.type]||TOOL_TYPES36.general,cal=t.calibrationValue??t.gramsPerStroke,over=t.nextCalibrationDate&&new Date(t.nextCalibrationDate)<new Date();return `<div class="library-card library-card-rich"><span class="tool-ident"><span class="material-symbol-badge tool-material-mark ${m?'':'unbound'}" style="${m?`color:${esc(m.color||'#555')};border-color:${esc(m.color||'#555')}`:''}">${m?esc(m.symbol||'●'):'—'}</span><span><strong>${esc(t.code||t.id)} · ${esc(t.name||def.label)}</strong><small>${esc(def.label)}${t.manufacturer?` · ${esc(t.manufacturer)}`:''}</small></span></span><span><strong>${m?`${esc(m.code||'')} · ${esc(m.name)}`:'Без закрепления'}</strong><small>${m?`Маркировка: ${esc(m.symbol||'●')} · ${esc(m.color||'#555')}`:''}${cal?`${m?' · ':''}${esc(cal)} ${esc(t.calibrationUnit||def.calibration||'')}`:'Без калибровки'}</small></span><span>${over?'<span class="status-pill danger">Калибровка просрочена</span>':t.status==='calibration'?'<span class="status-pill review">На калибровке</span>':'<span class="status-pill ready">В работе</span>'}<small>${toolUsage36(d,t.id)} мероприятий</small></span><span><small>${t.nextCalibrationDate?`След.: ${esc(t.nextCalibrationDate)}`:esc(t.location||'')}</small></span><span class="actions"><button class="btn ghost" data-print-tool="${esc(t.id)}" ${m?'':'disabled'} title="${m?'Печать этикетки с маркировкой закреплённого материала':'Сначала закрепите материал'}">Этикетка</button><button class="btn ghost" data-edit-tool="${esc(t.id)}">Открыть</button></span></div>`}).join('')||'<div class="all-good">Оборудование не найдено</div>'}</div></section>`;
 view.querySelectorAll('[data-lib-tab]').forEach(b=>b.onclick=()=>{view.dataset.libraryTab=b.dataset.libTab;view.dataset.libraryFilter='all';renderMaterials(view)});$('#libraryAdd').onclick=()=>tab==='materials'?materialDialog36(view):toolDialog36(view);$('#librarySearch').oninput=e=>{view.dataset.librarySearch=e.target.value;renderMaterials(view)};$('#libraryFilter').onchange=e=>{view.dataset.libraryFilter=e.target.value;renderMaterials(view)};view.querySelectorAll('[data-print-material]').forEach(b=>b.onclick=()=>{const m=item36(d.materials,b.dataset.printMaterial);if(m)printLubricationLabel36('material',m)});view.querySelectorAll('[data-print-tool]').forEach(b=>b.onclick=()=>{const tool=item36(d.tools,b.dataset.printTool);if(tool)printLubricationLabel36('tool',tool)});view.querySelectorAll('[data-edit-material]').forEach(b=>b.onclick=()=>materialDialog36(view,item36(d.materials,b.dataset.editMaterial)));view.querySelectorAll('[data-edit-tool]').forEach(b=>b.onclick=()=>toolDialog36(view,item36(d.tools,b.dataset.editTool)))
}

// Explicit materials API. This module does not override map/routes/bulk-edit behavior.
window.LubricaMaterials=Object.freeze({
  render:renderMaterials,
  getDatabase:db36,
  find:item36,
  getMaterial:material36,
  materialOptions:materialOptions36,
  taskNeedsMaterial:taskNeedsMaterial36,
  effectiveMaterialId:effectiveMaterialId36,
  toolOptions:toolOptions36,
  refreshMaterialMode:refreshMaterialMode36,
  refreshToolSelector:refreshToolSelector36,
  symbols:MATERIAL_SYMBOLS36,
  printLabel:printLubricationLabel36,
  labelMarkup:labelMarkup36
});
window.renderMaterials=renderMaterials;
