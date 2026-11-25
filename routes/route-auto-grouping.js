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
   return{ok:true,kind,value:v,key:kind+':'+v,label:v+' '+units[kind]};
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
 function preview(d,{lineId='',areaId=''}={},engine=global.LubricaRouteEngine){
   const issues=[],groups=new Map(),valid=new Map();
   if(!d||!engine)return{ok:false,reason:'База недоступна',groups:[],issues:[],token:''};
   const readiness=engine.readinessIndex(d),contexts=engine.contextIndex(d);
   if(!readiness)return{ok:false,reason:'Инженерный контроль недоступен',groups:[],issues:[],token:''};
   const scope=c=>(!lineId||c.lineId===lineId)&&(!areaId||c.areaId===areaId);
   const report=(id,code,message,routeId='')=>issues.push({taskId:id,code,message,routeId});
   for(const t of arr(d.tasks)){
     const id=String(t.id),c=contexts.get(id);
     if(!scope(c))continue;
     if(!readiness.has(id)){report(id,'QA_MISSING','Отсутствует запись инженерного контроля');continue}
     const gate=engine.routeEligibility(t,d,readiness,c);
     if(!gate.ok){report(id,gate.code,gate.message);continue}
     const g=describe(c);if(!g.ok){report(id,g.code,g.message);continue}
     valid.set(id,g);
     if(!groups.has(g.key))groups.set(g.key,{...g,ids:[]});
     groups.get(g.key).ids.push(id);
   }
   const working=arr(d.routes).filter(r=>r.status!=='archived');
   const assigned=new Map(),excluded=new Set(),typed=new Map();
   for(const r of working){
     for(const id of uniq(r.taskIds)){if(!assigned.has(id))assigned.set(id,[]);assigned.get(id).push(r)}
     for(const id of uniq(r.excludedTaskIds))excluded.add(id);
     const k=routeKey(r);if(k){if(!typed.has(k))typed.set(k,[]);typed.get(k).push(r)}
   }
   const compare=(a,b)=>{const x=contexts.get(a),y=contexts.get(b);return (clean(x?.eq?.externalCode)+' '+clean(x?.eq?.name)+' '+clean(x?.lp?.name)+' '+a).localeCompare(clean(y?.eq?.externalCode)+' '+clean(y?.eq?.name)+' '+clean(y?.lp?.name)+' '+b,'ru',{numeric:true})};
   const changes=[];
   for(const g of groups.values()){
     const existing=typed.get(g.key)||[],r=existing.length===1?existing[0]:null;
     const pending=[],owned=[];
     for(const id of g.ids){
       const owners=assigned.get(id)||[];
       if(owners.length){owned.push(id);if(owners.length>1||!r||owners.some(x=>x.id!==r.id))report(id,'ALREADY_ASSIGNED','Уже в маршруте: '+owners.map(x=>x.code||x.id).join(', '),owners[0].id);continue}
       if(excluded.has(id)){report(id,'MANUALLY_EXCLUDED','Мероприятие исключено вручную');continue}
       pending.push(id);
     }
     const ids=uniq(r?.taskIds),invalid=ids.filter(id=>valid.get(id)?.key!==g.key||(assigned.get(id)||[]).length!==1);
     const locked=r&&(r.status!=='draft'||arr(d.checklistRuns).some(x=>String(x.routeId)===String(r.id)&&x.status==='in_progress')||arr(d.routePlanItems).some(x=>String(x.routeId)===String(r.id)&&!['completed','cancelled'].includes(x.status)));
     let action='none',reason='';
     if(existing.length>1){action='blocked';reason='Несколько текущих маршрутов одной группы; проверьте дубли'}
     else if(invalid.length){action='blocked';reason='Состав маршрута изменился или утратил готовность; требуется ручная сверка'}
     else if(pending.length&&locked){action='blocked';reason='Сначала проверьте активный маршрут, выполнение и план; автоматически изменяются только свободные черновики'}
     else if(pending.length)action=r?'update':'create';
     if(action==='blocked')for(const id of pending)report(id,'GROUP_BLOCKED',reason,r?.id||'');
     const add=pending.sort(compare),next=action==='create'||action==='update'?[...ids,...add]:ids;
     changes.push({...g,ids:undefined,action,reason,routeId:r?.id||'',currentTaskIds:ids,taskIds:next,addTaskIds:add,invalidTaskIds:invalid,ownedCount:owned.length,pointCount:new Set(next.map(id=>contexts.get(id)?.lp?.id).filter(Boolean)).size});
   }
   // Show typed routes which no longer have even one valid member, without modifying them.
   for(const [k,rs] of typed){
     if(groups.has(k))continue;
     for(const r of rs){
       if(lineId&&r.lineId!==lineId||areaId&&r.areaId!==areaId)continue;
       const ids=uniq(r.taskIds);if(!ids.length)continue;
       changes.push({key:k,name:r.name||r.code||r.id,action:'blocked',reason:'В группе нет готовых мероприятий; проверьте состав вручную',routeId:r.id,currentTaskIds:ids,taskIds:ids,addTaskIds:[],invalidTaskIds:ids,ownedCount:ids.length,pointCount:0});
     }
   }
   changes.sort((a,b)=>a.name.localeCompare(b.name,'ru',{numeric:true}));
   const actionable=changes.filter(g=>g.action==='create'||g.action==='update');
   const token=JSON.stringify(actionable.map(g=>[g.key,g.action,g.routeId,g.currentTaskIds,g.taskIds,g.name,g.serviceLabel,g.interval]));
   return{ok:true,groups:changes,issues,token,summary:{create:actionable.filter(g=>g.action==='create').length,update:actionable.filter(g=>g.action==='update').length,blocked:changes.filter(g=>g.action==='blocked').length,add:actionable.reduce((n,g)=>n+g.addTaskIds.length,0),issues:issues.length}};
 }
 global.LubricaRouteAutoGrouping=Object.freeze({MODE,serviceFor,scheduleFor,describe,routeKey,matches,preview});
})(window);
