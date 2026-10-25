(function(global){
'use strict';
const API=global.LubricaLinearBearingCalculator=global.LubricaLinearBearingCalculator||{};
const num=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null};
const round=(v,d=3)=>Number.isFinite(v)?Number(v.toFixed(d)):null;

const subtypes=Object.freeze({
  profile_ball:{label:'Профильная шариковая направляющая'},
  profile_roller:{label:'Профильная роликовая направляющая'},
  linear_bushing:{label:'Линейная шариковая втулка'},
  shaft_guide:{label:'Линейная опора на валу'},
  linear_module:{label:'Линейный модуль / актуатор'},
  other:{label:'Другой линейный узел'}
});

function orientationFactor({orientation='horizontal',orientationRule='none'}={}){
  if(orientationRule==='hiwin_50'&&['vertical','side','rail_up'].includes(orientation))return 1.5;
  return 1;
}
function relubeQuantity(input={}){
  const unitCount=num(input.unitCount),qtyPerUnitCm3=num(input.qtyPerUnitCm3),density=num(input.greaseDensity);
  const factor=orientationFactor(input);
  if(!(unitCount>0))return {volumeCm3:null,massG:null,factor,error:'Укажите количество кареток / втулок.'};
  if(!(qtyPerUnitCm3>0))return {volumeCm3:null,massG:null,factor,error:'Укажите подтверждённую норму производителя на одну каретку / втулку.'};
  const volume=qtyPerUnitCm3*unitCount*factor;
  return {
    volumeCm3:round(volume,3),
    massG:density>0?round(volume*density,3):null,
    unitCount,
    qtyPerUnitCm3,
    factor,
    density,
    formula:'V = qOEM × N × Korient',sourceId:input.orientationRule==='hiwin_50'&&factor===1.5?'HIWIN-LINEAR-GUIDE':null
  };
}
function initialQuantity(input={}){
  const unitCount=num(input.unitCount),partialQtyCm3=num(input.initialQtyPerUnitCm3),passes=num(input.initialPasses)??1,density=num(input.greaseDensity);
  const factor=orientationFactor(input);
  if(!(unitCount>0&&partialQtyCm3>0))return {volumeCm3:null,massG:null,error:'Для первичной смазки задайте OEM-норму на один элемент.'};
  const safePasses=passes>0?passes:1;
  const volume=partialQtyCm3*unitCount*safePasses*factor;
  return {volumeCm3:round(volume,3),massG:density>0?round(volume*density,3):null,passes:safePasses,factor,formula:'V0 = q0 × N × циклы × Korient'};
}
function interval(input={}){
  const source=input.intervalSource||'oem';
  let calendarMin=num(input.calendarMonthsMin),calendarMax=num(input.calendarMonthsMax);
  if(source==='thk_reference'){calendarMin=3;calendarMax=6;}
  return {
    source,
    calendarMonthsMin:calendarMin>0?round(calendarMin,1):null,
    calendarMonthsMax:calendarMax>0?round(calendarMax,1):null,
    rule:'calendar',
    sourceId:source==='thk_reference'?'THK-LINEAR-LUBRICATION':null,
    text:calendarMin||calendarMax?`${calendarMin||calendarMax}${calendarMax&&calendarMax!==calendarMin?`–${calendarMax}`:''} мес.`:''
  };
}
function warnings(input={},results={}){
  const out=[];
  const stroke=num(input.strokeMm),blockLength=num(input.blockLengthMm);
  if(stroke>0&&blockLength>0&&stroke<2*blockLength)out.push('Короткий ход: ход меньше 2× длины каретки. Требуется специальная схема смазки по инструкции производителя.');
  if(['heavy','severe'].includes(input.contamination))out.push('Сильное загрязнение сокращает интервал смазки. Используйте OEM/фактический интервал и контролируйте наличие смазочной плёнки.');
  if(input.loadClass==='heavy')out.push('Высокая нагрузка обычно требует сокращения интервала; конкретный коэффициент должен идти из OEM или утверждённой методики.');
  if(input.vibration==='high')out.push('Высокая вибрация может требовать сокращения интервала.');
  if(input.orientationRule==='none'&&['vertical','side','rail_up'].includes(input.orientation))out.push('Негоризонтальная установка: проверьте распределение смазки и OEM-поправку количества.');
  if(input.orientationRule==='hiwin_50'&&['vertical','side','rail_up'].includes(input.orientation))out.push('Применена поправка HIWIN +50% к количеству для выбранной негоризонтальной ориентации.');
  if(input.intervalSource==='thk_reference')out.push('THK 3–6 месяцев — справочный календарный ориентир в этой версии. Финальный интервал и количество должны быть установлены на реальной машине.');
  if(!(results.relube?.volumeCm3>0))out.push('Расчётная доза отсутствует до ввода OEM-нормы на одну каретку / втулку.');
  return [...new Set(out)];
}
function calculate(input={}){
  const relube=relubeQuantity(input),initial=initialQuantity(input),serviceInterval=interval(input);
  const results={relube,initial,interval:serviceInterval};
  results.warnings=warnings(input,results);
  return results;
}

API.subtypes=subtypes;
API.orientationFactor=orientationFactor;
API.relubeQuantity=relubeQuantity;
API.initialQuantity=initialQuantity;
API.interval=interval;
API.warnings=warnings;
API.calculate=calculate;
global.LubricaSystem?.registerModule?.('Linear Bearing Calculator','ok','Загружен');
})(window);
