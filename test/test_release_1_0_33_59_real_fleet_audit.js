const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const audit=JSON.parse(fs.readFileSync('/mnt/data/LUBRICA_1_0_33_58_FULL_GEARBOX_OEM_AUDIT.json','utf8'));
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/gearbox-oem-data-1.0.33.59.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding;
const result={release:'1.0.33.59',sourceAuditRelease:audit.summary.release,uniqueDesignations:audit.summary.unique_designations,componentInstances:audit.summary.component_instances,resolved:0,unresolved:0,expectedConflicts:0,wrongDomainBlocked:0,crossOemFalseMatches:0,fillSafeRecordsChecked:0,fillSafeInstancesChecked:0,fillMismatches:[],unexpectedMatches:[],unexpectedUnresolved:[]};
const canon=x=>B.canonicalGearboxOemName(x||'');
const safe=new Set(['OEM_GUIDE_SINGLE','OEM_PRODUCT_CARD_SINGLE','OEM_FACTORY_CHARGE','OEM_GUIDE_OPTIONS']);
for(const rec of audit.records){
 const text=[rec.source_manufacturer,rec.raw_name].filter(Boolean).join(' ');
 const r=B.resolve(text,'gearbox_oil');
 const expectedConflict=rec.oem_fill_status==='MANUFACTURER_CONFLICT';
 const expectedWrong=rec.oem_fill_status==='WRONG_DOMAIN';
 if(expectedConflict) result.expectedConflicts+=rec.count;
 if(expectedWrong && (r.wrongDomain||r.status==='unmatched')) result.wrongDomainBlocked+=rec.count;
 if(r.entry){
   result.resolved+=rec.count;
   const got=canon(r.entry.manufacturer), expected=rec.audited_oem==='ABB / NABTESCO'?'ABB':rec.audited_oem;
   if(expectedConflict){result.unexpectedMatches.push({raw:rec.raw_name,reason:'manufacturer conflict matched',entry:r.entry.id});}
   if(expected && expected!=='UNKNOWN' && got && got!==expected){result.crossOemFalseMatches+=rec.count;result.unexpectedMatches.push({raw:rec.raw_name,expected,got,entry:r.entry.id});}
   if(safe.has(rec.oem_fill_status)&&rec.current_entry_id){
     result.fillSafeRecordsChecked++;result.fillSafeInstancesChecked+=rec.count;
     const td=r.entry.technicalData||{},pos=rec.audited_mounting||'';
     const gotFill=td.fixedFillLiters??(pos?td.mountingFillLiters?.[pos]:undefined);
     const gotOpts=pos?td.mountingFillOptionsLiters?.[pos]:td.fixedFillOptionsLiters;
     if(rec.oem_fill_liters!=null && gotFill!=null && Math.abs(Number(gotFill)-Number(rec.oem_fill_liters))>1e-9){
       // A503 VB revision is not in the actual fleet records; all actual record values must match.
       result.fillMismatches.push({raw:rec.raw_name,pos,expected:rec.oem_fill_liters,got:gotFill,entry:r.entry.id});
     }
     if(Array.isArray(rec.oem_fill_options_liters)&&Array.isArray(gotOpts)&&JSON.stringify(rec.oem_fill_options_liters)!==JSON.stringify(gotOpts))result.fillMismatches.push({raw:rec.raw_name,pos,expected:rec.oem_fill_options_liters,got:gotOpts,entry:r.entry.id});
   }
 }else{
   result.unresolved+=rec.count;
   const expectedUnresolved=new Set(['MANUFACTURER_CONFLICT','WRONG_DOMAIN','INSUFFICIENT_IDENTIFICATION','CUSTOM_CONFIGURATION_CONFIRM']);
   if(!expectedUnresolved.has(rec.oem_fill_status) && rec.current_entry_id && !['OEM_TECH_SUPPORT_REQUIRED','LEGACY_TYPECODE_MOUNTING_REQUIRED','MOUNTING_SEMANTICS_CONFIRM','COMPOUND_GEAR_UNIT_CONFIRM','LUBRICANT_TYPE_CONFIRM'].includes(rec.oem_fill_status))result.unexpectedUnresolved.push({raw:rec.raw_name,status:rec.oem_fill_status,reason:r.reason});
 }
}
assert.equal(result.crossOemFalseMatches,0,'cross-OEM false match must stay zero');
assert.equal(result.fillMismatches.length,0,'safe OEM fill mismatches found');
fs.writeFileSync('/mnt/data/lubrica_33_59/LUBRICA_1_0_33_59_REAL_FLEET_ACCEPTANCE.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
