(function(global){
'use strict';
const Core=global.LubricaCore;
const API=global.LubricaImport=global.LubricaImport||{};
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ');
const stripPrefix=v=>clean(v).replace(/^\s*(?:-\s*)+/,'').trim();
const stripLineSuffix=v=>stripPrefix(v).replace(/[.\s]*линия\s*№?\s*\d+\s*$/i,'').replace(/[.\s]+$/,'').trim();
const baseName=name=>clean(name).replace(/\.xlsx?$/i,'').replace(/^Участок\s+/i,'').replace(/\s+структура\s+и\s+позиции$/i,'').trim();
const lineNameFromText=v=>{const m=clean(v).match(/линия\s*№?\s*(\d+)/i);return m?`Линия ${m[1]}`:''};
const lineCodeFromAreaSystem=code=>{const s=clean(code);return /^\d{8}$/.test(s)?s.slice(0,3)+'00000':''};
const inferEquipmentType=name=>{const t=norm(name);if(/мотор-редуктор/.test(t))return'motor_gearbox';if(/электродвиг|\bмотор\b|вибромотор/.test(t))return'motor';if(/вентилятор|дымосос|воздуходув|эксгауст/.test(t))return'fan';if(/редуктор|вариатор|коробк[аи] передач/.test(t))return'gearbox';if(/конвейер|транспортер|транспортёр/.test(t))return'conveyor';if(/гидростанц/.test(t))return'hydraulic_station';if(/маслостанц/.test(t))return'oil_station';if(/насос/.test(t))return'pump';if(/винтовой\s+домкрат|домкрат\s+винтов/.test(t))return'screw_jack';if(/компрессор/.test(t))return'compressor';if(/кардан/.test(t))return'cardan';if(/кривошип/.test(t))return'crank';if(/шпиндел/.test(t))return'spindle';if(/(?:^|\s)вал(?:\s|$)/.test(t))return'rotating_shaft';if(/(?:^|\s)ролик(?:\s|$)/.test(t)&&!/цепь\s+роликов/.test(t))return'roller';if(/барабан/.test(t))return'drum';return'other'};
function xmlDoc(text){const d=new DOMParser().parseFromString(text,'application/xml');const err=d.querySelector('parsererror');if(err)throw new Error('Ошибка чтения XML внутри XLSX');return d}
function colIndex(ref){const s=(ref.match(/[A-Z]+/i)||['A'])[0].toUpperCase();let n=0;for(const c of s)n=n*26+c.charCodeAt(0)-64;return n-1}
async function readWorkbook(file){
 if(typeof JSZip==='undefined')throw new Error('Модуль ZIP/XLSX не загружен');
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const wbFile=zip.file('xl/workbook.xml');if(!wbFile)throw new Error('Файл не похож на XLSX');
 const shared=[];const sf=zip.file('xl/sharedStrings.xml');if(sf){const d=xmlDoc(await sf.async('text'));d.querySelectorAll('si').forEach(si=>shared.push(Array.from(si.querySelectorAll('t')).map(x=>x.textContent).join('')))}
 const relMap=new Map();const rf=zip.file('xl/_rels/workbook.xml.rels');if(rf){const d=xmlDoc(await rf.async('text'));d.querySelectorAll('Relationship').forEach(r=>relMap.set(r.getAttribute('Id'),r.getAttribute('Target')))}
 const wd=xmlDoc(await wbFile.async('text')),sheets=[];
 for(const s of wd.querySelectorAll('sheet')){
   const name=s.getAttribute('name')||'Sheet';const rid=s.getAttribute('r:id')||s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
   let target=relMap.get(rid)||'';if(target.startsWith('/'))target=target.slice(1);else if(target&&!target.startsWith('xl/'))target='xl/'+target.replace(/^\.\//,'');
   const f=zip.file(target)||zip.file(`xl/worksheets/sheet${sheets.length+1}.xml`);if(!f)continue;
   const d=xmlDoc(await f.async('text')),matrix=[];
   d.querySelectorAll('row').forEach(row=>{const arr=[];row.querySelectorAll('c').forEach(c=>{const ix=colIndex(c.getAttribute('r')||'A1'),type=c.getAttribute('t')||'',v=c.querySelector('v')?.textContent??'',inline=Array.from(c.querySelectorAll('is t')).map(x=>x.textContent).join('');let out=type==='s'?shared[Number(v)]??v:type==='inlineStr'?inline:(inline||v);arr[ix]=out});matrix.push(arr)});
   sheets.push({name,matrix});
 }
 return {fileName:file.name,sheets};
}
function rowsOf(sheet){const m=sheet?.matrix||[];if(!m.length)return[];const headers=m[0].map(clean),keys=headers.map(norm);return m.slice(1).filter(r=>r.some(v=>clean(v)!=='')).map(r=>{const o={};keys.forEach((k,i)=>{if(k)o[k]=r[i]??''});o.__raw=r;return o})}
function get(o,...names){for(const n of names){const v=o[norm(n)];if(v!==undefined&&clean(v)!=='')return v}return''}
function sheetMap(wb){const m=new Map();wb.sheets.forEach(s=>m.set(norm(s.name),s));return m}
function detectWorkbook(wb){const sm=sheetMap(wb),names=new Set(wb.sheets.map(s=>norm(s.name)));if(['позиции','структура позиций','тмц','структура тмц'].every(x=>names.has(x)))return'area4';const patchSheets=[...names].filter(x=>x==='позиции'||x==='тмц');if(patchSheets.length&&[...names].every(x=>x==='позиции'||x==='тмц')){const valid=patchSheets.every(n=>{const h=(sm.get(n)?.matrix?.[0]||[]).map(norm);return n==='позиции'?h.includes('position')&&h.includes('description'):h.includes('asset')&&h.includes('description')});if(valid)return'area4_update'}const first=wb.sheets[0];const h=(first?.matrix?.[0]||[]).map(norm);if(['оборудование','тип в структуре','путь','наименование оборудования','уровень в структуре'].every(x=>h.includes(x)))return'full_structure';if(names.has('карта смазки')||names.has('выбор смазочного материала'))return'lubrication_map';return'unknown'}
function ensurePlant(db,name='Завод',code='',origin='import'){
 const requested=clean(name)||'Завод',projectName=clean(db?.project?.name),effective=(/^завод$/i.test(requested)&&projectName&&!/^завод$/i.test(projectName))?projectName:requested;
 let p=(db.plants||[])[0];if(!p){p={id:Core.IDs.nextFrom(db.plants||[],'PLANT',4),name:effective||'Завод',code:code||'',description:'',origin};db.plants=[p]}else if((!p.name||/^завод$/i.test(p.name))&&effective)p.name=effective;if(code&&!p.code)p.code=code;if((!db.project?.name||/^завод$/i.test(db.project.name))&&p.name&&!/^завод$/i.test(p.name))db.project={...(db.project||{}),name:p.name};return p
}
function ensureLine(db,plantId,name,externalCode='',origin='import'){
 let x=(db.lines||[]).find(v=>clean(v.externalCode)===clean(externalCode)&&externalCode)||db.lines.find(v=>v.plantId===plantId&&norm(v.name)===norm(name));if(!x){x={id:Core.IDs.nextFrom(db.lines,'LINE',4),plantId,name:name||'Без линии',code:'',externalCode:externalCode||'',origin};db.lines.push(x)}else{x.plantId=x.plantId||plantId;if(name&&(!x.name||/^без линии$/i.test(x.name)))x.name=name;if(externalCode&&!x.externalCode)x.externalCode=externalCode}return x
}
function ensureArea(db,lineId,name,externalCode='',origin='import'){
 let x=(db.areas||[]).find(v=>clean(v.externalCode)===clean(externalCode)&&externalCode)||db.areas.find(v=>v.lineId===lineId&&norm(v.name)===norm(name));if(!x){x={id:Core.IDs.nextFrom(db.areas,'AREA',4),lineId,name:name||'Без участка',code:'',externalCode:externalCode||'',legacyScope:'',origin};db.areas.push(x)}else{x.lineId=lineId;if(name&&(!x.name||/^без участка$/i.test(x.name)))x.name=name;if(externalCode&&!x.externalCode)x.externalCode=externalCode}return x
}
function ensureEquipment(db,data){
 let x=db.equipment.find(v=>clean(v.externalCode)===clean(data.externalCode)&&data.externalCode);if(!x){x={id:Core.IDs.nextFrom(db.equipment,'EQ',6),lineId:data.lineId||'',areaId:data.areaId||'',parentEquipmentId:data.parentEquipmentId||null,name:data.name||'Оборудование',externalCode:data.externalCode||'',equipmentType:data.equipmentType||inferEquipmentType(data.name),manufacturer:data.manufacturer||'',model:data.model||'',source:data.source||'Импорт структуры',status:data.status||'active',origin:'import',importedType:data.importedType||'position',externalSystemCode:data.externalSystemCode||'',sourceFile:data.sourceFile||'',meta:data.meta||{}};db.equipment.push(x)}else{Object.assign(x,{lineId:data.lineId||x.lineId,areaId:data.areaId||x.areaId,name:data.name||x.name,equipmentType:data.equipmentType||x.equipmentType||inferEquipmentType(data.name),manufacturer:data.manufacturer||x.manufacturer||'',source:data.source||x.source,status:data.status||x.status||'active',origin:x.origin||'import',importedType:data.importedType||x.importedType,externalSystemCode:data.externalSystemCode||x.externalSystemCode||'',sourceFile:data.sourceFile||x.sourceFile||'',meta:{...(x.meta||{}),...(data.meta||{})}});if(data.parentEquipmentId!==undefined)x.parentEquipmentId=data.parentEquipmentId||null}return x
}
function ensureComponent(db,data){db.components=db.components||[];let x=db.components.find(v=>clean(v.externalCode)===clean(data.externalCode)&&data.externalCode);if(!x){x={id:Core.IDs.nextFrom(db.components,'COMP',7),externalCode:data.externalCode||'',equipmentId:data.equipmentId||null,parentEquipmentExternalCode:data.parentEquipmentExternalCode||'',name:data.name||'Компонент',manufacturer:data.manufacturer||'',componentType:data.componentType||'',status:data.status||'active',sourceFile:data.sourceFile||'',origin:'import',candidateState:'unclassified',candidateCategory:null,meta:data.meta||{}};db.components.push(x)}else{Object.assign(x,{equipmentId:data.equipmentId||x.equipmentId,parentEquipmentExternalCode:data.parentEquipmentExternalCode||x.parentEquipmentExternalCode,name:data.name||x.name,manufacturer:data.manufacturer||x.manufacturer||'',componentType:data.componentType||x.componentType||'',status:data.status||x.status||'active',sourceFile:data.sourceFile||x.sourceFile||'',meta:{...(x.meta||{}),...(data.meta||{})}})}return x}
function cleanStatus(v){const s=norm(v);return s==='i'||s==='active'||s==='действует'?'active':s==='o'||s==='retired'?'retired':'active'}
function importArea4(wb,db){
 const sm=sheetMap(wb),posRows=rowsOf(sm.get('позиции')),psRows=rowsOf(sm.get('структура позиций')),assetRows=rowsOf(sm.get('тмц')),asRows=rowsOf(sm.get('структура тмц'));
 const plant=ensurePlant(db,'Завод','','import');const areaTitle=baseName(wb.fileName)||'Импортированный участок';
 const parentByChild=new Map(),systemByChild=new Map();for(const r of psRows){const child=clean(get(r,'Child code','Child Code')),parent=clean(get(r,'Position Code')),system=clean(get(r,'System Code'));if(child){parentByChild.set(child,parent);systemByChild.set(child,system)}}
 const positionByCode=new Map();const addedLines=new Set(),addedAreas=new Set(),equipmentCodes=[];
 for(const r of posRows){const code=clean(get(r,'Position')),rawName=clean(get(r,'Description'));if(!code||!rawName)continue;let lineName=clean(get(r,'User Defined Field 15'));if(!/линия/i.test(lineName))lineName=lineNameFromText(rawName)||'Без линии';lineName=lineName.replace(/№/g,'').replace(/\s+/g,' ').trim();const sys=systemByChild.get(code)||'';const line=ensureLine(db,plant.id,lineName,lineCodeFromAreaSystem(sys),'area4');const area=ensureArea(db,line.id,areaTitle,sys,'area4');addedLines.add(line.id);addedAreas.add(area.id);const eq=ensureEquipment(db,{lineId:line.id,areaId:area.id,name:stripLineSuffix(rawName),externalCode:code,equipmentType:inferEquipmentType(rawName),source:'Импорт структуры',status:cleanStatus(get(r,'Status')),importedType:'position',externalSystemCode:clean(get(r,'User Defined Field 01')),sourceFile:wb.fileName,meta:{department:clean(get(r,'Department')),classCode:clean(get(r,'Class')),criticality:clean(get(r,'Criticality')),commissionDate:clean(get(r,'Commission Date'))}});positionByCode.set(code,eq);equipmentCodes.push(code)}
 for(const code of equipmentCodes){const eq=positionByCode.get(code)||db.equipment.find(e=>e.externalCode===code),pc=parentByChild.get(code);if(eq&&pc){const parent=positionByCode.get(pc)||db.equipment.find(e=>e.externalCode===pc);if(parent&&parent.id!==eq.id)eq.parentEquipmentId=parent.id}}
 const assetParent=new Map();for(const r of asRows){const child=clean(get(r,'Child code','Child Code')),pc=clean(get(r,'Position Code'));if(child)assetParent.set(child,pc)}
 let components=0,orphanComponents=0;for(const r of assetRows){const code=clean(get(r,'Asset')),rawName=clean(get(r,'Description'));if(!code||!rawName)continue;const pc=assetParent.get(code)||'',eq=positionByCode.get(pc)||db.equipment.find(e=>e.externalCode===pc);ensureComponent(db,{externalCode:code,equipmentId:eq?.id||null,parentEquipmentExternalCode:pc,name:stripLineSuffix(rawName),manufacturer:clean(get(r,'Manufacturer')),componentType:clean(get(r,'Type')),status:cleanStatus(get(r,'Status')),sourceFile:wb.fileName,meta:{department:clean(get(r,'Department')),classCode:clean(get(r,'Class')),criticality:clean(get(r,'Criticality')),meterUnit:clean(get(r,'Meter Unit'))}});components++;if(!eq)orphanComponents++}
 return {format:'area4',positions:positionByCode.size,components,lines:addedLines.size,areas:addedAreas.size,equipmentCodes:[...positionByCode.keys()],componentCodes:assetRows.map(r=>clean(get(r,'Asset'))).filter(Boolean),problemComponentCodes:assetRows.map(r=>clean(get(r,'Asset'))).filter(code=>{const pc=assetParent.get(code)||'';return code&&!((pc&&positionByCode.get(pc))||db.equipment.find(e=>e.externalCode===pc))}),warnings:orphanComponents?[`${orphanComponents} ТМЦ не удалось привязать к позиции`]:[]}
}
function importArea4Update(wb,db){
 const sm=sheetMap(wb),posRows=rowsOf(sm.get('позиции')),assetRows=rowsOf(sm.get('тмц'));
 const equipmentCodes=[],componentCodes=[],unknownEquipment=[],unknownComponents=[];
 for(const r of posRows){
  const code=clean(get(r,'Position')),rawName=clean(get(r,'Description'));if(!code)continue;
  const eq=(db.equipment||[]).find(e=>clean(e.externalCode)===code);if(!eq){unknownEquipment.push(code);continue}
  if(rawName)eq.name=stripPrefix(rawName);
  const status=clean(get(r,'Status'));if(status)eq.status=cleanStatus(status);
  const type=clean(get(r,'Type'));if(type)eq.meta={...(eq.meta||{}),importType:type};
  const department=clean(get(r,'Department'));if(department)eq.meta={...(eq.meta||{}),department};
  const commissionDate=clean(get(r,'Commission Date'));if(commissionDate)eq.meta={...(eq.meta||{}),commissionDate};
  eq.sourceFile=wb.fileName||eq.sourceFile||'';equipmentCodes.push(code);
 }
 for(const r of assetRows){
  const code=clean(get(r,'Asset')),rawName=clean(get(r,'Description'));if(!code)continue;
  const c=(db.components||[]).find(x=>clean(x.externalCode)===code);if(!c){unknownComponents.push(code);continue}
  if(rawName)c.name=stripPrefix(rawName);
  const status=clean(get(r,'Status'));if(status)c.status=cleanStatus(status);
  const type=clean(get(r,'Type'));if(type)c.componentType=type;
  const department=clean(get(r,'Department'));if(department)c.meta={...(c.meta||{}),department};
  const commissionDate=clean(get(r,'Commission Date'));if(commissionDate)c.meta={...(c.meta||{}),commissionDate};
  c.sourceFile=wb.fileName||c.sourceFile||'';componentCodes.push(code);
 }
 const warnings=[];
 if(unknownEquipment.length)warnings.push(`${unknownEquipment.length} позиций не найдены в базе и не добавлены без листа «Структура позиций»`);
 if(unknownComponents.length)warnings.push(`${unknownComponents.length} ТМЦ не найдены в базе и не добавлены без листа «Структура ТМЦ»`);
 if(!equipmentCodes.length&&!componentCodes.length)warnings.push('Файл обновления не содержит кодов, уже существующих в базе. Структура не изменена.');
 return {format:'area4_update',positions:equipmentCodes.length,components:componentCodes.length,lines:0,areas:0,equipmentCodes,componentCodes,problemComponentCodes:[],warnings};
}
function importFullStructure(wb,db){
 const rows=rowsOf(wb.sheets[0]),all=new Map();for(const r of rows){const code=clean(get(r,'Оборудование'));if(code)all.set(code,r)}
 let rootRow=rows.find(r=>Number(get(r,'Уровень в структуре'))===0&&/система/i.test(clean(get(r,'Тип в структуре'))));const plant=ensurePlant(db,stripPrefix(get(rootRow||{},'Наименование оборудования'))||'Завод',clean(get(rootRow||{},'Оборудование')),'full_structure');
 const typeByCode=new Map(rows.map(r=>[clean(get(r,'Оборудование')),clean(get(r,'Тип в структуре'))]));const nameByCode=new Map(rows.map(r=>[clean(get(r,'Оборудование')),stripPrefix(get(r,'Наименование оборудования'))]));
 const lineCache=new Map(),areaCache=new Map(),equipmentByCode=new Map(),componentCodes=[];let ignored=0,components=0,positions=0;
 function pathCodes(r){return clean(get(r,'Путь')).split(',').map(clean).filter(Boolean)}
 function context(r){const path=pathCodes(r);let lineCode='',areaCode='';for(const c of path){const nm=nameByCode.get(c)||'',tp=norm(typeByCode.get(c));if(!lineCode&&tp==='система'&&/линия\s*№?\s*\d+/i.test(nm))lineCode=c;else if(lineCode&&!areaCode&&tp==='система'&&c!==lineCode)areaCode=c}return{path,lineCode,areaCode}}
 for(const r of rows){const code=clean(get(r,'Оборудование')),tp=norm(get(r,'Тип в структуре')),lvl=Number(get(r,'Уровень в структуре')),name=stripPrefix(get(r,'Наименование оборудования'));if(!code)continue;const ctx=context(r);if(!ctx.lineCode){if(lvl>0)ignored++;continue}let line=lineCache.get(ctx.lineCode);if(!line){line=ensureLine(db,plant.id,stripPrefix(nameByCode.get(ctx.lineCode)||`Линия`),ctx.lineCode,'full_structure');lineCache.set(ctx.lineCode,line)}let area=null;if(ctx.areaCode){area=areaCache.get(ctx.areaCode);if(!area){area=ensureArea(db,line.id,stripPrefix(nameByCode.get(ctx.areaCode)||'Участок'),ctx.areaCode,'full_structure');areaCache.set(ctx.areaCode,area)}}if(code===ctx.lineCode||code===ctx.areaCode)continue;if(tp==='объект ремонта'){const parentCode=[...ctx.path].reverse().find(c=>c!==code&&equipmentByCode.has(c));const eq=equipmentByCode.get(parentCode)||db.equipment.find(e=>e.externalCode===parentCode);ensureComponent(db,{externalCode:code,equipmentId:eq?.id||null,parentEquipmentExternalCode:parentCode||'',name:stripLineSuffix(name),manufacturer:'',componentType:'repair_object',status:'active',sourceFile:wb.fileName,meta:{location:clean(get(r,'Расположение')),externalSystemCode:clean(get(r,'Оборудование внешней системы'))}});componentCodes.push(code);components++;continue}if(tp==='позиция'||(tp==='система'&&lvl>=3)){const eq=ensureEquipment(db,{lineId:line.id,areaId:area?.id||'',name:stripLineSuffix(name),externalCode:code,equipmentType:inferEquipmentType(name),source:'Полная структура оборудования',status:'active',importedType:tp==='система'?'system_group':'position',externalSystemCode:clean(get(r,'Оборудование внешней системы')),sourceFile:wb.fileName,meta:{location:clean(get(r,'Расположение')),level:lvl,path:clean(get(r,'Путь'))}});equipmentByCode.set(code,eq);positions++}}
 for(const r of rows){const code=clean(get(r,'Оборудование')),eq=equipmentByCode.get(code);if(!eq)continue;const path=pathCodes(r);const ancestors=path.slice(0,-1).reverse();const parentCode=ancestors.find(c=>equipmentByCode.has(c));eq.parentEquipmentId=parentCode?equipmentByCode.get(parentCode).id:null}
 return {format:'full_structure',positions,components,lines:lineCache.size,areas:areaCache.size,equipmentCodes:[...equipmentByCode.keys()],componentCodes,problemComponentCodes:componentCodes.filter(code=>{const c=db.components.find(x=>x.externalCode===code);return c&&!c.equipmentId}),warnings:ignored?[`${ignored} строк вне производственных линий пропущены (сохранена модель Завод → Линия → Участок)`]:[]}
}
function reconcileImportedStructure(db){
 const authoritative=new Map((db.areas||[]).filter(a=>/^\d{8}$/.test(clean(a.externalCode))).map(a=>[clean(a.externalCode),a]));
 if(authoritative.size){
  for(const e of db.equipment||[]){
   const code=clean(e.externalCode);if(!/^\d{8}$/.test(code))continue;
   const target=authoritative.get(code.slice(0,5)+'000');
   if(target){e.areaId=target.id;e.lineId=target.lineId}
  }
  const used=new Set((db.equipment||[]).map(e=>String(e.areaId||'')).filter(Boolean));
  db.areas=(db.areas||[]).filter(a=>used.has(String(a.id))||/^\d{8}$/.test(clean(a.externalCode))||a.origin!=='area4');
 }
 const eqByCode=new Map((db.equipment||[]).map(e=>[clean(e.externalCode),e]).filter(([k])=>k));
 for(const c of db.components||[]){if(c.equipmentId)continue;const parent=eqByCode.get(clean(c.parentEquipmentExternalCode));if(parent)c.equipmentId=parent.id}
 return db;
}
async function analyzeFiles(files,currentDb){
 const database=Core.Database.normalize(clone(currentDb||Core.Database.createEmpty('Новая база')));database.components=database.components||[];
 const existingEquipment=new Set((database.equipment||[]).map(x=>clean(x.externalCode)).filter(Boolean)),existingComponents=new Set((database.components||[]).map(x=>clean(x.externalCode)).filter(Boolean));
 const reports=[],batchId=`BATCH-${Date.now()}`,importedAt=new Date().toISOString(),touchedEquipment=new Set(),touchedComponents=new Set(),problemComponents=new Set();
 for(const file of Array.from(files)){const wb=await readWorkbook(file),kind=detectWorkbook(wb);let result;if(kind==='area4')result=importArea4(wb,database);else if(kind==='area4_update')result=importArea4Update(wb,database);else if(kind==='full_structure')result=importFullStructure(wb,database);else if(kind==='lubrication_map')result={format:'lubrication_map',positions:0,components:0,lines:0,areas:0,equipmentCodes:[],componentCodes:[],problemComponentCodes:[],warnings:['Файл карты смазки распознан, но импорт карт будет отдельным режимом. Структура не изменена.']};else result={format:'unknown',positions:0,components:0,lines:0,areas:0,equipmentCodes:[],componentCodes:[],problemComponentCodes:[],warnings:['Неизвестная структура Excel. Файл пропущен.']};(result.equipmentCodes||[]).forEach(x=>touchedEquipment.add(clean(x)));(result.componentCodes||[]).forEach(x=>touchedComponents.add(clean(x)));(result.problemComponentCodes||[]).forEach(x=>problemComponents.add(clean(x)));reports.push({fileName:file.name,...result})}
 reconcileImportedStructure(database);
 problemComponents.clear();
 for(const code of touchedEquipment){const e=database.equipment.find(x=>clean(x.externalCode)===code);if(e){e.lastImportBatchId=batchId;e.lastImportedAt=importedAt;e.lastImportAction=existingEquipment.has(code)?'updated':'new'}}
 for(const code of touchedComponents){const c=database.components.find(x=>clean(x.externalCode)===code);if(c){c.lastImportBatchId=batchId;c.lastImportedAt=importedAt;c.lastImportAction=existingComponents.has(code)?'updated':'new';if(!c.equipmentId)problemComponents.add(code)}}
 database.imports=database.imports||[];for(const r of reports)database.imports.push({id:Core.IDs.nextFrom(database.imports,'IMP',5),batchId,fileName:r.fileName,format:r.format,importedAt,counts:{positions:r.positions,components:r.components,lines:r.lines,areas:r.areas},warnings:r.warnings});database.meta.updatedAt=importedAt;if(touchedEquipment.size||touchedComponents.size)database.meta.lastImportBatchId=batchId;
 const newEquipment=[...touchedEquipment].filter(x=>!existingEquipment.has(x)).length,updatedEquipment=touchedEquipment.size-newEquipment,newComponents=[...touchedComponents].filter(x=>!existingComponents.has(x)).length,updatedComponents=touchedComponents.size-newComponents;
 return{database:Core.Database.normalize(database),reports,batchId,summary:{files:reports.length,positions:reports.reduce((a,r)=>a+r.positions,0),components:reports.reduce((a,r)=>a+r.components,0),uniqueEquipment:database.equipment.length,uniqueComponents:(database.components||[]).length,warnings:reports.reduce((a,r)=>a+r.warnings.length,0),newEquipment,updatedEquipment,newComponents,updatedComponents,problems:problemComponents.size}}
}
API.readWorkbook=readWorkbook;API.detectWorkbook=detectWorkbook;API.analyzeFiles=analyzeFiles;API._test={stripLineSuffix,lineNameFromText,inferEquipmentType,importArea4Update};
})(window);
