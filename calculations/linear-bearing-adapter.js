(function(global){
'use strict';
const R=global.LubricaCalculationRegistry;
const Calc=global.LubricaLinearBearingCalculator;
if(!R||!Calc)throw new Error('Linear Bearing Adapter requires Calculation Registry and Linear Bearing Calculator');

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const n=v=>{if(v==null||String(v).trim()==='')return null;const x=Number(String(v).replace(',','.'));return Number.isFinite(x)?x:null};
const fmt=v=>v==null?'':String(v);

function open(context){
  const point=context.point;
  if(!point)return false;
  const dlg=document.getElementById('bearingCalcDialog')||document.getElementById('actionDialog');
  if(!dlg)return false;
  point.linearBearing=point.linearBearing||{};
  const lb=point.linearBearing, c=lb.calculation||{};
  const subtypeOptions=Object.entries(Calc.subtypes).map(([k,x])=>`<option value="${k}" ${(lb.subtype||'profile_ball')===k?'selected':''}>${esc(x.label)}</option>`).join('');

  dlg.innerHTML=`<form class="bearing-calc-modal-form linear-bearing-calc-form" id="linearBearingCalcForm" novalidate>
    <div class="dialog-head">
      <div><span class="eyebrow">РАСЧЁТ ЛИНЕЙНОГО УЗЛА</span><h2>${esc(point.name||'Линейный подшипник')}</h2><p class="dialog-copy">Норма производителя на одну каретку / втулку × количество элементов. Расчётные и утверждённые значения разделены.</p></div>
      <button type="button" class="icon-btn" data-close>×</button>
    </div>

    <section class="bearing-calc-modal-section">
      <div class="bearing-calc-modal-title"><span>01</span><div><h3>Объект и конфигурация</h3><p>Идентификация узла и количество реально смазываемых элементов.</p></div></div>
      <div class="bearing-calc-modal-grid cols-4">
        <label class="span-2">Тип линейного узла<select name="subtype">${subtypeOptions}</select></label>
        <label>Производитель<input name="manufacturer" value="${esc(lb.manufacturer||'')}" placeholder="THK, HIWIN, Bosch Rexroth…"></label>
        <label>Серия / модель<input name="model" value="${esc(lb.model||'')}" placeholder="HG25, HSR25…"></label>
        <label>Кареток / втулок<input name="unitCount" inputmode="decimal" value="${fmt(c.unitCount??lb.unitCount??1)}"></label>
        <label>Длина каретки, мм<input name="blockLengthMm" inputmode="decimal" value="${fmt(c.blockLengthMm??lb.blockLengthMm)}"></label>
        <label>Рабочий ход, мм<input name="strokeMm" inputmode="decimal" value="${fmt(c.strokeMm??lb.strokeMm)}"></label>
        <label>Ориентация<select name="orientation"><option value="horizontal" ${(c.orientation||'horizontal')==='horizontal'?'selected':''}>Горизонтальная</option><option value="vertical" ${c.orientation==='vertical'?'selected':''}>Вертикальная</option><option value="side" ${c.orientation==='side'?'selected':''}>Боковая</option><option value="rail_up" ${c.orientation==='rail_up'?'selected':''}>Рельс направлен вверх</option></select></label>
      </div>
    </section>

    <section class="bearing-calc-modal-section">
      <div class="bearing-calc-modal-title"><span>02</span><div><h3>Досмазывание</h3><p>Количество берётся из OEM-нормы на один элемент; универсальная геометрическая формула не применяется.</p></div></div>
      <div class="bearing-calc-modal-grid cols-4">
        <label>OEM-норма на 1 элемент, см³<input name="qtyPerUnitCm3" inputmode="decimal" value="${fmt(c.qtyPerUnitCm3)}" placeholder="Из таблицы производителя"></label>
        <label>Плотность смазки, г/см³<input name="greaseDensity" inputmode="decimal" value="${fmt(c.greaseDensity)}"></label>
        <label class="span-2">Поправка ориентации<select name="orientationRule"><option value="none" ${c.orientationRule!=='hiwin_50'?'selected':''}>Не применять автоматически</option><option value="hiwin_50" ${c.orientationRule==='hiwin_50'?'selected':''}>HIWIN: +50% для vertical / side / rail-up</option></select></label>
        <div class="calc-result-box span-2"><small>Расчёт на все элементы</small><strong data-relube-result>—</strong><span data-relube-formula></span></div>
        <label>Утверждено, см³<input name="approvedRelubeCm3" inputmode="decimal" value="${fmt(c.approvedRelubeCm3)}"></label>
        <label>Утверждено, г<input name="approvedRelubeG" inputmode="decimal" value="${fmt(c.approvedRelubeG)}"></label>
        <label class="span-4">Источник нормы<input name="relubeSource" value="${esc(c.relubeSource||'')}" placeholder="Каталог производителя / инструкция / измеренная норма…"></label>
      </div>
    </section>

    <section class="bearing-calc-modal-section">
      <div class="bearing-calc-modal-title"><span>03</span><div><h3>Первичная смазка / полное заполнение</h3><p>Если OEM задаёт порционную первичную смазку, можно указать количество на элемент и число проходов.</p></div></div>
      <div class="bearing-calc-modal-grid cols-4">
        <label>OEM-норма на 1 элемент, см³<input name="initialQtyPerUnitCm3" inputmode="decimal" value="${fmt(c.initialQtyPerUnitCm3)}"></label>
        <label>Количество проходов / порций<input name="initialPasses" inputmode="decimal" value="${fmt(c.initialPasses??1)}"></label>
        <div class="calc-result-box"><small>Расчёт</small><strong data-initial-result>—</strong><span data-initial-formula></span></div>
        <label>Утверждено, см³<input name="approvedInitialCm3" inputmode="decimal" value="${fmt(c.approvedInitialCm3)}"></label>
        <label class="span-4">Источник первичной нормы<input name="initialSource" value="${esc(c.initialSource||'')}" placeholder="OEM / инструкция производителя"></label>
      </div>
    </section>

    <section class="bearing-calc-modal-section">
      <div class="bearing-calc-modal-title"><span>04</span><div><h3>Периодичность</h3><p>Периодичность задаётся календарным сроком по OEM или утверждённой инженерной норме.</p></div></div>
      <div class="bearing-calc-modal-grid cols-4">
        <label>Источник интервала<select name="intervalSource"><option value="oem" ${c.intervalSource==='oem'||!c.intervalSource?'selected':''}>OEM / паспорт</option><option value="thk_reference" ${c.intervalSource==='thk_reference'?'selected':''}>THK reference: 3–6 мес.</option><option value="manual" ${c.intervalSource==='manual'?'selected':''}>Инженерное значение</option></select></label>
        <label>Календарь от, мес.<input name="calendarMonthsMin" inputmode="decimal" value="${fmt(c.calendarMonthsMin)}"></label>
        <label>Календарь до, мес.<input name="calendarMonthsMax" inputmode="decimal" value="${fmt(c.calendarMonthsMax)}"></label>
        <label>Нагрузка<select name="loadClass"><option value="normal" ${c.loadClass!=='heavy'?'selected':''}>Нормальная</option><option value="heavy" ${c.loadClass==='heavy'?'selected':''}>Высокая</option></select></label>
        <label>Загрязнение<select name="contamination"><option value="normal" ${!['heavy','severe'].includes(c.contamination)?'selected':''}>Нормальное</option><option value="heavy" ${c.contamination==='heavy'?'selected':''}>Сильное</option><option value="severe" ${c.contamination==='severe'?'selected':''}>Очень сильное / жидкости</option></select></label>
        <label>Вибрация<select name="vibration"><option value="normal" ${c.vibration!=='high'?'selected':''}>Нормальная</option><option value="high" ${c.vibration==='high'?'selected':''}>Высокая</option></select></label>
        <div class="calc-result-box span-2"><small>Расчётный / справочный интервал</small><strong data-interval-result>—</strong><span>не становится утверждённым автоматически</span></div>
        <label>Утверждённый календарь, мес.<input name="approvedCalendarMonths" inputmode="decimal" value="${fmt(c.approvedCalendarMonths)}"></label>
        <label class="span-4">Источник утверждения<input name="approvedIntervalSource" value="${esc(c.approvedIntervalSource||'')}" placeholder="OEM / фактическая машина / утверждённая инженерная методика"></label>
      </div>
    </section>

    <div class="bearing-calc-warnings modal-warnings" data-linear-warnings></div>
    <menu><button type="button" class="btn ghost" data-close>Отмена</button><button type="button" class="btn secondary" data-recalc>Пересчитать</button><button type="button" class="btn primary" data-save>Сохранить расчёт</button></menu>
  </form>`;

  const form=dlg.querySelector('#linearBearingCalcForm');global.LubricaCalculationUIPresenter?.unifyCalculatorShell?.(form,{sourceIds:['THK-LINEAR-BEARING','THK-LINEAR-LUBRICATION','HIWIN-LINEAR-GUIDE']});
  const input=()=>({
    unitCount:n(form.elements.unitCount.value),
    qtyPerUnitCm3:n(form.elements.qtyPerUnitCm3.value),
    greaseDensity:n(form.elements.greaseDensity.value),
    orientation:form.elements.orientation.value,
    orientationRule:form.elements.orientationRule.value,
    initialQtyPerUnitCm3:n(form.elements.initialQtyPerUnitCm3.value),
    initialPasses:n(form.elements.initialPasses.value),
    intervalSource:form.elements.intervalSource.value,
    calendarMonthsMin:n(form.elements.calendarMonthsMin.value),
    calendarMonthsMax:n(form.elements.calendarMonthsMax.value),
    loadClass:form.elements.loadClass.value,
    contamination:form.elements.contamination.value,
    vibration:form.elements.vibration.value,
    strokeMm:n(form.elements.strokeMm.value),
    blockLengthMm:n(form.elements.blockLengthMm.value)
  });
  const recalc=()=>{
    const x=input(),r=Calc.calculate(x);
    dlg.querySelector('[data-relube-result]').textContent=r.relube.volumeCm3!=null?`${r.relube.volumeCm3} см³${r.relube.massG!=null?` · ${r.relube.massG} г`:''}`:'—';
    dlg.querySelector('[data-relube-formula]').textContent=r.relube.error||`${r.relube.formula} · Korient=${r.relube.factor}`;
    dlg.querySelector('[data-initial-result]').textContent=r.initial.volumeCm3!=null?`${r.initial.volumeCm3} см³${r.initial.massG!=null?` · ${r.initial.massG} г`:''}`:'—';
    dlg.querySelector('[data-initial-formula]').textContent=r.initial.error||r.initial.formula||'';
    dlg.querySelector('[data-interval-result]').textContent=r.interval.text||'—';
    const w=dlg.querySelector('[data-linear-warnings]');
    w.innerHTML=r.warnings.length?r.warnings.map(v=>`<div class="bearing-calc-warning">⚠ ${esc(v)}</div>`).join(''):'<div class="bearing-calc-ok">✓ Явных предупреждений нет. Финальная норма всё равно подтверждается инженером.</div>';
    return {x,r};
  };
  form.querySelectorAll('input,select').forEach(el=>{
    if(!['approvedRelubeCm3','approvedRelubeG','relubeSource','approvedInitialCm3','initialSource','approvedCalendarMonths','approvedIntervalSource'].includes(el.name)){
      el.addEventListener('input',recalc);el.addEventListener('change',recalc);
    }
  });
  form.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());
  form.querySelector('[data-recalc]').onclick=()=>recalc();
  form.querySelector('[data-save]').onclick=()=>{
    const {x,r}=recalc();
    point.linearBearing={
      ...(point.linearBearing||{}),
      subtype:form.elements.subtype.value,
      manufacturer:form.elements.manufacturer.value.trim(),
      model:form.elements.model.value.trim(),
      unitCount:x.unitCount,
      blockLengthMm:x.blockLengthMm,
      strokeMm:x.strokeMm,
      calculation:{
        calculationVersion:'8.3',
        ...x,
        calculatedRelubeCm3:r.relube.volumeCm3,
        calculatedRelubeG:r.relube.massG,
        approvedRelubeCm3:n(form.elements.approvedRelubeCm3.value),
        approvedRelubeG:n(form.elements.approvedRelubeG.value),
        relubeSource:form.elements.relubeSource.value.trim(),
        calculatedInitialCm3:r.initial.volumeCm3,
        calculatedInitialG:r.initial.massG,
        approvedInitialCm3:n(form.elements.approvedInitialCm3.value),
        initialSource:form.elements.initialSource.value.trim(),
        calculatedInterval:r.interval,
        approvedCalendarMonths:n(form.elements.approvedCalendarMonths.value),
        approvedIntervalSource:form.elements.approvedIntervalSource.value.trim(),
        warnings:r.warnings,
        calculatedAt:new Date().toISOString()
      }
    };
    const cc=point.linearBearing.calculation;
    global.LubricaCalculations?.markResult?.(point,'linear-bearing',{
      version:'8.3',
      status:'calculated',
      calculatedAt:cc.calculatedAt,
      approved:cc.approvedRelubeCm3!=null||cc.approvedRelubeG!=null||cc.approvedCalendarMonths!=null,
      warningCount:cc.warnings.length,
      source:cc.relubeSource||cc.approvedIntervalSource||cc.initialSource||'',
      summary:'Линейный подшипник / направляющая'
    });
    const d=context.database||global.LubricaCore?.State?.getDatabase?.();
    if(d)global.LubricaCore.State.setDatabase(d);
    global.LubricaApp?.refreshFromCore?.();
    global.LubricaApp?.renderAll?.();
    global.LubricaApp?.showToast?.('Расчёт линейного подшипника сохранён');
    dlg.close();
  };
  recalc();
  dlg.showModal();
  return true;
}

R.register({
  id:'linear-bearing',
  title:'Линейные подшипники',
  description:'OEM-норма на каретку/втулку, количество элементов, ориентация и календарный интервал.',
  categories:['linear_bearing'],
  priority:110,
  status:'ready',
  version:'8.3',
  capabilities:['Норма на каретку / втулку','Количество элементов','Первичная смазка','Календарная периодичность','Пересчёт см³ → г'],
  canOpen:ctx=>!!ctx.point,
  open,
  summarize:ctx=>{
    const c=ctx.point?.linearBearing?.calculation||{};
    return {
      title:'Линейный подшипник',
      status:c.calculatedAt?'calculated':'ready',
      calculatedAt:c.calculatedAt||null,
      values:{
        relubeCm3:c.calculatedRelubeCm3??null,
        relubeG:c.calculatedRelubeG??null,
        approvedRelubeCm3:c.approvedRelubeCm3??null,
        approvedCalendarMonths:c.approvedCalendarMonths??null
      },
      items:[
        {label:'Досмазывание',value:c.calculatedRelubeCm3!=null?`${c.calculatedRelubeCm3} см³${c.calculatedRelubeG!=null?` · ${c.calculatedRelubeG} г`:''}`:'—',approved:c.approvedRelubeCm3!=null?`Утв.: ${c.approvedRelubeCm3} см³`:c.approvedRelubeG!=null?`Утв.: ${c.approvedRelubeG} г`:'Не утверждено'},
        {label:'Календарь',value:c.calculatedInterval?.calendarMonthsMin!=null?`${c.calculatedInterval.calendarMonthsMin}${c.calculatedInterval.calendarMonthsMax&&c.calculatedInterval.calendarMonthsMax!==c.calculatedInterval.calendarMonthsMin?`–${c.calculatedInterval.calendarMonthsMax}`:''} мес.`:'—',approved:c.approvedCalendarMonths!=null?`Утв.: ${c.approvedCalendarMonths} мес.`:'Не утверждено'}
      ],
      warnings:Array.isArray(c.warnings)?c.warnings:[]
    };
  }
});
global.LubricaSystem?.registerModule?.('Linear Bearing Adapter','ok','Загружен');
})(window);
