(function(global){'use strict';
const methodMeta=new Map(), operationMeta=new Map(), lifecycleMeta=new Map(), conditionMeta=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function registerMethod(id,meta={}){methodMeta.set(String(id),{id:String(id),...meta});return true}
function registerOperation(id,meta={}){operationMeta.set(String(id),{id:String(id),...meta});return true}
function registerLifecycle(id,meta={}){lifecycleMeta.set(String(id),{id:String(id),...meta});return true}
function registerCondition(id,meta={}){conditionMeta.set(String(id),{id:String(id),...meta});return true}
[
 ['VENTAPP_MACHINE',{label:'Ventapp · конкретный вентилятор',manufacturer:'Ventapp'}],['REITZ_KXE_SINGLE',{label:'REITZ KXE',manufacturer:'REITZ'}],['REITZ_KXE_ZLG',{label:'REITZ KXE ZLG',manufacturer:'REITZ'}],
 ['SKF_SNL_SIDE',{label:'SKF SNL · боковая подача',manufacturer:'SKF'}],['SKF_SNL_GROOVE',{label:'SKF SNL · канавка/отверстия',manufacturer:'SKF'}],
 ['NTN_SNR_ZLG_2024',{label:'NTN-SNR ZLG',manufacturer:'NTN-SNR'}],['TROESTER_BLOCK',{label:'Tröster Blocklager',manufacturer:'Tröster'}],['FERRARI_CART01',{label:'Ferrari CART01',manufacturer:'Ferrari'}],['FERRARI_CHART82',{label:'Ferrari Chart 8-2',manufacturer:'Ferrari'}],['NSK_HOUSED_GUIDANCE',{label:'NSK · корпусной узел',manufacturer:'NSK'}],
 ['INA_VLU20',{label:'INA / Schaeffler VLU20',manufacturer:'INA / Schaeffler'}],['LUBRICA_UNIVERSAL_3_2',{label:'LUBRICA Universal 3.2',manufacturer:'LUBRICA',engineering:true}]
].forEach(x=>registerMethod(...x));
[
 ['relube',{label:'Досмазывание'}],['fullRenewal',{label:'Полное обновление'}],['inspection',{label:'Осмотр'}],['cleaning',{label:'Очистка'}],
 ['oilChange',{label:'Замена масла'}],['automaticLubrication',{label:'Автоматическая смазка'}]
].forEach(x=>registerOperation(...x));
[
 ['CALCULATED',{label:'Цикл рассчитан',tone:'ok'}],['FALLBACK_AVAILABLE',{label:'Доступен подтверждаемый fallback',tone:'warn'}],
 ['PARTIAL_OEM',{label:'OEM определил часть цикла',tone:'warn'}],['REVIEW_REQUIRED',{label:'Требуется проверка',tone:'warn'}],
 ['CONDITION_BASED',{label:'По состоянию / при ТО',tone:'info'}],['NOT_APPLICABLE',{label:'Плановая операция не применяется',tone:'info'}]
].forEach(x=>registerLifecycle(...x));
[
 ['rpm',{label:'Обороты'}],['temperatureC',{label:'Температура'}],['load',{label:'Нагрузка'}],['contamination',{label:'Загрязнение'}],['vibration',{label:'Вибрация'}],['orientation',{label:'Положение вала'}]
].forEach(x=>registerCondition(...x));
function methodLabel(id){if(!id)return '—';return methodMeta.get(String(id))?.label||String(id).replaceAll('_',' ')}
function planRows(pkg){const p=pkg?.methodPlan||{}, op=pkg?.operations||{};return [
 {operation:'relube',label:'Досмазывание',quantity:p.relube?.quantity,interval:p.relube?.interval,state:'CALCULATED'},
 {operation:'fullRenewal',label:'Полное обновление',quantity:p.renewal?.quantity,interval:p.renewal?.interval,state:op.fullRenewal?.state||'NOT_APPLICABLE'}
 ]}
function presentationModel(result,input={}){const pkg=result?.calculationPackage||{},ctx=pkg.context||result?.calculationContext||{},rows=planRows(pkg);const fb=(pkg.methodPlan?.fallbacks||[]).find(x=>x.operation==='renewal.interval');const renewal=rows[1];if(!renewal.interval&&fb)renewal.interval=`${methodLabel(fb.method)} · fallback`;
 const relMethod=pkg.methodPlan?.relube?.interval||pkg.methodPlan?.relube?.quantity;const reitz=/^REITZ_/.test(relMethod||''),ventapp=relMethod==='VENTAPP_MACHINE',troester=relMethod==='TROESTER_BLOCK',ferrari=/^FERRARI_/.test(relMethod||''),universal=relMethod==='LUBRICA_UNIVERSAL_3_2';const conditions=[
  {id:'rpm',affects:true},{id:'temperatureC',affects:reitz||troester||universal},{id:'load',affects:universal},{id:'contamination',affects:ferrari||universal},{id:'vibration',affects:universal},{id:'orientation',affects:troester||universal}
 ].map(x=>({...x,label:conditionMeta.get(x.id)?.label||x.id,value:input[x.id]}));
 return {schemaVersion:'1.0',presenterVersion:'1.0.31.16',context:ctx,rows,renewalState:pkg.operations?.fullRenewal?.state||result?.fullRenewalLifecycleState||'NOT_APPLICABLE',fallback:fb||null,conditions,provenance:pkg.operations||{},extensions:{methods:[...methodMeta.keys()],operations:[...operationMeta.keys()],lifecycles:[...lifecycleMeta.keys()]}}}
function renderMethodMatrix(root,m){const box=root?.querySelector?.('[data-method-matrix]');if(!box)return;const by=m.rows.reduce((a,x)=>(a[x.operation]=x,a),{}),r=by.relube,n=by.fullRenewal;const vals={
 '[data-method-relube-dose]':methodLabel(r?.quantity),'[data-method-relube-interval]':methodLabel(r?.interval),
 '[data-method-renewal-dose]':n?.quantity?methodLabel(n.quantity):(m.renewalState==='NOT_APPLICABLE'?'Не применяется':'Не определено'),
 '[data-method-renewal-interval]':n?.interval?(methodMeta.has(n.interval)?methodLabel(n.interval):n.interval):(m.renewalState==='CONDITION_BASED'?'По состоянию / ТО':'Не определён')};Object.entries(vals).forEach(([s,v])=>{const e=root.querySelector(s);if(e)e.textContent=v})}
function renderOperating(root,m){const e=root?.querySelector?.('[data-operating-context-note]');if(!e)return;const active=m.conditions.filter(x=>x.affects).map(x=>x.label),context=m.conditions.filter(x=>!x.affects).map(x=>x.label);const b=e.querySelector('b'),s=e.querySelector('span');if(b)b.textContent='Влияние условий на текущую методику';if(s)s.textContent=`● влияют: ${active.join(', ')||'нет'} · ○ сохраняются как контекст: ${context.join(', ')||'нет'}.`}
function renderLifecycle(root,m,result){const panel=root?.querySelector?.('[data-renewal-status-panel]');if(!panel)return;const meta=lifecycleMeta.get(m.renewalState)||lifecycleMeta.get('REVIEW_REQUIRED');if(m.renewalState==='CALCULATED'){panel.hidden=true;panel.style.display='none';return}panel.hidden=false;panel.style.display='';const title=panel.querySelector('[data-renewal-status-title]'),body=panel.querySelector('[data-renewal-status-body]');if(title)title.textContent=meta.label;let text=meta.label;if(m.renewalState==='FALLBACK_AVAILABLE')text=`OEM определил количество ${result?.fullRenewal?.value??'—'} г. Для отсутствующей периодичности доступен ${methodLabel(m.fallback?.method)} только после явного подтверждения.`;else if(m.renewalState==='PARTIAL_OEM')text=`OEM определил количество ${result?.fullRenewal?.value??'—'} г, но период не определён.`;else if(m.renewalState==='NOT_APPLICABLE')text='Для выбранной конструкции плановый цикл полного обновления не назначается.';else if(m.renewalState==='CONDITION_BASED')text='Периодическая операция не назначена: обслуживание выполняется по состоянию, при ТО или по отдельному OEM-регламенту.';if(body){body.classList.toggle('calc-warning-note',meta.tone==='warn');body.innerHTML=`<b>${esc(meta.label)}</b><span>${esc(text)}</span>`}}

function unifyCalculatorShell(root,options={}){
 if(!root)return null;
 root.classList.add('unified-calculator');
 if(!root.classList.contains('simple-mode')&&!root.classList.contains('expert-mode'))root.classList.add('simple-mode');
 // By default all disclosure blocks are expert-only unless explicitly retained in simple mode.
 root.querySelectorAll('details:not([data-keep-simple])').forEach(d=>d.classList.add('expert-only'));
 // Normalize numbered sections. OEM/service context cards remain steps too so every calculator follows 01..N.
 [...root.querySelectorAll(':scope > .bearing-calc-modal-section')].forEach(sec=>sec.setAttribute('data-ui-step',''));
 const head=root.querySelector('.dialog-head>div');
 if(head&&!head.querySelector('.bearing-calc-mode-switch')){
   const sw=document.createElement('div');sw.className='bearing-calc-mode-switch';
   sw.innerHTML='<button type="button" class="mode-btn active" data-unified-calc-mode="simple">Простой режим</button><button type="button" class="mode-btn" data-unified-calc-mode="expert">Экспертный режим</button>'+(options.sources===false?'':'<button type="button" class="mode-btn" data-unified-calc-sources>Обоснование</button>');
   head.appendChild(sw);
 }
 const setMode=mode=>{
   const expert=mode==='expert';root.classList.toggle('expert-mode',expert);root.classList.toggle('simple-mode',!expert);
   root.querySelectorAll('[data-unified-calc-mode]').forEach(b=>b.classList.toggle('active',b.dataset.unifiedCalcMode===mode));
   const sections=[...root.querySelectorAll(':scope > .bearing-calc-modal-section[data-ui-step]')].filter(el=>expert||!el.classList.contains('expert-only'));
   sections.forEach((el,i)=>{const badge=el.querySelector('.bearing-calc-modal-title>span');if(badge)badge.textContent=String(i+1).padStart(2,'0')});
 };
 root.querySelectorAll('[data-unified-calc-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.unifiedCalcMode)));
 root.querySelector('[data-unified-calc-sources]')?.addEventListener('click',()=>{
   if(typeof options.onSources==='function')options.onSources();
   else global.LubricaBearingSources?.openRegistry?.({sourceIds:Array.isArray(options.sourceIds)&&options.sourceIds.length?options.sourceIds:undefined});
 });
 root.querySelectorAll('[data-footer-sources]').forEach(e=>e.hidden=true);
 setMode(options.initialMode==='expert'?'expert':'simple');
 return {setMode};
}
function render(root,result,input={}){const m=presentationModel(result,input);renderMethodMatrix(root,m);renderOperating(root,m);renderLifecycle(root,m,result);root?.setAttribute?.('data-calculation-presenter-version',m.presenterVersion);return m}
const API={registerMethod,registerOperation,registerLifecycle,registerCondition,presentationModel,render,methodLabel,unifyCalculatorShell,registries:{methodMeta,operationMeta,lifecycleMeta,conditionMeta}};
global.LubricaCalculationUIPresenter=API;global.LubricaSystem?.registerModule?.('Calculation UI Presenter','ok','Registry-driven presenter / v1.0.31.16');
})(window);
