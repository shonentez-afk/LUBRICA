const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const out={name:null,blob:null,toasts:[]};
global.window=global;global.Blob=Blob;
const tasks=[
 {id:'T-LEVEL',lubricationPointId:'LP-001',operation:'Проверить уровень',activityType:'oil_level_check',materialMode:'point_target',toolId:'TOOL-1',quantity:{approved:'до уровня',unit:''},schedule:{strategy:'По календарю',legacyText:'1 неделя'},approvalStatus:'approved'},
 {id:'T-TOPUP',lubricationPointId:'LP-001',operation:'Долить масло',activityType:'oil_topup',materialMode:'point_target',toolId:'TOOL-1',quantity:{approved:'0.5',unit:'л',source:'OEM manual'},schedule:{strategy:'По календарю',legacyText:'1 неделя'},approvalStatus:'approved'},
 {id:'T-CHANGE',lubricationPointId:'LP-001',operation:'Заменить масло',activityType:'oil_change',materialMode:'point_target',toolId:'TOOL-1',quantity:{approved:'10',unit:'л',source:'OEM manual'},schedule:{strategy:'По календарю',legacyText:'12 месяцев'},approvalStatus:'approved'},
 {id:'T-SAMPLE',lubricationPointId:'LP-001',operation:'Отобрать пробу',activityType:'oil_sample',materialMode:'none',quantity:{approved:'',unit:''},schedule:{strategy:'По календарю',legacyText:'3 месяца'},approvalStatus:'approved'}
];
const db={
 lines:[{id:'L1',name:'Линия 1'}],areas:[{id:'A1',lineId:'L1',name:'Участок КВО'}],equipment:[{id:'EQ1',areaId:'A1',externalCode:'10100001',name:'Редуктор'}],nodes:[{id:'N1',equipmentId:'EQ1',name:'Картер',quantity:1}],
 lubricationPoints:[{id:'LP-001',equipmentId:'EQ1',nodeId:'N1',name:'Контроль картера',category:'gearbox_oil',feedMethod:'Картерная / масляная ванна',targetMaterialId:'M1',currentMaterialId:'M1',oemMaterial:'Mobilgear 600 XP 220',materialRationale:'По OEM',engineeringSources:{dose:{type:'oem',reference:'Manual p.10'},interval:{type:'oem',reference:'Manual p.11'},material:{type:'oem',reference:'Manual p.9'}},componentBinding:{matchStatus:'matched',libraryEntryId:'LIB1'},gearboxOil:{calculation:{approvedLiters:10,quantitySource:'OEM manual',calculatedAt:'2026-09-04T10:00:00Z'}}}],
 tasks,materials:[{id:'M1',code:'OIL-220',name:'Mobilgear 600 XP 220',kind:'Редукторное масло',approved:true}],tools:[{id:'TOOL-1',code:'TL-OIL',name:'Маслёнка',type:'oil_can',status:'active'}],
 componentLibraryEntries:[{id:'LIB1',designation:'Редуктор цилиндрический',technicalData:{operatingTemperatureC:55},lubricationData:{material:'ISO VG 220',quantity:10,quantityUnit:'л'}}],components:[],
 routes:[{id:'R1',code:'M-001',status:'active',taskIds:tasks.map(x=>x.id)}]
};
global.state={points:tasks.map(t=>({id:t.id,taskId:t.id,lubricationPointId:'LP-001',line:'Линия 1',area:'Участок КВО',position:'10100001',equipment:'Редуктор',unit:'Картер',operation:t.operation,interval:t.schedule.legacyText,qty:t.quantity.approved,measure:t.quantity.unit,material:t.materialMode==='none'?'':'Mobilgear 600 XP 220'}))};
global.SCOPE_LABELS={};global.taskKey=p=>p.taskId||p.id;global.pointDisplayId=p=>p.lubricationPointId||p.id;global.csvCell=x=>'"'+String(x??'').replace(/"/g,'""')+'"';global.routeEntries=()=>[];global.toolFor=()=>'';
global.download=(name,blob)=>{out.name=name;out.blob=blob};global.toast=x=>out.toasts.push(x);
global.LubricaCore={State:{getDatabase:()=>db}};
vm.runInThisContext(fs.readFileSync(path.join(root,'vendor/jszip.min.js'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root,'export/export-ui.js'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root,'export/final-excel-template.js'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root,'export/final-excel.js'),'utf8'));
(async()=>{
 await exportWorkbook();
 if(out.name!=='LUBRICA_Финальный_Excel_по_эталону.xlsx')throw Error('wrong filename '+out.name);
 const buf=Buffer.from(await out.blob.arrayBuffer());fs.writeFileSync(path.join(root,'test','LUBRICA_STAGE9_7_SAMPLE.tmp.xlsx'),buf);
 const zip=await JSZip.loadAsync(buf),wb=await zip.file('xl/workbook.xml').async('text');
 const names=['Выбор смазочного материала','Карта смазки','Справочники','Код типа смазочного материала','Стандарт Чек-листа','Расчёт и обоснование'];
 for(const n of names)if(!wb.includes(n))throw Error('missing sheet '+n);
 const map=await zip.file('xl/worksheets/sheet2.xml').async('text');
 for(const op of ['Проверить уровень','Долить масло','Заменить масло','Отобрать пробу'])if(!map.includes(op))throw Error('missing operation '+op);
 const lpCount=(map.match(/LP-001/g)||[]).length;if(lpCount!==4)throw Error('one-row-per-event contract failed, LP rows='+lpCount);
 for(const id of ['T-LEVEL','T-TOPUP','T-CHANGE','T-SAMPLE'])if(!map.includes(id))throw Error('task trace missing '+id);
 console.log('STAGE 9.7 FINAL EXCEL TEST PASS',buf.length,'LP rows',lpCount);
})().catch(e=>{console.error(e);process.exit(1)});
