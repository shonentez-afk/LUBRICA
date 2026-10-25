const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const demo=fs.readFileSync(path.join(root,'data/demo-data.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'core/database-schema.js'),'utf8');
if(m.appVersion!=='1.0.32.5'||m.version!=='1.0.32.5') throw new Error('manifest version mismatch');
if(!demo.includes('APP_VERSION="1.0.32.5"')) throw new Error('demo version mismatch');
if(!schema.includes("appVersion:'1.0.32.5'")) throw new Error('schema version mismatch');
console.log('1.0.32.5 version synchronization: OK');
