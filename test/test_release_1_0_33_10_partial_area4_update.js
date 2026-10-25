const fs=require('fs'),vm=require('vm'),path=require('path');
const base=path.resolve(__dirname,'..');
global.window=global; global.document={}; global.navigator={};
function decode(s){return String(s??'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&')}
class MiniNode{constructor(tag,attrs='',inner='',raw=''){this.tag=tag;this.attrs=attrs;this.inner=inner;this.raw=raw||inner;this.textContent=decode(inner.replace(/<[^>]+>/g,''));}getAttribute(name){const m=this.attrs.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*["\\\']([^"\\\']*)["\\\']','i'));return m?decode(m[1]):null}querySelectorAll(selector){return queryAll(this.inner,selector)}querySelector(selector){return this.querySelectorAll(selector)[0]||null}}
function tagNodes(xml,tag){const out=[];const pair=new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`,'gi');let m;while((m=pair.exec(xml)))out.push(new MiniNode(tag,m[1],m[2],m[0]));const self=new RegExp(`<${tag}\\b([^>]*)\\/>`,'gi');while((m=self.exec(xml)))out.push(new MiniNode(tag,m[1],'',m[0]));return out}
function queryAll(xml,selector){const parts=selector.trim().split(/\s+/);let nodes=tagNodes(xml,parts[0]);for(let i=1;i<parts.length;i++)nodes=nodes.flatMap(n=>tagNodes(n.inner,parts[i]));return nodes}
class DOMParser{parseFromString(text){return{querySelectorAll:s=>queryAll(text,s),querySelector:s=>queryAll(text,s)[0]||null}}} global.DOMParser=DOMParser;
function load(rel){vm.runInThisContext(fs.readFileSync(path.join(base,rel),'utf8'),{filename:rel});}
for(const rel of ['vendor/jszip.min.js','core/ids.js','core/database-schema.js','core/database-normalizer.js','core/database-migrations.js','core/database.js','import/import-engine.js'])load(rel);
function f(p){return{name:path.basename(p),async arrayBuffer(){const b=fs.readFileSync(p);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}}
(async()=>{
 const full='/mnt/data/Участок камеры волокноосаждения(1).xlsx';
 const patch='/mnt/data/Участок камеры волокноосаждения исправление №1.xlsx';
 if(!fs.existsSync(full)||!fs.existsSync(patch)){console.log('1.0.33.10 TEST SKIP: source files missing');return}
 let db=LubricaCore.Database.createEmpty('Тест частичного обновления');
 const p1=await LubricaImport.analyzeFiles([f(full)],db); db=p1.database;
 if(p1.reports[0].format!=='area4')throw new Error('full workbook not detected as area4');
 const eqCount=db.equipment.length, compCount=db.components.length;
 const beforeParent=new Map(db.equipment.map(e=>[e.externalCode,e.parentEquipmentId]));
 const beforeBinding=new Map(db.components.map(c=>[c.externalCode,c.equipmentId]));
 const p2=await LubricaImport.analyzeFiles([f(patch)],db); const out=p2.database;
 if(p2.reports[0].format!=='area4_update')throw new Error('partial workbook not detected as area4_update');
 if(p2.reports[0].positions!==107||p2.reports[0].components!==588)throw new Error(`unexpected update counts ${p2.reports[0].positions}/${p2.reports[0].components}`);
 if(out.equipment.length!==eqCount||out.components.length!==compCount)throw new Error('partial update created duplicates');
 if(out.equipment.some(e=>beforeParent.get(e.externalCode)!==e.parentEquipmentId))throw new Error('equipment hierarchy changed');
 if(out.components.some(c=>beforeBinding.get(c.externalCode)!==c.equipmentId))throw new Error('component binding changed');
 const eq=out.equipment.find(e=>e.externalCode==='10107001');
 const c=out.components.find(e=>e.externalCode==='10107003');
 if(eq?.name!=='Камера волокноосаждения Линия №1')throw new Error('position Description correction not applied');
 if(c?.name!=='Муфта ротационная DXS220R Линия №1')throw new Error('component Description correction not applied');
 if(out.meta.lastImportBatchId!==p2.batchId)throw new Error('successful patch did not become last import batch');
 console.log('1.0.33.10 PARTIAL AREA4 UPDATE TEST PASS',JSON.stringify({positions:p2.reports[0].positions,components:p2.reports[0].components,equipment:out.equipment.length,totalComponents:out.components.length}));
})().catch(e=>{console.error(e);process.exit(1)});
