const fs=require('fs');
const c=fs.readFileSync(__dirname+'/../import/candidates.js','utf8');
if(!c.includes('<option value="fan">Вентилятор</option>')) throw new Error('fan category filter missing');
console.log('PASS fan classifier filter UX 1.0.28.3');
