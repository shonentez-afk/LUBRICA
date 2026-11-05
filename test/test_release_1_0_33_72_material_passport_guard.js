const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const win={console};win.window=win;
vm.runInNewContext(fs.readFileSync(path.join(root,'materials/material-correction.js'),'utf8'),win,{filename:'material-correction.js'});
const Guard=win.LubricaMaterialCorrection;
function fixture(){return{
 materials:[{id:'MAT-0003',code:'GEAR-001',name:'Mobilgear 600 XP 220',kind:'Редукторное масло',
  density:'15,6',isoVg:'220',baseViscosity40:'150',sourceReference:'',approved:true}],
 lubricationPoints:[{id:'P1',targetMaterialId:'MAT-0003'}],
 tasks:[{id:'T1',lubricationPointId:'P1',materialMode:'point_target',approvalStatus:'approved',
  quantity:{approved:'1',unit:'л'}},{id:'T2',lubricationPointId:'P1',materialMode:'none',approvalStatus:'review'}],
 routes:[{id:'R1',taskIds:['T1']}],checklistRuns:[{id:'RUN1',taskResults:[{taskId:'T1'}]}]
};}
const db=fixture(),before=JSON.stringify(db);
const changes={density:'0,89',baseViscosity40:'220',sourceReference:'Mobilgear 600 XP 220 TDS, verified edition'};
const proof={reason:'Correction from verified product datasheet'};
assert(!Guard.preview(db,'MISSING',changes,proof).allowed,'missing material rejected');
assert(!Guard.preview(db,'MAT-0003',changes,{}).allowed,'missing reason rejected');
assert(!Guard.preview(db,'MAT-0003',{density:'16',sourceReference:changes.sourceReference},proof).allowed,'implausible density rejected');
let p=Guard.preview(db,'MAT-0003',changes,proof);
assert(p.allowed&&p.changed&&p.technicalChanged,'valid correction preview');
assert.equal(p.affectedTaskIds.length,1);
assert.equal(p.approvedTaskIds[0],'T1','approved task impact must be explicit');
assert.equal(JSON.stringify(db),before,'preview never mutates DB');
assert.equal(Guard.apply(db,p,changes,proof).changed,true);
assert.equal(db.materials[0].density,'0,89');
assert.equal(db.materials[0].baseViscosity40,'220');
assert.equal(db.materials[0].engineeringCorrectionHistory.length,1);
assert.equal(db.tasks[0].approvalStatus,'approved','no silent task approval alteration');
assert.equal(db.tasks[0].quantity.approved,'1','no quantity change');
assert.equal(db.routes[0].taskIds[0],'T1','route preserved');
assert.equal(db.checklistRuns[0].taskResults[0].taskId,'T1','fact preserved');
assert.throws(()=>Guard.apply(db,p,changes,proof),'stale preview rejected');
const second=Guard.preview(db,'MAT-0003',{density:'0,9'},proof);
db.materials[0].sourceReference='A new revision';
assert.throws(()=>Guard.apply(db,second,{density:'0,9'},proof),'concurrent modification rejected');
const nonTech=Guard.preview(db,'MAT-0003',{name:'Corrected product name'},{});
assert(nonTech.allowed&&!nonTech.technicalChanged);
assert.equal(Guard.apply(db,nonTech,{name:'Corrected product name'},{}).changed,true);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.indexOf('./materials/material-correction.js')<html.indexOf('./materials/library-ui.js'),'guard loads first');
const ui=fs.readFileSync(path.join(root,'materials/library-ui.js'),'utf8');
for(const x of ['LubricaMaterialCorrection','Проверить изменения материала','LUBRICA_material_backup_','Guard.apply'])
 assert(ui.includes(x),'UI integration '+x);
console.log('PASS Stage 4: material engineering preview, source, immutable history, stale guard, impact and preservation');
