(function(global){
'use strict';
const API=global.LubricaBallScrewCalculator=global.LubricaBallScrewCalculator||{};
const num=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null};
const round=(v,d=3)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
function quantity(input={}){
 const method=input.quantityMethod||'oem_per_nut',nuts=num(input.nutCount)??1,density=num(input.greaseDensity);
 let massG=null,volumeCm3=null,formula='',error='';
 if(method==='oem_per_nut'){const q=num(input.oemQtyPerNutG);if(q>0&&nuts>0){massG=q*nuts;volumeCm3=density>0?massG/density:null;formula='G = qOEM/гайку × Nгаек';}else error='Укажите OEM-норму на одну гайку и количество гаек.';}
 else if(method==='oem_total'){const q=num(input.oemTotalG);if(q>0){massG=q;volumeCm3=density>0?q/density:null;formula='G = OEM / утверждённая общая доза';}else error='Укажите OEM/утверждённую общую дозу.';}
 else if(method==='gun_strokes'){const st=num(input.strokesPerNut),gun=num(input.gunOutputGPerStroke);if(st>0&&gun>0&&nuts>0){massG=st*gun*nuts;volumeCm3=density>0?massG/density:null;formula='G = качки/гайку × г/качок × Nгаек';}else error='Укажите качки на гайку и калиброванную подачу шприца.';}
 return {method,massG:round(massG),volumeCm3:round(volumeCm3),formula,error};
}
function interval(input={}){const h=num(input.intervalHours),d=num(input.intervalDays),m=num(input.intervalMonths),c=num(input.machineCycles);const n=[h>0,d>0,m>0,c>0].filter(Boolean).length;return {hours:h>0?h:null,days:d>0?d:null,months:m>0?m:null,machineCycles:c>0?c:null,rule:n>1?'whichever_first':h>0?'hours':d>0?'days':m>0?'months':c>0?'cycles':'unspecified'}}
function warnings(input={},r={}){const out=[];if(!(r.quantity.massG>0))out.push('Для ШВП не задана универсальная геометрическая формула дозы. Требуется OEM/измеренная/утверждённая норма.');const stroke=num(input.strokeMm),nutLength=num(input.nutLengthMm);if(stroke>0&&nutLength>0&&stroke<2*nutLength)out.push('Короткий рабочий ход относительно длины гайки: проверьте распределение смазки и OEM-инструкцию.');if(input.orientation==='vertical')out.push('Вертикальная ШВП: проверьте OEM-рекомендации по распределению смазки и интервалу; автоматический коэффициент не применяется.');if(input.contamination==='heavy')out.push('Сильное загрязнение: проверьте защитные элементы, очистку винта и интервал.');if(input.speedClass==='high')out.push('Высокая скорость: проверьте тип материала, подачу и интервал по OEM.');return [...new Set(out)]}
function calculate(input={}){const r={quantity:quantity(input),interval:interval(input)};r.warnings=warnings(input,r);return r}
API.quantity=quantity;API.interval=interval;API.warnings=warnings;API.calculate=calculate;
global.LubricaSystem?.registerModule?.('Ball Screw Calculator','ok','Загружен');
})(window);
