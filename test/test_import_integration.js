const fs=require('fs'),vm=require('vm'),path=require('path');
const base=path.resolve(__dirname,'..');
global.window=global; global.document={}; global.navigator={};
function decode(s){return String(s??'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&')}
class MiniNode{
  constructor(tag,attrs='',inner='',raw=''){this.tag=tag;this.attrs=attrs;this.inner=inner;this.raw=raw||inner;this.textContent=decode(inner.replace(/<[^>]+>/g,''));}
  getAttribute(name){const m=this.attrs.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*["\\\']([^"\\\']*)["\\\']','i'));return m?decode(m[1]):null}
  querySelectorAll(selector){return queryAll(this.inner,selector)}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
}
function tagNodes(xml,tag){
  const out=[]; const pair=new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`,'gi'); let m;
  while((m=pair.exec(xml)))out.push(new MiniNode(tag,m[1],m[2],m[0]));
  const self=new RegExp(`<${tag}\\b([^>]*)\\/>`,'gi'); while((m=self.exec(xml)))out.push(new MiniNode(tag,m[1],'',m[0]));
  return out;
}
function queryAll(xml,selector){
  const parts=selector.trim().split(/\s+/); let nodes=tagNodes(xml,parts[0]);
  for(let i=1;i<parts.length;i++) nodes=nodes.flatMap(n=>tagNodes(n.inner,parts[i]));
  return nodes;
}
class DOMParser{parseFromString(text){return {querySelectorAll:s=>queryAll(text,s),querySelector:s=>queryAll(text,s)[0]||null}}}
global.DOMParser=DOMParser;
function load(rel){vm.runInThisContext(fs.readFileSync(path.join(base,rel),'utf8'),{filename:rel});}
for(const rel of ['vendor/jszip.min.js','core/ids.js','core/database-schema.js','core/database-normalizer.js','core/database-migrations.js','core/database.js','import/import-engine.js'])load(rel);
const inputDir=process.env.LUBRICA_IMPORT_DIR||'/mnt/data';
const names=['Участок ламинирования и кэширования.xlsx','Участок упаковки.xlsx','Участок распиловки.xlsx','Участок возврата отходов краёв.xlsx','Участок камеры полимеризации.xlsx','Участок камеры волокноосаждения.xlsx','Участок центрифуг.xlsx','Участок дожига ваграночных газов.xlsx','Участок вагранки.xlsx','Участок загрузки суточных силосов структура и позиции.xlsx','Структура оборудования_01.09.2026.xlsx'];
const available=names.filter(n=>fs.existsSync(path.join(inputDir,n)));
if(!available.length){console.log('IMPORT INTEGRATION TEST SKIP: source XLSX files not found');process.exit(0)}
if(available.length!==11)throw new Error(`Expected 11 import files, found ${available.length}`);
function f(name){return {name,async arrayBuffer(){const b=fs.readFileSync(path.join(inputDir,name));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}}
(async()=>{
 let db=LubricaCore.Database.createEmpty('Интеграционный тест импорта');
 const plan=await LubricaImport.analyzeFiles(available.map(f),db);
 if(!plan?.database)throw new Error('database not returned');
 const d=plan.database;
 const ids=a=>new Set((a||[]).map(x=>String(x.id)));
 const eq=ids(d.equipment),areas=ids(d.areas);
 const badEq=d.equipment.filter(e=>e.areaId&&!areas.has(String(e.areaId)));
 const badParent=d.equipment.filter(e=>e.parentEquipmentId&&!eq.has(String(e.parentEquipmentId)));
 if(badEq.length||badParent.length)throw new Error(`broken refs area=${badEq.length}, parent=${badParent.length}`);
 const p2=await LubricaImport.analyzeFiles(available.map(f),d);
 if(p2.database.equipment.length!==d.equipment.length||p2.database.components.length!==d.components.length)throw new Error('repeat import created duplicates');
 if(d.equipment.length!==1244||d.components.length!==5672||d.lines.length!==2||d.areas.length!==24)throw new Error(`unexpected import result eq=${d.equipment.length} comp=${d.components.length} lines=${d.lines.length} areas=${d.areas.length}`);
 console.log('IMPORT INTEGRATION TEST PASS',JSON.stringify({files:plan.summary.files,equipment:d.equipment.length,components:d.components.length,areas:d.areas.length,lines:d.lines.length,note:'relationship/orphan count is validated by test_source_xlsx_audit.py'}));
})().catch(e=>{console.error(e);process.exit(1)});
