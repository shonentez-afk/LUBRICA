(function(global){
  'use strict';
  const Core=global.LubricaCore=global.LubricaCore||{};
  let database=null;
  let mode='demo';
  let source='demo';

  function notify(reason='change'){
    try{global.dispatchEvent(new CustomEvent('lubrica:database-changed',{detail:{database,mode,source,reason}}))}catch(e){}
  }
  function startDemo(fallbackLegacy){
    database=Core.Database.fromLegacy(fallbackLegacy);
    mode='demo';source='demo';
    notify('demo-start');
    return Core.Database.toLegacy(database);
  }
  function loadLegacy(fallbackLegacy){return startDemo(fallbackLegacy)}
  function saveLegacy(legacy){
    database=Core.Database.syncLegacy(database,legacy);
    if(mode==='work')Core.Storage.saveRecovery(database,'edit');
    notify('edit');
    return database;
  }
  function toDatabase(legacy){return Core.Database.fromLegacy(legacy)}
  function reconcileRuntimeBindings(){
    try{return global.LubricaComponentBinding?.reconcileDatabase?.(database)||null}catch(e){console.warn('Component binding reconciliation failed',e);return null}
  }
  function setDatabase(db){
    database=Core.Database.normalize(db);
    reconcileRuntimeBindings();
    if(mode==='work')Core.Storage.saveRecovery(database,'update');
    notify('update');
    return Core.Database.toLegacy(database);
  }
  function activateDatabase(db,newSource='json'){
    database=Core.Database.normalize(db);
    mode='work';source=newSource||'work';
    reconcileRuntimeBindings();
    Core.Storage.saveRecovery(database,'activate');
    notify('activate');
    return Core.Database.toLegacy(database);
  }
  async function restoreRecovery(){
    const db=await Core.Storage.loadRecovery();
    if(!db)return null;
    return activateDatabase(db,'recovery');
  }
  function getDatabase(){return database}
  function getMode(){return mode}
  function getSource(){return source}
  function isDemo(){return mode!=='work'}
  function hasRecovery(){return Core.Storage.hasRecovery()}
  Core.State={loadLegacy,startDemo,saveLegacy,toDatabase,setDatabase,activateDatabase,restoreRecovery,getDatabase,getMode,getSource,isDemo,hasRecovery};
})(window);
