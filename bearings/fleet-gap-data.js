(function(global){
'use strict';
const catalog=Array.isArray(global.LubricaBearingCatalogData)?global.LubricaBearingCatalogData:[];
const OEM=global.LubricaBearingOEM||{};
const seen=new Set(catalog.map(x=>String(x.designation||'').toUpperCase()));
const cleanKey=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
function add(rec){
  const key=String(rec.designation||'').toUpperCase();
  if(!key||seen.has(key))return;
  catalog.push(rec);seen.add(key);
}
function standard(designation,d,D,B,bearingType,extra={}){
  add({id:`FLEET-${cleanKey(designation)}`,designation,d,D,B,bearingType,source:'fleet_verified_reference',sourceConfidence:'verified_dimension',sourceNote:'Добавлено по фактическому парку предприятия. Размеры и типоразмер сверены с OEM/стандартным каталогом; перед заменой исполнения проверять суффиксы и производителя.',...extra});
}

// 1.0.33.54 — standard rolling-bearing gaps found in the production JSON.
standard('N216-E-M1-C3',80,140,26,'cylindrical_roller',{manufacturer:'FAG/Schaeffler',alias:'N 216 E.M1.C3',clearance:'C3',cage:'M1'});
standard('23234CCK/W33',170,310,110,'spherical_roller',{manufacturer:'SKF',alias:'23234 CCK/W33',boreType:'tapered',lubricationGroove:true});
standard('62305-2RS',25,62,24,'deep_groove_ball',{alias:'62305 2RS',sealing:'sealed',sealingCode:'2RS'});
standard('2211ETN9',55,100,25,'self_aligning_ball',{manufacturer:'SKF',alias:'2211 ETN9',cage:'TN9'});
standard('2213',65,120,31,'self_aligning_ball');
standard('29317E',85,150,39,'thrust_roller',{alias:'29317 E'});
standard('32016X/Q',80,125,29,'tapered_roller',{manufacturer:'SKF',alias:'32016 X/Q'});
standard('33016Q',80,125,36,'tapered_roller',{alias:'33016 Q'});
standard('51112',60,85,17,'thrust_ball');
standard('6015-2RS1',75,115,20,'deep_groove_ball',{manufacturer:'SKF',sealing:'sealed',sealingCode:'2RS1'});
standard('6016-2RS1',80,125,22,'deep_groove_ball',{manufacturer:'SKF',sealing:'sealed',sealingCode:'2RS1'});
standard('21313CC',65,140,33,'spherical_roller',{alias:'21313 CC'});
standard('2204E',20,47,18,'self_aligning_ball',{manufacturer:'SKF',alias:'2204 E'});
standard('32024X',120,180,38,'tapered_roller',{alias:'32024 X'});
standard('33108-2C',40,75,26,'tapered_roller',{alias:'33108 2C',aliases:['33108-2С'],sourceNote:'Фактическое обозначение 33108-2C сохранено без попытки расшифровать суффикс как универсальный стандарт. Геометрия базового 33108: 40×75×26 мм.'});
standard('51105',25,42,11,'thrust_ball');
standard('51106',30,47,11,'thrust_ball');
standard('6013',65,100,18,'deep_groove_ball');
standard('6013-2RS1',65,100,18,'deep_groove_ball',{manufacturer:'SKF',sealing:'sealed',sealingCode:'2RS1'});
standard('6018-2RS1',90,140,24,'deep_groove_ball',{manufacturer:'SKF',sealing:'sealed',sealingCode:'2RS1'});
standard('6024-2RS1',120,180,28,'deep_groove_ball',{manufacturer:'SKF',sealing:'sealed',sealingCode:'2RS1'});

const uc=OEM.nskUC200||{};
const uk=OEM.nskUK200||{};
const ukShaft={205:20,206:25,207:30,208:35,209:40,210:45,211:50,212:55,213:60,214:65,215:70,216:75,217:80,218:85};
function ucUnit(designation,code,extra={}){
  const r=uc[String(code)];if(!r)return;
  add({id:`FLEET-${cleanKey(designation)}`,designation,d:r.d,D:r.D,B:r.B,bearingType:'bearing_unit',insertDesignation:`UC${code}`,insertBearingType:'insert_ball_set_screw',insertMassKg:r.massKg??null,source:'housed_unit_family_reference',sourceConfidence:'oem_insert_geometry',sourceNote:'Фактический корпусной узел предприятия. d/D/B относятся к вставному подшипнику UC; геометрия вставки взята из локальной OEM-таблицы NSK. Производитель полного корпуса не предполагается без маркировки.',...extra});
}
function ukUnit(designation,code,extra={}){
  const r=uk[String(code)];if(!r)return;
  const shaft=ukShaft[Number(code)]??null;
  add({id:`FLEET-${cleanKey(designation)}`,designation,d:shaft,D:r.D,B:r.B1||r.B,bearingType:'bearing_unit',insertDesignation:`UK${code}`,insertBearingType:'insert_ball_adapter',insertMassKg:r.massKg??null,adapterSleeve:String(r.adapterSleeve||'').replace(/X$/,''),insertBoreMm:r.d,source:'housed_unit_family_reference',sourceConfidence:'oem_insert_geometry',sourceNote:'Фактический UK-корпусной узел предприятия. d — диаметр рабочего вала после установки на закрепительной втулке; D/B — габариты вставки UK. Производитель полного узла не предполагается без маркировки.',...extra});
}

// UC/UK family gaps.
ucUnit('CM-UCFC208','208',{alias:'CM-UCFC 208',housingStyle:'round_flange_covered',housingStyleLabel:'круглый фланцевый узел с крышкой',unitVariant:'covered'});
ucUnit('UCFC214','214',{alias:'UCFC 214',housingStyle:'round_flange',housingStyleLabel:'круглый фланцевый узел'});
// UC202 is outside the local NSK 204.. table; use standard UC202 insert geometry.
add({id:'FLEET-UCFL202',designation:'UCFL202',alias:'UCFL 202',d:15,D:40,B:27.4,bearingType:'bearing_unit',insertDesignation:'UC202',insertBearingType:'insert_ball_set_screw',housingStyle:'two_bolt_flange',housingStyleLabel:'овальный двухболтовый фланцевый узел',source:'fleet_verified_reference',sourceConfidence:'verified_dimension',sourceNote:'Фактический узел предприятия; геометрия вставки UC202 15×40×27,4 мм. Производитель полного узла не предполагается.'});
ucUnit('UCPA208','208',{alias:'UCPA 208',housingStyle:'tapped_base',housingStyleLabel:'узел с резьбовым основанием'});
ucUnit('UCPA209','209',{alias:'UCPA 209',housingStyle:'tapped_base',housingStyleLabel:'узел с резьбовым основанием'});
ukUnit('UKF207','207',{alias:'UKF 207',housingStyle:'four_bolt_flange',housingStyleLabel:'квадратный четырёхболтовый фланцевый узел'});
ukUnit('UKF209','209',{alias:'UKF 209',housingStyle:'four_bolt_flange',housingStyleLabel:'квадратный четырёхболтовый фланцевый узел'});
ukUnit('UKFL209','209',{alias:'UKFL 209',housingStyle:'two_bolt_flange',housingStyleLabel:'овальный двухболтовый фланцевый узел'});
ukUnit('UKFL210','210',{alias:'UKFL 210',housingStyle:'two_bolt_flange',housingStyleLabel:'овальный двухболтовый фланцевый узел'});
// UK205 is a real 20-mm shaft unit on H2305; local UK200 table starts at 206.
add({id:'FLEET-UKP205',designation:'UKP205',alias:'UKP 205',d:20,D:52,B:35,bearingType:'bearing_unit',insertDesignation:'UK205',insertBearingType:'insert_ball_adapter',adapterSleeve:'H2305',housingStyle:'pillow_block',housingStyleLabel:'стационарный корпусной узел',source:'fleet_verified_reference',sourceConfidence:'family_reference',sourceNote:'Фактический UKP205 предприятия. Диаметр рабочего вала 20 мм с H2305; точная геометрия/масса полного корпуса должна подтверждаться OEM при необходимости.'});
ukUnit('UKP206','206',{alias:'UKP 206',housingStyle:'pillow_block',housingStyleLabel:'стационарный корпусной узел'});
ukUnit('UKP209','209',{alias:'UKP 209',housingStyle:'pillow_block',housingStyleLabel:'стационарный корпусной узел'});
ukUnit('UKP211','211',{alias:'UKP 211',housingStyle:'pillow_block',housingStyleLabel:'стационарный корпусной узел'});

// SKF Y-bearing units. d/D/B are insert-bearing dimensions, not housing envelope.
const skfInsert={
  20:{code:'204',designation:'YAR204-2F'},25:{code:'205',designation:'YAR205-2F'},30:{code:'206',designation:'YAR206-2F'},35:{code:'207',designation:'YAR207-2F'},
  40:{code:'208',designation:'YAR208-2F'},45:{code:'209',designation:'YAR209-2F'},50:{code:'210',designation:'YAR210-2F'},55:{code:'211',designation:'YAR211-2F'},60:{code:'212',designation:'YAR212-2F'}
};
function skfYUnit(designation,bore,unitMassKg,housingStyle,housingStyleLabel,extra={}){
  const m=skfInsert[bore],r=m?uc[m.code]:null;if(!r)return;
  add({id:`FLEET-${cleanKey(designation)}`,designation,d:bore,D:r.D,B:r.B,bearingType:'bearing_unit',manufacturer:'SKF',insertDesignation:m.designation,insertBearingType:'insert_ball_set_screw',insertMassKg:null,unitMassKg:unitMassKg??null,housingStyle,housingStyleLabel,source:'skf_y_bearing_catalog',sourceConfidence:'oem_exact',sourceNote:'SKF Y-bearing unit. d/D/B относятся к вставному Y-подшипнику; масса unit — к полному корпусному узлу. Запись добавлена по фактическому парку.',...extra});
}
// Pillow-block Y units.
skfYUnit('SY20TF',20,null,'pillow_block','стационарный корпусной узел');
skfYUnit('SY25TF',25,null,'pillow_block','стационарный корпусной узел');
skfYUnit('SY30TF',30,1.10,'pillow_block','стационарный корпусной узел');
skfYUnit('SY40TF',40,1.80,'pillow_block','стационарный корпусной узел');
skfYUnit('SY45TF',45,2.20,'pillow_block','стационарный корпусной узел');
skfYUnit('SY50TF',50,2.70,'pillow_block','стационарный корпусной узел');
skfYUnit('SY60TF',60,4.45,'pillow_block','стационарный корпусной узел');
// Flangeless / pressed housing.
skfYUnit('SYF20TF',20,0.43,'flangeless_pillow','узел с коротким основанием');
skfYUnit('SYF30TF',30,0.90,'flangeless_pillow','узел с коротким основанием');
skfYUnit('SYF40TF',40,1.50,'flangeless_pillow','узел с коротким основанием');
// Square flanges.
skfYUnit('FY20TF',20,0.60,'four_bolt_flange','квадратный фланцевый узел');
skfYUnit('FY25TF',25,0.77,'four_bolt_flange','квадратный фланцевый узел');
skfYUnit('FY30TF',30,1.10,'four_bolt_flange','квадратный фланцевый узел');
skfYUnit('FY40TF',40,1.90,'four_bolt_flange','квадратный фланцевый узел');
skfYUnit('FY45TF',45,2.10,'four_bolt_flange','квадратный фланцевый узел');
// Oval flanges.
skfYUnit('FYTB30TF',30,0.93,'two_bolt_flange','овальный двухболтовый фланцевый узел');
skfYUnit('FYTB45TF',45,1.80,'two_bolt_flange','овальный двухболтовый фланцевый узел');
// Round flanges.
skfYUnit('FYC25TF',25,0.93,'round_flange','круглый фланцевый узел');
skfYUnit('FYC30TF',30,1.35,'round_flange','круглый фланцевый узел');
// Take-up and cartridge/plummer variants.
skfYUnit('TU30TF',30,1.25,'take_up','натяжной корпусной узел');
skfYUnit('P25TF',25,0.27,'cartridge','картриджный корпусной узел');
// Eccentric-locking SKF Y units.
add({id:'FLEET-SY30FM',designation:'SY30FM',alias:'SY 30 FM',d:30,D:62,B:35.7,bearingType:'bearing_unit',manufacturer:'SKF',insertDesignation:'YET206',insertBearingType:'insert_ball_eccentric',unitMassKg:1.10,housingStyle:'pillow_block',housingStyleLabel:'стационарный корпусной узел',source:'skf_y_bearing_catalog',sourceConfidence:'oem_exact',sourceNote:'SKF Y-bearing unit с эксцентриковым стопорным кольцом; d/D/B относятся к вставке YET206.'});
add({id:'FLEET-SYF45WF',designation:'SYF45WF',alias:'SYF 45 WF',d:45,D:85,B:56.3,bearingType:'bearing_unit',manufacturer:'SKF',insertDesignation:'YEL209-2F',insertBearingType:'insert_ball_eccentric',unitMassKg:2.35,housingStyle:'flangeless_pillow',housingStyleLabel:'узел с коротким основанием',source:'skf_y_bearing_catalog',sourceConfidence:'oem_exact',sourceNote:'SKF Y-bearing unit с эксцентриковым стопорным кольцом; d/D/B относятся к вставке YEL209-2F.'});
// SKF ConCentra roller bearing units. Do not treat as UC/Y ball-bearing units.
for(const loc of ['F','L'])add({id:`FLEET-SYT75${loc}`,designation:`SYT75${loc}`,alias:`SYT 75 ${loc}`,d:75,D:null,B:null,bearingType:'roller_bearing_unit',manufacturer:'SKF',unitMassKg:null,unitMassRangeKg:[11.3,11.5],housingStyle:'concentra_roller_pillow',housingStyleLabel:`ConCentra роликовый корпусной узел, ${loc==='F'?'фиксирующий':'плавающий'}`,unitGeometry:{A:90,B:65.5,H:182,J:260,L:320,N:28,N1:22},source:'skf_concentra_roller_unit_catalog',sourceConfidence:'oem_exact',sourceNote:'SKF ConCentra SYT 75. Внутренняя геометрия rolling bearing и универсальная доза не выводятся из размеров корпуса; количество/интервал требуют OEM или подтверждённой процедуры.'});

// Special bearing families present in the plant fleet.
standard('YAR206-2F',30,62,38.1,'insert_ball',{manufacturer:'SKF',alias:'YAR 206-2F',sealing:'sealed',source:'skf_y_bearing_catalog',sourceConfidence:'oem_exact',sourceNote:'SKF YAR 206-2F — вставной шарикоподшипник для корпусных узлов; не смешивать с обычным deep-groove bearing.'});
standard('GEH35ES-2RS',35,62,35,'spherical_plain',{manufacturer:'SKF',alias:'GEH 35ES-2RS',sealing:'sealed',sealingCode:'2RS',massKg:0.47,source:'skf_spherical_plain_catalog',sourceConfidence:'oem_exact',sourceNote:'SKF GEH 35 ES-2RS — сферический подшипник скольжения steel/steel. Универсальная формула досмазывания rolling bearing не применяется.'});
standard('KR40PP',18,40,20,'track_roller',{manufacturer:'FAG/Schaeffler',alias:'KR 40 PP',massKg:0.239,overallWidthMm:58,source:'schaeffler_track_roller_catalog',sourceConfidence:'oem_exact',sourceNote:'Stud-type track roller: d=18 — диаметр цапфы, D=40 — наружный диаметр ролика, B=20 — ширина дорожки. Универсальная формула обычного подшипника не применяется.'});
standard('KRE40PP',18,40,20,'track_roller',{manufacturer:'FAG/Schaeffler',alias:'KRE 40 PP',massKg:0.255,overallWidthMm:58,source:'schaeffler_track_roller_catalog',sourceConfidence:'oem_exact',sourceNote:'Stud-type track roller with eccentric collar. d/D/B в этой записи — цапфа/ролик/ширина дорожки; универсальная rolling-bearing формула не применяется.'});

global.LubricaBearingCatalogData=catalog;
global.LubricaSystem?.registerModule?.('Fleet Bearing Gap Data','ok',`${catalog.length} записей после расширения фактического парка`);
})(window);
