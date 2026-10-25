const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const sandbox={window:{}};sandbox.window.window=sandbox.window;sandbox.window.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null};
sandbox.window.LubricaCore={IDs:{nextFrom(arr,prefix,digits){let n=1;while((arr||[]).some(x=>x.id===`${prefix}-${String(n).padStart(digits,'0')}`))n++;return `${prefix}-${String(n).padStart(digits,'0')}`}}};
vm.createContext(sandbox);
for(const rel of ['import/component-classifier.js','conveyors/conveyor-arrangement.js'])vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox);
const C=sandbox.window.LubricaClassifier;
for(const name of ['Конвейер скребковый L=25150 мм Линия №1','Конвейер скребковый L=10745 мм Линия №1','Конвейер отходов продольный Линия №1','Конвейер отходов поперечный Линия №1']){
 const r=C.classifyEquipmentText(name,'');assert.equal(r.equipmentType,'conveyor',name);assert.equal(r.equipmentSubtype,'chain_scraper',name);assert.equal(r.template.id,'conveyor_arrangement');assert.equal(r.template.conveyorSubtype,'chain_scraper');
}
let star=C.classifyComponentText('Звездочка цепная P=5/8 D=30','');assert.equal(star.state,'excluded');
const db={components:[],equipment:[],meta:{}};const eq={id:'EQ-1',name:'Конвейер отходов продольный',equipmentType:'conveyor',origin:'manual',status:'active'};db.equipment.push(eq);
sandbox.window.LubricaConveyorArrangement.ensureManualComponents(db,eq,{conveyorSubtype:'chain_scraper',driveShaftName:'Вал приводной',returnShaftRole:'tension',driveLeftBearing:'UKFC 215',driveRightBearing:'UKFC 215',returnLeftBearing:'UKFC 211',returnRightBearing:'UKFC 211',chainEnabled:true,chainName:'Цепь скребковая',driveMode:'gearbox',gearboxName:'Редуктор'});
assert.equal(eq.manualConveyorSetup.conveyorSubtype,'chain_scraper');assert.equal(db.components.filter(x=>x.manualConveyorSupport).length,4);assert(db.components.some(x=>x.manualConveyorRole==='chain'));assert(db.components.some(x=>x.manualConveyorRole==='drive_gearbox'));
console.log('PASS 1.0.33.47 chain/scraper conveyor: import recognition + 4 supports + chain + manual parity');
