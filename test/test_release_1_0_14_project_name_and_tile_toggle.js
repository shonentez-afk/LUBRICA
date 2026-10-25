const fs=require('fs'),vm=require('vm'),path=require('path');
const base=path.resolve(__dirname,'..');
global.window=global;global.LubricaCore={};
for(const rel of ['core/database-schema.js','core/database-normalizer.js']){
  vm.runInThisContext(fs.readFileSync(path.join(base,rel),'utf8'),{filename:rel});
}
function ok(c,m){if(!c)throw new Error(m)}
const N=LubricaCore.DatabaseNormalizer;
let db=N.normalize({schemaVersion:'2.0',project:{name:'АО Полный завод ЖБИ'},plants:[{id:'PLANT-0001',name:'Завод'}],lines:[{id:'LINE-1',name:'Линия 1'}]});
ok(db.plants[0].name==='АО Полный завод ЖБИ','generic plant name was not restored from project.name');
ok(db.lines[0].plantId==='PLANT-0001','line plant link broken');
let db2=N.normalize({schemaVersion:'2.0',project:{name:'Завод'},plants:[{id:'PLANT-0001',name:'Производственный комплекс Север'}],lines:[]});
ok(db2.project.name==='Производственный комплекс Север','project name was not restored from meaningful plant name');
const ws=fs.readFileSync(path.join(base,'ui/workspace-enhancements.js'),'utf8');
ok(ws.includes("requested!=='all'&&select.value===requested")&&ws.includes("?'all':requested"),'workspace KPI repeated-click toggle missing');
const cand=fs.readFileSync(path.join(base,'import/candidates.js'),'utf8');
ok(cand.includes("requested!=='all'&&stateFilter===requested")&&cand.includes("x.dataset.state===next"),'candidate repeated-click toggle missing');
const imp=fs.readFileSync(path.join(base,'import/import-engine.js'),'utf8');
ok(imp.includes("/^завод$/i.test(requested)&&projectName")&&imp.includes("effective"),'import project-name protection missing');

const session=fs.readFileSync(path.join(base,'core/database-session-ui.js'),'utf8');
ok(session.includes('function preferredDatabaseName')&&session.includes('safeDbFileName(preferredDatabaseName(db))'),'database filename/display fallback missing');
const settings=fs.readFileSync(path.join(base,'ui/checks-settings.js'),'utf8');
ok(settings.includes('function preferredUiDatabaseName')&&settings.includes('preferredUiDatabaseName(db'),'settings/topbar display fallback missing');

console.log('RELEASE 1.0.14 PROJECT NAME + KPI TILE TOGGLE PASS');
