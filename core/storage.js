(function(global){
  'use strict';
  const Core=global.LubricaCore=global.LubricaCore||{};
  const KEY_V2='lubrica-recovery-v2';
  const KEY_PREV='lubrica-recovery-prev-v2';
  const KEY_META='lubrica-recovery-meta-v2';
  const KEY_ARCHIVE='lubrica-recovery-last-session-v2';
  const KEY_ARCHIVE_META='lubrica-recovery-last-session-meta-v2';
  const KEY_V1='lubrica-work-v1';
  const DB_NAME='lubrica-recovery-store';
  const STORE='snapshots';

  function normalize(db){return Core.Database.normalize(db)}
  function metaFor(db,reason='change'){
    return {savedAt:new Date().toISOString(),reason,projectName:db?.plants?.[0]?.name||db?.project?.name||'Рабочая база',schemaVersion:db?.schemaVersion||'2.0'};
  }
  function setMeta(meta){try{localStorage.setItem(KEY_META,JSON.stringify(meta))}catch(e){}}
  function getRecoveryMeta(){try{return JSON.parse(localStorage.getItem(KEY_META)||'null')}catch(e){return null}}
  function hasRecovery(){return !!getRecoveryMeta()}

  function openRecoveryDb(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in global)) return resolve(null);
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function idbGet(key){
    try{const db=await openRecoveryDb();if(!db)return null;return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}catch(e){return null}
  }
  async function idbPut(key,value){
    try{const db=await openRecoveryDb();if(!db)return false;await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});return true}catch(e){return false}
  }
  async function idbDelete(key){try{const db=await openRecoveryDb();if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}catch(e){}}

  // localStorage is intentionally only a small emergency fallback.
  // Large production databases belong in IndexedDB; duplicating them in
  // localStorage quickly exceeds the browser's ~5 MB per-origin quota.
  const LOCAL_FALLBACK_MAX_CHARS=750000;
  let localFallbackNoticeShown=false;
  let recoveryUnavailableNoticeShown=false;
  function serializedForLocal(db){
    try{
      const raw=JSON.stringify(db);
      return raw.length<=LOCAL_FALLBACK_MAX_CHARS?raw:null;
    }catch(e){return null}
  }
  function purgeLegacyActiveLocalCopies(){
    try{localStorage.removeItem(KEY_V2);localStorage.removeItem(KEY_PREV)}catch(e){}
  }
  function saveLocalFallback(db,meta,{quiet=false}={}){
    const raw=serializedForLocal(db);
    if(raw===null){
      setMeta(meta);
      // This is expected for a normal production database. Do not emit an
      // error every autosave cycle: IndexedDB is the primary recovery store.
      return false;
    }
    try{
      const previous=localStorage.getItem(KEY_V2);
      if(previous&&previous.length<=LOCAL_FALLBACK_MAX_CHARS)try{localStorage.setItem(KEY_PREV,previous)}catch(e){}
      localStorage.setItem(KEY_V2,raw);
      setMeta(meta);
      return true;
    }catch(e){
      setMeta(meta);
      if(!quiet&&!localFallbackNoticeShown){
        localFallbackNoticeShown=true;
        console.warn('localStorage recovery fallback unavailable',e);
        global.LubricaSystem?.notify?.('Локальный резерв localStorage недоступен; recovery продолжает сохраняться в IndexedDB.','warn',{module:'storage'});
      }
      return false;
    }
  }
  let recoveryWriteChain=Promise.resolve();
  function saveRecovery(db,reason='change'){
    const normalized=normalize(db),meta=metaFor(normalized,reason);
    recoveryWriteChain=recoveryWriteChain.then(async()=>{
      const canUseIdb=('indexedDB' in global);
      if(canUseIdb){
        const old=await idbGet('active');
        if(old)await idbPut('previous',old);
        const ok=await idbPut('active',{database:normalized,meta});
        if(ok){
          setMeta(meta);
          // Remove old multi-megabyte local copies after the durable IndexedDB
          // snapshot exists. This also repairs installations already at quota.
          purgeLegacyActiveLocalCopies();
          return true;
        }
      }
      const localOk=saveLocalFallback(normalized,meta);
      if(!localOk&&canUseIdb&&!recoveryUnavailableNoticeShown){
        recoveryUnavailableNoticeShown=true;
        global.LubricaSystem?.notify?.('Не удалось обновить recovery-копию. Проверьте доступность хранилища браузера.','warn',{module:'storage'});
      }
      return localOk;
    }).catch(e=>{
      console.warn('Recovery save failed',e);
      const localOk=saveLocalFallback(normalized,meta);
      if(!localOk&&!recoveryUnavailableNoticeShown){recoveryUnavailableNoticeShown=true;global.LubricaSystem?.notify?.(`Recovery недоступен: ${e.message||e}`,'warn',{module:'storage',stack:e?.stack||''})}
      return localOk;
    });
    return recoveryWriteChain;
  }
  function saveRecoverySync(db,reason='pagehide'){
    const normalized=normalize(db),meta=metaFor(normalized,reason);
    setMeta(meta);
    if('indexedDB' in global){
      // Keep the synchronous path quota-safe. A normal async snapshot is
      // already maintained during editing and every 30 seconds; start one
      // more write for browsers that allow it during pagehide.
      saveRecovery(normalized,reason);
      return true;
    }
    return saveLocalFallback(normalized,meta,{quiet:true});
  }
  function safeStoredDatabase(data,label='Recovery'){
    try{
      if(Core.DatabaseSafety?.prepareRecovery){
        const prepared=Core.DatabaseSafety.prepareRecovery(data);
        return prepared?.database||null;
      }
      return Core.Migration.toDatabase(data);
    }catch(e){
      global.LubricaSystem?.notify?.(`${label} повреждён и не будет открыт: ${e.message||e}`,'error',{module:'storage'});
      return null;
    }
  }
  async function loadRecovery(){
    const active=await idbGet('active');
    if(active?.database){const db=safeStoredDatabase(active.database,'Recovery IndexedDB');if(db)return db}
    try{const raw=localStorage.getItem(KEY_V2);if(raw){const db=safeStoredDatabase(JSON.parse(raw),'Recovery localStorage');if(db)return db}}catch(e){global.LubricaSystem?.notify?.(`Recovery localStorage повреждён: ${e.message||e}`,'error',{module:'storage'})}
    try{const raw=localStorage.getItem(KEY_V1);if(raw){const db=safeStoredDatabase(JSON.parse(raw),'Recovery v1');if(db)return db}}catch(e){global.LubricaSystem?.notify?.(`Recovery v1 повреждён: ${e.message||e}`,'error',{module:'storage'})}
    return null;
  }
  async function loadPreviousRecovery(){
    const prev=await idbGet('previous');
    if(prev?.database){const db=safeStoredDatabase(prev.database,'Предыдущий Recovery');if(db)return db}
    try{const raw=localStorage.getItem(KEY_PREV);if(raw){const db=safeStoredDatabase(JSON.parse(raw),'Предыдущий Recovery');if(db)return db}}catch(e){global.LubricaSystem?.notify?.(`Предыдущий Recovery повреждён: ${e.message||e}`,'error',{module:'storage'})}
    return null;
  }
  async function archiveCurrent(reason='database-switch'){
    const db=await loadRecovery();
    if(!db)return false;
    const meta={...metaFor(db,reason),archivedAt:new Date().toISOString()};
    const idbOk=await idbPut('last-session',{database:db,meta});
    try{
      localStorage.setItem(KEY_ARCHIVE_META,JSON.stringify(meta));
      const raw=serializedForLocal(db);
      if(raw!==null)localStorage.setItem(KEY_ARCHIVE,raw);
      else localStorage.removeItem(KEY_ARCHIVE);
    }catch(e){}
    return idbOk||!!serializedForLocal(db);
  }
  async function loadArchivedRecovery(){
    const archived=await idbGet('last-session');
    if(archived?.database){const db=safeStoredDatabase(archived.database,'Архивная сессия');if(db)return db}
    try{const raw=localStorage.getItem(KEY_ARCHIVE);if(raw){const db=safeStoredDatabase(JSON.parse(raw),'Архивная сессия');if(db)return db}}catch(e){global.LubricaSystem?.notify?.(`Архивная сессия повреждена: ${e.message||e}`,'error',{module:'storage'})}
    return null;
  }
  function getArchivedRecoveryMeta(){try{return JSON.parse(localStorage.getItem(KEY_ARCHIVE_META)||'null')}catch(e){return null}}
  async function clearRecovery(){
    try{localStorage.removeItem(KEY_V2);localStorage.removeItem(KEY_PREV);localStorage.removeItem(KEY_META)}catch(e){}
    await idbDelete('active');await idbDelete('previous');
  }
  // Compatibility aliases: recovery is never auto-opened on application start.
  function loadDatabase(){return null}
  function saveDatabase(db){saveRecovery(db,'compat');return true}
  function clearSession(){return clearRecovery()}

  Core.Storage={KEY_V2,KEY_PREV,KEY_META,KEY_ARCHIVE,KEY_ARCHIVE_META,KEY_V1,loadDatabase,saveDatabase,clearSession,saveRecovery,saveRecoverySync,loadRecovery,loadPreviousRecovery,archiveCurrent,loadArchivedRecovery,getArchivedRecoveryMeta,hasRecovery,getRecoveryMeta,clearRecovery};
})(window);
