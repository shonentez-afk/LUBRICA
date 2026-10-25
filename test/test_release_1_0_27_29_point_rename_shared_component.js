const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'structure/point-wizard.js'),'utf8');
function a(v,m){if(!v)throw new Error(m)}
a(src.includes("sameExistingBinding=!!(existingLp&&existingLp.componentBinding?.sourceComponentId===component.id)"),'edit refresh must recognize unchanged structural binding');
a(src.includes("const linked=sameExistingBinding?null:"),'edit refresh must not flag another point when current structural binding is unchanged');
a(src.includes("sameExistingBinding=!!(existingLp&&existingLp.componentBinding?.sourceComponentId===sourceComponentId)"),'save must recognize unchanged structural binding');
a(src.includes("const duplicate=!sameExistingBinding&&sourceComponentId"),'duplicate guard must be skipped only for unchanged edit binding');
a(src.includes('Можно безопасно изменить название, положение и другие поля точки'),'UI must explain safe rename/edit');
console.log('PASS 1.0.27.29 point rename with shared component');
