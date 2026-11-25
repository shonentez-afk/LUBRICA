"use strict";
function csvCell(v){return`"${String(v??"").replace(/"/g,'""')}"`}
function download(name,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},200)}
let activeDatabaseFileHandle=null;
let activeDatabaseDirectoryHandle=null;
let fileAutosaveTimer=null;
// File writes are serialized per application session. Never queue a stale database snapshot.
let fileWriteTail=Promise.resolve(),activeFileSession=null,fileSessionEpoch=0;
function fileState(text){const el=$("#saveState");if(el)el.textContent=text}
function bindDatabaseFile(handle=null,baseline=null,directory=null){
  clearTimeout(fileAutosaveTimer);fileAutosaveTimer=null;fileSessionEpoch++;
  activeDatabaseFileHandle=handle;activeDatabaseDirectoryHandle=directory;
  activeFileSession=handle?{handle,baseline,lastSavedState:null,paused:false,reported:false}:null;
  return activeFileSession;
}
function staleFileError(e){return ['InvalidStateError','NotReadableError'].includes(e?.name)||/state cached in an interface object|state had changed since it was read from disk/i.test(String(e?.message||e))}
function externalFileChange(){const e=new Error('JSON-файл изменён вне текущей сессии. Сохраните отдельную копию.');e.name='FileChangedError';return e}
async function readDatabaseFileText(handle){
  try{return await (await handle.getFile()).text()}
  catch(e){if(!staleFileError(e))throw e;return await (await handle.getFile()).text()}
}
async function sameFile(a,b){if(a===b)return true;if(!a||!b)return false;if(typeof a.isSameEntry!=='function')return a.name===b.name;return await a.isSameEntry(b)}
async function writeDatabaseToHandle(db,handle,session,{manual=false}={}){
  const snapshot=JSON.stringify(db,null,2);
  const ensure=()=>{if(!session||session!==activeFileSession||session.handle!==handle)throw new Error('Сессия файла изменилась')};
  ensure();
  let data=snapshot;
  if(manual){const copy=JSON.parse(snapshot);copy.appVersion=APP_VERSION;copy.meta={...(copy.meta||{}),exportedAt:new Date().toISOString()};data=JSON.stringify(copy,null,2)}
  let attempted=false;
  for(let attempt=0;attempt<2;attempt++){
    ensure();let writable=null;
    try{
      const disk=await readDatabaseFileText(handle);ensure();
      // A failed close may already have committed: compare exact contents before retry.
      if(attempted&&disk===data){session.baseline=data;session.lastSavedState=snapshot;return true}
      if(disk!==session.baseline)throw externalFileChange();
      if(!manual&&(disk===data||session.lastSavedState===snapshot)){session.lastSavedState=snapshot;return true}
      writable=await handle.createWritable({mode:'exclusive'});ensure();
      if(await readDatabaseFileText(handle)!==session.baseline)throw externalFileChange();ensure();
      attempted=true;await writable.write(data);ensure();
      if(await readDatabaseFileText(handle)!==session.baseline)throw externalFileChange();ensure();
      await writable.close();writable=null;
      const saved=await readDatabaseFileText(handle);ensure();
      if(saved!==data)throw externalFileChange();
      session.baseline=data;session.lastSavedState=snapshot;return true;
    }catch(e){
      if(writable&&typeof writable.abort==='function')try{await writable.abort()}catch(_){}
      if(session!==activeFileSession)throw e;
      if(attempt===0&&staleFileError(e))continue;
      throw e;
    }
  }
}
async function pauseFileAutosave(session,e){
  if(session!==activeFileSession)return false;
  session.paused=true;clearTimeout(fileAutosaveTimer);fileAutosaveTimer=null;
  let recovered=false;
  try{const db=LubricaCore.State.getDatabase();if(db)recovered=!!(await LubricaCore.Storage?.saveRecovery?.(db,'file-autosave-failed'))}catch(_){}
  if(session!==activeFileSession)return false;
  const conflict=e?.name==='FileChangedError',prefix=recovered?'● Автокопия обновлена':'● Изменения в памяти';
  fileState(prefix+' · '+(conflict?'JSON изменён извне':'запись JSON приостановлена')+' · сохраните копию');
  if(!session.reported){session.reported=true;console.warn('File autosave paused',e);
   window.LubricaSystem?.notify?.((conflict?'Автосохранение остановлено: JSON-файл изменён извне.':'Автосохранение в JSON-файл приостановлено: '+(e.message||e))+'. '+(recovered?'Автокопия обновлена.':'Надёжная автокопия не подтверждена.')+' Нажмите «Сохранить JSON» и выберите новый файл.','warn',{module:'autosave',stack:e?.stack||''});
  }
  return false;
}
function queueFileSave(session=activeFileSession,{manual=false}={}){
  if(!session)return Promise.resolve(true);
  const run=async()=>{
    if(session!==activeFileSession||session.paused||LubricaCore.State.isDemo()!==false)return false;
    try{
      const db=LubricaCore.State.getDatabase();if(!db)return false;
      const report=window.LubricaCore?.DatabaseSafety?.inspect?.(db);if(report&&!report.ok)throw new Error('Сохранение остановлено: '+report.issues.join(' '));
      await writeDatabaseToHandle(db,session.handle,session,{manual});
      if(session===activeFileSession)fileState('● '+(manual?'Сохранено':'Автосохранено')+' · '+session.handle.name);
      return session===activeFileSession;
    }catch(e){return await pauseFileAutosave(session,e)}
  };
  const result=fileWriteTail.then(run,run);fileWriteTail=result.catch(()=>false);return result;
}
function preferredDatabaseName(db){const plant=String(db?.plants?.[0]?.name||'').trim(),project=String(db?.project?.name||'').trim();return ((!plant||/^завод$/i.test(plant))&&project&&!/^завод$/i.test(project))?project:(plant||project||'Рабочая база')}
function backupFileName(db){const base=safeDbFileName(preferredDatabaseName(db)).replace(/\.json$/i,'');const d=new Date(),pad=n=>String(n).padStart(2,'0');return `${base}_backup_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`}
async function autosaveActiveFile(){if(window.LubricaCore?.State?.isDemo?.()!==false||!activeFileSession)return true;return queueFileSave()}
function scheduleFileAutosave(event){
  // General JSON import and recovery also activate databases. Detach the old file
  // synchronously, before the new database could be written to the previous file.
  if(event?.detail?.reason==='activate'||event?.detail?.reason==='demo-start'){bindDatabaseFile();return}
  if(window.LubricaCore?.State?.isDemo?.()!==false||!activeFileSession||activeFileSession.paused)return;
  clearTimeout(fileAutosaveTimer);fileAutosaveTimer=setTimeout(()=>{fileAutosaveTimer=null;autosaveActiveFile()},700)
}
window.addEventListener('lubrica:database-changed',scheduleFileAutosave);
async function createBackupJson(){if(window.LubricaCore?.State?.isDemo?.()!==false){toast('Бекап создаётся только для рабочей базы','warn');return}const db=LubricaCore.State.getDatabase();if(!db)return;download(backupFileName(db),new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));toast('Резервная копия JSON создана')}
function restoreBackupPicker(){const i=$("#backupJsonFileInput");if(i){i.value='';i.click()}}
async function restoreRecoverySession(){
  try{
    if(!window.LubricaCore?.State?.hasRecovery?.()){toast('Автокопия рабочей базы не найдена','warn');return}
    const meta=LubricaCore.Storage?.getRecoveryMeta?.();
    const label=meta?.savedAt?new Date(meta.savedAt).toLocaleString('ru-RU'):'неизвестное время';
    if(!confirm(`Восстановить рабочую базу из автокопии (${label})? Демонстрационная база будет закрыта.`))return;
    const snapshot=await LubricaCore.Storage?.loadRecovery?.();
    if(!snapshot){toast('Автокопия не найдена','warn');return}
    if(window.LubricaCore?.State?.isDemo?.()===false&&!(await prepareDatabaseSwitch()))return;
    const legacy=LubricaCore.State.activateDatabase(snapshot,'recovery');
    if(!legacy){toast('Автокопия не найдена','warn');return}
    state=legacy;bindDatabaseFile();selectedId=state.points?.[0]?.id||null;selectedRows.clear();scope='all';
    updateProjectName();renderAll();window.LubricaStructure?.render?.();toast('Рабочая база восстановлена из автокопии');
  }catch(e){toast(`Ошибка восстановления автокопии: ${e.message}`,'error')}
}
async function restoreBackupSelected(file){if(!file)return;try{const prepared=window.LubricaCore?.DatabaseSafety?.parseAndPrepare?LubricaCore.DatabaseSafety.parseAndPrepare(await file.text(),file.name):{database:JSON.parse(await file.text()),migrated:false,report:{warnings:[]}};if(!confirm('Восстановить рабочую базу из этой резервной копии? Текущий файл не будет перезаписан автоматически.'))return;if(window.LubricaCore?.State?.isDemo?.()===false&&!(await prepareDatabaseSwitch()))return;bindDatabaseFile();state=LubricaCore.State.activateDatabase(prepared.database,'backup');selectedId=state.points?.[0]?.id||null;selectedRows.clear();scope='all';updateProjectName();renderAll();window.LubricaStructure?.render?.();toast('Бекап восстановлен в рабочую сессию. Для записи на диск нажмите «Сохранить JSON».')}catch(e){toast(`Ошибка восстановления бекапа: ${e.message}`,'error')}}
function safeDbFileName(name){const x=String(name||'База карты смазки').trim().replace(/[\/:*?"<>|]+/g,'_').replace(/\s+/g,'_');return (x||'База_карты_смазки')+'.json'}
async function prepareDatabaseSwitch(){
  if(window.LubricaCore?.State?.isDemo?.()!==false)return true;
  try{clearTimeout(fileAutosaveTimer);fileAutosaveTimer=null;const disk=await autosaveActiveFile();await fileWriteTail;const recovery=await flushRecovery('database-switch');const archived=await LubricaCore.Storage?.archiveCurrent?.('database-switch');if(!disk||!recovery||!archived)return confirm('Не все защитные копии подтверждены. Сохраните отдельный JSON перед сменой базы. Всё равно продолжить?');return true}catch(e){console.warn('Database switch safety failed',e);window.LubricaSystem?.notify?.(`Не удалось завершить защитное сохранение перед сменой базы: ${e.message||e}`,'error',{module:'autosave',stack:e?.stack||''});return confirm('Не удалось полностью завершить защитное автосохранение. Всё равно продолжить?')}
}
async function restoreArchivedSession(){
  try{const db=await LubricaCore.Storage?.loadArchivedRecovery?.();if(!db){toast('Предыдущая рабочая сессия не найдена','warn');return}if(!confirm('Восстановить предыдущую рабочую сессию?'))return;if(window.LubricaCore?.State?.isDemo?.()===false&&!(await prepareDatabaseSwitch()))return;state=LubricaCore.State.activateDatabase(db,'archived-recovery');bindDatabaseFile();selectedId=state.points?.[0]?.id||null;selectedRows.clear();scope='all';updateProjectName();renderAll();window.LubricaStructure?.render?.();toast('Предыдущая рабочая сессия восстановлена')}catch(e){toast(`Ошибка восстановления: ${e.message}`,'error')}
}
async function createNewDatabase(){
  const proceed=()=>openAction("Новая база","Укажите название базы. После нажатия «Выбрать папку» приложение предложит каталог для хранения JSON-файла.",[{label:"Отмена",kind:"ghost"},{label:"Выбрать папку и создать",kind:"primary",run:async()=>{const name=$("#newDatabaseName")?.value.trim()||"Новая база";try{let dir=null,fileHandle=null,baseline=null;if(window.showDirectoryPicker){dir=await window.showDirectoryPicker({mode:'readwrite'});fileHandle=await dir.getFileHandle(safeDbFileName(name),{create:true});baseline=await readDatabaseFileText(fileHandle);if(baseline.length)throw new Error('Файл с таким названием уже существует. Выберите другое название базы.')}const db=LubricaCore.Database.createEmpty(name);db.rules=clone(defaultRules);state=LubricaCore.State.activateDatabase(db,'new');selectedId=null;selectedRows.clear();scope="all";const session=bindDatabaseFile(fileHandle,baseline,dir),saved=fileHandle?await queueFileSave(session,{manual:true}):false;updateProjectName();renderAll();$$(`.main-view`).forEach(v=>v.classList.toggle("active",v.id==="structureView"));$$(`.rail-item`).forEach(b=>b.classList.toggle("active",b.dataset.view==="structureView"));window.LubricaStructure?.render?.();toast(saved?`Создана база ${fileHandle.name}`:'Новая база открыта. Для записи на диск используйте «Сохранить JSON».');return true}catch(err){if(err?.name==='AbortError')return false;toast(`Не удалось создать базу: ${err.message}`,"error");return false}}}],`<label>Название базы<input id="newDatabaseName" value="Новая база" autofocus></label><small class="field-help">В Chrome/Edge можно выбрать папку и сразу создать JSON. В других браузерах будет доступно обычное сохранение файла.</small>`);
  const db=window.LubricaCore?.State?.getDatabase?.();const hasData=window.LubricaCore?.State?.isDemo?.()===false;if(hasData)openAction("Создать новую базу?","Текущая база будет заменена в приложении. Сохраните её при необходимости.",[{label:"Отмена",kind:"ghost"},{label:"Продолжить",kind:"danger",run:async()=>{if(await prepareDatabaseSwitch())proceed();return true}}]);else proceed();
}
async function openJsonPicker(){if(window.LubricaCore?.State?.isDemo?.()===false){if(!confirm('Открыть другую базу? Текущая рабочая база будет предварительно автосохранена.'))return;if(!(await prepareDatabaseSwitch()))return}try{if(window.showOpenFilePicker){const [h]=await window.showOpenFilePicker({multiple:false,types:[{description:'JSON база LUBRICA',accept:{'application/json':['.json']}}]});if(!h)return;const raw=await readDatabaseFileText(h);await openJsonSelected({name:h.name,text:async()=>raw},h);return}}catch(e){if(e?.name==='AbortError')return;console.warn(e)}const input=$("#jsonFileInput");if(!input)return;input.value="";input.click()}
async function openJsonSelected(file,handle=null){
  if(!file)return false;
  try{
    const raw=await file.text();
    await handleFiles([{name:file.name,text:async()=>raw}]);
    bindDatabaseFile(handle,handle?raw:null);
    updateProjectName();window.LubricaStructure?.render?.();
    toast(handle?"JSON-база открыта · автосохранение в файл включено":"JSON-база открыта · изменения сохраняются локально; «Сохранить JSON» выберет файл");
    return true;
  }catch(err){toast(`Ошибка открытия JSON: ${err.message}`,"error");return false}
}
async function exportJson(){
  if(window.LubricaCore?.State?.isDemo?.()!==false){toast('Сначала создайте новую рабочую базу или откройте JSON','warn');return}
  const current=window.LubricaCore?.State?.getDatabase?.();if(!current){toast('Рабочая база недоступна','error');return}
  const report=window.LubricaCore?.DatabaseSafety?.inspect?.(current);if(report&&!report.ok){toast('Сохранение остановлено: '+report.issues.join(' '),'error');return}
  const old=activeFileSession;
  if(old&&!old.paused){const ok=await queueFileSave(old,{manual:true});if(ok)toast('База сохранена: '+old.handle.name);else if(old===activeFileSession)toast('Запись остановлена. Нажмите «Сохранить JSON» повторно и выберите новый файл.','warn');return}
  const epoch=fileSessionEpoch,copyName=old?.paused?backupFileName(current):safeDbFileName(preferredDatabaseName(current));
  try{
    if(window.showSaveFilePicker){
      const handle=await window.showSaveFilePicker({suggestedName:copyName,types:[{description:'JSON база LUBRICA',accept:{'application/json':['.json']}}]});
      if(!handle||epoch!==fileSessionEpoch)return;
      if(old?.paused&&await sameFile(handle,old.handle)){toast('Выберите другой JSON-файл, чтобы сохранить обе версии базы.','warn');return}
      const baseline=await readDatabaseFileText(handle);
      if(epoch!==fileSessionEpoch)return;
      const session=bindDatabaseFile(handle,baseline);if(await queueFileSave(session,{manual:true}))toast('База сохранена: '+handle.name);
      return;
    }
  }catch(err){if(err?.name==='AbortError')return;toast(`Не удалось выбрать файл: ${err.message}. Сохраняется отдельная копия.`,'warn')}
  if(epoch!==fileSessionEpoch)return;
  const db=JSON.parse(JSON.stringify(LubricaCore.State.getDatabase()));
  db.appVersion=APP_VERSION;db.meta={...(db.meta||{}),exportedAt:new Date().toISOString()};
  download(copyName,new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));toast('JSON-копия подготовлена');
}
