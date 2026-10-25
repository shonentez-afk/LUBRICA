(function(global){
  'use strict';
  const MAX_EVENTS=120, STORAGE_KEY='lubrica-system-log-v1';
  const S=global.LubricaSystem=global.LubricaSystem||{};
  const events=[]; const modules=new Map(); let unread=0;
  function safeString(v){try{return typeof v==='string'?v:JSON.stringify(v)}catch(_){return String(v)}}
  function restore(){try{const a=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(Array.isArray(a))events.push(...a.slice(-40).map(x=>({...x,historical:true})))}catch(_){}}
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(events.slice(-40)))}catch(_){}}
  function levelLabel(level){return ({info:'Информация',success:'Готово',warn:'Предупреждение',error:'Ошибка',critical:'Критическая ошибка'})[level]||level}
  function renderStatus(){
    const btn=document.getElementById('systemStatusBtn'),count=document.getElementById('systemIssueCount');
    if(!btn)return;
    const current=events.filter(e=>!e.historical);
    const bad=current.filter(e=>e.level==='error'||e.level==='critical').length;
    const warn=current.filter(e=>e.level==='warn').length;
    btn.classList.toggle('system-error',bad>0);btn.classList.toggle('system-warn',bad===0&&warn>0);btn.classList.toggle('system-ok',bad===0&&warn===0);
    const label=bad?`Система: ${bad} ошибок`:warn?`Система: ${warn} предупрежд.`:'Система: OK';
    const text=btn.querySelector('[data-system-label]');if(text)text.textContent=label;
    if(count){count.textContent=unread;count.hidden=unread===0}
  }
  function toast(message,level='info',timeout){
    const t=document.getElementById('toast');if(!t)return;
    t.textContent=message;t.className=`toast show ${level==='critical'?'error':level}`;
    clearTimeout(S._toastTimer);S._toastTimer=setTimeout(()=>t.classList.remove('show'),timeout||((level==='error'||level==='critical')?7000:3000));
  }
  function record(level,message,context={}){
    const ev={id:`EV-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,at:new Date().toISOString(),level,message:String(message||'Событие'),module:context.module||'',source:context.source||'',line:context.line||0,column:context.column||0,stack:context.stack||'',detail:context.detail?safeString(context.detail):''};
    events.push(ev);while(events.length>MAX_EVENTS)events.shift();
    if(level==='warn'||level==='error'||level==='critical') unread++;
    persist();renderStatus();
    if(level==='warn'||level==='error'||level==='critical')toast(`${level==='warn'?'Предупреждение':'Ошибка'}: ${ev.message}`,level);
    if(level==='error'||level==='critical')console.error('[LUBRICA SYSTEM]',ev); else if(level==='warn')console.warn('[LUBRICA SYSTEM]',ev); else console.info('[LUBRICA SYSTEM]',ev);
    return ev;
  }
  function registerModule(name,status='ok',detail=''){modules.set(name,{name,status,detail,at:new Date().toISOString()});renderStatus()}
  function expectedModules(){return [
    ['Core.Database',!!global.LubricaCore?.Database],['Core.Storage',!!global.LubricaCore?.Storage],['Core.State',!!global.LubricaCore?.State],['Core.IDs',!!global.LubricaCore?.IDs],
    ['Structure',!!global.LubricaStructure],['Import Engine',!!global.LubricaImport],['Classifier',!!global.LubricaClassifier],['Candidates',!!global.LubricaCandidates],
    ['Materials UI',typeof global.renderMaterials==='function'],['Bearing Library',!!global.LubricaBearings],['Bearing Calculator',!!global.LubricaBearingCalculator],['Calculation Registry',!!global.LubricaCalculationRegistry],['Calculation Framework',!!global.LubricaCalculations],['Component Binding',!!global.LubricaComponentBinding],['Linear Bearing Calculator',!!global.LubricaLinearBearingCalculator],['Gearbox Oil Calculator',!!global.LubricaGearboxOilCalculator],['Chain Calculator',!!global.LubricaChainCalculator],['Coupling Calculator',!!global.LubricaCouplingCalculator],['Grease Point Calculator',!!global.LubricaGreasePointCalculator],['Ball Screw Calculator',!!global.LubricaBallScrewCalculator],['Bearing UI',typeof global.renderBearings==='function'],['Task Editor',!!global.LubricaTaskEditor],['Route Engine',!!global.LubricaRouteEngine],['Checklist Execution',!!global.LubricaChecklistEngine],['Bulk Edit',!!global.LubricaBulkEdit],['Routes UI',typeof global.renderRoutes==='function'],['Control UI',typeof global.renderProgramQA==='function'],['Settings UI',typeof global.renderSettings==='function'],['Application',!!global.LubricaApp&&global.LubricaApp.booted===true]
  ]}
  function healthCheck({notify=true}={}){
    const missing=[];expectedModules().forEach(([name,ok])=>{registerModule(name,ok?'ok':'error',ok?'Загружен':'Не найден');if(!ok)missing.push(name)});
    const bootIssues=global.LubricaBootIssues||[];for(const x of bootIssues){if(x.required)missing.push(`UI ${x.id||''}`)}
    if(missing.length&&notify)record('error',`Не загружены обязательные модули: ${[...new Set(missing)].join(', ')}`,{module:'health-check'});
    return {ok:missing.length===0,missing:[...new Set(missing)],modules:[...modules.values()]};
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function openPanel(){
    const dlg=document.getElementById('systemDialog');if(!dlg)return;
    unread=0;renderStatus();const health=healthCheck({notify:false});
    const moduleRows=health.modules.map(m=>`<tr><td>${escapeHtml(m.name)}</td><td><span class="system-pill ${m.status}">${m.status==='ok'?'OK':'Ошибка'}</span></td><td>${escapeHtml(m.detail||'')}</td></tr>`).join('');
    const eventRows=[...events].reverse().map(e=>`<div class="system-event ${e.level}"><div><b>${escapeHtml(levelLabel(e.level))}</b><time>${escapeHtml(new Date(e.at).toLocaleString('ru-RU'))}</time></div><strong>${escapeHtml(e.message)}</strong><small>${escapeHtml([e.module,e.source,e.line?`строка ${e.line}`:''].filter(Boolean).join(' · '))}</small>${e.stack?`<details><summary>Технические данные</summary><pre>${escapeHtml(e.stack)}</pre></details>`:''}</div>`).join('')||'<div class="system-empty">Ошибок и предупреждений в журнале нет.</div>';
    dlg.innerHTML=`<div class="system-dialog-head"><div><span class="eyebrow">ДИАГНОСТИКА</span><h2>Состояние приложения</h2><p>${health.ok?'Все обязательные модули загружены.':'Обнаружены проблемы загрузки.'}</p></div><button class="icon-btn" data-system-close>×</button></div><div class="system-dialog-grid"><section class="system-module-section"><h3>Модули</h3><div class="system-module-scroll"><table class="system-module-table"><tbody>${moduleRows}</tbody></table></div></section><section class="system-event-section"><h3>Журнал событий</h3><div class="system-event-list">${eventRows}</div></section></div><menu><button class="btn ghost" data-system-clear>Очистить журнал</button><button class="btn secondary" data-system-report>Сохранить отчёт</button><button class="btn primary" data-system-smoke>Запустить проверку</button></menu>`;
    dlg.querySelector('[data-system-close]')?.addEventListener('click',()=>dlg.close());
    dlg.querySelector('[data-system-clear]')?.addEventListener('click',()=>{events.length=0;persist();renderStatus();openPanel()});
    dlg.querySelector('[data-system-report]')?.addEventListener('click',downloadReport);
    dlg.querySelector('[data-system-smoke]')?.addEventListener('click',()=>{const r=global.LubricaDiagnostics?.runSmokeTest?.();if(r?.ok)record('success','Smoke-test завершён успешно',{module:'diagnostics'});openPanel()});
    if(!dlg.open)dlg.showModal();
  }
  function reportText(){const h=healthCheck({notify:false});return [`LUBRICA SYSTEM REPORT`,`Date: ${new Date().toISOString()}`,`URL: ${location.href}`,`User agent: ${navigator.userAgent}`,`Boot OK: ${global.LubricaBootOK===true}`,`Health OK: ${h.ok}`,'','MODULES',...h.modules.map(m=>`${m.status.toUpperCase()} | ${m.name} | ${m.detail||''}`),'','EVENTS',...events.map(e=>`${e.at} | ${e.level.toUpperCase()} | ${e.module||'-'} | ${e.message}${e.source?` | ${e.source}:${e.line||''}`:''}${e.stack?`\n${e.stack}`:''}`)].join('\n')}
  function downloadReport(){const blob=new Blob([reportText()],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Lubrica_diagnostics_${new Date().toISOString().replace(/[:.]/g,'-')}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  restore();
  global.addEventListener('error',e=>{
    const message=e.message||'Необработанная ошибка JavaScript';
    const opaqueFileError=location.protocol==='file:'&&message==='Script error.'&&!e.filename&&!e.error?.stack;
    if(opaqueFileError){
      console.warn('[LUBRICA SYSTEM] Игнорируется непрозрачное Chromium file:// событие Script error. без файла, строки и stack trace.');
      return;
    }
    record('critical',message,{module:'runtime',source:e.filename||'',line:e.lineno||0,column:e.colno||0,stack:e.error?.stack||''});
  });
  global.addEventListener('unhandledrejection',e=>{const r=e.reason;record('critical',r?.message||String(r||'Необработанная ошибка Promise'),{module:'promise',stack:r?.stack||''})});
  document.addEventListener('error',e=>{const el=e.target;if(el===global)return;if(el?.tagName==='SCRIPT'||el?.tagName==='LINK'){record('critical',`Не удалось загрузить ресурс: ${el.src||el.href||el.tagName}`,{module:'resource-loader',source:el.src||el.href||''})}},true);
  document.addEventListener('DOMContentLoaded',()=>{document.getElementById('systemStatusBtn')?.addEventListener('click',openPanel);renderStatus()},{once:true});
  S.record=record;S.notify=(message,level='info',context={})=>record(level,message,context);S.registerModule=registerModule;S.healthCheck=healthCheck;S.openPanel=openPanel;S.downloadReport=downloadReport;S.getEvents=()=>events.slice();S.toast=toast;
})(window);
