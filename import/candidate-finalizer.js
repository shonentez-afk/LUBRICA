(function(global){
'use strict';
const API=global.LubricaCandidateFinalizer=global.LubricaCandidateFinalizer||{};
const Core=global.LubricaCore;
const C=global.LubricaStructureContext;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cleanTmcName=v=>String(v??'').replace(/\s+Линия\s*№?\s*\d+\s*$/i,'').replace(/^Узел\s+подшипниковый\s+/i,'').replace(/^Подшипник\s+/i,'').replace(/^Цепь\s+роликовая\s+/i,'').replace(/\s{2,}/g,' ').trim();
const db=()=>Core?.State?.getDatabase?.();
const byId=(a,id)=>(a||[]).find(x=>x.id===id);

function sourceRecord(database,source,id){
  return source==='equipment'?byId(database.equipment,id):byId(database.components,id);
}
function sourceEquipment(database,source,record){
  return source==='equipment'?record:byId(database.equipment,record?.equipmentId);
}
function normalizeActivities(values,category){
  const source=(values&&values.length?values:C?.operationOptions?.(category)?.slice(0,1)||['Смазочное обслуживание']);
  return source.map(value=>{
    if(value&&typeof value==='object'&&value.type){
      return {type:value.type,label:value.label||C.activityLabel(value.type)};
    }
    const raw=String(value||'').trim();
    if(C.activityCatalog?.[raw])return {type:raw,label:C.activityLabel(raw)};
    const type=C.activityTypeForLabel?.(raw)||'custom';
    return {type,label:type==='custom'?(raw||'Другое'):C.activityLabel(type)};
  });
}
function activityOptions(category){
  const base=C.activityOptions?.(category)||[];
  return [...base.filter(x=>x.type!=='custom'),{type:'custom',label:'Другое',needsMaterial:false}];
}
function activityChecks(category,selected,index){
  const selectedByType=new Map((selected||[]).map(a=>[a.type,a]));
  const options=activityOptions(category);
  const custom=selectedByType.get('custom');
  return `<div class="candidate-activity-options">${options.map(opt=>`<label class="candidate-activity-option"><input type="checkbox" name="activity_${index}" value="${esc(opt.type)}" ${selectedByType.has(opt.type)?'checked':''}><span>${esc(opt.label)}</span></label>`).join('')}</div>
    <label class="candidate-custom-activity ${custom?'':'hidden'}" data-custom-wrap="${index}"><span>Название другого мероприятия</span><input name="custom_${index}" value="${esc(custom?.label||'')}" placeholder="Например: Проверка подачи по специальной инструкции"></label>`;
}
function readActivities(form,index){
  const types=Array.from(form.querySelectorAll(`input[name="activity_${index}"]:checked`)).map(x=>x.value);
  return types.map(type=>{
    if(type==='custom'){
      const label=form.elements[`custom_${index}`]?.value.trim();
      return label?{type:'custom',label}:null;
    }
    return {type,label:C.activityLabel(type)};
  }).filter(Boolean);
}
function bindCustomVisibility(form,index){
  const custom=form.querySelector(`input[name="activity_${index}"][value="custom"]`);
  const wrap=form.querySelector(`[data-custom-wrap="${index}"]`);
  if(!custom||!wrap)return;
  const sync=()=>wrap.classList.toggle('hidden',!custom.checked);
  custom.addEventListener('change',sync);
  sync();
}
function currentActivities(form,index){
  return readActivities(form,index);
}

function makeNode(database,equipment,name,originKey){
  let n=(database.nodes||[]).find(x=>x.equipmentId===equipment.id&&x.candidateOriginKey===originKey);
  if(n)return n;
  n={
    id:Core.IDs.nextFrom(database.nodes,'NODE',6),
    equipmentId:equipment.id,
    name:name||'Узел смазки',
    description:'Создан после инженерного подтверждения кандидата',
    source:'Candidates Stage 6.4',
    origin:'candidate',
    candidateOriginKey:originKey
  };
  database.nodes.push(n);
  return n;
}
function makePoint(database,equipment,node,spec,originKey,sourceRecord=null,sourceType='component'){
  let p=(database.lubricationPoints||[]).find(x=>x.candidateOriginKey===originKey);
  if(p)return p;
  let bearing=null;
  if((spec.category||'other')==='bearing'&&global.LubricaBearings){
    const resolved=global.LubricaBearings.lookup(spec.sourceRef?.name||spec.name||'');
    const bp=resolved?.parsed;
    if(bp?.baseDesignation){
      const exactDesignation=String(resolved?.record?.designation||'').trim();
      const structural=[bp.baseDesignation,bp.sealingCode,bp.clearance].filter(Boolean);
      const normalizedStructural=exactDesignation||structural[0]+(structural[1]&&!String(structural[0]).includes(structural[1])?`-${structural[1]}`:'')+(structural[2]&&!String(structural[0]).includes(`/${structural[2]}`)?`/${structural[2]}`:'');
      bearing={
        structuralDesignation:normalizedStructural,
        actualDesignation:'',
        effectiveDesignation:normalizedStructural,
        baseDesignation:bp.baseDesignation,
        bearingType:resolved?.record?.bearingType||bp.inferredType||'unknown',
        d:bp.dimensions?.d??null,D:bp.dimensions?.D??null,B:bp.dimensions?.B??null,
        sealing:bp.sealing||'unknown',sealingCode:bp.sealingCode||'',clearance:bp.clearance||'',cage:bp.cage||'',
        catalogId:bp.catalogId||null,sourceType:resolved.sourceType||'none',resolvedAt:new Date().toISOString()
      };
    }
  }
  p={
    id:Core.IDs.nextFrom(database.lubricationPoints,'LP',6),
    equipmentId:equipment.id,
    nodeId:node.id,
    name:spec.name,
    category:spec.category||'other',
    positionLabel:spec.position||'',
    location:'',
    feedMethod:'',
    accessibility:'unknown',
    serviceMode:'unknown',
    status:'review',
    source:'Candidates Stage 6.4',
    origin:'candidate',
    candidateOriginKey:originKey,
    bearing,
    fanLubrication: spec.fanLubrication ? {...spec.fanLubrication} : null
  };
  if(global.LubricaComponentBinding){
    const sourceComponent=sourceType==='component'?sourceRecord:null;
    global.LubricaComponentBinding.bindPoint(p,{sourceComponent,equipment});
  }
  database.lubricationPoints.push(p);
  return p;
}
function canonicalActivityType(type,label=''){
  const raw=String(type||'').trim();
  if(raw==='relubrication')return'regrease';
  if(raw)return raw;
  return C.activityTypeForLabel?.(label)||'custom';
}
function makeTasks(database,point,spec,originKey){
  const activities=(spec.activities&&spec.activities.length?spec.activities:normalizeActivities([],spec.category));
  for(const rawActivity of activities){
    const activity={...rawActivity,type:canonicalActivityType(rawActivity.type,rawActivity.label)};
    const suffix=activity.type==='custom'?`${activity.type}:${activity.label.toLowerCase()}`:activity.type;
    const key=`${originKey}|${suffix}`;
    if(database.tasks.some(t=>t.candidateOriginKey===key))continue;
    const operation=activity.label||C.activityLabel(activity.type);
    const needsMaterial=activity.type==='custom'
      ?!/контроль|проверка|осмотр|отбор|очист/i.test(operation)
      :C.activityNeedsMaterial(activity.type);
    database.tasks.push({
      id:Core.IDs.nextFrom(database.tasks,'TASK',6),
      lubricationPointId:point.id,
      activityType:activity.type,
      operation,
      materialMode:needsMaterial?'explicit':'none',
      materialName:'',
      materialId:null,
      toolId:null,
      quantity:{approved:'',unit:['gearbox_oil','oil_system'].includes(spec.category)?'л':'г'},
      schedule:{legacyText:'',strategy:'По календарю'},
      approvalStatus:'review',
      verified:false,
      source:'Candidates Stage 6.4',
      origin:'candidate',
      candidateOriginKey:key
    });
  }
}
function spec(key,name,category,position,actions,selected=true,extra={}){
  return {key,name,category,position,activities:normalizeActivities(actions,category),selected,...extra};
}
function specsFor(record,source){
  const template=source==='equipment'?record.maintenanceTemplate:record.candidateTemplate;
  const category=source==='equipment'?record.maintenanceCandidateCategory:record.candidateCategory;
  const label=source==='equipment'?record.maintenanceLabel:record.candidateLabel;
  if(source==='component'&&category)return [spec('component',record.name||label||'Точка смазки',category,'',null,true,{actual:true})];
  if(['two_support_rotating','fan_bearings'].includes(template?.id)&&template.evidence?.actual?.length){
    return template.evidence.actual.map((a,i)=>spec(
      `actual_${a.source}_${a.id}`,
      a.name,
      'bearing',
      /\bde\b/i.test(a.name)?'DE':/\bnde\b/i.test(a.name)?'NDE':/лев|left/i.test(a.name)?'Левая':/прав|right/i.test(a.name)?'Правая':'',
      ['Досмазывание'],
      true,
      {actual:true}
    ));
  }
  if(template?.id==='conveyor_arrangement'){
    const ev=template.evidence||{},actual=ev.actual||[],assets=ev.assets||[],layout=ev.supportLayout||null;
    const specs=[];
    if(layout?.supports?.length===4){
      for(const support of layout.supports){
        const br=support.bearingRef||support.suggestedBearingRef||null;
        specs.push(spec(
          `conveyor_support_${support.key}`,
          support.position,
          'bearing',
          support.position,
          ['Досмазывание'],
          true,
          {actual:true,conveyorEvidence:true,physicalSupport:true,serviceLocationName:support.position,shaftId:support.shaftId,side:support.side,sourceRef:br,supportKey:support.key,assignmentStatus:support.assignmentStatus||'unassigned'}
        ));
      }
    }else{
      for(const a of actual.filter(x=>x.category==='bearing'||x.category==='linear_bearing')){
        specs.push(spec(`conveyor_${a.source}_${a.id}`,a.name,a.category||'bearing','',['Досмазывание'],true,{actual:true,conveyorEvidence:true,serviceLocationName:a.name,sourceRef:a}));
      }
    }
    for(const a of actual.filter(x=>!['bearing','linear_bearing'].includes(x.category))){
      const autoSelected=['chain'].includes(a.category); // still requires physical-location confirmation
      specs.push(spec(`conveyor_${a.source}_${a.id}`,a.name,a.category||'other',layout&&a.category==='chain'?'Цепной привод':'',null,autoSelected,{actual:true,conveyorEvidence:true,serviceLocationName:a.name,sourceRef:a}));
    }
    for(const a of assets.filter(x=>['gearbox','motor_gearbox'].includes(x.equipmentType))){
      const location=a.equipmentType==='gearbox'?'Редуктор':'Мотор-редуктор';
      if(!layout&&a.source==='equipment')continue; // Child gearbox has its own maintenance record.
       specs.push(spec(`conveyor_asset_${a.source}_${a.id}`,location,'gearbox_oil','Привод',['Проверка уровня','Замена масла'],!!layout,{actual:true,conveyorEvidence:true,conveyorAsset:true,serviceLocationName:location,sourceRef:a}));
    }
    return specs;
  }
  if(template?.items?.length){
    return template.items.map((x,i)=>spec(
      x.key||`item_${i}`,
      x.label,
      x.category||'other',
      x.position==='left'?'Левая':x.position==='right'?'Правая':x.position||'',
      x.actions,
      !x.optional,
      {optional:!!x.optional}
    ));
  }
  const type=source==='equipment'?record.maintenanceEquipmentType:record.candidateEquipmentType;
  if(type==='motor'){
    const motorProfile=global.LubricaMotorOEM?.resolve?.(record.name||record.maintenanceLabel||record.candidateLabel||'');
    if(motorProfile?.policy==='NO_ROUTINE_RELUBE')return [];
    // 1.0.33.1: DE/NDE are not invented as lubrication points only from the word "motor".
    // The user must explicitly confirm that this motor actually has serviceable bearings / grease nipples.
    return [
      spec('de','Подшипник DE','bearing','DE',['Досмазывание'],false,{motorReview:true}),
      spec('nde','Подшипник NDE','bearing','NDE',['Досмазывание'],false,{motorReview:true})
    ];
  }
  if(type==='fan')return [];
  if(type==='gearbox')return [
    spec('oil','Редуктор','gearbox_oil','',['Проверка уровня','Замена масла'],true)
  ];
  return [spec('review',label||record.name||'Точка смазки',category||'other','',null,true)];
}

function applyConfirmedSpecs(database,source,record,equipment,template,chosen){
  const originBase=`${source}:${record.id}`;
  const sharedComponentNodeKey=source==='component'?`${originBase}:node`:null;
  const sharedComponentNodeName=source==='component'?(record.name||record.candidateLabel||'Узел смазки'):null;
  for(let i=0;i<chosen.length;i++){
    const item=chosen[i];
    const key=`${originBase}:${item.key||i}`;
    const node=source==='component'
      ?makeNode(database,equipment,sharedComponentNodeName,sharedComponentNodeKey)
      :makeNode(database,equipment,template?.title||record.name,item.groupKey?`${originBase}:${item.groupKey}`:key);
    const linkedComponent=item.sourceRef?.source==='component'?(database.components||[]).find(c=>c.id===item.sourceRef.id):null;
    const point=makePoint(database,equipment,node,item,key,linkedComponent||record,linkedComponent?'component':source);
    if(['conveyor_arrangement','rotating_arrangement','oscillating_linkage'].includes(template?.id)){
      point.name=item.serviceLocationName||item.name;
      point.positionLabel=item.position||point.positionLabel||'';
      point.serviceLocationName=item.serviceLocationName||item.name;
      if(linkedComponent){
        point.installedComponent={id:linkedComponent.id,name:linkedComponent.name,displayName:cleanTmcName(linkedComponent.name),sourceName:linkedComponent.name,externalCode:linkedComponent.externalCode||'',source:'structure_component'};
        global.LubricaComponentBinding?.bindPoint?.(point,{sourceComponent:linkedComponent,equipment});
      }
    }
    makeTasks(database,point,item,key);
    if(linkedComponent){linkedComponent.candidateState='confirmed';linkedComponent.candidateReviewedAt=new Date().toISOString();linkedComponent.candidateCreatedPointIds=Array.from(new Set([...(linkedComponent.candidateCreatedPointIds||[]),point.id]));}
  }
  const createdPointIds=database.lubricationPoints.filter(p=>p.candidateOriginKey?.startsWith(originBase)).map(p=>p.id);
  if(source==='equipment'){
    record.maintenanceCandidateState='confirmed';
    record.maintenanceReviewedAt=new Date().toISOString();
    record.maintenanceCreatedPointIds=createdPointIds;
  }else{
    record.candidateState='confirmed';
    record.candidateReviewedAt=new Date().toISOString();
    record.candidateCreatedPointIds=createdPointIds;
  }
  return {originBase,createdPointIds};
}

function conveyorSupportAssignmentPanel(template){
  if(template?.id!=='conveyor_arrangement')return'';
  const ev=template.evidence||{},layout=ev.supportLayout||null,bearings=(ev.actual||[]).filter(x=>x.category==='bearing'||x.category==='linear_bearing');
  if(!layout?.supports?.length||layout.supports.length!==4)return'';
  const options=(selected)=>`<option value="">Не определено</option>${bearings.map(b=>`<option value="${esc(b.id)}" ${selected===b.id?'selected':''}>${esc(cleanTmcName(b.name))}</option>`).join('')}`;
  const rows=layout.supports.map(s=>{const selected=s.bearingRef?.id||s.suggestedBearingRef?.id||'';return `<label class="conveyor-support-assign"><span>${esc(s.position)}</span><select name="bearing_assign_${esc(s.key)}">${options(selected)}</select></label>`}).join('');
  const bearingWarning=bearings.length>1?'Импорт содержит несколько подшипниковых узлов. Укажите, какой узел относится к каждой физической опоре. LUBRICA не назначает их автоматически.':bearings.length===1?'Найдено одно обозначение подшипника. Оно предложено для всех четырёх опор, но назначение необходимо проверить.':'Подшипниковые узлы в импорте не определены. Назначьте их вручную либо оставьте «Не определено» и уточните конструкцию.';
  let shaftBlock='';
  if(layout.shaftRolesNeedConfirmation&&layout.shaftCandidates?.length>=2){
    const shaftOptions=(selected)=>`<option value="">Не определено</option>${layout.shaftCandidates.map(x=>`<option value="${esc(x.id)}" ${selected===x.id?'selected':''}>${esc(cleanTmcName(x.name))}</option>`).join('')}`;
    const drive=layout.shafts?.find(x=>x.role==='drive')?.id||'';
    const ret=layout.shafts?.find(x=>x.role!=='drive')?.id||'';
    shaftBlock=`<section class="conveyor-shaft-mapping"><div class="wizard-note"><b>Распределение валов</b><span>Из импорта неясно, какой вал приводной, а какой натяжной/ведомый. Укажите назначение каждого вала перед распределением подшипников.</span></div><div class="conveyor-support-map-grid"><label class="conveyor-support-assign"><span>Приводной вал</span><select name="shaft_assign_drive">${shaftOptions(drive)}</select></label><label class="conveyor-support-assign"><span>Натяжной / ведомый вал</span><select name="shaft_assign_return">${shaftOptions(ret)}</select></label></div></section>`;
  }
  return `${shaftBlock}<section class="conveyor-support-mapping"><div class="wizard-note"><b>Распределение подшипников по валам</b><span>${esc(bearingWarning)}</span></div><div class="conveyor-support-map-grid">${rows}</div></section>`;
}
function conveyorEvidencePanel(template){
  if(template?.id!=='conveyor_arrangement')return'';
  const ev=template.evidence||{},actual=ev.actual||[],assets=ev.assets||[],context=ev.context||[],excluded=ev.excluded||[],layout=ev.supportLayout||null;
  const card=(cls,title,items,empty)=>`<section class="conveyor-evidence-card ${cls}"><header><b>${esc(title)}</b><span>${items.length}</span></header>${items.length?`<div>${items.slice(0,12).map(x=>`<p><strong>${esc(cleanTmcName(x.name))}</strong>${x.label?`<small>${esc(x.label)}</small>`:''}</p>`).join('')}${items.length>12?`<p class="conveyor-evidence-more">Ещё ${items.length-12}</p>`:''}</div>`:`<p class="conveyor-evidence-empty">${esc(empty)}</p>`}</section>`;
  const physical=layout?.supports?.length===4?layout.supports.map(x=>({name:x.position,label:layout.bearingReference?.name||'Подшипник требует уточнения'})):[];
  const headline=physical.length===4?'Два вала: назначьте реальные подшипники на четыре опорных места':'Составной конвейер: только реальные ТМЦ и физические места обслуживания';
  const note=physical.length===4?'Назначьте установленный подшипниковый ТМЦ на каждую опору. Точки не создаются до подтверждения.':'Для роликового, ламельного, цепного, шнекового, поворотного и комбинированного конвейера используйте реальные ТМЦ. Схема 2 вала × 2 опоры не предполагается. Укажите точное место каждой операции.';
  return `<div class="conveyor-arrangement-intro"><div><span class="eyebrow">ФАКТИЧЕСКАЯ КОНСТРУКЦИЯ</span><b>${esc(headline)}</b><p>${esc(note)}</p></div><div class="conveyor-evidence-grid">${physical.length?card('service','Физические подшипниковые опоры',physical,''):card('service','Точки-кандидаты',actual,'Подшипники, цепи и другие обслуживаемые ТМЦ не найдены.')}${card('assets','Отдельные агрегаты',assets,'Отдельные двигатель/редуктор не найдены.')}${card('context','Контекст конструкции',context,'Контекстные валы/барабаны не найдены.')}${card('excluded','Исключено',excluded,'Пассивных элементов не найдено.')}</div></div>`;
}
function open(source,id,decisionContext=null){
  const database=db();
  const record=sourceRecord(database,source,id);
  const equipment=sourceEquipment(database,source,record);
  if(!record||!equipment){
    global.LubricaApp?.showToast('Не найдено оборудование для кандидата','error');
    return;
  }
  const equipmentType=source==='equipment'?record.maintenanceEquipmentType:record.candidateEquipmentType;
  // 1.0.28.7: both the fan position candidate and its physical Fan Asset component
  // must enter the same Fan Bearing Arrangement Engine. The legacy candidate
  // finalizer must never create/ask for virtual fan supports.
  if(equipmentType==='fan'&&global.LubricaFanBearingArrangement){
    global.LubricaFanBearingArrangement.open(equipment.id);
    return;
  }
  const rawTemplate=source==='equipment'?record.maintenanceTemplate:record.candidateTemplate;
  if(source==='equipment'&&(rawTemplate?.id==='izoteh_pp53736'||global.LubricaPP53736Arrangement?.isCorrugator?.(record))&&global.LubricaPP53736Arrangement){
    global.LubricaPP53736Arrangement.open(equipment.id);
    return;
  }
  const oscillatingRoot=global.LubricaOscillatingLinkageArrangement?.rootForRecord?.(database,record,source);
  if(oscillatingRoot){
    global.LubricaOscillatingLinkageArrangement.open(oscillatingRoot.id);
    return;
  }
  if(global.LubricaRotatingArrangement?.isRotating?.(record,source)&&['rotating_arrangement','two_support_rotating','spindle','drum_review'].includes(rawTemplate?.id||'rotating_arrangement')){
    global.LubricaRotatingArrangement.open(source,id);
    return;
  }
  // Stage 5B: opening a constructor is read-only, even for old classified templates.
  let previewRecord=record;
  if(source==='equipment' && (record.maintenanceEquipmentType==='conveyor' || record.equipmentType==='conveyor' || record.maintenanceTemplate?.id==='conveyor_arrangement')){
    const identity=global.LubricaClassifier?.conveyorIdentity?.(record.name,record.equipmentType,record);
    if(identity?.role==='group'||identity?.role==='ancillary'){
      global.LubricaApp?.showToast?.('Это группа или обслуживающая подсистема. Откройте конкретный конвейер.','warn');
      return;
    }
    const ev=global.LubricaClassifier?.conveyorEvidence?.(database,equipment);
    if(ev){
      const bits=[];
      if(ev.supportLayout?.supports?.length===4)bits.push('два подтверждённых вала: 4 места для проверки подшипников');
      if(ev.byCategory?.bearing)bits.push('подшипники: '+ev.byCategory.bearing);
      if(ev.byCategory?.chain)bits.push('цепи: '+ev.byCategory.chain);
      if(ev.assets?.length)bits.push('приводные агрегаты: '+ev.assets.length);
      const subtype=identity?.subtype||'unknown',title=identity?.label||'Конвейер: подтвердите конструкцию';
      previewRecord={...record,maintenanceEquipmentType:'conveyor',maintenanceEquipmentSubtype:subtype,
        maintenanceTemplate:{...(record.maintenanceTemplate||{}),id:'conveyor_arrangement',title,
          conveyorSubtype:subtype,requiresEngineerConfirmation:true,evidence:ev,
          mode:ev.count||ev.assets?.length?'use_actual':'needs_components',
          summary:bits.length?'Фактически найдено: '+bits.join(' · '):'Обслуживаемые ТМЦ не найдены — точки не создаются.',
          note:ev.supportLayout?'Укажите физические подшипники для каждого места двухвального механизма.':'Не определена двухвальная схема: доступны только реальные ТМЦ и подтверждённые места обслуживания.'}};
    }
  }
  const template=source==='equipment'?previewRecord.maintenanceTemplate:previewRecord.candidateTemplate;
  const specs=specsFor(previewRecord,source);
  const dlg=document.getElementById('structureDialog');
  if(!dlg)return;
  const title=source==='equipment'?(previewRecord.maintenanceLabel||previewRecord.name):(previewRecord.candidateLabel||previewRecord.name||'Кандидат');
  dlg.classList.add('candidate-finalize-dialog');
  dlg.innerHTML=`<form method="dialog" class="structure-form">
    <div class="dialog-head"><div><span class="eyebrow">ИНЖЕНЕРНОЕ ПОДТВЕРЖДЕНИЕ</span><h2>${esc(title)}</h2></div><button type="button" class="icon-btn" data-cancel>×</button></div>
    <div class="candidate-finalize-context"><b>${esc(equipment.name)}</b><span>${esc(record.externalCode||'')} · ${esc(template?.summary||template?.note||'Проверьте состав точек перед созданием.')}</span></div>
    ${conveyorEvidencePanel(template)}
    ${conveyorSupportAssignmentPanel(template)}
    <div class="candidate-finalize-list">${specs.length?specs.map((s,i)=>`<div class="candidate-finalize-item" data-spec-index="${i}">
      <label class="candidate-finalize-check"><input type="checkbox" name="use_${i}" ${s.selected?'checked':''}><span>${template?.id==='conveyor_arrangement'?'Включить точку':'Создать'}</span></label>
      <label class="candidate-point-name"><span>${template?.id==='conveyor_arrangement'?'Точка обслуживания':'Точка смазки'}</span><input name="name_${i}" value="${esc(s.name)}"></label>${template?.id==='conveyor_arrangement'&&s.sourceRef?.name?`<div class="candidate-source-tmc"><span>Узел / ТМЦ</span><b>${esc(cleanTmcName(s.sourceRef.name))}</b></div>`:''}
      <label class="candidate-point-category"><span>Категория</span><select name="cat_${i}">${Object.entries(C.categoryLabels).map(([k,v])=>`<option value="${k}" ${k===s.category?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
      <label class="candidate-point-position"><span>Положение</span><input name="pos_${i}" value="${esc(s.position||'')}"></label>
      <div class="candidate-actions-field" data-activity-box="${i}"><span class="candidate-field-title">Мероприятия</span>${activityChecks(s.category,s.activities,i)}</div>
    </div>`).join(''):`<div class="wizard-note"><b>${equipmentType==='motor'?'Плановые точки досмазывания не создаются автоматически.':'Фактические подшипниковые опоры не найдены.'}</b><span>${equipmentType==='motor'?(global.LubricaMotorOEM?.resolve?.(record.name||'')?.policy==='NO_ROUTINE_RELUBE'?'OEM-профиль двигателя указывает закрытую / greased-for-life конструкцию. Двигатель остаётся в структуре, но ложное мероприятие «Досмазывание» в карту не добавляется.':'Сначала подтвердите фактическую обслуживаемость DE/NDE и наличие точек подачи. LUBRICA не придумывает внутренние подшипники по одному названию двигателя.'):'LUBRICA не создаёт условные «левую/правую» опоры автоматически. Сначала добавьте или подтвердите реальные подшипники/опоры в структуре, либо создайте точку вручную из «Карты смазки». '}</span></div>`}</div>
    ${specs.length?`<div class="wizard-note"><b>Мероприятия выбираются из справочника категории.</b><span>Для нестандартной операции отметьте «Другое» и задайте название. Все созданные мероприятия получают статус «Требует проверки».</span></div>`:''}
    <menu><button type="button" class="btn ghost" data-cancel>${specs.length?'Отмена':'Закрыть'}</button>${specs.length?'<button type="button" class="btn primary" data-save>Подтвердить и создать</button>':''}</menu>
  </form>`;
  const form=dlg.querySelector('form');

  specs.forEach((s,i)=>{
    bindCustomVisibility(form,i);
    const use=form.elements[`use_${i}`];
    const card=form.querySelector(`[data-spec-index="${i}"]`);
    const syncUse=()=>{
      if(!use||!card)return;
      card.classList.toggle('is-disabled',!use.checked);
      for(const el of card.querySelectorAll('input,select')){if(el!==use)el.disabled=!use.checked;}
    };
    use?.addEventListener('change',syncUse);
    syncUse();
    const category=form.elements[`cat_${i}`];
    category.addEventListener('change',()=>{
      const previous=currentActivities(form,i);
      const allowed=new Set(activityOptions(category.value).map(x=>x.type));
      let selected=previous.filter(x=>allowed.has(x.type));
      if(!selected.length){
        const first=activityOptions(category.value).find(x=>x.type!=='custom')||activityOptions(category.value)[0];
        if(first)selected=[{type:first.type,label:first.label}];
      }
      const box=form.querySelector(`[data-activity-box="${i}"]`);
      box.innerHTML=`<span class="candidate-field-title">Мероприятия</span>${activityChecks(category.value,selected,i)}`;
      bindCustomVisibility(form,i);
    });
  });

  form.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{
    dlg.classList.remove('candidate-finalize-dialog');
    dlg.close();
  });
  const saveButton=form.querySelector('[data-save]');
  if(saveButton)saveButton.onclick=()=>{
    const chosen=[];
    const supportAssignments={};
    const shaftAssignments={drive:null,return:null};
    if(template?.id==='conveyor_arrangement'&&template?.evidence?.supportLayout?.supports?.length===4){
      const layout=template.evidence.supportLayout;
      if(layout.shaftRolesNeedConfirmation&&layout.shaftCandidates?.length>=2){
        const driveId=form.elements['shaft_assign_drive']?.value||'';
        const returnId=form.elements['shaft_assign_return']?.value||'';
        shaftAssignments.drive=layout.shaftCandidates.find(x=>String(x.id)===String(driveId))||null;
        shaftAssignments.return=layout.shaftCandidates.find(x=>String(x.id)===String(returnId))||null;
        if(!shaftAssignments.drive||!shaftAssignments.return||shaftAssignments.drive.id===shaftAssignments.return.id){
          global.LubricaApp?.showToast('Укажите два разных вала: приводной и натяжной/ведомый.','warn');
          (!shaftAssignments.drive?form.elements['shaft_assign_drive']:form.elements['shaft_assign_return'])?.focus();
          return;
        }
      }
      const bearingPool=(template.evidence.actual||[]).filter(x=>x.category==='bearing'||x.category==='linear_bearing');
      for(const support of template.evidence.supportLayout.supports){
        const el=form.elements[`bearing_assign_${support.key}`];
        supportAssignments[support.key]=el?.value?bearingPool.find(x=>String(x.id)===String(el.value))||null:null;
      }
      const missing=template.evidence.supportLayout.supports.filter(x=>!supportAssignments[x.key]);
      if(missing.length){
        global.LubricaApp?.showToast(`Укажите подшипниковый узел для всех 4 опор. Не определено: ${missing.map(x=>x.position).join(', ')}`,'warn');
        form.elements[`bearing_assign_${missing[0].key}`]?.focus();
        return;
      }
    }
    for(let i=0;i<specs.length;i++){
      const s=specs[i];
      if(!form.elements[`use_${i}`].checked)continue;
      const activities=readActivities(form,i);
      if(!activities.length){
        global.LubricaApp?.showToast(`Выберите хотя бы одно мероприятие для точки «${form.elements[`name_${i}`].value.trim()||s.name}»`,'warn');
        return;
      }
      const customChecked=Array.from(form.querySelectorAll(`input[name="activity_${i}"]:checked`)).some(x=>x.value==='custom');
      if(customChecked&&!form.elements[`custom_${i}`]?.value.trim()){
        global.LubricaApp?.showToast('Для мероприятия «Другое» задайте название','warn');
        form.elements[`custom_${i}`]?.focus();
        return;
      }
      const assigned=s.physicalSupport&&s.supportKey?supportAssignments[s.supportKey]:null;
      chosen.push({
        ...s,
        name:s.physicalSupport?s.position:(s.serviceLocationName||form.elements[`name_${i}`].value.trim()||s.name),
        category:form.elements[`cat_${i}`].value,
        position:form.elements[`pos_${i}`].value.trim(),
        sourceRef:assigned||s.sourceRef,
        assignedBearingId:assigned?.id||null,
        activities
      });
    }
    if(!chosen.length){
      global.LubricaApp?.showToast('Выберите хотя бы одну точку смазки','warn');
      return;
    }
    // Stage 5B: a non-two-shaft conveyor must have a named actual service location.
    if(template?.id==='conveyor_arrangement'&&!template.evidence?.supportLayout){
      if(chosen.some(x=>!String(x.position||'').trim())){
        global.LubricaApp?.showToast('Для каждой выбранной точки конвейера укажите физическое место обслуживания.','warn');
        return;
      }
    }
    // Existing approved and used records must never be modified by reapplying an arrangement.
    if(template?.id==='conveyor_arrangement'){
      const usedTaskIds=new Set();
      const usedPointIds=new Set();
      for(const task of database.tasks||[])if(['approved','ready'].includes(task.approvalStatus)||task.verified===true)usedTaskIds.add(task.id);
      for(const route of database.routes||[])for(const taskId of route.taskIds||[])usedTaskIds.add(taskId);
      for(const plan of database.routePlanItems||[])if(plan.taskId)usedTaskIds.add(plan.taskId);
      for(const run of database.checklistRuns||[])for(const fact of run.taskResults||[])if(fact.taskId)usedTaskIds.add(fact.taskId);
      for(const t of database.tasks||[])if(usedTaskIds.has(t.id))usedPointIds.add(t.lubricationPointId);
      if(chosen.some(x=>(database.lubricationPoints||[]).some(p=>
        p.candidateOriginKey==='equipment:'+id+':'+x.key && usedPointIds.has(p.id)))){
        global.LubricaApp?.showToast('Существующая точка участвует в утверждении, маршруте, плане или факте. Для её изменения нужна отдельная инженерная сверка.','warn');
        return;
      }
    }
    // The new QA flow requires a physical location; the legacy wizard remains unchanged.
    if(decisionContext){
      const missing=chosen.find(x=>!String(x.position||'').trim());
      if(missing){
        global.LubricaApp?.showToast('Укажите фактическое положение каждой создаваемой точки','warn');
        return;
      }
      const check=global.LubricaEngineeringDecisions?.preview?.(database,id,'point',{
        reason:decisionContext.reason,sourceReference:decisionContext.sourceReference,physicalConfirmed:true
      });
      if(!check?.allowed){
        global.LubricaApp?.showToast(check?.errors?.join(' ')||'Конфигурация устарела, откройте решение снова','warn');
        return;
      }
    }
    // Work on a copy for the new engineer-confirmed workflow: no partial writes on failure.
    const transactionalConveyor=template?.id==='conveyor_arrangement';
    const targetDatabase=(decisionContext||transactionalConveyor)?Core.DatabaseSchema.clone(database):database;
    const targetRecord=(decisionContext||transactionalConveyor)?sourceRecord(targetDatabase,source,id):record;
    const targetEquipment=(decisionContext||transactionalConveyor)?sourceEquipment(targetDatabase,source,targetRecord):equipment;
    if(transactionalConveyor){targetRecord.maintenanceEquipmentType='conveyor';targetRecord.maintenanceEquipmentSubtype=previewRecord.maintenanceEquipmentSubtype;targetRecord.maintenanceTemplate={...template};}
    const applied=applyConfirmedSpecs(targetDatabase,source,targetRecord,targetEquipment,template,chosen);
    if(decisionContext){
      global.LubricaEngineeringDecisions.recordCreated(targetDatabase,id,decisionContext,applied.createdPointIds);
    }
    if(template?.id==='conveyor_arrangement'&&source==='equipment'){
      const ev=template.evidence||{};
      targetRecord.conveyorArrangement={
        version:'1.0.33.72',
        subtype:previewRecord.maintenanceEquipmentSubtype||'unknown',
        confirmedAt:new Date().toISOString(),
        layout:ev.supportLayout?{...ev.supportLayout,shaftRolesNeedConfirmation:false,shafts:ev.supportLayout.shaftRolesNeedConfirmation?[{...(shaftAssignments.drive||{}),role:'drive',label:'Приводной вал'},{...(shaftAssignments.return||{}),role:'return',label:'Натяжной / ведомый вал'}]:(ev.supportLayout.shafts||[]),supports:(ev.supportLayout.supports||[]).map(s=>({...s,shaftId:ev.supportLayout.shaftRolesNeedConfirmation?(s.shaftRole==='drive'?shaftAssignments.drive?.id:shaftAssignments.return?.id):s.shaftId,bearingRef:supportAssignments[s.key]||s.bearingRef||null,suggestedBearingRef:null,assignmentStatus:supportAssignments[s.key]?'confirmed_engineer':s.assignmentStatus}))}:null,
        createdPointIds:applied.createdPointIds,
        source:'engineer_confirmed_constructor'
      };
      if(ev.supportLayout)for(const ctx of (ev.context||[])){
        if(ctx.source!=='component')continue;
        const c=(targetDatabase.components||[]).find(x=>x.id===ctx.id);
        if(!c)continue;
        c.candidateState='confirmed';
        c.candidateReviewedAt=new Date().toISOString();
        c.candidateReason='Учтён как контекст подтверждённой двухвальной схемы конвейера; отдельная точка смазки не создаётся.';
      }
    }
    Core.State.setDatabase(Core.Database.normalize((decisionContext||transactionalConveyor)?targetDatabase:database));
    global.LubricaApp?.refreshFromCore?.();
    global.LubricaApp?.renderAll?.();
    global.LubricaStructure?.render?.();
    global.LubricaApp?.showToast?.(`Создано/подтверждено точек: ${chosen.length}`);
    dlg.classList.remove('candidate-finalize-dialog');
    dlg.close();
    global.LubricaCandidates?.render?.();
    if(decisionContext){const qa=document.getElementById('programQaView');if(qa)global.renderProgramQA?.(qa)}
  };
  dlg.showModal();
}

function removeGeneratedFanArtifacts(database,equipment){
  const base=`equipment:${equipment.id}:fan_`;
  const pointIds=new Set((database.lubricationPoints||[]).filter(p=>String(p.candidateOriginKey||'').startsWith(base)).map(p=>p.id));
  database.tasks=(database.tasks||[]).filter(t=>!pointIds.has(t.lubricationPointId)&&!String(t.candidateOriginKey||'').startsWith(base));
  database.lubricationPoints=(database.lubricationPoints||[]).filter(p=>!pointIds.has(p.id));
  database.nodes=(database.nodes||[]).filter(n=>!String(n.candidateOriginKey||'').startsWith(base));
  return pointIds.size;
}

function applyFanArrangement(database,equipment,specs,arrangement){
  const record=equipment;
  const template={id:'fan_bearing_arrangement',title:arrangement.bearingArrangementType==='MULTI_BEARING_BLOCK'?'Совмещённый подшипниковый блок вентилятора':'Подшипниковые опоры вентилятора'};
  if(specs.length)applyConfirmedSpecs(database,'equipment',record,equipment,template,specs);
  else{
    const noSeparate=arrangement.readiness?.code==='NO_SEPARATE_FAN_BEARINGS';
    if(noSeparate)removeGeneratedFanArtifacts(database,equipment);
    record.maintenanceCandidateState=noSeparate?'confirmed':'review';
    record.maintenanceReviewedAt=new Date().toISOString();
    record.maintenanceCreatedPointIds=[];
  }
  record.fanBearingArrangement=arrangement;
  record.fanBearingArrangementStatus=arrangement.readiness?.code||'NEEDS_CLARIFICATION';

  // Candidate lifecycle parity: the physical Fan Asset is the same confirmed
  // fan identity used by this arrangement. Once the engineer saves the fan
  // construction, do not leave that component as a second unresolved candidate.
  // Motor Asset is intentionally NOT auto-confirmed: its DE/NDE lifecycle is separate.
  const fanAssetId=arrangement?.fanAssetComponentId;
  const fanAsset=fanAssetId?(database.components||[]).find(c=>c.id===fanAssetId):null;
  if(fanAsset){
    fanAsset.candidateState='confirmed';
    fanAsset.candidateReviewedAt=new Date().toISOString();
    fanAsset.candidateCreatedPointIds=[...(record.maintenanceCreatedPointIds||[])];
  }
  return {createdPointIds:record.maintenanceCreatedPointIds||[]};
}
API.open=open;
API.specsFor=specsFor;
API.normalizeActivities=normalizeActivities;
API.applyConfirmedSpecs=applyConfirmedSpecs;
API.applyFanArrangement=applyFanArrangement;
API.removeGeneratedFanArtifacts=removeGeneratedFanArtifacts;
})(window);
