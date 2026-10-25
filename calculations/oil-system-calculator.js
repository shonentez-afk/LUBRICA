(function(global){'use strict';
const A=global.LubricaOilSystemCalculator=global.LubricaOilSystemCalculator||{};
const n=v=>{if(v==null||String(v).trim()==='')return null;const x=Number(String(v).replace(',','.'));return Number.isFinite(x)?x:null};
const r=(v,d=3)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
function calculate(i={}){const o=n(i.oemVolumeLiters),a=n(i.approvedVolumeLiters),cur=n(i.currentVolumeLiters),top=n(i.topupLiters),dp=n(i.filterDpBar),dpLim=n(i.filterDpLimitBar),hours=n(i.changeHours),months=n(i.changeMonths),sample=n(i.sampleHours);const volume=a>0?a:o>0?o:null;const warnings=[];
if(!(volume>0))warnings.push('Рабочий объём системы не задан. Используйте OEM/шильдик или подтверждённый фактический объём.');
if(dp!=null&&dpLim!=null&&dp>=dpLim)warnings.push('Перепад давления на фильтре достиг или превысил подтверждённый предел. Требуется обслуживание фильтра по процедуре.');
if(i.oilCondition==='bad')warnings.push('Состояние масла неудовлетворительное: требуется анализ и инженерное решение о фильтрации/замене.');
if(i.leakage==='yes')warnings.push('Есть утечка: долив не заменяет устранение причины.');
if(!(hours>0||months>0||i.conditionBased))warnings.push('Интервал замены/контроля не задан. Укажите OEM/утверждённую периодичность или обслуживание по состоянию.');
return{volume:{oem:r(o),approved:r(a),current:r(cur),topup:r(top),effective:r(volume)},filter:{dpBar:r(dp),limitBar:r(dpLim),serviceRequired:dp!=null&&dpLim!=null&&dp>=dpLim},interval:{hours:hours>0?r(hours,0):null,months:months>0?r(months,1):null,sampleHours:sample>0?r(sample,0):null,conditionBased:!!i.conditionBased,rule:hours>0&&months>0?'whichever_first':hours>0?'hours':months>0?'calendar':i.conditionBased?'condition':'unspecified'},warnings:[...new Set(warnings)]};}
A.calculate=calculate;global.LubricaSystem?.registerModule?.('Oil System Calculator','ok','Загружен');})(window);
