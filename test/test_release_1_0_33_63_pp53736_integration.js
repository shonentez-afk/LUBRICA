const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const txt=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const index=txt('index.html'),classifier=txt('import/component-classifier.js'),detail=txt('structure/detail-ui.js'),finalizer=txt('import/candidate-finalizer.js'),registry=txt('bearings/source-registry.js'),audit=txt('calculations/source-integrity-audit.js');
assert(index.includes('./machines/izoteh-pp53736-arrangement.js'));
assert(index.indexOf('./machines/izoteh-pp53736-arrangement.js')<index.indexOf('./import/candidate-finalizer.js'));
assert(classifier.includes("template('izoteh_pp53736'"));
assert(detail.includes('data-pp53736-arrangement'));
assert(finalizer.includes("rawTemplate?.id==='izoteh_pp53736'"));
for(const id of ['IZOTEH-PP53736-MANUAL','IZOTEH-PP53736-DRAWING']){assert(registry.includes(id));assert(audit.includes(id));}
for(const f of ['assets/oem/izoteh/53736_Predpresa_RUS.pdf','assets/oem/izoteh/53736_predpresa_1.pdf','assets/oem/izoteh/53736_predpresa_2.pdf','assets/oem/izoteh/53736_predpresa_3.pdf','assets/oem/izoteh/53736_predpresa_4.pdf','assets/oem/izoteh/53736_predpresa_5.pdf'])assert(fs.existsSync(path.join(__dirname,'..',f)),f);
// Current registry integrity: new machine-profile sources must be intentionally classified, not unexplained.
global.window=global;global.LubricaSystem={registerModule(){}};global.document={addEventListener(){}};
function load(f){vm.runInThisContext(txt(f),{filename:f});}
['components/starter-data.js','components/screw-jack-data.js','bearings/multi-oem-data.js','bearings/offline-evidence.js','bearings/source-registry.js','calculations/registry.js'].forEach(load);
['bearing','motor-bearing','chain','screw-jack','gearbox-oil','ball-screw','linear-bearing','coupling','grease-point','oil-system','open-gear','wire-rope','central-lubrication'].forEach(id=>LubricaCalculationRegistry.register({id,status:'ready',open(){}}));
load('calculations/source-integrity-audit.js');
const a=LubricaSourceIntegrityAudit.audit();assert(a.ok,JSON.stringify(a));assert(!a.unexplainedRegistrySources.includes('IZOTEH-PP53736-MANUAL'));assert(!a.unexplainedRegistrySources.includes('IZOTEH-PP53736-DRAWING'));
console.log('PASS 1.0.33.63 PP53736 integration');
