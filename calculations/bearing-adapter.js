(function(global){
'use strict';
const R=global.LubricaCalculationRegistry;
if(!R)throw new Error('Calculation Registry is required for Bearing Calculation Adapter');
R.register({
  id:'bearing',
  title:'Подшипниковый расчёт',
  description:'Досмазывание, полная замена смазки, скоростная оценка и периодичность.',
  categories:['bearing'],
  priority:100,
  status:'ready',
  version:'1.0.27.5',
  capabilities:['Multi-OEM','Доза досмазывания','Полная замена смазки','Периодичность','Скоростная оценка','Уровень достоверности'],
  canOpen:ctx=>!!ctx.point,
  open:ctx=>global.LubricaTaskEditor?.openBearingCalculation?.(ctx)!==false,
  summarize:ctx=>{
    const c=ctx.point?.bearing?.calculation||{};
    return {
      title:'Подшипниковый расчёт',
      status:c.calculatedAt?'calculated':'ready',
      calculatedAt:c.calculatedAt||null,
      values:{
        relubeDose:c.calculatedRelubeDoseG??c.calculatedDoseG??null,
        approvedRelubeDose:c.approvedRelubeDoseG??c.approvedDoseG??null,
        relubeInterval:c.calculatedRelubeIntervalHours??c.calculatedIntervalHours??null,
        approvedRelubeInterval:c.approvedRelubeIntervalHours??c.approvedIntervalHours??null,
        fullRenewal:c.calculatedFullRenewalG??null,
        approvedFullRenewal:c.approvedFullRenewalG??null,
        fullRenewalInterval:c.calculatedFullRenewalIntervalHours??null,
        approvedFullRenewalInterval:c.approvedFullRenewalIntervalHours??null
      },
      warnings:Array.isArray(c.warnings)?c.warnings:[]
    };
  }
});
global.LubricaSystem?.registerModule?.('Bearing Calculation Adapter','ok','Загружен');
})(window);
