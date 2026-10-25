const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const adapter=fs.readFileSync(path.join(root,'calculations/gearbox-oil-adapter.js'),'utf8');
const editor=fs.readFileSync(path.join(root,'lubrication/task-editor.js'),'utf8');
const workspace=fs.readFileSync(path.join(root,'ui/workspace.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'core/database-schema.js'),'utf8');
function ok(v,msg){if(!v){console.error('FAIL',msg);process.exit(1)}}
ok(adapter.includes('approvedFillLiters:appliedFillLiters'),'Apply calculation must promote effective fill to approved fill');
ok(adapter.includes('appliedAt'),'Applied result marker missing');
ok(adapter.includes("approved:cc.approvedFillLiters!=null?String(cc.approvedFillLiters):(cc.appliedAt&&cc.effectiveFillLiters!=null?String(cc.effectiveFillLiters)"),'Gearbox task sync must write applied quantity');
ok(editor.includes("gc.appliedAt&&gc.effectiveFillLiters!=null?String(gc.effectiveFillLiters)"),'Task editor must preserve/repair applied gearbox quantity');
ok(workspace.includes('p.qty!=null')&&workspace.includes('<small>расч.</small>'),'Workspace keeps calc badge only as fallback when approved qty is absent');
ok(schema.includes("appVersion:'1.0.33.39'"),'App version not bumped');
console.log('PASS 1.0.33.33 gearbox apply-to-task quantity sync');
