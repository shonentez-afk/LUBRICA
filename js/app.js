"use strict";
window.LubricaApp=window.LubricaApp||{
  version:(typeof APP_VERSION!=="undefined"?APP_VERSION:"unknown"),
  handlers:Object.create(null),
  booted:false,
  hasHandler(id,event){return !!this.handlers[`${id}:${event}`]},
  listHandlers(){return Object.keys(this.handlers)},
  refreshFromCore(){
    if(typeof window.refreshFromCore!=="function")throw new Error("Runtime refreshFromCore() is unavailable");
    return window.refreshFromCore();
  },
  showToast(message,type="info"){
    if(typeof window.toast==="function")return window.toast(message,type);
    return window.LubricaSystem?.toast?.(message,type);
  },
  renderAll(){
    if(typeof window.renderAll!=="function")throw new Error("Runtime renderAll() is unavailable");
    return window.renderAll();
  }
};
function bindUI(id,event,handler,{required=false}={}){
  const el=$("#"+id);
  if(!el){
    const msg=`UI element #${id} not found`;
    (required?console.error:console.warn)(msg);
    window.LubricaBootIssues=window.LubricaBootIssues||[];
    window.LubricaBootIssues.push({id,event,required,message:msg});
    window.LubricaSystem?.notify?.(msg,required?"error":"warn",{module:"bootstrap"});
    return null;
  }
  el.addEventListener(event,handler);
  window.LubricaApp.handlers[`${id}:${event}`]={id,event,required:!!required};
  return el;
}
function getRequiredUI(id){
  const el=$("#"+id);
  if(!el){
    const msg=`Required UI element #${id} not found`;
    console.error(msg);
    window.LubricaBootIssues=window.LubricaBootIssues||[];
    window.LubricaBootIssues.push({id,required:true,message:msg});
    window.LubricaSystem?.notify?.(msg,"error",{module:"bootstrap"});
  }
  return el;
}
function wire(){
  updateProjectName();
  bindUI("newDatabaseBtn","click",createNewDatabase,{required:true});
  bindUI("openJsonBtn","click",openJsonPicker,{required:true});
  bindUI("restoreRecoveryBtn","click",restoreRecoverySession);
  bindUI("saveJsonBtn","click",exportJson,{required:true});
  bindUI("jsonFileInput","change",e=>openJsonSelected(e.target.files?.[0]));
  bindUI("backupJsonFileInput","change",e=>restoreBackupSelected(e.target.files?.[0]));
  bindUI("importResultsBtn","click",()=>switchView("importResultsView"));
  bindUI("candidatesToImport","click",()=>switchView("importResultsView"));
  bindUI("candidatesReclassify","click",()=>{const db=LubricaCore.State.getDatabase();if(db&&window.LubricaClassifier){LubricaCore.State.setDatabase(LubricaClassifier.classifyDatabase(db).database);window.LubricaCandidates?.render?.()}});
  bindUI("importResultsToStructure","click",()=>switchView("structureView"));
  bindUI("importResultsToCandidates","click",()=>switchView("candidatesView"));
  bindUI("importResultsImport","click",()=>$("#importBtn")?.click());
  $$('.rail-item').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
  ["tableSearch","typeFilter","statusFilter"].forEach(id=>{const el=$("#"+id);if(el)el.addEventListener(id==="tableSearch"?"input":"change",renderTable)});
  bindUI("resetFilters","click",()=>{const a=$("#tableSearch"),b=$("#typeFilter"),c=$("#statusFilter");if(a)a.value="";if(b)b.value="all";if(c)c.value="all";renderTable()});
  bindUI("selectAll","change",e=>{visiblePoints().forEach(p=>e.target.checked?selectedRows.add(taskKey(p)):selectedRows.delete(taskKey(p)));updateBulkButton();renderTable()});
  bindUI("lineScopeSelect","change",applyWorkspaceScope);
  bindUI("areaScopeSelect","change",applyWorkspaceScope);
  bindUI("clearScopeBtn","click",()=>{scope="all";renderAll()});
  bindUI("openStructureBtn","click",()=>switchView("structureView"));
  bindUI("savePointBtn","click",savePoint);
  bindUI("approveTaskBtn","click",()=>window.LubricaTaskEditor?.toggleTaskApproval?.());
  bindUI("deletePointBtn","click",()=>selectedId&&confirmDelete(selectedId));
  bindUI("duplicateBtn","click",()=>duplicateTask(current()));
  bindUI("fillFromAnalogBtn","click",()=>window.LubricaAnalogs?.open?.({taskId:selectedId}));
  bindUI("addPointBtn","click",()=>window.LubricaStructure?.openPointWizard?.());
  bindUI("changeBindingBtn","click",()=>window.LubricaStructure?.editPointForTask?.(selectedId));
  bindUI("editEquipmentBtn","click",()=>selectedId&&window.LubricaStructure?.editEquipmentForTask?.(selectedId));
  bindUI("openMaterialsBtn","click",()=>switchView("materials"));
  bindUI("openBearingsBtn","click",()=>switchView("bearings"));
  bindUI("resolveBearingBtn","click",()=>window.LubricaTaskEditor?.resolveBearing?.());
  bindUI("addTaskBtn","click",()=>selectedId&&window.LubricaStructure?.addTaskForTask?.(selectedId));
  ["duplicateBtn","fillFromAnalogBtn","deletePointBtn"].forEach(id=>$("#"+id)?.addEventListener("click",()=>{$("#detailMoreMenu")?.removeAttribute("open")}));
  document.addEventListener("click",e=>{const m=$("#detailMoreMenu");if(m?.open&&!m.contains(e.target))m.removeAttribute("open")});
  bindUI("bulkBtn","click",bulkEdit);
  bindUI("columnsBtn","click",showColumnDialog);
  bindUI("calcBtn","click",()=>{if(!window.LubricaTaskEditor?.openCalculation?.())return;});
  bindUI("closeDetail","click",()=>{const panel=$("#detailPanel"),bench=$(".workbench");panel?.classList.add("hidden");bench?.classList.add("detail-closed")});
  bindUI("importBtn","click",()=>{if(window.LubricaCore?.State?.isDemo?.()!==false){toast("Для импорта сначала создайте или откройте рабочую базу","warn");return}const fi=$("#fileInput"),dz=$(".dropzone strong"),dlg=$("#importDialog");if(fi)fi.value="";if(dz)dz.textContent="Выберите файл или перетащите сюда";dlg?.showModal?.()},{required:true});
  const drop=$(".dropzone");
  if(drop){
    ["dragenter","dragover"].forEach(name=>drop.addEventListener(name,e=>{e.preventDefault();drop.classList.add("dragging")}));
    ["dragleave","drop"].forEach(name=>drop.addEventListener(name,e=>{e.preventDefault();drop.classList.remove("dragging")}));
    drop.addEventListener("drop",async e=>{const files=e.dataTransfer.files;if(!files.length)return;try{await handleFiles(files);$("#importDialog")?.close?.()}catch(err){toast(`Ошибка импорта: ${err.message}`,"error")}});
  }
  bindUI("fileInput","change",e=>{const dz=$(".dropzone strong");if(dz)dz.textContent=e.target.files.length?`Выбрано: ${Array.from(e.target.files).map(f=>f.name).join(", ")}`:"Выберите файл или перетащите сюда"});
  bindUI("processImport","click",async e=>{e.preventDefault();const files=$("#fileInput")?.files;if(!files?.length){toast("Выберите файл","warn");return}try{await handleFiles(files);$("#importDialog")?.close?.()}catch(err){toast(`Ошибка импорта: ${err.message}`,"error")}});
  bindUI("exportBtn","click",()=>{if(window.LubricaCore?.State?.isDemo?.()!==false){toast("Экспорт демонстрационной карты доступен только после создания рабочей базы","warn");return}exportWorkbook()},{required:true});
  document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();savePoint()}});
}
function flushRecoverySync(reason='safety'){
  try{if(window.LubricaCore?.State?.isDemo?.()===false){const db=LubricaCore.State.getDatabase();if(db)LubricaCore.Storage?.saveRecoverySync?.(db,reason)}}catch(e){console.warn('Recovery flush failed',e)}
}
function flushRecovery(reason='autosave'){
  try{if(window.LubricaCore?.State?.isDemo?.()===false){const db=LubricaCore.State.getDatabase();if(db)return LubricaCore.Storage?.saveRecovery?.(db,reason)}}catch(e){console.warn('Recovery autosave failed',e)}
  return Promise.resolve(false);
}
window.addEventListener('pagehide',()=>flushRecoverySync('pagehide'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){flushRecovery('hidden');autosaveActiveFile()}});
setInterval(()=>{if(window.LubricaCore?.State?.isDemo?.()===false){flushRecovery('interval');if(activeDatabaseFileHandle)autosaveActiveFile()}},30000);

function bootApplication(){
  window.LubricaBootIssues=[];
  try{
    wire();
    renderAll();
    window.LubricaBootOK=true;
    window.LubricaApp.booted=true;
    window.LubricaSystem?.registerModule?.("Application","ok",`Bootstrap completed · ${window.LubricaApp.listHandlers().length} handlers`);
  }catch(err){
    window.LubricaBootOK=false;
    window.LubricaApp.booted=false;
    window.LubricaBootError=err;
    console.error("Lubrica boot failed",err);
    window.LubricaSystem?.notify?.(`Ошибка запуска интерфейса: ${err?.message||err}`,"critical",{module:"bootstrap",stack:err?.stack||""});
    const msg=document.createElement('div');
    msg.id='bootErrorBanner';
    msg.style.cssText='position:fixed;left:100px;right:20px;top:10px;z-index:99999;background:#fff1f0;border:1px solid #d95c55;color:#842b27;padding:10px 14px;border-radius:8px;font:12px system-ui';
    msg.textContent='Ошибка запуска интерфейса: '+(err?.message||err)+'. Откройте диагностику или используйте предыдущую рабочую сборку.';
    document.body.appendChild(msg);
  }
}

bootApplication();

