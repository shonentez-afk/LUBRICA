(function(global){
  'use strict';
  const Core=global.LubricaCore=global.LubricaCore||{};
  function toDatabase(data){
    if(data&&data.schemaVersion==='2.0') return Core.Database.normalize(data);
    if(data&&Array.isArray(data.points)) return Core.Database.fromLegacy(data);
    throw new Error('Неизвестный формат базы. Ожидается JSON v2 или резервная копия v1.');
  }
  function toLegacy(data){return Core.Database.toLegacy(toDatabase(data));}
  Core.Migration={toDatabase,toLegacy};
})(window);
