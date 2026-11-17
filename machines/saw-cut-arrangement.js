(function(global){
'use strict';
// Stage 5D: saw/cut/traverse evidence-based family constructor.
// It reuses the standard point/task finalizer. No inferred shaft, bearing,
// DE/NDE, linear slide, chain circuit, OEM dose or approval is created.
const API=global.LubricaSawCutArrangement=global.LubricaSawCutArrangement||{};
const Core=global.LubricaCore;
const arr=x=>Array.isArray(x)?x:[];
const clean=x=>String(x??'').trim();
const norm=x=>clean(x).toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ');
const esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const byId=(a,id)=>arr(a).find(x=>String(x.id)===String(id));
const sawName=/^(?:пил[аы](?:\s|$)|каретк[аи](?:\s|$)|устройств[оа] режущ|колесо\s*№?\d+\s*пил|система\s+(?:поперечной|продольной)\s+резки|система поперечного перемещения пил|рама кареток)/i;
const excludedName=/центрифуг|охлаждени|охлажден|маслораспылител|маслян.*туман/i;
const sealedName=/(?:2rs1?|2rsh|2rsl|2cs|2rz|2z|zz|llu)(?:\b|[-/])/i;
const dryLinear=/\bigus\b|\bdrylin\b|\boilamid\b/i;
function excludedContext(db,e){
 const seen=new Set();let x=e;
 while(x&&!seen.has(String(x.id))){
  if(excludedName.test(norm(x.name)))return true;
  seen.add(String(x.id));x=byId(db.equipment,x.parentEquipmentId);
 }
 return false;
}
function isSaw(e){
 return !!e&&e.equipmentType!=='conveyor'&&!/конвейер|заслонка|система охлаждения/i.test(clean(e.name))&&sawName.test(clean(e.name));
}
function isGroup(e,children){
 return children.length>0&&(/^(?:пилы|система поперечной резки|система продольной резки|система поперечного перемещения пил|рама кареток)/i.test(clean(e.name)));
}
function descendants(db,root){
 const all=arr(db.equipment),seen=new Set(),out=[],queue=[root];
 while(queue.length){const e=queue.shift();if(!e||seen.has(e.id))continue;seen.add(e.id);out.push(e);
  for(const child of all)if(child.parentEquipmentId===e.id)queue.push(child);
 }
 return out;
}
function classification(c){
 const name=norm(c.name),category=clean(c.candidateCategory);
 if(category==='bearing')return'bearing';
 if(category==='linear_bearing')return'linear_bearing';
 if(category==='chain')return'chain';
 if(category==='guide')return'guide';
 if(category==='screw'||category==='ball_screw')return'screw';
 if(/^(вал|ось|барабан|ролик|шпиндель)(?:\s|$)/.test(name)||c.candidateEquipmentType==='rotating_shaft')return'shaft';
 if(['motor','motor_gearbox','gearbox'].includes(c.candidateEquipmentType)||/мотор[- ]?редуктор|электродвигател|^редуктор\b/.test(name))return'drive';
 if(/подшипник|подшипников.*узел/.test(name))return'bearing_unclassified';
 return'context';
}
function linkedPoints(db,c){
 const id=String(c.id),indexed=new Set(arr(c.candidateCreatedPointIds).map(String));
 return arr(db.lubricationPoints).filter(p=>indexed.has(String(p.id))||
   String(p.componentBinding?.sourceComponentId||p.installedComponent?.id||'')===id||
   String(p.candidateOriginKey||'').startsWith('component:'+id+':'));
}
function inventory(db,equipmentId){
 const root=byId(db?.equipment,equipmentId);
 if(!root||!isSaw(root)||excludedContext(db,root))return null;
 const tree=descendants(db,root).filter(e=>!excludedContext(db,e));
 const ids=new Set(tree.map(e=>String(e.id)));
 const rows=arr(db.components).filter(c=>ids.has(String(c.equipmentId))&&c.status!=='retired').map(c=>{
  const category=classification(c),points=linkedPoints(db,c);
  const excluded=['excluded','rejected'].includes(c.candidateState);
  const sealed=sealedName.test(c.name||''),dry=dryLinear.test((c.manufacturer||'')+' '+(c.name||''));
  return {id:c.id,sourceCode:c.externalCode||c.id,name:c.name,ownerId:c.equipmentId,
   ownerName:byId(tree,c.equipmentId)?.name||'',category,state:c.candidateState||'unclassified',
   excluded,sealed,dry,existingPointIds:Array.from(new Set(points.map(p=>p.id))),
   canCreate:['bearing','linear_bearing'].includes(category)&&!excluded&&!sealed&&!dry};
 });
 const children=tree.filter(e=>e.id!==root.id);
 const kinds={};for(const r of rows)kinds[r.category]=(kinds[r.category]||0)+1;
 return {root,tree,children,isGroup:isGroup(root,children),rows,kinds,
  sourceCount:rows.length,existingPoints:new Set(rows.flatMap(r=>r.existingPointIds)).size,
  saved:root.sawCutSurvey||null};
}
function otherSourcePoint(db,sourceId,location,originKey){
 return arr(db.lubricationPoints).some(p=>{
  if(p.candidateOriginKey===originKey)return false;
  const match=String(p.componentBinding?.sourceComponentId||p.installedComponent?.id||'')===String(sourceId)||
    String(p.candidateOriginKey||'').startsWith('component:'+sourceId+':');
  if(!match)return false;
  // Legacy point without physical location is ambiguous: do not add another.
  const prior=norm(p.serviceLocationName||p.positionLabel||p.name);
  return !prior||prior===norm(location)||!String(p.candidateOriginKey||'').includes(':saw_position_');
 });
}
function preview(db,equipmentId,payload){
 const ev=inventory(db,equipmentId),errors=[],warnings=[],positions=arr(payload?.positions);
 if(!ev)return {allowed:false,errors:['Пилорама или каретка не найдена / исключена'],warnings,selectedCount:0};
 if(ev.isGroup&&positions.length)errors.push('Группу пил нельзя превращать в точку: выберите конкретную дочернюю машину');
 if(positions.length>100)errors.push('Слишком много физических мест за один проход');
 const ids=new Set(),places=new Set();let selectedCount=0;
 for(const [i,p] of positions.entries()){
  const pid=clean(p.positionId),sid=clean(p.sourceId),location=clean(p.location),state=clean(p.state)||'review';
  const key=pid+'|'+sid,where=sid+'|'+norm(location);
  if(!pid||ids.has(pid))errors.push('Дублирован или отсутствует ID физической позиции '+(i+1));
  ids.add(pid);
  if(!['review','serviceable','not_serviceable'].includes(state))errors.push('Некорректное состояние позиции '+(i+1));
  if(state==='serviceable'){
   selectedCount++;
   const row=ev.rows.find(r=>String(r.id)===sid);
   if(!row||!row.canCreate)errors.push('Нет подходящего обслуживаемого ТМЦ для позиции '+(i+1));
   if(!location)errors.push('Не указано реальное физическое место '+(i+1));
   if(p.accessConfirmed!==true)errors.push('Не подтверждён канал/маслёнка и доступ: '+(location||i+1));
   if(row?.category==='linear_bearing'&&p.oemConfirmed!==true)errors.push('Для линейного узла нужен подтверждённый OEM-порядок обслуживания: '+(location||i+1));
   if(places.has(where))errors.push('Повторно выбрано то же физическое место '+location);
   places.add(where);
   if(row&&otherSourcePoint(db,sid,location,'component:'+sid+':saw_position_'+pid))errors.push('По ТМЦ уже существует точка с этим местом или неуточнённой позицией: '+location);
  }
  if(state==='not_serviceable'&&!clean(payload?.sourceReference))errors.push('Для решения «не обслуживается» нужен паспорт или акт осмотра');
 }
 // Existing physical point IDs are immutable. A new survey must carry them
 // forward explicitly; legacy points are never silently replaced.
 for(const prior of arr(ev.saved?.positions).filter(p=>p.state==='serviceable')){
  const point=arr(db.lubricationPoints).find(p=>
   String(p.candidateOriginKey||'')==='component:'+prior.sourceId+':saw_position_'+prior.positionId);
  if(!point)continue;
  const unchanged=positions.some(p=>String(p.positionId)===String(prior.positionId)&&
   String(p.sourceId)===String(prior.sourceId)&&p.state==='serviceable'&&
   norm(p.location)===norm(point.serviceLocationName||point.name));
  if(!unchanged)errors.push('Уже сохранённое физическое место требует отдельной инженерной миграции: '+(point.name||prior.positionId));
 }
 if(selectedCount&&!clean(payload?.sourceReference))errors.push('Для создания точек требуется источник осмотра / OEM');
 if(!positions.length)warnings.push('Физические места не указаны — карта не изменится');
 if(!selectedCount)warnings.push('Можно сохранить инженерный черновик без точек и мероприятий');
 return {allowed:errors.length===0,errors,warnings,selectedCount,status:selectedCount?'VERIFIED_POSITIONS':'SURVEY_ONLY'};
}
function commit(equipmentId,payload){
 const current=Core?.State?.getDatabase?.();if(!current)return {ok:false,errors:['База не загружена']};
 const check=preview(current,equipmentId,payload);
 if(!check.allowed)return {ok:false,...check};
 const db=Core?.DatabaseSchema?.clone?.(current)||JSON.parse(JSON.stringify(current));
 const root=byId(db.equipment,equipmentId);
 const positions=arr(payload.positions).map(p=>({
  positionId:clean(p.positionId),sourceId:clean(p.sourceId),location:clean(p.location),
  state:p.state||'review',accessConfirmed:p.accessConfirmed===true,oemConfirmed:p.oemConfirmed===true,
  notes:clean(p.notes)
 }));
 const prior=arr(root.sawCutSurvey?.positions);
 const oldKeys=new Set(prior.filter(p=>p.state==='serviceable').map(p=>
  'component:'+p.sourceId+':saw_position_'+p.positionId));
 const previousCreated=arr(db.lubricationPoints).filter(p=>oldKeys.has(String(p.candidateOriginKey||'')));
 // Preserve established positions, and never remap existing point IDs.
 for(const p of previousCreated){
  const m=String(p.candidateOriginKey).match(/^component:([^:]+):saw_position_(.+)$/);
  if(!m)continue;
  const pos=positions.find(x=>x.sourceId===m[1]&&x.positionId===m[2]);
  if(!pos||pos.state!=='serviceable'||norm(pos.location)!==norm(p.serviceLocationName||p.name))
   return {ok:false,errors:['Существующие физические места с точками нельзя удалить или переназначить через мастер. Требуется инженерная миграция.']};
 }
 root.sawCutSurvey={version:'1.0.33.79',positions,status:check.status,
  sourceReference:clean(payload.sourceReference),reason:clean(payload.reason),updatedAt:new Date().toISOString()};
 const finalizer=global.LubricaCandidateFinalizer;
 if(check.selectedCount&&typeof finalizer?.applyConfirmedSpecs!=='function')return {ok:false,errors:['Штатный конструктор точек недоступен']};
 const generated=[];
 for(const p of positions.filter(p=>p.state==='serviceable')){
  const c=byId(db.components,p.sourceId),owner=byId(db.equipment,c.equipmentId);
  const key='component:'+c.id+':saw_position_'+p.positionId;
  if(arr(db.lubricationPoints).some(x=>x.candidateOriginKey===key))continue;
  const spec={key:'saw_position_'+p.positionId,name:p.location,serviceLocationName:p.location,
   position:p.location,category:c.candidateCategory,actual:true,sourceRef:{source:'component',id:c.id,name:c.name},
   activities:[{type:'regrease',label:'Досмазывание'}]};
  const result=finalizer.applyConfirmedSpecs(db,'component',c,owner,
   {id:'saw_cut_arrangement',title:'Пила — подтверждённая физическая опора'},[spec]);
  generated.push(...arr(result.createdPointIds));
  const point=arr(db.lubricationPoints).find(x=>x.candidateOriginKey===key);
  if(point){point.serviceLocationName=p.location;point.positionLabel=p.location;
   point.sawCutEvidence={positionId:p.positionId,sourceComponentId:c.id,
    sourceReference:root.sawCutSurvey.sourceReference,physicalAccessConfirmed:true,
    linearOemConfirmed:p.oemConfirmed===true};}
 }
 Core.State.setDatabase(Core?.Database?.normalize?.(db)||db);
 return {ok:true,status:check.status,createdPointIds:Array.from(new Set(generated)),selectedCount:check.selectedCount};
}
function open(equipmentId){
 const database=Core?.State?.getDatabase?.(),ev=inventory(database,equipmentId),dlg=document.getElementById('structureDialog');
 if(!ev||!dlg){global.LubricaApp?.showToast?.('Машина не найдена или исключена','warn');return}
 dlg.classList.add('candidate-finalize-dialog');
 let existing=arr(ev.saved?.positions),counter=0,verified=null;
 const summary=ev.children.length?'<p>Связанные механизмы: '+ev.children.length+'. Физические точки принадлежат конкретным дочерним узлам.</p>':'';
 const childList=ev.children.filter(e=>isSaw(e)).map(e=>'<button class="mini-btn" type="button" data-saw-child="'+esc(e.id)+'">'+esc(e.externalCode||'')+' · '+esc(e.name)+'</button>').join('');
 const bearingOptions='<option value="">ТМЦ не определён</option>'+ev.rows.filter(r=>['bearing','linear_bearing'].includes(r.category)).map(r=>
  '<option value="'+esc(r.id)+'">'+esc(r.sourceCode)+' · '+esc(r.name)+' · '+esc(r.ownerName)+(r.excluded?' · исключён':'')+'</option>').join('');
 const categoryLabels={bearing:'Подшипники',linear_bearing:'Линейные подшипники',shaft:'Валы и оси',drive:'Приводы',chain:'Цепи',guide:'Направляющие',screw:'Винтовые элементы',bearing_unclassified:'Требует классификации',context:'Конструктивный контекст'};
 const inventoryRows=ev.rows.filter(r=>r.category!=='context'||r.existingPointIds.length).slice(0,140).map(r=>
  '<div class="qa-issue"><div class="qa-issue-body"><b>'+esc(r.name)+'</b> <code>'+esc(r.sourceCode)+'</code><small>'+esc(r.ownerName)+' · '+esc(categoryLabels[r.category]||r.category)+
  ' · '+(r.existingPointIds.length?'Точки: '+esc(r.existingPointIds.join(', ')):'Точки пока не подтверждены')+
  (r.sealed?' · Закрытое исполнение: нужен OEM':'')+(r.dry?' · Полимерная пара: сухое исполнение проверить по OEM':'')+'</small></div>'+(
   r.category==='shaft'?'<button type="button" class="mini-btn" data-saw-shaft="'+esc(r.id)+'">Проверить реальные опоры вала</button>':'')+'</div>').join('');
 dlg.innerHTML='<form class="structure-form saw-cut-form">'+
  '<div class="dialog-head"><div><span class="eyebrow">ПИЛЫ · РЕЗКА · КАРЕТКИ</span><h2>'+esc(ev.root.name)+'</h2></div><button type="button" class="icon-btn" data-close>×</button></div>'+
  '<div class="wizard-note"><b>'+esc(ev.root.externalCode||'')+' · Конструктор фактической конструкции</b><span>Вал, колесо, режущее полотно или направляющая сами по себе не являются точками смазки. Создание возможно только после выбора реального подшипникового ТМЦ, места и подтверждения доступа. OEM-калькуляторы не дублируем.</span></div>'+
  '<div class="conveyor-selection-counter">ТМЦ: '+ev.rows.length+' · Уже связанные физические точки: '+ev.existingPoints+' · Подшипники: '+(ev.kinds.bearing||0)+' · Линейные: '+(ev.kinds.linear_bearing||0)+'</div>'+summary+
  (childList?'<details><summary>Дочерние пилы, колёса и каретки</summary><div class="saw-child-links">'+childList+'</div></details>':'')+
  '<details><summary>Исходные ТМЦ, статусы, существующие точки</summary><div class="qa-issues-list saw-inventory-list">'+inventoryRows+'</div></details>'+
  (ev.isGroup?'<div class="wizard-note"><b>Группа оборудования</b><span>Откройте конкретную пилу или каретку выше. В группу не добавляются самостоятельные точки.</span></div>':
   '<section class="saw-physical-panel"><h3>Подтверждённые места обслуживания</h3><p>Сначала найдите установленный узел. При необходимости добавьте несколько физических мест для одного исходного ТМЦ. Ничего не отмечено автоматически.</p><div data-saw-rows></div><button type="button" class="btn secondary" data-add>Добавить физическое место</button></section>')+
  '<label>Основание проверки<textarea name="reason" rows="2">'+esc(ev.saved?.reason||'')+'</textarea></label>'+
  '<label>Чертёж / акт осмотра / OEM-источник<input name="sourceReference" value="'+esc(ev.saved?.sourceReference||'')+'"></label>'+
  '<div class="wizard-note" role="status" aria-live="polite" data-result>Неподтверждённые места можно сохранить без новых точек.</div>'+
  '<menu><button type="button" class="btn ghost" data-close>Отмена</button>'+(!ev.isGroup?'<button type="button" class="btn secondary" data-check>Проверить</button><button type="button" class="btn primary" data-save disabled>Сохранить подтверждённые места</button>':'')+'</menu></form>';
 const form=dlg.querySelector('form'),host=form.querySelector('[data-saw-rows]');
 const invalidate=()=>{verified=null;const save=form.querySelector('[data-save]');if(save)save.disabled=true};
 function add(row={}){
  const positionId=clean(row.positionId)||'saw_'+Date.now().toString(36)+'_'+(++counter);
  const el=document.createElement('article');el.className='saw-physical-row';el.dataset.positionId=positionId;
  el.innerHTML='<div class="point-accel-position-row"><b>Физическое место</b><button type="button" class="mini-btn" data-remove>Удалить</button></div>'+
   '<label>Подшипник из ТМЦ<select name="sourceId">'+bearingOptions+'</select></label>'+
   '<label>Точное место на машине<input name="location" value="'+esc(row.location||'')+'" placeholder="Колесо №1 · левая опора"></label>'+
   '<label>Состояние<select name="state"><option value="review">Нужно подтвердить</option><option value="serviceable">Реально обслуживается</option><option value="not_serviceable">Не обслуживается — по источнику</option></select></label>'+
   '<label class="checkline"><input type="checkbox" name="access"> Проверен канал/маслёнка и доступ</label>'+
   '<label class="checkline"><input type="checkbox" name="oem"> Для линейного подшипника проверена OEM-методика</label>'+
   '<label>Примечание<input name="notes" value="'+esc(row.notes||'')+'"></label>';
  el.querySelector('[name=sourceId]').value=row.sourceId||'';
  el.querySelector('[name=state]').value=row.state||'review';
  el.querySelector('[name=access]').checked=row.accessConfirmed===true;
  el.querySelector('[name=oem]').checked=row.oemConfirmed===true;
  el.querySelector('[data-remove]').onclick=()=>{el.remove();invalidate()};
  el.querySelectorAll('input,select').forEach(x=>{x.addEventListener('input',invalidate);x.addEventListener('change',invalidate)});
  host.appendChild(el);invalidate();
 }
 const payload=()=>({reason:form.elements.reason.value,sourceReference:form.elements.sourceReference.value,
  positions:Array.from(host?.children||[]).map(el=>({positionId:el.dataset.positionId,
   sourceId:el.querySelector('[name=sourceId]').value,location:el.querySelector('[name=location]').value,
   state:el.querySelector('[name=state]').value,accessConfirmed:el.querySelector('[name=access]').checked,
   oemConfirmed:el.querySelector('[name=oem]').checked,notes:el.querySelector('[name=notes]').value}))});
 function close(){dlg.classList.remove('candidate-finalize-dialog');dlg.close()}
 form.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
 form.querySelectorAll('[data-saw-child]').forEach(b=>b.onclick=()=>{const id=b.getAttribute('data-saw-child');close();open(id)});
 form.querySelectorAll('[data-saw-shaft]').forEach(b=>b.onclick=()=>{
  const id=b.getAttribute('data-saw-shaft');close();global.LubricaRotatingArrangement?.open?.('component',id);
 });
 if(!ev.isGroup){
  existing.forEach(add);form.querySelector('[data-add]').onclick=()=>add();
  form.querySelectorAll('textarea,input').forEach(x=>x.addEventListener('input',invalidate));
  form.querySelector('[data-check]').onclick=()=>{
   const p=payload(),result=preview(Core.State.getDatabase(),equipmentId,p);
   form.querySelector('[data-result]').innerHTML='<b>'+esc(result.allowed?'Готово: '+result.status:'Проверка не пройдена')+'</b><p>Подтверждённых мест: '+result.selectedCount+'</p>'+result.errors.concat(result.warnings).map(x=>'<p>'+esc(x)+'</p>').join('');
   verified=result.allowed?JSON.stringify(p):null;form.querySelector('[data-save]').disabled=!result.allowed;
  };
  form.querySelector('[data-save]').onclick=()=>{
   const p=payload();if(!verified||verified!==JSON.stringify(p)){global.LubricaApp?.showToast?.('Повторите проверку после изменений','warn');return}
   const result=commit(equipmentId,p);
   if(!result.ok){global.LubricaApp?.showToast?.(result.errors?.join('; ')||'Ошибка','warn');return}
   global.LubricaApp?.refreshFromCore?.();global.LubricaApp?.renderAll?.();global.LubricaStructure?.render?.();global.LubricaCandidates?.render?.();
   global.LubricaApp?.showToast?.('Инженерная схема сохранена. Новые мероприятия остаются в review.');close();
  };
 }
 dlg.showModal();
}
API.isSaw=isSaw;API.inventory=inventory;API.preview=preview;API.commit=commit;API.open=open;
})(window);
