(function(global){
'use strict';
const R=global.LubricaCalculationRegistry;
if(!R)throw new Error('Calculation Registry must load before Calculation Framework');

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const categoryLabels={
  bearing:'Подшипник качения',
  linear_bearing:'Линейный подшипник / направляющая качения',
  chain:'Цепь',
  gearbox_oil:'Редуктор',
  oil_system:'Масляная система',
  coupling:'Муфта',
  open_gear:'Открытая зубчатая передача',
  guide:'Направляющая',
  joint:'Шарнир',
  bushing:'Втулка',
  screw:'Винтовая передача',
  rope:'Канат',
  central_point:'Централизованная система',
  other:'Прочая точка'
};
function genericDialog(context,status){
  const dlg=document.getElementById('bearingCalcDialog')||document.getElementById('actionDialog');
  if(!dlg)return false;
  const category=context.category||context.point?.category||'other';
  const m=status.module;
  dlg.innerHTML=`<div class="calculation-framework-dialog">
    <div class="dialog-head"><div><span class="eyebrow">РАСЧЁТНЫЙ МОДУЛЬ</span><h2>${esc(m?.title||categoryLabels[category]||category)}</h2><p class="dialog-copy">${esc(m?.description||status.message)}</p></div><button type="button" class="icon-btn" data-close>×</button></div>
    <div class="calculation-framework-state ${status.registered?'planned':'missing'}">
      <strong>${status.registered?'Модуль зарегистрирован, но пока не реализован':'Расчётный модуль ещё не подключён'}</strong>
      <span>Категория: ${esc(categoryLabels[category]||category)}</span>
      ${context.task?.operation?`<span>Мероприятие: ${esc(context.task.operation)}</span>`:''}
    </div>
    ${m?.capabilities?.length?`<div class="calculation-capabilities"><h3>Запланированные возможности</h3>${m.capabilities.map(x=>`<div>• ${esc(x)}</div>`).join('')}</div>`:''}
    <div class="wizard-note"><b>Это штатное состояние, а не ошибка.</b><span>Calculation Framework уже знает, какой модуль должен обслуживать эту категорию. Сам расчёт будет подключён отдельным функциональным этапом.</span></div>
    <menu><button type="button" class="btn primary" data-close>Закрыть</button></menu>
  </div>`;
  dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dlg.close());
  dlg.showModal();
  return true;
}
function open(context={}){
  const status=R.statusFor(context);
  if(status.ready){
    try{return status.module.open(context)!==false}
    catch(e){
      global.LubricaSystem?.notify?.(`Ошибка расчётного модуля ${status.module.id}: ${e.message||e}`,'error',{module:'calculation-framework',stack:e.stack||''});
      return false;
    }
  }
  return genericDialog(context,status);
}
function summary(context={}){
  const status=R.statusFor(context);
  if(status.module?.summarize){
    try{return status.module.summarize(context)}
    catch(e){return {title:status.module.title,status:'error',text:e.message||String(e)}}
  }
  return {
    title:status.module?.title||categoryLabels[context.category||context.point?.category]||'Расчёт',
    status:status.ready?'ready':status.registered?'planned':'missing',
    text:status.message
  };
}
function moduleStatus(context={}){return R.statusFor(context)}
function markResult(point,moduleId,meta={}){
  if(!point||!moduleId)return null;
  point.calculations=point.calculations||{};
  const record={
    moduleId:String(moduleId),
    version:String(meta.version||'1'),
    status:meta.status||'calculated',
    calculatedAt:meta.calculatedAt||new Date().toISOString(),
    approved:!!meta.approved,
    warningCount:Number(meta.warningCount)||0,
    source:meta.source||'',
    summary:meta.summary||''
  };
  point.calculations[moduleId]=record;
  return record;
}
function getResultMeta(point,moduleId){return point?.calculations?.[moduleId]||null}
function materialContext(context={}){return global.LubricaMaterialIntegration?.source?.(context.point,context)||null}
function engineeringSource(point,key){return global.LubricaEngineeringSources?.get?.(point,key)||null}
function setEngineeringSource(point,key,value){return global.LubricaEngineeringSources?.set?.(point,key,value)||null}
global.LubricaCalculations=Object.freeze({open,summary,moduleStatus,markResult,getResultMeta,materialContext,engineeringSource,setEngineeringSource,categoryLabels});
global.LubricaSystem?.registerModule?.('Calculation Framework','ok','Загружен');
})(window);
