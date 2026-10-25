(function(global){
  'use strict';
  const Core=global.LubricaCore=global.LubricaCore||{},S=Core.DatabaseSchema;
  if(!S)throw new Error('DatabaseSchema must load before DatabaseNormalizer');
  const legacyActivityType=operation=>{
    const key=String(operation||'').trim().toLowerCase();
    const map={
      'досмазывание':'regrease',
      'полная замена смазки':'grease_full_replacement',
      'контроль состояния':'condition_check',
      'нанесение смазки':'lubricant_apply',
      'очистка':'cleaning',
      'контроль натяжения':'tension_check',
      'контроль удлинения':'elongation_check',
      'проверка уровня':'oil_level_check',
      'долив':'oil_topup',
      'долив масла':'oil_topup',
      'замена масла':'oil_change',
      'отбор пробы':'oil_sample',
      'осмотр масла':'oil_inspection',
      'фильтрация':'oil_filter',
      'контроль перепада':'filter_dp_check',
      'замена / фильтрация':'filter_service',
      'замена/фильтрация':'filter_service',
      'осмотр':'inspection',
      'замена':'replacement',
      'смазочное обслуживание':'lubrication_service',
      'осмотр состояния':'state_inspection',
      'проверка поступления смазки':'lubricant_supply_check'
    };
    return map[key]||'custom';
  };
  function normalize(db){
    const base=S.createEmpty(db?.project?.name||'Проект карты смазки');
    const normalized={...base,...S.clone(db),schemaVersion:'2.0',appVersion:db?.appVersion||base.appVersion,meta:{...base.meta,...S.clone(db?.meta||{}),updatedAt:S.now()},project:{...base.project,...S.clone(db?.project||{})},plants:Array.isArray(db?.plants)?db.plants:[],lines:Array.isArray(db?.lines)?db.lines:[],areas:Array.isArray(db?.areas)?db.areas:[],equipment:Array.isArray(db?.equipment)?db.equipment:[],components:Array.isArray(db?.components)?db.components:[],nodes:Array.isArray(db?.nodes)?db.nodes:[],lubricationPoints:Array.isArray(db?.lubricationPoints)?db.lubricationPoints:[],tasks:Array.isArray(db?.tasks)?db.tasks:[],materials:Array.isArray(db?.materials)?db.materials:[],routes:Array.isArray(db?.routes)?db.routes:[],checklistRuns:Array.isArray(db?.checklistRuns)?db.checklistRuns:[],tools:Array.isArray(db?.tools)?db.tools:[],imports:Array.isArray(db?.imports)?db.imports:[],bearingOverrides:Array.isArray(db?.bearingOverrides)?db.bearingOverrides:[],componentLibraryEntries:Array.isArray(db?.componentLibraryEntries)?db.componentLibraryEntries:[]};
    if(!normalized.plants.length&&normalized.lines.length){const plant={id:'PLANT-0001',name:normalized.project?.name||'Завод',code:normalized.project?.code||'',description:normalized.project?.description||'',origin:'migration'};normalized.plants=[plant];normalized.lines=normalized.lines.map(x=>({...x,plantId:x.plantId||plant.id}));}else if(normalized.plants.length){const first=normalized.plants[0],projectName=String(normalized.project?.name||'').trim(),plantName=String(first.name||'').trim();if((!plantName||/^завод$/i.test(plantName))&&projectName&&!/^завод$/i.test(projectName))first.name=projectName;else if((!projectName||/^завод$/i.test(projectName))&&plantName&&!/^завод$/i.test(plantName))normalized.project={...(normalized.project||{}),name:plantName};normalized.lines=normalized.lines.map(x=>({...x,plantId:x.plantId||first.id}));}
    normalized.lubricationPoints=normalized.lubricationPoints.map(lp=>({...lp,category:S.normalizePointCategory(lp.category),status:lp.status==='ready'?'confirmed':lp.status==='issue'?'review':(lp.status||'review'),currentMaterialId:lp.currentMaterialId||null,targetMaterialId:lp.targetMaterialId||null,oemMaterial:lp.oemMaterial||'',materialRationale:lp.materialRationale||'',engineeringSources:{...(lp.engineeringSources||{})},componentBinding:{sourceComponentId:null,sourceEquipmentId:lp.equipmentId||null,libraryCategory:null,libraryEntryId:null,actualLibraryEntryId:null,matchStatus:'unmatched',matchConfidence:0,matchReason:'',structuralText:'',...(lp.componentBinding||{})},calculations:{...(lp.calculations||{})},bearing:lp.category==='bearing'?{structuralDesignation:'',actualDesignation:'',effectiveDesignation:'',baseDesignation:'',d:null,D:null,B:null,bearingType:'unknown',sealing:'unknown',sealingCode:'',clearance:'',cage:'',catalogId:null,sourceType:'none',calculation:{},...(lp.bearing||{}),calculation:{...((lp.bearing||{}).calculation||{})}}:lp.bearing,linearBearing:lp.category==='linear_bearing'?{subtype:'profile_ball',manufacturer:'',model:'',unitCount:1,blockLengthMm:null,strokeMm:null,calculation:{},...(lp.linearBearing||{}),calculation:{...((lp.linearBearing||{}).calculation||{})}}:lp.linearBearing,gearboxOil:lp.category==='gearbox_oil'?{manufacturer:'',model:'',mountingPosition:'',calculation:{},...(lp.gearboxOil||{}),calculation:{...((lp.gearboxOil||{}).calculation||{})}}:lp.gearboxOil,chain:lp.category==='chain'?{chainType:'roller',pitchMm:null,strandCount:1,chainLengthM:null,calculation:{},...(lp.chain||{}),calculation:{...((lp.chain||{}).calculation||{})}}:lp.chain,coupling:lp.category==='coupling'?{couplingType:'gear',manufacturer:'',model:'',sectionCount:1,calculation:{},...(lp.coupling||{}),calculation:{...((lp.coupling||{}).calculation||{})}}:lp.coupling,greasePoint:['guide','joint','bushing','screw'].includes(lp.category)?{calculation:{},...(lp.greasePoint||{}),calculation:{...((lp.greasePoint||{}).calculation||{})}}:lp.greasePoint,ballScrew:lp.category==='ball_screw'?{manufacturer:'',model:'',screwDiameterMm:null,leadMm:null,nutCount:1,nutLengthMm:null,strokeMm:null,calculation:{},...(lp.ballScrew||{}),calculation:{...((lp.ballScrew||{}).calculation||{})}}:lp.ballScrew,oilSystem:lp.category==='oil_system'?{calculation:{},...(lp.oilSystem||{}),calculation:{...((lp.oilSystem||{}).calculation||{})}}:lp.oilSystem,openGear:lp.category==='open_gear'?{calculation:{},...(lp.openGear||{}),calculation:{...((lp.openGear||{}).calculation||{})}}:lp.openGear,wireRope:lp.category==='rope'?{calculation:{},...(lp.wireRope||{}),calculation:{...((lp.wireRope||{}).calculation||{})}}:lp.wireRope,centralLubrication:lp.category==='central_point'?{calculation:{},...(lp.centralLubrication||{}),calculation:{...((lp.centralLubrication||{}).calculation||{})}}:lp.centralLubrication}));
    // Release 1.0.33.54 repair: 1.0.33.47/48 could reduce the exact sealed SKF
    // BS2-2208-2CS/VT143 source component to a generic unresolved `2208` point.
    // Repair only the narrow evidence-backed case: unresolved 2208 with empty dimensions
    // whose bound imported component is exactly BS2-2208-2CS/VT143. Generic 2208 is untouched.
    const componentByIdForBearingRepair=new Map((normalized.components||[]).map(c=>[String(c.id),c]));
    for(const lp of normalized.lubricationPoints||[]){
      if(lp?.category!=='bearing'||!lp.bearing)continue;
      const b=lp.bearing,eff=String(b.effectiveDesignation||b.baseDesignation||b.structuralDesignation||'').replace(/\s+/g,'').toUpperCase();
      if(eff!=='2208'||b.d!=null||b.D!=null||b.B!=null)continue;
      const src=componentByIdForBearingRepair.get(String(lp.componentBinding?.sourceComponentId||''));
      const evidence=`${src?.name||''} ${lp.componentBinding?.structuralText||''}`.toUpperCase();
      if(!evidence.includes('BS2-2208-2CS/VT143'))continue;
      Object.assign(b,{structuralDesignation:'BS2-2208-2CS/VT143',effectiveDesignation:'BS2-2208-2CS/VT143',baseDesignation:'BS2-2208-2CS/VT143',d:40,D:80,B:28,bearingType:'spherical_roller',sealing:'sealed',sealingCode:'2CS',catalogId:'BRG-SKF-BS2-2208-2CS-VT143',sourceType:'builtin',greaseCode:'VT143',maintenancePolicy:'sealed_greased_for_life_default',migratedFromDesignation:'2208',migratedBy:'1.0.33.54-bs2-exact-repair'});
      lp.componentBinding={...(lp.componentBinding||{}),libraryCategory:'bearing',libraryEntryId:'BRG-SKF-BS2-2208-2CS-VT143',actualLibraryEntryId:'BRG-SKF-BS2-2208-2CS-VT143',matchStatus:'matched',matchConfidence:1,matchReason:'Точная фактическая маркировка BS2-2208-2CS/VT143 восстановлена из привязанного импортированного ТМЦ.'};
    }
    // Release 1.0.7 repair: older candidate confirmation created one duplicate node per point
    // for a single imported component. Merge only strict candidate-origin duplicates that belong
    // to the same component candidate, same equipment and same node name.
    const componentNodeGroups=new Map();
    for(const node of normalized.nodes){
      const m=String(node?.candidateOriginKey||'').match(/^(component:[^:]+):/);
      if(!m||node?.origin!=='candidate')continue;
      const key=`${m[1]}|${node.equipmentId||''}|${String(node.name||'').trim().toLowerCase()}`;
      if(!componentNodeGroups.has(key))componentNodeGroups.set(key,[]);
      componentNodeGroups.get(key).push(node);
    }
    const removeNodeIds=new Set();
    for(const group of componentNodeGroups.values()){
      if(group.length<2)continue;
      const keeper=group[0];
      const originBase=String(keeper.candidateOriginKey||'').match(/^(component:[^:]+):/)?.[1];
      if(originBase)keeper.candidateOriginKey=`${originBase}:node`;
      for(const duplicate of group.slice(1)){
        for(const lp of normalized.lubricationPoints)if(lp.nodeId===duplicate.id)lp.nodeId=keeper.id;
        removeNodeIds.add(duplicate.id);
      }
    }
    if(removeNodeIds.size)normalized.nodes=normalized.nodes.filter(n=>!removeNodeIds.has(n.id));

    // Release 1.0.28.7 repair: older 1.0.28.x databases could have a saved
    // fanBearingArrangement on the parent equipment while the same physical Fan Asset
    // component still stayed in the Candidates queue as `equipment`. Synchronize only
    // the exact component referenced by the saved arrangement. Motor Asset is not touched.
    const componentsById=new Map((normalized.components||[]).map(c=>[c.id,c]));
    for(const equipment of normalized.equipment||[]){
      const fanAssetId=equipment?.fanBearingArrangement?.fanAssetComponentId;
      if(!fanAssetId)continue;
      const fanAsset=componentsById.get(fanAssetId);
      if(!fanAsset)continue;
      if(fanAsset.candidateEquipmentType==='fan'||/вентилятор|дымосос/i.test(String(fanAsset.name||''))){
        fanAsset.candidateState='confirmed';
        fanAsset.candidateReviewedAt=fanAsset.candidateReviewedAt||equipment.maintenanceReviewedAt||S.now();
        if(!Array.isArray(fanAsset.candidateCreatedPointIds))fanAsset.candidateCreatedPointIds=[...(equipment.maintenanceCreatedPointIds||[])];
      }
    }

    const canonicalTaskActivity=t=>{const raw=String(t?.activityType||'').trim();if(raw==='relubrication')return'regrease';return raw||legacyActivityType(t?.operation);};
    const materialRequiredActivities=new Set(['regrease','grease_full_replacement','lubricant_apply','oil_topup','oil_change','lubrication_service']);
    const pointById=new Map((normalized.lubricationPoints||[]).map(lp=>[String(lp.id),lp]));
    normalized.tasks=normalized.tasks.map(t=>{const activityType=canonicalTaskActivity(t);let materialMode=t.materialMode||((t.materialId||t.materialName)?'explicit':'point_target');if(materialRequiredActivities.has(activityType)&&materialMode==='none'){const lp=pointById.get(String(t.lubricationPointId||''));materialMode=lp?.targetMaterialId?'point_target':'explicit';}return {...t,activityType,materialMode,toolId:t.toolId||null,approvalStatus:S.normalizeTaskApproval(t.approvalStatus,t.verified)};});
    // Release 1.0.33.23 repair: 1.0.33.22 Rotating Arrangement used the temporary
    // activityType `relubrication` while the canonical bearing workflow uses `regrease`.
    // If both exist on the same lubrication point, merge only this known alias pair.
    // Do not merge ordinary same-type events because multiple events per point are valid.
    const originalTasks=Array.isArray(db?.tasks)?db.tasks:[];
    const hadRelubricationIds=new Set(originalTasks.filter(t=>String(t?.activityType||'').trim()==='relubrication').map(t=>String(t.id)));
    const removeTaskIds=new Set(),replacementByOldId=new Map();
    const isFilled=v=>v!=null&&String(v).trim()!=='';
    const taskScore=t=>{let n=0;if(t?.origin==='calculation')n+=8;if(t?.approvalStatus==='approved'||t?.verified)n+=5;if(isFilled(t?.quantity?.approved))n+=4;if(t?.quantity?.calculated!=null)n+=3;if(t?.quantity?.source)n+=2;if(t?.schedule?.approvedHours!=null||t?.schedule?.runtimeHours!=null||t?.schedule?.calculatedHours!=null)n+=4;if(t?.schedule?.source)n+=2;if(t?.materialId||t?.materialName)n+=1;if(t?.toolId)n+=1;return n;};
    const mergeTaskData=(keeper,other)=>{
      keeper.activityType='regrease';keeper.operation=keeper.operation||other.operation||'Досмазывание';
      keeper.materialMode=(keeper.materialMode&&keeper.materialMode!=='none')?keeper.materialMode:((other.materialMode&&other.materialMode!=='none')?other.materialMode:'explicit');keeper.materialId=keeper.materialId??other.materialId??null;keeper.materialName=keeper.materialName||other.materialName||'';keeper.toolId=keeper.toolId??other.toolId??null;
      keeper.quantity={...(other.quantity||{}),...(keeper.quantity||{})};
      for(const k of Object.keys(other.quantity||{}))if(!isFilled(keeper.quantity?.[k])&&isFilled(other.quantity?.[k]))keeper.quantity[k]=other.quantity[k];
      keeper.schedule={...(other.schedule||{}),...(keeper.schedule||{})};
      for(const k of Object.keys(other.schedule||{}))if(!isFilled(keeper.schedule?.[k])&&isFilled(other.schedule?.[k]))keeper.schedule[k]=other.schedule[k];
      if(keeper.approvalStatus!=='approved'&&other.approvalStatus==='approved'){keeper.approvalStatus='approved';keeper.verified=true;}
      keeper.source=keeper.source||other.source||'';keeper.origin=keeper.origin||other.origin||'';keeper.mergedLegacyTaskIds=Array.from(new Set([...(keeper.mergedLegacyTaskIds||[]),...(other.mergedLegacyTaskIds||[]),String(other.id)]));
    };
    const byPoint=new Map();for(const t of normalized.tasks){const k=String(t.lubricationPointId||'');if(!byPoint.has(k))byPoint.set(k,[]);byPoint.get(k).push(t);}
    for(const same of byPoint.values()){
      const aliases=same.filter(t=>hadRelubricationIds.has(String(t.id)));if(!aliases.length)continue;
      for(const alias of aliases){
        const candidates=same.filter(t=>t!==alias&&!removeTaskIds.has(String(t.id))&&t.activityType==='regrease');
        if(!candidates.length){alias.activityType='regrease';alias.operation='Досмазывание';continue;}
        const canonical=candidates.sort((a,b)=>taskScore(b)-taskScore(a))[0];
        const keeper=taskScore(canonical)>=taskScore(alias)?canonical:alias;const other=keeper===canonical?alias:canonical;
        mergeTaskData(keeper,other);removeTaskIds.add(String(other.id));replacementByOldId.set(String(other.id),String(keeper.id));
      }
    }
    if(removeTaskIds.size){
      normalized.tasks=normalized.tasks.filter(t=>!removeTaskIds.has(String(t.id)));
      const remap=id=>{let k=String(id);while(replacementByOldId.has(k))k=replacementByOldId.get(k);return k;};
      for(const r of normalized.routes||[]){r.taskIds=Array.from(new Set((r.taskIds||[]).map(remap)));r.excludedTaskIds=Array.from(new Set((r.excludedTaskIds||[]).map(remap)));}
      for(const run of normalized.checklistRuns||[]){if(run?.taskId&&replacementByOldId.has(String(run.taskId)))run.taskId=remap(run.taskId);if(run?.results&&typeof run.results==='object'){for(const [oldId,newId0] of replacementByOldId){const newId=remap(newId0);if(Object.prototype.hasOwnProperty.call(run.results,oldId)){if(!Object.prototype.hasOwnProperty.call(run.results,newId))run.results[newId]=run.results[oldId];delete run.results[oldId];}}}}
    }
    // Release 1.0.33.25 repair: non-bearing calculators store their result on the
    // lubrication point, but older chain/gearbox adapters did not always project that
    // result back to the task. Repair existing databases so Map/Task cards receive
    // calculated quantity and an actual schedule without requiring a second save.
    for(const task of normalized.tasks||[]){
      const lp=pointById.get(String(task.lubricationPointId||''));if(!lp)continue;
      if(lp.category==='chain'&&(task.activityType==='lubricant_apply'||String(task.operation||'').trim().toLowerCase()==='нанесение смазки')&&lp.chain?.calculation?.calculatedAt){
        const cc=lp.chain.calculation,approvedMl=cc.approvedVolumeMl,approvedG=cc.approvedMassG;
        if(approvedMl!=null)task.quantity={...(task.quantity||{}),calculated:cc.calculatedVolumeMl??null,calculatedGrams:cc.calculatedMassG??null,approved:String(approvedMl),unit:'мл',source:cc.quantitySource||task.quantity?.source||''};
        else if(approvedG!=null)task.quantity={...(task.quantity||{}),calculated:cc.calculatedMassG??null,approved:String(approvedG),unit:'г',source:cc.quantitySource||task.quantity?.source||''};
        else task.quantity={...(task.quantity||{}),calculated:cc.calculatedVolumeMl??task.quantity?.calculated??null,calculatedGrams:cc.calculatedMassG??task.quantity?.calculatedGrams??null,unit:task.quantity?.unit||'мл',source:cc.quantitySource||task.quantity?.source||''};
        const hours=cc.approvedHours??cc.calculatedInterval?.hours??null,days=cc.approvedDays??cc.calculatedInterval?.days??null;task.schedule={...(task.schedule||{}),calculatedHours:cc.calculatedInterval?.hours??null,calculatedDays:cc.calculatedInterval?.days??null,calculatedMachineCycles:cc.calculatedInterval?.machineCycles??null,approvedHours:cc.approvedHours??null,approvedDays:cc.approvedDays??null,approvedMachineCycles:cc.approvedMachineCycles??null,rule:cc.calculatedInterval?.rule||task.schedule?.rule||'unspecified',source:cc.intervalSource||task.schedule?.source||''};
        if(hours!=null){task.schedule.strategy='По наработке';task.schedule.runtimeHours=Number(hours);task.schedule.runtimeUnit='hours';task.schedule.legacyText=`${hours} ч`;task.schedule.calendarValue=null;task.schedule.calendarUnit=null;}else if(days!=null){task.schedule.strategy='По календарю';task.schedule.calendarValue=Number(days);task.schedule.calendarUnit='days';task.schedule.legacyText=`${days} дн.`;task.schedule.runtimeHours=null;task.schedule.runtimeUnit=null;}
      }
      if(lp.category==='gearbox_oil'&&lp.gearboxOil?.calculation?.calculatedAt){
        const gc=lp.gearboxOil.calculation,a=String(task.activityType||legacyActivityType(task.operation));
        if(gc.approvedFillLiters==null&&gc.effectiveFillLiters!=null){gc.approvedFillLiters=gc.effectiveFillLiters;gc.appliedFillLiters=gc.effectiveFillLiters;gc.appliedAt=gc.appliedAt||gc.calculatedAt;}
        if(a==='oil_change'){task.quantity={...(task.quantity||{}),calculated:gc.effectiveFillLiters??task.quantity?.calculated??null,approved:gc.approvedFillLiters!=null?String(gc.approvedFillLiters):(task.quantity?.approved||''),unit:'л',source:gc.fillSource||task.quantity?.source||''};task.schedule={...(task.schedule||{}),firstChangeHours:gc.firstChangeHours??null,calculatedHours:gc.changeHours??null,calculatedCalendarMonths:gc.changeMonths??null,conditionBased:!!gc.conditionBased,rule:gc.interval?.rule||task.schedule?.rule||'unspecified',source:gc.intervalSource||task.schedule?.source||''};const h=gc.changeHours??null,m=gc.changeMonths??null;if(h!=null){task.schedule.strategy='По наработке';task.schedule.runtimeHours=Number(h);task.schedule.runtimeUnit='hours';task.schedule.legacyText=`${h} ч`;task.schedule.calendarValue=null;task.schedule.calendarUnit=null;}else if(m!=null){task.schedule.strategy='По календарю';task.schedule.calendarValue=Number(m);task.schedule.calendarUnit='months';task.schedule.legacyText=`${m} мес.`;task.schedule.runtimeHours=null;task.schedule.runtimeUnit=null;}}
        else if(a==='oil_topup')task.quantity={...(task.quantity||{}),calculated:gc.topupLiters??task.quantity?.calculated??null,approved:gc.topupLiters!=null?String(gc.topupLiters):(task.quantity?.approved||''),unit:'л',source:gc.fillSource||task.quantity?.source||''};
      }
    }
    normalized.bearingOverrides=normalized.bearingOverrides.map((b,i)=>({...b,id:b.id||`BRGU-${String(i+1).padStart(5,'0')}`,designation:String(b.designation||'').trim().toUpperCase(),d:Number(b.d)||0,D:Number(b.D)||0,B:Number(b.B)||0,source:b.source||'user_override'}));
    normalized.materials=normalized.materials.map((m,i)=>({id:m.id||`MAT-${String(i+1).padStart(4,'0')}`,code:m.code||`MAT-${String(i+1).padStart(3,'0')}`,name:m.name||'Материал',kind:m.kind||'Пластичная смазка',color:m.color||'#e6a42a',approved:m.approved!==false,...m}));
    normalized.tools=normalized.tools.map((t,i)=>({id:t.id||`TOOL-${String(i+1).padStart(4,'0')}`,code:t.code||`TL-${String(i+1).padStart(3,'0')}`,name:t.name||'Инструмент',type:t.type||'grease_gun',materialId:t.materialId||null,gramsPerStroke:Number(t.gramsPerStroke)||0,calibrationDate:t.calibrationDate||'',status:t.status||'active',...t}));
    normalized.routes=normalized.routes.map((r,i)=>({id:r.id||`М-${String(i+1).padStart(3,'0')}`,code:r.code||'',name:r.name||'',description:r.description||'',lineId:r.lineId||'',areaId:r.areaId||'',lineName:r.lineName||'',areaName:r.areaName||'',interval:r.interval||'',intervalMode:r.intervalMode||'fixed',routeType:r.routeType||'lubrication',sequenceMode:r.sequenceMode||'manual',taskIds:Array.isArray(r.taskIds)?r.taskIds.map(String):[],excludedTaskIds:Array.isArray(r.excludedTaskIds)?r.excludedTaskIds.map(String):[],assignee:r.assignee||'Смазчик',estimatedMinutesPerTask:Number(r.estimatedMinutesPerTask)||5,fixedMinutes:Number(r.fixedMinutes)||10,status:r.status||'active',source:r.source||'auto',createdAt:r.createdAt||S.now(),updatedAt:r.updatedAt||S.now(),...r}));
    return normalized;
  }
  Core.DatabaseNormalizer=Object.freeze({normalize});
})(window);
