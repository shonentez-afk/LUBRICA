(function(global){
'use strict';
const OEM=global.LubricaMotorOEM;if(!OEM)throw new Error('Motor OEM Data must load before Motor Method Resolver');
const num=v=>{const raw=String(v??'').trim();if(!raw)return null;const n=Number(raw.replace(',','.'));return Number.isFinite(n)?n:null};
function resolve(input={}){
 const profile=OEM.resolve(input.motorText||input.motorName||'');
 const plateSource=String(input.plateSource||'').trim();
 const hasPlateValue=num(input.plateDoseG)>0||num(input.plateIntervalHours)>0;
 if(plateSource&&hasPlateValue)return {id:'motor_machine_oem',label:'OEM конкретного двигателя',profile,sourceIds:profile.sourceIds||[],evidence:'A — machine-specific OEM'};
 if(profile.policy==='NO_ROUTINE_RELUBE')return {id:'motor_sealed_oem',label:'OEM · закрытая / greased-for-life конструкция',profile,sourceIds:profile.sourceIds||[],evidence:'A/B — OEM family policy'};
 if(profile.manufacturer==='LAMMERS'&&profile.policy==='LAMMERS_1TZ9_STANDARD')return {id:'motor_lammers_1tz9_standard',label:'Lammers 1TZ9 · OEM catalogue',profile,sourceIds:profile.sourceIds||[],evidence:'A — OEM catalogue table'};
 if(profile.manufacturer==='ABB'&&profile.policy==='ABB_L1_STANDARD')return {id:'motor_abb_l1_standard',label:'ABB · штатное досмазывание + L1',profile,sourceIds:profile.sourceIds||[],evidence:'A/B — OEM construction + method'};
 if(profile.manufacturer==='SIEMENS/INNOMOTICS'&&profile.policy==='CONFIRM_NIPPLE')return {id:'motor_siemens_basic_or_plate',label:'Siemens/Innomotics · базовая конструкция / lubrication plate',profile,sourceIds:profile.sourceIds||[],evidence:'A/B — OEM planning table + procedure'};
 if(profile.manufacturer==='ABB')return {id:'motor_abb_l1',label:'ABB L1 при подтверждённом досмазывании',profile,sourceIds:profile.sourceIds||[],evidence:'B — OEM method'};
 if(profile.policy==='MACHINE_PLATE')return {id:'motor_oem_plate_required',label:'Табличка / точная инструкция двигателя',profile,sourceIds:profile.sourceIds||[],evidence:'B — OEM procedure'};
 if(profile.policy==='EXACT_OEM_ONLY')return {id:'motor_exact_oem_only',label:'Только точная OEM-инструкция узла',profile,sourceIds:profile.sourceIds||[],evidence:'X — exact OEM required'};
 return {id:'motor_identification_required',label:'Требуется идентификация двигателя',profile,sourceIds:profile.sourceIds||[],evidence:'X — insufficient OEM context'};
}
global.LubricaMotorMethodResolver=Object.freeze({resolve});
global.LubricaSystem?.registerModule?.('Motor Method Resolver','ok','OEM priority resolver');
})(window);
