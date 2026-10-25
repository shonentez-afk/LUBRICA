const fs=require('fs');
const s=fs.readFileSync('lubrication/task-editor.js','utf8');
const start=s.indexOf('function bearingCalcBaseInput');
const end=s.indexOf('function calcMessages',start);
if(start<0||end<0) throw new Error('bearingCalcBaseInput block not found');
const block=s.slice(start,end);
if(!/const isSlewingRing=record\?\.bearingType===/.test(block)) throw new Error('local isSlewingRing declaration missing');
if(!/temperatureC:isSlewingRing\?/.test(block)) throw new Error('VLU temperature branch missing');
console.log('PASS 1.0.27.16 VLU slewing scope hotfix');
