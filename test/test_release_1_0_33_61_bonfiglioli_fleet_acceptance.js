const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const audit=JSON.parse(fs.readFileSync(path.join(root,'LUBRICA_1_0_33_59_CURRENT_DB_FULL_GEARBOX_OEM_AUDIT.json'),'utf8'));
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx={window,console,Object,Number,String,JSON,Date,Map,Set};vm.createContext(ctx);
for(const f of ['components/registry.js','components/starter-data.js','components/gearbox-oem-data-1.0.33.60.js','components/gearbox-oem-data-1.0.33.61.js','components/starter-adapter.js','components/matcher.js','components/binding.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const B=window.LubricaComponentBinding;
let bonfInstances=0,withFill=0,withoutFill=0,unexpected=[];
for(const a of audit.records){
  if(a.audited_oem!=='BONFIGLIOLI')continue;
  bonfInstances+=a.count;
  const text=[a.source_manufacturer,a.raw_name].filter(Boolean).join(' ');
  const r=B.resolve(text,'gearbox_oil');
  if(!r.entry){unexpected.push({name:a.raw_name,type:'unmatched'});withoutFill+=a.count;continue;}
  const td=r.entry.technicalData||{};
  const pos=B.inferGearboxMountingPosition(text)||td.mountingPosition||'';
  const v=td.fixedFillLiters!=null?td.fixedFillLiters:(pos&&td.mountingFillLiters?.[pos]!=null?td.mountingFillLiters[pos]:td.oemFillLiters);
  if(v!=null&&Number(v)>0)withFill+=a.count; else withoutFill+=a.count;
}
assert.equal(bonfInstances,98);
assert.equal(withFill,96);
assert.equal(withoutFill,2);
assert.deepEqual(unexpected,[]);
console.log('PASS 1.0.33.61 Bonfiglioli fleet acceptance: 98 instances / 96 with available working fill / 2 verification-only A412/NR B5');
