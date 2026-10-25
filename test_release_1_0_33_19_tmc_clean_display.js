const fs=require('fs'),assert=require('assert');
const s=fs.readFileSync(__dirname+'/import/candidate-finalizer.js','utf8');
assert(s.includes("cleanTmcName=v=>String(v??'').replace(/\\s+Линия"),'cleanTmcName missing');
assert(s.includes('displayName:cleanTmcName(linkedComponent.name)'),'installed component must expose clean service TMC display name');
assert(s.includes('name:linkedComponent.name'),'original imported TMC name must remain canonical');
assert(s.includes('sourceName:linkedComponent.name'),'original imported TMC name must remain traceable');
assert(s.includes("esc(cleanTmcName(s.sourceRef.name))"),'constructor TMC display must use clean name');
console.log('PASS 1.0.33.19 service TMC display cleanup preserves sourceName');
