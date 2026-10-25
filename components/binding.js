(function(global){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toUpperCase().replace(/Ё/g,'Е').replace(/[–—]/g,'-').replace(/[^A-ZА-Я0-9]+/g,' ').trim();

const libraryCategoryMap=Object.freeze({
  bearing:'bearing',
  linear_bearing:'linear_bearing',
  ball_screw:'ball_screw',
  chain:'chain',
  gearbox_oil:'gearbox_oil',
  coupling:'coupling',
  bushing:'bushing',
  joint:'joint',
  guide:'guide',
  screw:'screw_drive',
  screw_drive:'screw_drive',
  open_gear:'open_gear',
  rope:'wire_rope',
  wire_rope:'wire_rope',
  oil_system:'oil_system',
  central_point:'central_point',
  other:'other'
});
function libraryCategory(pointCategory){return libraryCategoryMap[pointCategory]||pointCategory||'other'}
function db(){return global.LubricaCore?.State?.getDatabase?.()}
function entryById(id,category='all'){
  if(!id)return null;
  return global.LubricaComponents?.all?.(category)?.find(x=>String(x.id)===String(id))||null;
}
function designationScore(text,entry){
  const t=norm(text),designation=norm(entry.designation||entry.model||'');
  if(!t||!designation)return 0;
  if(t===designation)return 1;
  if(t.includes(designation))return designation.length>=4?.98:.9;
  const tokens=designation.split(' ').filter(x=>x.length>=2);
  if(tokens.length&&tokens.every(x=>t.includes(x)))return .88;
  return 0;
}
function canonicalGearboxOemName(v=''){
  const u=String(v||'').toUpperCase().replace(/Ё/g,'Е');
  if(/SEW\s*[- ]?EURODRIVE|\bSEW\b/.test(u))return 'SEW-EURODRIVE';
  if(/BONFIGLIOLI/.test(u))return 'BONFIGLIOLI';
  if(/BREVINI|DANA\s+BREVINI/.test(u))return 'BREVINI RIDUTTORI';
  if(/LENZE/.test(u))return 'LENZE';
  if(/ROSSI/.test(u))return 'ROSSI';
  if(/TANDLER/.test(u))return 'TANDLER';
  if(/ZIMM/.test(u))return 'ZIMM';
  if(/UNIMEC/.test(u))return 'UNIMEC';
  if(/UNIT\s*DRIVE|ПТЦ\s*[«\"]?ПРИВОД|ООО\s+ПТЦ/.test(u))return 'UNIT DRIVE';
  if(/\bABB\b|NABTESCO/.test(u))return 'ABB';
  return '';
}
function normalizeGearboxFamily(v=''){return String(v||'').toUpperCase().replace(/[^A-Z0-9]+/g,'')}
function gearboxFamilyHint(text=''){
  const u=String(text||'').toUpperCase().replace(/Ё/g,'Е').replace(/[–—]/g,'-').replace(/,/g,'.');
  let m;
  // Compound and extended SEW families must be checked before shorter K/R/S tokens.
  m=u.match(/(?:^|[^A-Z0-9])(KF\s*\d{2,3}\s*R\s*\d{2,3})(?=[^A-Z0-9]|D|$)/);
  if(m)return {oem:'SEW-EURODRIVE',family:normalizeGearboxFamily(m[1])};
  m=u.match(/(?:^|[^A-Z0-9])((?:PSF|KHF|KA|KF|KH|RF|SA|RX|FH|FT|SF|R|S|K)\s*\d{2,3}B?)(?=[^0-9]|$)/);
  if(m)return {oem:'SEW-EURODRIVE',family:normalizeGearboxFamily(m[1])};
  m=u.match(/(?:^|[^A-Z0-9])([CAF]\s*\d{3})(?=[^A-Z0-9]|$)/);
  if(m)return {oem:'BONFIGLIOLI',family:normalizeGearboxFamily(m[1])};
  m=u.match(/(?:^|[^A-Z0-9])(MVF\s*\d{2,3}|MW\s*\d{2,3}|W\s*\d{2,3}|RAN\s*\d{2,3})(?=[^A-Z0-9]|$)/);
  if(m)return {oem:'BONFIGLIOLI',family:normalizeGearboxFamily(m[1])};
  if(/(?:^|[^A-Z0-9])301\s*L2(?=[^A-Z0-9]|$)/.test(u))return {oem:'BONFIGLIOLI',family:'301L2'};
  m=u.match(/(?:^|[^A-Z0-9])(SL\s*\d{4})(?=[^0-9]|$)/);
  if(m)return {oem:'BREVINI RIDUTTORI',family:normalizeGearboxFamily(m[1])};
  m=u.match(/(?:^|[^A-Z0-9])((?:GST|GKS)\s*\d{2})(?=[^A-Z0-9]|$)/);
  if(m)return {oem:'LENZE',family:normalizeGearboxFamily(m[1])};
  m=u.match(/(?:^|[^A-Z0-9])(MRIV|MRV)\s*(\d{2,3})(?=[^A-Z0-9]|U|$)/);
  if(m)return {oem:'ROSSI',family:normalizeGearboxFamily(m[1]+m[2])};
  if(/(?:^|[^A-Z0-9])STD\s*B1(?=[^A-Z0-9]|$)/.test(u))return {oem:'TANDLER',family:'STDB1'};
  if(/(?:^|[^A-Z0-9])STD\s*E[АA]1(?=[^A-Z0-9А-Я]|$)/.test(u))return {oem:'TANDLER',family:'STDEA1UNCONFIRMED'};
  if(/(?:^|[^A-Z0-9])HW\s*A1(?=[^A-Z0-9]|$)/.test(u))return {oem:'TANDLER',family:'HWA1'};
  if(/Z\s*-?\s*50\s*-?\s*SN/.test(u))return {oem:'ZIMM',family:'Z50SN'};
  m=u.match(/(?:^|[^A-Z0-9])(XRC\s*54)(?=[^A-Z0-9]|$)/);
  if(m)return {oem:'UNIMEC',family:'XRC54'};
  m=u.match(/(?:^|[^A-Z0-9])(UD\s*-?\s*(?:RV|PC)\s*\d{3})(?=[^A-Z0-9]|$)/);
  if(m)return {oem:'UNIT DRIVE',family:normalizeGearboxFamily(m[1])};
  if(/\bRV\s*-?\s*\d{2,3}[A-Z]?[^\n]*3HAC\s*[- ]?\d/i.test(u))return {oem:'ABB',family:'ABBRV'};
  return null;
}
function gearboxTextIdentity(text=''){
  const explicitOem=canonicalGearboxOemName(text);
  const hint=gearboxFamilyHint(text);
  const inferredOem=hint?.oem||'';
  return {oem:explicitOem||inferredOem||'',explicitOem,inferredOem,family:hint?.family||'',conflict:!!(explicitOem&&inferredOem&&explicitOem!==inferredOem)};
}
function entryGearboxIdentity(entry){
  if(!entry)return {oem:'',family:''};
  const oem=canonicalGearboxOemName(entry.manufacturer||'');
  const family=normalizeGearboxFamily(entry.technicalData?.family||gearboxFamilyHint([entry.designation,entry.model,...(entry.aliases||[])].filter(Boolean).join(' '))?.family||entry.designation||entry.model||'');
  return {oem,family};
}
function parseBonfiglioliCSeries(text=''){
  const raw=String(text||'').toUpperCase().replace(/Ё/g,'Е').replace(/[–—]/g,'-').replace(/,/g,'.');
  const compact=raw.replace(/\s+/g,' ');
  let m=compact.match(/(?:^|[^A-Z0-9])C\s*(\d{2})\s*(\d)(?:[^A-Z0-9]|$)/);
  if(!m)m=compact.match(/(?:^|[^A-Z0-9])C(\d{2})(\d)(?:[^A-Z0-9]|$)/);
  if(!m)return null;
  const family=`C${m[1]}${m[2]}`;
  let execution='';
  const slash=compact.match(new RegExp(`${family}\\s*\\/\\s*([A-Z0-9]+)`));
  const spaced=compact.match(new RegExp(`C\\s*${m[1]}\\s*${m[2]}\\s+(UFB|UH\\d+|NH|U|P|NR)\\b`));
  if(slash)execution=slash[1];else if(spaced)execution=spaced[1];
  const ratioMatch=compact.match(/(?:1\s*[:\/]\s*|\bI\s*=\s*)(\d+(?:\.\d+)?)/);
  const adapterMatch=compact.match(/\bPAM\s*(\d{2,3})\b/)||compact.match(/\bP\s*(\d{2,3})\b/);
  return {manufacturer:'BONFIGLIOLI',family,series:'C',size:Number(m[1]),stages:Number(m[2]),execution,ratio:ratioMatch?Number(ratioMatch[1]):null,mountingPosition:inferGearboxMountingPosition(compact),adapter:adapterMatch?Number(adapterMatch[1]):null};
}
function gearboxIdentity(entry){
  if(!entry)return null;
  return parseBonfiglioliCSeries([entry.manufacturer,entry.designation,entry.model,...(entry.aliases||[])].filter(Boolean).join(' '));
}
function bestWithinEntries(text,entries=[]){
  let best=null,bestScore=0;
  for(const entry of entries){
    const score=global.LubricaComponentMatcher?.score?.(text,entry)??designationScore(text,entry);
    if(score>bestScore){best=entry;bestScore=score}
  }
  return {entry:best,score:bestScore};
}
function resolveStructuredGearbox(text,C){
  const identity=gearboxTextIdentity(text);
  if(identity.conflict){
    return {status:'unmatched',category:'gearbox_oil',entry:null,confidence:0,reason:`Конфликт производителя: в структуре указан ${identity.explicitOem}, а обозначение относится к семейству ${identity.inferredOem}. Автоматическая подстановка заблокирована.`,guarded:true,parsedGearbox:identity};
  }
  const parsed=parseBonfiglioliCSeries(text);
  if(parsed&&(!identity.oem||identity.oem==='BONFIGLIOLI')){
    const candidates=C.all('gearbox_oil').filter(e=>canonicalGearboxOemName(e.manufacturer)==='BONFIGLIOLI').map(entry=>({entry,id:gearboxIdentity(entry)})).filter(x=>x.id?.family===parsed.family);
    let best=null,bestScore=-1;
    for(const x of candidates){
      const q=x.id;let score=0.4;
      if(parsed.execution){if(q.execution===parsed.execution)score+=0.2;else continue}
      if(parsed.ratio!=null){if(q.ratio!=null&&Math.abs(q.ratio-parsed.ratio)<0.051)score+=0.2;else continue}
      if(parsed.mountingPosition){if(q.mountingPosition===parsed.mountingPosition)score+=0.1;else continue}
      if(parsed.adapter!=null){if(q.adapter===parsed.adapter)score+=0.1;else continue}
      if(score>bestScore){best=x.entry;bestScore=score}
    }
    if(best)return {status:bestScore>=.95?'matched':'suggested',category:'gearbox_oil',entry:best,confidence:Math.min(1,bestScore),reason:'Bonfiglioli C Series распознан по семейству, исполнению, передаточному отношению, монтажному положению и PAM'};
    return {status:'unmatched',category:'gearbox_oil',entry:null,confidence:0,reason:`Bonfiglioli ${parsed.family}${parsed.execution?'/'+parsed.execution:''} распознан, но точная запись исполнения отсутствует; чужое семейство не подставляется`,guarded:true,parsedGearbox:parsed};
  }
  if(!identity.oem&&!identity.family)return null;
  const sameOem=C.all('gearbox_oil').filter(e=>canonicalGearboxOemName(e.manufacturer)===identity.oem);
  if(identity.family){
    const sameFamily=sameOem.filter(e=>entryGearboxIdentity(e).family===identity.family);
    if(sameFamily.length){
      const r=bestWithinEntries(text,sameFamily);
      const entry=r.entry||sameFamily[0];
      const serviceDomain=String(entry?.technicalData?.serviceDomain||'gearbox_oil');
      if(serviceDomain!=='gearbox_oil'&&serviceDomain!=='lifetime_lubricated_gearbox')return {status:'unmatched',category:'gearbox_oil',entry:null,confidence:0,reason:`${identity.oem}: семейство ${identity.family} распознано, но относится к сервисному домену ${serviceDomain}; обычный gearbox_oil расчёт заблокирован.`,guarded:true,wrongDomain:true,serviceDomain,parsedGearbox:identity};
      const recognitionOnly=entry?.technicalData?.recognitionOnly===true;
      return {status:'matched',category:'gearbox_oil',entry,confidence:recognitionOnly?.97:Math.max(.97,r.score||0),reason:entry?.lubricationData?.maintenancePolicy==='lifetime_lubricated'?`${identity.oem}: семейство ${identity.family} распознано; заводская пожизненная смазка, периодический oil_change не требуется`:recognitionOnly?`${identity.oem}: семейство ${identity.family} распознано; OEM-объём требует подтверждения`:`${identity.oem}: обозначение и семейство ${identity.family} распознаны`,guarded:true,parsedGearbox:identity};
    }
    return {status:'unmatched',category:'gearbox_oil',entry:null,confidence:0,reason:`${identity.oem}: семейство ${identity.family} распознано, но записи в Справочнике нет; редуктор другого производителя не подставляется`,guarded:true,parsedGearbox:identity};
  }
  if(identity.oem){
    const r=bestWithinEntries(text,sameOem);
    if(r.entry&&r.score>=.8)return {status:r.score>=.95?'matched':'suggested',category:'gearbox_oil',entry:r.entry,confidence:r.score,reason:`Совпадение найдено только внутри OEM ${identity.oem}`,guarded:true,parsedGearbox:identity};
    return {status:'unmatched',category:'gearbox_oil',entry:null,confidence:0,reason:`Производитель ${identity.oem} распознан, но модель не найдена; cross-OEM подстановка запрещена`,guarded:true,parsedGearbox:identity};
  }
  return null;
}
function resolve(text,pointCategory){
  const category=libraryCategory(pointCategory),C=global.LubricaComponents;
  if(!C)return {status:'unmatched',category,entry:null,confidence:0};
  if(category==='gearbox_oil'){
    const structured=resolveStructuredGearbox(text,C);
    if(structured)return structured;
    return {status:'unmatched',category,entry:null,confidence:0,reason:'Производитель или типоразмер редуктора не определён; fuzzy-подстановка по общим словам и цифрам запрещена',guarded:true};
  }
  const advanced=global.LubricaComponentMatcher?.best?.(text,category);
  if(advanced?.entry&&advanced.confidence>=.8)return {...advanced,category,reason:advanced.status==='matched'?'Обозначение нормализовано и найдено в Справочнике':'Найдено вероятное совпадение после нормализации'};
  if(category==='bearing'&&global.LubricaBearings){
    const r=global.LubricaBearings.lookup(text||'');
    if(r?.parsed?.baseDesignation){
      const hit=(C.search?C.search(r.parsed.baseDesignation,'bearing'):C.all('bearing').filter(x=>String(x.designation).includes(r.parsed.baseDesignation))).find(x=>String(x.designation)===String(r.parsed.baseDesignation));
      if(hit)return {status:'matched',category,entry:hit,confidence:r.parsed.recognized?.99:.92,reason:'Обозначение подшипника распознано'};
    }
  }
  let best=null,bestScore=0;
  for(const x of C.all(category)){
    const score=designationScore(text,x);
    if(score>bestScore){best=x;bestScore=score}
  }
  if(bestScore>=.95)return {status:'matched',category,entry:best,confidence:bestScore,reason:'Точное обозначение найдено в Справочнике'};
  if(bestScore>=.8)return {status:'suggested',category,entry:best,confidence:bestScore,reason:'Найдено вероятное совпадение'};
  return {status:'unmatched',category,entry:null,confidence:0,reason:'Совпадение в Справочнике не найдено'};
}
function structuralText(record,equipment){
  return [record?.manufacturer,record?.brand,record?.name,record?.model,record?.designation,record?.externalCode,equipment?.manufacturer,equipment?.name].filter(Boolean).join(' ');
}
function mapChainType(v=''){
  const n=norm(v);if(n.includes('РОЛИК'))return'roller';if(n.includes('ВТУЛ'))return'bush';if(n.includes('КОНВЕЙ'))return'conveyor';if(n.includes('ПЛАСТИН'))return'leaf';return'other';
}
function mapLinearSubtype(v=''){
  const n=norm(v);if(n.includes('ВТУЛ'))return'linear_bushing';if(n.includes('РОЛИК'))return'profile_roller';if(n.includes('МОДУЛ'))return'linear_module';return'profile_ball';
}
function inferGearboxMountingPosition(text=''){
  let u=String(text||'').toUpperCase().replace(/[–—]/g,'-').replace(/(M[1-6])[A-Z](?=$|[\s\/;,_-])/g,'$1 ').replace(/(B\d)(?=PAM\b)/g,'$1 ');
  // SEW motor designations such as DRE100M4, DRE80 M4, DR63S4 encode motor frame/pole count,
  // not gearbox mounting position. Mask the motor token before looking for M1...M6.
  u=u.replace(/\b(?:DR(?:E|S|N|P|U|2C)?|DT|DV)\s*\d{2,3}\s*[A-Z]{0,2}\s*[2468](?=$|[\s\/;,_-])/g,' MOTOR ');
  if(/\bMVF\s*\d{2,3}\b/.test(u)){
    const tokens=[...u.matchAll(/(?:^|[\s\/;,_-])(B[0-9]|V[1-6]|H[1-6]|VA|VB)(?=$|[\s\/;,_-])/g)].map(m=>m[1]);
    if(tokens.length)return tokens[tokens.length-1];
  }
  const m=u.match(/(?:^|[\s\/;,_-])(M[1-6]|B[0-9]|V[1-6]|H[1-6]|VA|VB)(?=$|[\s\/;,_-])/);
  return m?m[1]:'';
}
function ambiguousPersistedSewMotorPosition(point,structural,currentPos){
  const pos=String(currentPos||'').toUpperCase();if(!/^M[1-6]$/.test(pos))return false;
  if(point?.gearboxOil?.mountingPositionSource==='user_confirmed')return false;
  const calc=point?.gearboxOil?.calculation||{};
  if(calc.appliedAt||calc.approvedFillLiters!=null||calc.mountingFillSelection)return false;
  // If a real gearbox mounting token exists after the SEW motor token is masked, keep it.
  if(inferGearboxMountingPosition(structural))return false;
  const u=String(structural||'').toUpperCase().replace(/[–—]/g,'-');
  const motorPole=[...u.matchAll(/\b(?:DR(?:E|S|N|P|U|2C)?|DT|DV)\s*\d{2,3}\s*[A-Z]{0,2}\s*([2468])(?=$|[\s\/;,_-])/g)].map(m=>`M${m[1]}`);
  return motorPole.includes(pos);
}
function mapCouplingType(v=''){
  const n=norm(v);if(n.includes('ЗУБ'))return'gear';if(n.includes('ЦЕП'))return'chain';if(n.includes('ПРУЖ')||n.includes('GRID'))return'grid';if(n.includes('ЭЛАСТ'))return'flexible_dry';return'other';
}
function applyTechnical(point,entry){
  if(!point||!entry)return point;
  const t=clone(entry.technicalData||{}),l=clone(entry.lubricationData||{});
  point.linkedTechnicalData=t;
  point.linkedLubricationData=l;
  if(point.category==='bearing'){
    const r=global.LubricaBearings?.lookup?.(entry.designation||entry.model||'');
    const p=r?.parsed;
    if(p?.baseDesignation){
      point.bearing={...(point.bearing||{}),structuralDesignation:point.bearing?.structuralDesignation||entry.designation||p.baseDesignation,effectiveDesignation:point.bearing?.actualDesignation||entry.designation||p.baseDesignation,baseDesignation:p.baseDesignation,d:p.dimensions?.d??t.d??point.bearing?.d??null,D:p.dimensions?.D??t.D??point.bearing?.D??null,B:p.dimensions?.B??t.B??point.bearing?.B??null,bearingType:entry.bearingType||t.bearingType||p.inferredType||point.bearing?.bearingType||'unknown',catalogId:entry.id,sourceType:entry.sourceType||'builtin'};
    }
  }else if(point.category==='chain'){
    point.chain={...(point.chain||{}),chainType:mapChainType(t.chainType),pitchMm:t.pitchMm??point.chain?.pitchMm??null,strandCount:t.strandCount??point.chain?.strandCount??1};
  }else if(point.category==='linear_bearing'){
    point.linearBearing={...(point.linearBearing||{}),subtype:mapLinearSubtype(t.subtype),manufacturer:entry.manufacturer||point.linearBearing?.manufacturer||'',model:entry.model||entry.designation||point.linearBearing?.model||'',unitCount:point.linearBearing?.unitCount||1};
  }else if(point.category==='ball_screw'){
    point.ballScrew={...(point.ballScrew||{}),manufacturer:entry.manufacturer||point.ballScrew?.manufacturer||'',model:entry.model||entry.designation||point.ballScrew?.model||'',screwDiameterMm:t.diameterMm??point.ballScrew?.screwDiameterMm??null,leadMm:t.leadMm??point.ballScrew?.leadMm??null};
  }else if(point.category==='gearbox_oil'){
    const structural=point.componentBinding?.structuralText||'';
    const persistedPos=point.gearboxOil?.mountingPosition||'';
    if(ambiguousPersistedSewMotorPosition(point,structural,persistedPos)){
      point.gearboxOil={...(point.gearboxOil||{}),mountingPosition:'',mountingPositionSource:'migration_cleared_motor_pole'};
    }
    const pos=point.gearboxOil?.mountingPosition||inferGearboxMountingPosition(structural)||t.mountingPosition||'';
    const options=pos&&Array.isArray(t.mountingFillOptionsLiters?.[pos])?t.mountingFillOptionsLiters[pos]:[];
    const fill=t.fixedFillLiters!=null?t.fixedFillLiters:(pos&&t.mountingFillLiters?.[pos]!=null?t.mountingFillLiters[pos]:t.oemFillLiters);
    const oil=entry.lubricationData?.recommendedOil||{};
    const previousCalc=point.gearboxOil?.calculation||{};
    const newRevision=String(t.fillRevisionId||'');
    const oldRevision=String(previousCalc.fillRevisionId||'');
    const oldFillSource=String(previousCalc.fillSource||'');
    const oldApproved=Number(previousCalc.approvedFillLiters);
    const oldApplied=Number(previousCalc.appliedFillLiters);
    const looksAutoManaged=Number.isFinite(oldApproved)&&oldApproved>0&&(
      (Number.isFinite(oldApplied)&&Math.abs(oldApplied-oldApproved)<1e-9)||
      !!previousCalc.provenance||
      /UNIT DRIVE|BONFIGLIOLI|OEM dataset/i.test(oldFillSource)
    );
    const revisionChanged=!!newRevision&&oldRevision!==newRevision;
    const migrateLegacyFill=(!!t.legacyReferenceFill||!!t.invalidateAutoApprovedFillOnRevision)&&fill!=null&&revisionChanged&&looksAutoManaged;
    const nextCalc={...previousCalc};
    if(migrateLegacyFill){
      for(const k of ['approvedFillLiters','effectiveFillLiters','appliedFillLiters','appliedAt','calculatedAt','mountingFillSelection'])delete nextCalc[k];
      nextCalc._fillRevisionMigrationPending=true;
    }
    if(newRevision)nextCalc.fillRevisionId=newRevision;
    point.gearboxOil={...(point.gearboxOil||{}),manufacturer:entry.manufacturer||point.gearboxOil?.manufacturer||'',model:entry.model||entry.designation||point.gearboxOil?.model||'',mountingPosition:pos,fillOptionsLiters:options,calculation:{...nextCalc,oemFillLiters:fill??nextCalc.oemFillLiters??null,fillOptionsLiters:options,fillSource:(fill!=null||options.length)?(entry.sourceReference||nextCalc.fillSource||''):nextCalc.fillSource||'',viscosityGrade:nextCalc.viscosityGrade||(oil.isoViscosity?`ISO ${oil.isoViscosity}`:'')}};
  }else if(point.category==='coupling'){
    point.coupling={...(point.coupling||{}),couplingType:mapCouplingType(t.couplingType),manufacturer:entry.manufacturer||point.coupling?.manufacturer||'',model:entry.model||entry.designation||point.coupling?.model||'',sectionCount:point.coupling?.sectionCount??1,calculation:{...(point.coupling?.calculation||{}),oemTotalG:l.quantityUnit==='г'?l.quantity:point.coupling?.calculation?.oemTotalG??null,quantitySource:l.quantity!=null?(entry.sourceReference||''):point.coupling?.calculation?.quantitySource||''}};
  }else if(point.category==='oil_system'){
    point.oilSystem={...(point.oilSystem||{}),systemType:t.systemType||point.oilSystem?.systemType||'',calculation:{...(point.oilSystem?.calculation||{}),oemVolumeLiters:t.workingVolumeLiters??point.oilSystem?.calculation?.oemVolumeLiters??null,filterRatingMicron:t.filterRatingMicron??point.oilSystem?.calculation?.filterRatingMicron??null,volumeSource:t.workingVolumeLiters!=null?(entry.sourceReference||''):point.oilSystem?.calculation?.volumeSource||''}};
  }else if(point.category==='open_gear'){
    point.openGear={...(point.openGear||{}),module:t.module??point.openGear?.module??null,teeth:t.teeth??point.openGear?.teeth??null,faceWidthMm:t.faceWidthMm??point.openGear?.faceWidthMm??null,calculation:{...(point.openGear?.calculation||{}),oemTotal:l.quantity??point.openGear?.calculation?.oemTotal??null,quantityUnit:l.quantityUnit||point.openGear?.calculation?.quantityUnit||'',quantitySource:l.quantity!=null?(entry.sourceReference||''):point.openGear?.calculation?.quantitySource||''}};
  }else if(point.category==='rope'){
    point.wireRope={...(point.wireRope||{}),diameterMm:t.diameterMm??point.wireRope?.diameterMm??null,construction:t.construction||point.wireRope?.construction||'',calculation:{...(point.wireRope?.calculation||{}),oemTotal:l.quantity??point.wireRope?.calculation?.oemTotal??null,quantityUnit:l.quantityUnit||point.wireRope?.calculation?.quantityUnit||'',quantitySource:l.quantity!=null?(entry.sourceReference||''):point.wireRope?.calculation?.quantitySource||''}};
  }else if(point.category==='central_point'){
    point.centralLubrication={...(point.centralLubrication||{}),systemType:t.systemType||point.centralLubrication?.systemType||'',meteringType:t.meteringType||point.centralLubrication?.meteringType||'',calculation:{...(point.centralLubrication?.calculation||{}),outletCount:t.outletCount??point.centralLubrication?.calculation?.outletCount??null,source:t.outletCount!=null?(entry.sourceReference||''):point.centralLubrication?.calculation?.source||''}};
  }
  return point;
}
function makeBinding({point,sourceComponent=null,equipment=null,match=null}={}){
  const text=structuralText(sourceComponent,equipment);
  const resolved=match||resolve(text,point?.category);
  return {
    sourceComponentId:sourceComponent?.id||point?.componentBinding?.sourceComponentId||null,
    sourceEquipmentId:equipment?.id||point?.equipmentId||null,
    libraryCategory:resolved.category||libraryCategory(point?.category),
    libraryEntryId:resolved.entry?.id||(resolved.guarded?null:(point?.componentBinding?.libraryEntryId||null)),
    matchStatus:resolved.status||'unmatched',
    matchConfidence:resolved.confidence||0,
    matchReason:resolved.reason||'',
    structuralText:text||point?.componentBinding?.structuralText||'',
    actualLibraryEntryId:point?.componentBinding?.actualLibraryEntryId||null,
    updatedAt:new Date().toISOString()
  };
}
function bindPoint(point,{sourceComponent=null,equipment=null,match=null}={}){
  if(!point)return point;
  point.componentBinding=makeBinding({point,sourceComponent,equipment,match});
  const effectiveId=point.componentBinding.actualLibraryEntryId||point.componentBinding.libraryEntryId;
  const entry=entryById(effectiveId,point.componentBinding.libraryCategory);
  if(entry)applyTechnical(point,entry);
  return point;
}
function setLibraryEntry(point,entryId,{actual=false}={}){
  if(!point)return null;
  point.componentBinding=point.componentBinding||makeBinding({point});
  if(actual)point.componentBinding.actualLibraryEntryId=entryId||null;
  else point.componentBinding.libraryEntryId=entryId||null;
  point.componentBinding.matchStatus=entryId?'matched':'unmatched';
  point.componentBinding.matchConfidence=entryId?1:0;
  point.componentBinding.updatedAt=new Date().toISOString();
  const effective=entryById(point.componentBinding.actualLibraryEntryId||point.componentBinding.libraryEntryId,point.componentBinding.libraryCategory);
  if(effective)applyTechnical(point,effective);
  return effective;
}
function ensurePointTechnical(point){
  if(!point)return null;
  if(point.category==='gearbox_oil'&&gearboxBindingNeedsRefresh(point))clearStaleAutomaticGearboxLink(point,db());
  const binding=point.componentBinding||{};
  const category=binding.libraryCategory||libraryCategory(point.category);
  const id=binding.actualLibraryEntryId||binding.libraryEntryId||point.bearing?.catalogId||null;
  let entry=entryById(id,category);
  // Bearing compatibility: old databases may contain a designation but no common catalog binding.
  if(point.category!=='bearing'&&!entry){
    const structural=binding.structuralText||'';
    const resolved=structural?resolve(structural,point.category):null;
    if(resolved?.entry&&resolved.confidence>=.8){
      point.componentBinding=point.componentBinding||makeBinding({point});
      point.componentBinding.libraryCategory=resolved.category||category;
      point.componentBinding.libraryEntryId=resolved.entry.id;
      point.componentBinding.matchStatus=resolved.status||'matched';
      point.componentBinding.matchConfidence=resolved.confidence||0;
      point.componentBinding.matchReason=resolved.reason||'Совпадение найдено в обновлённом Справочнике';
      point.componentBinding.updatedAt=new Date().toISOString();
      entry=resolved.entry;
    }
  }
  if(point.category==='bearing'&&!entry){
    const designation=point.bearing?.actualDesignation||point.bearing?.structuralDesignation||point.bearing?.effectiveDesignation||binding.structuralText||'';
    const resolved=designation?global.LubricaBearings?.lookup?.(designation):null;
    if(resolved?.parsed?.recognized){
      entry=entryById(resolved.parsed.catalogId,'bearing')||global.LubricaComponents?.all?.('bearing')?.find?.(x=>String(x.designation)===String(resolved.parsed.baseDesignation))||null;
      point.componentBinding=point.componentBinding||makeBinding({point});
      point.componentBinding.libraryCategory='bearing';
      point.componentBinding.libraryEntryId=entry?.id||resolved.parsed.catalogId||point.componentBinding.libraryEntryId||null;
      point.componentBinding.matchStatus='matched';point.componentBinding.matchConfidence=1;
    }
  }
  if(entry)applyTechnical(point,entry);
  return entry;
}
function linkedPointForComponent(componentId,excludePointId=null,database=null){
  const d=database||db();if(!d||!componentId)return null;
  return (d.lubricationPoints||[]).find(p=>p.id!==excludePointId&&p.componentBinding?.sourceComponentId===componentId)||null;
}
function componentsForEquipment(equipmentId,database=null){
  const d=database||db();return (d?.components||[]).filter(x=>x.equipmentId===equipmentId);
}
function componentLabel(x){return [x.externalCode,x.name].filter(Boolean).join(' · ')||x.id}
function gearboxBindingNeedsRefresh(point){
  if(point?.category!=='gearbox_oil'||point.componentBinding?.actualLibraryEntryId)return false;
  const structural=point.componentBinding?.structuralText||'';
  const identity=gearboxTextIdentity(structural);
  if(!identity.oem&&!identity.family)return point.componentBinding?.matchStatus==='suggested';
  const current=entryById(point.componentBinding?.libraryEntryId,'gearbox_oil');
  if(!current)return true;
  const currentId=entryGearboxIdentity(current);
  if(identity.conflict)return true;
  if(identity.oem&&currentId.oem!==identity.oem)return true;
  if(identity.family&&currentId.family!==identity.family)return true;
  return false;
}
function clearStaleAutomaticGearboxLink(point,database=null){
  if(!point||point.componentBinding?.actualLibraryEntryId)return false;
  const staleEntry=entryById(point.componentBinding?.libraryEntryId,'gearbox_oil');
  const staleOem=canonicalGearboxOemName(staleEntry?.manufacturer||point.gearboxOil?.manufacturer||'');
  const oldCalc=point.gearboxOil?.calculation||{};
  const oldFillSource=String(oldCalc.fillSource||'');
  const oldIntervalSource=String(oldCalc.intervalSource||'');
  const oldSourceId=String(oldCalc.provenance?.sourceId||oldCalc.calculationContext?.provenance?.sourceId||'');
  const preservedPosition=point.gearboxOil?.mountingPosition||inferGearboxMountingPosition(point.componentBinding?.structuralText||'')||'';
  const preserved={
    oilBaseType:oldCalc.oilBaseType||'auto',
    intervalMode:oldCalc.intervalMode||'auto',
    lubricationMethod:oldCalc.lubricationMethod||'splash',
    oilSystemIncluded:!!oldCalc.oilSystemIncluded,
    oilCondition:oldCalc.oilCondition||'unknown',
    leakage:oldCalc.leakage||'no',
    temperatureClass:oldCalc.temperatureClass||'le65',
    intervalModeExplicit:!!oldCalc.intervalModeExplicit,
    currentFillLiters:oldCalc.currentFillLiters??null
  };
  point.componentBinding.libraryEntryId=null;
  point.componentBinding.matchStatus='unmatched';
  point.componentBinding.matchConfidence=0;
  point.componentBinding.matchReason='Автоматическая привязка признана устаревшей и пересчитывается';
  point.linkedTechnicalData=null;point.linkedLubricationData=null;
  point.gearboxOil={manufacturer:'',model:'',mountingPosition:preservedPosition,fillOptionsLiters:[],calculation:preserved};
  if(point.calculations&&Object.prototype.hasOwnProperty.call(point.calculations,'gearbox-oil'))delete point.calculations['gearbox-oil'];
  const d=database||db();
  for(const task of d?.tasks||[]){
    if(String(task.lubricationPointId)!==String(point.id))continue;
    const q=task.quantity||{};
    const qSource=String(q.source||'');
    const sourceLooksStale=!!qSource&&(qSource===oldFillSource||qSource===oldIntervalSource||(staleOem&&canonicalGearboxOemName(qSource)===staleOem)||(oldSourceId&&qSource.includes(oldSourceId)));
    const calculatedQuantity=q.calculated!=null||q.calculatedGrams!=null||q.calculatedStrokes!=null;
    if(sourceLooksStale||calculatedQuantity){
      task.quantity={...q,approved:'',calculated:null,calculatedGrams:null,calculatedStrokes:null,source:''};
      task.verified=false;
      if(task.approvalStatus==='approved')task.approvalStatus='review';
    }
    const sch=task.schedule||{};
    const schSource=String(sch.source||'');
    const scheduleLooksStale=!!schSource&&(schSource===oldIntervalSource||schSource===oldFillSource||(staleOem&&canonicalGearboxOemName(schSource)===staleOem)||(oldSourceId&&schSource.includes(oldSourceId)));
    if(scheduleLooksStale){
      task.schedule={...sch,firstChangeHours:null,calculatedHours:null,approvedHours:null,calculatedDays:null,calculatedCalendarMonths:null,conditionBased:false,rule:'unspecified',source:'',calendarValue:null,runtimeHours:null};
      task.verified=false;
      if(task.approvalStatus==='approved')task.approvalStatus='review';
    }
  }
  return true;
}
function reconcilePP53736R77DrawingHint(point,database){
  if(point?.category!=='gearbox_oil'||point.machineProfileId!=='IZOTEH-PP53736')return false;
  const m=String(point.machineProfileOriginKey||'').match(/^machine:IZOTEH-PP53736:([^:]+):r77_(\d+)$/);if(!m)return false;
  const root=(database?.equipment||[]).find(e=>String(e.id)===m[1]);if(Number(root?.pp53736Configuration?.r77Count)!==8)return false;
  const index=Number(m[2]);if(!(index>=1&&index<=8))return false;
  const hint=index<=4?'M1':'M3';
  point.machineOemMountingPositionHint=hint;
  point.machineOemMountingPositionSource='Izoteh assembly drawing 53736 sheet 4/5, items 73–76: 4 × M1 and 4 × M3';
  const selected=String(point.gearboxOil?.mountingPosition||'');
  point.machineOemMountingPositionReviewRequired=!!selected&&selected!==hint;
  return true;
}
function reconcilePP53736MachineInterval(point,database){
  if(point?.category!=='gearbox_oil'||point.machineProfileId!=='IZOTEH-PP53736')return 0;
  let changed=0;
  for(const task of database?.tasks||[]){
    if(String(task.lubricationPointId||'')!==String(point.id||''))continue;
    if(!(task.activityType==='oil_change'||String(task.operation||'').trim().toLowerCase()==='замена масла'))continue;
    const sch=task.schedule||{};
    const raw=String(sch.machineOemRawInterval||'');
    if(raw!=='5000/500 h')continue;
    const src=String(sch.source||'');
    const autoGeneric=/SEW-EURODRIVE\s*·\s*OEM регламент замены масла/i.test(src);
    const speculative500=Number(sch.firstChangeHours)===500;
    const autoCalendar=sch.calculatedCalendarMonths!=null&&sch.calendarUnit==='months'&&/SEW-EURODRIVE/i.test(src);
    if(!(autoGeneric||speculative500||autoCalendar))continue;
    task.schedule={...sch,legacyText:'5000 ч',strategy:'По наработке',runtimeHours:5000,runtimeUnit:'hours',approvedHours:5000,calculatedHours:5000,firstChangeHours:null,calculatedCalendarMonths:null,conditionBased:false,rule:'hours',source:'Izoteh PP-53736 · паспорт машины · исходная запись 5000/500 h; значение 500 не интерпретировано',calendarValue:null,calendarUnit:null,machineOemRawInterval:'5000/500 h'};
    task.verified=false;if(task.approvalStatus==='approved')task.approvalStatus='review';changed++;
  }
  return changed;
}
function reconcileDatabase(database=null){
  const d=database||db();if(!d)return {changed:0,matched:0};
  let changed=0,matched=0;
  for(const point of d.lubricationPoints||[]){
    let sourceComponent=null;
    const existingId=point.componentBinding?.sourceComponentId;
    if(existingId)sourceComponent=(d.components||[]).find(x=>x.id===existingId)||null;
    if(!sourceComponent&&point.candidateOriginKey){
      const m=String(point.candidateOriginKey).match(/^component:([^:]+)/);
      if(m)sourceComponent=(d.components||[]).find(x=>String(x.id)===m[1])||null;
    }
    const equipment=(d.equipment||[]).find(x=>x.id===point.equipmentId)||null;
    const before=JSON.stringify(point.componentBinding||{});
    if(gearboxBindingNeedsRefresh(point))clearStaleAutomaticGearboxLink(point,d);
    if((sourceComponent&&!point.componentBinding?.sourceComponentId)||!point.componentBinding?.libraryEntryId){
      bindPoint(point,{sourceComponent,equipment});
    }
    if(point.category==='bearing'&&!point.componentBinding?.libraryEntryId&&point.bearing?.catalogId){
      point.componentBinding.libraryCategory='bearing';
      point.componentBinding.libraryEntryId=point.bearing.catalogId;
      point.componentBinding.matchStatus='matched';
      point.componentBinding.matchConfidence=1;
    }
    ensurePointTechnical(point);
    if(point.category==='gearbox_oil'){reconcilePP53736R77DrawingHint(point,d);reconcilePP53736MachineInterval(point,d);}
    if(point.category==='gearbox_oil'&&point.gearboxOil?.calculation?._fillRevisionMigrationPending){
      const calc=point.gearboxOil.calculation;
      delete calc._fillRevisionMigrationPending;
      if(point.calculations&&Object.prototype.hasOwnProperty.call(point.calculations,'gearbox-oil'))delete point.calculations['gearbox-oil'];
      for(const task of d.tasks||[]){
        if(String(task.lubricationPointId||'')!==String(point.id||''))continue;
        if(task.activityType==='oil_change'||String(task.operation||'').trim().toLowerCase()==='замена масла'){
          const q=task.quantity||{};
          task.quantity={...q,approved:'',calculated:null,source:''};
          task.verified=false;
          if(task.approvalStatus==='approved')task.approvalStatus='review';
        }
      }
    }
    const after=JSON.stringify(point.componentBinding||{});
    if(before!==after)changed++;
    if(point.componentBinding?.libraryEntryId)matched++;
  }
  return {changed,matched};
}
global.LubricaComponentBinding=Object.freeze({libraryCategory,entryById,resolve,structuralText,applyTechnical,makeBinding,bindPoint,setLibraryEntry,linkedPointForComponent,componentsForEquipment,componentLabel,reconcileDatabase,ensurePointTechnical,inferGearboxMountingPosition,parseBonfiglioliCSeries,canonicalGearboxOemName,gearboxFamilyHint,gearboxTextIdentity,entryGearboxIdentity});
global.LubricaSystem?.registerModule?.('Component Binding','ok','Связь Структура → Справочник → Точка');
})(window);
