(function(global){
'use strict';
const C=global.LubricaComponents,B=global.LubricaBearings;if(!C||!B)return;
C.registerAdapter('bearing',{list:()=>B.search('',{source:'all'}).map(x=>({id:x.id,designation:x.designation,name:x.designation,manufacturer:x.manufacturer||'',technicalData:{d:x.d,D:x.D,B:x.B,bearingType:x.bearingType},sourceReference:x.sourceReference||x.sourceNote||x.source||'',sourceType:x.sourceType==='override'?'custom':'builtin'})),lookup:q=>B.lookup(q)});
global.LubricaSystem?.registerModule?.('Bearing Component Adapter','ok','Bearing Library подключена к общему справочнику');
})(window);
