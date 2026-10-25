(function(global){
'use strict';
const base=Array.isArray(global.LubricaBearingCatalogData)?global.LubricaBearingCatalogData:[];
const clone=x=>JSON.parse(JSON.stringify(x));
const extra=[];
const existing=new Set(base.map(x=>String(x.designation||'').toUpperCase()));
function addClone(src,newDesignation,type,series){
  if(!src||existing.has(newDesignation))return;
  const rec={
    id:`BRG-MOEM-${newDesignation}`,
    designation:newDesignation,
    d:src.d,D:src.D,B:src.B,
    bearingType:type,series,
    source:'standard_envelope_starter',
    sourceConfidence:'engineering_reference',
    sourceNote:'Стартовая запись по стандартному размерному ряду. Размеры d/D/B используются как геометрическая подсказка; внутреннюю геометрию, массу, свободный объём, грузоподъёмность и скоростные пределы подтверждать по OEM конкретного производителя.'
  };
  extra.push(rec);existing.add(newDesignation);
}
// Add the previously discussed angular-contact and self-aligning ball families without inventing OEM-internal data.
for(const x of base){
  const d=String(x.designation||'');
  let m=d.match(/^60(\d{2})$/); if(m)addClone(x,`70${m[1]}`,'angular_contact_ball','70');
  m=d.match(/^62(\d{2})$/); if(m){addClone(x,`72${m[1]}`,'angular_contact_ball','72');addClone(x,`12${m[1]}`,'self_aligning_ball','12');}
  m=d.match(/^63(\d{2})$/); if(m){addClone(x,`73${m[1]}`,'angular_contact_ball','73');addClone(x,`13${m[1]}`,'self_aligning_ball','13');}
}
base.push(...extra);

const manufacturers=Object.freeze({
  auto:{id:'auto',label:'Авто / производитель не указан'},
  SKF:{id:'SKF',label:'SKF'},
  NSK:{id:'NSK',label:'NSK'},
  FAG:{id:'FAG',label:'FAG / Schaeffler'},
  'NTN-SNR':{id:'NTN-SNR',label:'NTN-SNR'},
  TIMKEN:{id:'TIMKEN',label:'Timken'}
});

// OEM-exact service table published by NSK for N/NJ/NU 200 cylindrical roller bearings.
// Values: relubrication amount (g) and operating-hour intervals at 900/1800/3600 rpm, 70 C baseline.
const nskCyl200=Object.freeze({
  '204':{g:3.290,h900:20000,h1800:12694,h3600:5924,lowerBound900:true},
  '205':{g:3.900,h900:20000,h1800:10660,h3600:4867,lowerBound900:true},
  '206':{g:4.960,h900:19384,h1800:9195,h3600:4101},
  '207':{g:6.120,h900:17239,h1800:8091,h3600:3517},
  '208':{g:7.200,h900:15546,h1800:7215,h3600:3050},
  '209':{g:8.075,h900:14182,h1800:6506,h3600:2668},
  '210':{g:9.000,h900:13033,h1800:5907,h3600:2344},
  '211':{g:10.500,h900:12066,h1800:5400,h3600:2066},
  '212':{g:12.100,h900:11233,h1800:4961,h3600:1824}
});


const nsk6200=Object.freeze({
  '6200':{g:1.350,h900:20000,h1800:20000,h3600:20000,lowerBound:true},
  '6201':{g:1.600,h900:20000,h1800:20000,h3600:17980,lowerBound:true},
  '6202':{g:1.925,h900:20000,h1800:20000,h3600:15046,lowerBound:true},
  '6203':{g:2.400,h900:20000,h1800:20000,h3600:12540,lowerBound:true},
  '6204':{g:3.290,h900:20000,h1800:20000,h3600:11846,lowerBound:true},
  '6205':{g:3.900,h900:20000,h1800:20000,h3600:9724,lowerBound:true},
  '6206':{g:4.960,h900:20000,h1800:18390,h3600:8201,lowerBound:true},
  '6211':{g:10.500,h900:20000,h1800:10805,h3600:4135,lowerBound:true},
  '6212':{g:12.100,h900:20000,h1800:9921,h3600:3649,lowerBound:true},
  '6213':{g:13.800,h900:20000,h1800:9151,h3600:3222,lowerBound:true},
  '6214':{g:15.000,h900:19730,h1800:8470,h3600:2840},
  '6215':{g:16.250,h900:18592,h1800:7862,h3600:2497},
  '6216':{g:18.200,h900:17568,h1800:7313,h3600:2185},
  '6217':{g:21.000,h900:16645,h1800:6815,h3600:1900},
  '6218':{g:24.000,h900:15804,h1800:6360,h3600:1637},
  '6219':{g:27.200,h900:15035,h1800:5941,h3600:1394},
  '6220':{g:30.600,h900:14328,h1800:5555,h3600:1169}
});

// Verified NSK housed-bearing insert and unit data from NSK Online Catalog.
// Geometry/mass are OEM catalog data only; fixed relubrication grams are not inferred for housed units.
const nskUC200=Object.freeze({
  '204':{d:20,D:47,B:31,massKg:0.17,Cr:12.8,C0r:6.65},'205':{d:25,D:52,B:34.1,massKg:0.20,Cr:14.0,C0r:7.85},
  '206':{d:30,D:62,B:38.1,massKg:0.32,Cr:19.5,C0r:11.3},'207':{d:35,D:72,B:42.9,massKg:0.46,Cr:25.7,C0r:15.3},
  '208':{d:40,D:80,B:49.2,massKg:0.64,Cr:29.1,C0r:17.8},'209':{d:45,D:85,B:49.2,massKg:0.68,Cr:32.5,C0r:20.4},
  '210':{d:50,D:90,B:51.6,massKg:0.78,Cr:35.0,C0r:23.2},'211':{d:55,D:100,B:55.6,massKg:1.04,Cr:43.5,C0r:29.2},
  '212':{d:60,D:110,B:65.1,massKg:1.46,Cr:52.5,C0r:36.0},'213':{d:65,D:120,B:65.1,massKg:1.86,Cr:57.5,C0r:40},
  '214':{d:70,D:125,B:74.6,massKg:2.10,Cr:62,C0r:44},'215':{d:75,D:130,B:77.8,massKg:2.34,Cr:66,C0r:49.5},
  '216':{d:80,D:140,B:82.6,massKg:2.78,Cr:72.5,C0r:53},'217':{d:85,D:150,B:85.7,massKg:3.54,Cr:83.5,C0r:64},
  '218':{d:90,D:160,B:96,massKg:4.40,Cr:96,C0r:71.5}
});
const nskUC300=Object.freeze({
  '305':{d:25,D:62,B:38,massKg:0.35,Cr:21.2,C0r:10.9},'306':{d:30,D:72,B:43,massKg:0.56,Cr:26.7,C0r:15},
  '307':{d:35,D:80,B:48,massKg:0.70,Cr:33.5,C0r:19.1},'308':{d:40,D:90,B:52,massKg:0.96,Cr:40.5,C0r:24},
  '309':{d:45,D:100,B:57,massKg:1.28,Cr:53,C0r:32},'310':{d:50,D:110,B:61,massKg:1.68,Cr:62,C0r:38.5},
  '311':{d:55,D:120,B:66,massKg:2.08,Cr:71.5,C0r:45},'312':{d:60,D:130,B:71,massKg:2.60,Cr:82,C0r:52},
  '313':{d:65,D:140,B:75,massKg:3.25,Cr:92.5,C0r:60},'314':{d:70,D:150,B:78,massKg:3.86,Cr:104,C0r:68},
  '315':{d:75,D:160,B:82,massKg:4.70,Cr:113,C0r:77},'316':{d:80,D:170,B:86,massKg:5.60,Cr:123,C0r:86.5},
  '317':{d:85,D:180,B:96,massKg:6.70,Cr:133,C0r:97},'318':{d:90,D:190,B:96,massKg:7.60,Cr:143,C0r:107},
  '319':{d:95,D:200,B:103,massKg:8.70,Cr:153,C0r:119},'320':{d:100,D:215,B:108,massKg:10.8,Cr:173,C0r:141}
});
const nskUK200=Object.freeze({
  '206':{d:30,D:62,B:26,B1:38,C:19,massKg:0.36,Cr:19.5,C0r:11.3,adapterSleeve:'H2306X'},
  '207':{d:35,D:72,B:29,B1:43,C:20,massKg:0.55,Cr:25.7,C0r:15.3,adapterSleeve:'H2307X'},
  '208':{d:40,D:80,B:31,B1:46,C:21,massKg:0.74,Cr:29.1,C0r:17.8,adapterSleeve:'H2308X'},
  '209':{d:45,D:85,B:31,B1:50,C:22,massKg:0.80,Cr:32.5,C0r:20.4,adapterSleeve:'H2309X'},
  '210':{d:50,D:90,B:32,B1:55,C:24,massKg:0.94,Cr:35,C0r:23.2,adapterSleeve:'H2310X'},
  '211':{d:55,D:100,B:35,B1:59,C:25,massKg:1.22,Cr:43.5,C0r:29.2,adapterSleeve:'H2311X'},
  '212':{d:60,D:110,B:38,B1:62,C:27,massKg:1.54,Cr:52.5,C0r:36,adapterSleeve:'H2312X'},
  '213':{d:65,D:120,B:40,B1:65,C:32,massKg:2.00,Cr:57.5,C0r:40,adapterSleeve:'H2313X'},
  '215':{d:75,D:130,B:44,B1:73,C:34,massKg:2.56,Cr:66,C0r:49.5,adapterSleeve:'H2315X'},
  '216':{d:80,D:140,B:45,B1:78,C:35,massKg:3.23,Cr:72.5,C0r:53,adapterSleeve:'H2316X'},
  '217':{d:85,D:150,B:46,B1:82,C:36,massKg:3.93,Cr:83.5,C0r:64,adapterSleeve:'H2317X'},
  '218':{d:90,D:160,B:47,B1:86,C:37,massKg:4.51,Cr:96,C0r:71.5,adapterSleeve:'H2318X'}
});
const nskUK300=Object.freeze({
  '305':{d:25,D:62,B:26,B1:35,C:20,massKg:0.36,Cr:21.2,C0r:10.9,adapterSleeve:'H2305X'},
  '320':{d:100,D:215,B:73,B1:97,C:55,massKg:11.0,Cr:173,C0r:141,adapterSleeve:'H2320X'}
});
const nskUCP200=Object.freeze({
  '204':{unitMassKg:0.7},'205':{unitMassKg:0.8},'206':{unitMassKg:1.3},'207':{unitMassKg:1.6},'208':{unitMassKg:1.9},
  '209':{unitMassKg:2.2},'210':{unitMassKg:2.6},'211':{unitMassKg:3.3},'212':{unitMassKg:4.6},'213':{unitMassKg:5.9},
  '214':{unitMassKg:6.6},'215':{unitMassKg:7.4},'216':{unitMassKg:9.0},'217':{unitMassKg:11.0},'218':{unitMassKg:13.0}
});
const nskUCP300=Object.freeze({'320':{unitMassKg:35.0}});
// Exact NSK square-flange UK family rows digitized locally. Unit mass is kept separate from insert mass.
const nskUKF200=Object.freeze({
  '211':{unitMassKg:3.6,L:162,J:130,N:19,A:43,A1:18,A2:25,A0:54.5,mountingBolt:'M16',housing:'F211D1',adapterSleeve:'H2311X'}
});
// NTN Bearing Units Cat. 2400/E exact relubrication quantities, grams.
// UK and UEL quantities are explicitly stated by NTN to be the same as UC type.
// NTN-SNR ZLG multiple-bearing housings — current housing-level assembly instruction.
// Relubrication quantities are published as cm3 per bearing location. LUBRICA stores the
// OEM volume and only converts to grams with an explicit grease density (0.9 g/cm3 default
// reference when the user explicitly selects this housing-level method).

// SKF SNL plummer block housing lubrication data.
// Current SKF housing catalogue publishes initial grease fill for 20% / 40% housing free space.
// Historical SNL Table 7 also publishes guideline relubrication quantities for the standard side-feed arrangement.
// LUBRICA keeps both references separate: actual replenishment uses the selected SKF feed method and the
// dimensions of the installed bearing; housing-table values are retained as OEM housing references.
const skfSnlHousingTable=Object.freeze({
 '205':{fill20G:15,fill40G:25,guideRelubeG:5},'505':{fill20G:15,fill40G:25,guideRelubeG:5},
 '206-305':{fill20G:25,fill40G:40,guideRelubeG:5},'506-605':{fill20G:25,fill40G:40,guideRelubeG:5},
 '207':{fill20G:30,fill40G:50,guideRelubeG:10},'507-606':{fill20G:30,fill40G:50,guideRelubeG:10},
 '208-307':{fill20G:35,fill40G:55,guideRelubeG:10},'508-607':{fill20G:35,fill40G:55,guideRelubeG:10},
 '209':{fill20G:40,fill40G:60,guideRelubeG:10},'509':{fill20G:40,fill40G:60,guideRelubeG:10},
 '210':{fill20G:45,fill40G:70,guideRelubeG:10},'510-608':{fill20G:45,fill40G:70,guideRelubeG:10},
 '211':{fill20G:55,fill40G:90,guideRelubeG:15},'511-609':{fill20G:55,fill40G:90,guideRelubeG:15},
 '212':{fill20G:80,fill40G:135,guideRelubeG:15},'512-610':{fill20G:80,fill40G:135,guideRelubeG:15},
 '213':{fill20G:100,fill40G:160,guideRelubeG:20},'513-611':{fill20G:100,fill40G:160,guideRelubeG:20},
 '215':{fill20G:125,fill40G:210,guideRelubeG:20},'515-612':{fill20G:125,fill40G:210,guideRelubeG:20},
 '216':{fill20G:170,fill40G:280,guideRelubeG:25},'516-613':{fill20G:170,fill40G:280,guideRelubeG:25},
 '217':{fill20G:200,fill40G:330,guideRelubeG:25},'517':{fill20G:200,fill40G:330,guideRelubeG:25},
 '218':{fill20G:260,fill40G:430,guideRelubeG:40},'518-615':{fill20G:260,fill40G:430,guideRelubeG:40},
 '519-616':{fill20G:300,fill40G:480,guideRelubeG:50},'520-617':{fill20G:390,fill40G:630,guideRelubeG:55},
 '522-619':{fill20G:530,fill40G:850,guideRelubeG:70},'524-620':{fill20G:630,fill40G:1000,guideRelubeG:80},
 '526':{fill20G:700,fill40G:1100,guideRelubeG:95},'528':{fill20G:900,fill40G:1400,guideRelubeG:110},
 '530':{fill20G:1100,fill40G:1700,guideRelubeG:130},'532':{fill20G:1300,fill40G:2000,guideRelubeG:150}
});
function snlHousingCode(raw){
  const text=String(raw||'').toUpperCase().replace(/\s+/g,' ').trim();
  const m=text.match(/(?:F?SNL|F?SE)\s*[-_]?\s*(\d{3}(?:\s*-\s*\d{3})?)/i);
  if(!m)return null;
  return m[1].replace(/\s+/g,'');
}
function snlHousingProfile(raw){
  const code=snlHousingCode(raw),row=code?skfSnlHousingTable[code]:null;
  return row?{family:'SNL',code,designation:`SNL ${code}`,...row,source:sourceRefs.SKF_SNL}:null;
}

// REITZ KXE application-specific table for grease-lubricated single bearing housings (SNB/SNV).
// Source: REITZ KXE operating manual, single bearing relubrication table.
// Intervals are operating hours at 75 C for nominal impeller speed columns 3000/1500/1000 rpm.
// relubeG is maintenance relubrication quantity per rolling bearing; refillG is initial/new refill quantity.
const reitzKxeSingleBearingTable=Object.freeze({
 '2307K':{housing:'607/080',intervals:{3000:4000,1500:4000,1000:4000},refillG:65,relubeG:25},
 '2308K':{housing:'608/090',intervals:{3000:3600,1500:4000,1000:4000},refillG:85,relubeG:30},
 '2309K':{housing:'609/100',intervals:{3000:3200,1500:4000,1000:4000},refillG:115,relubeG:35},
 '2310K':{housing:'610/110',intervals:{3000:2950,1500:4000,1000:4000},refillG:150,relubeG:45},
 '2311K':{housing:'611/120',intervals:{3000:2700,1500:4000,1000:4000},refillG:185,relubeG:55},
 '2312K':{housing:'612/130',intervals:{3000:2500,1500:4000,1000:4000},refillG:220,relubeG:60},
 '2313K':{housing:'613/140',intervals:{3000:2250,1500:4000,1000:4000},refillG:270,relubeG:70},
 '2315K':{housing:'615/160',intervals:{3000:2000,1500:3800,1000:4000},refillG:370,relubeG:85},
 '2316K':{housing:'616/170',intervals:{3000:1900,1500:3600,1000:4000},refillG:460,relubeG:100},
 '2317K':{housing:'617/180',intervals:{3000:1800,1500:3400,1000:4000},refillG:550,relubeG:110},
 '2318K':{housing:'618/190',intervals:{3000:1700,1500:3300,1000:4000},refillG:650,relubeG:120},
 '2319K':{housing:'619/200',intervals:{3000:1600,1500:3100,1000:4000},refillG:750,relubeG:135},
 '22215K':{housing:'515/130',intervals:{3000:null,1500:800,1000:1350},refillG:350,relubeG:45},
 '22216K':{housing:'516/140',intervals:{3000:null,1500:750,1000:1250},refillG:460,relubeG:50},
 '22217K':{housing:'517/150',intervals:{3000:null,1500:700,1000:1200},refillG:550,relubeG:55},
 '22218K':{housing:'518/160',intervals:{3000:null,1500:650,1000:1100},refillG:650,relubeG:65},
 '22219K':{housing:'519/170',intervals:{3000:null,1500:580,1000:1000},refillG:750,relubeG:75},
 '22220K':{housing:'520/180',intervals:{3000:null,1500:540,1000:950},refillG:850,relubeG:85},
 '22222K':{housing:'522/200',intervals:{3000:null,1500:460,1000:850},refillG:1100,relubeG:100},
 '22224K':{housing:'524/215',intervals:{3000:null,1500:410,1000:750},refillG:1150,relubeG:125},
 '2315':{housing:'315/160',intervals:{3000:2000,1500:3800,1000:4000},refillG:650,relubeG:85},
 '2316':{housing:'316/170',intervals:{3000:1900,1500:3600,1000:4000},refillG:750,relubeG:100},
 '2317':{housing:'317/180',intervals:{3000:1800,1500:3400,1000:4000},refillG:850,relubeG:110},
 '2318':{housing:'318/190',intervals:{3000:1700,1500:3300,1000:4000},refillG:975,relubeG:120},
 '2319':{housing:'319/200',intervals:{3000:1600,1500:3100,1000:4000},refillG:1100,relubeG:135},
 '22218':{housing:'218/160',intervals:{3000:null,1500:650,1000:1100},refillG:650,relubeG:65},
 '22220':{housing:'220/180',intervals:{3000:null,1500:540,1000:1100},refillG:850,relubeG:85},
 '22222':{housing:'222/200',intervals:{3000:null,1500:460,1000:850},refillG:1100,relubeG:100},
 '22224':{housing:'224/215',intervals:{3000:null,1500:410,1000:750},refillG:1450,relubeG:125},
 '22226':{housing:'226/230',intervals:{3000:null,1500:380,1000:680},refillG:1850,relubeG:160},
 '22228':{housing:'228/250',intervals:{3000:null,1500:null,1000:600},refillG:2300,relubeG:170}
});
function reitzSingleBearingDesignation(raw){
  return String(raw||'').toUpperCase().replace(/\s+/g,'').replace(/C3|C4|\/C3|\/C4/g,'').replace(/[^A-Z0-9]/g,'');
}
function reitzSingleSpeedColumn(rpm){rpm=Number(rpm);if(!(rpm>0)||rpm>3000)return null;if(rpm>1500)return 3000;if(rpm>1000)return 1500;return 1000;}
function reitzSingleBearingProfile(designation,rpm,temp){
  const key=reitzSingleBearingDesignation(designation),row=reitzKxeSingleBearingTable[key];
  if(!row)return {blocked:true,reason:`Подшипник ${designation||'?'} отсутствует в локальной таблице REITZ KXE для одиночных опор.`,source:sourceRefs.REITZ_KXE_SINGLE};
  const col=reitzSingleSpeedColumn(rpm);if(!col)return {...row,key,blocked:true,reason:'Рабочие обороты отсутствуют или выше 3000 об/мин — вне таблицы REITZ KXE одиночных опор.',source:sourceRefs.REITZ_KXE_SINGLE};
  const base=row.intervals[col];if(!(base>0))return {...row,key,speedColumn:col,blocked:true,reason:`REITZ не публикует интервал для ${key} в колонке ${col} об/мин.`,source:sourceRefs.REITZ_KXE_SINGLE};
  const tf=reitzTemperatureFactor(temp);if(tf.blocked)return {...row,key,speedColumn:col,baseIntervalHours:base,blocked:true,reason:'Температура корпуса выше 100 °C — таблица коррекции REITZ не применяется.',source:sourceRefs.REITZ_KXE_SINGLE};
  return {...row,key,speedColumn:col,baseIntervalHours:base,temperatureFactor:tf.factor,temperatureBand:tf.temperatureBand,temperatureConservative:tf.conservative,intervalHours:Math.round(base*tf.factor),source:sourceRefs.REITZ_KXE_SINGLE};
}

const ntnZlgHousingRelubeCm3=Object.freeze({
  '306':20,'307':26,'308':36,'309':50,'310':67,'311':86,'312':108,'313':132,'314':160,'315':192,'316':227,'317':271,'318':316,'319':308,'320':368,'322':466,'324':657
});

// REITZ KXE application-specific table for ZLG multiple-bearing blocks.
// Table 11 distinguishes AA/AK (deep-groove ball + deep-groove ball) and AC
// (cylindrical roller NJ + deep-groove ball). Quantities are maintenance
// relubrication grams PER BEARING / physical grease point; intervals are operating hours.
// Speed bands: (3000,3600], (1800,3000], (1500,1800], (1000,1500], <=1000 rpm.
const reitzZlgAAAK=Object.freeze({
 '306':{floating:'6306 C3',locating:'6306 C3',intervals:[5080,6760,10150,13500,14800],initialOrRefillG:3,relubeG:9},
 '307':{floating:'6307 C3',locating:'6307 C3',intervals:[4500,6000,9000,12000,14800],initialOrRefillG:4,relubeG:12},
 '308':{floating:'6308 C3',locating:'6308 C3',intervals:[3980,5300,7950,10600,14800],initialOrRefillG:6,relubeG:18},
 '309':{floating:'6309 C3',locating:'6309 C3',intervals:[3570,4760,7150,9500,14300],initialOrRefillG:8,relubeG:24},
 '310':{floating:'6310 C3',locating:'6310 C3',intervals:[3230,4300,6450,8600,12900],initialOrRefillG:10,relubeG:30},
 '311':{floating:'6311 C3',locating:'6311 C3',intervals:[2960,3940,5900,7900,11800],initialOrRefillG:12,relubeG:36},
 '312':{floating:'6312 C3',locating:'6312 C3',intervals:[2720,3630,5450,7300,10900],initialOrRefillG:16,relubeG:48},
 '313':{floating:'6313 C3',locating:'6313 C3',intervals:[2520,3360,5050,6700,10100],initialOrRefillG:19,relubeG:57},
 '314':{floating:'6314 C3',locating:'6314 C3',intervals:[2350,3130,4700,6300,9400],initialOrRefillG:23,relubeG:69},
 '315':{floating:'6315 C3',locating:'6315 C3',intervals:[2200,2940,4400,5900,8800],initialOrRefillG:28,relubeG:84},
 '316':{floating:'6316 C3',locating:'6316 C3',intervals:[2070,2760,4150,5500,8300],initialOrRefillG:32,relubeG:96},
 '317':{floating:'6317 C3',locating:'6317 C3',intervals:[null,2600,3900,5200,7800],initialOrRefillG:38,relubeG:114},
 '318':{floating:'6318 C3',locating:'6318 C3',intervals:[null,2460,3700,4900,7400],initialOrRefillG:44,relubeG:132},
 '319':{floating:'6319 C3',locating:'6319 C3',intervals:[null,2340,3500,4700,7000],initialOrRefillG:48,relubeG:144},
 '320':{floating:'6320 C3',locating:'6320 C3',intervals:[null,2190,3300,4400,6600],initialOrRefillG:57,relubeG:171},
 '322':{floating:'6322 C3',locating:'6322 C3',intervals:[null,1950,3100,3650,null],initialOrRefillG:72,relubeG:216},
 '324':{floating:'6324 C3',locating:'6324 C3',intervals:[null,1800,2880,3400,null],initialOrRefillG:100,relubeG:300}
});
const reitzZlgAC=Object.freeze({
 '315':{floating:'NJ 315 C3',locating:'6315 C3',intervals:[null,1700,2600,3500,5100],initialOrRefillG:5,relubeG:15},
 '316':{floating:'NJ 316 C3',locating:'6316 C3',intervals:[null,1600,2500,3400,5000],initialOrRefillG:6,relubeG:18},
 '317':{floating:'NJ 317 C3',locating:'6317 C3',intervals:[null,1500,2350,3200,4800],initialOrRefillG:8,relubeG:24},
 '318':{floating:'NJ 318 C3',locating:'6318 C3',intervals:[null,1300,2100,2900,4500],initialOrRefillG:9,relubeG:27},
 '319':{floating:'NJ 319 C3',locating:'6319 C3',intervals:[null,1220,1860,2200,null],initialOrRefillG:9,relubeG:27},
 '320':{floating:'NJ 320 C3',locating:'6320 C3',intervals:[null,1100,1750,2100,null],initialOrRefillG:10,relubeG:30},
 '322':{floating:'NJ 322 C3',locating:'6322 C3',intervals:[null,1000,1600,1900,null],initialOrRefillG:10,relubeG:30},
 '324':{floating:'NJ 324 C3',locating:'6324 C3',intervals:[null,930,1470,1750,null],initialOrRefillG:19,relubeG:57}
});
const reitzTemperatureFactors=Object.freeze({75:1.00,80:0.85,85:0.70,90:0.55,95:0.45,100:0.35});
function zlgVariant(raw){const m=String(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,'').match(/ZLG\d{3}(AA|AK|AC|AB)/);return m?m[1]:null;}
function reitzSpeedBand(rpm){rpm=Number(rpm);if(!(rpm>0)||rpm>3600)return -1;if(rpm>3000)return 0;if(rpm>1800)return 1;if(rpm>1500)return 2;if(rpm>1000)return 3;return 4;}
function reitzTemperatureFactor(temp){temp=Number(temp);if(!Number.isFinite(temp)||temp<=75)return {factor:1,temperatureBand:75,conservative:false};for(const t of [80,85,90,95,100])if(temp<=t)return {factor:reitzTemperatureFactors[t],temperatureBand:t,conservative:temp!==t};return {factor:null,temperatureBand:null,blocked:true};}
function reitzZlgProfile(raw,variantOverride,rpm,temp){const code=zlgHousingCode(raw);const ov=String(variantOverride||'').toUpperCase();let variant=String((ov&&ov!=='AUTO'?ov:null)||zlgVariant(raw)||'').toUpperCase();if(variant==='AA'||variant==='AK')variant='AA_AK';else if(variant==='AC')variant='AC';else return {family:'ZLG',code,variant:null,blocked:true,reason:'Для REITZ требуется точное исполнение ZLG AA/AK или AC.'};const row=(variant==='AC'?reitzZlgAC:reitzZlgAAAK)[code];if(!row)return {family:'ZLG',code,variant,blocked:true,reason:`Исполнение ${variant} для ZLG${code||'?'} отсутствует в локальной таблице REITZ KXE.`};const band=reitzSpeedBand(rpm);if(band<0)return {...row,family:'ZLG',code,variant,blocked:true,reason:'Обороты отсутствуют или выше 3600 об/мин — вне локальной таблицы REITZ KXE.',source:sourceRefs.REITZ_KXE};const base=row.intervals[band];if(!(base>0))return {...row,family:'ZLG',code,variant,speedBand:band,blocked:true,reason:'Для этого размера/исполнения REITZ не публикует интервал в выбранном диапазоне оборотов.',source:sourceRefs.REITZ_KXE};const tf=reitzTemperatureFactor(temp);if(tf.blocked)return {...row,family:'ZLG',code,variant,speedBand:band,baseIntervalHours:base,blocked:true,reason:'Температура подшипникового корпуса выше 100 °C — таблица коррекции REITZ не применяется.',source:sourceRefs.REITZ_KXE};return {...row,family:'ZLG',code,variant,speedBand:band,baseIntervalHours:base,temperatureFactor:tf.factor,temperatureBand:tf.temperatureBand,temperatureConservative:tf.conservative,intervalHours:Math.round(base*tf.factor),source:sourceRefs.REITZ_KXE};}

function zlgHousingCode(raw){const m=String(raw||'').toUpperCase().replace(/\s+/g,'').match(/ZLG[-_\/]?(\d{3})/);return m?m[1]:null;}
function zlgHousingProfile(raw){const code=zlgHousingCode(raw);const cm3=code?ntnZlgHousingRelubeCm3[code]:null;return cm3!=null?{family:'ZLG',code,designation:`ZLG${code}`,relubeVolumeCm3:cm3,referenceDensity:0.9,baselineIntervalHours:3000,calendarMinimumPerYear:2,source:sourceRefs.NTN_ZLG_2024}:null;}

const ntnUnitRelubeG=Object.freeze({
  '201':1.1,'202':1.1,'203':1.1,'204':1.1,'205':1.3,'206':1.9,'207':2.7,'208':3.5,'209':4.1,'210':4.6,'211':6.0,'212':8.5,'213':10.5,'214':12,'215':13,'216':15.5,'217':16.5,'218':21,
  '305':2.0,'306':3.0,'307':4.3,'308':5.5,'309':7.5,'310':10.5,'311':13,'312':16.5,'313':20,'314':23.5,'315':27.5,'316':33,'317':38,'318':45,'319':50,'320':60,'321':70,'322':85,'324':100,'326':125,'328':150
});
function housedUnitCode(designation){
  const raw=String(designation||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  // Detect SKF Y-bearing family designations before baseDesignation strips generic cage suffix M.
  const yRaw=raw.match(/^(?:SYF|SY|FYTB|FYC|FY|TU|P)(\d{2,3})(?:TF|TR|FM|WF)$/);
  if(yRaw){const bore=Number(yRaw[1]);const map={20:'204',25:'205',30:'206',35:'207',40:'208',45:'209',50:'210',55:'211',60:'212',65:'213',70:'214',75:'215',80:'216',85:'217',90:'218'};return map[bore]||null;}
  if(/^SYT\d{2,3}[FL]$/.test(raw))return null;
  const d=baseDesignation(designation);
  const m=String(d||'').match(/(?:UC|UK|UEL|UCP|UCF|UCFS|UCFC|UCFL|UCT|UCPA|UKP|UKF|UKHA|UKFS|UKFC|UKFL|UKT)(\d{3})/);
  if(m)return m[1];
  // SKF FY/FYTB use bore diameter in the unit designation rather than the UC/UK insert code.
  // Map the metric bore to the equivalent 200-series insert size so LUBRICA Universal can
  // reuse the same housed-unit anti-overgreasing reference without claiming it as SKF OEM data.
  return null;
}
function ntnBearingUnitRelubeProfile(designation){const code=housedUnitCode(designation);const g=code?ntnUnitRelubeG[code]:null;return g!=null?{code,relubeG:g,source:sourceRefs.NTN_UNITS}:null;}
function housedUnitReferenceProfile(designation){const p=ntnBearingUnitRelubeProfile(designation);return p?{...p,referenceManufacturer:'NTN/NTN-SNR',referenceKind:'construction_specific_housed_unit',baseDensity:0.9}:null;}

// Core NSK catalog families. The family can be recognized even where an exact local mass row is not yet digitized.
const nskHousingFamilies=Object.freeze({
  UC:{insert:'UC',kind:'insert_set_screw'},UK:{insert:'UK',kind:'insert_adapter'},
  UCP:{insert:'UC',kind:'pillow_block'},UCF:{insert:'UC',kind:'four_bolt_flange'},UCFS:{insert:'UC',kind:'four_bolt_flange'},UCFC:{insert:'UC',kind:'round_flange'},UCFL:{insert:'UC',kind:'two_bolt_flange'},UCT:{insert:'UC',kind:'take_up'},UCL:{insert:'UC',kind:'cartridge'},UCM:{insert:'UC',kind:'cartridge'},UCHB:{insert:'UC',kind:'hanger'},UCPA:{insert:'UC',kind:'tapped_base'},UCUP:{insert:'UC',kind:'pillow_special'},UCFH:{insert:'UC',kind:'flange_special'},UCTX:{insert:'UC',kind:'take_up_heavy'},
  UKP:{insert:'UK',kind:'pillow_block'},UKF:{insert:'UK',kind:'four_bolt_flange'},UKHA:{insert:'UK',kind:'hanger'},UKFS:{insert:'UK',kind:'four_bolt_flange'},UKFC:{insert:'UK',kind:'round_flange'},UKFL:{insert:'UK',kind:'two_bolt_flange'},UKT:{insert:'UK',kind:'take_up'}
});

const sourceRefs=Object.freeze({
  NSK:{sourceId:'NSK-EMH',title:'NSK Electric Motor Handbook / Grease Relubrication Guidelines',url:'https://www.nsk.com/content/dam/nsk/am/en_us/documents/bearings-americas/Electric-Motor-Handbook.pdf',note:'Таблица N/NJ/NU 200; интервалы при 70 °C. Выше 70 °C интервал уменьшается вдвое на каждые +15 °C.'},
  NSK_GENERAL:{sourceId:'NSK-GREASE',title:'NSK Grease Lubrication',url:'https://www.nsk.com/tools-resources/abc-bearings/grease-lubrication/',note:'Рекомендуемое заполнение свободного пространства зависит от отношения рабочей скорости к предельной; температурная и нагрузочная коррекция интервала.'},
  NSK_UNITS:{sourceId:'NSK-BEARING-UNITS',title:'NSK Ball Bearing Units / NSK Online Catalog',url:'https://www.nsk.com/catalogs-and-cad/',note:'Корпусные узлы NSK: вставки UC/UK и основные семейства корпусов. Фиксированная универсальная доза пополнения в граммах не предполагается; геометрия/масса используются только для точных локально подтверждённых OEM-записей.'},
  SCHAEFFLER_SLEWING:{sourceId:'INA-SLEWING-TPI13',title:'INA/Schaeffler TPI 13 — Slewing rings, fitting and maintenance',url:'https://www.schaeffler.com/remotemedien/media/_shared_media/08_media_library/01_publications/schaeffler_2/tpi/downloads_8/TPI_13_de_en.pdf',note:'Для slewing rings: процедура досмазывания до выхода свежей смазки; ориентир интервала около 500 ч в чистой сухой зоне, 100–200 ч при повышенном загрязнении, непрерывная смазка при экстремальном загрязнении. Guide values применимы при T < 70 °C и окружной скорости < 0,5 м/с.'},
  FAG:{sourceId:'FAG-TPI228',title:'Schaeffler/FAG TPI 228 — Lubrication of Rolling Bearings',url:'https://www.schaeffler.com/remotemedien/media/_shared_media/08_media_library/01_publications/schaeffler_2/tpi/downloads_8/tpi_228_de_en.pdf',note:'OEM-методика Schaeffler/FAG: weekly/monthly/yearly m=D×B×X и relubrication intervals.'},
  FAG_LEGACY:{sourceId:'FAG-WL81115',title:'Schaeffler/FAG Rolling Bearing Lubrication WL 81 115/4 EA',url:'https://www.schaeffler.com/remotemedien/media/_shared_media/08_media_library/01_publications/schaeffler_2/publication/downloads_18/wl_81115_4_de_en.pdf',note:'Legacy/reference: свободный объём и многолетний режим; хранится для прослеживаемости старой методики.'},
  NTN:{sourceId:'NTN-LUB',title:'NTN-SNR Lubsolution — Initial charge and relubrication',url:'https://www.ntn-snr.com/sites/default/files/2020-12/DOC.I_LUBSOLUTION_CAT3.GBa_web.pdf',note:'Официальная методика NTN-SNR: grease dosing G = 0.005×D×B, базовая частота по типу и отношению рабочей/максимальной скорости, корректирующие коэффициенты условий. Продуктовые данные bearing units хранятся отдельно.'},
  NTN_UNITS:{sourceId:'NTN-HOUSED',title:'NTN Bearing Units Cat. 2400/E — relubrication quantity/frequency',url:'https://www.ntnglobal.com/en/products/catalog/en/2400/index.html',note:'OEM-таблица количества для UC/UK/UEL и стандартные интервалы корпусных узлов по скоростному показателю и условиям.'},
  NTN_ZLG_2024:{sourceId:'NTN-ZLG-2024',datasetId:'NTN-SNR-ZLG-2024-V1',title:'NTN-SNR — ZLG Multiple Bearing Housings, Assembly Instructions',url:'https://www.ntn-snr.com/sites/default/files/2024-07/DOC_I_ZLG_OM1_A4_GBa-26072024B.pdf',note:'Корпусная OEM-инструкция ZLG: количество досмазывания задаётся в см³ на подшипниковую позицию; базовый интервал 3000 рабочих часов, но не реже двух раз в год. Это общий housing-level reference, а не автоматически приоритетная методика конкретного высокооборотного вентилятора.'},
  VENTAPP_MACHINE:{sourceId:'VENTAPP-MACHINE-LUBRICATION',title:'Ventapp — machine-specific lubrication instruction / lubrication plate',url:'https://www.ventapp.de/',note:'Application-specific data for the individual Ventapp fan. Numeric dose, interval and lubricant are accepted only when copied from the machine lubrication plate or its Lubrication Instructions; values are never generalized to other Ventapp fans.'},
  TROESTER_BLOCK:{sourceId:'TROESTER-BLOCK-BEARING',datasetId:'TROESTER-BLOCK-LUBRICATION-V1',title:'Tröster — Block Bearings Maintenance',url:'https://troester-maschinenbau.de/wp-content/uploads/2020/03/Blocklager_Wartungsanleitung_2020-03_en.pdf',note:'Gperiod=0.005×D×B; tf from OEM diagram; ×0.5 vertical and per +15°C above 70°C; >30000 h not recommended.'},
  FERRARI_FAN:{sourceId:'FERRARI-FAN-BEARINGS',datasetId:'FERRARI-FAN-BEARING-RULES-V1',title:'Ferrari Ventilatori — Centrifugal Fans Manual 8.1',url:'https://www.ferrariventilatoren.de/wp-content/uploads/2023/02/Manuale-ventilatori-centrifughi-EN.pdf',note:'For complete transmission use fan-specific Transmission specifications/CART01. Chart 8-2 is for applicable version 1/6 shaft-only fans; harsh environment reduces interval about 40% or more.'},
  REITZ_KXE_SINGLE:{sourceId:'REITZ-KXE-SINGLE',datasetId:'REITZ-KXE-SINGLE-V1',title:'REITZ KXE Operating Manual — grease-lubricated single bearing housings',url:'https://www.reitzgroup.com/en/infocenter-2/',note:'Application-specific REITZ table for single SNB/SNV bearing housings: bearing-specific maintenance relubrication quantity and speed-dependent intervals at 75 °C, with REITZ temperature correction. The fan bearing maintenance plate has priority when available.'},
  REITZ_KXE:{sourceId:'REITZ-KXE-ZLG',datasetIds:['REITZ-KXE-ZLG-AAAK-V1','REITZ-KXE-ZLG-AC-V1'],title:'REITZ KXE Operating Manual — Table 11, multiple bearing block ZLG',url:'https://www.reitzgroup.com/en/infocenter-2/',note:'Application-specific OEM table REITZ for ZLG on KXE fans: AA/AK and AC variants, speed-dependent relubrication intervals and maintenance relubrication quantity per bearing/grease point. Intervals refer to 75 °C bearing housing temperature; REITZ temperature factors 75–100 °C are applied. After about 10 relubrications the old grease accumulated in the housing is to be removed and replaced.'},
  LUBRICA_UNIFIED:{sourceId:'LUBRICA-LUBM',title:'LUBRICA Universal Bearing Maintenance Method 3.2',url:'',note:'Инженерный синтез опубликованных OEM-правил SKF/NSK/Schaeffler/NTN-SNR/Timken для двух рабочих циклов уже смонтированного узла: досмазывание и полная замена. Для UC/UK/UEL и корпусных узлов приоритет отдан конструктивно-специализированным OEM-таблицам перед общей геометрической формулой; встроена защита от передозировки. Exact OEM выбранного бренда всегда имеет наивысший приоритет.'},
  TIMKEN:{sourceId:'TIMKEN-HELP',title:'Timken Grease Lubrication Tool Help Guide',url:'https://engineering.timken.com/wp-content/uploads/2023/09/Grease-Lubrication-Tool-Help-Guide.pdf',note:'Initial fill и relubrication учитывают геометрию, массу, тип, нагрузку, скорость, температуру и среду.'},
  SKF_SNL:{sourceId:'SKF-SNL',datasetId:'SKF-SNL-HOUSING-V1',title:'SKF SNL plummer block housings — lubrication / grease quantities',url:'https://www.skf.com/binaries/pub12/Images/0901d196803969af-13186_1-EN-SKF-bearing-housings-and-roller-bearing-units_tcm_12-315185.pdf',note:'SNL: initial housing fill 40% for side relubrication and 20% for relubrication via bearing outer-ring groove/holes. SKF replenishment quantity is Gp=0.005×D×B from the side or Gp=0.002×D×B through the ring. For side replenishment starting from 40% housing fill, complete grease renewal is recommended after approximately five replenishments; through-ring renewal is normally only exceptional.'},
  SKF:{sourceId:'SKF-RELUBE',title:'SKF Selecting grease or oil',url:'https://cdn.skfmediahub.skf.com/api/public/0901d196802809de/pdf_preview_medium/0901d196802809de_pdf_preview_medium.pdf',note:'Методы SKF 0,005×D×B и 0,002×D×B доступны только как явно выбранные методы SKF; при другом OEM считаются межбрендовой инженерной оценкой.'}
});

function normManufacturer(v){
  const s=String(v||'').trim().toUpperCase();
  if(!s||s==='AUTO'||s==='UNKNOWN')return 'auto';
  if(s.includes('SCHAEFFLER')||s==='FAG'||s==='INA')return 'FAG';
  if(s.includes('NTN')||s.includes('SNR'))return 'NTN-SNR';
  if(s.includes('TIMKEN'))return 'TIMKEN';
  if(s.includes('NSK'))return 'NSK';
  if(s.includes('SKF'))return 'SKF';
  return s;
}
function baseDesignation(s){
  let x=String(s||'').toUpperCase().replace(/\s+/g,'')
    .replace(/^NSK[-:]?/,'').replace(/^SKF[-:]?/,'').replace(/^FAG[-:]?/,'')
    .replace(/^NTN(?:-SNR)?[-:]?/,'').replace(/^TIMKEN[-:]?/,'');
  x=x.split('/')[0];
  // Preserve NSK one/two-side cover prefixes so the profile can prevent plain/covered mass mixing.
  const cover=(x.match(/^(CM-|ZM-|C-|Z-)/)||[])[1]||'';if(cover)x=x.slice(cover.length);
  const fam=Object.keys(nskHousingFamilies).sort((a,b)=>b.length-a.length).join('|');
  const unit=x.match(new RegExp(`^(?:${fam})\\d{3}(?:D1)?`));if(unit)return cover+unit[0];
  const cyl=x.match(/^(?:NUP|NU|NJ|N)\d{3,4}/);if(cyl)return cyl[0];
  const numeric=x.match(/^\d{4,5}/);if(numeric)return numeric[0];
  return x.replace(/(?:2RS1?|2RSH|2Z|ZZ|DDU|VV|DU|Z|C[2345]|M|J|K|E|A)+$/,'');
}
function nskExact(designation){
  const d=baseDesignation(designation);
  if(nsk6200[d]){const row=nsk6200[d];return {manufacturer:'NSK',designation:d,bearingType:'deep_groove_ball',exact:true,confidence:'OEM exact table',relubeG:row.g,intervalTable:{900:row.h900,1800:row.h1800,3600:row.h3600},source:sourceRefs.NSK,lowerBound900:!!row.lowerBound}}
  const m=d.match(/^(?:N|NJ|NU)(?:2)?(\d{3})$/);if(!m)return null;const code=m[1],row=nskCyl200[code];if(!row)return null;
  return {manufacturer:'NSK',designation:d,bearingType:'cylindrical_roller',exact:true,confidence:'OEM exact table',relubeG:row.g,intervalTable:{900:row.h900,1800:row.h1800,3600:row.h3600},source:sourceRefs.NSK,lowerBound900:!!row.lowerBound900};
}
function nskBearingUnitProfile(designation){
  const d=baseDesignation(designation);let x=d,coverPrefix='';
  const cm=x.match(/^(CM-|ZM-|C-|Z-)/);if(cm){coverPrefix=cm[1].slice(0,-1);x=x.slice(cm[1].length);}
  const famKeys=Object.keys(nskHousingFamilies).sort((a,b)=>b.length-a.length);
  const fm=x.match(new RegExp(`^(${famKeys.join('|')})(\\d{3})(?:D1)?$`));if(!fm)return null;
  const family=fm[1],code=fm[2],meta=nskHousingFamilies[family],insertFamily=meta.insert;
  const table=insertFamily==='UC'?(nskUC200[code]||nskUC300[code]):(nskUK200[code]||nskUK300[code]);
  const catalogRecognized=!!meta;
  if(!table)return {manufacturer:'NSK',family,designation:d,code,coverPrefix,insertFamily,insertDesignation:`${insertFamily}${code}D1`,insert:null,unitMassKg:null,adapterSleeve:null,source:sourceRefs.NSK_UNITS,exactInsert:false,exactUnitMass:false,catalogRecognized,coverageNote:'Семейство NSK распознано, но точная локальная строка вставки ещё не оцифрована; массу и геометрию не предполагаем.'};
  let unit=null;
  if(!coverPrefix&&family==='UCP')unit=(nskUCP200[code]||nskUCP300[code]||null);
  if(!coverPrefix&&family==='UKF')unit=(nskUKF200[code]||null);
  return {manufacturer:'NSK',family,designation:d,code,coverPrefix,insertFamily,insertDesignation:`${insertFamily}${code}D1`,insert:{...table},unitMassKg:unit?.unitMassKg??null,unitGeometry:unit?{...unit}:null,adapterSleeve:unit?.adapterSleeve||table.adapterSleeve||null,source:sourceRefs.NSK_UNITS,exactInsert:true,exactUnitMass:!!unit,catalogRecognized,coverageNote:coverPrefix?'Исполнение с крышкой распознано; масса обычного корпуса намеренно не переносится на закрытое исполнение.':''};
}
function exactProfile(manufacturer,designation){
  const m=normManufacturer(manufacturer);if(m==='NSK')return nskExact(designation);return null;
}
function interpolateInterval(table,rpm){
  rpm=Number(rpm);if(!(rpm>0)||!table)return null;const pts=[900,1800,3600];
  if(rpm<=900)return table[900];if(rpm>=3600)return table[3600]*3600/rpm;
  const a=rpm<=1800?900:1800,b=rpm<=1800?1800:3600;
  // interpolate in log-speed/log-interval space to avoid abrupt jumps.
  const t=(Math.log(rpm)-Math.log(a))/(Math.log(b)-Math.log(a));
  return Math.exp(Math.log(table[a])+(Math.log(table[b])-Math.log(table[a]))*t);
}
function nskLoadFactor(pc){
  pc=Number(pc);if(!(pc>0))return 1;
  const pts=[[0.06,1.5],[0.10,1],[0.13,0.65],[0.16,0.45]];
  if(pc<=pts[0][0])return pts[0][1];if(pc>=pts.at(-1)[0])return pts.at(-1)[1];
  for(let i=0;i<pts.length-1;i++){const [x1,y1]=pts[i],[x2,y2]=pts[i+1];if(pc>=x1&&pc<=x2)return y1+(y2-y1)*(pc-x1)/(x2-x1)}return 1;
}
function ntnConditionFactors({contamination='normal',vibration='normal',shaftOrientation='horizontal',temperatureC=70}={}){
  const te={normal:1,moderate:0.8,heavy:0.5,severe:0.3}[String(contamination)]||1;
  let ta=1;if(vibration==='high'&&shaftOrientation==='vertical')ta=0.3;else if(vibration==='high')ta=0.5;else if(shaftOrientation==='vertical')ta=0.8;
  const t=Number(temperatureC);let tt=1;if(t>85)tt=0.3;else if(t>75)tt=0.5;else if(t>70)tt=0.8;
  return {Te:te,Ta:ta,Tt:tt,total:te*ta*tt,source:sourceRefs.NTN};
}
function fillRecommendation({manufacturer,rpm,limitingRpm,bearingType}={}){
  const m=normManufacturer(manufacturer),n=Number(rpm),lim=Number(limitingRpm);
  if(m==='NSK'&&n>=0&&lim>0){const ratio=n/lim;return ratio<=0.5?{min:0.5,max:2/3,suggested:0.58,method:'NSK speed-based fill',source:sourceRefs.NSK_GENERAL}:{min:1/3,max:0.5,suggested:0.4,method:'NSK speed-based fill',source:sourceRefs.NSK_GENERAL}}
  if(m==='NTN-SNR')return {min:0.2,max:0.3,suggested:0.25,method:'NTN-SNR general grease fill',source:sourceRefs.NTN};
  // Unified fallback: housed units follow the conservative 20–30% free-volume band published by NTN-SNR.
  // For other rolling bearings use the NSK speed-dependent fill concept when limiting speed is known.
  if(bearingType==='bearing_unit')return {min:0.2,max:0.3,suggested:0.25,method:'LUBM housed-unit fill 20–30%',source:sourceRefs.LUBRICA_UNIFIED,engineering:true};
  if(n>=0&&lim>0){const ratio=n/lim;return ratio<=0.5?{min:0.5,max:2/3,suggested:0.58,method:'LUBM low-speed rolling-bearing fill',source:sourceRefs.LUBRICA_UNIFIED,engineering:true}:{min:1/3,max:0.5,suggested:0.4,method:'LUBM higher-speed rolling-bearing fill',source:sourceRefs.LUBRICA_UNIFIED,engineering:true};}
  return {min:0.33,max:0.5,suggested:0.4,method:'LUBM default rolling-bearing fill',source:sourceRefs.LUBRICA_UNIFIED,engineering:true};
}
function methodRecommendation({manufacturer,designation,bearingType,rpm,limitingRpm}={}){
  const m=normManufacturer(manufacturer),exact=exactProfile(m,designation);
  if(exact)return {level:'oem_exact',confidenceCode:'A',label:'A — OEM exact',manufacturer:m,relubeMethod:'oem_exact',exact,source:exact.source};
  if(m==='NTN-SNR'){const unit=ntnBearingUnitRelubeProfile(designation);if(unit)return {level:'oem_exact',confidenceCode:'A',label:'A — OEM bearing-unit table',manufacturer:m,relubeMethod:'ntn_unit_exact',unitProfile:unit,source:sourceRefs.NTN_UNITS};return {level:'oem_method',confidenceCode:'B',label:'B — OEM method',manufacturer:m,relubeMethod:'ntn_snr_standard',source:sourceRefs.NTN};}
  if(m==='SKF')return {level:'oem_method',confidenceCode:'B',label:'B — OEM method',manufacturer:m,relubeMethod:'skf_side',source:sourceRefs.SKF};
  if(m==='FAG')return {level:'insufficient',confidenceCode:'X',label:'X — требуется выбор режима',manufacturer:m,relubeMethod:'manual_required',source:sourceRefs.FAG,note:'FAG/Schaeffler выбран, но автоматический выбор weekly/monthly/yearly запрещён. Выберите фактический режим обслуживания.'};
  if(m==='NSK'){const unit=nskBearingUnitProfile(designation);if(unit)return {level:'oem_guidance',confidenceCode:'B',label:'B — OEM guidance',manufacturer:m,relubeMethod:'nsk_unit_guidance',unitProfile:unit,source:sourceRefs.NSK_UNITS,note:unit.exactInsert?`NSK корпусной узел распознан: ${unit.family}${unit.code} / вставка ${unit.insertDesignation}. OEM-источник и данные вставки найдены. NSK не задаёт универсальную фиксированную дозу пополнения в граммах для этих узлов; количество задаётся по процедуре/условиям эксплуатации.`:`NSK семейство ${unit.family}${unit.code} распознано по OEM-каталогу, но точная строка вставки ещё не оцифрована локально; автоматическая масса/геометрия не назначаются.`};return {level:'insufficient',confidenceCode:'X',label:'X — нет exact для обозначения',manufacturer:m,relubeMethod:'manual_required',source:sourceRefs.NSK,note:`NSK выбран. Для ${baseDesignation(designation)||'этого обозначения'} нет точного OEM-количества в локальной таблице; автоматическая подмена методом другого производителя запрещена.`};}
  if(m==='TIMKEN')return {level:'insufficient',confidenceCode:'X',label:'X — требуется OEM tool/данные',manufacturer:m,relubeMethod:'manual_required',source:sourceRefs.TIMKEN,note:'Timken выбран. Для числового результата требуются входы/результат OEM tool; LUBRICA не подменяет его чужой формулой.'};
  return {level:'engineering',confidenceCode:'D',label:'D — LUBRICA Unified Method',manufacturer:m,relubeMethod:'lubrica_unified',source:sourceRefs.LUBRICA_UNIFIED,note:m==='auto'?'Производитель не указан: LUBRICA применяет унифицированную инженерную методику с явной маркировкой не-OEM.':`Для производителя ${m} нет встроенной OEM-методики; доступна только явно помеченная инженерная оценка, не OEM.`};
}



// Tröster Blocklager maintenance diagram (2020-03), page 7.
// The OEM publishes a graphical nomogram. LUBRICA does not invent an analytical formula:
// the chart below is represented as a calibrated 2D digitization of the OEM image.
// Coordinates are in the graph's own pixel coordinate system after calibration of the
// logarithmic speed axis and the three printed tf scales. Only the validated bore range
// 40..200 mm is automated; outside it the calculator requests a manual chart reading.
const troesterTfDiagramV1=Object.freeze({
  source:sourceRefs.TROESTER_BLOCK,
  inputs:Object.freeze(['bearingType','d','rpm']),
  bearingScales:Object.freeze({
    deep_groove_ball:'I',angular_contact_ball:'I',self_aligning_ball:'I',
    cylindrical_roller:'II',spherical_roller:'III'
  }),
  page:7,
  title:'Diagram for Determining Relubrication Intervals',
  localImage:'assets/references/troester_tf_diagram_2020-03_page7.png',
  localDocument:'assets/references/troester_block_bearings_2020-03_en.pdf',
  calibration:Object.freeze({xMin:0,xMax:1631,rpmMin:100,rpmMax:20000,yMin:0,yMax:1914}),
  tfScales:Object.freeze({I:Object.freeze({top:30000,bottom:100}),II:Object.freeze({top:25000,bottom:50}),III:Object.freeze({top:15000,bottom:10})}),
  // Digitized curve centerlines from the OEM chart. Each row is [chartY, chartX].
  // These points were read from the supplied OEM page at 300 dpi after removing grid lines.
  curves:Object.freeze({
    40:Object.freeze([[200,657],[400,959],[600,1158],[800,1233],[1000,1282],[1200,1317],[1400,1341],[1600,1358],[1800,1370]]),
    60:Object.freeze([[200,590],[400,891],[600,1061],[800,1129],[1000,1177],[1200,1212],[1400,1235],[1600,1252],[1800,1267]]),
    80:Object.freeze([[200,559],[400,842],[600,991],[800,1054],[1000,1098],[1200,1128],[1400,1150],[1600,1168],[1800,1179]]),
    100:Object.freeze([[200,523],[400,815],[600,949],[800,998],[1000,1035],[1200,1061],[1400,1082],[1600,1097],[1800,1108]]),
    120:Object.freeze([[200,488],[400,765],[600,898],[800,951],[1000,988],[1200,1015],[1400,1035],[1600,1054],[1800,1061]]),
    160:Object.freeze([[200,401],[400,683],[600,815],[800,858],[1000,886],[1200,907],[1400,925],[1600,935],[1800,944]]),
    200:Object.freeze([[200,310],[400,588],[600,733],[800,783],[1000,817],[1200,841],[1400,856],[1600,869],[1800,877]])
  }),
  automatedBoreRange:Object.freeze([40,200]),
  digitizationTolerancePct:15,
  automaticNumericReading:true,
  note:'2D digitization of the OEM chart; no n*d formula. Linear interpolation is performed between adjacent printed d-curves and along the logarithmic speed axis. Result is marked as digitized OEM-chart reading.'
});
function troesterChartX(rpm){const c=troesterTfDiagramV1.calibration;return c.xMin+(Math.log10(rpm)-Math.log10(c.rpmMin))/(Math.log10(c.rpmMax)-Math.log10(c.rpmMin))*(c.xMax-c.xMin)}
function troesterTfFromY(scale,y){const c=troesterTfDiagramV1.calibration,sc=troesterTfDiagramV1.tfScales[scale];if(!sc)return null;const q=(y-c.yMin)/(c.yMax-c.yMin);return Math.pow(10,Math.log10(sc.top)+q*(Math.log10(sc.bottom)-Math.log10(sc.top)))}
function troesterInterpolatedCurve(d){const curves=troesterTfDiagramV1.curves,keys=Object.keys(curves).map(Number).sort((a,b)=>a-b);if(d<keys[0]||d>keys[keys.length-1])return null;if(curves[d])return curves[d].map(p=>p.slice());let lo=keys[0],hi=keys[keys.length-1];for(let i=1;i<keys.length;i++)if(d<keys[i]){lo=keys[i-1];hi=keys[i];break}const q=(d-lo)/(hi-lo),a=curves[lo],b=curves[hi];return a.map((p,i)=>[p[0],p[1]+q*(b[i][1]-p[1])])}
function troesterDiagramInterval(bearingType,d,rpm){
  const t=String(bearingType||''),scale=troesterTfDiagramV1.bearingScales[t];d=Number(d);rpm=Number(rpm);
  if(!scale)return {blocked:true,reason:'Тип подшипника не относится к шкалам I/II/III диаграммы Tröster.',scale:null,d,rpm,source:troesterTfDiagramV1.source,page:troesterTfDiagramV1.page,title:troesterTfDiagramV1.title};
  const c=troesterTfDiagramV1.calibration;
  if(!(d>0&&rpm>0))return {blocked:true,reason:'Для чтения диаграммы Tröster нужны фактические d и рабочие обороты.',scale,d,rpm,source:troesterTfDiagramV1.source,page:troesterTfDiagramV1.page,title:troesterTfDiagramV1.title};
  if(rpm<c.rpmMin||rpm>c.rpmMax)return {blocked:true,reason:`n=${rpm} об/мин вне опубликованной оси диаграммы Tröster (${c.rpmMin}–${c.rpmMax} об/мин).`,scale,d,rpm,source:troesterTfDiagramV1.source,page:7,title:troesterTfDiagramV1.title};
  const curve=troesterInterpolatedCurve(d);if(!curve)return {blocked:true,requiresConfirmedChartReading:true,reason:`d=${d} мм вне валидированной автоматической оцифровки (${troesterTfDiagramV1.automatedBoreRange[0]}–${troesterTfDiagramV1.automatedBoreRange[1]} мм). Откройте локальную диаграмму и подтвердите tf вручную.`,scale,d,rpm,source:troesterTfDiagramV1.source,page:7,title:troesterTfDiagramV1.title};
  const x=troesterChartX(rpm);let y=null;
  for(let i=1;i<curve.length;i++){const a=curve[i-1],b=curve[i];if((x>=a[1]&&x<=b[1])||(x<=a[1]&&x>=b[1])){const q=(x-a[1])/(b[1]-a[1]);y=a[0]+q*(b[0]-a[0]);break}}
  if(y==null)return {blocked:true,requiresConfirmedChartReading:true,reason:`Точка d=${d} мм, n=${rpm} об/мин находится вне валидированной части оцифрованной кривой. Откройте OEM-диаграмму для ручной проверки.`,scale,d,rpm,source:troesterTfDiagramV1.source,page:7,title:troesterTfDiagramV1.title};
  const hours=troesterTfFromY(scale,y);if(!(hours>0))return {blocked:true,reason:'Не удалось преобразовать координату диаграммы в tf.',scale,d,rpm,source:troesterTfDiagramV1.source,page:7,title:troesterTfDiagramV1.title};
  const rounded=Math.max(10,Math.min(30000,Math.round(hours/10)*10));
  return {hours:rounded,scale,d,rpm,chartX:Math.round(x*10)/10,chartY:Math.round(y*10)/10,source:troesterTfDiagramV1.source,page:7,title:troesterTfDiagramV1.title,tolerancePct:troesterTfDiagramV1.digitizationTolerancePct,digitized:true,method:'OEM_CHART_2D_DIGITIZATION',localImage:troesterTfDiagramV1.localImage};
}

// Tröster 31/33 T xx L product sheet (June 2019). Reference-only: the sheet explicitly
// states that all rolling-bearing combinations can be realized, therefore these rows
// must never auto-identify the bearings installed in a particular plant block.
const troester3133ReferenceTable=Object.freeze({
 '30':{bearingA:'6207',bearingB:'NU 207',bearingSeatMm:35},'40':{bearingA:'6210',bearingB:'NU 210',bearingSeatMm:50},
 '50':{bearingA:'6212',bearingB:'NU 212',bearingSeatMm:60},'60':{bearingA:'6215',bearingB:'NU 215',bearingSeatMm:75},
 '70':{bearingA:'6217',bearingB:'NU 217',bearingSeatMm:85},'80':{bearingA:'6219',bearingB:'NU 219',bearingSeatMm:95},
 '90':{bearingA:'6221',bearingB:'NU 221',bearingSeatMm:105},'100':{bearingA:'6224',bearingB:'NU 224',bearingSeatMm:120},
 '130':{bearingA:'6228',bearingB:'NU 228',bearingSeatMm:140}
});

// Ferrari MVC 02 rev.5, Chart 8-2 (p.70 of 127). Exact OEM rows for shaft-only
// versions 1/6. No interpolation between RPM columns is performed: if the actual
// speed is not an exact published column, LUBRICA requires CART01 or engineer input.
const ferrariChart82Rows=Object.freeze([
 ['ST 47 A-AL','pulley','6204 Z',4,[1060,12500,1500,8000,2120,6300,3000,4000,4250,3150]],['ST 47 A-AL','opposite','6204 Z',4,[1060,12500,1500,8000,2120,6300,3000,4000,4250,3150]],
 ['ST 62 A-AL','pulley','6305 Z',5,[1060,11200,1500,7100,2120,5600,3000,3550,4250,2800]],['ST 62 A-AL','opposite','6305 Z',5,[1060,11200,1500,7100,2120,5600,3000,3550,4250,2800]],
 ['ST 80 A-AL','pulley','6307 Z',7,[1060,10000,1500,6300,2120,5000,3000,3150,4250,2500]],['ST 80 A-AL','opposite','6307 Z',7,[1060,10000,1500,6300,2120,5000,3000,3150,4250,2500]],
 ['ST 90 A-AL','pulley','6308 Z',9,[1060,9000,1500,5600,2120,4500,3000,2800,4250,2240]],['ST 90 A-AL','opposite','6308 Z',9,[1060,9000,1500,5600,2120,4500,3000,2800,4250,2240]],
 ['ST 90 B-BL','pulley','NU 308 ECP',9,[1060,4500,1500,2800,2120,2250,3000,1400,4250,1120]],['ST 90 B-BL','opposite','6308 Z',9,[1060,9000,1500,5600,2120,4500,3000,2800,4250,2240]],
 ['ST 100 A-AL','pulley','6309 Z',11,[1060,8000,1500,5000,2120,4000,3000,2500,4250,2000]],['ST 100 A-AL','opposite','6309 Z',11,[1060,8000,1500,5000,2120,4000,3000,2500,4250,2000]],
 ['ST 100 B-BL','pulley','NU 309 ECP',11,[1060,4000,1500,2500,2120,2000,3000,1250,4250,1000]],['ST 100 B-BL','opposite','6309 Z',11,[1060,8000,1500,5000,2120,4000,3000,2500,4250,2000]],
 ['ST 110 A-AL','pulley','6310 Z',14,[1060,7100,1500,4500,2120,3550,3000,2240,4250,1800]],['ST 110 A-AL','opposite','6310 Z',14,[1060,7100,1500,4500,2120,3550,3000,2250,4250,1800]],
 ['ST 110 B-BL','pulley','NU 310 ECP',14,[1060,3550,1500,2250,2120,1800,3000,1120,4250,900]],['ST 110 B-BL','opposite','6310 Z',14,[1060,7100,1500,4500,2120,3550,3000,2250,4250,1800]],
 ['ST 120 A-AL','pulley','6311 Z',18,[1060,6300,1500,4000,2120,3150,3000,2000,4250,1600]],['ST 120 A-AL','opposite','6311 Z',18,[1060,6300,1500,4000,2120,3150,3000,2000,4250,1600]],
 ['ST 120 B-BL','pulley','NU 311 ECP',18,[1060,3150,1500,2000,2120,1600,3000,1000]],['ST 120 B-BL','opposite','6311 Z',18,[1060,6300,1500,4000,2120,3150,3000,2000,4250,1600]],
 ['ST 130 A-AL','pulley','6312 Z',22,[1060,5600,1500,3550,2120,2800,3000,1800]],['ST 130 A-AL','opposite','6312 Z',22,[1060,5600,1500,3550,2120,2800,3000,1800]],
 ['ST 130 B-BL','pulley','NU 312 ECP',22,[1060,2800,1500,1800,2120,1400,3000,900]],['ST 130 B-BL','opposite','6312 Z',22,[1060,5600,1500,3550,2120,2800,3000,1800]],
 ['ST 150 A-AL','pulley','6314 Z',28,[1060,5000,1500,3150,2120,2500,3000,1600]],['ST 150 A-AL','opposite','6314 Z',28,[1060,5000,1500,3150,2120,2500,3000,1600]],
 ['ST 150 B-BL','pulley','NU 314 ECP',28,[1060,2500,1500,1600,2120,1250,3000,800]],['ST 150 B-BL','opposite','6314 Z',28,[1060,5000,1500,3150,2120,2500,3000,1600]],
 ['ST 180 A-AL','pulley','6317',36,[1060,4500,1500,2800,2120,2240,3000,1400]],['ST 180 A-AL','opposite','6317 Z',36,[1060,4500,1500,2800,2120,2240,3000,1400]],
 ['ST 180 B-BL','pulley','NU 317 ECP',36,[1060,2250,1500,1400,2120,1120]],['ST 180 B-BL','opposite','6317 Z',36,[1060,4500,1500,2800,2120,2240,3000,1400]],
 ['ST 200 A-AL','pulley','6319',45,[1060,4000,1500,2500,2120,2000]],['ST 200 A-AL','opposite','6319 Z',45,[1060,4000,1500,2500,2120,2000]],
 ['ST 200 B-BL','pulley','NU 319 ECP',45,[1060,2000,1500,1250,2120,1000]],['ST 200 B-BL','opposite','6319 Z',45,[1060,4000,1500,2500,2120,2000]],
 ['SN 507 B-BL','pulley','22207 EK',6,[750,4000,1060,2500,1500,1600,2120,1000,3000,670]],['SN 507 B-BL','opposite','22207 EK',6,[750,4000,1060,2500,1500,1600,2120,1000,3000,670]],
 ['SN 508 B-BL','pulley','22208 EK',7,[750,3750,1060,2360,1500,1500,2120,950,3000,600]],['SN 508 B-BL','opposite','22208 EK',7,[750,3750,1060,2360,1500,1500,2120,950,3000,600]],
 ['SN 509 B-BL','pulley','22209 EK',9,[750,3550,1060,2250,1500,1400,2120,900,3000,560]],['SN 509 B-BL','opposite','22209 EK',9,[750,3550,1060,2250,1500,1400,2120,900,3000,560]],
 ['SN 509 C-CR-CS','pulley','22209 EK',9,[750,3550,1060,2250,1500,1400,2120,900,3000,560]],['SN 509 C-CR-CS','opposite','2209 EK',9,[750,7100,1060,4500,1500,2800,2120,1800,3000,1120]],
 ['SN 510 B-BL','pulley','22210 EK',11,[750,3350,1060,2120,1500,1320,2120,850,3000,530]],['SN 510 B-BL','opposite','22210 EK',11,[750,3350,1060,2120,1500,1320,2120,850,3000,530]],
 ['SN 510 C-CR-CS','pulley','22210 EK',11,[750,3350,1060,2120,1500,1320,2120,850,3000,530]],['SN 510 C-CR-CS','opposite','2210 EK',11,[750,6700,1060,4250,1500,2650,2120,1700,3000,1060]],
 ['SN 511 C-CR-CS','pulley','22211 EK',13,[750,3150,1060,2000,1500,1250,2120,800,3000,500]],['SN 511 C-CR-CS','opposite','2211 EK',13,[750,6300,1060,4000,1500,2500,2120,1600,3000,1000]],
 ['SN 512 B-BL','pulley','22212 EK',18,[750,3000,1060,1900,1500,1180,2120,750,3000,475]],['SN 512 B-BL','opposite','22212 EK',18,[750,3000,1060,1900,1500,1180,2120,750,3000,475]],
 ['SN 512 C-CR-CS','pulley','22212 EK',18,[750,3000,1060,1900,1500,1180,2120,750,3000,475]],['SN 512 C-CR-CS','opposite','2212 EK',18,[750,6000,1060,3750,1500,2360,2120,1500,3000,950]],
 ['SN 513 B-BL','pulley','22213 EK',22,[750,2800,1060,1800,1500,1120,2120,710,3000,450]],['SN 513 B-BL','opposite','22213 EK',22,[750,2800,1060,1800,1500,1120,2120,710,3000,450]],
 ['SN 513 C-CR-CS','pulley','22213 EK',22,[750,2800,1060,1800,1500,1120,2120,710,3000,450]],['SN 513 C-CR-CS','opposite','2213 EK',22,[750,5600,1060,3550,1500,2210,2120,1400,3000,900]],
 ['SN 516 B-BL','pulley','22216 EK',28,[750,2500,1060,1600,1500,1000,2120,630]],['SN 516 B-BL','opposite','22216 EK',28,[750,2500,1060,1600,1500,1000,2120,630]],
 ['SN 516 C-CR-CS','pulley','22216 EK',28,[750,2500,1060,1600,1500,1000,2120,630]],['SN 516 C-CR-CS','opposite','2216 EK',28,[750,5000,1060,3150,1500,2000,2120,1250]],
 ['SN 517 C-CR-CS','pulley','22217 EK',32,[750,2360,1060,1500,1500,950,2120,600]],['SN 517 C-CR-CS','opposite','2217 EK',32,[750,4750,1060,3000,1500,1900,2120,1180]],
 ['SN 518 B-BL','pulley','22218 EK',34,[750,2250,1060,1400,1500,900,2120,560]],['SN 518 B-BL','opposite','22218 EK',34,[750,2250,1060,1400,1500,900,2120,560]],
 ['SN 518 C-CL-CR-CRL-CS-CSL','pulley','22218 EK',34,[750,2250,1060,1400,1500,900,2120,560]],['SN 518 C-CL-CR-CRL-CS-CSL','opposite','2218 EK',34,[750,4500,1060,2800,1500,1800,2120,1120]],
 ['SN 520 B-BL-C','pulley','22220 EK',40,[750,2000,1060,1250,1500,800]],['SN 520 B-BL-C','opposite','22220 EK',40,[750,2000,1060,1250,1500,800]],
 ['SN 522 B-BL-C','pulley','22222 EK',50,[750,1800,1060,1120,1500,710]],['SN 522 B-BL-C','opposite','22222 EK',50,[750,1800,1060,1120,1500,710]],
 ['SN 524 B-BL-C','pulley','22224 EK',60,[750,1600,1060,1000,1500,630]],['SN 524 B-BL-C','opposite','22224 EK',60,[750,1600,1060,1000,1500,630]],
 ['SN 526 C','pulley','22226 EK',70,[750,1500,1060,950,1500,600]],['SN 526 C','opposite','22226 EK',70,[750,1500,1060,950,1500,600]],
 ['SN 528 B-BL-C','pulley','22228 CCK/W33',80,[750,1320,1060,850]],['SN 528 B-BL-C','opposite','22228 CCK/W33',80,[750,1320,1060,850]],
 ['SN 530 C','pulley','22230 CCK/W33',90,[750,1180,1060,750]],['SN 530 C','opposite','22230 CCK/W33',90,[750,1180,1060,750]]
].map(r=>Object.freeze({support:r[0],side:r[1],bearing:r[2],greaseG:r[3],intervals:Object.freeze(Object.fromEntries(Array.from({length:r[4].length/2},(_,i)=>[r[4][i*2],r[4][i*2+1]])))})));
function normSupport(s){return String(s||'').toUpperCase().replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();}
function ferrariChart82Profile(support,side,bearing,rpm){
 const ns=normSupport(support),sd=String(side||'').toLowerCase(),nb=baseDesignation(bearing).replace(/\s+/g,'');
 const row=ferrariChart82Rows.find(r=>normSupport(r.support)===ns&&r.side===sd&&baseDesignation(r.bearing).replace(/\s+/g,'')===nb);
 if(!row)return null;const n=Number(rpm),h=row.intervals[n];return {...row,intervalHours:h??null,rpm:n,exactSpeed:h!=null,source:sourceRefs.FERRARI_FAN};
}

global.LubricaBearingOEM=Object.freeze({manufacturers,sourceRefs,nskCyl200,nsk6200,nskUC200,nskUC300,nskUK200,nskUK300,nskUCP200,nskUCP300,nskUKF200,nskHousingFamilies,skfSnlHousingTable,snlHousingCode,snlHousingProfile,ntnUnitRelubeG,ntnZlgHousingRelubeCm3,zlgHousingCode,zlgHousingProfile,zlgVariant,reitzZlgAAAK,reitzZlgAC,reitzTemperatureFactors,reitzSpeedBand,reitzTemperatureFactor,reitzZlgProfile,reitzKxeSingleBearingTable,reitzSingleBearingDesignation,reitzSingleSpeedColumn,reitzSingleBearingProfile,troesterTfDiagramV1,troesterDiagramInterval,troester3133ReferenceTable,ferrariChart82Rows,ferrariChart82Profile,housedUnitCode,ntnBearingUnitRelubeProfile,housedUnitReferenceProfile,normManufacturer,baseDesignation,nskBearingUnitProfile,exactProfile,interpolateInterval,nskLoadFactor,ntnConditionFactors,fillRecommendation,methodRecommendation});
global.LubricaSystem?.registerModule?.('Multi-OEM Bearing Data','ok',`${extra.length} доп. размерных записей + OEM методики SKF/NSK/FAG/NTN-SNR/Timken`);
})(window);
