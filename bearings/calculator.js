(function(global){
'use strict';
const API=global.LubricaBearingCalculator=global.LubricaBearingCalculator||{};
const OEM=()=>global.LubricaBearingOEM;
const methods=Object.freeze({
  auto_oem:{label:'Legacy Auto OEM',coefficient:null,formula:'Legacy selector'},
  lubrica_unified:{label:'LUBRICA Universal 3.2 — operating maintenance policy',coefficient:null,formula:'OEM exact → OEM method → universal relube; full renewal only where construction requires it'},
  oem_exact:{label:'OEM exact — конкретная таблица производителя',coefficient:null,formula:'Значение OEM для конкретного типоразмера'},
  skf_side:{label:'SKF — подача сбоку',coefficient:0.005,formula:'G = 0,005 × D × B'},
  skf_groove:{label:'SKF — через кольцевую канавку / отверстия',coefficient:0.002,formula:'G = 0,002 × D × B'},
  skf_snl_side:{label:'SKF SNL — подача сбоку подшипника',coefficient:0.005,formula:'Gp = 0,005 × D × B'},
  skf_snl_groove:{label:'SKF SNL — через канавку/отверстия наружного кольца',coefficient:0.002,formula:'Gp = 0,002 × D × B'},
  ntn_snr_standard:{label:'NTN-SNR — стандартная дозировка',coefficient:0.005,formula:'G = 0,005 × D × B'},
  ntn_unit_exact:{label:'NTN — корпусной узел, OEM-таблица',coefficient:null,formula:'Точное табличное количество NTN для UC/UK/UEL'},
  ntn_zlg_housing_2024:{label:'NTN-SNR ZLG — корпусная инструкция 2024',coefficient:null,formula:'OEM объём на подшипниковую позицию; 3000 ч / не реже 2 раз в год'},
  schaeffler_weekly:{label:'Schaeffler/FAG — еженедельное пополнение',coefficient:0.002,formula:'G = 0,002 × D × B'},
  schaeffler_monthly:{label:'Schaeffler/FAG — ежемесячное пополнение',coefficient:0.003,formula:'G = 0,003 × D × B'},
  schaeffler_yearly:{label:'Schaeffler/FAG — ежегодное пополнение',coefficient:0.004,formula:'G = 0,004 × D × B'},
  schaeffler_multiyear:{label:'Schaeffler/FAG — после многолетнего периода',coefficient:0.01,formula:'G = 0,01 × D × B'},
  engineering_db005:{label:'Инженерная оценка — D×B',coefficient:0.005,formula:'G ≈ 0,005 × D × B (инженерная оценка, не OEM)'},
  nsk_unit_guidance:{label:'NSK — корпусной узел, OEM-процедура',coefficient:null,formula:'NSK: заводское заполнение; пополнение по условиям, без универсальной фиксированной дозы в граммах'},
  manual_required:{label:'Требуются OEM-данные / выбор метода',coefficient:null,formula:'Автоматический расчёт заблокирован'},
  oem:{label:'OEM / паспорт',coefficient:null,formula:'Значение изготовителя'},
  manual:{label:'Ручное утверждённое значение',coefficient:null,formula:'Значение инженера'}
});
const typeFactors=Object.freeze({
  deep_groove_ball:{label:'Радиальный шариковый',bf:1,limits:{light:500000,medium:400000,heavy:300000}},
  angular_contact_ball:{label:'Радиально-упорный шариковый',bf:1,limits:{light:500000,medium:400000,heavy:300000}},
  self_aligning_ball:{label:'Самоустанавливающийся шариковый',bf:1,limits:{light:450000,medium:350000,heavy:250000}},
  cylindrical_roller:{label:'Цилиндрический роликовый',bf:1.5,limits:{light:450000,medium:300000,heavy:150000}},
  needle_roller:{label:'Игольчатый с сепаратором',bf:3,limits:{light:350000,medium:200000,heavy:100000}},
  tapered_roller:{label:'Конический роликовый',bf:2,limits:{light:350000,medium:300000,heavy:200000}},
  spherical_roller:{label:'Сферический роликовый',bf:2,limits:{light:350000,medium:200000,heavy:100000}},
  thrust_ball:{label:'Упорный шариковый',bf:2,limits:{light:200000,medium:150000,heavy:100000}},
  thrust_roller:{label:'Упорный роликовый',bf:2.5,limits:{light:180000,medium:130000,heavy:90000}},
  bearing_unit:{label:'Корпусной узел с вставным шарикоподшипником',bf:1,limits:{light:300000,medium:250000,heavy:180000}},
  insert_ball:{label:'Вставной шарикоподшипник',bf:1,limits:{light:300000,medium:250000,heavy:180000}},
  spherical_plain:{label:'Сферический подшипник скольжения',bf:null,limits:null},
  track_roller:{label:'Опорный ролик / ролик с цапфой',bf:null,limits:null},
  roller_bearing_unit:{label:'Корпусной роликовый узел',bf:null,limits:null},
  slewing_ring_four_point_ball:{label:'Опорно-поворотный четырёхточечный шариковый',bf:null,limits:null},
  unknown:{label:'Тип не определён',bf:null,limits:null}
});
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const round=(v,d=2)=>Number.isFinite(v)?Number(v.toFixed(d)):null;
const codeRank={A:5,B:4,C:3,D:2,X:1};
function resultMeta(code,label,source=null,assumptions=[]){return {confidenceCode:code,confidenceLabel:label,source,assumptions:[...new Set((assumptions||[]).filter(Boolean))]}}
function manufacturerInfo(input={}){const o=OEM();const m=o?.normManufacturer?.(input.manufacturer)||'auto';return {id:m,profile:o?.methodRecommendation?.({...input,manufacturer:m})||null,exact:o?.exactProfile?.(m,input.designation)||null}}
function methodOwner(method){if(/^skf_/.test(method))return 'SKF';if(method==='ntn_snr_standard')return 'NTN-SNR';if(/^schaeffler_/.test(method))return 'FAG';return null}
function zlgContext(input={}){
  const f=input.fanLubrication||{};
  const family=String(f.housingFamily||'').toUpperCase();
  if(family!=='ZLG')return null;
  const o=OEM(),profile=o?.zlgHousingProfile?.(f.rawHousingMarking||input.housingMarking||'');
  return {family:'ZLG',profile,rawMarking:f.rawHousingMarking||input.housingMarking||'',portIndex:f.portIndex||null,portCount:f.portCount||null,zoneMappingConfirmed:!!f.zoneMappingConfirmed,internalBearings:f.internalBearings||[]};
}
function zlgMode(input={}){return String(input.zlgServiceMode||'guarded_auto');}
function effectiveZlgMode(input={}){const m=zlgMode(input);return m==='guarded_auto'&&/reitz/i.test(String(input.fanManufacturer||''))?'reitz_kxe':m;}
function reitzZlg(input={}){const z=zlgContext(input),o=OEM();if(!z)return null;return o?.reitzZlgProfile?.(z.rawMarking,input.zlgVariant,num(input.rpm),num(input.temperatureC));}
function snlContext(input={}){
  const f=input.fanLubrication||{},family=String(f.housingFamily||input.housingFamily||'').toUpperCase();
  const raw=f.rawHousingMarking||input.housingMarking||'';
  if(family!=='SNL'&&!/\b(?:F?SNL|F?SE)\s*[-_]?\s*\d{3}/i.test(String(raw)))return null;
  const o=OEM(),profile=o?.snlHousingProfile?.(raw);
  return {family:'SNL',profile,rawMarking:raw,feedMethod:String(input.snlFeedMethod||'side')==='groove'?'groove':'side',internalBearings:f.internalBearings||[]};
}
function snlMode(input={}){return String(input.snlServiceMode||'auto');}
function effectiveSnlMode(input={}){const m=snlMode(input);return m==='auto'&&/reitz/i.test(String(input.fanManufacturer||''))?'reitz_kxe_single':(m==='auto'?'skf_snl':m);}
function reitzSnl(input={}){const s=snlContext(input),o=OEM();if(!s)return null;const designation=input.designation||(s.internalBearings||[])[0]||'';return o?.reitzSingleBearingProfile?.(designation,num(input.rpm),num(input.temperatureC));}
function fanFamily(input={}){return String(input?.fanLubrication?.housingFamily||input?.housingFamily||'').toUpperCase()}
function troesterContext(input={}){return fanFamily(input)==='TROESTER'}
function troesterVentappMismatch(input={}){const f=String(input.fanManufacturer||'').trim();return troesterContext(input)&&!!f&&!/ventapp/i.test(f)}
function ventappTroesterContext(input={}){return troesterContext(input)&&/ventapp/i.test(String(input.fanManufacturer||''))}
function ventappMachineSource(input={}){return String(input.ventappLubricationSource||'').trim()}
function ventappMachineDose(input={}){const v=num(input.ventappMachineDoseG);return ventappTroesterContext(input)&&v>0&&ventappMachineSource(input)?v:null}
function ventappMachineInterval(input={}){const v=num(input.ventappMachineIntervalHours);return ventappTroesterContext(input)&&v>0&&ventappMachineSource(input)?v:null}
function ferrariContext(input={}){return /ferrari/i.test(String(input.fanManufacturer||''))}
function ferrariSnlContext(input={}){return ferrariContext(input)&&fanFamily(input)==='SNL'}
function ferrariOwnContext(input={}){return ferrariContext(input)&&!!input.fanLubrication&&fanFamily(input)!=='SNL'}
function ferrariChart82(input={}){if(String(input.ferrariMethodMode||'cart01')!=='chart8_2')return null;return OEM()?.ferrariChart82Profile?.(input.ferrariSupportType,input.ferrariBearingSide||'pulley',input.designation,num(input.rpm))||null}
const specialProcedureTypes=new Set(['insert_ball','spherical_plain','track_roller','roller_bearing_unit']);
function specialProcedureType(input={}){const t=String(input.bearingType||'');return specialProcedureTypes.has(t)?t:null}
function relubeQuantity(input={}){
  let {D,B,method='lubrica_unified'}=input;D=num(D);B=num(B);const mi=manufacturerInfo(input),o=OEM();
  const zlg=zlgContext(input),zm=effectiveZlgMode(input);
  const specialType=specialProcedureType(input);
  if(specialType)return {...resultMeta('X','Требуется OEM/подтверждённая процедура',null,['Для сферических подшипников скольжения, опорных роликов и корпусных роликовых узлов LUBRICA не применяет универсальную формулу G = k×D×B.','Введите количество по инструкции изготовителя или утверждённой процедуре предприятия.']),value:null,unit:'г',blocked:true,selectedRule:'special_procedure_required',sourceLevel:'insufficient',error:'Универсальная доза для этого специального типа намеренно заблокирована.'};
  if(troesterContext(input)){const vd=ventappMachineDose(input);if(vd!=null)return {...resultMeta('A','OEM Ventapp — данные конкретного вентилятора',o?.sourceRefs?.VENTAPP_MACHINE||null,[`Источник конкретной машины: ${ventappMachineSource(input)}.`,input.ventappGrease?`Смазочный материал по Ventapp: ${input.ventappGrease}.`:null,'Application-specific Ventapp имеет приоритет над общей методикой Tröster.']),value:round(vd,2),unit:'г',selectedRule:'ventapp_machine_lubrication',formula:'Ventapp machine-specific lubrication instruction / plate',sourceLevel:'oem_exact',sourceManufacturer:'Ventapp',applicationSpecific:true};if(troesterVentappMismatch(input))return {...resultMeta('X','Tröster — неверный OEM-контекст',o?.sourceRefs?.TROESTER_BLOCK||null,['В текущей конфигурации предприятия Tröster Blocklager разрешён только в цепочке Ventapp fan → Tröster bearing block.','Проверьте производителя вентилятора или фактическую маркировку подшипникового блока.']),value:null,unit:'г',blocked:true,sourceManufacturer:'Tröster',error:'Cross-OEM guard: Tröster в проекте применяется только на вентиляторах Ventapp.'};if(!(D>0&&B>0))return {...resultMeta('X','Tröster — выберите подшипник в текущей точке',o?.sourceRefs?.TROESTER_BLOCK||null),value:null,unit:'г',blocked:true,sourceManufacturer:'Tröster',error:'В текущей точке смазки должен быть выбран фактический подшипник с известными D и B. LUBRICA не определяет подшипник по маркировке Tröster и не использует список внутренних подшипников блока как замену данным точки.'};const v=.005*D*B;return {...resultMeta('A','OEM Tröster — Gperiod',o?.sourceRefs?.TROESTER_BLOCK||null,['Tröster: Gperiod = 0,005 × D × B.','Для проектных Tröster на Ventapp две маслёнки остаются двумя физическими точками; D и B берутся из подшипника текущей точки смазки, а не выводятся из маркировки блока.']),value:round(v,2),unit:'г',selectedRule:'troester_db005',formula:'Gperiod = 0,005 × D × B',sourceLevel:'oem_method',sourceManufacturer:'Tröster',applicationSpecific:true};}
  if(ferrariOwnContext(input)){const fp=ferrariChart82(input),q=num(input.ferrariCart01DoseG);if(fp){return {...resultMeta('A','OEM Ferrari — Chart 8-2',o?.sourceRefs?.FERRARI_FAN||null,[`Ferrari ${fp.support}, ${fp.side==='pulley'?'со стороны шкива':'с противоположной стороны'}: ${fp.greaseG} г.`,`Строка применяется только для shaft-only version 1/6 и точного совпадения опоры/подшипника.`]),value:fp.greaseG,unit:'г',selectedRule:'ferrari_chart_8_2',formula:'Ferrari MVC 02 rev.5 Chart 8-2',sourceLevel:'oem_exact',sourceManufacturer:'Ferrari',applicationSpecific:true,ferrariReference:fp};}if(q>0)return {...resultMeta('A','OEM Ferrari — CART01',o?.sourceRefs?.FERRARI_FAN||null,['Доза подтверждена по Transmission specifications/CART01 конкретного вентилятора.','Application-specific Ferrari имеет приоритет над общей методикой корпуса.']),value:q,unit:'г',selectedRule:'ferrari_cart01',formula:'Ferrari CART01 / Transmission specifications',sourceLevel:'oem_exact',sourceManufacturer:'Ferrari',applicationSpecific:true};return {...resultMeta('X','Ferrari — требуется CART01 или точная строка Chart 8-2',o?.sourceRefs?.FERRARI_FAN||null,['Для комплектной трансмиссии Ferrari требует CART01. Для shaft-only version 1/6 допускается Chart 8-2 при точном совпадении опоры и подшипника.','LUBRICA не подменяет собственный Ferrari block методом SKF/Tröster.']),value:null,unit:'г',blocked:true,sourceManufacturer:'Ferrari',error:'Выберите подтверждённый режим Ferrari: CART01 либо Chart 8-2 с точной маркировкой опоры/стороной.'};}
  if(ferrariSnlContext(input)&&num(input.ferrariCart01DoseG)>0){const q=num(input.ferrariCart01DoseG);return {...resultMeta('A','OEM Ferrari — CART01 поверх SKF SNL',o?.sourceRefs?.FERRARI_FAN||null,['Физический корпус остаётся SKF SNL, но числовое значение задано application-specific OEM Ferrari.']),value:q,unit:'г',selectedRule:'ferrari_cart01',formula:'Ferrari CART01 / Transmission specifications',sourceLevel:'oem_exact',sourceManufacturer:'Ferrari',applicationSpecific:true};}
  if(zlg){
    const profile=zlg.profile;
    if(zm==='reitz_kxe'){const rp=reitzZlg(input);if(!rp||rp.blocked)return {...resultMeta('X','REITZ KXE ZLG — требуется уточнение',rp?.source||o?.sourceRefs?.REITZ_KXE||null,[rp?.reason||'Не удалось сопоставить таблицу REITZ.']),value:null,unit:'г',method:'reitz_kxe_zlg',selectedRule:'reitz_kxe_zlg',manufacturer:'NTN-SNR',sourceManufacturer:'REITZ',sourceLevel:'oem_exact',blocked:true,zlgReference:profile,reitzReference:rp,error:rp?.reason||'Требуется точное исполнение ZLG и рабочие обороты.'};return {...resultMeta('A','OEM REITZ KXE — ZLG',rp.source,[`REITZ KXE: ${rp.relubeG} г на один подшипник / физическую точку досмазывания.`,`Размер ZLG${rp.code}, исполнение ${rp.variant==='AA_AK'?'AA/AK':'AC'}; интервал выбирается по оборотам и температуре корпуса.`,'После примерно 10 операций досмазывания REITZ требует удалить накопившуюся старую смазку из корпуса и заменить её.']),value:rp.relubeG,unit:'г',method:'reitz_kxe_zlg',selectedRule:'reitz_kxe_zlg',manufacturer:'NTN-SNR',sourceManufacturer:'REITZ',sourceLevel:'oem_exact',formula:'REITZ KXE Table 11',zlgReference:profile,reitzReference:rp,applicationSpecific:true};}
    if(zm==='application_oem')return {...resultMeta('X','OEM конкретного вентилятора / узла',null,['Для ZLG выбран приоритет application-specific OEM. Введите утверждённую дозу и источник в экспертном режиме.']),value:null,unit:'г',method:'oem',selectedRule:'zlg_application_oem',manufacturer:'NTN-SNR',sourceLevel:'oem_exact',blocked:true,zlgReference:profile,error:'Ожидается значение из паспорта/инструкции конкретного вентилятора или узла.'};
    if(zm==='housing_2024'){
      if(!profile)return {...resultMeta('X','ZLG: размер не распознан',o?.sourceRefs?.NTN_ZLG_2024||null),value:null,unit:'г',method:'ntn_zlg_housing_2024',selectedRule:'ntn_zlg_housing_2024',manufacturer:'NTN-SNR',sourceLevel:'oem_method',blocked:true,error:'Маркировка ZLG не сопоставлена с OEM-таблицей корпуса; сохраните точное обозначение или используйте OEM конкретного узла.'};
      const density=num(input.greaseDensity)||profile.referenceDensity;
      const grams=profile.relubeVolumeCm3*density;
      return {...resultMeta('B','OEM housing family',profile.source,[`NTN-SNR задаёт ${profile.relubeVolumeCm3} см³ на подшипниковую позицию. Масса ${round(grams,1)} г рассчитана по плотности ${density} г/см³.`,`Это housing-level методика. Для конкретного высокооборотного вентилятора более специфичная OEM-инструкция имеет приоритет.`]),value:round(grams,1),unit:'г',volumeCm3:profile.relubeVolumeCm3,densityUsed:density,method:'ntn_zlg_housing_2024',selectedRule:'ntn_zlg_housing_2024',formula:`${profile.relubeVolumeCm3} см³ × ρ`,manufacturer:'NTN-SNR',sourceLevel:'oem_method',zlgReference:profile,applicationSpecific:false};
    }
    return {...resultMeta('X','ZLG: требуется подтвердить область OEM-методики',profile?.source||o?.sourceRefs?.NTN_ZLG_2024||null,[profile?`Найден корпусный OEM reference: ${profile.relubeVolumeCm3} см³ на позицию, 3000 ч / не реже 2 раз в год.`:'Семейство ZLG распознано, но размер не сопоставлен с локальной OEM-таблицей.','На высокооборотном вентиляторе LUBRICA не применяет общий объём корпуса автоматически: OEM конкретного вентилятора/узла имеет приоритет.']),value:null,unit:'г',method:'lubrica_unified',selectedRule:'zlg_guarded_auto',manufacturer:'NTN-SNR',sourceLevel:'oem_method',blocked:true,zlgReference:profile,error:'Укажите производителя вентилятора в простом режиме. Для REITZ методика KXE будет выбрана автоматически; для другого OEM при необходимости доступен экспертный режим.'};
  }
  const snl=snlContext(input);
  if(snl){
    const sm=effectiveSnlMode(input);
    if(sm==='reitz_kxe_single'){const rp=reitzSnl(input);if(!rp||rp.blocked)return {...resultMeta('X','REITZ KXE — одиночная опора требует уточнения',rp?.source||o?.sourceRefs?.REITZ_KXE_SINGLE||null,[rp?.reason||'Не удалось сопоставить внутренний подшипник с таблицей REITZ.']),value:null,unit:'г',method:'reitz_kxe_single',selectedRule:'reitz_kxe_single',manufacturer:'SKF',sourceManufacturer:'REITZ',sourceLevel:'oem_exact',blocked:true,snlReference:snl.profile,reitzSingleReference:rp,error:rp?.reason||'Требуются подтверждённый внутренний подшипник и рабочие обороты.'};return {...resultMeta('A','OEM REITZ KXE — одиночная опора',rp.source,[`REITZ: ${rp.relubeG} г на один подшипник; строка ${rp.housing} / ${rp.key}.`,`Интервал выбирается по рабочим оборотам вентилятора и корректируется по температуре корпуса.`]),value:rp.relubeG,unit:'г',method:'reitz_kxe_single',selectedRule:'reitz_kxe_single',manufacturer:'SKF',sourceManufacturer:'REITZ',sourceLevel:'oem_exact',formula:'REITZ KXE single-bearing table',snlReference:snl.profile,reitzSingleReference:rp,applicationSpecific:true,feedMethod:snl.feedMethod};}
    const coeff=snl.feedMethod==='groove'?0.002:0.005,method=snl.feedMethod==='groove'?'skf_snl_groove':'skf_snl_side';
    if(!(D>0&&B>0))return {...resultMeta('X','SKF SNL — нужны размеры внутреннего подшипника',snl.profile?.source||o?.sourceRefs?.SKF_SNL||null,[`Корпус ${snl.rawMarking||'SNL'} распознан. Для дозы досмазывания SKF использует размеры фактически установленного подшипника.`]),value:null,unit:'г',method,selectedRule:method,manufacturer:'SKF',sourceManufacturer:'SKF',sourceLevel:'oem_method',blocked:true,snlReference:snl.profile,error:'Укажите или подтвердите внутренний подшипник SNL, чтобы LUBRICA получила D и B.'};
    const g=round(coeff*D*B,2);
    const note=snl.feedMethod==='groove'?'Подача через кольцевую канавку и отверстия наружного кольца: Gp=0,002×D×B.':'Подача сбоку подшипника: Gp=0,005×D×B.';
    return {...resultMeta('B','OEM SKF SNL — методика пополнения',snl.profile?.source||o?.sourceRefs?.SKF_SNL||o?.sourceRefs?.SKF||null,[note,snl.profile?`OEM-справочник корпуса ${snl.profile.designation}: 20%=${snl.profile.fill20G} г, 40%=${snl.profile.fill40G} г; табличный guideline SNL для стандартного пополнения ${snl.profile.guideRelubeG} г.`:'Точный размер корпуса SNL не сопоставлен с локальной таблицей; доза досмазывания всё равно рассчитана по OEM-формуле SKF для внутреннего подшипника.']),value:g,unit:'г',method,selectedRule:method,manufacturer:'SKF',sourceManufacturer:'SKF',sourceLevel:'oem_method',formula:`Gp = ${coeff.toFixed(3).replace('.',',')} × D × B`,snlReference:snl.profile,feedMethod:snl.feedMethod};
  }
  if(String(input.bearingType||'')==='slewing_ring_four_point_ball'){return {...resultMeta('B','OEM procedure',o?.sourceRefs?.SCHAEFFLER_SLEWING||o?.sourceRefs?.FAG||null,['Schaeffler/INA для опорно-поворотных подшипников задаёт процедуру: подавать смазку последовательно через все точки смазывания при медленном вращении кольца до появления валика свежей смазки у обеих кромок уплотнения/в зазоре. Фиксированная универсальная доза в граммах не назначается.']),value:null,unit:'г',method:'lubrica_unified',selectedRule:'schaeffler_slewing_procedure',formula:'OEM procedure — до выхода свежей смазки',manufacturer:mi.id,sourceLevel:'oem_method',procedureOnly:true,error:'Для VLU количество досмазывания задаётся процедурой Schaeffler/INA, а не универсальной массой в граммах. После фактической отработки можно утвердить измеренную дозу предприятия.'};}
  if(!(D>0&&B>0))return {...resultMeta('X','Недостаточно данных'),value:null,unit:'г',method,formula:'',error:'Для расчёта нужны D и B.',manufacturer:mi.id};
  // auto_oem must execute the method selected by the OEM resolver first.
  // Falling straight into LUBRICA Universal can leak another brand's construction reference
  // into a selected OEM context (e.g. NSK UCP212 receiving an NTN-SNR UC/UK/UEL dose).
  if(method==='auto_oem'){
    const recommended=String(mi.profile?.relubeMethod||'');
    method=(recommended&&methods[recommended])?recommended:'lubrica_unified';
  }
  const density=num(input.greaseDensity);
  if(method==='lubrica_unified'){
    // 1) Exact OEM data always wins.
    if(mi.exact?.relubeG!=null)return {...resultMeta('A','OEM exact',mi.exact.source),value:round(mi.exact.relubeG,3),unit:'г',method:'lubrica_unified',selectedRule:'oem_exact',formula:'OEM table',manufacturer:mi.id,confidence:'OEM exact',sourceLevel:'oem_exact'};
    // 2) Construction-specific housed-unit reference before any generic D×B rule.
    // NTN/NTN-SNR publishes dedicated UC/UK/UEL relubrication quantities. In Universal mode
    // these values are used as a safety reference for equivalent housed-unit construction,
    // not mislabelled as OEM data of another selected brand.
    const housedRef=o?.housedUnitReferenceProfile?.(input.designation);
    const isHoused=String(input.bearingType||'')==='bearing_unit'||!!housedRef;
    if(housedRef?.relubeG!=null){
      const scaled=density>0&&Math.abs(density-housedRef.baseDensity)>0.001;
      const refValue=scaled?housedRef.relubeG*density/housedRef.baseDensity:housedRef.relubeG;
      if(mi.id==='NTN-SNR')return {...resultMeta(scaled?'B':'A',scaled?'OEM housed-unit table + density correction':'OEM exact housed-unit table',housedRef.source,scaled?[`Табличная доза NTN/NTN-SNR приведена для ρ=${housedRef.baseDensity} г/см³ и пересчитана на ρ=${density} г/см³.`]:[]),value:round(refValue,2),unit:'г',method:'lubrica_unified',selectedRule:'ntn_unit_exact',formula:scaled?'G = Gтабл × ρ/0,9':'NTN/NTN-SNR UC/UK/UEL table',manufacturer:mi.id,sourceLevel:scaled?'oem_method':'oem_exact',constructionReference:housedRef,antiOvergreaseGuard:true};
      const generic=0.005*D*B;
      const ratio=generic/refValue;
      return {...resultMeta('D','LUBRICA housed-unit construction reference',o?.sourceRefs?.LUBRICA_UNIFIED||null,[`Для ${input.designation||'корпусного узла'} использована специализированная таблица NTN/NTN-SNR для конструкции UC/UK/UEL как межбрендовый конструктивный ориентир, потому что общая формула 0,005×D×B дала бы ${round(generic,2)} г против ${round(refValue,2)} г (${round((ratio-1)*100,0)}% выше).`,`Результат не является OEM-значением ${mi.id==='auto'?'неуказанного производителя':mi.id}; это защитная инженерная рекомендация LUBRICA для предотвращения передозировки.`]),value:round(refValue,2),unit:'г',method:'lubrica_unified',selectedRule:'housed_construction_reference',formula:'LUBRICA Universal 3.2: специализированная UC/UK/UEL reference dose',manufacturer:mi.id,sourceLevel:'engineering',constructionReference:housedRef,referenceSource:housedRef.source,antiOvergreaseGuard:true,genericDoseG:round(generic,2),overgreaseRatio:round(ratio,3)};
    }
    // 3) Brand-specific OEM methods only when no construction-specific housed-unit table is available.
    if(mi.id==='SKF'){const v=0.005*D*B;return {...resultMeta('B','OEM method',o?.sourceRefs?.SKF||null),value:round(v,2),unit:'г',method:'lubrica_unified',selectedRule:'skf_side',formula:'SKF: G = 0,005 × D × B',coefficient:0.005,manufacturer:mi.id,sourceLevel:'oem_method',antiOvergreaseGuard:isHoused};}
    if(mi.id==='NTN-SNR'){const v=0.005*D*B;return {...resultMeta('B','OEM method',o?.sourceRefs?.NTN||null),value:round(v,2),unit:'г',method:'lubrica_unified',selectedRule:'ntn_snr_standard',formula:'NTN-SNR: G = 0,005 × D × B',coefficient:0.005,manufacturer:mi.id,sourceLevel:'oem_method'};}
    if(mi.id==='FAG'){
      const h=num(input.autoIntervalHours)||num(input.baseHours);
      let k=0.004,cad='yearly';
      if(h>0&&h<=24*14){k=0.002;cad='weekly'} else if(h>0&&h<=24*90){k=0.003;cad='monthly'};
      return {...resultMeta('C','OEM method · cadence inferred',o?.sourceRefs?.FAG||null,[`Коэффициент Schaeffler выбран автоматически по расчётному интервалу (${h?Math.round(h)+' ч':'интервал не определён; выбран консервативный yearly'}).`]),value:round(k*D*B,2),unit:'г',method:'lubrica_unified',selectedRule:`schaeffler_${cad}`,formula:`Schaeffler: G = ${String(k).replace('.',',')} × D × B`,coefficient:k,manufacturer:mi.id,sourceLevel:'mixed'};
    }
    // 4) Remaining combinations use a generic engineering fallback only after construction-specific checks.
    // Universal mode therefore returns a clearly-labelled engineering value instead of blocking the workflow.
    let k=0.005;
    const t=String(input.bearingType||'unknown');
    if(t==='needle_roller'||t==='thrust_roller')k=0.004;
    const assumptions=['OEM exact/прямая числовая методика для выбранной комбинации не найдена; применён унифицированный инженерный расчёт LUBRICA.'];
    if(mi.id==='NSK'&&t==='bearing_unit')assumptions.push('NSK для стандартных корпусных узлов задаёт процедуру пополнения, а не универсальную дозу в граммах; число LUBRICA не является OEM NSK.');
    if(mi.id==='TIMKEN')assumptions.push('Без результата Timken Grease Lubrication Tool значение является инженерным LUBRICA, не OEM Timken.');
    return {...resultMeta('D','LUBRICA Universal engineering value',o?.sourceRefs?.LUBRICA_UNIFIED||null,assumptions),value:round(k*D*B,2),unit:'г',method:'lubrica_unified',selectedRule:'lubrica_geometry',formula:`LUBRICA: G = ${String(k).replace('.',',')} × D × B`,coefficient:k,manufacturer:mi.id,sourceLevel:'engineering'};
  }
  if(method==='ntn_unit_exact'){const p=o?.ntnBearingUnitRelubeProfile?.(input.designation);if(p?.relubeG!=null)return {...resultMeta('A','OEM exact bearing-unit table',p.source),value:round(p.relubeG,2),unit:'г',method,formula:'NTN Bearing Units table',manufacturer:mi.id,confidence:'OEM exact',sourceLevel:'oem_exact'};method='ntn_snr_standard';}
  if(method==='oem_exact'){
    if(mi.exact?.relubeG!=null)return {...resultMeta('A','OEM exact',mi.exact.source),value:round(mi.exact.relubeG,3),unit:'г',method:'oem_exact',formula:'OEM table',manufacturer:mi.id,confidence:'OEM exact',sourceLevel:'oem_exact'};
    return {...resultMeta('X','OEM exact отсутствует',mi.profile?.source||null),value:null,unit:'г',method:'oem_exact',formula:'OEM table',manufacturer:mi.id,error:'Для этого обозначения точного OEM-количества в локальной базе нет.',sourceLevel:'insufficient'};
  }
  const m=methods[method]||methods.engineering_db005;
  if(method==='nsk_unit_guidance')return {...resultMeta('B','OEM procedure — fixed grams not specified',mi.profile?.source||null,[mi.profile?.note]),value:null,unit:'г',method,formula:m.formula,manufacturer:mi.id,error:'NSK OEM-процедура не задаёт универсальную фиксированную дозу.',sourceLevel:'oem_guidance',numericUnavailable:true};
  if(m.coefficient==null)return {...resultMeta('X','Требуются данные/утверждение',mi.profile?.source||null,[mi.profile?.note]),value:null,unit:'г',method,formula:m.formula,manufacturer:mi.id,error:mi.profile?.note||'Метод не имеет автоматической формулы.',sourceLevel:'insufficient'};
  const owner=methodOwner(method);let code='D',label='Engineering estimate',source=null,assumptions=[];
  if(owner&&owner===mi.id){code='B';label='OEM method';source=method==='schaeffler_multiyear'?(o?.sourceRefs?.FAG_LEGACY||null):(mi.profile?.source||o?.sourceRefs?.[owner==='NTN-SNR'?'NTN':owner]||null);}
  else if(owner){assumptions.push(`Метод ${owner} применён при выбранном производителе ${mi.id==='auto'?'не указан':mi.id}. Результат не является OEM-значением выбранного производителя.`);source=o?.sourceRefs?.[owner==='NTN-SNR'?'NTN':owner]||null;}
  else if(method==='engineering_db005'){assumptions.push('Использована общая геометрическая инженерная оценка; не OEM.');}
  const raw=round(m.coefficient*D*B,2);
  const housedRef=o?.housedUnitReferenceProfile?.(input.designation);
  if(housedRef?.relubeG!=null){
    const refDensity=density>0?density:0.9,ref=round(housedRef.relubeG*refDensity/0.9,2),ratio=raw/ref;
    if(ratio>1.25){assumptions.push(`ANTI-OVERGREASING: выбранный метод даёт ${raw} г, а специализированный UC/UK/UEL reference составляет ${ref} г. Автоматическое быстрое утверждение этого результата запрещено; требуется осознанное инженерное утверждение.`);return {...resultMeta(code==='B'?'C':code,label+' · overgreasing guard',source,assumptions),value:raw,unit:'г',method,formula:m.formula,coefficient:m.coefficient,manufacturer:mi.id,confidence:label,sourceLevel:code==='B'?'mixed':'engineering',overgreaseRisk:true,autoApprovalBlocked:true,constructionReference:housedRef,referenceDoseG:ref,overgreaseRatio:round(ratio,3)};}
  }
  return {...resultMeta(code,label,source,assumptions),value:raw,unit:'г',method,formula:m.formula,coefficient:m.coefficient,manufacturer:mi.id,confidence:label,sourceLevel:code==='B'?'oem_method':'engineering'};
}
function fillRecommendation(input={}){return OEM()?.fillRecommendation?.(input)||null}
function geometricBearingFill(input={}){
  let {d,D,B,bearingMassKg,fillRatio,greaseDensity,bearingType='unknown',bearingMassKind='bearing',insertDesignation='',manufacturer='',massManufacturer='',massSource='',oemFreeSpaceCm3=null}=input;
  d=num(d);D=num(D);B=num(B);bearingMassKg=num(bearingMassKg);fillRatio=num(fillRatio);greaseDensity=num(greaseDensity);oemFreeSpaceCm3=num(oemFreeSpaceCm3);
  const selected=OEM()?.normManufacturer?.(manufacturer)||'auto';
  const nskUnit=selected==='NSK'?OEM()?.nskBearingUnitProfile?.(input.designation):null;
  if(nskUnit?.insert){bearingMassKg=nskUnit.insert.massKg;bearingMassKind='insert';insertDesignation=nskUnit.insertDesignation;massManufacturer='NSK';massSource=`${nskUnit.source.title}: ${nskUnit.insertDesignation}`;}
  const massM=OEM()?.normManufacturer?.(massManufacturer)||'auto';
  if(!(d>0&&D>d&&B>0))return {...resultMeta('X','Недостаточно данных'),envelopeVolumeCm3:null,freeVolumeCm3:null,greaseVolumeCm3:null,massG:null,error:'Для расчёта объёма нужны d, D и B.'};
  const envelopeVolumeCm3=Math.PI/4*(D*D-d*d)*B*1e-3;
  let freeVolumeCm3=null,freeVolumeMethod='',code='D',label='Engineering estimate',assumptions=[],source=null;
  if(oemFreeSpaceCm3>0){freeVolumeCm3=oemFreeSpaceCm3;freeVolumeMethod='OEM exact free space';code='A';label='OEM exact';}
  else{
    if(bearingType==='bearing_unit'&&!(bearingMassKg>0&&bearingMassKind==='insert'))return {...resultMeta('X','Недостаточно данных'),envelopeVolumeCm3:round(envelopeVolumeCm3,2),freeVolumeCm3:null,greaseVolumeCm3:null,massG:null,bearingMassKg:bearingMassKg>0?bearingMassKg:null,blocked:true,error:'Для корпусного узла автоматический расчёт выполняется только по массе вставного подшипника из подтверждённого каталога. Массу всего корпуса использовать нельзя.'};
    if(!(bearingMassKg>0))return {...resultMeta('X','Недостаточно данных'),envelopeVolumeCm3:round(envelopeVolumeCm3,2),freeVolumeCm3:null,greaseVolumeCm3:null,massG:null,bearingMassKg:null,error:'Габаритный объём рассчитан, но это не свободный объём подшипника. Нужно указать массу подшипника из OEM-каталога либо OEM free-space.'};
    freeVolumeCm3=envelopeVolumeCm3-bearingMassKg/(7.8e-3);freeVolumeMethod='LUBRICA engineering free-space estimate';source=OEM()?.sourceRefs?.LUBRICA_UNIFIED||null;assumptions.push('Свободный объём рассчитан инженерной геометрической методикой LUBRICA; OEM-масса подшипника не превращает этот результат в OEM free-space.');
    if(nskUnit?.insert){code='C';label='OEM NSK mass + engineering free-space method';assumptions.push(`NSK OEM-масса вставки ${nskUnit.insertDesignation} используется в инженерной формуле свободного объёма; результат не является точным OEM-объёмом NSK.`);}
    if(massM!=='auto'&&selected!=='auto'&&massM!==selected){code='D';label='Cross-brand engineering estimate';assumptions.push(`Масса взята из каталога ${massM}, а выбран производитель ${selected}; это межбрендовая инженерная оценка.`);}
    else if(massM!=='auto'&&selected!=='auto'&&massM===selected&&!nskUnit?.insert){code='C';label='OEM mass + engineering free-space method';assumptions.push(`Масса подшипника взята из каталога ${massM}; свободный объём рассчитан инженерной геометрической методикой и не является точным OEM free-space.`);}
    else if(massM!=='auto')assumptions.push(`Масса подшипника взята из каталога ${massM}; свободный объём рассчитан инженерно.`);
    else assumptions.push('Свободный объём рассчитан по геометрии и введённой массе; источник массы должен быть подтверждён.');
    if(massSource)assumptions.push(`Источник массы: ${massSource}`);
  }
  if(!(freeVolumeCm3>0))return {...resultMeta('X','Ошибка исходных данных',source,assumptions),envelopeVolumeCm3:round(envelopeVolumeCm3,2),freeVolumeCm3:null,greaseVolumeCm3:null,massG:null,bearingMassKg,error:'Свободный объём не получается положительным. Проверьте размеры, массу и применимость метода.'};
  const rec=fillRecommendation(input);
  if(!(fillRatio>0&&fillRatio<=1))return {...resultMeta('X','Требуется доля заполнения',source,assumptions),envelopeVolumeCm3:round(envelopeVolumeCm3,2),freeVolumeCm3:round(freeVolumeCm3,2),greaseVolumeCm3:null,massG:null,bearingMassKg,fillRatio:null,greaseDensity:greaseDensity>0?greaseDensity:null,fillRecommendation:rec,freeVolumeMethod,error:'Свободный объём рассчитан. Укажите долю заполнения 0…1 или примените OEM-рекомендацию.'};
  const greaseVolumeCm3=freeVolumeCm3*fillRatio;
  if(!(greaseDensity>0))return {...resultMeta('X','Требуется плотность смазки',source,assumptions),envelopeVolumeCm3:round(envelopeVolumeCm3,2),freeVolumeCm3:round(freeVolumeCm3,2),greaseVolumeCm3:round(greaseVolumeCm3,2),massG:null,bearingMassKg,fillRatio,greaseDensity:null,fillRecommendation:rec,freeVolumeMethod,error:'Объём смазки рассчитан. Для перевода в массу нужна плотность выбранного материала.'};
  return {...resultMeta(code,label,source,assumptions),envelopeVolumeCm3:round(envelopeVolumeCm3,2),freeVolumeCm3:round(freeVolumeCm3,2),greaseVolumeCm3:round(greaseVolumeCm3,2),massG:round(greaseVolumeCm3*greaseDensity,2),bearingMassKg,fillRatio,greaseDensity,bearingMassKind,insertDesignation,manufacturer,massManufacturer:massM,fillRecommendation:rec,freeVolumeMethod,formula:oemFreeSpaceCm3>0?'Vсм = Vсв(OEM) × Kзап; G = Vсм × ρ':'Vсв ≈ π/4 × B × (D² − d²) × 10⁻³ − M/(7,8×10⁻³); Vсм = Vсв × Kзап; G = Vсм × ρ'};
}


function maintenancePolicy(input={}){
  const o=OEM();
  if(troesterContext(input))return {id:'troester_block_service',housed:true,relube:true,fullRenewal:false,label:'Tröster Blocklager — OEM-досмазывание',reason:'Плановый цикл — досмазывание внутренних подшипников. Промывка двойной первичной дозой после перегрева >120°C является корректирующей операцией, а не плановой полной заменой.'};
  if(ferrariOwnContext(input))return {id:'ferrari_oem_service',housed:true,relube:true,fullRenewal:false,label:'Ferrari — OEM-обслуживание',reason:'Для собственного Ferrari bearing block рабочая доза и интервал берутся из CART01 либо из точной строки Ferrari Chart 8-2 для shaft-only version 1/6.'};
  if(specialProcedureType(input))return {id:'special_procedure_only',housed:String(input.bearingType||'')==='roller_bearing_unit',relube:true,fullRenewal:false,label:'Специальный подшипниковый узел — OEM/утверждённая процедура',reason:'Для этого типа не применяется универсальная rolling-bearing формула количества и интервала. Используйте OEM либо подтверждённую процедуру предприятия.'};
  if(String(input.bearingType||'')==='slewing_ring_four_point_ball')return {id:'slewing_ring_relube_procedure',housed:false,relube:true,fullRenewal:false,label:'Опорно-поворотный подшипник — OEM-досмазывание',reason:'Для INA/Schaeffler VLU рабочая операция — периодическое досмазывание через все точки до выхода свежей смазки. Плановая полная замена смазки автоматически не назначается.'};
  const zlg=zlgContext(input);
  if(zlg)return {id:'zlg_relube_only',housed:true,relube:true,fullRenewal:false,label:'ZLG — OEM-досмазывание',reason:'Для ZLG в рабочей карте используется цикл досмазывания по подтверждённой OEM-методике. Первичное заполнение корпуса не превращается в периодическую полную замену.'};
  const snl=snlContext(input);
  if(snl){const sm=effectiveSnlMode(input),side=snl.feedMethod==='side';if(sm==='reitz_kxe_single')return {id:'reitz_kxe_single_service',housed:true,relube:true,fullRenewal:true,fullRenewalState:side?'FALLBACK_AVAILABLE':'CONDITION_BASED',label:'REITZ KXE — OEM-обслуживание одиночной опоры',reason:side?'REITZ задаёт дозу/период досмазывания и количество первичного/нового заполнения. Подтверждённый отдельный период нового заполнения в подключённой REITZ-таблице не найден; для фактического корпуса SKF SNL можно явно принять SKF-стратегию обновления как fallback.':'REITZ задаёт досмазывание и количество нового заполнения. При подаче через канавку/отверстия плановый интервал полного обновления автоматически не назначается; требуется OEM/ТО по состоянию.'};return {id:side?'skf_snl_side_service':'skf_snl_groove_service',housed:true,relube:true,fullRenewal:true,fullRenewalState:side?'CALCULATED':'CONDITION_BASED',label:side?'SKF SNL — досмазывание + плановое обновление':'SKF SNL — досмазывание + обновление по состоянию',reason:side?'SKF: при подаче сбоку корпус обычно заполняется примерно на 40%; после приблизительно пяти пополнений следует обновить полный запас смазки.':'SKF: при подаче через канавку/отверстия корпус обычно заполняется примерно на 20%; календарный интервал полного обновления не назначается автоматически, но при вскрытии/ТО выполняется удаление старой смазки и восстановление рабочего заполнения корпуса.'};}
  const housed=String(input.bearingType||'')==='bearing_unit'||!!o?.housedUnitReferenceProfile?.(input.designation);
  if(housed)return {id:'housed_relube_only',housed:true,relube:true,fullRenewal:false,label:'Корпусной узел с вставным подшипником — штатное досмазывание',reason:'Для стандартного корпусного узла со вставным подшипником плановой операцией является досмазывание согласно OEM/подтверждённой инженерной методике. Полная разборка и замена всего смазочного заполнения не создаётся автоматически.'};
  return {id:'standard_serviceable_bearing',housed:false,relube:true,fullRenewal:true,label:'Обычный обслуживаемый подшипник',reason:'Для обычного обслуживаемого подшипника полный цикл замены может рассчитываться отдельно, если конструкция и регламент допускают такую операцию.'};
}

function fullRenewalQuantity(input={}){
  const o=OEM(),mi=manufacturerInfo(input),policy=maintenancePolicy(input);
  if(!policy.fullRenewal)return {...resultMeta('X','Не является плановой операцией',o?.sourceRefs?.LUBRICA_UNIFIED||null,[policy.reason]),value:null,unit:'г',notApplicable:true,maintenancePolicy:policy.id,error:policy.reason};
  const snl=snlContext(input);
  if(snl&&effectiveSnlMode(input)==='reitz_kxe_single'){
    const rp=reitzSnl(input);
    if(!rp||rp.blocked||!(Number(rp.refillG)>0))return {...resultMeta('X','REITZ KXE — количество нового заполнения требует уточнения',rp?.source||o?.sourceRefs?.REITZ_KXE_SINGLE||null,[rp?.reason||policy.reason]),value:null,unit:'г',blocked:true,maintenancePolicy:policy.id,error:rp?.reason||'Для этой опоры в подключённой таблице REITZ не найдено количество первичного/нового заполнения.'};
    return {...resultMeta('A','OEM REITZ KXE — первичное/новое заполнение',rp.source,[`REITZ: ${rp.refillG} г на один подшипник/одну подшипниковую опору при первичном или новом заполнении.`,`Это не доза обычного досмазывания (${rp.relubeG} г) и не означает автоматически заданную периодичность полной замены.`]),value:rp.refillG,unit:'г',maintenancePolicy:policy.id,scope:'reitz_single_new_refill',formula:'REITZ KXE: Fettmenge bei Erst- oder Neubefüllung je Lager',sourceLevel:'oem_exact',sourceManufacturer:'REITZ',snlReference:snl.profile,reitzSingleReference:rp,feedMethod:snl.feedMethod,parameterRole:'full_renewal_quantity'};
  }
  if(snl&&snl.feedMethod==='side'){const p=snl.profile;if(!p)return {...resultMeta('X','SKF SNL — не распознан размер корпуса',o?.sourceRefs?.SKF_SNL||null,[policy.reason]),value:null,unit:'г',blocked:true,maintenancePolicy:policy.id,error:'Для точного количества полной замены сохраните маркировку корпуса SNL (например SNL 522-619).'};return {...resultMeta('A','OEM SKF SNL — полный рабочий запас',p.source,[`Для подачи сбоку SKF задаёт заполнение корпуса около 40% свободного объёма. Для ${p.designation} встроенное OEM-значение: ${p.fill40G} г.`,'Это количество относится к обновлению полного рабочего запаса корпуса после удаления отработанной смазки; оно не является дозой обычного досмазывания.']),value:p.fill40G,unit:'г',maintenancePolicy:policy.id,scope:'snl_housing_fill',formula:`SKF SNL ${p.designation}: 40% fill`,sourceLevel:'oem_exact',sourceManufacturer:'SKF',snlReference:p,feedMethod:'side'};}
  if(snl&&snl.feedMethod==='groove'){const p=snl.profile;if(!p)return {...resultMeta('X','SKF SNL — не распознан размер корпуса',o?.sourceRefs?.SKF_SNL||null,[policy.reason]),value:null,unit:'г',blocked:true,maintenancePolicy:policy.id,error:'Для точного количества полного обновления сохраните маркировку корпуса SNL (например SNL 522-619).'};return {...resultMeta('A','OEM SKF SNL — рабочее заполнение при подаче через канавку',p.source,[`Для подачи через канавку/отверстия SKF задаёт заполнение корпуса около 20% свободного объёма. Для ${p.designation} встроенное OEM-значение: ${p.fill20G} г.`,'Количество используется при полном удалении старой смазки и восстановлении рабочего заполнения корпуса во время вскрытия/ТО. Календарный интервал для этой операции автоматически не назначается.']),value:p.fill20G,unit:'г',maintenancePolicy:policy.id,scope:'snl_housing_fill_condition',formula:`SKF SNL ${p.designation}: 20% fill`,sourceLevel:'oem_exact',sourceManufacturer:'SKF',snlReference:p,feedMethod:'groove',conditionBased:true};}
  // Полная замена для уже смонтированного узла: после удаления старой смазки восстанавливаем рабочий запас
  // внутри самого подшипника. Полость корпуса не включается без подтвержденного OEM free-space корпуса.
  const fill=geometricBearingFill({...input,fillRatio:1});
  if(!(fill.massG>0))return {...resultMeta('X','Недостаточно данных для полной замены',fill.source||o?.sourceRefs?.LUBRICA_UNIFIED||null,fill.assumptions||[]),value:null,unit:'г',error:fill.error||'Для расчёта полной замены нужны размеры, подтверждённая масса/free-space и плотность смазки.',scope:'bearing_only'};
  let code=fill.confidenceCode==='A'?'B':(fill.confidenceCode==='C'?'C':'D');
  let label=code==='B'?'OEM free-space + service refill':code==='C'?'OEM mass + universal service refill':'LUBRICA full-renewal estimate';
  const assumptions=[...(fill.assumptions||[]),'Полная замена рассчитана для рабочего запаса смазки внутри подшипника после удаления старой смазки; дополнительная полость корпуса не включена без отдельного OEM-объёма.'];
  if(input.bearingType==='bearing_unit')assumptions.push('Для корпусного узла количество относится к вставному UC/UK-подшипнику. Смазка в дополнительной полости корпуса учитывается отдельно только при наличии её OEM-объёма.');
  return {...resultMeta(code,label,fill.source||o?.sourceRefs?.LUBRICA_UNIFIED||null,assumptions),value:round(fill.massG,2),unit:'г',greaseVolumeCm3:fill.freeVolumeCm3,freeVolumeCm3:fill.freeVolumeCm3,bearingMassKg:fill.bearingMassKg,greaseDensity:fill.greaseDensity,massManufacturer:fill.massManufacturer,insertDesignation:fill.insertDesignation,scope:'bearing_only',formula:'Gзам = Vсв подшипника × ρ (рабочий запас после полного удаления старой смазки)',sourceLevel:code==='B'?'oem_method':code==='C'?'mixed':'engineering'};
}
function fullRenewalInterval(input={},relubeInterval=null,relube=null){
  const o=OEM(),mi=manufacturerInfo(input),policy=maintenancePolicy(input),tf=num(relubeInterval?.value);
  if(!policy.fullRenewal)return {...resultMeta('X','Не является плановой операцией',o?.sourceRefs?.LUBRICA_UNIFIED||null,[policy.reason]),value:null,unit:'ч',notApplicable:true,maintenancePolicy:policy.id,error:policy.reason};
  const snl=snlContext(input);
  if(snl&&effectiveSnlMode(input)==='reitz_kxe_single'){
    if(!(tf>0))return {...resultMeta('X','REITZ KXE — нет интервала досмазывания',o?.sourceRefs?.REITZ_KXE_SINGLE||null),value:null,unit:'ч',error:'Сначала должен быть рассчитан REITZ-интервал досмазывания.'};
    if(snl.feedMethod!=='side')return {...resultMeta('X','Полное обновление — по состоянию / ТО',snl.profile?.source||o?.sourceRefs?.SKF_SNL||null,['Для подачи через канавку/отверстия автоматический период полного обновления не назначается.']),value:null,unit:'ч',conditionBased:true,maintenancePolicy:policy.id,sourceManufacturer:'SKF',fallbackAvailable:false};
    let cycles=5,reason='SKF SNL fallback: при подаче сбоку полный запас корпуса обычно обновляют приблизительно после пяти фактических операций досмазывания.';if(tf>=4380){cycles=1;reason='SKF SNL fallback: при очень большом интервале обслуживания обновление полного запаса рассматривается вместо обычного пополнения.';}
    const candidate=round(Math.min(tf*cycles,30000),0);
    if(String(input.fullRenewalFallbackMode||'review')!=='skf_snl')return {...resultMeta('X','Период REITZ не найден — доступен SKF SNL fallback',snl.profile?.source||o?.sourceRefs?.SKF_SNL||null,[reason,'Количество нового заполнения остаётся REITZ OEM; SKF предлагается только для отсутствующей стратегии/периодичности полного обновления.']),value:null,candidateValue:candidate,unit:'ч',relubeCycles:cycles,baseRelubeHours:round(tf,0),sourceLevel:'oem_method',sourceManufacturer:'SKF',snlReference:snl.profile,feedMethod:'side',fallbackAvailable:true,fallbackMethod:'SKF_SNL',fallbackRequiresApproval:true,maintenancePolicy:policy.id,error:'REITZ не задаёт отдельный период полного нового заполнения. Можно явно принять SKF SNL как fallback для периодичности.'};
    return {...resultMeta('B','SKF SNL fallback — период полного обновления',snl.profile?.source||o?.sourceRefs?.SKF_SNL||null,[reason,'Fallback принят пользователем. Количество нового заполнения остаётся из REITZ; SKF определяет только период/стратегию обновления.']),value:candidate,rawValue:candidate,unit:'ч',relubeCycles:cycles,baseRelubeHours:round(tf,0),sourceLevel:'oem_method',sourceManufacturer:'SKF',snlReference:snl.profile,feedMethod:'side',fallbackApplied:true,fallbackMethod:'SKF_SNL',maintenancePolicy:policy.id};
  }
  if(snl&&snl.feedMethod==='groove')return {...resultMeta('B','OEM SKF SNL — обновление по состоянию / при ТО',snl.profile?.source||o?.sourceRefs?.SKF_SNL||null,['При подаче через канавку/отверстия календарный интервал полного обновления автоматически не назначается. Операция выполняется при вскрытии корпуса, загрязнении/деградации смазки или по отдельному регламенту ТО.']),value:null,unit:'ч',conditionBased:true,maintenancePolicy:policy.id,sourceLevel:'oem_method',sourceManufacturer:'SKF',snlReference:snl.profile,feedMethod:'groove'};
  if(snl&&snl.feedMethod==='side'){if(!(tf>0))return {...resultMeta('X','Нет интервала досмазывания',snl.profile?.source||o?.sourceRefs?.SKF_SNL||null),value:null,unit:'ч',error:'Сначала должен быть рассчитан интервал досмазывания SNL.'};let cycles=5,reason='SKF: при подаче сбоку и исходном заполнении корпуса около 40% полный запас обновляют приблизительно после пяти пополнений.';if(tf>=4380){cycles=1;reason='SKF: если расчётный интервал обслуживания превышает примерно 6 месяцев, предпочтительно обновление полного запаса вместо обычного пополнения.';}return {...resultMeta('B','OEM SKF SNL — цикл обновления',snl.profile?.source||o?.sourceRefs?.SKF_SNL||null,[reason]),value:round(Math.min(tf*cycles,30000),0),rawValue:round(tf*cycles,0),unit:'ч',relubeCycles:cycles,baseRelubeHours:round(tf,0),sourceLevel:'oem_method',sourceManufacturer:'SKF',snlReference:snl.profile,feedMethod:'side'};}
  if(!(tf>0))return {...resultMeta('X','Нет базового цикла',relubeInterval?.source||null),value:null,unit:'ч',error:'Сначала должен быть рассчитан интервал досмазывания.'};
  const contamination=String(input.contamination||'normal'),vibration=String(input.vibration||'normal');
  let cycles=5,code='D',label='LUBRICA renewal cycle',source=o?.sourceRefs?.LUBRICA_UNIFIED||null,assumptions=[];
  // SKF: при боковом пополнении с типичным заполнением корпуса полную замену рекомендуют примерно после пяти пополнений.
  if(mi.id==='SKF'&&relube?.selectedRule==='skf_side'){cycles=5;code='B';label='SKF renewal rule';source=o?.sourceRefs?.SKF||source;assumptions.push('SKF: при пополнении сбоку полная замена полного запаса требуется приблизительно после пяти пополнений, когда свободное место корпуса больше не может принимать дополнительную смазку.');}
  // NTN bearing units: пополнять рекомендуется до истечения примерно 1/3 расчетного срока службы смазки.
  else if(mi.id==='NTN-SNR'&&String(input.bearingType)==='bearing_unit'){cycles=3;code='C';label='NTN service-life derived renewal';source=o?.sourceRefs?.NTN_UNITS||o?.sourceRefs?.NTN||source;assumptions.push('NTN bearing units: пополнение рекомендуется до истечения примерно одной трети расчётного срока службы смазки; полный цикл обновления принят как консервативная производная от этого OEM-правила.');}
  else{
    cycles={normal:5,moderate:4,heavy:3,severe:2}[contamination]||5;
    if(vibration==='high')cycles=Math.max(2,cycles-1);
    assumptions.push(`LUBRICA Universal: полный цикл обновления принят через ${cycles} циклов досмазывания с учётом загрязнения и вибрации.`);
  }
  // Если сам рассчитанный интервал превышает 6 месяцев, SKF рекомендует renewal вместо replenishment.
  if(tf>=4380){cycles=1;if(mi.id==='SKF'){code='B';label='SKF renewal procedure';source=o?.sourceRefs?.SKF||source;}else if(code==='D'){code='C';label='SKF renewal criterion applied as universal rule';}assumptions.push('При интервале более 6 месяцев SKF рекомендует выполнять обновление смазочного заполнения вместо обычного пополнения; поэтому цикл полной замены приравнен к интервалу обслуживания.');}
  let raw=tf*cycles;
  // Ограничение 30 000 ч согласовано с практическим пределом SKF для relubrication planning.
  const value=Math.min(raw,30000);
  if(raw>30000)assumptions.push('Интервал полной замены ограничен 30 000 ч как верхний практический предел планирования смазочного обслуживания.');
  return {...resultMeta(code,label,source,assumptions),value:round(value,0),rawValue:round(raw,0),unit:'ч',relubeCycles:cycles,baseRelubeHours:round(tf,0),sourceLevel:code==='B'?'oem_method':code==='C'?'mixed':'engineering'};
}
function speedAssessment({d,D,rpm,bearingType='unknown',loadClass='medium',outerRingRotation=false,limitingRpm=null}={}){
  d=num(d);D=num(D);rpm=num(rpm);limitingRpm=num(limitingRpm);const def=typeFactors[bearingType]||typeFactors.unknown;if(!(d>0&&D>d&&rpm>=0))return {dm:null,ndm:null,speedFactor:null,limit:null,ratio:null,error:'Для оценки скорости нужны d, D и обороты.'};
  const dm=(d+D)/2,diameterForSpeed=outerRingRotation?D:dm,ndm=rpm*diameterForSpeed,bf=def.bf,speedFactor=bf?ndm*bf:null,limit=def.limits?.[loadClass]||null;
  return {dm:round(dm,2),ndm:round(ndm,0),diameterForSpeed:round(diameterForSpeed,2),bf,speedFactor:round(speedFactor,0),limit,ratio:limit&&speedFactor?round(speedFactor/limit,3):null,limitingRpm,relativeToLimiting:limitingRpm>0?round(rpm/limitingRpm,3):null,bearingType,loadClass,outerRingRotation};
}
function temperatureFactorNSK(t){t=num(t);if(!Number.isFinite(t)||t<=70)return 1;const steps=Math.floor((t-70)/15+1e-9);return Math.pow(0.5,steps)}
function intervalSourceManufacturer(src,selected){const s=String(src||'unified_auto').toLowerCase();if(s==='unified_auto'||s==='auto_oem')return 'engineering';if(s==='nsk')return 'NSK';if(s==='ntn')return 'NTN-SNR';if(s==='fag')return 'FAG';if(s==='skf')return 'SKF';if(s==='timken')return 'TIMKEN';return s==='manual'?'engineering':'other_oem'}
function unifiedBaseInterval(input={},mi=manufacturerInfo(input)){
  const o=OEM(),d=num(input.d),D=num(input.D),rpm=num(input.rpm),temp=num(input.temperatureC);
  const specialType=specialProcedureType(input);
  if(specialType)return {blocked:true,code:'X',label:'Требуется OEM/подтверждённый интервал',source:null,sourceManufacturer:null,oem:false,note:'Для этого специального типа LUBRICA намеренно не выводит периодичность из универсального n·dₘ baseline. Укажите интервал из OEM или утверждённого регламента.'};
  const zlg=zlgContext(input),zm=effectiveZlgMode(input);
  if(zlg){
    const p=zlg.profile;
    if(zm==='reitz_kxe'){const rp=reitzZlg(input);if(!rp||rp.blocked)return {blocked:true,code:'X',label:'REITZ KXE ZLG — требуется уточнение',source:rp?.source||o?.sourceRefs?.REITZ_KXE||null,sourceManufacturer:'REITZ',oem:true,note:rp?.reason||'Требуется точное исполнение ZLG и рабочие обороты.'};return {baseHours:rp.intervalHours,range:null,code:'A',label:'OEM REITZ KXE ZLG',source:rp.source,sourceManufacturer:'REITZ',oem:true,note:`REITZ KXE Table 11: базовый интервал ${rp.baseIntervalHours} ч по диапазону оборотов; температурный коэффициент ${rp.temperatureFactor} (до ${rp.temperatureBand} °C) → ${rp.intervalHours} ч.`,reitzReference:rp,zlgReference:p};}
    if(zm==='housing_2024'&&p)return {baseHours:p.baselineIntervalHours,range:null,code:'B',label:'OEM ZLG housing guide',source:p.source,sourceManufacturer:'NTN-SNR',oem:true,note:`NTN-SNR ZLG housing reference: ${p.baselineIntervalHours} рабочих часов, но не реже ${p.calendarMinimumPerYear} раз в год. Generic speed/temperature coefficients LUBRICA не подмешиваются.`,calendarMinimumPerYear:p.calendarMinimumPerYear,calendarCapDays:Math.round(365/p.calendarMinimumPerYear),zlgReference:p};
    if(zm==='application_oem')return {blocked:true,code:'X',label:'OEM конкретного вентилятора / узла',source:null,sourceManufacturer:'NTN-SNR',oem:true,note:'Введите утверждённый интервал и источник application-specific OEM в экспертном режиме.'};
    return {blocked:true,code:'X',label:'ZLG: выбор OEM-уровня',source:p?.source||o?.sourceRefs?.NTN_ZLG_2024||null,sourceManufacturer:'NTN-SNR',oem:true,note:p?`Корпусный reference найден (${p.baselineIntervalHours} ч, минимум ${p.calendarMinimumPerYear} раза/год), но для высокооборотного вентилятора применимость должна быть подтверждена.`:'Точный ZLG housing reference не найден по маркировке.'};
  }
  const snl=snlContext(input);
  if(snl&&effectiveSnlMode(input)==='reitz_kxe_single'){const rp=reitzSnl(input);if(!rp||rp.blocked)return {blocked:true,code:'X',label:'REITZ KXE — одиночная опора требует уточнения',source:rp?.source||o?.sourceRefs?.REITZ_KXE_SINGLE||null,sourceManufacturer:'REITZ',oem:true,note:rp?.reason||'Требуется точный внутренний подшипник и рабочие обороты.'};return {baseHours:rp.intervalHours,range:null,code:'A',label:'OEM REITZ KXE single bearing',source:rp.source,sourceManufacturer:'REITZ',oem:true,note:`REITZ KXE: ${rp.housing} / ${rp.key}; колонка ${rp.speedColumn} об/мин, базовый интервал ${rp.baseIntervalHours} ч; температурный коэффициент ${rp.temperatureFactor} → ${rp.intervalHours} ч.`,reitzSingleReference:rp,snlReference:snl.profile};}
  if(String(input.bearingType||'')==='slewing_ring_four_point_ball'){
    if(!Number.isFinite(temp))return {blocked:true,code:'X',label:'Укажите температуру',source:o?.sourceRefs?.SCHAEFFLER_SLEWING||null,sourceManufacturer:'FAG',oem:true,note:'Для проверки применимости OEM guide-интервала VLU укажите рабочую температуру узла.'};
    const contamination=String(input.contamination||'normal');
    if(temp>=70)return {blocked:true,code:'X',label:'Требуется проверка условий',source:o?.sourceRefs?.SCHAEFFLER_SLEWING||null,sourceManufacturer:'FAG',oem:true,note:'Табличные интервалы TPI 13 даны для T < 70 °C; при 70 °C и выше требуется отдельное уточнение.'};
    let baseHours=500,range=[500,500],note='Schaeffler TPI 13: сухая чистая зона — около 500 ч.';
    if(contamination==='moderate'||contamination==='heavy'){baseHours=150;range=[100,200];note='Schaeffler TPI 13: повышенное загрязнение/работа на открытом воздухе — 100–200 ч; для плана используется середина 150 ч.';}
    if(contamination==='severe')return {blocked:true,code:'B',label:'OEM continuous lubrication',source:o?.sourceRefs?.SCHAEFFLER_SLEWING||null,sourceManufacturer:'FAG',oem:true,note:'Schaeffler TPI 13: при экстремальном загрязнении требуется непрерывная смазка через централизованную систему или картриджи; периодический интервал в часах не назначается.'};
    if(rpm>0&&d>0&&D>d){const dm=(d+D)/2;const v=Math.PI*(dm/1000)*rpm/60;if(v>=0.5)return {blocked:true,code:'X',label:'Скорость вне области таблицы',source:o?.sourceRefs?.SCHAEFFLER_SLEWING||null,sourceManufacturer:'FAG',oem:true,note:`Расчётная окружная скорость ${round(v,3)} м/с ≥ 0,5 м/с; guide values TPI 13 здесь напрямую не применяются.`};note+=` Окружная скорость ≈ ${round(v,3)} м/с (<0,5 м/с).`; }
    return {baseHours,range,code:'B',label:'OEM slewing-ring guide',source:o?.sourceRefs?.SCHAEFFLER_SLEWING||null,sourceManufacturer:'FAG',oem:true,note};
  }
  if(!(d>0&&D>d&&rpm>0))return null;
  const tempEff=Number.isFinite(temp)?temp:70;
  const dm=(d+D)/2,ndm=rpm*dm,type=input.bearingType||'unknown';
  // OEM table for NTN/NTN-SNR housed units: midpoint of the published safe interval range.
  if(mi.id==='NTN-SNR'&&type==='bearing_unit'){let lo,hi;if(tempEff<=80&&ndm<=40000){lo=1500;hi=3000;}else if(tempEff<=80&&ndm<=70000){lo=1000;hi=2000;}else if(tempEff<=100&&ndm<=70000){lo=500;hi=700;}if(lo){return {baseHours:(lo+hi)/2,range:[lo,hi],code:'B',label:'OEM bearing-unit guide',source:o?.sourceRefs?.NTN_UNITS,sourceManufacturer:'NTN-SNR',oem:true,note:`NTN/NTN-SNR guide: n·dₘ=${Math.round(ndm)}.`};}}
  // Unified baseline: use the same housed-unit speed bands as a conservative cross-OEM reference,
  // then scale non-housed bearing families by rolling-element type.
  let base=ndm<=40000?2250:ndm<=70000?1500:Math.max(250,1500*70000/ndm);
  const typeScale={deep_groove_ball:1.35,angular_contact_ball:1.15,self_aligning_ball:1.0,cylindrical_roller:0.9,tapered_roller:0.75,spherical_roller:0.65,needle_roller:0.65,bearing_unit:1,thrust_ball:0.65,thrust_roller:0.5,unknown:0.8}[type]||0.8;
  base*=typeScale;
  return {baseHours:base,range:null,code:'D',label:'LUBRICA Unified interval',source:o?.sourceRefs?.LUBRICA_UNIFIED,sourceManufacturer:'engineering',oem:false,note:`LUBM baseline from bearing type and speed characteristic n·dₘ=${Math.round(ndm)}; OEM interval has priority when available.`};
}
function adjustedInterval(input={}){
  if(troesterContext(input)){const o=OEM(),vi=ventappMachineInterval(input);if(vi!=null)return {...resultMeta('A','OEM Ventapp — интервал конкретного вентилятора',o?.sourceRefs?.VENTAPP_MACHINE||null,[`Источник конкретной машины: ${ventappMachineSource(input)}.`,input.ventappGrease?`Смазочный материал по Ventapp: ${input.ventappGrease}.`:null,'Application-specific Ventapp имеет приоритет над диаграммой Tröster.']),value:Math.round(vi),rawValue:Math.round(vi),baseHours:Math.round(vi),temperatureFactor:1,orientationFactor:1,sourceLevel:'oem_exact',sourceManufacturer:'Ventapp',applicationSpecific:true};if(troesterVentappMismatch(input))return {...resultMeta('X','Tröster — неверный OEM-контекст',o?.sourceRefs?.TROESTER_BLOCK||null),value:null,unit:'ч',blocked:true,sourceManufacturer:'Tröster',error:'Cross-OEM guard: Tröster в проекте применяется только на вентиляторах Ventapp.'};const manualBase=num(input.troesterBaseIntervalHours),manualSource=String(input.troesterBaseIntervalSource||'').trim(),useAuto=!(manualBase>0&&manualSource);let base=null,baseSource='',diagram=null;if(useAuto){diagram=o?.troesterDiagramInterval?.(input.bearingType,num(input.d),num(input.rpm));if(!diagram||diagram.blocked)return {...resultMeta('X','Tröster — чтение OEM-диаграммы',o?.sourceRefs?.TROESTER_BLOCK||null,['LUBRICA использует локальную 2D-оцифровку оригинальной диаграммы Tröster: тип подшипника → шкала I/II/III, d и рабочие обороты.',diagram?.reason||'Недостаточно данных для точки диаграммы.']),value:null,unit:'ч',blocked:true,sourceManufacturer:'Tröster',error:diagram?.reason||'Укажите тип подшипника, d и рабочие обороты.'};base=diagram.hours;baseSource=`Tröster OEM diagram p.${diagram.page}, scale ${diagram.scale}; 2D digitized chart reading`; }else{base=manualBase||num(input.baseHours);baseSource=manualSource;if(!(base>0))return {...resultMeta('X','Tröster — tf из OEM-диаграммы',o?.sourceRefs?.TROESTER_BLOCK||null,['Базовый tf определяется диаграммой Tröster по типу подшипника, d и оборотам.','Автоматическая n·d-аппроксимация отключена, поскольку OEM публикует график, а не числовую таблицу.']),value:null,unit:'ч',blocked:true,sourceManufacturer:'Tröster',error:'Введите подтверждённый tf из диаграммы Tröster и укажите источник.'};if(!baseSource)return {...resultMeta('X','Tröster — источник tf не указан',o?.sourceRefs?.TROESTER_BLOCK||null,['Числовой tf нельзя считать OEM-значением без фиксации источника/подтверждения чтения диаграммы.']),value:null,unit:'ч',blocked:true,sourceManufacturer:'Tröster',error:'Укажите источник подтверждённого tf (диаграмма Tröster, стр. 7 / фото / проверка инженером).'};}const t=num(input.temperatureC)??70,tempSteps=t>70?Math.floor((t-70)/15):0,tf=Math.pow(.5,tempSteps),of=String(input.shaftOrientation)==='vertical'?.5:1,raw=base*tf*of;return {...resultMeta('A','OEM Tröster — интервал',o?.sourceRefs?.TROESTER_BLOCK||null,[useAuto?`Базовый tf ${base} ч получен автоматическим 2D-чтением локально оцифрованной OEM-диаграммы Tröster (шкала ${diagram?.scale}, стр. 7, допуск оцифровки ±${diagram?.tolerancePct||15}%).`:`Подтверждённый вручную tf по диаграмме Tröster: ${base} ч. Источник: ${baseSource}.`,tempSteps>0?`Температура ${t}°C: ${tempSteps} полный(ых) шаг(а) +15°C выше 70°C, коэффициент ${tf}.`:(t>70?'Температура выше 70°C, но полный шаг +15°C не достигнут; дополнительный коэффициент не выдумывается.':'T≤70°C: температурная поправка не нужна.'),of<1?'Вертикальная установка: ×0,5.':'Горизонтальная установка.','Интервал ограничен 30 000 ч по инструкции Tröster.']),value:Math.round(Math.min(raw,30000)),rawValue:Math.round(raw),baseHours:base,temperatureFactor:tf,orientationFactor:of,sourceLevel:'oem_method',sourceManufacturer:'Tröster',diagramReference:diagram||null,baseIntervalSource:baseSource};}
  if(ferrariOwnContext(input)){const o=OEM(),fp=ferrariChart82(input),h=num(input.ferrariCart01IntervalHours);let base=null,label='',ref=null;if(fp){if(!fp.exactSpeed)return {...resultMeta('X','Ferrari Chart 8-2 — нет точной колонки RPM',o?.sourceRefs?.FERRARI_FAN||null,['LUBRICA не интерполирует между опубликованными Ferrari колонками оборотов.']),value:null,unit:'ч',blocked:true,sourceManufacturer:'Ferrari',error:'Для этих оборотов используйте CART01/Transmission specifications или подтверждённый OEM-интервал.'};base=fp.intervalHours;label='OEM Ferrari — Chart 8-2';ref=fp;}else if(h>0){base=h;label='OEM Ferrari — CART01';}if(base>0){let factor=1;if(['heavy','severe'].includes(String(input.contamination||'')))factor=.6;return {...resultMeta('A',label,o?.sourceRefs?.FERRARI_FAN||null,[`Базовый интервал: ${base} ч.`,factor<1?'Ferrari: для пыльной/влажной/горячей/коррозионной среды интервал сокращён примерно на 40%.':'Поправка неблагоприятной среды не применялась.']),value:Math.round(base*factor),rawValue:Math.round(base*factor),baseHours:base,environmentFactor:factor,sourceLevel:'oem_exact',sourceManufacturer:'Ferrari',ferrariReference:ref};}return {...resultMeta('X','Ferrari — период требует OEM-значения',o?.sourceRefs?.FERRARI_FAN||null,['Для комплектной трансмиссии нужен CART01; для shaft-only version 1/6 — точная строка Chart 8-2.']),value:null,unit:'ч',blocked:true,sourceManufacturer:'Ferrari',error:'Введите CART01 либо выберите точную строку Ferrari Chart 8-2.'};}
  if(ferrariSnlContext(input)&&num(input.ferrariCart01IntervalHours)>0){const o=OEM(),h=num(input.ferrariCart01IntervalHours);let factor=['heavy','severe'].includes(String(input.contamination||''))?.6:1;return {...resultMeta('A','OEM Ferrari — CART01 поверх SKF SNL',o?.sourceRefs?.FERRARI_FAN||null,[`Базовый интервал CART01: ${h} ч.`,factor<1?'Применено опубликованное Ferrari сокращение примерно на 40%.':'Без Ferrari environmental correction.']),value:Math.round(h*factor),rawValue:Math.round(h*factor),baseHours:h,environmentFactor:factor,sourceLevel:'oem_exact',sourceManufacturer:'Ferrari'};}
  let {baseHours,temperatureC=70,shaftOrientation='horizontal',conditionFactor=1,rpm,loadRatioPC,intervalSource='unified_auto'}=input;
  const o=OEM(),mi=manufacturerInfo(input);let sourceManufacturer=intervalSourceManufacturer(intervalSource,mi.id);baseHours=num(baseHours);temperatureC=num(temperatureC);conditionFactor=num(conditionFactor);loadRatioPC=num(loadRatioPC);
  let sourceLevel='manual',source=null,oemBase=false,code='D',label='Engineering estimate',assumptions=[];
  const exactAllowed=(intervalSource==='unified_auto'||intervalSource==='auto_oem'||String(intervalSource).toLowerCase()==='nsk')&&mi.id==='NSK';
  if(!(baseHours>0)&&exactAllowed&&mi.exact?.intervalTable&&num(rpm)>0){baseHours=o.interpolateInterval(mi.exact.intervalTable,num(rpm));sourceLevel='oem_exact';source=mi.exact.source;sourceManufacturer=mi.id;oemBase=true;code='A';label='OEM exact';}
  if(!(baseHours>0)){const ub=unifiedBaseInterval(input,mi);if(ub?.blocked){return {...resultMeta(ub.code||'X',ub.label||'Требуется проверка',ub.source||null,[ub.note]),value:null,unit:'ч',blocked:true,continuousLubrication:ub.label==='OEM continuous lubrication',sourceLevel:ub.oem?'oem_method':'engineering',sourceManufacturer:ub.sourceManufacturer};}if(ub){baseHours=ub.baseHours;source=ub.source;sourceLevel=ub.oem?'oem_method':'engineering';sourceManufacturer=ub.sourceManufacturer;code=ub.code;label=ub.label;assumptions.push(ub.note);if(ub.range)assumptions.push(`Опубликованный диапазон: ${ub.range[0]}–${ub.range[1]} ч; для автоматического плана используется середина диапазона.`);}else return {...resultMeta('X','Нет данных для интервала',source),value:null,error:'Для автоматического интервала нужны как минимум размеры d/D и обороты. Базовый интервал вручную требуется только в экспертном режиме, если хотите заменить автоматическую методику.',sourceLevel,sourceManufacturer};}
  if(zlgContext(input)&&effectiveZlgMode(input)==='reitz_kxe'){const rp=reitzZlg(input);if(!rp||rp.blocked)return {...resultMeta('X','REITZ KXE ZLG — требуется уточнение',rp?.source||o?.sourceRefs?.REITZ_KXE||null,[rp?.reason]),value:null,unit:'ч',blocked:true,sourceLevel:'oem_exact',sourceManufacturer:'REITZ'};return {...resultMeta('A','OEM REITZ KXE ZLG',rp.source,[`Интервал из Table 11: ${rp.baseIntervalHours} ч для фактического диапазона оборотов.`,`Температурная коррекция REITZ: ×${rp.temperatureFactor}${rp.temperatureConservative?' (применён ближайший более строгий температурный диапазон)':''}.`,`Рабочий интервал: ${rp.intervalHours} ч. Универсальные коэффициенты LUBRICA поверх этой OEM-таблицы не применяются.`]),value:rp.intervalHours,rawValue:rp.intervalHours,baseHours:rp.baseIntervalHours,temperatureFactor:rp.temperatureFactor,loadFactor:1,environmentFactor:1,applicationFactor:1,orientationFactor:1,conditionFactor:1,cappedAt30000:false,sourceLevel:'oem_exact',source:rp.source,oemBase:true,sourceManufacturer:'REITZ',reitzReference:rp,zlgReference:zlgContext(input).profile};}
  if(snlContext(input)&&effectiveSnlMode(input)==='reitz_kxe_single'){const rp=reitzSnl(input);if(!rp||rp.blocked)return {...resultMeta('X','REITZ KXE — одиночная опора требует уточнения',rp?.source||o?.sourceRefs?.REITZ_KXE_SINGLE||null,[rp?.reason]),value:null,unit:'ч',blocked:true,sourceLevel:'oem_exact',sourceManufacturer:'REITZ'};return {...resultMeta('A','OEM REITZ KXE — одиночная опора',rp.source,[`Строка REITZ: ${rp.housing} / ${rp.key}.`,`Номинальная колонка скорости: ${rp.speedColumn} об/мин; базовый интервал ${rp.baseIntervalHours} ч.`,`Температурная коррекция REITZ: ×${rp.temperatureFactor}${rp.temperatureConservative?' (ближайший более строгий диапазон)':''} → ${rp.intervalHours} ч.`,`Универсальные коэффициенты LUBRICA поверх application-specific REITZ не применяются.`]),value:rp.intervalHours,rawValue:rp.intervalHours,baseHours:rp.baseIntervalHours,temperatureFactor:rp.temperatureFactor,loadFactor:1,environmentFactor:1,applicationFactor:1,orientationFactor:1,conditionFactor:1,cappedAt30000:false,sourceLevel:'oem_exact',source:rp.source,oemBase:true,sourceManufacturer:'REITZ',reitzSingleReference:rp,snlReference:snlContext(input).profile};}
  if(zlgContext(input)&&effectiveZlgMode(input)==='housing_2024'){
    const p=zlgContext(input).profile;
    return {...resultMeta('B','OEM ZLG housing guide',p?.source||o?.sourceRefs?.NTN_ZLG_2024||null,[`Базовый интервал ${baseHours} ч; календарное ограничение — не реже ${p?.calendarMinimumPerYear||2} раз в год.`,`Обороты и универсальные коэффициенты LUBRICA не изменяют этот housing-level OEM reference. При наличии инструкции конкретного вентилятора она имеет приоритет.`]),value:round(baseHours,0),rawValue:round(baseHours,0),baseHours:round(baseHours,0),temperatureFactor:1,loadFactor:1,environmentFactor:1,applicationFactor:1,orientationFactor:1,conditionFactor:1,cappedAt30000:false,sourceLevel:'oem_method',source:p?.source||o?.sourceRefs?.NTN_ZLG_2024||null,oemBase:true,sourceManufacturer:'NTN-SNR',calendarMinimumPerYear:p?.calendarMinimumPerYear||2,calendarCapDays:Math.round(365/(p?.calendarMinimumPerYear||2)),zlgReference:p};
  }
  if(!oemBase){if(sourceManufacturer==='engineering'){code='D';label=label==='LUBRICA Unified interval'?label:'Engineering estimate';if(!assumptions.some(x=>String(x).includes('LUBM baseline')))assumptions.push('Базовый интервал указан как инженерный.');}else if(sourceManufacturer==='other_oem'){code='C';label='OEM source, generic corrections';assumptions.push('Источник базы OEM, но отдельная коррекционная модель производителя в LUBRICA не реализована.');}else{code='C';label='OEM base with implemented/generic corrections';}}
  if(sourceManufacturer!=='engineering'&&sourceManufacturer!=='other_oem'&&mi.id!=='auto'&&sourceManufacturer!==mi.id)assumptions.push(`Источник базового интервала ${sourceManufacturer} не совпадает с выбранным производителем ${mi.id}; корректировки применяются по источнику интервала.`);
  if(!(conditionFactor>0&&conditionFactor<=1.5))conditionFactor=1;
  let temperatureFactor=1,loadFactor=1,environmentFactor=1,applicationFactor=1;
  if(sourceManufacturer==='NSK'){temperatureFactor=temperatureFactorNSK(temperatureC);loadFactor=o?.nskLoadFactor?.(loadRatioPC)||1;source=source||o?.sourceRefs?.NSK||null;if(!oemBase){code='B';label='OEM method';}}
  else if(sourceManufacturer==='NTN-SNR'){
    const f=o?.ntnConditionFactors?.(input);temperatureFactor=f?.Tt||1;environmentFactor=f?.Te||1;applicationFactor=f?.Ta||1;source=source||f?.source||null;if(!oemBase){code='B';label='OEM method';}
  }else if(temperatureC>70){const steps=Math.floor((temperatureC-70)/15+1e-9);temperatureFactor=Math.pow(0.5,steps);assumptions.push('Температурная коррекция применена как общая инженерная, не как OEM-формула выбранного производителя.');if(codeRank[code]>codeRank.D){code='C';label='OEM base + engineering correction';}}
  if(sourceManufacturer==='engineering'){const env={normal:1,moderate:0.8,heavy:0.5,severe:0.25}[String(input.contamination||'normal')]||1;environmentFactor=env;applicationFactor=(input.vibration==='high'?0.6:1)*(input.loadClass==='heavy'?0.7:input.loadClass==='light'?1.1:1);}
  const orientationFactor=sourceManufacturer==='NTN-SNR'?1:(shaftOrientation==='vertical'?(sourceManufacturer==='engineering'?0.6:0.5):1);
  if(shaftOrientation==='vertical'&&sourceManufacturer!=='NTN-SNR'&&sourceManufacturer!=='engineering')assumptions.push('Коэффициент вертикального вала применён как инженерная коррекция.');
  const raw=baseHours*temperatureFactor*loadFactor*environmentFactor*applicationFactor*orientationFactor*conditionFactor;
  return {...resultMeta(code,label,source,assumptions),value:round(Math.min(raw,30000),0),rawValue:round(raw,0),baseHours:round(baseHours,0),temperatureFactor,loadFactor,environmentFactor,applicationFactor,orientationFactor,conditionFactor,cappedAt30000:raw>30000,sourceLevel:oemBase?'oem_exact':(code==='B'?'oem_method':code==='C'?'mixed':'engineering'),source,oemBase,sourceManufacturer};
}
function warnings(input={}){
  const out=[],mi=manufacturerInfo(input),policy=maintenancePolicy(input);
  const sealing=String(input.sealing||'');if(sealing==='sealed'||/2RS|2RSH|2RS1|2CS|2CS2|2CS5/i.test(String(input.sealingCode||input.designation||'')))out.push('Закрытое исполнение: возможность досмазывания должна быть подтверждена конструкцией и OEM.');
  if((!input.d||!input.D||!input.B)&&!(zlgContext(input)&&['reitz_kxe','housing_2024'].includes(effectiveZlgMode(input))))out.push('Размеры подшипника не подтверждены — точная расчётная доза недоступна.');
  if(input.contamination==='heavy'||input.contamination==='severe')out.push('Сильное загрязнение требует сокращения интервала. Без точного OEM-коэффициента используйте явный коэффициент условий и зафиксируйте источник.');
  if(input.vibration==='high')out.push('Высокая вибрация/удары требуют отдельной корректировки интервала и контроля фактической температуры/вибрации.');
  if(input.loadClass==='heavy'&&!input.loadRatioPC)out.push('Для тяжёлой нагрузки желательно задать P/C или использовать OEM-интервал.');
  if(mi.id==='auto'&&!zlgContext(input)&&!snlContext(input)&&!troesterContext(input)&&!ferrariOwnContext(input))out.push('Производитель не указан — результат является инженерной рекомендацией LUBRICA, а не OEM-значением.');
  if(zlgContext(input)&&effectiveZlgMode(input)==='guarded_auto')out.push('ZLG: укажите производителя вентилятора в простом режиме. Для REITZ таблица KXE включится автоматически; экспертный режим нужен только для проверки или переопределения.');
  // Для housed_relube_only не показываем предупреждения о fill ratio / полной замене: они не относятся к рабочему циклу.
  if(policy.fullRenewal&&!snlContext(input)&&input.fillRatio!=null){const rec=fillRecommendation(input);if(rec&&(Number(input.fillRatio)<rec.min||Number(input.fillRatio)>rec.max))out.push(`Доля заполнения ${input.fillRatio} выходит за OEM-рекомендованный диапазон ${(rec.min*100).toFixed(0)}–${(rec.max*100).toFixed(0)}% для выбранного режима.`);}
  return [...new Set(out)];
}
// Release 1.0.31 — Calculation Architecture Consolidation.
// The legacy calculation functions remain the numerical implementations; the layer below is the
// single orchestration contract used by calculate(). It makes method selection/provenance explicit
// without changing validated OEM formulae or tables.
const calculationMethodRegistry={
  VENTAPP_MACHINE:{id:'VENTAPP_MACHINE',scope:'application_oem',family:'TROESTER',operations:['relube.quantity','relube.interval'],sourceManufacturer:'Ventapp'},
  TROESTER_BLOCK:{id:'TROESTER_BLOCK',scope:'housing_oem',family:'TROESTER',operations:['relube.quantity','relube.interval'],sourceManufacturer:'Tröster'},
  FERRARI_CART01:{id:'FERRARI_CART01',scope:'application_oem',family:'FERRARI_FAN',operations:['relube.quantity','relube.interval'],sourceManufacturer:'Ferrari'},
  FERRARI_CHART82:{id:'FERRARI_CHART82',scope:'application_oem',family:'FERRARI_FAN',operations:['relube.quantity','relube.interval'],sourceManufacturer:'Ferrari'},
  REITZ_KXE_SINGLE:{id:'REITZ_KXE_SINGLE',scope:'application_oem',family:'SNL',operations:['relube.quantity','relube.interval','renewal.quantity'],sourceManufacturer:'REITZ'},
  REITZ_KXE_ZLG:{id:'REITZ_KXE_ZLG',scope:'application_oem',family:'ZLG',operations:['relube.quantity','relube.interval'],sourceManufacturer:'REITZ'},
  SKF_SNL_SIDE:{id:'SKF_SNL_SIDE',scope:'component_oem',family:'SNL',operations:['relube.quantity','renewal.quantity','renewal.interval'],sourceManufacturer:'SKF'},
  SKF_SNL_GROOVE:{id:'SKF_SNL_GROOVE',scope:'component_oem',family:'SNL',operations:['relube.quantity'],sourceManufacturer:'SKF'},
  NTN_SNR_ZLG_2024:{id:'NTN_SNR_ZLG_2024',scope:'housing_oem',family:'ZLG',operations:['relube.quantity','relube.interval'],sourceManufacturer:'NTN-SNR'},
  NSK_HOUSED_GUIDANCE:{id:'NSK_HOUSED_GUIDANCE',scope:'component_oem',family:'HOUSED_UNIT',operations:['relube.quantity','relube.interval'],sourceManufacturer:'NSK'},
  INA_VLU20:{id:'INA_VLU20',scope:'component_oem',family:'SLEWING_RING',operations:['relube.quantity','relube.interval'],sourceManufacturer:'FAG'},
  LUBRICA_UNIVERSAL_3_2:{id:'LUBRICA_UNIVERSAL_3_2',scope:'engineering_fallback',family:'GENERIC',operations:['relube.quantity','relube.interval','renewal.quantity','renewal.interval'],sourceManufacturer:'engineering'}
};
function buildCalculationContext(input={}){
  const z=zlgContext(input),s=snlContext(input),mi=manufacturerInfo(input),type=String(input.bearingType||'unknown');
  let family=troesterContext(input)?'TROESTER':(ferrariOwnContext(input)?'FERRARI_FAN':(ferrariSnlContext(input)?'FERRARI_SNL':z?'ZLG':s?'SNL':type==='slewing_ring_four_point_ball'?'SLEWING_RING':(type==='bearing_unit'||OEM()?.housedUnitReferenceProfile?.(input.designation))?'HOUSED_UNIT':'STANDARD_BEARING'));
  return Object.freeze({
    family,designation:String(input.designation||''),bearingType:type,manufacturer:mi.id,
    fanManufacturer:String(input.fanManufacturer||''),housingMarking:String(z?.rawMarking||s?.rawMarking||input.housingMarking||''),
    rpm:num(input.rpm),temperatureC:num(input.temperatureC),snlFeedMethod:s?.feedMethod||null,
    snlServiceMode:s?effectiveSnlMode(input):null,zlgServiceMode:z?effectiveZlgMode(input):null,
    applicationSpecific:!!(ventappMachineDose(input)!=null||ventappMachineInterval(input)!=null||ferrariOwnContext(input)||(ferrariSnlContext(input)&&(num(input.ferrariCart01DoseG)>0||num(input.ferrariCart01IntervalHours)>0))||(s&&effectiveSnlMode(input)==='reitz_kxe_single')||(z&&effectiveZlgMode(input)==='reitz_kxe'))
  });
}
function resolveCalculationMethods(input={},context=buildCalculationContext(input)){
  const plan={contextFamily:context.family,relube:{quantity:null,interval:null},renewal:{quantity:null,interval:null},fallbacks:[],resolverVersion:'1.0.31'};
  if(context.family==='TROESTER'){plan.relube.quantity=ventappMachineDose(input)!=null?'VENTAPP_MACHINE':'TROESTER_BLOCK';plan.relube.interval=ventappMachineInterval(input)!=null?'VENTAPP_MACHINE':'TROESTER_BLOCK';if(plan.relube.quantity!=='VENTAPP_MACHINE'||plan.relube.interval!=='VENTAPP_MACHINE')plan.fallbacks.push({operation:'relube',method:'TROESTER_BLOCK',reason:'Ventapp machine-specific parameter not recorded; use Tröster OEM for the missing parameter.'});return plan;}
  if(context.family==='FERRARI_FAN'){const m=String(input.ferrariMethodMode||'cart01')==='chart8_2'?'FERRARI_CHART82':'FERRARI_CART01';plan.relube.quantity=m;plan.relube.interval=m;return plan;}
  if(context.family==='FERRARI_SNL'){const skf=context.snlFeedMethod==='groove'?'SKF_SNL_GROOVE':'SKF_SNL_SIDE';plan.relube.quantity=num(input.ferrariCart01DoseG)>0?'FERRARI_CART01':skf;plan.relube.interval=num(input.ferrariCart01IntervalHours)>0?'FERRARI_CART01':skf;plan.renewal.quantity=context.snlFeedMethod==='side'?skf:null;plan.renewal.interval=context.snlFeedMethod==='side'?skf:null;return plan;}
  if(context.family==='SNL'&&context.snlServiceMode==='reitz_kxe_single'){
    plan.relube.quantity='REITZ_KXE_SINGLE';plan.relube.interval='REITZ_KXE_SINGLE';plan.renewal.quantity='REITZ_KXE_SINGLE';
    if(context.snlFeedMethod==='side')plan.fallbacks.push({operation:'renewal.interval',method:'SKF_SNL_SIDE',requiresApproval:true,reason:'REITZ does not publish a separate periodic new-fill interval in the connected table.'});
    return plan;
  }
  if(context.family==='SNL'){
    const m=context.snlFeedMethod==='groove'?'SKF_SNL_GROOVE':'SKF_SNL_SIDE';
    plan.relube.quantity=m;plan.relube.interval=m;plan.renewal.quantity=context.snlFeedMethod==='side'?m:null;plan.renewal.interval=context.snlFeedMethod==='side'?m:null;return plan;
  }
  if(context.family==='ZLG'&&context.zlgServiceMode==='reitz_kxe'){plan.relube.quantity='REITZ_KXE_ZLG';plan.relube.interval='REITZ_KXE_ZLG';return plan;}
  if(context.family==='ZLG'&&context.zlgServiceMode==='housing_2024'){plan.relube.quantity='NTN_SNR_ZLG_2024';plan.relube.interval='NTN_SNR_ZLG_2024';return plan;}
  if(context.family==='SLEWING_RING'){plan.relube.quantity='INA_VLU20';plan.relube.interval='INA_VLU20';return plan;}
  if(context.family==='HOUSED_UNIT'&&context.manufacturer==='NSK'){plan.relube.quantity='NSK_HOUSED_GUIDANCE';plan.relube.interval='NSK_HOUSED_GUIDANCE';return plan;}
  plan.relube.quantity='LUBRICA_UNIVERSAL_3_2';plan.relube.interval='LUBRICA_UNIVERSAL_3_2';plan.renewal.quantity='LUBRICA_UNIVERSAL_3_2';plan.renewal.interval='LUBRICA_UNIVERSAL_3_2';return plan;
}
function resultProvenance(x){return x?{value:x.value??null,unit:x.unit||null,sourceManufacturer:x.sourceManufacturer||null,sourceLevel:x.sourceLevel||null,source:x.source||null,confidenceCode:x.confidenceCode||null,method:x.method||x.selectedRule||null}:null;}
function architectureWarnings(input,context,plan,legacyWarnings){
  // Application-specific OEM methods own their condition corrections. Generic engineering warnings
  // must not imply that LUBRICA coefficients modify an exact REITZ table result.
  if(!context.applicationSpecific)return legacyWarnings;
  return legacyWarnings.filter(w=>!/загрязнен|вибрац|P\/C|тяж[её]л/i.test(String(w)));
}
function validateMethodIsolation(plan,parts){
  const issues=[];
  const check=(path,result)=>{if(!result||result.value==null)return;const [group,key]=path.split('.'),method=plan[group]?.[key];if(!method)return;const expected=calculationMethodRegistry[method]?.sourceManufacturer;if(!expected)return;const actual=result.sourceManufacturer||null;
    // Engineering methods can legitimately return an OEM exact/method result through the generic
    // resolver for a non-specialized standard bearing. Exact application methods cannot cross brands.
    if(calculationMethodRegistry[method].scope==='application_oem'&&actual&&actual!==expected)issues.push(`${path}: expected ${expected}, got ${actual}`);
  };
  check('relube.quantity',parts.relube);check('relube.interval',parts.relubeInterval);check('renewal.quantity',parts.fullRenewal);
  if(parts.renewalInterval?.fallbackApplied){const allowed=plan.fallbacks.some(f=>f.operation==='renewal.interval'&&calculationMethodRegistry[f.method]?.sourceManufacturer===parts.renewalInterval.sourceManufacturer);if(!allowed)issues.push(`renewal.interval: unapproved fallback source ${parts.renewalInterval.sourceManufacturer||'unknown'}`);}
  return issues;
}
function buildCalculationPackage(context,plan,parts,policy,lifecycle,overallCode,assumptions,warningsList){
  const isolationIssues=validateMethodIsolation(plan,parts);
  return {schemaVersion:'1.0',architectureVersion:'1.0.31',context,methodPlan:plan,operations:{
    relube:{quantity:resultProvenance(parts.relube),interval:resultProvenance(parts.relubeInterval)},
    fullRenewal:{state:lifecycle,quantity:resultProvenance(parts.fullRenewal),interval:resultProvenance(parts.renewalInterval)}
  },maintenancePolicy:{...policy,fullRenewalLifecycleState:lifecycle},overallConfidence:overallCode,assumptions,warnings:warningsList,isolation:{ok:isolationIssues.length===0,issues:isolationIssues}};
}
function calculate(input={}){
  const context=buildCalculationContext(input),plan=resolveCalculationMethods(input,context),mi=manufacturerInfo(input),policy=maintenancePolicy(input),speed=speedAssessment(input),relubeInterval=adjustedInterval(input),relube=relubeQuantity({...input,autoIntervalHours:relubeInterval?.value}),fullRenewal=fullRenewalQuantity(input),renewalInterval=fullRenewalInterval(input,relubeInterval,relube);
  const baseWarnings=architectureWarnings(input,context,plan,warnings(input));
  const assumptions=[...(relube.assumptions||[]),...(relubeInterval.assumptions||[])];
  if(policy.fullRenewal)assumptions.push(...(fullRenewal.assumptions||[]),...(renewalInterval.assumptions||[]));
  const uniqueAssumptions=[...new Set(assumptions)];
  const codes=[relube.confidenceCode,relubeInterval.confidenceCode,...(policy.fullRenewal?[fullRenewal.confidenceCode,renewalInterval.confidenceCode]:[])].filter(Boolean);const overallCode=codes.sort((a,b)=>(codeRank[a]||0)-(codeRank[b]||0))[0]||'X';
  let fullRenewalLifecycleState='NOT_APPLICABLE';
  if(policy.fullRenewal){
    if(fullRenewal?.value!=null&&renewalInterval?.value!=null)fullRenewalLifecycleState='CALCULATED';
    else if(fullRenewal?.value!=null&&renewalInterval?.fallbackAvailable)fullRenewalLifecycleState='FALLBACK_AVAILABLE';
    else if((renewalInterval?.conditionBased||policy.fullRenewalState==='CONDITION_BASED')&&fullRenewal?.value!=null)fullRenewalLifecycleState='CONDITION_BASED';
    else if(fullRenewal?.value!=null)fullRenewalLifecycleState='PARTIAL_OEM';
    else if(renewalInterval?.conditionBased||policy.fullRenewalState==='CONDITION_BASED')fullRenewalLifecycleState='CONDITION_BASED';
    else fullRenewalLifecycleState='REVIEW_REQUIRED';
  }
  const maintenance={...policy,fullRenewalLifecycleState};
  const architecture=buildCalculationPackage(context,plan,{relube,relubeInterval,fullRenewal,renewalInterval},policy,fullRenewalLifecycleState,overallCode,uniqueAssumptions,baseWarnings);
  return {manufacturer:mi,maintenancePolicy:maintenance,relube,interval:relubeInterval,relubeInterval,fullRenewal,renewalInterval,fullRenewalLifecycleState,speed,overallConfidence:overallCode,assumptions:uniqueAssumptions,warnings:baseWarnings,calculationContext:context,methodPlan:plan,calculationPackage:architecture};
}
API.methods=methods;API.calculationMethodRegistry=calculationMethodRegistry;API.buildCalculationContext=buildCalculationContext;API.resolveCalculationMethods=resolveCalculationMethods;API.buildCalculationPackage=buildCalculationPackage;API.typeFactors=typeFactors;API.snlContext=snlContext;API.snlMode=snlMode;API.effectiveSnlMode=effectiveSnlMode;API.reitzSnl=reitzSnl;API.maintenancePolicy=maintenancePolicy;API.relubeQuantity=relubeQuantity;API.geometricBearingFill=geometricBearingFill;API.fullRenewalQuantity=fullRenewalQuantity;API.fullRenewalInterval=fullRenewalInterval;API.speedAssessment=speedAssessment;API.adjustedInterval=adjustedInterval;API.fillRecommendation=fillRecommendation;API.manufacturerInfo=manufacturerInfo;API.warnings=warnings;API.calculate=calculate;
global.LubricaSystem?.registerModule?.('Bearing Calculator','ok','Calculation Architecture Consolidation / v1.0.31');
})(window);
