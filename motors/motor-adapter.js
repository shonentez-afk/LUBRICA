(function(global){
'use strict';
const R=global.LubricaCalculationRegistry;if(!R)throw new Error('Calculation Registry is required for Motor Calculation Adapter');
R.register({
 id:'motor-bearing',title:'Расчёт подшипников электродвигателя',description:'OEM-политика электродвигателя: закрытая конструкция, табличка двигателя или OEM L1-досмазывание.',categories:['bearing'],priority:180,status:'ready',version:'1.0.33.8',
 capabilities:['Motor OEM resolver','ABB L1','SEW sealed bearings','OLI greased-for-life','Machine-specific lubrication plate','Cross-OEM guard'],
 canOpen:ctx=>!!global.LubricaMotorUI?.motorContext?.(ctx.point),
 open:ctx=>global.LubricaMotorUI?.open?.(ctx)!==false,
 summarize:ctx=>{const m=ctx.point?.motorService||{};return {title:'Электродвигатель',status:m.calculatedAt?'calculated':'ready',calculatedAt:m.calculatedAt||null,policy:m.policy||null,result:m.result||null,manufacturer:m.manufacturer||null,family:m.family||null};}
});
global.LubricaSystem?.registerModule?.('Motor Calculation Adapter','ok','Загружен');
})(window);
