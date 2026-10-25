(function(global){
'use strict';
const rows=global.LubricaComponentStarterData=global.LubricaComponentStarterData||[];
const source='FRANCIA — Screw Jacks catalogue 2018, General info / M42 technical data';
const sourceUrl='https://www.francia.it/wp-content/uploads/2025/10/CATALOGO-MARTINETTI-2018-1.pdf';
rows.push(
 {id:'STD-FRANCIA-M42VR-GEARBOX',category:'gearbox_oil',designation:'M42VR-TP-N-700-T-B-P2-1',aliases:['M42VR','M42(I).VR','M42 VR','FRANCIA M42VR','M42VR-TP-N-T-700-B-P2-1'],name:'Редукторная часть винтового домкрата M42VR',manufacturer:'FRANCIA',model:'M42VR',standard:'FRANCIA M42(I) VR',technicalData:{gearboxType:'червячный механизм винтового домкрата',fixedFillLiters:0.15,lubricantVolumeCm3:150,series:'M',size:'M42',execution:'VR',gearRatio:'N 1/24',liftingScrew:'Tr30x6',strokeMm:700},lubricationData:{lubricantType:'минеральная пластичная смазка',nlgi:'00',recommendedGrease:'Gazpromneft Grease L EP 00',maintenancePolicy:'long_life_refill_if_needed',quantity:150,quantityUnit:'см³',intervalType:'condition'},sourceReference:source,sourceUrl,notes:'OEM: корпус домкрата M42 имеет 150 см³ минеральной смазки NLGI 00. Смазка долговременная; замена/долив выполняются при необходимости, а не по придуманному фиксированному интервалу.'},
 {id:'STD-FRANCIA-M42VR-SCREW',category:'screw_drive',designation:'M42VR-TP-N-700-T-B-P2-1',aliases:['M42VR','M42(I).VR','M42 VR','FRANCIA M42VR','Tr30x6','M42VR-TP-N-T-700-B-P2-1'],name:'Винт / гайка винтового домкрата M42VR',manufacturer:'FRANCIA',model:'M42VR',standard:'FRANCIA M42(I) VR',technicalData:{screwType:'трапецеидальная винтовая пара, вращающийся винт VR',diameterMm:30,leadMm:6,thread:'Tr30x6',strokeMm:700,series:'M',size:'M42',execution:'VR',gearRatio:'N 1/24'},lubricationData:{maintenancePolicy:'periodic_clean_film',quantityMode:'procedure_or_calibrated',oemFixedDoseG:null,oemFixedInterval:null,recommendedGreases:['KAPPA Special Aluminum grease EP','ROTHEN 2000/P SPECIAL','KLUBER STRUCTOVIS CHD','FINA CERAN WR2','BECHEM-RHUS BERUTOX M 21 KN'],procedure:'Очистить рабочую часть винта от загрязнений и обеспечить непрерывный чистый слой смазки между винтом и гайкой. Повторять периодически с учётом среды, времени работы, скорости и числа циклов.'},sourceReference:source,sourceUrl,notes:'FRANCIA не задаёт для подъёмного винта M42VR универсальную дозу в граммах или один фиксированный интервал. Норма должна подтверждаться OEM/локальной процедурой или калибровкой фактического нанесения.'}
);
const family=[
 ['M35','Tr20x4',50,'1/20','1/5'],
 ['M42','Tr30x6',150,'1/24','1/6'],
 ['M55','Tr40x7',400,'1/28','1/7'],
 ['M75','Tr60x9',750,'1/36','1/9']
];
for(const [size,thread,volume,ratioN,ratioV] of family){
 for(const execution of ['VT','VR']){
  const key=`${size}${execution}`;
  if(rows.some(x=>x.id===`STD-FRANCIA-${key}-GEARBOX-GENERIC`))continue;
  rows.push({id:`STD-FRANCIA-${key}-GEARBOX-GENERIC`,category:'gearbox_oil',designation:key,aliases:[`${size}(I).${execution}`,`${size} ${execution}`,`FRANCIA ${key}`],name:`Редукторная часть винтового домкрата ${key}`,manufacturer:'FRANCIA',model:key,standard:`FRANCIA ${size} ${execution}`,technicalData:{gearboxType:'червячный механизм винтового домкрата',fixedFillLiters:volume/1000,lubricantVolumeCm3:volume,series:'M',size,execution,gearRatio:`N ${ratioN} / V ${ratioV}`,liftingScrew:thread},lubricationData:{lubricantType:'минеральная пластичная смазка',nlgi:'00',recommendedGrease:'Gazpromneft Grease L EP 00',maintenancePolicy:'long_life_refill_if_needed',quantity:volume,quantityUnit:'см³',intervalType:'condition'},sourceReference:source,sourceUrl,notes:'OEM-объём смазки корпуса; долговременная смазка, обслуживание по состоянию/необходимости.'});
  rows.push({id:`STD-FRANCIA-${key}-SCREW-GENERIC`,category:'screw_drive',designation:key,aliases:[`${size}(I).${execution}`,`${size} ${execution}`,`FRANCIA ${key}`,thread],name:`Винт / гайка винтового домкрата ${key}`,manufacturer:'FRANCIA',model:key,standard:`FRANCIA ${size} ${execution}`,technicalData:{screwType:`трапецеидальная винтовая пара, ${execution==='VR'?'вращающийся':'поступательный'} винт ${execution}`,diameterMm:Number(thread.match(/Tr(\d+)/i)?.[1]||0),leadMm:Number(thread.match(/x(\d+)/i)?.[1]||0),thread,series:'M',size,execution,gearRatio:`N ${ratioN} / V ${ratioV}`},lubricationData:{maintenancePolicy:'periodic_clean_film',quantityMode:'procedure_or_calibrated',oemFixedDoseG:null,oemFixedInterval:null,recommendedGreases:['KAPPA Special Aluminum grease EP','ROTHEN 2000/P SPECIAL','KLUBER STRUCTOVIS CHD','FINA CERAN WR2','BECHEM-RHUS BERUTOX M 21 KN'],procedure:'Очистить рабочую часть винта от загрязнений и обеспечить непрерывный чистый слой смазки между винтом и гайкой.'},sourceReference:source,sourceUrl,notes:'OEM не задаёт универсальную дозу винта в граммах или один фиксированный интервал; обслуживание зависит от среды, времени работы, скорости и циклов.'});
 }
}

})(window);
