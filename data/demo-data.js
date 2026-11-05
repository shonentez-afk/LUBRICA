"use strict";
const APP_VERSION="1.0.33.70";
const TYPE_LABELS={bearing:"Подшипник",chain:"Цепь",gearbox_oil:"Редукторное масло",coupling:"Муфта",open_gear:"Открытая зубчатая передача",guide:"Направляющая",joint:"Шарнир",bushing:"Втулка",screw:"Винтовая передача",rope:"Канат",oil_system:"Масляная система",central_point:"Централизованная подача",other:"Прочая точка"};
const TYPE_ICONS={bearing:"◉",chain:"⛓",gearbox_oil:"⬡",coupling:"◌",open_gear:"⚙",guide:"↔",joint:"◇",bushing:"○",screw:"↻",rope:"〰",oil_system:"◒",central_point:"◎",other:"◆"};
const STATUS_LABELS={ready:"Готово",review:"Требует проверки",issue:"Требуются данные"};
const SCOPE_LABELS={silos:"Суточные силосы",cupola:"Вагранка",forming:"Волокноосаждение",saw:"Распиловка",pack:"Упаковка"};
const LINE_BY_SCOPE={silos:"Линия 1",cupola:"Линия 1",forming:"Линия 1",saw:"Линия 2",pack:"Линия 2"};
const defaultRules={bearingWeeks:4,harshWeeks:2,chainWeeks:1,inspectionWeeks:4,sealedAction:"Не досмазывать — проверить конструкцию"};
const defaultMaterials=[
 {code:"GR-EP2",name:"Mobilux EP 2",kind:"Пластичная смазка",color:"#e6a42a",approved:true},
 {code:"GR-EM",name:"Mobil Polyrex EM",kind:"Пластичная смазка",color:"#43a88f",approved:true},
 {code:"GR-SHC",name:"Mobilith SHC 220",kind:"Пластичная смазка",color:"#d45d52",approved:true},
 {code:"OIL-220",name:"Mobilgear 600 XP 220",kind:"Редукторное масло",color:"#6f5b47",approved:true},
 {code:"CHAIN-150",name:"Klüberoil 4 UH1-1500",kind:"Цепное масло",color:"#597da3",approved:true}
];
const seedPoints=[
 {id:"LUB-001",scope:"silos",line:"Линия 1",type:"bearing",equipment:"Конвейер отсева каменного материала",unit:"Приводной вал",position:"10101093",component:"UCP 212",material:"Mobilux EP 2",operation:"Досмазывание",interval:"4 недели",strategy:"По календарю",qty:"35,8",measure:"г",status:"ready",source:"Структура ТМЦ",verified:true},
 {id:"LUB-002",scope:"silos",line:"Линия 1",type:"chain",equipment:"Конвейер промежуточный №1",unit:"Цепная передача привода",position:"10101117",component:"Цепь роликовая 16B-1",material:"Mobilgear OGL 007",operation:"Нанесение смазки",interval:"2 недели",strategy:"По календарю",qty:"120",measure:"мл",status:"review",source:"Добавлено вручную",verified:false},
 {id:"LUB-003",scope:"silos",line:"Линия 1",type:"gearbox",equipment:"Конвейер отсева кокса",unit:"Редуктор привода",position:"10101106",component:"R87",material:"Mobilgear 600 XP 220",operation:"Замена масла",interval:"8 000 ч / 24 мес.",strategy:"По наработке",qty:"18",measure:"л",status:"ready",source:"Паспорт",verified:true},
 {id:"LUB-004",scope:"cupola",line:"Линия 1",type:"fan",equipment:"Вентилятор охлаждения вагранки №1",unit:"Подшипник DE",position:"10103142",component:"22216 E",material:"Mobilith SHC 220",operation:"Досмазывание",interval:"2 недели",strategy:"По календарю",qty:"23,2",measure:"г",status:"ready",source:"Структура ТМЦ",verified:true},
 {id:"LUB-005",scope:"cupola",line:"Линия 1",type:"motor",equipment:"Электродвигатель дымососа №1",unit:"Подшипник NDE",position:"10103210",component:"6312 C3",material:"Mobil Polyrex EM",operation:"Досмазывание",interval:"4 недели",strategy:"По календарю",qty:"18,5",measure:"г",status:"review",source:"Расчёт",verified:false},
 {id:"LUB-006",scope:"cupola",line:"Линия 1",type:"gearbox",equipment:"Шлюзовой питатель №2",unit:"Редуктор",position:"10103288",component:"KA67",material:"",operation:"Проверка уровня",interval:"1 неделя",strategy:"По календарю",qty:"до уровня",measure:"л",status:"issue",source:"Структура",verified:false},
 {id:"LUB-007",scope:"forming",line:"Линия 1",type:"bearing",equipment:"Камера волокноосаждения",unit:"Вал натяжной",position:"10107164",component:"23220 CC/W33",material:"Mobilux EP 2",operation:"Досмазывание",interval:"2 недели",strategy:"По календарю",qty:"39,4",measure:"г",status:"ready",source:"Структура ТМЦ",verified:true},
 {id:"LUB-008",scope:"forming",line:"Линия 1",type:"chain",equipment:"Сетчатый конвейер",unit:"Цепь тяговая левая",position:"10107220",component:"Цепь M224",material:"Klüberoil 4 UH1-1500",operation:"Нанесение смазки",interval:"1 неделя",strategy:"По календарю",qty:"90",measure:"мл",status:"ready",source:"Карта смазки",verified:true},
 {id:"LUB-009",scope:"saw",line:"Линия 2",type:"bearing",equipment:"Пила обрезки краёв левая",unit:"Шпиндель",position:"10210132",component:"6202-2RS1",material:"Mobilith SHC 100",operation:"Контроль состояния",interval:"4 недели",strategy:"По состоянию",qty:"0",measure:"г",status:"review",source:"Структура ТМЦ",verified:false},
 {id:"LUB-010",scope:"saw",line:"Линия 2",type:"motor",equipment:"Электродвигатель пилы №2",unit:"Подшипник DE",position:"10210206",component:"6308 C3",material:"Mobil Polyrex EM",operation:"Досмазывание",interval:"4 недели",strategy:"По календарю",qty:"12,6",measure:"г",status:"review",source:"Расчёт",verified:false},
 {id:"LUB-011",scope:"pack",line:"Линия 2",type:"chain",equipment:"Упаковочная машина №1",unit:"Цепь транспортёра",position:"10212114",component:"Цепь 12B-1",material:"Mobil DTE Oil Heavy Medium",operation:"Нанесение смазки",interval:"1 неделя",strategy:"По календарю",qty:"45",measure:"мл",status:"ready",source:"Карта смазки",verified:true},
 {id:"LUB-012",scope:"pack",line:"Линия 2",type:"gearbox",equipment:"Обмотчик плёнкой №2",unit:"Мотор-редуктор",position:"10212201",component:"SA47",material:"Mobilgear 600 XP 220",operation:"Проверка уровня",interval:"4 недели",strategy:"По календарю",qty:"до уровня",measure:"л",status:"ready",source:"Паспорт",verified:true}
];
