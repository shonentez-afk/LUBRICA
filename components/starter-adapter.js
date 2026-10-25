(function(global){
'use strict';
const C=global.LubricaComponents,rows=Array.isArray(global.LubricaComponentStarterData)?global.LubricaComponentStarterData:[];
if(!C)throw new Error('Component Library required before Starter Catalog Adapter');
const cats=[...new Set(rows.map(x=>x.category))];
for(const category of cats){
  C.registerAdapter(category,{list:()=>rows.filter(x=>x.category===category).map(x=>({...x,sourceType:'builtin'}))});
}
global.LubricaSystem?.registerModule?.('Component Starter Catalog','ok',`${rows.length} стартовых записей`);
})(window);
