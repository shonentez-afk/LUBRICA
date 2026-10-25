(function(global){
'use strict';
const API=global.LubricaGreasePointCalculator=global.LubricaGreasePointCalculator||{};
const num=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null};
const round=(v,d=3)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
function quantity(input={}){
 const method=input.quantityMethod||'oem_total',count=num(input.pointCount)??1,density=num(input.greaseDensity);
 let massG=null,volumeCm3=null,formula='',error='';
 if(method==='oem_total'){const g=num(input.oemTotalG);if(g>0){massG=g;volumeCm3=density>0?g/density:null;formula='G = OEM / утверждённая общая доза';}else error='Укажите OEM/утверждённую общую дозу.';}
 else if(method==='per_point_g'){const q=num(input.qtyPerPointG);if(q>0&&count>0){massG=q*count;volumeCm3=density>0?massG/density:null;formula='G = qточки × N';}else error='Укажите норму г/точку и количество одинаковых точек.';}
 else if(method==='per_point_ml'){const q=num(input.qtyPerPointMl);if(q>0&&count>0){volumeCm3=q*count;massG=density>0?volumeCm3*density:null;formula='V = qточки × N';}else error='Укажите норму мл/точку и количество одинаковых точек.';}
 else if(method==='gun_strokes'){const strokes=num(input.strokesPerPoint),gun=num(input.gunOutputGPerStroke);if(strokes>0&&gun>0&&count>0){massG=strokes*gun*count;volumeCm3=density>0?massG/density:null;formula='G = качки/точку × г/качок × N';}else error='Укажите качки на точку, калиброванную подачу шприца и количество точек.';}
 return {method,massG:round(massG),volumeCm3:round(volumeCm3),formula,error};
}
function interval(input={}){const h=num(input.intervalHours),d=num(input.intervalDays),m=num(input.intervalMonths),c=num(input.machineCycles);const n=[h>0,d>0,m>0,c>0].filter(Boolean).length;return {hours:h>0?h:null,days:d>0?d:null,months:m>0?m:null,machineCycles:c>0?c:null,rule:n>1?'whichever_first':h>0?'hours':d>0?'days':m>0?'months':c>0?'cycles':'unspecified'}}
function warnings(input={},r={}){const out=[];if(!(r.quantity.massG>0))out.push('Доза не рассчитана: требуется OEM, измеренная или утверждённая инженерная норма.');if(input.quantityMethod==='gun_strokes'&&!(num(input.gunOutputGPerStroke)>0))out.push('Для расчёта по качкам требуется фактически откалиброванная подача шприца, г/качок.');if(input.contamination==='heavy')out.push('Сильное загрязнение: проверьте очистку точки, уплотнение и фактический интервал.');if(input.temperatureClass==='high')out.push('Повышенная температура: проверьте материал и интервал по OEM.');return [...new Set(out)]}
function calculate(input={}){const r={quantity:quantity(input),interval:interval(input)};r.warnings=warnings(input,r);return r}
API.quantity=quantity;API.interval=interval;API.warnings=warnings;API.calculate=calculate;
global.LubricaSystem?.registerModule?.('Grease Point Calculator','ok','Загружен');
})(window);
