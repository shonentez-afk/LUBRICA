(function(global){
'use strict';
// Stage 4: controlled correction of material master data.
// No production JSON is edited until the user explicitly confirms the preview.
const FIELDS=Object.freeze(['name','kind','manufacturer','productCode','nlgi','isoVg','thickener','baseOil','baseViscosity40','density','densitySource','sourceReference','tempMin','tempMax','foodGrade','ep','waterResistance','packageSize','packageUnit','color','symbol','approved','status','notes']);
const ENGINEERING=new Set(['nlgi','isoVg','thickener','baseOil','baseViscosity40','density','densitySource','sourceReference','tempMin','tempMax']);
const clean=v=>String(v??'').trim();
const arr=a=>Array.isArray(a)?a:[];
const copy=x=>JSON.parse(JSON.stringify(x));
function find(db,id){return arr(db?.materials).find(m=>String(m.id)===String(id))||null}
function numeric(v){const s=clean(v);if(!s)return null;if(!/^[+-]?\d+(?:[.,]\d+)?$/.test(s))return NaN;return Number(s.replace(',','.'))}
function targets(db,id){
 const points=new Map(arr(db?.lubricationPoints).map(p=>[String(p.id),p]));
 return arr(db?.tasks).filter(t=>{
  if(clean(t.materialMode)==='none')return false;
  if(clean(t.materialMode)==='explicit')return String(t.materialId||'')===String(id);
  const p=points.get(String(t.lubricationPointId||''));
  return String(p?.targetMaterialId||t.materialId||'')===String(id);
 }).map(t=>String(t.id));
}
function preview(db,id,proposal={},proof={}){
 const old=find(db,id),errors=[],warnings=[],changes=[];
 if(!old){errors.push('Материал не найден в текущей базе.');return {allowed:false,errors,warnings,changes,materialId:String(id)}}
 for(const field of FIELDS){
  if(!Object.prototype.hasOwnProperty.call(proposal,field))continue;
  const before=old[field]??'',after=proposal[field]??'';
  if(JSON.stringify(before)!==JSON.stringify(after))changes.push({field,before,after});
 }
 const technical=changes.filter(x=>ENGINEERING.has(x.field));
 const draft={...old,...Object.fromEntries(FIELDS.filter(f=>Object.prototype.hasOwnProperty.call(proposal,f)).map(f=>[f,proposal[f]]))};
 const density=numeric(draft.density),vg=numeric(draft.isoVg),v40=numeric(draft.baseViscosity40);
 if(changes.some(x=>x.field==='density')&&density!==null&&!(density>=0.5&&density<=2))
  errors.push('Плотность должна быть числом в г/см³ в проверяемом физическом диапазоне; сверьте TDS.');
 if(changes.some(x=>x.field==='isoVg')&&vg!==null&&!(vg>0))
  errors.push('ISO VG должен быть положительным числом.');
 if(changes.some(x=>x.field==='baseViscosity40')&&v40!==null&&!(v40>0))
  errors.push('Вязкость при 40 °C должна быть положительным числом.');
 if(technical.length){
  if(clean(proof.reason).length<8)errors.push('Для инженерной корректировки укажите причину (не менее 8 символов).');
  if(!clean(draft.sourceReference))errors.push('Укажите паспорт, TDS или другой подтверждающий источник данных материала.');
 }
 if(/масл|\boil\b/i.test(clean(draft.kind))&&vg>0&&v40>0&&Math.abs(v40-vg)/vg>0.15)
  warnings.push('ISO VG и вязкость при 40 °C заметно расходятся. Проверьте свойства именно этого масла по TDS.');
 if(!changes.length)warnings.push('Изменений в карточке нет.');
 const affectedTaskIds=targets(db,id);
 return {allowed:errors.length===0,changed:changes.length>0,errors,warnings,changes,technicalChanged:technical.length>0,
  materialId:String(id),code:clean(old.code)||String(id),name:clean(old.name),sourceSnapshot:JSON.stringify(old),
  affectedTaskIds,approvedTaskIds:affectedTaskIds.filter(tid=>arr(db?.tasks).some(t=>String(t.id)===tid&&['approved','ready'].includes(clean(t.approvalStatus))))};
}
function apply(db,review,proposal={},proof={}){
 if(!review||!review.materialId)throw new Error('Отсутствует предпросмотр корректировки.');
 const current=find(db,review.materialId);
 if(!current||JSON.stringify(current)!==review.sourceSnapshot)throw new Error('Карточка материала изменилась после предпросмотра. Повторите проверку.');
 const fresh=preview(db,review.materialId,proposal,proof);
 if(!fresh.allowed)throw new Error(fresh.errors.join(' '));
 if(JSON.stringify(fresh.changes)!==JSON.stringify(review.changes))throw new Error('Поля изменились после предпросмотра. Повторите проверку.');
 if(!fresh.changed)return {changed:false,materialId:review.materialId};
 const patch=Object.fromEntries(FIELDS.filter(f=>Object.prototype.hasOwnProperty.call(proposal,f)).map(f=>[f,proposal[f]]));
 Object.assign(current,patch);
 if(fresh.technicalChanged){
  const entry={at:new Date().toISOString(),reason:clean(proof.reason),sourceReference:clean(current.sourceReference),
   changes:copy(fresh.changes),affectedTaskIds:fresh.affectedTaskIds.slice(),approvedTaskIds:fresh.approvedTaskIds.slice()};
  current.engineeringCorrectionHistory=[...arr(current.engineeringCorrectionHistory),entry].slice(-50);
 }
 return {changed:true,materialId:review.materialId,fields:fresh.changes.map(x=>x.field),
  technicalChanged:fresh.technicalChanged,affectedTaskIds:fresh.affectedTaskIds.slice()};
}
global.LubricaMaterialCorrection=Object.freeze({FIELDS,preview,apply});
})(window);
