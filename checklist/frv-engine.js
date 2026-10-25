(function(global){
'use strict';
const CATEGORIES=Object.freeze([
 {id:'preparation',label:'Подготовка',productive:true},
 {id:'movement',label:'Перемещение',productive:false},
 {id:'lubrication',label:'Смазочные работы',productive:true},
 {id:'inspection',label:'Осмотр / контроль',productive:true},
 {id:'waiting',label:'Ожидание',productive:false},
 {id:'search',label:'Поиск инструмента / материала',productive:false},
 {id:'access',label:'Получение доступа к оборудованию',productive:false},
 {id:'other_loss',label:'Прочие потери',productive:false}
]);
function db(){return global.LubricaCore?.State?.getDatabase?.()||null}
function now(){return new Date().toISOString()}
function clean(v){return String(v??'').trim()}
function cat(id){return CATEGORIES.find(x=>x.id===id)||null}
function run(runId,d=db()){return (d?.checklistRuns||[]).find(x=>x.id===runId)||null}
function ensure(r){if(!Array.isArray(r.frvEntries))r.frvEntries=[];return r.frvEntries}
function duration(e,endAt=''){const a=Date.parse(e.startedAt||''),b=Date.parse(e.endedAt||endAt||'');return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?Math.round((b-a)/60000*10)/10:null}
function active(runId,d=db()){const r=run(runId,d);return r?ensure(r).find(x=>!x.endedAt)||null:null}
function start(runId,categoryId,{note='',taskId=''}={}){
 const d=db(),r=run(runId,d),c=cat(categoryId);if(!r||r.status!=='in_progress'||!c)return{ok:false,reason:'FRV_START_NOT_ALLOWED'};
 const rows=ensure(r);const open=rows.find(x=>!x.endedAt);if(open)return{ok:false,reason:'FRV_ALREADY_ACTIVE',entry:open};
 const e={id:`FRV-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,categoryId:c.id,categoryLabel:c.label,productive:c.productive,startedAt:now(),endedAt:null,note:clean(note),taskId:clean(taskId),createdAt:now()};
 rows.push(e);r.updatedAt=now();global.LubricaCore.State.setDatabase(d);return{ok:true,entry:e};
}
function stop(runId,{note=''}={}){
 const d=db(),r=run(runId,d);if(!r||r.status!=='in_progress')return{ok:false,reason:'FRV_STOP_NOT_ALLOWED'};
 const e=ensure(r).find(x=>!x.endedAt);if(!e)return{ok:false,reason:'FRV_NOT_ACTIVE'};
 e.endedAt=now();if(clean(note))e.note=clean(note);e.durationMinutes=duration(e);r.updatedAt=now();global.LubricaCore.State.setDatabase(d);return{ok:true,entry:e};
}
function closeOpen(r,endAt){const e=ensure(r).find(x=>!x.endedAt);if(e){e.endedAt=endAt||now();e.durationMinutes=duration(e);e.autoClosed=true}return e}
function summary(r){
 const rows=ensure(r||{}),end=r?.actualEndAt||r?.completedAt||'';
 const data=rows.map(e=>({...e,durationMinutes:e.durationMinutes??duration(e,end)}));
 const byCategory=CATEGORIES.map(c=>{const items=data.filter(x=>x.categoryId===c.id),minutes=Math.round(items.reduce((s,x)=>s+(Number(x.durationMinutes)||0),0)*10)/10;return{...c,minutes,count:items.length}}).filter(x=>x.count);
 const observed=Math.round(byCategory.reduce((s,x)=>s+x.minutes,0)*10)/10;
 const productive=Math.round(byCategory.filter(x=>x.productive).reduce((s,x)=>s+x.minutes,0)*10)/10;
 const losses=Math.round((observed-productive)*10)/10;
 return{entries:data,byCategory,observedMinutes:observed,productiveMinutes:productive,lossMinutes:losses,productivePercent:observed?Math.round(productive/observed*1000)/10:0};
}
function freeze(r){if(!r)return null;closeOpen(r,r.actualEndAt||r.completedAt||now());const s=summary(r);r.frvFact={...s,frozenAt:now()};return r.frvFact}
global.LubricaFRV=Object.freeze({CATEGORIES,start,stop,active,summary,freeze,closeOpen});
})(window);