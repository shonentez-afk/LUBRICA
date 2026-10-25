(function(global){
'use strict';
const API=global.LubricaGearboxOilCalculator=global.LubricaGearboxOilCalculator||{};
const num=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null};
const round=(v,d=3)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
function fill(input={}){
  const oem=num(input.oemFillLiters),approved=num(input.approvedFillLiters),current=num(input.currentFillLiters),topup=num(input.topupLiters);
  return {oemFillLiters:oem>0?round(oem,3):null,approvedFillLiters:approved>0?round(approved,3):null,currentFillLiters:current>=0?round(current,3):null,topupLiters:topup>0?round(topup,3):null,effectiveFillLiters:approved>0?round(approved,3):oem>0?round(oem,3):null};
}
function interval(input={}){
  const hours=num(input.changeHours),months=num(input.changeMonths),firstHours=num(input.firstChangeHours);
  return {hours:hours>0?round(hours,0):null,months:months>0?round(months,1):null,firstChangeHours:firstHours>0?round(firstHours,0):null,conditionBased:!!input.conditionBased,rule:(hours>0&&months>0)?'whichever_first':hours>0?'hours':months>0?'calendar':input.conditionBased?'condition':'unspecified'};
}
function warnings(input={},result={}){
  const out=[];
  if(!(result.fill.oemFillLiters>0||result.fill.approvedFillLiters>0))out.push('Не задан рабочий объём масла. Используйте шильдик/OEM или подтверждённый уровень, а не расчёт по геометрии корпуса.');
  if(result.fill.oemFillLiters>0)out.push('Количество масла из документации является исходной нормой; при наличии щупа, смотрового стекла или уровневой пробки решающим остаётся фактический контроль уровня по OEM.');
  if(input.lubricationMethod==='pressure'&&!input.oilSystemIncluded)out.push('Указана принудительная/циркуляционная смазка: объём внешнего контура и маслоохладителя должен быть учтён отдельно.');
  if(input.oilCondition==='bad')out.push('Состояние масла отмечено как неудовлетворительное: требуется внеплановая проверка/анализ и решение о замене.');
  if(input.leakage==='yes')out.push('Есть утечка масла: долив не заменяет устранение причины утечки.');
  if(input.temperatureClass==='high')out.push('Повышенная температура масла может сокращать ресурс смазочного материала. Интервал должен подтверждаться OEM/анализом масла.');
  if(!(result.interval.hours||result.interval.months||result.interval.conditionBased))out.push('Периодичность замены масла не задана. Укажите OEM-интервал по часам/календарю либо обслуживание по анализу состояния.');
  return [...new Set(out)];
}
function calculate(input={}){const result={fill:fill(input),interval:interval(input)};result.warnings=warnings(input,result);return result;}
API.fill=fill;API.interval=interval;API.warnings=warnings;API.calculate=calculate;
global.LubricaSystem?.registerModule?.('Gearbox Oil Calculator','ok','Загружен');
})(window);
