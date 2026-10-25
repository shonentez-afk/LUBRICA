(function(global){
'use strict';
const API=global.LubricaCouplingCalculator=global.LubricaCouplingCalculator||{};
const num=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null};
const round=(v,d=3)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
function quantity(input={}){
 const method=input.quantityMethod||'oem_total',density=num(input.greaseDensity);
 const oem=num(input.oemTotalG),volume=num(input.cavityVolumeCm3),fill=num(input.fillRatio);
 let massG=null,greaseVolumeCm3=null,error='',formula='';
 if(method==='oem_total'){
   if(oem>0){massG=oem;greaseVolumeCm3=density>0?oem/density:null;formula='G = OEM / утверждённая норма';}
   else error='Укажите OEM/утверждённую массу смазки.';
 }else if(method==='cavity'){
   if(volume>0&&fill>0&&fill<=1&&density>0){greaseVolumeCm3=volume*fill;massG=greaseVolumeCm3*density;formula='G = Vполости × Kзап × ρ';}
   else error='Укажите подтверждённый объём полости, коэффициент заполнения 0…1 и плотность.';
 }
 return {method,massG:round(massG,3),greaseVolumeCm3:round(greaseVolumeCm3,3),formula,error};
}
function interval(input={}){
 const hours=num(input.intervalHours),months=num(input.intervalMonths);
 return {hours:hours>0?round(hours,1):null,months:months>0?round(months,1):null,rule:hours>0&&months>0?'whichever_first':hours>0?'hours':months>0?'calendar':'unspecified'};
}
function warnings(input={},result={}){
 const out=[];
 if(!(result.quantity.massG>0))out.push('Количество смазки не рассчитано. Не используйте универсальный процент заполнения без OEM или утверждённой методики.');
 if(input.quantityMethod==='cavity')out.push('Расчёт по объёму полости допустим только при подтверждённом объёме и коэффициенте заполнения для конкретной конструкции муфты.');
 if(input.couplingType==='flexible_dry')out.push('Выбран тип муфты, который обычно не требует заполнения смазкой. Проверьте необходимость точки смазки по OEM.');
 if(input.leakage==='yes')out.push('Есть утечка смазки: пополнение не заменяет проверку уплотнений и причины утечки.');
 if(input.contamination==='heavy')out.push('Сильное загрязнение: проверьте уплотнения и интервал обслуживания.');
 if(input.temperatureClass==='high')out.push('Повышенная температура: проверьте совместимость материала и интервал по OEM.');
 return [...new Set(out)];
}
function calculate(input={}){const result={quantity:quantity(input),interval:interval(input)};result.warnings=warnings(input,result);return result}
API.quantity=quantity;API.interval=interval;API.warnings=warnings;API.calculate=calculate;
global.LubricaSystem?.registerModule?.('Coupling Calculator','ok','Загружен');
})(window);
