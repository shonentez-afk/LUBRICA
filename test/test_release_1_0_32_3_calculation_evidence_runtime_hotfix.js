const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('lubrication/task-editor.js','utf8');
if(src.includes('point?.equipmentName')) throw new Error('undeclared point reference remains in evidence handler');
if(!src.includes("lp?.equipmentName||lp?.name")) throw new Error('evidence handler must use current lubrication point');
if(!src.includes("addEventListener('click',openCalculationEvidence)")) throw new Error('evidence buttons are not wired to shared handler');
if(!src.includes("sourceApi.openRegistry({host:dialog")) throw new Error('evidence must open in current calculator dialog');
console.log('PASS: 1.0.32.3 calculation evidence runtime hotfix');
