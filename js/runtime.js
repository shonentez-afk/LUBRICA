"use strict";
const clone=x=>JSON.parse(JSON.stringify(x));
let state=loadState(),selectedId=state.points[0]?.id||null,scope="all",selectedRows=new Set(),hiddenColumns=new Set();
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
function loadState(){const fallback={points:clone(seedPoints),materials:clone(defaultMaterials),rules:clone(defaultRules),project:"Демонстрационная база"};try{if(window.LubricaCore?.State)return LubricaCore.State.loadLegacy(fallback)}catch(e){console.warn("Core load fallback",e)}return fallback}
function persist(message){
  let saved=false;
  const isDemo=window.LubricaCore?.State?.isDemo?.()!==false;
  try{if(window.LubricaCore?.State){LubricaCore.State.saveLegacy(state);saved=!isDemo}}catch(e){console.warn("Core save failed",e)}
  updateProjectName();
  if(message){
    if(isDemo)toast(`${message} · демо-режим: изменения не сохраняются после перезапуска`,"warn");
    else toast(message,"info");
  }
}
function toast(text,type="info"){if(window.LubricaSystem){if(type==="warn"||type==="error"||type==="critical")window.LubricaSystem.notify(text,type,{module:"ui"});else window.LubricaSystem.toast(text,type);return}const t=$("#toast");if(!t){console.warn("Toast container missing",text);return}t.textContent=text;t.className=`toast show ${type}`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),type==="error"?7000:3000)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function pointDisplayId(p){return p.pointDisplayId||p.lubricationPointId||p.id}
function taskKey(p){return p.taskId||p.id}
function uniquePointCount(rows=state.points){return new Set(rows.map(p=>p.lubricationPointId||p.pointDisplayId||p.id)).size}
function nextId(){return window.LubricaCore?.IDs?LubricaCore.IDs.nextLegacyPointId(state.points):`LUB-${String(state.points.length+1).padStart(4,"0")}`}
function evaluate(p){const missing=[];if(!p.equipment?.trim())missing.push("оборудование");if(!p.unit?.trim())missing.push("узел");if(!p.operation?.trim())missing.push("операция");if(!p.interval?.trim())missing.push("периодичность");if(!p.material?.trim()&&!['Контроль состояния','Проверка уровня','Осмотр масла','Контроль натяжения','Контроль удлинения','Очистка','Отбор пробы'].includes(p.operation))missing.push("материал");if(!p.position?.trim())missing.push("код оборудования");p.issues=missing;p.status=missing.length?"issue":p.verified?"ready":"review";return p}
function naturalIdParts(v){const s=String(v||'');const m=s.match(/^(.*?)(\d+)$/);return m?[m[1],Number(m[2])]:[s,Number.MAX_SAFE_INTEGER]}
function compareMapRows(a,b){const ap=naturalIdParts(a.lubricationPointId||pointDisplayId(a)||a.id),bp=naturalIdParts(b.lubricationPointId||pointDisplayId(b)||b.id);const prefix=ap[0].localeCompare(bp[0],'ru',{numeric:true,sensitivity:'base'});if(prefix)return prefix;if(ap[1]!==bp[1])return ap[1]-bp[1];const aid=naturalIdParts(taskKey(a)),bid=naturalIdParts(taskKey(b));const tp=aid[0].localeCompare(bid[0],'ru',{numeric:true,sensitivity:'base'});return tp||aid[1]-bid[1]}
function visiblePoints(){const q=$("#tableSearch")?.value.toLowerCase().trim()||"",type=$("#typeFilter")?.value||"all",status=$("#statusFilter")?.value||"all";return state.points.filter(p=>{const lineScope=scope.startsWith("line:")?scope.slice(5):null,areaScope=scope.startsWith("area:")?scope.slice(5):null;const pointArea=p.area||SCOPE_LABELS[p.scope]||p.scope||"";const scopeOk=scope==="all"||(scope==="line1"&&p.line==="Линия 1")||(scope==="line2"&&p.line==="Линия 2")||(lineScope&&p.line===lineScope)||(areaScope&&pointArea===areaScope)||p.scope===scope;return scopeOk&&(type==="all"||p.type===type)&&(status==="all"||p.status===status)&&`${pointDisplayId(p)} ${p.pointName||''} ${p.id} ${p.operation} ${p.equipment} ${p.unit} ${p.component} ${p.material} ${p.position}`.toLowerCase().includes(q)}).sort(compareMapRows)}
function refreshFromCore(){
  const database=window.LubricaCore?.State?.getDatabase?.();
  if(!database||!window.LubricaCore?.Database?.toLegacy)return state;
  window.LubricaComponentBinding?.reconcileDatabase?.(database);
  const previousSelected=selectedId;
  state=window.LubricaCore.Database.toLegacy(database);
  const keys=new Set(state.points.map(p=>String(taskKey(p))));
  selectedId=previousSelected&&keys.has(String(previousSelected))?previousSelected:(state.points[0]?taskKey(state.points[0]):null);
  return state;
}
function renderAll(){state.points.forEach(evaluate);renderMetrics();renderWorkspaceNavigator();renderTree();renderTable();fillDetail();const active=$(".main-view.active")?.id;if(active&&active!=="workspace")renderSecondary(active)}
function workspaceLines(){return [...new Set(state.points.map(p=>p.line).filter(Boolean))];}
function workspaceAreas(line="all"){return [...new Set(state.points.filter(p=>line==="all"||p.line===line).map(p=>p.area||SCOPE_LABELS[p.scope]||p.scope).filter(Boolean))];}
function lineKeyToName(v){if(v==="all")return "all";return v;}
