(function(global){
  'use strict';
  const Core=global.LubricaCore=global.LubricaCore||{};
  function nextFrom(items,prefix,width=4){const re=new RegExp('^'+prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'-?(\\d+)$','i');let max=0;for(const item of items||[]){const raw=typeof item==='string'?item:item?.id;const m=String(raw||'').match(re);if(m)max=Math.max(max,+m[1]||0)}return `${prefix}-${String(max+1).padStart(width,'0')}`}
  function nextLegacyPointId(points){let max=0;for(const p of points||[])max=Math.max(max,Number(String(p.id||'').replace(/\D/g,''))||0);return `LUB-${String(max+1).padStart(4,'0')}`}
  Core.IDs={nextFrom,nextLegacyPointId};
})(window);
