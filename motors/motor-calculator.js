(function(global){
'use strict';
const OEM=global.LubricaMotorOEM,Resolver=global.LubricaMotorMethodResolver;
if(!OEM||!Resolver)throw new Error('Motor OEM Data and Motor Method Resolver must load before Motor Calculator');
const num=v=>{const raw=String(v??'').trim();if(!raw)return null;const n=Number(raw.replace(',','.'));return Number.isFinite(n)?n:null};
function calculate(input={}){
 const method=Resolver.resolve(input),profile=method.profile;
 const rpm=num(input.rpm)??profile.rpm, powerKw=num(input.powerKw)??profile.powerKw;
 const plateDoseG=num(input.plateDoseG),plateIntervalHours=num(input.plateIntervalHours),plateSource=String(input.plateSource||'').trim(),plateGrease=String(input.plateGrease||'').trim();
 const nipple=input.nippleConfirmed===true||String(input.nippleConfirmed)==='yes';
 const noNipple=input.nippleConfirmed===false||String(input.nippleConfirmed)==='no';
 const sourceIds=[...(profile.sourceIds||[])];
 const base={moduleId:'motor-bearing',method,profile,rpm,powerKw,sourceIds,mode:'review',relube:null,policy:null,maintenancePolicy:null,warnings:[],needs:[],plate:{doseG:plateDoseG,intervalHours:plateIntervalHours,source:plateSource,grease:plateGrease}};
 const finish=(x)=>{x.maintenancePolicy={id:x.policy||'REVIEW',label:x.policy==='NO_ROUTINE_RELUBE'?'Плановое досмазывание не предусмотрено':x.policy==='RELUBE'?'Плановое досмазывание':'Требуется подтверждение',sourceManufacturer:x.profile?.manufacturer||'',reason:x.profile?.reason||''};x.calculationPackage={moduleId:'motor-bearing',methodId:x.method?.id||'',methodLabel:x.method?.label||'',maintenancePolicy:x.maintenancePolicy,sourceIds:[...(x.sourceIds||[])],provenance:{catalogBaseline:(x.mode!=='machine_oem'&&x.relube)?{doseG:x.relube.doseG??null,intervalHours:x.relube.intervalHours??null,grease:x.relube.grease||null,source:x.relube.source||'',sourceId:x.relube.sourceId||null,confidence:x.relube.confidence||''}:null,machineSpecificOverride:x.mode==='machine_oem'?{doseG:x.relube?.doseG??null,intervalHours:x.relube?.intervalHours??null,grease:x.relube?.grease||null,source:x.plate?.source||'',confidence:x.relube?.confidence||''}:null},input:{motorText:input.motorText||input.motorName||'',rpm:x.rpm,powerKw:x.powerKw,nippleConfirmed:input.nippleConfirmed??null,bearingType:input.bearingType||null},bearingConstruction:x.profile?.bearingConstruction?{...x.profile.bearingConstruction}:null,result:x.relube?{...x.relube}:null,warnings:[...(x.warnings||[])],needs:[...(x.needs||[])]};return x;};
 if((plateDoseG>0||plateIntervalHours>0||plateGrease)&&!plateSource){base.needs.push('Укажите источник данных таблички/инструкции двигателя.');base.warnings.push('Введённые данные двигателя не получают OEM-приоритет без источника.');}
 if(plateSource&&(plateDoseG>0||plateIntervalHours>0)){
   base.mode='machine_oem';base.policy='RELUBE';base.relube={doseG:plateDoseG,intervalHours:plateIntervalHours,grease:plateGrease,source:'Табличка/инструкция конкретного двигателя',sourceId:null,confidence:'A — machine-specific OEM'};return finish(base);
 }
 if(profile.policy==='NO_ROUTINE_RELUBE'){
   base.mode='sealed_for_life';base.policy='NO_ROUTINE_RELUBE';base.relube={doseG:null,intervalHours:null,source:profile.manufacturer,confidence:'A/B — OEM family policy'};return finish(base);
 }
 if(profile.manufacturer==='LAMMERS'&&profile.policy==='LAMMERS_1TZ9_STANDARD'){
   const lr=OEM.lammersRelube({family:profile.family,frame:profile.frame,poles:profile.bearingConstruction?.poles});
   if(!lr){base.needs.push('Для этого исполнения Lammers нет однозначной локализованной строки. Используйте табличку двигателя.');base.policy='MACHINE_PLATE';return finish(base);}
   base.mode='lammers_1tz9';base.policy='RELUBE';base.relube={doseG:lr.doseG,intervalHours:lr.intervalHours,doseRange:lr.doseRange||null,source:'Lammers 1TZ9 catalogue baseline',sourceId:OEM.SOURCES.LAMMERS_1TZ,confidence:'A — OEM catalogue table',perPoint:true,servicePoints:2};
   base.warnings.push('Каталожное значение Lammers является базовым для нормальной конфигурации и CT ≤ 40 °C. Табличка досмазывания конкретного двигателя имеет приоритет.');
   return finish(base);
 }
 if(profile.manufacturer==='SIEMENS/INNOMOTICS'&&profile.policy==='CONFIRM_NIPPLE'){
   if(noNipple){base.mode='sealed_confirmed';base.policy='NO_ROUTINE_RELUBE';base.relube={doseG:null,intervalHours:null,source:'Siemens/Innomotics basic construction',sourceId:OEM.SOURCES.SIEMENS_D81,confidence:'A/B — OEM basic version + user-confirmed construction'};return finish(base);}
   if(!nipple){base.needs.push('Базовое исполнение 1LE использует постоянно смазанные подшипники. Если на конкретном двигателе есть система досмазывания, подтвердите пресс-маслёнки и используйте lubrication plate.');base.policy='CONFIRM_NIPPLE';return finish(base);}
   base.needs.push('Система досмазывания подтверждена. Введите дозу, интервал и источник с lubrication plate конкретного двигателя; каталожная planning-таблица не заменяет табличку машины.');base.policy='MACHINE_PLATE';return finish(base);
 }
 if(profile.manufacturer==='ABB'){
   const standardRegrease=profile.policy==='ABB_L1_STANDARD'||profile.bearingConstruction?.regreasableStandard===true;
   if(noNipple&&!standardRegrease){base.mode='sealed_confirmed';base.policy='NO_ROUTINE_RELUBE';base.relube={doseG:null,intervalHours:null,source:'Подтверждённая конструкция двигателя',confidence:'User-confirmed construction + OEM family'};return finish(base);}
   if(!nipple&&!standardRegrease){base.needs.push('Подтвердите наличие пресс-маслёнок/системы досмазывания на этом двигателе.');base.policy='CONFIRM_NIPPLE';return finish(base);}
   const bearingType=String(input.bearingType||'ball');const l1=OEM.abbL1({frame:profile.frame,rpm,powerKw,bearingType,family:profile.family});
   if(!l1){base.needs.push('Для этого типоразмера нет локализованной строки ABB L1. Используйте табличку двигателя или фактический подшипник.');return finish(base);}
   if(l1.error){base.needs.push(l1.error);base.policy='RELUBE_PENDING';base.relube={doseG:l1.greaseG,intervalHours:null,source:'ABB L1 table',sourceId:l1.sourceId,confidence:'B — OEM method'};return finish(base);}
   base.mode='abb_l1';base.policy='RELUBE';base.relube={doseG:l1.greaseG,intervalHours:l1.intervalHours,source:'ABB L1 table',sourceId:l1.sourceId,confidence:'B — OEM method',speedKey:l1.speedKey,powerBand:l1.band,bearingType};return finish(base);
 }
 if(profile.policy==='MACHINE_PLATE'){
   base.needs.push('Введите значения с таблички смазки/точной OEM-инструкции: доза, интервал и источник.');base.policy='MACHINE_PLATE';return finish(base);
 }
 if(profile.policy==='EXACT_OEM_ONLY'){
   base.needs.push('Нужна точная инструкция по узлу/part number; generic IEC-метод не применяется.');base.policy='EXACT_OEM_ONLY';return finish(base);
 }
 base.needs.push('Уточните производителя/серию двигателя или фактические DE/NDE подшипники и источник.');base.policy='REQUIRE_IDENTIFICATION';return finish(base);
}
global.LubricaMotorCalculator=Object.freeze({calculate});
global.LubricaSystem?.registerModule?.('Motor Calculation Core','ok','OEM-first motor bearing service resolver');
})(window);
