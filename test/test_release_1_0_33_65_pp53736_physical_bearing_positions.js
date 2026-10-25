const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nextFrom=(arr,prefix,width)=>{let m=0;for(const x of arr||[]){const q=String(x.id||'').match(new RegExp('^'+prefix+'-(\\d+)$'));if(q)m=Math.max(m,Number(q[1]));}return `${prefix}-${String(m+1).padStart(width,'0')}`};
function runtime(db){
 const ctx={window:{},console};ctx.window=ctx;
 ctx.LubricaCore={IDs:{nextFrom},State:{getDatabase:()=>db},Database:{normalize:x=>x}};
 ctx.LubricaStructureContext={activityLabel:t=>({oil_change:'Замена масла',lubricant_apply:'Нанесение смазки',regrease:'Досмазывание'})[t]||t,activityNeedsMaterial:t=>['oil_change','lubricant_apply','regrease'].includes(t)};
 ctx.LubricaComponentBinding={bindPoint:(p,{sourceComponent})=>p.componentBinding={sourceComponentId:sourceComponent?.id||null}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('machines/izoteh-pp53736-arrangement.js','utf8'),ctx);return ctx.LubricaPP53736Arrangement;
}
function empty(){return {lines:[{id:'LINE-0001',name:'Линия 1'}],areas:[{id:'AREA-0011',lineId:'LINE-0001',name:'Камеры полимеризации'}],equipment:[],components:[],nodes:[],lubricationPoints:[],tasks:[]}}
const db=empty();const root={id:'EQ-000001',lineId:'LINE-0001',areaId:'AREA-0011',parentEquipmentId:null,name:'PP-53736',externalCode:'',equipmentType:'other',manufacturer:'',model:'',source:'Ручное добавление',status:'active',origin:'manual',manualMachineProfilePreset:'izoteh_pp53736'};db.equipment.push(root);
const A=runtime(db);A.prepareManualRoot(db,root);
// Simulate a 1.0.33.64 one-TMC/one-point bearing record. The new physical topology must migrate it away.
db.nodes.push({id:'NODE-900001',equipmentId:db.equipment.find(e=>e.name==='Конвейер роликовый нижний').id,name:'Подшипники PP-53736',machineProfileId:'IZOTEH-PP53736',machineProfileOriginKey:`machine:IZOTEH-PP53736:${root.id}:bearing_COMP-OLD:node`});
db.lubricationPoints.push({id:'LP-900001',equipmentId:db.equipment.find(e=>e.name==='Конвейер роликовый нижний').id,nodeId:'NODE-900001',name:'Старая единичная точка FY 30 TF',category:'bearing',machineProfileId:'IZOTEH-PP53736',machineProfileOriginKey:`machine:IZOTEH-PP53736:${root.id}:bearing_COMP-OLD`});
db.tasks.push({id:'TASK-900001',lubricationPointId:'LP-900001',activityType:'regrease',machineProfileId:'IZOTEH-PP53736',machineProfileOriginKey:`machine:IZOTEH-PP53736:${root.id}:bearing_COMP-OLD|regrease`});
assert.deepStrictEqual(JSON.parse(JSON.stringify(A.PROFILE.rollerLayout)),{lower:{rollers:28,standard:28,large:0},upper:{rollers:23,standard:19,large:4},physicalBearingPositions:102});
const documented=db.components.filter(c=>c.machineProfileBearingRepresentative);
assert.strictEqual(documented.length,5,'manual profile should create only five documented bearing type representatives, not one component per physical support');
for(const expected of ['FY 30 TF','SYF 30 TF','FY 40 TF'])assert(documented.some(c=>c.name.includes(expected)),expected);
A.applyConfiguration(db,root,{r77Count:0,s37State:'not_installed',chainsEnabled:false,jacksEnabled:false,bearingsEnabled:true});
const roller=db.lubricationPoints.filter(p=>/roller_bearing_/.test(p.machineProfileOriginKey||''));
assert.strictEqual(roller.length,102,'drawing topology must expand to 102 physical roller-bearing service locations');
assert(!db.lubricationPoints.some(p=>p.id==='LP-900001'),'legacy one-TMC/one-point bearing record must be removed during migration');
assert(!db.tasks.some(t=>t.id==='TASK-900001'),'legacy task attached to stale one-point record must be removed');
const lower=roller.filter(p=>p.equipmentId===db.equipment.find(e=>e.name==='Конвейер роликовый нижний').id);
const upper=roller.filter(p=>p.equipmentId===db.equipment.find(e=>e.name==='Конвейер роликовый верхний').id);
assert.strictEqual(lower.length,56,'28 lower rollers x 2 supports');
assert.strictEqual(upper.length,46,'23 upper rollers x 2 supports');
const count=n=>roller.filter(p=>(p.installedComponent?.name||'').includes(n)).length;
assert.strictEqual(count('FY 30 TF'),47,'28 lower + 19 upper FY30 positions');
assert.strictEqual(count('SYF 30 TF'),47,'28 lower + 19 upper SYF30 positions');
assert.strictEqual(count('FY 40 TF'),8,'4 enlarged upper inlet rollers x 2 supports');
assert.strictEqual(new Set(roller.map(p=>p.machineProfileOriginKey)).size,102,'every physical position needs a stable unique origin key');
assert(roller.every(p=>/^Валок №\d{2} · опора [AB] · /.test(p.name)), 'physical positions must be individually named');
assert(roller.every(p=>db.tasks.some(t=>t.lubricationPointId===p.id&&t.schedule?.approvedHours===200)),'every physical roller bearing position must receive the 200 h machine-OEM interval');
const nodes=db.nodes.filter(n=>n.name==='Подшипники валков PP-53736');
assert.strictEqual(nodes.length,2,'one shared bearing group per upper/lower conveyor, not a duplicate node for every point');
const firstIds=new Set(roller.map(p=>p.id));A.applyConfiguration(db,root,{r77Count:0,s37State:'not_installed',chainsEnabled:false,jacksEnabled:false,bearingsEnabled:true});
const roller2=db.lubricationPoints.filter(p=>/roller_bearing_/.test(p.machineProfileOriginKey||''));
assert.strictEqual(roller2.length,102,'repeat apply must be idempotent');assert.strictEqual(new Set(roller2.map(p=>p.id)).size,firstIds.size);
console.log('PASS 1.0.33.65 PP53736 physical bearing positions');
