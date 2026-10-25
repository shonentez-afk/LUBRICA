const fs=require('fs'),vm=require('vm'),path=require('path');
const base=path.resolve(__dirname,'..');global.window=global;global.document={};global.navigator={};
function decode(s){return String(s??'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&')}
class MiniNode{constructor(tag,attrs='',inner=''){this.tag=tag;this.attrs=attrs;this.inner=inner;this.textContent=decode(inner.replace(/<[^>]+>/g,''))}getAttribute(name){const m=this.attrs.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*["\\\']([^"\\\']*)["\\\']','i'));return m?decode(m[1]):null}querySelectorAll(s){return queryAll(this.inner,s)}querySelector(s){return this.querySelectorAll(s)[0]||null}}
function tagNodes(xml,tag){const out=[];let m;const pair=new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`,'gi');while((m=pair.exec(xml)))out.push(new MiniNode(tag,m[1],m[2]));const self=new RegExp(`<${tag}\\b([^>]*)\\/>`,'gi');while((m=self.exec(xml)))out.push(new MiniNode(tag,m[1],''));return out}
function queryAll(xml,selector){const parts=selector.trim().split(/\s+/);let nodes=tagNodes(xml,parts[0]);for(let i=1;i<parts.length;i++)nodes=nodes.flatMap(n=>tagNodes(n.inner,parts[i]));return nodes}
global.DOMParser=class{parseFromString(text){return{querySelectorAll:s=>queryAll(text,s),querySelector:s=>queryAll(text,s)[0]||null}}};
function load(rel){vm.runInThisContext(fs.readFileSync(path.join(base,rel),'utf8'),{filename:rel})}
for(const rel of ['vendor/jszip.min.js','core/ids.js','core/database-schema.js','core/database-normalizer.js','core/database-migrations.js','core/database.js','import/import-engine.js'])load(rel);

function xesc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function cell(ref,v){return `<c r="${ref}" t="inlineStr"><is><t>${xesc(v)}</t></is></c>`}
function row(n,vals){return `<row r="${n}">${vals.map((v,i)=>cell(String.fromCharCode(65+i)+n,v)).join('')}</row>`}
async function makeXlsx(){
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
 zip.file('xl/workbook.xml','<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Структура" sheetId="1" r:id="rId1"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
 const headers=['Оборудование','Тип в структуре','Путь','Наименование оборудования','Уровень в структуре','Расположение','Оборудование внешней системы'];
 const rows=[
  headers,
  ['ROOT','Система','ROOT','Завод','0','',''],
  ['L1','Система','ROOT,L1','Линия 1','1','',''],
  ['A1','Система','ROOT,L1,A1','Участок 1','2','',''],
  ['E1','Позиция','ROOT,L1,A1,E1','Насос 1','3','','EXT-E1'],
  ['C1','Объект ремонта','ROOT,L1,A1,E1,C1','Подшипник 1','4','','EXT-C1']
 ];
 zip.file('xl/worksheets/sheet1.xml',`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r,i)=>row(i+1,r)).join('')}</sheetData></worksheet>`);
 const b=await zip.generateAsync({type:'nodebuffer'});
 return {name:'Структура оборудования.xlsx',async arrayBuffer(){return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
}
(async()=>{
 const file=await makeXlsx(),empty=LubricaCore.Database.createEmpty('Repeat Import');
 const p1=await LubricaImport.analyzeFiles([file],empty);
 if(p1.database.equipment.length!==1||p1.database.components.length!==1)throw new Error(`first import wrong eq=${p1.database.equipment.length} comp=${p1.database.components.length}`);
 const p2=await LubricaImport.analyzeFiles([file],p1.database);
 if(p2.database.equipment.length!==1||p2.database.components.length!==1)throw new Error('repeat import created duplicates');
 if(p2.summary.newEquipment!==0||p2.summary.newComponents!==0)throw new Error('repeat import marked duplicates as new');
 if(p2.summary.updatedEquipment!==1||p2.summary.updatedComponents!==1)throw new Error('repeat import did not update existing objects');
 console.log('STAGE 9.9 REPEAT IMPORT TEST PASS',JSON.stringify(p2.summary));
})().catch(e=>{console.error(e);process.exit(1)});
