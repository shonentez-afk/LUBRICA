(function(global){
'use strict';
const norm=v=>String(v??'').trim().toUpperCase().replace(/Ё/g,'Е').replace(/[–—]/g,'-').replace(/,/g,'.').replace(/М3АА/g,'M3AA').replace(/М2АА/g,'M2AA').replace(/М2СА/g,'M2CA');
const number=(v)=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:null};
const SOURCES=Object.freeze({
 ABB_MANUAL:'MOTOR-ABB-LV-MANUAL',
 ABB_GPM:'MOTOR-ABB-GPM-2004',
 SEW_DR:'MOTOR-SEW-DR',
 SEW_LEGACY:'MOTOR-SEW-LEGACY-DR-DT-DV',
 OLI_MVE:'MOTOR-OLI-MVE',
 SIEMENS_1LE:'MOTOR-SIEMENS-1LE',
 ABB_STEEL:'MOTOR-ABB-STEEL-2003',
 ABB_M3AA:'MOTOR-ABB-M3AA-2022',
 ABB_MARINE:'MOTOR-ABB-MARINE-2005',
 ABB_M2BAX:'MOTOR-ABB-M2BAX-2024',
 SIEMENS_D81:'MOTOR-SIEMENS-D81-2023',
 LAMMERS_1TZ:'MOTOR-LAMMERS-1TZ-2023',
 EMOD_WK:'MOTOR-EMOD-WK-OFFICIAL',
 OEMER_HQL:'MOTOR-OEMER-HQL-2024',
 INTERROLL_138I:'MOTOR-INTERROLL-138I'
});
const ABB_BALL_L1=Object.freeze([
 {frame:112,g:10,lowKw:null,highKw:null,h3600:10000,h3000:13000,h1800:18000,h1500:21000,h1000:25000,h900:28000},
 {frame:132,g:15,lowKw:null,highKw:null,h3600:9000,h3000:11000,h1800:17000,h1500:19000,h1000:23000,h900:26500},
 {frame:160,g:25,maxKw3600:18.5,maxKw1800:15,maxKw1000:11,h3600lo:9000,h3000lo:12000,h1800lo:18000,h1500lo:21500,h1000lo:24000,h900lo:24000,h3600hi:7500,h3000hi:10000,h1800hi:15000,h1500hi:18000,h1000hi:22500,h900hi:24000},
 {frame:180,g:30,maxKw3600:22,maxKw1800:22,maxKw1000:15,h3600lo:7000,h3000lo:9000,h1800lo:15500,h1500lo:18500,h1000lo:24000,h900lo:24000,h3600hi:6000,h3000hi:8500,h1800hi:14000,h1500hi:17000,h1000hi:21000,h900hi:24000},
 {frame:200,g:40,maxKw3600:37,maxKw1800:30,maxKw1000:22,h3600lo:5500,h3000lo:8000,h1800lo:14500,h1500lo:17500,h1000lo:23000,h900lo:24000,h3600hi:3000,h3000hi:5500,h1800hi:10000,h1500hi:12000,h1000hi:16000,h900hi:20000},
 {frame:225,g:50,maxKw3600:45,maxKw1800:45,maxKw1000:30,h3600lo:4000,h3000lo:6500,h1800lo:13000,h1500lo:16500,h1000lo:22000,h900lo:24000,h3600hi:1500,h3000hi:2500,h1800hi:5000,h1500hi:6000,h1000hi:8000,h900hi:10000},
 {frame:250,g:60,maxKw3600:55,maxKw1800:55,maxKw1000:37,h3600lo:2500,h3000lo:4000,h1800lo:9000,h1500lo:11500,h1000lo:15000,h900lo:18000,h3600hi:1000,h3000hi:1500,h1800hi:3500,h1500hi:4500,h1000hi:6000,h900hi:7000},
 {frame:280,g:35,h3600:1900,h3000:3200,h1800:null,h1500:null,h1000:null,h900:null,note:'ABB manual contains two 280 rows; use exact motor/plate when available.'},
 {frame:315,g:35,h3600:1900,h3000:3200,h1800:null,h1500:null,h1000:null,h900:null,note:'2-pole/high-speed row; exact motor/plate preferred.'}
]);
const ABB_ROLLER_L1=Object.freeze([
 {frame:160,g:25,maxKw3600:18.5,maxKw1800:15,maxKw1000:11,h3600lo:4500,h3000lo:6000,h1800lo:9000,h1500lo:10500,h1000lo:12000,h900lo:12000,h3600hi:3500,h3000hi:5000,h1800hi:7500,h1500hi:9000,h1000hi:11000,h900hi:12000},
 {frame:180,g:30,maxKw3600:22,maxKw1800:22,maxKw1000:15,h3600lo:3500,h3000lo:4500,h1800lo:7500,h1500lo:9000,h1000lo:12000,h900lo:12000,h3600hi:3000,h3000hi:4000,h1800hi:7000,h1500hi:8500,h1000hi:10500,h900hi:12000},
 {frame:200,g:40,maxKw3600:37,maxKw1800:30,maxKw1000:22,h3600lo:2750,h3000lo:4000,h1800lo:7000,h1500lo:8500,h1000lo:11500,h900lo:12000,h3600hi:1500,h3000hi:2500,h1800hi:5000,h1500hi:6000,h1000hi:8000,h900hi:10000},
 {frame:225,g:50,maxKw3600:45,maxKw1800:45,maxKw1000:30,h3600lo:2000,h3000lo:3000,h1800lo:6500,h1500lo:8000,h1000lo:11000,h900lo:12000,h3600hi:750,h3000hi:1250,h1800hi:2500,h1500hi:3000,h1000hi:4000,h900hi:5000},
 {frame:250,g:60,maxKw3600:55,maxKw1800:55,maxKw1000:37,h3600lo:1000,h3000lo:2000,h1800lo:4500,h1500lo:5500,h1000lo:7500,h900lo:9000,h3600hi:500,h3000hi:750,h1800hi:1500,h1500hi:2000,h1000hi:3000,h900hi:3500}
]);

function parsePoles(text=''){
 const u=norm(text);
 const m=u.match(/(?:M2AA|M3AA|M2CA|M2BAX|M2BA|M2QA|M2VA)\s*\d{2,3}[A-Z]{0,4}(2|4|6|8)\b/);
 if(m)return Number(m[1]);
 const tz=u.match(/\b1TZ[59]\d*[- ]?3A([A-D])/);if(tz)return ({A:2,B:4,C:6,D:8})[tz[1]]||null;
 const m2=u.match(/\b(2|4|6|8)\s*(?:P|POLE|POLES|ПОЛ)/i);if(m2)return Number(m2[1]);
 const rpm=parseRpm(text);if(rpm){if(rpm>=2400)return 2;if(rpm>=1200)return 4;if(rpm>=800)return 6;if(rpm>=600)return 8;}
 return null;
}
function nominalRpmFromPoles(poles){return ({2:3000,4:1500,6:1000,8:750})[Number(poles)]||null}
function abbBearingConstruction(text=''){
 const u=norm(text),family=detectFamily(text),frame=parseFrame(text),poles=parsePoles(text);
 if(!family||!frame)return null;
 const out={family,frame,poles,de:null,nde:null,standardPolicy:'REVIEW',relubeOption:false,regreasableStandard:false,sourceIds:[],confidence:'OEM_FAMILY'};
 if(family==='M2VA'){
   const t={56:['6201-2Z/C3','6201-2Z/C3'],63:['6202-2Z/C3','6201-2Z/C3'],71:['6203-2Z/C3','6202-2Z/C3'],80:['6204-2Z/C3','6203-2Z/C3']};
   if(t[frame]){[out.de,out.nde]=t[frame];out.standardPolicy='NO_ROUTINE_RELUBE';out.sourceIds=[SOURCES.ABB_GPM];out.confidence='A — OEM frame table';out.note='Permanent grease lubrication in ABB catalogue.';return out;}
 }
 if(family==='M2AA'){
   const basic={80:['6204-2Z/C3','6203-2Z/C3'],90:['6205-2Z/C3','6204-2Z/C3'],100:['6306-2Z/C3','6205-2Z/C3'],160:['6309-2Z/C3','6209-2Z/C3'],180:['6310-2Z/C3','6209-2Z/C3']};
   if(basic[frame])[out.de,out.nde]=basic[frame];
   if(frame===112){out.de='6206-2Z/C3';out.nde=/112\s*M4\b/.test(u)?'6205-2Z/C3':'6206-2Z/C3';}
   if(frame===132){out.de='6208-2Z/C3';out.nde=/(132\s*(?:SA2|SB2|S4|M4))\b/.test(u)?'6206-2Z/C3':'6208-2Z/C3';}
   if(frame===200){out.de='6312-2Z/C3';out.nde='6209-2Z/C3';}
   if(out.de){out.standardPolicy='SEALED_DEFAULT_OPTIONAL_RELUBE';out.relubeOption=frame>=90;out.sourceIds=[SOURCES.ABB_GPM];out.confidence='A — OEM model/frame table';out.note=out.relubeOption?'Standard shielded bearings; regreasing is an ABB option and must be confirmed on the actual motor.':'Standard shielded/permanently lubricated bearings.';return out;}
 }
 if(family==='M3AA'){
   if(frame===132){out.de='6208-2Z/C3';out.nde=/(132\s*(?:SA2|S4|S6|MA6|MB6|S8|M8))\b/.test(u)?'6206-2Z/C3':'6208-2Z/C3';out.standardPolicy='NO_ROUTINE_RELUBE';out.sourceIds=[SOURCES.ABB_GPM];out.confidence='A/B — OEM family table';out.note='Shielded bearings / permanent grease for this frame family.';return out;}
   const t={160:['6309-2Z/C3','6209-2Z/C3'],180:['6310-2Z/C3','6209-2Z/C3'],200:['6312-2Z/C3','6210-2Z/C3'],225:['6313-2Z/C3','6212-2Z/C3'],250:['6315-2Z/C3','6213-2Z/C3']};
   if(t[frame]){[out.de,out.nde]=t[frame];out.standardPolicy='NO_ROUTINE_RELUBE';out.sourceIds=[SOURCES.ABB_M3AA];out.confidence='A — OEM frame table';out.note='ABB M3AA 160–250: permanently lubricated shielded bearings in cited catalogue.';return out;}
   if(frame===280){out.de=(poles===2?'6315/C3':'6316/C3');out.nde='6213/C3';out.standardPolicy='REGREASEABLE_STANDARD';out.regreasableStandard=true;out.sourceIds=[SOURCES.ABB_M3AA,SOURCES.ABB_MANUAL];out.confidence='A/B — OEM frame table + method';out.note='ABB M3AA frame 280 is regreasable in cited catalogue; rating plate remains authoritative for exact bearing variant.';return out;}
 }
 if(family==='M2CA'&&(frame===280||frame===315)){
   if(frame===280){out.de=poles===2?'6316/C4':'6316/C3';out.nde=poles===2?'6316/C4':'6316/C3';}
   if(frame===315){out.de=poles===2?'6316/C4':'6319/C3';out.nde=poles===2?'6316/C4':'6316/C3';}
   out.standardPolicy='REGREASEABLE_STANDARD';out.regreasableStandard=true;out.sourceIds=[SOURCES.ABB_STEEL,SOURCES.ABB_MANUAL];out.confidence='A — OEM series/frame table';out.note='M2CA steel motors: regreasing nipples are standard; bearing type depends on frame and pole count.';return out;
 }
 if(family==='M2BAX'&&(frame===280||frame===315||frame===355)){
   if(frame===280){out.de='6316/C3';out.nde='6316/C3';}
   else if(frame===315){out.de=poles===2?'6217/C3':'6219/C3';out.nde='6217/C3';}
   else {out.de='6316/C3';out.nde='6217/C3';}
   out.standardPolicy='REGREASEABLE_STANDARD';out.regreasableStandard=true;out.sourceIds=[SOURCES.ABB_M2BAX,SOURCES.ABB_MANUAL];out.confidence='A/B — OEM current catalogue + lubrication method';out.note='M2BAX 280–355: regreasable bearings with OEM grease nipples. Exact delivered motor/rating plate remains authoritative for special variants.';return out;
 }
 if(family==='M2QA'&&frame<=132){out.standardPolicy='NO_ROUTINE_RELUBE';out.sourceIds=[SOURCES.ABB_MARINE];out.confidence='A — OEM family construction';out.note='M2QA 71–132: sealed 2RS bearings; routine relubrication is not intended. Exact bearing designation should be read from the rating plate.';return out;}
 return out;
}


function sewLegacyBearingConstruction(text=''){
 const u=norm(text),family=detectFamily(text),frame=parseFrame(text);
 if(!['DR','DT','DV'].includes(family)||!frame)return null;
 if(/(?:\/NS\b|\bERF\b)/.test(u))return {family,frame,de:null,nde:null,standardPolicy:'EXACT_OPTION_REQUIRED',sourceIds:[SOURCES.SEW_LEGACY],confidence:'B — OEM legacy family table',note:'SEW /NS or /ERF option can use open/regreasable or roller-bearing construction; exact option/manual is required.'};
 let de=null,nde=null;
 if(family==='DR'&&frame===63){de='6303-2Z-J (gearmotor)';nde='6202-2Z-J';}
 else if(family==='DT'&&frame>=71&&frame<=80){de='6303 2RS J C3 (gearmotor)';nde='6203 2RS J C3';}
 else if((family==='DT'&&frame===90)||(family==='DV'&&frame===100)){de='6306 2RS J C3';nde='6205 2RS J C3';}
 else if(family==='DV'&&frame>=112&&frame<=132){de=frame===132?'6307 2RS J C3':'6307 2RS J C3';nde='6207 2RS J C3';}
 else if(family==='DV'&&frame>=132&&frame<=160){de='6309 2RS J C3';nde='6209 2RS J C3';}
 else if(family==='DV'&&frame>=160&&frame<=180){de='6312 2RS J C3';nde='6213 2RS J C3';}
 else if(family==='DV'&&frame>=200&&frame<=225){de='6314 2RS J C3';nde='6314 2RS J C3';}
 else if(family==='DV'&&frame>=250&&frame<=280){de='6316 2RS J C3';nde='6315 2RS J C3';}
 if(!de)return null;
 return {family,frame,de,nde,standardPolicy:'NO_ROUTINE_RELUBE',sourceIds:[SOURCES.SEW_LEGACY],confidence:'A/B — OEM legacy bearing table',note:'Standard legacy SEW gearmotor/motor construction uses sealed/shielded 2Z/2RS bearings; routine relubrication is not assigned. Special /NS or /ERF variants are excluded from this rule.'};
}

function siemensBearingConstruction(text=''){
 const u=norm(text),family=detectFamily(text),frame=parseFrame(text),poles=parsePoles(text);
 if(family!=='1LE'||!frame)return null;
 const t={63:['6201 2ZC3','6201 2ZC3'],71:['6202 2ZC3','6202 2ZC3'],80:['6004 2ZC3','6004 2ZC3'],90:['6205 2ZC3','6004 2ZC3'],100:['6206 2ZC3','6206 2ZC3'],112:['6206 2ZC3','6206 2ZC3'],132:['6208 2ZC3','6208 2ZC3'],160:['6209 2ZC3','6209 2ZC3'],180:['6210 2ZC3','6210 2ZC3'],200:['6212 2ZC3','6212 2ZC3']};
 if(!t[frame]||frame>250)return null;
 return {family,frame,poles,de:t[frame][0],nde:t[frame][1],standardPolicy:'SEALED_DEFAULT_OPTIONAL_RELUBE',relubeOption:true,sourceIds:[SOURCES.SIEMENS_D81,SOURCES.SIEMENS_1LE],confidence:'A/B — OEM planning table + OEM procedure',note:'Basic 1LE1 version uses permanently lubricated bearings. If an actual motor has the regreasing option/system, the lubrication plate of that motor is authoritative for amount, grease and interval.'};
}
function lammersBearingConstruction(text=''){
 const u=norm(text),family=detectFamily(text),frame=parseFrame(text),poles=parsePoles(text);
 if(!/^1TZ[59]$/.test(family||'')||!frame)return null;
 const out={family,frame,poles,de:null,nde:null,standardPolicy:'REVIEW',regreasableStandard:false,sourceIds:[SOURCES.LAMMERS_1TZ],confidence:'A — OEM catalogue'};
 if(family==='1TZ9'){
  const fixed={63:['6201 2Z C3','6201 2Z C3'],71:['6202 2Z C3','6202 2Z C3'],80:['6204 2Z C3','6004 2Z C3'],90:['6205 2Z C3','6004 2Z C3'],100:['6306 2Z C3','6306 2Z C3'],112:['6306 2Z C3','6306 2Z C3'],132:['6308 2Z C3','6308 2Z C3'],160:['6309 2Z C3','6309 2Z C3'],180:['6310 Z C3','6310 Z C3'],200:['6312 Z C3','6312 Z C3'],225:['6313 Z C3','6313 Z C3'],250:['6315 Z C3','6315 Z C3']};
  if(fixed[frame]){[out.de,out.nde]=fixed[frame];out.standardPolicy='NO_ROUTINE_RELUBE';out.note='1TZ9 up to frame 250: permanent lubrication in the Lammers catalogue; bearing grease life depends on pole count and operating context.';return out;}
  if(frame===280){out.de=out.nde=poles===2?'6315 C3':'6317 C3';out.standardPolicy='REGREASEABLE_STANDARD';out.regreasableStandard=true;out.note='1TZ9 frame 280: open bearings with regreasing device. Catalogue baseline applies at coolant temperature up to 40 °C; motor relubrication plate remains authoritative.';return out;}
  if(frame===315){out.de=out.nde=poles===2?'6316 C3':'6319 C3';out.standardPolicy='REGREASEABLE_STANDARD';out.regreasableStandard=true;out.note='1TZ9 frame 315: open bearings with regreasing device. Catalogue baseline applies at coolant temperature up to 40 °C; motor relubrication plate remains authoritative.';return out;}
 }
 if(family==='1TZ5'&&(frame===315||frame===355)){
  if(frame===315)out.de=out.nde=poles===2?'6316 C4':'6319 C4';else out.de=out.nde=poles===2?'6317 C4':'6320 C4';
  out.standardPolicy='MACHINE_PLATE';out.note='1TZ5 frame 315/355: Lammers explicitly requires interval and quantity from the lubrication plate.';return out;
 }
 return out;
}
function lammersRelube({family,frame,poles}={}){
 if(family!=='1TZ9')return null;
 const f=Number(frame),p=Number(poles);
 if(f===280){return p===2?{doseG:25,intervalHours:4000}:{doseG:30,intervalHours:8000,doseRange:'25–30'};}
 if(f===315){return p===2?{doseG:30,intervalHours:3000}:{doseG:40,intervalHours:6000};}
 return null;
}
function parseFrame(text=''){
 const u=norm(text);
 const known=u.match(/(?:M2AA|M3AA|M2CA|M2BAX|M2BA|M2QA|M2VA|DRE|DRS|DRN|DR|DT|DV|WK)\s*[-_ ]?(\d{2,3})/);
 if(known)return Number(known[1]);
 const generic=u.match(/\b(63|71|80|90|100|112|132|160|180|200|225|250|280|315|355|400|450)\s*[A-ZА-Я]/);
 return generic?Number(generic[1]):null;
}
function parseRpm(text=''){
 const u=norm(text);
 // Speed must be backed by an explicit speed unit. This prevents strings such as
 // "N=160 kW n=2982 min-1" from being parsed as 160 rpm.
 const m=u.match(/(?:\bN\s*=\s*)?(\d{3,5})\s*(?:ОБ\/МИН|ОБ\.\/МИН|МИН\s*[-−]?\s*1|MIN\s*[-−]?\s*1|R\/MIN|RPM)/i);
 return m?Number(m[1]):null;
}
function parsePowerKw(text=''){
 const u=norm(text);
 // Power is accepted only when followed by a power unit; bare N= is not enough.
 const m=u.match(/(?:\b(?:P|PN|N)\s*=\s*)?(\d+(?:\.\d+)?)\s*(?:КВТ|KW)/i);
 return m?number(m[1]):null;
}
function parseMount(text=''){const u=norm(text);const m=u.match(/\b(?:IM)?B(3|5|14|35)\b/);return m?'B'+m[1]:''}
function detectManufacturer(text=''){
 const u=norm(text);
 if(/\bM2AA\b|\bM3AA\b|\bM2CA\b|\bM2BAX\b|\bM2BA\b|\bM2QA\b|\bM2VA\b/.test(u))return'ABB';
 if(/(?:DRE|DRS|DRN)\d|\bSEW\b|(?:^|\s)(?:R|RX|K|KH|KA|KF|FH|FT|SF|SA|S)\d+[^ ]*(?:DR|DT|DV)\d/.test(u))return'SEW-EURODRIVE';
 if(/\bMVE\s*\d/.test(u))return'OLI';
 if(/\b1TZ[59]\d|LAMMERS/.test(u))return'LAMMERS';
 if(/\b1LE\d|\b1LA\d|\b1LG\d|SIEMENS|INNOMOTICS/.test(u))return'SIEMENS/INNOMOTICS';
 if(/\bWK\s*\d/.test(u))return'EMOD';
 if(/\bHQL\s*160/.test(u)||/OEMER/.test(u))return'OEMER';
 if(/\b138I\b|INTERROLL/.test(u))return'INTERROLL';
 if(/ERCOLE\s+MARELLI|\bMA\s*132/.test(u))return'ERCOLE MARELLI';
 if(/\b3HAC\d/.test(u))return'ABB ROBOTICS';
 return'';
}
function detectFamily(text=''){
 const u=norm(text);
 for(const f of ['M2AA','M3AA','M2CA','M2BAX','M2BA','M2QA','M2VA'])if(u.includes(f))return f;
 if(/DRE\d/.test(u))return'DRE';if(/DRS\d/.test(u))return'DRS';if(/DRN\d/.test(u))return'DRN';if(/DV\d/.test(u))return'DV';if(/DT\d/.test(u))return'DT';if(/DR\d/.test(u))return'DR';
 if(/\bMVE\s*\d/.test(u))return'MVE';
 if(/\b1LE\d/.test(u))return'1LE';if(/\b1LA\d/.test(u))return'1LA';if(/\b1LG\d/.test(u))return'1LG';if(/\b1TZ9\d/.test(u))return'1TZ9';if(/\b1TZ5\d/.test(u))return'1TZ5';
 if(/\bWK\s*\d/.test(u))return'WK';if(/\bHQL\s*160/.test(u))return'HQL';if(/\b138I\b/.test(u))return'138I';if(/\b3HAC\d/.test(u))return'3HAC';
 return'';
}
function parseModel(text=''){
 const u=String(text||'').replace(/Линия\s*№?\s*[12]/ig,'').replace(/^\s*(Электродвигатель|Вибромотор)\s*/i,'').trim();return u;
}

function oemerHqlBearingConstruction(text=''){
 const u=norm(text),frame=parseFrame(text);if(!/\bHQL\s*160/.test(u)||frame!==160)return null;
 return {family:'HQL',frame:160,de:'6312ZZC3',nde:'6311ZZC3',standardPolicy:'NO_ROUTINE_RELUBE',sourceIds:[SOURCES.OEMER_HQL],confidence:'B/C — OEM construction + maintenance inference',note:'OEMER HQL 160 standard catalogue lists shielded DE 6312ZZC3 and NDE 6311ZZC3. The HQL 80–160 exploded view has no grease valves, unlike HQL/HQLa 180–280. LUBRICA therefore treats the standard HQL160 construction as no routine relubrication; special/TBH/roller options require exact motor evidence.'};
}
function interroll138Policy(text=''){
 const u=norm(text);if(!/\b138I\b/.test(u))return null;
 return {family:'138I',standardPolicy:'NO_ROUTINE_RELUBE',sourceIds:[SOURCES.INTERROLL_138I],confidence:'A — OEM product data',note:'Interroll 138i drum motor is maintenance-free and lifetime lubricated. No bearing relubrication task is created.'};
}

function resolve(text=''){
 const raw=String(text||''),u=norm(raw),manufacturer=detectManufacturer(raw),family=detectFamily(raw),frame=parseFrame(raw),rpm=parseRpm(raw),powerKw=parsePowerKw(raw),mount=parseMount(raw),model=parseModel(raw);
 if(manufacturer==='OLI'&&family==='MVE')return {manufacturer,family,frame,rpm:rpm||1500,powerKw,mount,model,status:'SEALED_FOR_LIFE',policy:'NO_ROUTINE_RELUBE',confidence:'OEM_EXACT_FAMILY',sourceIds:[SOURCES.OLI_MVE],reason:'OLI MVE Standard Range: greased for life; zero routine maintenance. Exact label remains authoritative for special applications.'};
 if(manufacturer==='SEW-EURODRIVE'&&['DRE','DRS','DRN'].includes(family)&&frame&&frame<=280)return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'SEALED_FOR_LIFE',policy:'NO_ROUTINE_RELUBE',confidence:'OEM_FAMILY',sourceIds:[SOURCES.SEW_DR],reason:'SEW DR.71–280 uses sealed 2Z/2RS bearings that cannot be relubricated.'};
 if(manufacturer==='SEW-EURODRIVE'&&['DR','DT','DV'].includes(family)){ const bc=sewLegacyBearingConstruction(raw); if(bc?.standardPolicy==='NO_ROUTINE_RELUBE')return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'SEALED_FOR_LIFE',policy:'NO_ROUTINE_RELUBE',confidence:bc.confidence,sourceIds:bc.sourceIds,bearingConstruction:bc,reason:bc.note}; return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'LEGACY_EXACT_OEM_REQUIRED',policy:'EXACT_OEM_ONLY',confidence:'IDENTIFIED_LEGACY_FAMILY',sourceIds:bc?.sourceIds||[SOURCES.SEW_LEGACY],bearingConstruction:bc,reason:bc?.note||'SEW legacy DR/DT/DV motor identified, but exact legacy construction is not resolved. Exact legacy manual or motor plate is required.'}; }
 if(manufacturer==='ABB'){
   const bc=abbBearingConstruction(raw);const effectiveRpm=rpm||nominalRpmFromPoles(bc?.poles);const src=[...new Set([...(bc?.sourceIds||[]),SOURCES.ABB_MANUAL])];
   if(bc?.standardPolicy==='NO_ROUTINE_RELUBE')return {manufacturer,family,frame,rpm:effectiveRpm,powerKw,mount,model,status:'SEALED_FOR_LIFE',policy:'NO_ROUTINE_RELUBE',confidence:bc.confidence,sourceIds:src,bearingConstruction:bc,reason:bc.note};
   if(bc?.standardPolicy==='REGREASEABLE_STANDARD')return {manufacturer,family,frame,rpm:effectiveRpm,powerKw,mount,model,status:'REGREASEABLE_STANDARD',policy:'ABB_L1_STANDARD',confidence:bc.confidence,sourceIds:src,bearingConstruction:bc,reason:bc.note};
   if(bc?.standardPolicy==='SEALED_DEFAULT_OPTIONAL_RELUBE')return {manufacturer,family,frame,rpm:effectiveRpm,powerKw,mount,model,status:'SEALED_DEFAULT_OPTIONAL_RELUBE',policy:'CONFIRM_NIPPLE',confidence:bc.confidence,sourceIds:src,bearingConstruction:bc,reason:bc.note};
   return {manufacturer,family,frame,rpm:effectiveRpm,powerKw,mount,model,status:'REVIEW_REQUIRED',policy:'CONFIRM_CONSTRUCTION',confidence:'OEM_FAMILY',sourceIds:src,bearingConstruction:bc,reason:'ABB family recognized; exact bearing construction/option must be confirmed before assigning a relubrication cycle.'};
 }
 if(manufacturer==='SIEMENS/INNOMOTICS'){
   const bc=siemensBearingConstruction(raw);const src=[...new Set([SOURCES.SIEMENS_1LE,SOURCES.SIEMENS_D81,...(bc?.sourceIds||[])])];
   if(bc)return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'SEALED_DEFAULT_OPTIONAL_RELUBE',policy:'CONFIRM_NIPPLE',confidence:bc.confidence,sourceIds:src,bearingConstruction:bc,reason:bc.note};
   return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'PLATE_REQUIRED',policy:'MACHINE_PLATE',confidence:'OEM_PROCEDURE',sourceIds:src,reason:'For motors equipped for relubrication, use the lubricant amount/type and interval from the motor lubrication plate or exact manual. Unsupported/older Siemens families are not assigned a numeric cycle from another series.'};
 }
 if(manufacturer==='LAMMERS'){
   const bc=lammersBearingConstruction(raw);const src=[SOURCES.LAMMERS_1TZ];const effectivePoles=bc?.poles||parsePoles(raw);const effectiveRpm=rpm||nominalRpmFromPoles(effectivePoles);
   if(bc?.standardPolicy==='NO_ROUTINE_RELUBE')return {manufacturer,family,frame,rpm:effectiveRpm,powerKw,mount,model,status:'SEALED_FOR_LIFE',policy:'NO_ROUTINE_RELUBE',confidence:bc.confidence,sourceIds:src,bearingConstruction:bc,reason:bc.note};
   if(bc?.standardPolicy==='REGREASEABLE_STANDARD')return {manufacturer,family,frame,rpm:effectiveRpm,powerKw,mount,model,status:'REGREASEABLE_STANDARD',policy:'LAMMERS_1TZ9_STANDARD',confidence:bc.confidence,sourceIds:src,bearingConstruction:bc,reason:bc.note};
   return {manufacturer,family,frame,rpm:effectiveRpm,powerKw,mount,model,status:'PLATE_REQUIRED',policy:'MACHINE_PLATE',confidence:'OEM_PROCEDURE',sourceIds:src,bearingConstruction:bc,reason:bc?.note||'Lammers family identified; use exact motor plate/manual when catalogue row is not sufficient.'};
 }
 if(manufacturer==='EMOD')return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'PLATE_REQUIRED_HIGH_SPEED',policy:'MACHINE_PLATE',confidence:'IDENTIFIED_NO_NUMERIC_OEM',sourceIds:[SOURCES.EMOD_WK],reason:'EMOD WK identified, but the localized official standard WK data does not validate the special high-speed 6700/9000 rpm fleet variants. High-speed 6700/9000 rpm units must not use a silent universal interval.'};
 if(manufacturer==='OEMER'&&family==='HQL'){const bc=oemerHqlBearingConstruction(raw);if(bc)return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'SEALED_FOR_LIFE',policy:'NO_ROUTINE_RELUBE',confidence:bc.confidence,sourceIds:bc.sourceIds,bearingConstruction:bc,reason:bc.note};return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'EXACT_OEM_REQUIRED',policy:'EXACT_OEM_ONLY',confidence:'OEM_FAMILY',sourceIds:[SOURCES.OEMER_HQL],reason:'OEMER HQL identified, but this frame/option is not covered by the localized standard HQL160 construction.'};}
 if(manufacturer==='INTERROLL'&&family==='138I'){const bc=interroll138Policy(raw);return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'SEALED_FOR_LIFE',policy:'NO_ROUTINE_RELUBE',confidence:bc.confidence,sourceIds:bc.sourceIds,bearingConstruction:bc,reason:bc.note};}
 if(manufacturer==='ERCOLE MARELLI')return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'EXACT_OEM_REQUIRED',policy:'EXACT_OEM_ONLY',confidence:'OEM_IDENTIFIED_NO_LOCAL_METHOD',sourceIds:[],reason:'Ercole Marelli manufacturer identified, but no exact lubrication method for this legacy designation is localized. Use rating plate / exact motor manual.'};
 if(manufacturer==='ABB ROBOTICS')return {manufacturer,family,frame,rpm,powerKw,mount,model,status:'SPECIAL_ASSEMBLY',policy:'EXACT_OEM_ONLY',confidence:'PART_NUMBER_ONLY',sourceIds:[],reason:'ABB Robotics 3HAC part-number motor/axis assembly is not treated as a generic IEC motor.'};
 return {manufacturer:manufacturer||'НЕ ОПРЕДЕЛЁН',family,frame,rpm,powerKw,mount,model,status:'UNKNOWN',policy:'REQUIRE_IDENTIFICATION',confidence:'UNKNOWN',sourceIds:[],reason:'Производитель/серия не подтверждены. Числовая OEM-методика автоматически не назначается.'};
}
function nearestSpeedKey(rpm){if(!(rpm>0))return null;const speeds=[3600,3000,1800,1500,1000,900];let best=speeds[0];for(const s of speeds)if(Math.abs(s-rpm)<Math.abs(best-rpm))best=s;return 'h'+best}
function abbL1({frame,rpm,powerKw,bearingType='ball',family=''}={}){
 const f=Number(frame),fam=String(family||'').toUpperCase(),key=nearestSpeedKey(Number(rpm));if(!key)return {row:null,greaseG:null,intervalHours:null,error:'Нужны рабочие обороты'};
 const speed=Number(key.slice(1));
 if((f===280||f===315)){
   let g=null,interval=null;
   if(bearingType==='roller'){
     if(f===280&&fam==='M3AA'){g=speed>=3000?60:70;interval=({3600:1000,3000:1750,1800:4000,1500:5250,1000:7000,900:8500})[speed]??null;}
     else if(f===280){g=speed>=3000?35:40;interval=({3600:900,3000:1600,1800:4000,1500:5300,1000:7000,900:8500})[speed]??null;}
     else {g=speed>=3000?35:55;interval=({3600:900,3000:1600,1800:2900,1500:3800,1000:5900,900:6500})[speed]??null;}
   }else{
     if(f===280&&fam==='M3AA'){g=60;interval=({3600:2000,3000:3500,1800:8000,1500:10500,1000:14000,900:17000})[speed]??null;}
     else if(f===280){g=speed>=3000?35:40;interval=({3600:1900,3000:3200,1800:7800,1500:9600,1000:13900,900:15000})[speed]??null;}
     else {g=speed>=3000?35:55;interval=({3600:1900,3000:3200,1800:5900,1500:7600,1000:11800,900:12900})[speed]??null;}
   }
   return {row:{frame:f,g},greaseG:g,intervalHours:interval,speedKey:key,band:'all',sourceId:SOURCES.ABB_MANUAL};
 }
 const rows=bearingType==='roller'?ABB_ROLLER_L1:ABB_BALL_L1,row=rows.find(x=>x.frame===f);if(!row)return null;
 let interval=row[key]??null,band='all';
 if(interval==null&&row[key+'lo']!=null){const speed=Number(key.slice(1));const threshold=speed>=3000?row.maxKw3600:speed>=1500?row.maxKw1800:row.maxKw1000;if(powerKw==null)return {row,greaseG:row.g,intervalHours:null,error:'Для этой строки ABB нужна мощность двигателя, кВт',speedKey:key};const low=Number(powerKw)<=Number(threshold);interval=row[key+(low?'lo':'hi')];band=low?`≤ ${threshold} кВт`:`> ${threshold} кВт`;}
 return {row,greaseG:row.g,intervalHours:interval,speedKey:key,band,sourceId:SOURCES.ABB_MANUAL};
}
const INVENTORY_SUMMARY=Object.freeze({records:240,uniqueNormalized:62,families:Object.freeze({ABB:127,OLI_MVE:24,QCA_QL_HQL_UNKNOWN:24,EMOD_WK:16,SIEMENS_INNOMOTICS:13,SEW_DRE:5,ABB_ROBOTICS:4,BA_BN_UNKNOWN:3,ERCOLE_MARELLI:1,GENERIC_NO_MODEL:5,OTHER_UNKNOWN:18})});
global.LubricaMotorOEM=Object.freeze({SOURCES,ABB_BALL_L1,ABB_ROLLER_L1,resolve,abbL1,abbBearingConstruction,sewLegacyBearingConstruction,siemensBearingConstruction,lammersBearingConstruction,lammersRelube,oemerHqlBearingConstruction,interroll138Policy,parseFrame,parsePoles,parseRpm,parsePowerKw,detectManufacturer,detectFamily,INVENTORY_SUMMARY});
global.LubricaSystem?.registerModule?.('Motor OEM Data','ok','ABB · SEW · OLI · Siemens/Innomotics · Lammers · EMOD · OEMER · Interroll');
})(window);
