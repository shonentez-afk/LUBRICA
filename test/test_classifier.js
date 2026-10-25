const fs=require('fs'),vm=require('vm'),path=require('path');
const base=path.resolve(__dirname,'..');
global.window=global;
function load(rel){const p=path.join(base,rel);vm.runInThisContext(fs.readFileSync(p,'utf8'),{filename:p});}
load('import/component-classifier.js');
const bs=LubricaClassifier.classifyComponentText('ШВП 32x10');if(bs.category!=='ball_screw'){console.error('FAIL ball screw',bs);process.exit(1)}else console.log('OK ШВП 32x10 => ball_screw');
const linear=LubricaClassifier.classifyComponentText('Линейный подшипник LM25UU');if(linear.category!=='linear_bearing'){console.error('FAIL linear bearing',linear);process.exit(1)}else console.log('OK Линейный подшипник LM25UU => linear_bearing');
const component=LubricaClassifier.classifyComponentText('Подшипник 6205-2RS1');if(component.category!=='bearing'){console.error('FAIL component bearing',component);process.exit(1)}else console.log('OK Подшипник 6205-2RS1 => bearing');
const tests=[['Насос плунжерный NP25/25-250','pump'],['Насос шестеренный TFP100/4.3 D CO01','pump'],['Насос винтовой XYZ','pump'],['Вал приводной','rotating_shaft'],['Вал натяжной','rotating_shaft'],['Ролик приводной','roller'],['Барабан натяжной','drum'],['Домкрат винтовой M42VT','screw_jack'],['Кардан 71.G4.090.090','cardan'],['Механизм кривошипно-шатунный основной','crank'],['Компрессор №1','compressor'],['Гидростанция GA0504 S11','hydraulic_station']
];
let failed=0;
for(const [text,expected] of tests){const r=LubricaClassifier.classifyEquipmentText(text);const actual=r?.equipmentType||r?.type||r?.category||r?.maintenanceEquipmentType;const ok=actual===expected;if(!ok){failed++;console.error('FAIL',text,'expected',expected,'got',actual,r)}else console.log('OK',text,'=>',expected)}
if(failed)process.exit(1);console.log('CLASSIFIER TEST PASS');
