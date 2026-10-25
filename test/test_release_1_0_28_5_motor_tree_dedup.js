const fs=require('fs'),vm=require('vm'),assert=require('assert');
const base=__dirname+'/..';
const context=fs.readFileSync(base+'/structure/context.js','utf8');
const tree=fs.readFileSync(base+'/structure/tree-ui.js','utf8');
assert(context.includes("componentRole==='motor'"),'point context must honor motor component binding');
assert(tree.includes('redundantMotorNodes'),'tree must detect redundant motor node');
assert(tree.includes('flattenedMotorLps'),'tree must flatten motor LPs from redundant node');
assert(tree.includes("renderComponentAsset(motorComp,depth+1,'Электродвигатель',visibleMotorNodes,motorLps,[])"),'motor component must render once with flattened points');

const sandbox={window:{}};sandbox.window.window=sandbox.window;
vm.runInNewContext(context,sandbox,{filename:'context.js'});
const C=sandbox.window.LubricaStructureContext;
const db={equipment:[{id:'EQ1',equipmentType:'fan'}],components:[{id:'C1',candidateEquipmentType:'motor'}]};
const label=C.pointContextLabel(db,{equipmentId:'EQ1',category:'bearing',componentBinding:{sourceComponentId:'C1'}});
assert.strictEqual(label,'Подшипник электродвигателя');
console.log('PASS release 1.0.28.5 motor tree dedup');
