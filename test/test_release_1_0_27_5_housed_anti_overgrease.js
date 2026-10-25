const fs=require('fs'),vm=require('vm'),path=require('path');
function assert(x,m){if(!x)throw new Error(m)}
const ctx={window:{}};ctx.window.window=ctx.window;ctx.window.LubricaSystem={registerModule(){}};vm.createContext(ctx);
for(const f of ['bearings/multi-oem-data.js','bearings/calculator.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx,{filename:f});
const C=ctx.window.LubricaBearingCalculator;
let r=C.calculate({designation:'UCP216',manufacturer:'auto',bearingType:'bearing_unit',d:80,D:140,B:82.6,rpm:300,temperatureC:70,greaseDensity:0.9,loadClass:'medium',contamination:'normal',vibration:'normal',shaftOrientation:'horizontal'});
assert(r.relube.value===15.5,'UCP216 universal housed reference must be 15.5 g');
assert(r.relube.antiOvergreaseGuard===true,'UCP216 guard active');
assert(r.relube.genericDoseG>50,'generic comparison preserved');
r=C.calculate({designation:'UCP320',manufacturer:'NTN-SNR',bearingType:'bearing_unit',d:100,D:215,B:108,rpm:300,temperatureC:70,greaseDensity:0.9,loadClass:'medium',contamination:'normal',vibration:'normal',shaftOrientation:'horizontal'});
assert(r.relube.value===60,'NTN UCP320 exact dose 60 g');
assert(r.relube.confidenceCode==='A','NTN housed exact is A');
r=C.relubeQuantity({designation:'UCP320',manufacturer:'SKF',bearingType:'bearing_unit',D:215,B:108,method:'skf_side',greaseDensity:0.9});
assert(r.value===116.1,'explicit SKF formula still computed');
assert(r.overgreaseRisk===true&&r.autoApprovalBlocked===true,'expert high dose must be blocked');
console.log('RELEASE 1.0.27.5 HOUSED ANTI-OVERGREASING PASS');
