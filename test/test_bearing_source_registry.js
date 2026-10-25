const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync(__dirname+'/../bearings/source-registry.js','utf8');
const window={LubricaSystem:{registerModule(){}}};
vm.runInNewContext(code,{window,document:{getElementById(){return null}}});
const R=window.LubricaBearingSources;if(!R)throw new Error('registry not loaded');
if(R.sources.length<7)throw new Error('registry incomplete');
for(const oem of ['SKF','NSK','FAG / Schaeffler','NTN-SNR','Timken'])if(!R.sources.some(x=>x.oem===oem))throw new Error('missing '+oem);
for(const method of ['skf_side','oem_exact','schaeffler_monthly','ntn_snr_standard','timken_oem_tool','engineering_db005'])if(!R.findByMethod(method))throw new Error('unmapped method '+method);
console.log('BEARING SOURCE REGISTRY TEST PASS',R.sources.length);
