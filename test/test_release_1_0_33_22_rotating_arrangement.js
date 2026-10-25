const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={console,window:{},document:{}};ctx.window.window=ctx.window;vm.createContext(ctx);
function load(p){vm.runInContext(fs.readFileSync(p,'utf8'),ctx,{filename:p})}
load(__dirname+'/../import/component-classifier.js');
const C=ctx.window.LubricaClassifier;
for(const [name,type] of [['Вал приводной','rotating_shaft'],['Барабан натяжной','drum'],['Шпиндель №1','spindle'],['Ось вращения левая','axis']]){
 const r=C.classifyEquipmentText(name,type);assert.equal(r.equipmentType,type);assert.equal(r.template.id,'rotating_arrangement');
}
ctx.window.LubricaCore={IDs:{nextFrom:(arr,prefix)=>prefix+'-'+String(arr.length+1).padStart(7,'0')}};
load(__dirname+'/../rotating/rotating-arrangement.js');
const R=ctx.window.LubricaRotatingArrangement;
const db={components:[]},eq={id:'EQ-1',externalCode:'X',origin:'manual'};
R.ensureManualComponents(db,eq,{supportCount:2,supports:['UCPA 210','UKHA 212']});
assert.equal(db.components.filter(x=>x.status==='active').length,2);assert.equal(eq.manualRotatingSetup.supportCount,2);
assert.equal(db.components[0].candidateCategory,'bearing');
console.log('PASS 1.0.33.22 rotating arrangement');
