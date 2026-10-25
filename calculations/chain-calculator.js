(function(global){
'use strict';
const API=global.LubricaChainCalculator=global.LubricaChainCalculator||{};
const num=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null};
const round=(v,d=3)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const PITCH_B={
 '06B':9.525,'08B':12.7,'10B':15.875,'12B':19.05,'16B':25.4,'20B':31.75,'24B':38.1,'28B':44.45,'32B':50.8,'40B':63.5,'48B':76.2,'56B':88.9,'64B':101.6,'72B':114.3
};
function normalizeDesignation(designation=''){
 // Imported equipment lists often contain Cyrillic "В" instead of Latin "B"
 // in ISO 606 B-series designations (for example 16В-1). Normalize only the
 // designation-like pattern so ordinary Russian text is not transliterated.
 return String(designation)
   .toUpperCase()
   .replace(/[‐‑‒–—−]/g,'-')
   .replace(/(\d{2})\s*В(?=\s*[-/]?\s*[123]?\b)/g,'$1B')
   .replace(/\s+/g,'');
}
function inferStandard(designation=''){
 const s=normalizeDesignation(designation);
 const m=s.match(/(?:RS)?(\d{2}B)(?:[-/]?([123]))?/);
 if(!m||!PITCH_B[m[1]])return null;
 return {series:m[1],pitchMm:PITCH_B[m[1]],strandCount:Number(m[2]||1),designation:`${m[1]}-${m[2]||1}`,standard:'ISO 606 / DIN 8187'};
}
function engineeringRatePerM(input={}){
 const pitch=num(input.pitchMm),strands=num(input.strandCount)||1;
 if(!(pitch>0))return null;
 // iwis practical starting point: 3 ml/m for 10B-1. LUBRICA scales only as an engineering starting point by pitch and strands.
 const q=3*(pitch/15.875)*strands;
 return round(q,2);
}
function simpleInterval(input={}){
 const method=input.applicationMethod||'manual';
 if(method==='drip')return {mode:'continuous',text:'Непрерывная капельная подача',hours:null,source:'U.S. Tsubaki / Renold — drip lubrication',sourceId:'TSUBAKI-CHAIN-LUBRICATION'};
 if(method==='bath'||method==='pump')return {mode:'continuous',text:'Непрерывная система смазывания',hours:null,source:'U.S. Tsubaki — oil bath / pump lubrication',sourceId:'TSUBAKI-CHAIN-LUBRICATION'};
 let h=8; // OEM general guidance for manual roller-chain lubrication
 const env=input.environment||'normal';
 const temp=input.temperatureClass||'normal';
 if(env==='dusty'||env==='wet')h*=0.5;
 if(env==='severe')h*=0.25;
 if(temp==='high')h*=0.5;
 h=Math.max(1,h);
 return {mode:'interval',hours:round(h,1),text:`каждые ${round(h,1)} ч работы`,source:h===8?'U.S. Tsubaki / Renold — manual lubrication baseline':'LUBRICA Engineering — OEM 8 h baseline adjusted for conditions',sourceId:h===8?'TSUBAKI-CHAIN-LUBRICATION':'LUBRICA-CHAIN-ENGINEERING'};
}
function dripRate(input={}){
 const strands=num(input.strandCount)||1;
 const speed=input.speedClass||'normal';
 const perStrand=speed==='high'?20:speed==='low'?5:10;
 return {dropsPerMin:perStrand*strands,perStrand,source:'U.S. Tsubaki — 5–20 drops/min per strand depending on speed',sourceId:'TSUBAKI-CHAIN-LUBRICATION'};
}
function simpleRecommendation(input={}){
 const method=input.applicationMethod||'manual';
 const lengthM=num(input.chainLengthM);
 const rate=engineeringRatePerM(input);
 const interval=simpleInterval(input);
 const out={method,ratePerM:rate,interval,volumeMl:null,drip:null,ready:false,missing:[],sourceQuantity:''};
 if(method==='manual'||method==='brush'||method==='spray'){
   if(!(lengthM>0))out.missing.push('длина цепи');
   if(!(rate>0))out.missing.push('шаг цепи');
   if(!out.missing.length){out.volumeMl=round(lengthM*rate,2);out.ready=true;out.sourceQuantity='LUBRICA Engineering starting dose based on iwis 3 ml/m for 10B-1, scaled by pitch and strand count';out.sourceQuantityId='LUBRICA-CHAIN-ENGINEERING';}
 }else if(method==='drip'){
   out.drip=dripRate(input);out.ready=true;out.sourceQuantity=out.drip.source;
 }else if(method==='bath'||method==='pump'){
   out.ready=true;out.sourceQuantity='OEM system method; service dose is not a single-shot quantity';
 }else{
   out.missing.push('способ нанесения');
 }
 return out;
}
function quantity(input={}){
  const method=input.quantityMethod||'oem_total';
  const lengthM=num(input.chainLengthM),ratePerM=num(input.ratePerM),total=num(input.oemTotal),density=num(input.lubricantDensity);
  const nozzles=num(input.nozzleCount),perNozzle=num(input.nozzleDoseMl),cycles=num(input.cyclesPerService)??1;
  let volumeMl=null,massG=null,formula='',error='';
  if(method==='oem_total'){
    if(total>0){volumeMl=total;formula='V = OEM total';}else error='Укажите OEM/утверждённую дозу на одно обслуживание.';
  }else if(method==='per_meter'){
    if(lengthM>0&&ratePerM>0){volumeMl=lengthM*ratePerM;formula='V = L × q';}else error='Укажите длину цепи и норму мл/м.';
  }else if(method==='injector'){
    if(nozzles>0&&perNozzle>0&&cycles>0){volumeMl=nozzles*perNozzle*cycles;formula='V = Nфорс × qфорс × циклы';}else error='Укажите количество форсунок, дозу форсунки и число циклов.';
  }
  if(volumeMl!=null&&density>0)massG=volumeMl*density;
  return {method,volumeMl:round(volumeMl,3),massG:round(massG,3),formula,error};
}
function interval(input={}){
  const hours=num(input.intervalHours),days=num(input.intervalDays),cycles=num(input.intervalMachineCycles);
  return {hours:hours>0?round(hours,1):null,days:days>0?round(days,1):null,machineCycles:cycles>0?round(cycles,0):null,rule:[hours>0,days>0,cycles>0].filter(Boolean).length>1?'whichever_first':hours>0?'hours':days>0?'days':cycles>0?'cycles':'unspecified'};
}
function warnings(input={},result={}){
  const out=[];
  if(!(result.quantity.volumeMl>0))out.push('Расчётная доза отсутствует. Не задавайте универсальную норму без OEM или утверждённой инженерной методики.');
  if(input.applicationTarget!=='pin_bushing')out.push('Смазочный материал должен попадать в шарнир палец–втулка и между внутренней/наружной пластинами, а не только на наружную поверхность.');
  if(input.contamination==='heavy')out.push('Сильное загрязнение: интервал и способ нанесения должны быть подтверждены по условиям эксплуатации.');
  if(input.temperatureClass==='high')out.push('Повышенная температура: проверьте вязкость/тип материала и интервал.');
  if(input.waterExposure==='yes')out.push('Есть воздействие воды/мойки: нужен материал, устойчивый к этим условиям.');
  if(input.speedClass==='high'&&input.applicationMethod==='manual')out.push('При высокой скорости ручное нанесение может быть неудобным; рассмотрите капельную/автоматическую подачу.');
  return [...new Set(out)];
}
function calculate(input={}){const result={quantity:quantity(input),interval:interval(input)};result.warnings=warnings(input,result);return result;}
API.normalizeDesignation=normalizeDesignation;API.inferStandard=inferStandard;API.engineeringRatePerM=engineeringRatePerM;API.simpleInterval=simpleInterval;API.simpleRecommendation=simpleRecommendation;API.dripRate=dripRate;API.quantity=quantity;API.interval=interval;API.warnings=warnings;API.calculate=calculate;
global.LubricaSystem?.registerModule?.('Chain Calculator','ok','Загружен · Universal Chain 1.1');
})(window);
