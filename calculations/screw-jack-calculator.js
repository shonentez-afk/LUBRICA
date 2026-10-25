(function(global){
'use strict';
const API=global.LubricaScrewJackCalculator=global.LubricaScrewJackCalculator||{};
const num=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null};
const round=(v,d=2)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
function interval(input={}){
 const cycles=num(input.cyclesPerHour),hours=num(input.operatingHoursPerDay),legacyDuty=num(input.dutyCyclePct);
 const env=input.environment||'normal',usage=input.usageMode||'normal';
 // LUBRICA engineering trigger. OEM FRANCIA defines the service context/procedure; numerical environment/intensity factors and interval below are LUBRICA engineering rules.
 // Simple mode intentionally uses two understandable factors only: environment + operating intensity.
 const baseCycles=500;
 const envFactor={clean:1,normal:.75,dusty:.5,severe:.25}[env]??.75;
 const usageFactor=input.usageMode?({rare:1,normal:.8,intensive:.6}[usage]??.8):(legacyDuty!=null?(legacyDuty>50?.6:legacyDuty>25?.8:1):.8);
 const targetCycles=Math.max(50,Math.round(baseCycles*envFactor*usageFactor));
 let hoursInterval=null,daysInterval=null;
 if(cycles>0)hoursInterval=round(targetCycles/cycles,1);
 if(hoursInterval!=null&&hours>0)daysInterval=round(hoursInterval/hours,1);
 return {targetCycles,hours:hoursInterval,days:daysInterval,method:'lubrica_simple_francia_profile',sourceId:'LUBRICA-SCREW-JACK-PROFILE',datasetId:'LUBRICA-SCREW-JACK-PROFILE-V1',confidence:'D',requiresOEMConfirmation:true,environment:env,usageMode:usage};
}
function calculate(input={}){
 const r={interval:interval(input),quantity:{mode:'procedure_or_calibrated',approvedMassG:num(input.approvedMassG),calibratedMassG:num(input.calibratedMassG)}};
 const warnings=[];
 if(input.environment==='severe')warnings.push('Тяжёлая среда: интервал сокращён. Проверяйте состояние винта и гайки чаще при попадании воды, абразива или густой пыли.');
 r.warnings=[...new Set(warnings)];return r;
}
API.interval=interval;API.calculate=calculate;
global.LubricaSystem?.registerModule?.('Screw Jack Calculator','ok','FRANCIA / простой профиль винтовых домкратов');
})(window);
