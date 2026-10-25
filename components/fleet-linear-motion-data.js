(function(global){
'use strict';
const rows=Array.isArray(global.LubricaComponentStarterData)?global.LubricaComponentStarterData:[];
const seen=new Set(rows.map(x=>String(x.designation||'').toUpperCase()));
const items=[
 'KUE 25 H W2 G4 V0/880-20/20','KUE 25 H W2 G4 V0/2760-30/30','KWVE 55 B G3 V1','LUND 40-2LS','LSNS 40','LQCD 20-2LS','KBE50UU','BRTF20-L','KTN-40-B-PP-AS','OGA-01-25','KGNO-50-B-PP-AS','LTCD 25-2LS','CSW43-190-2Z-K','CSW43-190-2Z-U','SBG25FLL-K1+MF','SBG25SLL-K1+MF','BRTF30-L'
];
for(const designation of items){
 const key=designation.toUpperCase();if(seen.has(key))continue;
 rows.push({id:`FLEET-LIN-${key.replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'')}`,category:'linear_bearing',designation,name:'Линейный подшипник / направляющая из фактического парка',manufacturer:'',model:designation,aliases:[`Подшипник ${designation}`,`Подшипник линейный ${designation}`],technicalData:{subtype:'other',fleetVerifiedDesignation:true},lubricationData:{quantityPolicy:'oem_required',intervalPolicy:'oem_required'},sourceReference:'Фактическая производственная база предприятия',notes:'Идентификатор добавлен для корректного сопоставления с модулем Linear Motion. Геометрия, OEM-норма смазки и интервал намеренно не предполагаются без документации производителя.'});
 seen.add(key);
}
global.LubricaComponentStarterData=rows;
global.LubricaSystem?.registerModule?.('Fleet Linear Motion Data','ok',`${items.length} фактических обозначений Linear Motion`);
})(window);
