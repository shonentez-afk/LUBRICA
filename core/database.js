(function(global){
  'use strict';
  const Core=global.LubricaCore=global.LubricaCore||{},S=Core.DatabaseSchema,N=Core.DatabaseNormalizer,M=Core.DatabaseMigrations;
  if(!S||!N||!M)throw new Error('Database modules load order is invalid');
  Core.Database=Object.freeze({createEmpty:S.createEmpty,fromLegacy:M.fromLegacy,toLegacy:M.toLegacy,normalize:N.normalize,syncLegacy:M.syncLegacy});
})(window);
