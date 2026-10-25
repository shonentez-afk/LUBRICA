const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{},console};ctx.window.window=ctx.window;vm.createContext(ctx);
function load(rel){vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});}
load('import/component-classifier.js');
let r=ctx.window.LubricaClassifier.classifyEquipmentText('Домкрат винтовой M42VR-TP-N-700-T-B-P2-1','');
assert.equal(r.equipmentType,'screw_jack');assert(r.confidence>=.99);assert.equal(r.template.manufacturerHint,'FRANCIA');
r=ctx.window.LubricaClassifier.classifyEquipmentText('M42VR-TP-N-700-T-B-P2-1','');assert.equal(r.equipmentType,'screw_jack');
ctx.window.LubricaComponentStarterData=[];load('components/screw-jack-data.js');
const rows=ctx.window.LubricaComponentStarterData;assert(rows.find(x=>x.id==='STD-FRANCIA-M42VR-GEARBOX'&&x.technicalData.lubricantVolumeCm3===150));assert(rows.find(x=>x.id==='STD-FRANCIA-M42VR-SCREW'&&x.technicalData.thread==='Tr30x6'));
ctx.window.LubricaSystem={registerModule(){}};load('calculations/screw-jack-calculator.js');
let c=ctx.window.LubricaScrewJackCalculator.calculate({cyclesPerHour:10,operatingHoursPerDay:8,dutyCyclePct:20,environment:'normal'});assert.equal(c.interval.targetCycles,375);assert.equal(c.interval.hours,37.5);assert.equal(c.interval.confidence,'D');
console.log('PASS 1.0.27.19 screw jack FRANCIA M42VR');
