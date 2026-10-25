(function(global){
'use strict';
const Core=global.LubricaCore,C=global.LubricaStructureContext,Calc=global.LubricaMotorCalculator,OEM=global.LubricaMotorOEM;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function db(){return Core?.State?.getDatabase?.()}
function motorContext(point,d=db()){
 if(!point||!d)return null;
 let component=null;
 const cid=point.componentBinding?.sourceComponentId||null;
 if(cid)component=(d.components||[]).find(x=>String(x.id)===String(cid))||null;
 if(!component&&point.candidateOriginKey){const m=String(point.candidateOriginKey).match(/^component:([^:]+)/);if(m)component=(d.components||[]).find(x=>String(x.id)===String(m[1]))||null;}
 const equipment=(d.equipment||[]).find(x=>String(x.id)===String(point.equipmentId))||null;
 const text=[component?.manufacturer,component?.name,component?.model,equipment?.manufacturer,equipment?.name].filter(Boolean).join(' · ');
 const classified=component?.candidateEquipmentType==='motor'||equipment?.equipmentType==='motor'||/электродвиг|вибромотор|\bMVE\b|\bDRE\d|\bM2AA\b|\bM3AA\b|\bM2CA\b|\b1LE\d|\b1LA\d|\b1LG\d|\b1TZ\d|\bWK\s*\d/i.test(text);
 if(!classified)return null;
 return {component,equipment,text:text||point.name||'',profile:OEM.resolve(text||point.name||'')};
}
function taskForPoint(point,d=db()){const candidates=(d?.tasks||[]).filter(t=>String(t.lubricationPointId)===String(point.id)&&!t.obsoleteByBearingPolicy);return candidates.find(t=>!t.obsoleteByMotorPolicy)||candidates[0]||null}
function motorSiblingPoints(point,d=db()){
 const cid=point?.componentBinding?.sourceComponentId||String(point?.candidateOriginKey||'').match(/^component:([^:]+)/)?.[1]||null;
 if(!cid)return point?[point]:[];
 return (d?.lubricationPoints||[]).filter(p=>{
   const pcid=p?.componentBinding?.sourceComponentId||String(p?.candidateOriginKey||'').match(/^component:([^:]+)/)?.[1]||null;
   return String(pcid||'')===String(cid)&&/^(DE|NDE)$/i.test(String(p.positionLabel||''));
 });
}
function savedMotorService(point,d=db()){
 if(point?.motorService&&Object.keys(point.motorService).length)return point.motorService;
 const sibling=motorSiblingPoints(point,d).find(p=>p!==point&&p.motorService&&Object.keys(p.motorService).length);
 return sibling?.motorService||{};
}
function motorServiceRecord(result,forms){
 const {contextForm,oemForm}=forms;
 return {manufacturer:result.profile.manufacturer,family:result.profile.family,frame:result.profile.frame,model:result.profile.model,rpm:Number(contextForm.elements.rpm.value)||null,powerKw:Number(contextForm.elements.powerKw.value)||null,nippleConfirmed:contextForm.elements.nippleConfirmed.value==='yes'?true:contextForm.elements.nippleConfirmed.value==='no'?false:null,bearingType:contextForm.elements.bearingType?.value||'ball',plateDoseG:Number(oemForm.elements.plateDoseG.value)||null,plateIntervalHours:Number(oemForm.elements.plateIntervalHours.value)||null,plateGrease:oemForm.elements.plateGrease.value.trim(),plateSource:oemForm.elements.plateSource.value.trim(),policy:result.policy,mode:result.mode,calculatedAt:new Date().toISOString(),result:result.relube?{...result.relube}:null,sourceIds:sourceButtons(result)};
}
function syncRelubeTask(database,point,result){
 const task=taskForPoint(point,database);if(!task)return null;
 if(result.policy==='NO_ROUTINE_RELUBE'){
   task.motorServicePolicy='NO_ROUTINE_RELUBE';
   task.obsoleteByMotorPolicy=true;
   task.approvalStatus='disabled';
   task.verified=false;
   task.motorPolicyNote='Плановое досмазывание не предусмотрено OEM/подтверждённой конструкцией двигателя.';
   return task;
 }
 if(result.policy==='RELUBE'&&result.relube?.intervalHours>0){
   task.obsoleteByMotorPolicy=false;
   task.motorServicePolicy='RELUBE';
   task.schedule=task.schedule||{};
   task.schedule.strategy='По наработке';
   task.schedule.runtimeHours=Number(result.relube.intervalHours);
   task.schedule.calculatedHours=Number(result.relube.intervalHours);
   task.schedule.approvedHours=Number(result.relube.intervalHours);
   task.schedule.legacyText=`${Number(result.relube.intervalHours)} ч`;
   task.schedule.source=result.relube.source||result.profile?.manufacturer||'Motor OEM';
   if(result.relube.doseG>0){task.quantity=task.quantity||{};task.quantity.calculated=Number(result.relube.doseG);task.quantity.approved=Number(result.relube.doseG);task.quantity.unit='г';task.quantity.source=result.relube.source||result.profile?.manufacturer||'Motor OEM';}
   task.calculationSource=result.relube.source||result.profile?.manufacturer||'Motor OEM';
   task.approvalStatus='review';
   task.verified=false;
   return task;
 }
 return task;
}
function statusLabel(result){
 if(result.policy==='NO_ROUTINE_RELUBE')return {tone:'ok',title:'Плановое досмазывание не предусмотрено',text:result.profile.reason};
 if(result.policy==='RELUBE'&&result.relube?.intervalHours>0)return {tone:'ok',title:`${result.relube.doseG??'—'} г · каждые ${result.relube.intervalHours} ч`,text:`${result.relube.source} · ${result.relube.confidence}`};
 return {tone:'warn',title:'Нужны дополнительные данные',text:(result.needs||[]).join(' ')};
}
function sourceButtons(result){const ids=[...(result.sourceIds||[])];if(result.relube?.sourceId&&!ids.includes(result.relube.sourceId))ids.push(result.relube.sourceId);return ids;}
function methodText(current){
 if(current.mode==='machine_oem')return 'OEM конкретного двигателя';
 if(current.mode==='abb_l1')return 'ABB L1';
 if(current.mode==='lammers_1tz9')return 'Lammers 1TZ9 · OEM';
 if(current.policy==='NO_ROUTINE_RELUBE')return 'OEM · закрытая конструкция';
 if(current.profile?.manufacturer==='SIEMENS/INNOMOTICS'&&current.policy==='CONFIRM_NIPPLE')return 'Siemens/Innomotics · проверить конструкцию';
 if(current.policy==='MACHINE_PLATE')return 'OEM · данные с таблички';
 if(current.policy==='EXACT_OEM_ONLY')return 'OEM · точная инструкция';
 return 'Требует подтверждения';
}
function open(context={}){
 const point=context.point;if(!point)return false;const d=db(),mc=motorContext(point,d);if(!mc)return false;
 const saved=savedMotorService(point,d);const profile=mc.profile;
 const dlg=document.getElementById('bearingCalcDialog')||document.getElementById('actionDialog');if(!dlg)return false;
 const rpm=saved.rpm??profile.rpm??point.bearing?.calculation?.rpm??'';
 const power=saved.powerKw??profile.powerKw??'';
 const nipple=saved.nippleConfirmed===true?'yes':saved.nippleConfirmed===false?'no':'';
 const bearingType=saved.bearingType||'ball';
 const isAbb=profile.manufacturer==='ABB';
 const isPlateDriven=profile.policy==='MACHINE_PLATE'||profile.policy==='EXACT_OEM_ONLY'||profile.manufacturer==='SIEMENS/INNOMOTICS'||profile.manufacturer==='EMOD';
 const motorTitle=mc.component?.name||mc.equipment?.name||point.name;
 dlg.classList.add('motor-calc-dialog-host');
 dlg.innerHTML=`<div class="bearing-dialog motor-calc-dialog unified-calculator simple-mode">
 <div class="dialog-head motor-dialog-head"><div><span class="eyebrow">РАСЧЁТ СМАЗКИ · ЭЛЕКТРОДВИГАТЕЛЬ</span><h2>${esc(motorTitle)}</h2><p class="dialog-copy">Точка: ${esc(point.name)} · ${esc(point.positionLabel||'DE/NDE не указано')}</p></div><button type="button" class="icon-btn" data-close>×</button></div>
 <div class="motor-calc-tabs"><button type="button" class="btn motor-mode-btn active" data-mode="simple">Простой режим</button><button type="button" class="btn motor-mode-btn secondary" data-mode="expert">Экспертный режим</button><button type="button" class="btn secondary" data-evidence>Обоснование</button></div>
 <div class="motor-calc-scroll">
  <section class="motor-recommendation-card" data-recommendation>
   <small>РЕКОМЕНДАЦИЯ</small><b data-recommendation-main>—</b><span data-recommendation-sub>Расчёт выполняется по подтверждённой методике.</span>
  </section>
  <div class="motor-summary-grid">
   <div><small>Оборудование</small><b>${esc(motorTitle)}</b><span>${esc(point.positionLabel||'DE/NDE')}</span></div>
   <div><small>Производитель</small><b data-maker>${esc(profile.manufacturer||'Не определён')}</b><span data-family-line>${esc(profile.family||'—')}${profile.frame?` · рама ${esc(profile.frame)}`:''}</span></div>
   <div><small>Методика</small><b data-method>—</b><span data-method-source>OEM-first resolver</span></div>
  </div>
  <div data-result-banner class="wizard-note motor-status-banner"></div>

  <section class="bearing-calc-section motor-auto-data-section"><div class="calc-section-title"><span>01</span><div><h3>Исходные данные расчёта</h3><p>Распознанные данные двигателя и автоматически выбранная OEM-методика.</p></div></div>
   <div class="motor-auto-grid">
    <div><small>Обороты</small><b data-auto-rpm>—</b></div><div><small>Мощность</small><b data-auto-power>—</b></div><div><small>DE</small><b data-auto-de>по шильдику</b></div><div><small>NDE</small><b data-auto-nde>по шильдику</b></div>
    <div class="motor-auto-oem-card"><small>OEM-доза · каталог</small><b data-auto-oem-dose>—</b><span data-auto-oem-dose-note>Не определена</span></div><div class="motor-auto-oem-card"><small>OEM-интервал · каталог</small><b data-auto-oem-interval>—</b><span data-auto-oem-interval-note>Не определён</span></div><div class="motor-auto-oem-card span-2"><small>Источник автоматических OEM-данных</small><b data-auto-oem-source>—</b><span data-auto-oem-confidence>Каталожный baseline не зарегистрирован</span></div>
   </div>
   <div data-motor-bearing-map class="motor-bearing-map"></div>
  </section>

  <section class="bearing-calc-section motor-expert-only"><div class="calc-section-title"><span>02</span><div><h3>Экспертная корректировка контекста</h3><p>Меняйте распознанные параметры только по фактическим данным двигателя.</p></div></div>
   <form data-motor-form class="motor-calc-form motor-context-form">
    <label>Обороты, об/мин<input name="rpm" type="number" min="1" value="${esc(rpm)}"></label>
    <label>Мощность, кВт<input name="powerKw" type="number" step="0.1" min="0" value="${esc(power)}"></label>
    <label data-nipple-field>Наличие пресс-маслёнок<select name="nippleConfirmed"><option value="" ${!nipple?'selected':''}>Не проверено</option><option value="yes" ${nipple==='yes'?'selected':''}>Есть / подтверждено</option><option value="no" ${nipple==='no'?'selected':''}>Нет / закрытые подшипники</option></select></label>
    <label data-abb-only ${isAbb?'':'hidden'}>Тип подшипника для ABB L1<select name="bearingType"><option value="ball" ${bearingType==='ball'?'selected':''}>Шариковый</option><option value="roller" ${bearingType==='roller'?'selected':''}>Роликовый</option></select></label>
   </form>
  </section>

  <section class="bearing-calc-section motor-oem-section ${isPlateDriven?'':'motor-expert-only'}"><div class="calc-section-title"><span>${isPlateDriven?'02':'03'}</span><div><h3>Данные конкретного двигателя</h3><p>${isPlateDriven?'Для этой серии числовые значения применяются только с подтверждённой таблички или точной OEM-инструкции.':'Необязательное переопределение: данные конкретного шильдика имеют приоритет над серийной OEM-таблицей.'}</p></div></div>
   <form data-motor-oem-form class="motor-calc-form motor-oem-form">
    <label>Доза с таблички, г<input name="plateDoseG" type="number" step="0.1" min="0" value="${esc(saved.plateDoseG??'')}"></label>
    <label>Интервал с таблички, ч<input name="plateIntervalHours" type="number" min="1" value="${esc(saved.plateIntervalHours??'')}"></label>
    <label class="wide">Смазочный материал<input name="plateGrease" value="${esc(saved.plateGrease||'')}" placeholder="Только если указан на двигателе / в инструкции"></label>
    <label class="wide full-row">Источник таблички / инструкции<input name="plateSource" value="${esc(saved.plateSource||'')}" placeholder="Например: шильдик двигателя, фото / OEM manual, раздел и страница"></label>
   </form>
  </section>

  <section class="bearing-calc-section"><div class="calc-section-title"><span>${isPlateDriven?'03':'04'}</span><div><h3>Результат обслуживания</h3><p>Результат будет применён к обеим фактическим точкам DE/NDE этого двигателя, если методика задаёт обслуживание обеих опор.</p></div></div><div data-result-detail class="motor-result-detail"></div></section>
 </div>
 <menu class="motor-calc-menu"><button type="button" class="btn ghost" data-close>Отмена</button><button type="button" class="btn secondary motor-expert-only-inline" data-recalc>Пересчитать</button><button type="button" class="btn primary" data-apply>Применить результат</button></menu></div>`;
 const contextForm=dlg.querySelector('[data-motor-form]');
 const oemForm=dlg.querySelector('[data-motor-oem-form]');
 let current=null,mode='simple';
 const read=()=>({motorText:mc.text,rpm:contextForm.elements.rpm.value,powerKw:contextForm.elements.powerKw.value,nippleConfirmed:contextForm.elements.nippleConfirmed.value,bearingType:contextForm.elements.bearingType?.value||'ball',plateDoseG:oemForm.elements.plateDoseG.value,plateIntervalHours:oemForm.elements.plateIntervalHours.value,plateGrease:oemForm.elements.plateGrease.value,plateSource:oemForm.elements.plateSource.value});
 const setMode=(next)=>{
   mode=next==='expert'?'expert':'simple';
   const shell=dlg.querySelector('.motor-calc-dialog');
   shell.classList.toggle('simple-mode',mode==='simple');
   shell.classList.toggle('expert-mode',mode==='expert');
   dlg.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.classList.toggle('secondary',!active)});
 };
 const recalc=()=>{
   current=Calc.calculate(read());
   const st=statusLabel(current),banner=dlg.querySelector('[data-result-banner]');
   banner.className=`wizard-note motor-status-banner ${st.tone==='ok'?'ok':'warn'}`;
   banner.innerHTML=`<b>${esc(st.title)}</b><span>${esc(st.text)}</span>`;
   dlg.querySelector('[data-method]').textContent=methodText(current);
   const recMain=dlg.querySelector('[data-recommendation-main]'),recSub=dlg.querySelector('[data-recommendation-sub]'),recCard=dlg.querySelector('[data-recommendation]');
   if(current.policy==='NO_ROUTINE_RELUBE'){recMain.textContent='Плановое досмазывание не предусмотрено';recSub.textContent=current.profile.reason||'OEM-конструкция не требует регулярного досмазывания.';recCard.classList.add('ok');recCard.classList.remove('warn');}
   else if(current.relube?.intervalHours>0){recMain.textContent=`${current.relube.doseG??'—'} г · каждые ${current.relube.intervalHours} ч`;recSub.textContent=`${current.relube.source} · ${current.relube.confidence}`;recCard.classList.add('ok');recCard.classList.remove('warn');}
   else{recMain.textContent='Требуются подтверждённые данные';recSub.textContent=(current.needs||[]).join(' ')||'Автоматический цикл пока не определён.';recCard.classList.add('warn');recCard.classList.remove('ok');}
   const autoRpm=dlg.querySelector('[data-auto-rpm]'),autoPower=dlg.querySelector('[data-auto-power]'),bc0=current.profile?.bearingConstruction;
   if(autoRpm)autoRpm.textContent=current.rpm?`${current.rpm} об/мин`:'—';if(autoPower)autoPower.textContent=current.powerKw?`${current.powerKw} кВт`:'—';
   const cat=current.calculationPackage?.provenance?.catalogBaseline;const catDose=dlg.querySelector('[data-auto-oem-dose]'),catInt=dlg.querySelector('[data-auto-oem-interval]'),catSrc=dlg.querySelector('[data-auto-oem-source]'),catConf=dlg.querySelector('[data-auto-oem-confidence]'),catDoseNote=dlg.querySelector('[data-auto-oem-dose-note]'),catIntNote=dlg.querySelector('[data-auto-oem-interval-note]');
   if(catDose)catDose.textContent=cat?.doseG!=null?`${cat.doseG} г`:'—';if(catInt)catInt.textContent=cat?.intervalHours>0?`${cat.intervalHours} ч`:'—';if(catSrc)catSrc.textContent=cat?.source||'—';if(catConf)catConf.textContent=cat?.confidence||'Каталожный baseline не зарегистрирован';if(catDoseNote)catDoseNote.textContent=cat?.doseG!=null?'Автоматически из OEM-каталога · не шильдик':'Не определена';if(catIntNote)catIntNote.textContent=cat?.intervalHours>0?'Автоматически из OEM-каталога · не шильдик':'Не определён';
   const autoDe=dlg.querySelector('[data-auto-de]'),autoNde=dlg.querySelector('[data-auto-nde]');if(autoDe)autoDe.textContent=bc0?.de||'по шильдику';if(autoNde)autoNde.textContent=bc0?.nde||'по шильдику';
   const bc=current.profile?.bearingConstruction,map=dlg.querySelector('[data-motor-bearing-map]');
   if(map){
     if(bc&&(bc.de||bc.nde||bc.note)){
       map.innerHTML=`<div class="motor-bearing-map-card"><small>${current.profile?.manufacturer==='ABB'?'Штатная конструкция ABB':'Подтверждённая конструкция'}</small><b>${bc.de?`DE: ${esc(bc.de)}`:'DE: по шильдику'}${bc.nde?` · NDE: ${esc(bc.nde)}`:' · NDE: по шильдику'}</b><span>${esc(bc.note||'')}</span></div>`;
     }else map.innerHTML='';
   }
   const detail=dlg.querySelector('[data-result-detail]');
   if(current.policy==='NO_ROUTINE_RELUBE')detail.innerHTML=`<div class="motor-result-card ok"><small>Рабочая политика</small><b>Плановое досмазывание отсутствует</b><span>${esc(current.profile.reason)}</span></div>`;
   else if(current.relube?.intervalHours>0)detail.innerHTML=`<div class="motor-result-card ok"><small>Досмазывание</small><b>${esc(current.relube.doseG??'—')} г / ${esc(current.relube.intervalHours)} ч</b><span>${esc(current.relube.source)}${current.relube.perPoint?' · доза на одну точку DE/NDE':''}${current.relube.servicePoints?` · точек: ${esc(current.relube.servicePoints)}`:''}${current.relube.powerBand?` · ${esc(current.relube.powerBand)}`:''}</span></div>${current.warnings?.length?`<div class="motor-result-card warn"><small>Ограничения применимости</small><span>${esc(current.warnings.join(' '))}</span></div>`:''}${current.relube.grease?`<div class="motor-result-card"><small>Смазочный материал</small><b>${esc(current.relube.grease)}</b></div>`:''}`;
   else detail.innerHTML=`<div class="motor-result-card warn"><small>Автоматический расчёт не применён</small><b>Нужны подтверждённые данные</b><span>${esc((current.needs||[]).join(' '))}</span></div>`;
   const apply=dlg.querySelector('[data-apply]');
   apply.disabled=!(current.policy==='NO_ROUTINE_RELUBE'||(current.policy==='RELUBE'&&current.relube?.intervalHours>0))||((current.plate.doseG>0||current.plate.intervalHours>0||current.plate.grease)&&!current.plate.source);
   return current;
 };
 [contextForm,oemForm].forEach(form=>form.querySelectorAll('input,select').forEach(el=>{el.addEventListener('change',recalc);if(el.tagName==='INPUT')el.addEventListener('input',recalc)}));
 dlg.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
 dlg.querySelector('[data-recalc]').onclick=recalc;
 dlg.querySelector('[data-evidence]').onclick=()=>{const r=current||recalc(),ids=sourceButtons(r);global.LubricaBearingSources?.openRegistry?.({host:dlg,sourceIds:ids.length?ids:['__NO_CONFIRMED_MOTOR_SOURCE__'],title:'Обоснование расчёта электродвигателя',intro:'OEM-политика двигателя, таблицы досмазывания и ограничения применимости.',contextText:`${motorTitle} · ${point.positionLabel||'DE/NDE'} · ${r.profile.manufacturer} ${r.profile.family||''} · ${r.rpm||'—'} об/мин · ${r.powerKw||'—'} кВт · метод: ${methodText(r)} · результат: ${r.relube?.doseG??'—'} г / ${r.relube?.intervalHours??'—'} ч · ${r.mode==='machine_oem'?'machine-specific override':'catalogue / resolved baseline'}`});};
 dlg.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{dlg.classList.remove('motor-calc-dialog-host');dlg.close()});
 dlg.querySelector('[data-apply]').onclick=()=>{const r=current||recalc();const database=db();const p=(database.lubricationPoints||[]).find(x=>String(x.id)===String(point.id));if(!p)return;
   const record=motorServiceRecord(r,{contextForm,oemForm});const siblings=motorSiblingPoints(p,database);const targets=siblings.length?siblings:[p];
   targets.forEach(tp=>{tp.motorService={...(tp.motorService||{}),...record};if(tp.bearing?.calculation&&Object.keys(tp.bearing.calculation).length){tp.bearing.calculation.supersededBy='motor_oem';tp.bearing.calculation.supersededAt=new Date().toISOString();tp.bearing.calculation.supersededReason='Active maintenance result is controlled by Motor OEM engine for this motor bearing point.';}syncRelubeTask(database,tp,r);});
   const count=targets.length;C?.save?.(database,r.policy==='NO_ROUTINE_RELUBE'?`Политика двигателя применена к ${count} точк${count===1?'е':'ам'}: плановое досмазывание отключено`:`Расчёт двигателя применён к ${count} точк${count===1?'е':'ам'} DE/NDE`);dlg.classList.remove('motor-calc-dialog-host');dlg.close();};
 setMode('simple');recalc();dlg.showModal();return true;
}
global.LubricaMotorUI=Object.freeze({open,motorContext,syncRelubeTask,motorSiblingPoints,savedMotorService});
global.LubricaSystem?.registerModule?.('Motor Calculation UI','ok','Unified simple/expert OEM-first motor calculator');
})(window);
