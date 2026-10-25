(function(global){
'use strict';
const C=global.LubricaComponents;if(!C)throw new Error('Component Library required');
const field=(key,label,unit='',type='number',placeholder='')=>({key,label,unit,type,placeholder});
[
 {id:'bearing',fields:[
   field('d','Диаметр отверстия d','мм'),
   field('D','Наружный диаметр D','мм'),
   field('B','Ширина B','мм'),
   field('bearingType','Тип подшипника','', 'text','радиальный шарикоподшипник однорядный'),
   field('sealing','Исполнение / уплотнение','', 'text','открытый / 2Z / 2RS…')
 ]},
 {id:'linear_bearing',fields:[field('subtype','Тип линейного узла','', 'text','каретка / линейная втулка / модуль'),field('railSize','Типоразмер / серия','', 'text'),field('blockLengthMm','Длина каретки','мм')]},
 {id:'ball_screw',fields:[field('diameterMm','Наружный диаметр винта','мм'),field('leadMm','Ход винта за оборот','мм'),field('nutType','Тип гайки','', 'text'),field('nutLengthMm','Длина гайки','мм')]},
 {id:'chain',fields:[field('chainType','Тип цепной передачи','', 'text'),field('pitchMm','Шаг','мм'),field('strandCount','Количество рядов','шт'),field('standard','Стандарт','', 'text')]},
 {id:'gearbox_oil',fields:[field('gearboxType','Тип редуктора','', 'text','цилиндрический / конический / червячный…'),field('ratio','Передаточное отношение i','', 'number'),field('mountingPosition','Монтажное положение','', 'text'),field('oemFillLiters','Рекомендованный объём масла (OEM)','л')]},
 {id:'coupling',fields:[field('couplingType','Тип муфты','', 'text'),field('size','Размер','', 'text'),field('cavityVolumeCm3','Объём полости','см³')]},
 {id:'bushing',fields:[field('innerDiameterMm','Диаметр отверстия','мм'),field('outerDiameterMm','Наружный диаметр','мм'),field('lengthMm','Длина','мм'),field('material','Материал','', 'text')]},
 {id:'joint',fields:[field('jointType','Тип шарнира','', 'text'),field('pinDiameterMm','Диаметр пальца','мм'),field('widthMm','Ширина','мм')]},
 {id:'guide',fields:[field('guideType','Тип направляющей скольжения','', 'text'),field('widthMm','Ширина','мм'),field('lengthMm','Длина','мм')]},
 {id:'screw_drive',fields:[field('screwType','Тип винтовой пары','', 'text'),field('diameterMm','Наружный диаметр','мм'),field('leadMm','Ход винта за оборот','мм')]},
 {id:'open_gear',fields:[field('module','Модуль','', 'number'),field('teeth','Количество зубьев','шт'),field('faceWidthMm','Рабочая ширина зубчатого венца','мм')]},
 {id:'wire_rope',fields:[field('diameterMm','Номинальный диаметр каната','мм'),field('construction','Конструкция','', 'text')]},
 {id:'oil_system',fields:[field('systemType','Тип масляной системы','', 'text'),field('workingVolumeLiters','Рабочий объём','л'),field('filterRatingMicron','Тонкость фильтрации','мкм')]},
 {id:'central_point',fields:[field('systemType','Тип централизованной системы','', 'text'),field('meteringType','Тип дозаторов / питателей','', 'text'),field('outletCount','Количество выходов','шт')]},
 {id:'other',fields:[field('parameter1','Параметр 1','', 'text'),field('parameter2','Параметр 2','', 'text')]}
].forEach(x=>C.registerCategory(x));
global.LubricaSystem?.registerModule?.('Component Category Schemas','ok','Специализированные карточки категорий');
})(window);
