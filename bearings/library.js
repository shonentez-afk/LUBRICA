(function(global){
'use strict';
const data=Array.isArray(global.LubricaBearingCatalogData)?global.LubricaBearingCatalogData:[];
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=s=>String(s??'').trim();
const upper=s=>clean(s).toUpperCase().replace(/[–—]/g,'-');
const compact=s=>upper(s).replace(/[^A-Z0-9]/g,'');
function exactCatalogMatch(text){
  const c=compact(text);if(!c)return null;
  let best=null,bestLen=0;
  for(const row of data){
    const variants=[row?.designation,row?.alias,...(Array.isArray(row?.aliases)?row.aliases:[])];
    for(const v of variants){
      const k=compact(v);
      if(k.length>=4&&k.length>bestLen&&c.includes(k)){best=row;bestLen=k.length;}
    }
  }
  return best;
}

const manufacturers=['SKF','FAG','SCHAEFFLER','INA','NSK','NTN-SNR','NTN','KOYO','TIMKEN','NACHI','SNR','RHP'];
const suffixPatterns=[
  ['2CS5','sealed'],['2CS2','sealed'],['2CS','sealed'],['CS5','sealed'],['CS2','sealed'],['CS','sealed'],
  ['2RS1','sealed'],['2RSH','sealed'],['2RS','sealed'],['RS1','sealed'],['RSH','sealed'],['RS','sealed'],
  ['2Z','shielded'],['ZZ','shielded'],['Z','shielded']
];
function parse(input){
  const original=clean(input);
  let text=upper(original);
  for(const m of manufacturers){
    text=text.replace(new RegExp(`^${m}[\\s:-]+`),'');
  }
  text=text.replace(/\s+/g,' ');
  // Prefer the longest exact catalog designation/alias found inside the imported text.
  // This preserves fleet suffixes such as 2RS1, CCK/W33, E.M1.C3 and SKF Y-unit families.
  const exactMatch=exactCatalogMatch(text);
  // Preserve explicit housed-unit execution suffixes before exact catalog matching.
  // A base catalog row such as UKFC211 must not swallow an imported UKFC211D execution.
  const explicitUnitVariant=(text.match(/(?:^|[^A-Z0-9])((?:UKFC)\s*\d{3}(?:D1|D))(?=[^A-Z0-9]|$)/)||[])[1]||'';
  // Fallback: extract a useful base designation even when dimensions are not yet in the local catalog.
  // Supported recognition families: common ball/roller bearings, cylindrical prefixes and common housed units.
  const patterns=[
    /(?:^|[^A-Z0-9])((?:BS2[-\s]?\d{4}[-\s]?(?:2CS5|2CS2|2CS|2RS5|2RS)\/VT143))(?=[^A-Z0-9]|$)/,
    /(?:^|[^A-Z0-9])((?:VLU\s*20\s*\d{4}))(?=[^A-Z0-9]|$)/,
    /(?:^|[^A-Z0-9])((?:FYTB|FY)\s*\d{2,3}\s*(?:TF|TR))(?=[^A-Z0-9]|$)/,
    /(?:^|[^A-Z0-9])(((?:CM|ZM|C|Z)-)?(?:UC|UK|UCP|UCF|UCFS|UCFC|UCFL|UCT|UCL|UCM|UCHB|UCPA|UCUP|UCFH|UCTX|UKP|UKF|UKFS|UKFC|UKFL|UKT|UKHA)\s*\d{3}(?:D1|D)?)(?=[^A-Z0-9]|$)/,
    /(?:^|[^A-Z0-9])((?:NU|NJ|NUP|N)\s*\d{3,4})(?=[^A-Z0-9]|$)/,
    /(?:^|[^0-9])((?:222|223|230|231|232|239|240|241|302|303|313|320|322|323)\d{2})(?=[^0-9]|$)/,
    /(?:^|[^0-9])((?:60|62|63|64|70|72|73|12|13|22|23)\d{2})(?=[^0-9]|$)/
  ];
  let baseDesignation=explicitUnitVariant?explicitUnitVariant.replace(/\s+/g,''):(exactMatch?.designation||'');
  let unitVariant='';
  if(!baseDesignation)for(const rx of patterns){const m=text.match(rx);if(m){baseDesignation=m[1].replace(/\s+/g,'');break;}}
  if(/^UKFC\d{3}D$/.test(baseDesignation)){unitVariant='closed_end_cover';baseDesignation=baseDesignation.slice(0,-1);}
  if(/^UKFC\d{3}D1$/.test(baseDesignation)){unitVariant='series_suffix_D1';}
  if(/^FY(?:TB)?\d{2,3}TR$/.test(baseDesignation))unitVariant='tr_sealing';
  if(/^FY(?:TB)?\d{2,3}TF$/.test(baseDesignation))unitVariant='tf_sealing';
  let sealing='unknown',sealingCode='';
  for(const [code,type] of suffixPatterns){
    if(new RegExp(`(?:^|[\\s\\-/])${code}(?:[\\s\\-/]|$)`).test(text)||text.includes(`-${code}`)||text.endsWith(code)){
      sealing=type;sealingCode=code;break;
    }
  }
  if(baseDesignation&&sealing==='unknown')sealing='open_or_unspecified';
  const greaseCode=(text.match(/(?:^|[\/\s-])(VT143)(?:$|[\/\s-])/i)||[])[1]||'';
  const clearance=(text.match(/(?:^|[\/\s-])(C[2345])(?:$|[\/\s-])/)||[])[1]||'';
  const cage=(text.match(/(?:^|[\/\s-])(TN9|M|MA|MB|J|TVH)(?:$|[\/\s-])/)||[])[1]||'';
  const matched=exactMatch||(baseDesignation?data.find(x=>x.designation===baseDesignation):null);
  const inferredType=/^VLU20\d{4}$/.test(baseDesignation)?'slewing_ring_four_point_ball':
    /^(60|62|63|64)\d{2}$/.test(baseDesignation)?'deep_groove_ball':
    /^(70|72|73)\d{2}$/.test(baseDesignation)?'angular_contact_ball':
    /^BS2-\d{4}/.test(baseDesignation)?'spherical_roller':
    /^(222|223|230|231|232|239|240|241)\d{2}$/.test(baseDesignation)?'spherical_roller':
    /^(NU|NJ|NUP|N)\d{3,4}$/.test(baseDesignation)?'cylindrical_roller':
    /^(302|303|313|320|322|323)\d{2}$/.test(baseDesignation)?'tapered_roller':
    /^(?:(?:CM|ZM|C|Z)-)?(?:UC|UK|UCP|UCF|UCFS|UCFC|UCFL|UCT|UCL|UCM|UCHB|UCPA|UCUP|UCFH|UCTX|UKP|UKF|UKFS|UKFC|UKFL|UKT|UKHA)\d{3}(?:D1)?$/.test(baseDesignation)?'bearing_unit':
    /^FY(?:TB)?\d{2,3}(?:TF|TR)$/.test(baseDesignation)?'bearing_unit':'unknown';
  return {
    original,
    normalized:text,
    baseDesignation,
    recognized:!!matched,
    sealing,
    sealingCode,
    greaseCode,
    clearance,
    cage,
    unitVariant,
    dimensions:matched?{d:matched.d,D:matched.D,B:matched.B}:null,
    masses:matched?{bearingMassKg:matched.insertMassKg??matched.massKg??null,unitMassKg:matched.unitMassKg??null}:null,
    catalogId:matched?.id||null,
    inferredType:matched?.bearingType||inferredType,
    manufacturer:matched?.manufacturer||null,
    source:matched?.source||null,
    sourceConfidence:matched?.sourceConfidence||null,
    warnings:[
      ...(!baseDesignation?['Не удалось выделить базовое обозначение подшипника.']:[]),
      ...(baseDesignation&&!matched?['Обозначение распознано, но размеров нет во встроенной библиотеке. Добавьте пользовательскую запись или подтвердите размеры по OEM.']:[])
    ]
  };
}
function getDatabase(){return global.LubricaCore?.State?.getDatabase?.()}
function overrides(){return getDatabase()?.bearingOverrides||[]}
function overrideMatch(base){
  const b=upper(base);
  return overrides().find(x=>upper(x.designation)===b||upper(x.alias||'')===b);
}
function lookup(input){
  const parsed=parse(input);
  const ov=overrideMatch(parsed.baseDesignation||input);
  if(ov)return {record:clone(ov),parsed:{...parsed,recognized:true,dimensions:{d:Number(ov.d),D:Number(ov.D),B:Number(ov.B)},catalogId:ov.id,source:'user_override'},sourceType:'override'};
  const record=data.find(x=>x.designation===parsed.baseDesignation)||exactCatalogMatch(input);
  return {record:record?clone(record):null,parsed:{...parsed,manufacturer:record?.manufacturer||parsed.manufacturer||null,sourceConfidence:record?.sourceConfidence||parsed.sourceConfidence||null},sourceType:record?'builtin':'none'};
}
function search(query='',filters={}){
  const q=upper(query);
  const merged=[...data.map(x=>({...x,sourceType:'builtin'})),...overrides().map(x=>({...x,sourceType:'override'}))];
  return merged.filter(x=>{
    if(filters.source&&filters.source!=='all'&&x.sourceType!==filters.source)return false;
    if(filters.type&&filters.type!=='all'&&x.bearingType!==filters.type)return false;
    const maxBore=Number(filters.maxBore);
    if(Number.isFinite(maxBore)&&maxBore>0&&Number(x.d)>maxBore)return false;
    if(!q)return true;
    return [x.designation,x.alias,x.manufacturer,x.notes,x.series,x.housingStyle,x.housingStyleLabel,x.insertDesignation,x.sourceNote].some(v=>upper(v).includes(q));
  });
}
function saveOverride(payload){
  const database=getDatabase();
  if(!database)throw new Error('Рабочая база не открыта');
  const designation=upper(payload.designation);
  if(!designation)throw new Error('Укажите обозначение');
  const d=Number(payload.d),D=Number(payload.D),B=Number(payload.B);
  if(!(d>0&&D>d&&B>0))throw new Error('Проверьте размеры d / D / B');
  database.bearingOverrides=database.bearingOverrides||[];
  let item=payload.id?database.bearingOverrides.find(x=>x.id===payload.id):database.bearingOverrides.find(x=>upper(x.designation)===designation);
  if(!item){
    item={id:global.LubricaCore.IDs.nextFrom(database.bearingOverrides,'BRGU',5)};
    database.bearingOverrides.push(item);
  }
  Object.assign(item,{
    designation,
    alias:clean(payload.alias),
    d,D,B,
    bearingType:payload.bearingType||'unknown',
    manufacturer:clean(payload.manufacturer),
    sourceReference:clean(payload.sourceReference),
    notes:clean(payload.notes),
    source:'user_override',
    updatedAt:new Date().toISOString()
  });
  global.LubricaCore.State.setDatabase(global.LubricaCore.Database.normalize(database));
  global.LubricaApp?.refreshFromCore?.();
  return item;
}
function deleteOverride(id){
  const database=getDatabase();if(!database)return false;
  const i=(database.bearingOverrides||[]).findIndex(x=>x.id===id);if(i<0)return false;
  database.bearingOverrides.splice(i,1);
  global.LubricaCore.State.setDatabase(global.LubricaCore.Database.normalize(database));
  global.LubricaApp?.refreshFromCore?.();
  return true;
}
global.LubricaBearings=Object.freeze({
  catalog:data,
  parse,lookup,search,saveOverride,deleteOverride,
  getOverrides:()=>clone(overrides())
});
global.LubricaSystem?.registerModule?.('Bearing Library','ok',`${data.length} встроенных записей`);
})(window);
