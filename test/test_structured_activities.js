
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const context={console,window:{LubricaCore:{State:{getDatabase(){return null}},Database:{},IDs:{}}}};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'structure/context.js'),'utf8'),context);
const C=context.window.LubricaStructureContext;
function assert(x,msg){if(!x)throw new Error(msg)}
assert(C.activityLabel('regrease')==='Досмазывание','regrease label');
assert(C.activityTypeForLabel('Полная замена смазки')==='grease_full_replacement','full grease replacement type');
assert(C.activityOptions('bearing').some(x=>x.type==='regrease'),'bearing regrease option');
assert(C.activityOptions('bearing').some(x=>x.type==='grease_full_replacement'),'bearing full replacement option');
assert(C.activityOptions('gearbox_oil').some(x=>x.type==='oil_change'),'gearbox oil change option');
assert(C.activityNeedsMaterial('oil_level_check')===false,'oil level check material');
assert(C.activityNeedsMaterial('oil_change')===true,'oil change material');
console.log('STRUCTURED ACTIVITIES TEST PASS');
