(function(global){
'use strict';
const TEMPLATE_SHEETS=['Выбор смазочного материала','Карта смазки','Справочники','Код типа смазочного материала','Стандарт Чек-листа','Расчёт и обоснование'];

function db(){return global.LubricaCore?.State?.getDatabase?.()||null}
function clean(v){return String(v??'').trim()}
function byId(arr,id){return (arr||[]).find(x=>String(x.id)===String(id))||null}
function dash(v){const s=clean(v);return s||'—'}
function boolText(v){return v===true?'Да':v===false?'Нет':'—'}
function safeJson(v){try{return v&&Object.keys(v).length?JSON.stringify(v):'—'}catch(e){return '—'}}
function routeCodesForTask(d,taskId){return (d.routes||[]).filter(r=>(r.taskIds||[]).map(String).includes(String(taskId))).map(r=>r.code||r.id).join(', ')}
function effectiveMaterialId(task,lp){if(task?.materialMode==='none')return null;if(task?.materialMode==='explicit')return task.materialId||null;return lp?.targetMaterialId||task?.materialId||null}
function calcForPoint(lp){
 if(!lp)return{};
 const keys=['bearing','linearBearing','gearboxOil','chain','coupling','greasePoint','ballScrew','oilSystem','openGear','wireRope','centralLubrication'];
 for(const k of keys){const c=lp[k]?.calculation;if(c&&Object.keys(c).length)return{module:k,calc:c}}
 const extra=lp.calculations||{};const first=Object.entries(extra).find(([,v])=>v&&typeof v==='object');
 return first?{module:first[0],calc:first[1]}:{module:'',calc:{}};
}
function firstValue(obj,keys){for(const k of keys){const v=obj?.[k];if(v!==undefined&&v!==null&&clean(v)!=='')return v}return''}
function approvedCalc(calc){return firstValue(calc,['approvedDoseG','approvedFullFillG','approvedMassG','approvedVolumeMl','approvedLiters','approvedQuantity','approved','approvedHours','approvedDays','approvedMonths'])!==''}
function sourceText(src){if(!src)return'—';return [src.type,src.reference,src.note].filter(Boolean).join(' · ')||'—'}
function taskRows(){
 const d=db();if(!d)return[];
 const map=a=>new Map((a||[]).map(x=>[String(x.id),x]));
 const areas=map(d.areas),lines=map(d.lines),lps=map(d.lubricationPoints),equipment=map(d.equipment),nodes=map(d.nodes),materials=map(d.materials),tools=map(d.tools),components=map(d.components),library=map(d.componentLibraryEntries);
 const legacyMap=new Map((typeof state!=='undefined'&&Array.isArray(state.points)?state.points:[]).map(p=>[String(global.taskKey?taskKey(p):(p.taskId||p.id)),p]));
 const routeByTask=new Map();
 for(const r of d.routes||[])for(const id of r.taskIds||[]){const k=String(id);if(!routeByTask.has(k))routeByTask.set(k,[]);routeByTask.get(k).push(r.code||r.id)}
 return (d.tasks||[]).filter(t=>t.approvalStatus!=='disabled').map(task=>{
  const lp=lps.get(String(task.lubricationPointId))||null,legacy=legacyMap.get(String(task.id))||{};
  const eq=lp?equipment.get(String(lp.equipmentId))||null:null,node=lp?nodes.get(String(lp.nodeId))||null:null,area=eq?areas.get(String(eq.areaId))||null:null,line=area?lines.get(String(area.lineId))||null:null;
  const material=materials.get(String(effectiveMaterialId(task,lp)))||null,currentMaterial=materials.get(String(lp?.currentMaterialId))||null,targetMaterial=materials.get(String(lp?.targetMaterialId))||null,tool=tools.get(String(task.toolId))||null;
  const component=components.get(String(lp?.componentBinding?.sourceComponentId))||null,lib=library.get(String(lp?.componentBinding?.libraryEntryId||lp?.componentBinding?.actualLibraryEntryId))||null;
  const {module,calc}=calcForPoint(lp);
  const q=task.quantity||{},sch=task.schedule||{},src=lp?.engineeringSources||{};
  return{
   task,lp,eq,node,area,line,material,currentMaterial,targetMaterial,tool,component,lib,module,calc,src,
   taskId:task.id,pointId:lp?.id||task.lubricationPointId||legacy.lubricationPointId||'',pointName:lp?.name||legacy.unit||'',
   lineName:line?.name||legacy.line||'',areaName:area?.name||legacy.area||'',equipmentCode:eq?.externalCode||eq?.code||legacy.position||'',equipmentName:eq?.name||legacy.equipment||'',nodeName:node?.name||legacy.unit||'',nodeQty:node?.quantity||1,
   feedMethod:lp?.feedMethod||legacy.feedMethod||'',category:lp?.category||legacy.type||'',operation:task.operation||legacy.operation||'',activityType:task.activityType||'',
   materialName:material?.name||task.materialName||legacy.material||'',materialCode:material?.code||'',materialKind:material?.kind||'',materialApproved:material?.approved,
   currentMaterialName:currentMaterial?.name||'',targetMaterialName:targetMaterial?.name||material?.name||'',oemMaterial:lp?.oemMaterial||'',materialRationale:lp?.materialRationale||'',
   qtyApproved:q.approved??legacy.qty??'',qtyUnit:q.unit||legacy.measure||'',qtyCalculated:q.calculated??'',qtyCalculatedGrams:q.calculatedGrams??'',qtySource:q.source||firstValue(calc,['quantitySource','doseSource','fullFillSource'])||'',
   strategy:sch.strategy||legacy.strategy||'',interval:sch.legacyText||legacy.interval||'',intervalSource:firstValue(calc,['intervalSource','approvedIntervalSource'])||'',
   toolCode:tool?.code||'',toolName:tool?.name||'',toolStatus:tool?.status||'',routeCodes:(routeByTask.get(String(task.id))||[]).join(', '),approvalStatus:task.approvalStatus||'',
   calcModule:module,calcApproved:approvedCalc(calc),calcAt:calc.calculatedAt||'',calcWarnings:Array.isArray(calc.warnings)?calc.warnings.join('; '):'',calcRaw:safeJson(calc),
   componentName:component?.name||component?.designation||'',libraryDesignation:lib?.designation||lib?.name||'',bindingStatus:lp?.componentBinding?.matchStatus||'',bindingConfidence:lp?.componentBinding?.matchConfidence??'',
   sourceDose:sourceText(src.dose),sourceInterval:sourceText(src.interval),sourceMaterial:sourceText(src.material)
  };
 });
}


function xmlEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[m]))}
function colName(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
function cellXml(ref,style,value){
 if(value===null||value===undefined||value==='')return `<c r="${ref}" s="${style}"/>`;
 if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
 const text=xmlEsc(value);return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}
function rowXml(rowNum,values,styles,height=34,extraStyle=72){
 const cells=[];for(let i=0;i<values.length;i++)cells.push(cellXml(`${colName(i+1)}${rowNum}`,styles[i]??extraStyle,values[i]));
 return `<row r="${rowNum}" spans="1:${values.length}" ht="${height}" customHeight="1">${cells.join('')}</row>`;
}
function replaceDataRows(xml,startRow,rows,styles,height,lastCol){
 const sd=xml.match(/<sheetData>([\s\S]*?)<\/sheetData>/);if(!sd)throw new Error('sheetData not found');
 const kept=sd[1].replace(/<row\b[^>]*r="(\d+)"[^>]*>[\s\S]*?<\/row>/g,(m,n)=>Number(n)<startRow?m:'');
 const added=rows.map((x,i)=>rowXml(startRow+i,x,styles,height)).join('');
 xml=xml.replace(sd[0],`<sheetData>${kept}${added}</sheetData>`);
 const last=Math.max(startRow+rows.length-1,startRow);
 xml=xml.replace(/<dimension ref="[^"]*"\/>/,`<dimension ref="A1:${lastCol}${last}"/>`);
 return xml;
}
function addHiddenColumn(xml,colNo){
 const hidden=`<col min="${colNo}" max="${colNo}" width="0" hidden="1" customWidth="1"/>`;
 return xml.includes('<cols>')?xml.replace('</cols>',hidden+'</cols>'):xml.replace('</sheetFormatPr>',`</sheetFormatPr><cols>${hidden}</cols>`);
}
function templateCurrentText(v){const s=clean(v);return s||'//--//'}
function templateSameOrDash(v){const s=clean(v);return s||'='}
function conditionValue(x,keys){return firstValue(x.calc||{},keys)||firstValue(x.lib?.technicalData||{},keys)||'//--//'}
function mapSheet1Row(x){
 const c=x.calc||{},oem=x.lib?.lubricationData||{};
 const currentFill=firstValue(c,['currentFullFillG','fullFillG','oemFillLiters','oemTotalG','oemVolumeLiters']);
 const targetFill=firstValue(c,['approvedFullFillG','approvedLiters','approvedVolumeMl']);
 const oemFill=firstValue(oem,['quantity','fullFill','fillVolume']);
 const currentQty=[x.qtyApproved,x.qtyUnit].filter(v=>clean(v)!=='').join(' ')||'//--//';
 const calcQty=[x.qtyCalculated||x.qtyApproved,x.qtyUnit].filter(v=>clean(v)!=='').join(' ')||'//--//';
 const route=(x.routeCodes||'').split(',')[0]||'';
 return [
  '',route,x.pointId,x.areaName||x.lineName,x.equipmentCode,x.equipmentName,x.nodeName,x.nodeQty,
  templateCurrentText(x.feedMethod),templateCurrentText(x.currentMaterialName||x.materialName),templateSameOrDash(''),templateCurrentText(currentFill),templateCurrentText(''),templateCurrentText(''),templateCurrentText(x.operation),templateCurrentText(x.strategy),templateCurrentText(x.interval),currentQty,
  templateCurrentText(x.libraryDesignation||x.componentName||x.category),templateCurrentText(firstValue(oem,['feedMethod','method'])),templateCurrentText(oem.material||x.oemMaterial),templateCurrentText(oem.cleanliness),templateCurrentText(oemFill),templateCurrentText(''),templateCurrentText(firstValue(oem,['interval','replacementInterval'])),templateCurrentText(x.operation),templateCurrentText(x.strategy),templateCurrentText(x.interval),calcQty,
  conditionValue(x,['rpm','speedRpm','rotationSpeedRpm']),conditionValue(x,['loadClass','loadKn','equivalentLoadKn']),conditionValue(x,['temperatureClass','temperatureC','operatingTemperatureC']),conditionValue(x,['contamination','solidContamination']),conditionValue(x,['moisture','waterExposure']),conditionValue(x,['vibration','shockLoad']),conditionValue(x,['oscillationAngle','oscillationDeg']),conditionValue(x,['duty','dutyCycle','operatingMode']),
  templateCurrentText(x.feedMethod),templateCurrentText(x.targetMaterialName||x.materialName),templateSameOrDash(''),templateCurrentText(targetFill),templateCurrentText(''),templateCurrentText(''),templateCurrentText(x.operation),templateCurrentText(x.strategy),templateCurrentText(x.interval),currentQty,
  x.taskId
 ];
}
function mapSheet2Row(x){
 const currentFill=firstValue(x.calc||{},['approvedFullFillG','approvedLiters','approvedVolumeMl','fullFillG','oemTotalG']);
 const q=[x.qtyApproved,x.qtyUnit].filter(v=>clean(v)!=='').join(' ')||'//--//';
 return [
  x.pointId,x.areaName||x.lineName,x.equipmentCode,x.equipmentName,x.nodeName,x.nodeQty,templateCurrentText(x.feedMethod),templateCurrentText(x.materialName),
  templateSameOrDash(''),templateCurrentText(currentFill),templateCurrentText(''),templateCurrentText(''),templateCurrentText(x.operation),templateCurrentText(x.strategy),templateCurrentText(x.interval),q,
  [x.toolCode,x.toolName].filter(Boolean).join(' · ')||'//--//','',x.routeCodes||'',x.taskId
 ];
}
function mapMaterialRows(){
 const d=db(),materials=d?.materials||[];
 return materials.map(m=>[
  m.code||m.id||'',m.color||'',m.name||'',m.viscosityGrade||m.vg||'',m.nlgi??'',m.kind||m.type||''
 ]);
}
function calcSheetXml(data){
 const styles=[72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72,72];
 const headers=['ID мероприятия','ID точки','Оборудование','Узел','Мероприятие','Категория','Материал','Утверждённая норма','Ед.','Расчётное значение','Расчёт, г','Источник нормы','Периодичность','Источник периодичности','Источник выбора материала','Обоснование материала','Расчётный модуль','Расчёт утверждён','Дата расчёта','Предупреждения расчёта','Привязка к справочнику','Детали расчёта'];
 const headerStyles=styles.map(()=>245);
 const rows=[];
 rows.push(`<row r="1" ht="30" customHeight="1">${cellXml('A1',4,'РАСЧЁТ И ОБОСНОВАНИЕ')}</row>`);
 rows.push(`<row r="2" ht="24" customHeight="1">${cellXml('A2',72,'Трассировка нормы, периодичности, материала и расчётного источника для каждого мероприятия.')}</row>`);
 rows.push(rowXml(4,headers,headerStyles,42));
 data.forEach((x,i)=>rows.push(rowXml(5+i,[x.taskId,x.pointId,x.equipmentName,x.nodeName,x.operation,x.category,[x.materialCode,x.materialName].filter(Boolean).join(' · '),x.qtyApproved,x.qtyUnit,x.qtyCalculated,x.qtyCalculatedGrams,x.qtySource||x.sourceDose,x.interval,x.intervalSource||x.sourceInterval,x.sourceMaterial,x.materialRationale,x.calcModule,boolText(x.calcApproved),x.calcAt,x.calcWarnings,[x.bindingStatus,x.libraryDesignation].filter(Boolean).join(' · '),x.calcRaw],styles,32)));
 const widths=[18,14,28,26,30,18,30,16,10,18,14,30,20,30,30,36,20,16,22,34,30,54];
 const cols=widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:V${Math.max(5,data.length+4)}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${rows.join('')}</sheetData><mergeCells count="2"><mergeCell ref="A1:V1"/><mergeCell ref="A2:V2"/></mergeCells><pageMargins left="0.2" right="0.2" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}
function ensureSixthSheet(zip){
 return Promise.all([
  zip.file('xl/workbook.xml').async('text'),
  zip.file('xl/_rels/workbook.xml.rels').async('text'),
  zip.file('[Content_Types].xml').async('text')
 ]).then(([wb,rels,ct])=>{
   wb=wb.replace(/<externalReferences>[\s\S]*?<\/externalReferences>/g,'');
   if(!wb.includes('Расчёт и обоснование'))wb=wb.replace('</sheets>',`<sheet name="Расчёт и обоснование" sheetId="6" r:id="rId17"/></sheets>`);
   if(!rels.includes('Target="worksheets/sheet6.xml"'))rels=rels.replace('</Relationships>',`<Relationship Id="rId17" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet6.xml"/></Relationships>`);
   if(!ct.includes('/xl/worksheets/sheet6.xml'))ct=ct.replace('</Types>',`<Override PartName="/xl/worksheets/sheet6.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
   zip.file('xl/workbook.xml',wb);zip.file('xl/_rels/workbook.xml.rels',rels);zip.file('[Content_Types].xml',ct);
 });
}
async function buildTemplateWorkbookBlob(){
 if(typeof JSZip==='undefined')throw new Error('Модуль Excel не загружен');
 const b64=global.LubricaExcelTemplateBase64;if(!b64)throw new Error('Эталонный шаблон Excel не загружен');
 const data=taskRows(),zip=await JSZip.loadAsync(b64,{base64:true});
 const s1=await zip.file('xl/worksheets/sheet1.xml').async('text');
 const s2=await zip.file('xl/worksheets/sheet2.xml').async('text');
 const s4=await zip.file('xl/worksheets/sheet4.xml').async('text');
 const st1=[186,74,72,72,73,72,72,91,74,104,105,104,72,110,96,98,98,127,96,98,98,124,97,98,125,96,98,98,127,74,92,72,72,72,72,72,75,74,104,105,104,72,110,96,98,98,127,72];
 const st2=[72,72,73,72,72,91,72,90,105,104,72,106,72,72,72,72,90,90,84,72];
 const st4=[9,12,9,8,8,11];
 let n1=replaceDataRows(s1,5,data.map(mapSheet1Row),st1,34,'AV');n1=addHiddenColumn(n1,48);
 let n2=replaceDataRows(s2,12,data.map(mapSheet2Row),st2,48,'T');n2=addHiddenColumn(n2,20);
 let mat=mapMaterialRows();if(!mat.length)mat=[['GRE**','Синий','','','', 'Пластичная смазка']];
 let n4=replaceDataRows(s4,9,mat,st4,24,'F');
 zip.file('xl/worksheets/sheet1.xml',n1);zip.file('xl/worksheets/sheet2.xml',n2);zip.file('xl/worksheets/sheet4.xml',n4);
 await ensureSixthSheet(zip);zip.file('xl/worksheets/sheet6.xml',calcSheetXml(data));
 // Remove external links to avoid update prompts while preserving all visible formatting.
 for(const name of Object.keys(zip.files)){if(name.startsWith('xl/externalLinks/'))zip.remove(name)}
 let rels=await zip.file('xl/_rels/workbook.xml.rels').async('text');rels=rels.replace(/<Relationship[^>]+externalLink[^>]+\/>/g,'');zip.file('xl/_rels/workbook.xml.rels',rels);
 let ct=await zip.file('[Content_Types].xml').async('text');ct=ct.replace(/<Override[^>]+externalLink[^>]+\/>/g,'');zip.file('[Content_Types].xml',ct);
 return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
async function exportFinalWorkbook(){
 try{
  const data=taskRows(),blob=await buildTemplateWorkbookBlob(),pointCount=new Set(data.map(x=>x.pointId)).size;
  download('LUBRICA_Финальный_Excel_по_эталону.xlsx',blob);
  toast(`Excel по эталону сформирован: ${data.length} мероприятий · ${pointCount} физических точек`);
 }catch(e){console.error(e);toast(`Ошибка финального Excel: ${e.message}`,'error')}
}
global.LubricaFinalExcel=Object.freeze({taskRows,buildTemplateWorkbookBlob,exportFinalWorkbook});
global.exportWorkbook=exportFinalWorkbook;
})(window);
