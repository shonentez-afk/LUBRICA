(function(global){
'use strict';
const Core=global.LubricaCore=global.LubricaCore||{};
const ARRAYS=['plants','lines','areas','equipment','components','nodes','lubricationPoints','tasks','materials','routes','checklistRuns','tools','imports','bearingOverrides','componentLibraryEntries'];
function clean(v){return String(v??'').trim()}
function objectLike(v){return !!v&&typeof v==='object'&&!Array.isArray(v)}
function duplicateIds(arr){
 const seen=new Set(),dups=[];for(const x of Array.isArray(arr)?arr:[]){const id=clean(x?.id);if(!id)continue;if(seen.has(id))dups.push(id);else seen.add(id)}return [...new Set(dups)];
}
function inspect(db){
 const issues=[],warnings=[];
 if(!objectLike(db)){issues.push('Корневая структура JSON должна быть объектом.');return{ok:false,issues,warnings}}
 for(const key of ARRAYS)if(db[key]!==undefined&&!Array.isArray(db[key]))issues.push(`Поле ${key} должно быть массивом.`);
 for(const key of ARRAYS){const d=duplicateIds(db[key]);if(d.length)issues.push(`Дубли ID в ${key}: ${d.slice(0,5).join(', ')}${d.length>5?'…':''}`)}
 const ids=k=>new Set((Array.isArray(db[k])?db[k]:[]).map(x=>clean(x?.id)).filter(Boolean));
 const eq=ids('equipment'),nodes=ids('nodes'),pts=ids('lubricationPoints'),mats=ids('materials'),tools=ids('tools'),tasks=ids('tasks'),lines=ids('lines'),areas=ids('areas');
 for(const p of db.lubricationPoints||[]){
   if(p.equipmentId&&!eq.has(clean(p.equipmentId)))warnings.push(`Точка ${p.id||'—'}: оборудование ${p.equipmentId} не найдено.`);
   if(p.nodeId&&!nodes.has(clean(p.nodeId)))warnings.push(`Точка ${p.id||'—'}: узел ${p.nodeId} не найден.`);
 }
 for(const t of db.tasks||[]){
   if(t.lubricationPointId&&!pts.has(clean(t.lubricationPointId)))warnings.push(`Мероприятие ${t.id||'—'}: точка ${t.lubricationPointId} не найдена.`);
   if(t.materialId&&!mats.has(clean(t.materialId)))warnings.push(`Мероприятие ${t.id||'—'}: материал ${t.materialId} не найден.`);
   if(t.toolId&&!tools.has(clean(t.toolId)))warnings.push(`Мероприятие ${t.id||'—'}: инструмент ${t.toolId} не найден.`);
 }
 for(const r of db.routes||[])for(const id of Array.isArray(r.taskIds)?r.taskIds:[])if(!tasks.has(clean(id)))warnings.push(`Маршрут ${r.code||r.id||'—'}: мероприятие ${id} не найдено.`);
 for(const e of db.equipment||[]){
   if(e.lineId&&!lines.has(clean(e.lineId)))warnings.push(`Оборудование ${e.id||'—'}: линия ${e.lineId} не найдена.`);
   if(e.areaId&&!areas.has(clean(e.areaId)))warnings.push(`Оборудование ${e.id||'—'}: участок ${e.areaId} не найден.`);
 }
 return{ok:issues.length===0,issues,warnings};
}
function parse(text,label='JSON'){
 try{return JSON.parse(String(text??''))}
 catch(e){const m=String(e?.message||e);throw new Error(`${label}: файл повреждён или содержит некорректный JSON. ${m}`)}
}
function prepare(data){
 if(!objectLike(data))throw new Error('Некорректная база: корень JSON должен быть объектом.');
 const isV2=data.schemaVersion==='2.0'||ARRAYS.some(k=>Array.isArray(data[k]))&&('project' in data||'meta' in data);
 const isLegacy=Array.isArray(data.points);
 if(!isV2&&!isLegacy)throw new Error('Неизвестный формат базы. Ожидается JSON LUBRICA v2 или совместимая база v1.');
 let db;
 if(Core.Migration?.toDatabase)db=Core.Migration.toDatabase(data);
 else if(isV2&&Core.Database?.normalize)db=Core.Database.normalize(data);
 else if(isLegacy&&Core.Database?.fromLegacy)db=Core.Database.fromLegacy(data);
 else throw new Error('Модуль миграции базы не загружен.');
 const report=inspect(db);
 if(!report.ok)throw new Error(`База не прошла проверку целостности: ${report.issues.join(' ')}`);
 return{database:db,migrated:data.schemaVersion!=='2.0',report};
}
function parseAndPrepare(text,label='JSON'){return prepare(parse(text,label))}
function prepareRecovery(data){try{return prepare(data)}catch(e){global.LubricaSystem?.notify?.(`Recovery пропущен: ${e.message}`,'error',{module:'database-safety'});return null}}
function sizeBytes(data){try{return new TextEncoder().encode(JSON.stringify(data)).length}catch(_){return 0}}
Core.DatabaseSafety=Object.freeze({parse,prepare,parseAndPrepare,prepareRecovery,inspect,sizeBytes});
})(window);