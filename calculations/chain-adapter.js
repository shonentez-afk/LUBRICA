(function(global){
'use strict';
const R=global.LubricaCalculationRegistry,Calc=global.LubricaChainCalculator;
if(!R||!Calc)throw new Error('Chain Adapter requires Calculation Registry and Chain Calculator');
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const n=v=>{if(v==null||String(v).trim()==='')return null;const x=Number(String(v).replace(',','.'));return Number.isFinite(x)?x:null};
const fmt=v=>v==null?'':String(v);
const val=(obj,...keys)=>{for(const k of keys){if(obj&&obj[k]!=null&&obj[k]!=='')return obj[k]}return null};
function designationOf(point){return point?.chain?.designation||point?.componentBinding?.actualDesignation||point?.componentBinding?.structuralText||point?.name||''}
function open(context){
 const point=context.point;if(!point)return false;
 const dlg=document.getElementById('bearingCalcDialog')||document.getElementById('actionDialog');if(!dlg)return false;
 point.chain=point.chain||{};const ch=point.chain,c=ch.calculation||{};
 const inferred=Calc.inferStandard(designationOf(point));
 if(inferred){if(!(ch.pitchMm>0))ch.pitchMm=inferred.pitchMm;if(!(ch.strandCount>0))ch.strandCount=inferred.strandCount;ch.designation=ch.designation||inferred.designation;}
 const currentEnv=c.environment||(c.contamination==='heavy'?(c.waterExposure==='yes'?'severe':'dusty'):(c.waterExposure==='yes'?'wet':'normal'))||'normal';
 const currentTemp=c.temperatureClass||'normal';
 const currentMethod=c.applicationMethod||'manual';
 const defaultQuantityMethod=(c.calculationVersion==='9.0'&&c.quantityMethod)?c.quantityMethod:'universal';
 dlg.innerHTML=`<form class="bearing-calc-modal-form chain-calc-form" id="chainCalcForm" novalidate>
 <div class="dialog-head"><div><span class="eyebrow">РАСЧЁТ СМАЗКИ</span><h2>${esc(point.name||'Цепная передача')}</h2><p class="dialog-copy">Цепная передача · рабочее количество и периодичность. В простом режиме показаны только исходные данные, итог и действие «Применить расчёт».</p></div><button type="button" class="icon-btn" data-close>×</button></div>

 <section class="calc-simple-overview simple-only" data-simple-overview>
  <div class="calc-primary-result">
   <small>Рекомендация</small><strong data-chain-primary>Введите исходные данные</strong><span data-chain-primary-action>Укажите длину цепи и условия работы.</span>
   <div class="calc-primary-result-meta"><b data-chain-method>LUBRICA Universal Chain</b><span data-chain-context>OEM-правила имеют приоритет, инженерная рекомендация LUBRICA помечается отдельно.</span></div>
  </div>
  <div class="calc-simple-context">
   <div><small>Цепь</small><strong>${esc(inferred?.designation||ch.designation||'Не распознана')}</strong><span>${inferred?`${esc(inferred.standard)} · шаг ${esc(inferred.pitchMm)} мм · ${esc(inferred.strandCount)} ряд`:'Обозначение можно уточнить в экспертном режиме.'}</span></div>
   <div><small>Количество</small><strong data-chain-overview-qty>—</strong><span data-chain-overview-qty-source>Будет рассчитано после ввода длины.</span></div>
   <div><small>Периодичность</small><strong data-chain-overview-int>—</strong><span data-chain-overview-int-source>Зависит от способа смазывания и условий работы.</span></div>
  </div>
  <div class="calc-simple-status" data-chain-overview-status><b>Введите исходные данные</b><span>Для ручного смазывания обычно достаточно длины цепи и условий работы.</span></div>
  <div class="calc-simple-actions"><button type="button" class="btn primary" data-accept-simple>Применить расчёт</button><span class="muted" data-accept-status-simple>Рассчитанное и утверждённое значения хранятся раздельно.</span></div>
 </section>

 <section class="bearing-calc-modal-section" data-ui-step><div class="bearing-calc-modal-title"><span>01</span><div><h3>Цепь</h3><p>Обозначение и геометрия подставляются автоматически, если они распознаны.</p></div></div>
 <div class="bearing-calc-modal-grid cols-4">
  <div class="calc-result-box span-2"><small>Распознано</small><strong>${esc(inferred?.designation||ch.designation||'Типоразмер не распознан')}</strong><span>${inferred?`${inferred.standard} · шаг ${inferred.pitchMm} мм · ${inferred.strandCount} ряд`:'Укажите шаг в «Подробностях», если обозначение нестандартное.'}</span></div>
  <label>Длина цепи, м *<input name="chainLengthM" inputmode="decimal" value="${fmt(c.chainLengthM??ch.chainLengthM)}" placeholder="например 4,5"></label>
  <label>Способ смазывания<select name="applicationMethod"><option value="manual" ${currentMethod==='manual'?'selected':''}>Ручное / маслёнка</option><option value="brush" ${currentMethod==='brush'?'selected':''}>Кисть / щётка</option><option value="drip" ${currentMethod==='drip'?'selected':''}>Капельная подача</option><option value="bath" ${currentMethod==='bath'?'selected':''}>Масляная ванна</option><option value="pump" ${currentMethod==='pump'?'selected':''}>Циркуляция / насос</option></select></label>
 </div></section>

 <section class="bearing-calc-modal-section" data-ui-step><div class="bearing-calc-modal-title"><span>02</span><div><h3>Условия работы</h3><p>Два простых выбора нужны в основном для периодичности.</p></div></div>
 <div class="bearing-calc-modal-grid cols-4">
  <label>Среда<select name="environment"><option value="normal" ${currentEnv==='normal'?'selected':''}>Обычная / чистая</option><option value="dusty" ${currentEnv==='dusty'?'selected':''}>Пыльная / загрязнённая</option><option value="wet" ${currentEnv==='wet'?'selected':''}>Влажная / мойка</option><option value="severe" ${currentEnv==='severe'?'selected':''}>Тяжёлая: пыль + влага</option></select></label>
  <label>Температура<select name="temperatureClass"><option value="normal" ${currentTemp!=='high'?'selected':''}>Обычная</option><option value="high" ${currentTemp==='high'?'selected':''}>Повышенная</option></select></label>
  <label>Скорость цепи<select name="speedClass"><option value="low" ${c.speedClass==='low'?'selected':''}>Низкая</option><option value="normal" ${(!c.speedClass||c.speedClass==='normal')?'selected':''}>Обычная</option><option value="high" ${c.speedClass==='high'?'selected':''}>Высокая</option></select></label>
  <div class="calc-result-box"><small>Куда наносить</small><strong>В шарнир цепи</strong><span>между внутренней и наружной пластинами, к паре палец–втулка</span></div>
 </div></section>

 <section class="bearing-calc-modal-section expert-only" data-ui-step><div class="bearing-calc-modal-title"><span>03</span><div><h3>Результат и утверждение</h3><p>Для ручного смазывания показывается стартовая доза и интервал. Для непрерывных систем — режим подачи.</p></div></div>
 <div class="bearing-calc-modal-grid cols-4">
  <div class="calc-result-box span-2"><small>Количество</small><strong data-simple-qty>—</strong><span data-simple-qty-source></span></div>
  <div class="calc-result-box"><small>Периодичность</small><strong data-simple-int>—</strong><span data-simple-int-source></span></div>
  <div class="calc-result-box"><small>Готовность</small><strong data-simple-ready>—</strong><span data-simple-note></span></div>
 </div>
 <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px"><button type="button" class="btn secondary" data-chain-sources data-footer-sources>Источники</button><button type="button" class="btn secondary" data-accept-expert>Применить расчёт</button><span class="muted" data-accept-status>Рассчитанное и утверждённое значения хранятся раздельно.</span></div>
 </section>

 <details class="bearing-calc-technical expert-only"><summary><span><b>Экспертные настройки</b><small>Ручная геометрия, альтернативные методы количества и периодичности.</small></span></summary>
 <section class="bearing-calc-modal-section expert-only" data-ui-step><div class="bearing-calc-modal-title"><span>04</span><div><h3>Геометрия и ручные методы</h3><p>Нужны только для нестандартной цепи, OEM-дозы или настроенной системы подачи.</p></div></div><div class="bearing-calc-modal-grid cols-4">
  <label>Тип цепи<select name="chainType"><option value="roller" ${(ch.chainType||'roller')==='roller'?'selected':''}>Роликовая</option><option value="bush" ${ch.chainType==='bush'?'selected':''}>Втулочная</option><option value="conveyor" ${ch.chainType==='conveyor'?'selected':''}>Конвейерная</option><option value="leaf" ${ch.chainType==='leaf'?'selected':''}>Пластинчатая</option><option value="other" ${ch.chainType==='other'?'selected':''}>Другая</option></select></label>
  <label>Шаг, мм<input name="pitchMm" inputmode="decimal" value="${fmt(ch.pitchMm)}"></label>
  <label>Рядов<input name="strandCount" inputmode="decimal" value="${fmt(ch.strandCount??1)}"></label>
  <label>Плотность, г/мл<input name="lubricantDensity" inputmode="decimal" value="${fmt(c.lubricantDensity)}"></label>
  <label>Метод количества<select name="quantityMethod"><option value="universal" ${defaultQuantityMethod==='universal'?'selected':''}>LUBRICA Universal</option><option value="oem_total" ${defaultQuantityMethod==='oem_total'?'selected':''}>OEM / утверждённая общая доза</option><option value="per_meter" ${defaultQuantityMethod==='per_meter'?'selected':''}>Своя норма на метр</option><option value="injector" ${defaultQuantityMethod==='injector'?'selected':''}>Форсунки × циклы</option></select></label>
  <label>OEM / общая доза, мл<input name="oemTotal" inputmode="decimal" value="${fmt(c.oemTotal)}"></label>
  <label>Своя норма, мл/м<input name="ratePerM" inputmode="decimal" value="${fmt(c.ratePerM)}"></label>
  <label>Форсунок<input name="nozzleCount" inputmode="decimal" value="${fmt(c.nozzleCount)}"></label>
  <label>Доза форсунки, мл/цикл<input name="nozzleDoseMl" inputmode="decimal" value="${fmt(c.nozzleDoseMl)}"></label>
  <label>Циклов подачи<input name="cyclesPerService" inputmode="decimal" value="${fmt(c.cyclesPerService??1)}"></label>
  <label>Утверждено, мл<input name="approvedVolumeMl" inputmode="decimal" value="${fmt(c.approvedVolumeMl)}"></label>
  <label>Утверждено, г<input name="approvedMassG" inputmode="decimal" value="${fmt(c.approvedMassG)}"></label>
  <label class="span-2">Источник количества<input name="quantitySource" value="${esc(c.quantitySource||'')}"></label>
 </div></section>
 <section class="bearing-calc-modal-section expert-only" data-ui-step><div class="bearing-calc-modal-title"><span>05</span><div><h3>Периодичность вручную</h3><p>Используйте только если есть локальный OEM-регламент или утверждённая карта.</p></div></div><div class="bearing-calc-modal-grid cols-4">
  <label>Моточасы<input name="intervalHours" inputmode="decimal" value="${fmt(c.intervalHours)}"></label><label>Календарь, дней<input name="intervalDays" inputmode="decimal" value="${fmt(c.intervalDays)}"></label><label>Циклы машины<input name="intervalMachineCycles" inputmode="decimal" value="${fmt(c.intervalMachineCycles)}"></label><label>Источник интервала<input name="intervalSource" value="${esc(c.intervalSource||'')}"></label>
  <label>Утверждено, моточасы<input name="approvedHours" inputmode="decimal" value="${fmt(c.approvedHours)}"></label><label>Утверждено, дней<input name="approvedDays" inputmode="decimal" value="${fmt(c.approvedDays)}"></label><label>Утверждено, циклы<input name="approvedMachineCycles" inputmode="decimal" value="${fmt(c.approvedMachineCycles)}"></label>
 </div></section>
 </details>
 <div class="bearing-calc-warnings modal-warnings" data-chain-warnings></div>
 <menu><button type="button" class="btn ghost" data-close>Отмена</button><button type="button" class="btn primary" data-save>Сохранить</button></menu>
 </form>`;
 const form=dlg.querySelector('#chainCalcForm');
 global.LubricaCalculationUIPresenter?.unifyCalculatorShell?.(form,{sourceIds:['IWIS-CHAIN-LUBRICATION','TSUBAKI-CHAIN-LUBRICATION','CHAIN-ISO606-RENOLD','LUBRICA-CHAIN-ENGINEERING']});
 form.querySelector('[data-chain-sources]').onclick=()=>global.LubricaBearingSources?.openRegistry?.({sourceIds:['IWIS-CHAIN-LUBRICATION','TSUBAKI-CHAIN-LUBRICATION','CHAIN-ISO606-RENOLD','LUBRICA-CHAIN-ENGINEERING']});
 const mp=global.LubricaMaterialIntegration?.applyPrefill?.(point,'chain',{lubricantDensity:form.elements.lubricantDensity.value},context);if(!form.elements.lubricantDensity.value&&mp?.input?.lubricantDensity!=null)form.elements.lubricantDensity.value=mp.input.lubricantDensity;
 let accepted=false,expertQtyTouched=false,expertIntervalTouched=false;
 const simpleInput=()=>({chainLengthM:n(form.elements.chainLengthM.value),pitchMm:n(form.elements.pitchMm.value),strandCount:n(form.elements.strandCount.value)||1,applicationMethod:form.elements.applicationMethod.value,environment:form.elements.environment.value,temperatureClass:form.elements.temperatureClass.value,speedClass:form.elements.speedClass.value});
 const recalc=()=>{
  const x=simpleInput(),r=Calc.simpleRecommendation(x),density=n(form.elements.lubricantDensity.value);
  let qty='—',qtySrc='';
  if(r.volumeMl!=null){qty=`${r.volumeMl} мл`;if(density>0)qty+=` · ${Number((r.volumeMl*density).toFixed(2))} г`;qtySrc=`Стартовая норма ${r.ratePerM} мл/м · LUBRICA Engineering на основе iwis`}
  else if(r.drip){qty=`${r.drip.dropsPerMin} кап/мин`;qtySrc=`${r.drip.perStrand} кап/мин на ряд · U.S. Tsubaki`}
  else if(r.ready){qty='Непрерывная система';qtySrc='Количество определяется уровнем/расходом системы'}
  dlg.querySelector('[data-simple-qty]').textContent=qty;dlg.querySelector('[data-simple-qty-source]').textContent=qtySrc;
  dlg.querySelector('[data-simple-int]').textContent=r.interval.text;dlg.querySelector('[data-simple-int-source]').textContent=r.interval.source;
  dlg.querySelector('[data-simple-ready]').textContent=r.ready?'Готово':'Нужны данные';dlg.querySelector('[data-simple-note]').textContent=r.ready?'Можно применить расчёт':`Укажите: ${r.missing.join(', ')}`;
  const overviewQty=dlg.querySelector('[data-chain-overview-qty]'),overviewInt=dlg.querySelector('[data-chain-overview-int]'),primary=dlg.querySelector('[data-chain-primary]'),primaryAction=dlg.querySelector('[data-chain-primary-action]'),overviewStatus=dlg.querySelector('[data-chain-overview-status]');
  if(overviewQty)overviewQty.textContent=qty;if(overviewInt)overviewInt.textContent=r.interval.text;
  const oqs=dlg.querySelector('[data-chain-overview-qty-source]'),ois=dlg.querySelector('[data-chain-overview-int-source]');if(oqs)oqs.textContent=qtySrc||'Расчёт LUBRICA';if(ois)ois.textContent=r.interval.source||'Расчёт LUBRICA';
  if(primary)primary.textContent=r.ready?`${qty} · ${r.interval.text}`:'Нужны исходные данные';if(primaryAction)primaryAction.textContent=r.ready?'Проверьте итог и примените его к мероприятию.':`Укажите: ${r.missing.join(', ')}`;
  if(overviewStatus){const b=overviewStatus.querySelector('b'),sp=overviewStatus.querySelector('span');if(b)b.textContent=r.ready?'Расчёт готов':'Требуются данные';if(sp)sp.textContent=r.ready?'Количество и периодичность рассчитаны. После применения они попадут в мероприятие точки.':`Не хватает: ${r.missing.join(', ')}`;}
  dlg.querySelectorAll('[data-accept-simple],[data-accept-expert]').forEach(b=>b.disabled=!r.ready);
  const warns=[];
  if((x.applicationMethod==='manual'||x.applicationMethod==='brush')&&x.speedClass==='high')warns.push('При высокой скорости предпочтительнее автоматическая/капельная подача.');
  if(x.temperatureClass==='high')warns.push('При повышенной температуре проверьте вязкость и температурный диапазон выбранного масла.');
  if(x.environment==='wet'||x.environment==='severe')warns.push('Для воды/мойки нужен материал с подтверждённой водостойкостью и адгезией.');
  dlg.querySelector('[data-chain-warnings]').innerHTML=warns.length?warns.map(v=>`<div class="bearing-calc-warning">⚠ ${esc(v)}</div>`).join(''):'<div class="bearing-calc-ok">✓ Смазка направляется в рабочий шарнир цепи; лишних обязательных полей нет.</div>';
  return{x,r,density};
 };
 const accept=()=>{const{x,r,density}=recalc();if(!r.ready)return;accepted=true;
   if(r.volumeMl!=null){form.elements.approvedVolumeMl.value=r.volumeMl;form.elements.approvedMassG.value=density>0?Number((r.volumeMl*density).toFixed(2)):'';form.elements.quantitySource.value=r.sourceQuantity;}
   if(r.interval.hours!=null){form.elements.approvedHours.value=r.interval.hours;form.elements.intervalSource.value=r.interval.source;}
   dlg.querySelectorAll('[data-accept-status],[data-accept-status-simple]').forEach(e=>e.textContent='✓ Расчёт применён. Источники подставлены автоматически.');
 };
 form.querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',()=>{accepted=false;recalc()});el.addEventListener('change',()=>{accepted=false;recalc()})});
 ['quantityMethod','oemTotal','ratePerM','nozzleCount','nozzleDoseMl','cyclesPerService'].forEach(k=>form.elements[k]?.addEventListener('change',()=>{expertQtyTouched=true}));
 ['intervalHours','intervalDays','intervalMachineCycles'].forEach(k=>{form.elements[k]?.addEventListener('input',()=>{expertIntervalTouched=true});form.elements[k]?.addEventListener('change',()=>{expertIntervalTouched=true})});
 form.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());form.querySelectorAll('[data-accept-simple],[data-accept-expert]').forEach(b=>b.onclick=accept);
 form.querySelector('[data-save]').onclick=()=>{const{x,r,density}=recalc();
   const qMethod=expertQtyTouched?form.elements.quantityMethod.value:'universal';
   let calculatedVolume=r.volumeMl,calculatedMass=(r.volumeMl!=null&&density>0)?Number((r.volumeMl*density).toFixed(3)):null;
   if(qMethod!=='universal'){
     const expert=Calc.calculate({quantityMethod:qMethod,chainLengthM:x.chainLengthM,oemTotal:n(form.elements.oemTotal.value),ratePerM:n(form.elements.ratePerM.value),lubricantDensity:density,nozzleCount:n(form.elements.nozzleCount.value),nozzleDoseMl:n(form.elements.nozzleDoseMl.value),cyclesPerService:n(form.elements.cyclesPerService.value),intervalHours:n(form.elements.intervalHours.value),intervalDays:n(form.elements.intervalDays.value),intervalMachineCycles:n(form.elements.intervalMachineCycles.value),applicationMethod:x.applicationMethod,applicationTarget:'pin_bushing',speedClass:x.speedClass,contamination:x.environment==='dusty'||x.environment==='severe'?'heavy':'normal',temperatureClass:x.temperatureClass,waterExposure:x.environment==='wet'||x.environment==='severe'?'yes':'no'});
     calculatedVolume=expert.quantity.volumeMl;calculatedMass=expert.quantity.massG;
   }
   const manualInterval=Calc.interval({intervalHours:n(form.elements.intervalHours.value),intervalDays:n(form.elements.intervalDays.value),intervalMachineCycles:n(form.elements.intervalMachineCycles.value)});
   const useManualInt=expertIntervalTouched&&manualInterval.rule!=='unspecified';const calcInt=useManualInt?manualInterval:{hours:r.interval.hours,days:null,machineCycles:null,rule:r.interval.hours!=null?'hours':r.interval.mode};
   point.chain={...(point.chain||{}),designation:ch.designation||inferred?.designation||'',chainType:form.elements.chainType.value,pitchMm:n(form.elements.pitchMm.value),strandCount:n(form.elements.strandCount.value),chainLengthM:x.chainLengthM,
    calculation:{calculationVersion:'9.0',mode:'simple_universal',applicationMethod:x.applicationMethod,environment:x.environment,temperatureClass:x.temperatureClass,speedClass:x.speedClass,quantityMethod:qMethod,chainLengthM:x.chainLengthM,ratePerM:qMethod==='universal'?r.ratePerM:n(form.elements.ratePerM.value),oemTotal:n(form.elements.oemTotal.value),lubricantDensity:density,nozzleCount:n(form.elements.nozzleCount.value),nozzleDoseMl:n(form.elements.nozzleDoseMl.value),cyclesPerService:n(form.elements.cyclesPerService.value),calculatedVolumeMl:calculatedVolume,calculatedMassG:calculatedMass,approvedVolumeMl:n(form.elements.approvedVolumeMl.value),approvedMassG:n(form.elements.approvedMassG.value),quantitySource:form.elements.quantitySource.value.trim(),calculatedInterval:calcInt,intervalHours:n(form.elements.intervalHours.value),intervalDays:n(form.elements.intervalDays.value),intervalMachineCycles:n(form.elements.intervalMachineCycles.value),approvedHours:n(form.elements.approvedHours.value),approvedDays:n(form.elements.approvedDays.value),approvedMachineCycles:n(form.elements.approvedMachineCycles.value),intervalSource:form.elements.intervalSource.value.trim(),acceptedSimpleRecommendation:accepted,calculatedAt:new Date().toISOString(),warnings:[]}
   };
   const cc=point.chain.calculation;global.LubricaCalculations?.markResult?.(point,'chain',{version:'9.0',status:'calculated',calculatedAt:cc.calculatedAt,approved:cc.approvedVolumeMl!=null||cc.approvedMassG!=null||cc.approvedHours!=null||cc.approvedDays!=null||cc.approvedMachineCycles!=null,warningCount:0,source:cc.quantitySource||cc.intervalSource||'',summary:'Цепная передача'});
   const d=context.database||global.LubricaCore?.State?.getDatabase?.();
   if(d){
     const tasks=(d.tasks||[]).filter(t=>String(t.lubricationPointId||'')===String(point.id||'')&&(String(t.activityType||'')==='lubricant_apply'||String(t.operation||'').trim().toLowerCase()==='нанесение смазки'));
     for(const task of tasks){
       const approvedMl=cc.approvedVolumeMl,approvedG=cc.approvedMassG;
       if(approvedMl!=null){task.quantity={...(task.quantity||{}),calculated:cc.calculatedVolumeMl??null,calculatedGrams:cc.calculatedMassG??null,approved:String(approvedMl),unit:'мл',source:cc.quantitySource||''};}
       else if(approvedG!=null){task.quantity={...(task.quantity||{}),calculated:cc.calculatedMassG??null,approved:String(approvedG),unit:'г',source:cc.quantitySource||''};}
       else{task.quantity={...(task.quantity||{}),calculated:cc.calculatedVolumeMl??null,calculatedGrams:cc.calculatedMassG??null,unit:'мл',source:cc.quantitySource||''};}
       const hours=cc.approvedHours??cc.calculatedInterval?.hours??null,days=cc.approvedDays??cc.calculatedInterval?.days??null;
       task.schedule={...(task.schedule||{}),calculatedHours:cc.calculatedInterval?.hours??null,calculatedDays:cc.calculatedInterval?.days??null,calculatedMachineCycles:cc.calculatedInterval?.machineCycles??null,approvedHours:cc.approvedHours??null,approvedDays:cc.approvedDays??null,approvedMachineCycles:cc.approvedMachineCycles??null,rule:cc.calculatedInterval?.rule||'unspecified',source:cc.intervalSource||''};
       if(hours!=null){task.schedule.strategy='По наработке';task.schedule.runtimeHours=Number(hours);task.schedule.runtimeUnit='hours';task.schedule.legacyText=`${hours} ч`;task.schedule.calendarValue=null;task.schedule.calendarUnit=null;}
       else if(days!=null){task.schedule.strategy='По календарю';task.schedule.calendarValue=Number(days);task.schedule.calendarUnit='days';task.schedule.legacyText=`${days} дн.`;task.schedule.runtimeHours=null;task.schedule.runtimeUnit=null;}
     }
     global.LubricaCore.State.setDatabase(d);
   }
   global.LubricaApp?.refreshFromCore?.();global.LubricaApp?.renderAll?.();global.LubricaApp?.showToast?.('Расчёт цепи сохранён и применён к мероприятию');dlg.close();
 };
 recalc();dlg.showModal();return true;
}
R.register({id:'chain',title:'Цепные передачи',description:'Простой расчёт дозы и интервала с OEM-ориентирами iwis, Tsubaki и Renold.',categories:['chain'],priority:120,status:'ready',version:'9.0',capabilities:['Автораспознавание ISO 606 B','Стартовая доза по длине','OEM-интервал ручной смазки','Капельная подача','Условия эксплуатации','Экспертные настройки'],canOpen:ctx=>!!ctx.point,open,
 summarize:ctx=>{const c=ctx.point?.chain?.calculation||{};return{title:'Цепная передача',status:c.calculatedAt?'calculated':'ready',calculatedAt:c.calculatedAt||null,items:[{label:'Подача',value:c.calculatedVolumeMl!=null?`${c.calculatedVolumeMl} мл${c.calculatedMassG!=null?` · ${c.calculatedMassG} г`:''}`:'—',approved:c.approvedVolumeMl!=null?`Утв.: ${c.approvedVolumeMl} мл`:c.approvedMassG!=null?`Утв.: ${c.approvedMassG} г`:'Не утверждено'},{label:'Периодичность',value:c.calculatedInterval?.hours!=null?`${c.calculatedInterval.hours} ч`:c.calculatedInterval?.rule==='continuous'?'Непрерывно':'—',approved:c.approvedHours!=null?`Утв.: ${c.approvedHours} ч`:'Не утверждено'}],warnings:Array.isArray(c.warnings)?c.warnings:[]};}
});
global.LubricaSystem?.registerModule?.('Chain Adapter','ok','Universal Chain UX 9.0');
})(window);
