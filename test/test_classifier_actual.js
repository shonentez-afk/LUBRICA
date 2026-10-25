const fs=require('fs'),vm=require('vm');global.window=global;global.LubricaCore={};
vm.runInThisContext(fs.readFileSync('import/component-classifier.js','utf8'),{filename:'classifier.js'});
const items=JSON.parse(fs.readFileSync('test/actual_components.json','utf8'));
const states={},cats={};let malformed=0;
for(const c of items){const r=LubricaClassifier.classifyComponentText(c.name,'');if(!r||!r.state||typeof r.confidence!=='number')malformed++;states[r.state]=(states[r.state]||0)+1;cats[r.category||r.equipmentType||'none']=(cats[r.category||r.equipmentType||'none']||0)+1;}
if(malformed)throw new Error('malformed classifier results: '+malformed);
console.log('ACTUAL CLASSIFIER TEST PASS',items.length,'states='+JSON.stringify(states),'classes='+JSON.stringify(cats));
