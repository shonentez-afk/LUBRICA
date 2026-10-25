const fs=require('fs'),vm=require('vm'),assert=require('assert'),base=__dirname+'/..';
const src=fs.readFileSync(base+'/bearings/source-registry.js','utf8');
assert(src.includes("IWIS-CHAIN-LUBRICATION"));assert(src.includes("TSUBAKI-CHAIN-LUBRICATION"));assert(src.includes('sourceIds'));
const chain=fs.readFileSync(base+'/calculations/chain-adapter.js','utf8');
assert(chain.includes('data-chain-sources'));assert(chain.includes("'IWIS-CHAIN-LUBRICATION','TSUBAKI-CHAIN-LUBRICATION','CHAIN-ISO606-RENOLD'"));
const jack=fs.readFileSync(base+'/calculations/screw-jack-adapter.js','utf8');assert(jack.includes('data-jack-sources'));assert(jack.includes("sourceIds:['FRANCIA-SCREW-JACK']"));
const off=fs.readFileSync(base+'/bearings/offline-evidence.js','utf8');assert(off.includes('IWIS-CHAIN-LUBRICATION-V1'));assert(off.includes('TSUBAKI-CHAIN-LUBRICATION-V1'));assert(off.includes("filter(r=>r.manufacturer==='FRANCIA')"));
console.log('PASS 1.0.31.6 chain/jack source buttons and offline evidence');
