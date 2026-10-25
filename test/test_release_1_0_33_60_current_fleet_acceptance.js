const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const audit=JSON.parse(fs.readFileSync(path.join(root,'LUBRICA_1_0_33_59_CURRENT_DB_FULL_GEARBOX_OEM_AUDIT.json'),'utf8'));
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/gearbox-oem-data-1.0.33.60.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding;
let matchedInstances=0,unmatchedInstances=0,wrongDomainInstances=0,crossOemFalse=0,unexpected=[];
const canon=s=>B.canonicalGearboxOemName(s||'');
for(const a of audit.records){
  const text=[a.source_manufacturer,a.raw_name].filter(Boolean).join(' ');
  const r=B.resolve(text,'gearbox_oil');
  if(r.entry) matchedInstances+=a.count; else unmatchedInstances+=a.count;
  if(r.wrongDomain) wrongDomainInstances+=a.count;
  if(r.entry){
    const entryOem=canon(r.entry.manufacturer||'');
    const auditedOem=a.audited_oem;
    if(auditedOem && auditedOem!=='UNKNOWN' && auditedOem!=='ABB / NABTESCO' && entryOem && entryOem!==auditedOem){
      crossOemFalse+=a.count; unexpected.push({type:'cross-oem',name:a.raw_name,auditedOem,entryOem,entry:r.entry.id});
    }
  }
  const shouldBlock=['INSUFFICIENT_IDENTIFICATION','MANUFACTURER_CONFLICT','WRONG_DOMAIN','TYPECODE_CONFIRM'].includes(a.oem_fill_status);
  if(shouldBlock && r.entry) unexpected.push({type:'unsafe-match',name:a.raw_name,status:a.oem_fill_status,entry:r.entry.id});
  if(!shouldBlock && !r.entry) unexpected.push({type:'unexpected-unmatched',name:a.raw_name,status:a.oem_fill_status,reason:r.reason});
}
assert.equal(audit.summary.component_instances,363);
assert.equal(audit.summary.unique_records,202);
assert.equal(matchedInstances,331);
assert.equal(unmatchedInstances,32);
assert.equal(wrongDomainInstances,6);
assert.equal(crossOemFalse,0);
assert.deepEqual(unexpected,[]);
console.log('PASS 1.0.33.60 current fleet acceptance: 363 instances / 202 records / 331 safely linked / 32 intentionally blocked / 0 cross-OEM');
