(function(global){
'use strict';
const C=global.LubricaStructureContext;
const T=global.LubricaStructureTree=global.LubricaStructureTree||{};
  function counts(d){return {plant:(d.plants||[]).length,line:d.lines.length,area:d.areas.length,equipment:d.equipment.length,node:d.nodes.length,lubricationPoint:d.lubricationPoints.length,task:d.tasks.length}}
  function renderSummary(d){const c=counts(d);const el=document.getElementById('structureSummary');if(!el)return;el.innerHTML=[['Линии',c.line],['Участки',c.area],['Оборудование',c.equipment],['Узлы',c.node],['Точки смазки',c.lubricationPoint],['Мероприятия',c.task]].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}
  function match(text,q){return !q||String(text||'').toLowerCase().includes(q)}
  function renderTree(d){
    const root=document.getElementById('structureTree');if(!root)return;
    const q=(document.getElementById('structureSearch')?.value||'').trim().toLowerCase();
    const visibleEquipment=global.LubricaLubricationDomainCleanup?.getVisibleEquipmentSet?.(d)||new Set((d.equipment||[]).map(e=>String(e.id)));
    const equipmentVisible=e=>visibleEquipment.has(String(e.id));
    const tasksByLp=new Map();d.tasks.forEach(t=>{if(!tasksByLp.has(t.lubricationPointId))tasksByLp.set(t.lubricationPointId,[]);tasksByLp.get(t.lubricationPointId).push(t)});
    const lpByNode=new Map(),lpByEq=new Map();d.lubricationPoints.forEach(lp=>{const map=lp.nodeId?lpByNode:lpByEq,key=lp.nodeId||lp.equipmentId;if(!map.has(key))map.set(key,[]);map.get(key).push(lp)});
    const nodesByParent=new Map();d.nodes.forEach(n=>{const key=n.parentNodeId||`EQ:${n.equipmentId}`;if(!nodesByParent.has(key))nodesByParent.set(key,[]);nodesByParent.get(key).push(n)});
    const eqByArea=new Map(),eqByParent=new Map();d.equipment.filter(e=>equipmentVisible(e)).forEach(e=>{if(e.parentEquipmentId){if(!eqByParent.has(e.parentEquipmentId))eqByParent.set(e.parentEquipmentId,[]);eqByParent.get(e.parentEquipmentId).push(e)}else{const key=e.areaId||`LINE:${e.lineId}`;if(!eqByArea.has(key))eqByArea.set(key,[]);eqByArea.get(key).push(e)}});
    const linesByPlant=new Map();d.lines.forEach(l=>{const key=l.plantId||'NO_PLANT';if(!linesByPlant.has(key))linesByPlant.set(key,[]);linesByPlant.get(key).push(l)});
    const areasByLine=new Map();d.areas.forEach(a=>{if(!areasByLine.has(a.lineId))areasByLine.set(a.lineId,[]);areasByLine.get(a.lineId).push(a)});
    const keyOf=(type,id)=>`${type}:${id}`;
    const isOpen=(type,id)=>q||C.expandedKeys.has(keyOf(type,id));
    function row(type,item,depth,sub='',right='',hasChildren=false){
      const active=C.selected.type===type&&C.selected.id===item.id?' C.selected':'';
      const open=hasChildren&&isOpen(type,item.id);
      const toggle=hasChildren?`<button type="button" class="structure-toggle" data-toggle-type="${type}" data-toggle-id="${C.esc(item.id)}" aria-label="${open?'Свернуть':'Развернуть'}">${open?'−':'+'}</button>`:'<span class="structure-toggle-spacer"></span>';
      return `<div class="structure-row-wrap" style="--depth:${depth}">${toggle}<button class="structure-row structure-${type}${active}" data-type="${type}" data-id="${C.esc(item.id)}"><span class="structure-ico">${C.icons[type]}</span><span><b>${C.esc(item.name||item.operation||item.id)}</b>${sub?`<small>${C.esc(sub)}</small>`:''}</span>${right?`<em>${C.esc(right)}</em>`:'<em></em>'}</button></div>`;
    }
    function renderLp(lp,depth){
      const tasks=tasksByLp.get(lp.id)||[];
      const categoryLabel=C.pointContextLabel(d,lp);
      const pointRef=lp.legacyId?`Точка смазки · ${lp.legacyId}`:`Точка смазки · ${lp.id}`;
      const pointName=lp.name||categoryLabel;
      const pointSub=categoryLabel&&categoryLabel!==pointName?`${categoryLabel} · ${pointRef}`:pointRef;
      let html=row('lubricationPoint',{...lp,name:pointName},depth,pointSub,tasks.length?`${tasks.length} мер.`:'',tasks.length>0);
      if(isOpen('lubricationPoint',lp.id))for(const t of tasks)html+=row('task',{...t,name:t.operation||'Мероприятие'},depth+1,'Мероприятие',t.schedule?.legacyText||'',false);
      return html
    }
    function renderNode(n,depth){
      const lps=lpByNode.get(n.id)||[],children=nodesByParent.get(n.id)||[];
      const has=lps.length>0||children.length>0;
      let html=row('node',n,depth,n.componentDesignation?`Узел · ${n.componentDesignation}`:'Узел','',has);
      if(isOpen('node',n.id)){
        for(const lp of lps)html+=renderLp(lp,depth+1);
        for(const ch of children)html+=renderNode(ch,depth+1);
      }
      return html
    }
    function renderComponentAsset(component,depth,role,nodes=[],lps=[],children=[]){
      if(!component)return '';
      const has=nodes.length>0||lps.length>0||children.length>0;
      const asset={...component,name:component.name||component.id};
      let html=row('component',asset,depth,role,component.externalCode||'',has);
      if(isOpen('component',component.id)){
        for(const ch of children)html+=renderEquipment(ch,depth+1);
        for(const lp of lps)html+=renderLp(lp,depth+1);
        for(const n of nodes)html+=renderNode(n,depth+1);
      }
      return html;
    }
    function renderEquipment(e,depth){
      const lps=lpByEq.get(e.id)||[],nodes=nodesByParent.get(`EQ:${e.id}`)||[],children=eqByParent.get(e.id)||[];
      const isFan=e.equipmentType==='fan'||e.maintenanceEquipmentType==='fan';
      const isMotor=e.equipmentType==='motor'||e.maintenanceEquipmentType==='motor';
      if(isMotor&&!isFan){
        const generatedMotorNodes=nodes.filter(n=>String(n.candidateOriginKey||'').startsWith(`equipment:${e.id}:`));
        const generatedNodeIds=new Set(generatedMotorNodes.map(n=>n.id));
        const flat=[...lps];for(const n of generatedMotorNodes)for(const lp of (lpByNode.get(n.id)||[]))if(!flat.some(x=>x.id===lp.id))flat.push(lp);
        const otherNodes=nodes.filter(n=>!generatedNodeIds.has(n.id));
        const hasMotor=flat.length>0||otherNodes.length>0||children.length>0;
        let motorHtml=row('equipment',e,depth,'Оборудование',e.externalCode||'',hasMotor);
        if(isOpen('equipment',e.id)){for(const ch of children)motorHtml+=renderEquipment(ch,depth+1);for(const lp of flat)motorHtml+=renderLp(lp,depth+1);for(const n of otherNodes)motorHtml+=renderNode(n,depth+1)}
        return motorHtml;
      }
      const assets=isFan?global.LubricaFanBearingArrangement?.identifyAssets?.(d,e):null;
      const fanComp=assets?.fan||null,motorComp=assets?.motor||null;
      const hideFanAsset=isFan&&global.LubricaFanBearingArrangement?.shouldHideFanAsset?.(e);
      const fanNodePrefix=`equipment:${e.id}:fan_housing_`;
      const motorNodePrefix=motorComp?`component:${motorComp.id}:`:'';
      const fanNodes=fanComp?nodes.filter(n=>String(n.candidateOriginKey||'').startsWith(fanNodePrefix)):[];
      const motorNodes=motorComp?nodes.filter(n=>String(n.candidateOriginKey||'').startsWith(motorNodePrefix)):[];
      // Старый candidate-finalizer создавал под Motor Asset одноимённый технический node
      // (component:<id>:node). В рабочем дереве это визуально дублировало двигатель.
      // Данные и ID узла/точек не меняем: схлопываем только presentation-layer.
      const redundantMotorNodes=motorComp?motorNodes.filter(n=>String(n.candidateOriginKey||'')===`component:${motorComp.id}:node`&&String(n.name||'').trim()===String(motorComp.name||'').trim()):[];
      const visibleMotorNodes=motorNodes.filter(n=>!redundantMotorNodes.some(r=>r.id===n.id));
      const groupedNodeIds=new Set([...fanNodes,...motorNodes].map(n=>n.id));
      const otherNodes=nodes.filter(n=>!groupedNodeIds.has(n.id));
      const fanLps=fanComp?lps.filter(lp=>lp.componentBinding?.sourceComponentId===fanComp.id):[];
      const directMotorLps=motorComp?lps.filter(lp=>lp.componentBinding?.sourceComponentId===motorComp.id):[];
      const flattenedMotorLps=motorComp?redundantMotorNodes.flatMap(n=>(lpByNode.get(n.id)||[]).filter(lp=>lp.componentBinding?.sourceComponentId===motorComp.id)):[];
      const motorLps=[...directMotorLps,...flattenedMotorLps.filter(lp=>!directMotorLps.some(x=>x.id===lp.id))];
      const groupedLpIds=new Set([...fanLps,...motorLps].map(lp=>lp.id));
      const otherLps=lps.filter(lp=>!groupedLpIds.has(lp.id));
      const hasFanAssets=!!(fanComp||motorComp);
      const has=otherLps.length>0||otherNodes.length>0||children.length>0||hasFanAssets;
      const subtype=e.lubricationDomainStatus==='STRUCTURE_ONLY'?'Структурный контейнер':(e.importedType==='system_group'?'Группа оборудования':'Оборудование');
      let html=row('equipment',e,depth,subtype,e.externalCode||'',has);
      if(isOpen('equipment',e.id)){
        if(hasFanAssets){
          // Для карты смазок показываем только сам вентилятор и электродвигатель из ТМЦ.
          // Подшипниковая схема Fan Engine относится к физическому вентилятору, а не к раме и не к позиции целиком.
          if(fanComp&&!hideFanAsset)html+=renderComponentAsset(fanComp,depth+1,'Сам вентилятор',fanNodes,fanLps,children);
          else if(!fanComp&&!hideFanAsset)for(const ch of children)html+=renderEquipment(ch,depth+1);
          if(motorComp)html+=renderComponentAsset(motorComp,depth+1,'Электродвигатель',visibleMotorNodes,motorLps,[]);
        }else{
          for(const ch of children)html+=renderEquipment(ch,depth+1);
        }
        for(const lp of otherLps)html+=renderLp(lp,depth+1);
        for(const n of otherNodes)html+=renderNode(n,depth+1);
      }
      return html
    }
    function renderArea(area,depth){
      const eqs=eqByArea.get(area.id)||[];
      let html=row('area',area,depth,'Участок',area.code||'',eqs.length>0);
      if(isOpen('area',area.id))for(const e of eqs)html+=renderEquipment(e,depth+1);
      return html
    }
    function renderLine(line,depth){
      const areas=areasByLine.get(line.id)||[],direct=eqByArea.get(`LINE:${line.id}`)||[];
      const has=areas.length>0||direct.length>0;
      let html=row('line',line,depth,'Линия',line.code||'',has);
      if(isOpen('line',line.id)){
        for(const area of areas)html+=renderArea(area,depth+1);
        for(const e of direct)html+=renderEquipment(e,depth+1);
      }
      return html
    }
    function renderPlant(plant){
      const lines=linesByPlant.get(plant.id)||[];
      let html=row('plant',plant,0,'Завод',plant.code||'',lines.length>0);
      if(isOpen('plant',plant.id))for(const line of lines)html+=renderLine(line,1);
      return html;
    }
    let html='';
    for(const plant of (d.plants||[])){
      const block=renderPlant(plant);
      if(!q||block.toLowerCase().includes(q))html+=`<div class="structure-branch">${block}</div>`;
    }
    const orphanLines=linesByPlant.get('NO_PLANT')||[];
    for(const line of orphanLines){const block=renderLine(line,0);if(!q||block.toLowerCase().includes(q))html+=`<div class="structure-branch">${block}</div>`;}
    if(!html)html='<div class="structure-empty"><b>Структура пока пустая</b><span>Нажмите «Добавить» и создайте завод. После этого добавляйте линии.</span></div>';
    root.innerHTML=html;
    root.querySelectorAll('.structure-row').forEach(b=>b.onclick=()=>{C.selected={type:b.dataset.type,id:b.dataset.id};renderTree(d);global.LubricaStructureDetail?.render?.(d)});
    root.querySelectorAll('.structure-toggle').forEach(btn=>btn.onclick=e=>{
      e.stopPropagation();
      const k=keyOf(btn.dataset.toggleType,btn.dataset.toggleId);
      C.expandedKeys.has(k)?C.expandedKeys.delete(k):C.expandedKeys.add(k);
      renderTree(d);
    });
    const expandBtn=document.getElementById('structureExpandBtn');
    if(expandBtn)expandBtn.textContent=C.expandedKeys.size?'Свернуть всё':'Развернуть всё';
  }

T.renderSummary=renderSummary;T.renderTree=renderTree;
})(window);
