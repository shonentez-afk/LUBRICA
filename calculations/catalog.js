(function(global){
'use strict';
const R=global.LubricaCalculationRegistry;
if(!R)throw new Error('Calculation Registry is required for Calculation Catalog');
[
  {
    id:'linear-bearing',
    title:'Линейные подшипники',
    description:'Расчёт норм смазки линейных втулок, кареток и профильных направляющих.',
    categories:['linear_bearing'],
    capabilities:['Норма на каретку / втулку','Количество кареток','OEM-периодичность','Пересчёт в качки']
  },
  {
    id:'gearbox-oil',
    title:'Редукторы и масляные полости',
    description:'Рабочий объём, уровень, долив и замена масла по моточасам/календарю.',
    categories:['gearbox_oil'],
    capabilities:['Рабочий объём','MIN/MAX','Долив по состоянию','Замена по часам/месяцам/анализу']
  },
  {
    id:'oil-system',
    title:'Масляные системы',
    description:'Расчёт обслуживания циркуляционных, гидравлических и других масляных систем.',
    categories:['oil_system'],
    capabilities:['Объём системы','Долив','Фильтрация','Отбор проб','Контроль перепада']
  },
  {
    id:'chain',
    title:'Цепные передачи',
    description:'Нормирование смазки цепей по длине, циклу или производительности системы подачи.',
    categories:['chain'],
    capabilities:['OEM-норма','мл/м по подтверждённому источнику','Форсунки и циклы','Периодичность']
  },
  {
    id:'coupling',
    title:'Муфты',
    description:'Количество смазки по объёму полости, OEM или утверждённой норме.',
    categories:['coupling'],
    capabilities:['Объём полости','Процент заполнения','OEM-норма']
  },
  {
    id:'open-gear',
    title:'Открытые зубчатые передачи',
    description:'Нормирование нанесения по OEM/утверждённой норме или подтверждённой системе распыла.',
    categories:['open_gear'],
    capabilities:['OEM-норма','Подтверждённая подача','Форсунки × циклы','Контроль покрытия']
  },
  {
    id:'grease-point',
    title:'Точки пластичной смазки',
    description:'Базовый модуль для направляющих, шарниров, втулок и винтовых передач.',
    categories:['guide','joint','bushing','screw'],
    capabilities:['г/точку','мл/точку','качков/точку','Количество одинаковых точек']
  },
  {
    id:'screw-jack',
    title:'Винтовые домкраты',
    description:'Раздельное обслуживание редукторной полости и винтовой пары с OEM/инженерной трассировкой.',
    categories:['screw'],
    capabilities:['Редукторная полость','Винт/гайка','Циклы','Условия эксплуатации','Калиброванный расход']
  },
  {
    id:'ball-screw',
    title:'ШВП / шарико-винтовые передачи',
    description:'Отдельный профиль ШВП с OEM-нормой на гайку и параметрами движения.',
    categories:['ball_screw'],
    capabilities:['OEM на гайку','Количество гаек','Диаметр / шаг / ход','Периодичность']
  },
  {
    id:'wire-rope',
    title:'Канаты',
    description:'Нормирование материала по OEM или подтверждённой норме на обслуживаемую длину каната.',
    categories:['rope'],
    capabilities:['OEM-норма','Подтверждённая норма на метр','Контроль проникновения','Условия эксплуатации']
  },
  {
    id:'central-lubrication',
    title:'Централизованная система смазки',
    description:'Сравнение потребности всех точек и фактической подачи системы.',
    categories:['central_point'],
    capabilities:['Σ потребность точек','Доза питателей','Количество циклов','Баланс подачи']
  }
].forEach(def=>R.register({...def,status:'planned',priority:10}));
global.LubricaSystem?.registerModule?.('Calculation Catalog','ok','Загружен');
})(window);
