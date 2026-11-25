"use strict";
/* R3A: area + actual maintenance operation + cadence.
   Equipment family is deliberately NOT part of identity.
   Preview is side-effect free; only approved engineering-ready tasks qualify.
*/
(function(global){
 const MODE='area_service_interval_v1';
 const clean=v=>String(v??'').trim();
 const norm=v=>clean(v).toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ');
 const arr=v=>Array.isArray(v)?v:[];
 const uniq=v=>[...new Set(arr(v).map(String))];
 const labels={bearing:'Подшипники',gearbox_oil:'Редукторы',chain:'Цепи',linear_bearing:'Линейные подшипники',coupling:'Муфты',open_gear:'Открытые зубчатые передачи',guide:'Смазываемые направляющие',joint:'Шарниры',bushing:'Втулки',screw:'Винтовые передачи',ball_screw:'ШВП',rope:'Канаты',oil_system:'Масляные системы',central_point:'Централизованная подача смазки'};
 const bad=(code,message)=>({ok:false,code,message});
 function serviceFor(t,lp){
   const C=global.LubricaStructureContext;
   const raw=norm(lp?.category);
   const cat=global.LubricaCore?.DatabaseSchema?.normalizePointCategory?.(raw)||({motor:'bearing',fan:'bearing',gearbox:'gearbox_oil'}[raw]||raw);
   const categoryLabel=labels[cat]||C?.categoryLabels?.[cat];
   if(!cat||cat==='other'||!categoryLabel)return bad('SERVICE_CATEGORY_UNKNOWN','Не подтверждена категория физической точки');
   const explicit=clean(t?.activityType),fromLabel=C?.activityTypeForLabel?.(t?.operation)||'custom';
   const alias=v=>({relubrication:'regrease'}[v]||v);
   const a=alias(explicit&&explicit!=='custom'?explicit:fromLabel);
   const from=alias(fromLabel);
   const known=C?.activityCatalog?.[a];
   if(!known||a==='custom')return bad('SERVICE_OPERATION_UNKNOWN','Не распознано мероприятие: '+clean(t?.operation));
   if(explicit&&explicit!=='custom'&&from!=='custom'&&from!==a)return bad('SERVICE_OPERATION_CONFLICT','Тип и название мероприятия расходятся');
   const options=C?.activityTypesByCategory?.[cat];
   if(!options?.includes(a))return bad('SERVICE_OPERATION_MISMATCH','Мероприятие не соответствует категории физической точки');
   return{ok:true,category:cat,activityType:a,key:cat+':'+a,label:categoryLabel+' — '+known.label};
 }
 function spec(kind,value){
   const v=Number(value);
   if(!Number.isFinite(v)||v<=0||(!['runtime_hours'].includes(kind)&&!Number.isInteger(v)))return null;
   if(kind==='weeks')return spec('days',v*7);
   if(kind==='years')return spec('months',v*12);
   const units={days:'дн.',months:'мес.',runtime_hours:'ч'};
   if(!units[kind])return null;
   return{ok:true,kind,value:v,key:kind+':'+v,label:kind==='days'&&v%7===0?v/7+' нед.':v+' '+units[kind]};
 }
 function textSpec(value){
   const s=norm(value).replace(/,/g,'.').replace(/\.$/,'');
   if(!s||/без период|по состояни|по событ|по требован|при то/.test(s))return null;
   if(/^(ежедневно|каждый день)$/.test(s))return spec('days',1);
   if(/^(еженедельно|каждую неделю)$/.test(s))return spec('weeks',1);
   if(/^(ежемесячно|каждый месяц)$/.test(s))return spec('months',1);
   if(/^(ежегодно|каждый год)$/.test(s))return spec('years',1);
   const m=s.match(/^(?:(?:каждые|каждый|через|раз в)\s+)?(\d+(?:\.\d+)?)\s*(ч|час|часа|часов|моточас|моточаса|моточасов|мч|дн|день|дня|дней|сут|сутки|суток|нед|неделя|неделю|недели|недель|мес|месяц|месяца|месяцев|год|года|лет)$/);
   if(!m)return null;
   const unit=m[2],kind=/^(ч|час|моточас|мч)/.test(unit)?'runtime_hours':/^(дн|день|сут)/.test(unit)?'days':/^нед/.test(unit)?'weeks':/^мес/.test(unit)?'months':'years';
   return spec(kind,m[1]);
 }
 function scheduleFor(t){
   const s=t?.schedule||{},strategy=norm(s.strategy),raw=clean(s.legacyText||s.interval||t?.interval||t?.legacy?.interval);
   if(/по состояни|по событ|по требован/.test(strategy)||/по состояни|по событ|по требован|при то/.test(norm(raw)))return bad('NON_PERIODIC','Обслуживание по состоянию/событию не является периодическим маршрутом');
   const hrs=s.runtimeHours,cv=s.calendarValue,cu=norm(s.calendarUnit);
   const hasHours=hrs!=null&&clean(hrs)!=='',hasCal=cv!=null&&clean(cv)!==''&&!!cu;
   if(hasHours&&hasCal)return bad('INTERVAL_CONFLICT','Одновременно заданы календарный интервал и моточасы');
   const structured=hasHours?spec('runtime_hours',hrs):hasCal?spec(cu,cv):null;
   if((hasHours||hasCal)&&!structured)return bad('INTERVAL_INVALID','Некорректный структурированный интервал');
   const parsed=raw?textSpec(raw):null;
   if(raw&&!parsed)return bad('INTERVAL_UNSUPPORTED','Уточните периодичность: '+raw);
   if(structured&&parsed&&structured.key!==parsed.key)return bad('INTERVAL_CONFLICT','Структурированный интервал и текст расходятся');
   const v=structured||parsed;
   if(!v)return bad('INTERVAL_MISSING','Не задана утверждённая периодичность');
   if((/по наработке/.test(strategy)&&v.kind!=='runtime_hours')||(/по календарю/.test(strategy)&&v.kind==='runtime_hours'))return bad('INTERVAL_STRATEGY_CONFLICT','Режим планирования не соответствует интервалу');
   return v;
 }
 function routeKey(r){
   return r?.groupingMode===MODE?JSON.stringify([String(r.lineId||''),String(r.areaId||''),String(r.serviceKey||''),String(r.scheduleKey||'')]):'';
 }
 function describe(c){
   if(!c?.lp?.id||!c.eq?.id||!c.node?.id||!c.line?.id||!c.area?.id||String(c.area.lineId||'')!==String(c.lineId)||String(c.node.equipmentId||'')!==String(c.eq.id))return bad('PHYSICAL_SCOPE_MISSING','Не подтверждены физическая точка, линия или участок');
   const excluded=x=>[x?.status,x?.serviceMode,x?.serviceability,x?.candidateState].some(v=>['disabled','excluded','archived','not_applicable','no_lube','non_lubricated','non_serviceable','sealed','dry'].includes(norm(v)));
   if(excluded(c.lp)||excluded(c.eq)||excluded(c.node)||c.task?.obsoleteByBearingPolicy)return bad('NOT_SERVICEABLE','Точка или мероприятие исключены из обслуживания');
   const service=serviceFor(c.task,c.lp);if(!service.ok)return service;
   const schedule=scheduleFor(c.task);if(!schedule.ok)return schedule;
   const group={groupingMode:MODE,lineId:c.lineId,areaId:c.areaId,serviceKey:service.key,serviceLabel:service.label,scheduleKey:schedule.key,interval:schedule.label};
   return{ok:true,...group,key:routeKey(group),name:[c.line.name,c.area.name,service.label,schedule.label].filter(Boolean).join(' — ')};
 }
 function matches(r,c){if(r?.groupingMode!==MODE)return true;const info=describe(c);return info.ok&&routeKey(r)===info.key}
 // R7: shared task ownership and protection.
 const workingRoutes=d=>arr(d?.routes).filter(r=>r.status!=='archived');
 const openPlan=x=>!['completed','cancelled'].includes(x?.status);
 const runningTask=(d,id)=>arr(d?.checklistRuns).some(x=>x.status==='in_progress'&&arr(x.routeTaskIds).map(String).includes(String(id)));
 const taskReserved=(d,id)=>arr(d?.routePlanItems).some(x=>openPlan(x)&&arr(x.taskIds).map(String).includes(String(id)))||runningTask(d,id);
 const routeLocked=(d,r)=>!!r&&(arr(d?.routePlanItems).some(x=>String(x.routeId)===String(r.id)&&openPlan(x))||arr(d?.checklistRuns).some(x=>String(x.routeId)===String(r.id)&&x.status==='in_progress'));
 function ownership(d){
  const routes=workingRoutes(d),owners=new Map(),byGroup=new Map(),excluded=new Set(),reserved=new Set(),locked=new Set();
  for(const r of routes){for(const id of uniq(r.taskIds)){if(!owners.has(id))owners.set(id,[]);owners.get(id).push(r)}for(const id of uniq(r.excludedTaskIds))excluded.add(id);if(routeLocked(d,r))locked.add(String(r.id));const k=routeKey(r);if(k){if(!byGroup.has(k))byGroup.set(k,[]);byGroup.get(k).push(r)}}
  for(const x of arr(d?.routePlanItems).filter(openPlan))for(const id of arr(x.taskIds))reserved.add(String(id));
  for(const x of arr(d?.checklistRuns).filter(x=>x.status==='in_progress'))for(const id of arr(x.routeTaskIds))reserved.add(String(id));
  return {routes,owners,byGroup,excluded,reserved,locked};
 }
 function preview(d,o={},engine=global.LubricaRouteEngine){
  const R=global.LubricaRouteAutomation;
  if(!R)return{ok:false,code:'AUTOMATION_REQUIRED',reason:'Модуль автоматизации маршрутов недоступен',groups:[],issues:[],token:''};
  return R.reconcile(d,{...o,compatDraftOnly:true},engine);
 }
 global.LubricaRouteAutoGrouping=Object.freeze({MODE,serviceFor,scheduleFor,parseText:textSpec,describe,routeKey,matches,preview,workingRoutes,openPlan,runningTask,taskReserved,routeLocked,ownership});
})(window);
