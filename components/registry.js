(function(global){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=v=>String(v??'').trim();
const categories=[
 ['bearing','Подшипники качения'],
 ['linear_bearing','Линейные направляющие и втулки качения'],
 ['ball_screw','Шарико-винтовые передачи (ШВП)'],
 ['chain','Цепные передачи'],
 ['gearbox_oil','Редукторы и мотор-редукторы'],
 ['coupling','Муфты'],
 ['bushing','Втулки скольжения'],
 ['joint','Шарнирные соединения'],
 ['guide','Направляющие скольжения'],
 ['screw_drive','Винтовые передачи скольжения'],
 ['open_gear','Открытые зубчатые передачи'],
 ['wire_rope','Стальные канаты'],
 ['oil_system','Масляные системы'],
 ['central_point','Централизованные системы смазки'],
 ['other','Прочие элементы']
];
const defs=new Map(categories.map(([id,title])=>[id,{id,title}]));
const adapters=new Map();
function registerCategory(def){if(!def?.id)throw new Error('Component category id required');defs.set(def.id,{...defs.get(def.id),...def});return defs.get(def.id)}
function registerAdapter(category,adapter){if(!category||!adapter)throw new Error('Component adapter required');adapters.set(category,adapter);return adapter}
function db(){return global.LubricaCore?.State?.getDatabase?.()}
function custom(){return db()?.componentLibraryEntries||[]}
function all(category='all'){
 let out=[];
 for(const [id,def] of defs){const a=adapters.get(id);if(a?.list)out.push(...a.list().map(x=>({...x,category:id,categoryTitle:def.title,sourceType:x.sourceType||'builtin'})))}
 out.push(...custom().map(x=>({...x,categoryTitle:defs.get(x.category)?.title||x.category,sourceType:'custom'})));
 return category==='all'?out:out.filter(x=>x.category===category);
}
function search(query='',category='all'){
 const q=clean(query).toLowerCase();return all(category).filter(x=>!q||[x.designation,x.name,x.model,x.manufacturer,x.standard,x.notes,x.alias].some(v=>clean(v).toLowerCase().includes(q)));
}
function save(payload){
 const d=db();if(!d)throw new Error('Рабочая база не открыта');d.componentLibraryEntries=d.componentLibraryEntries||[];
 let x=payload.id?d.componentLibraryEntries.find(v=>v.id===payload.id):null;
 if(!x){x={id:global.LubricaCore.IDs.nextFrom(d.componentLibraryEntries,'CMPREF',5)};d.componentLibraryEntries.push(x)}
 Object.assign(x,{category:payload.category||'other',designation:clean(payload.designation),name:clean(payload.name),manufacturer:clean(payload.manufacturer),model:clean(payload.model),standard:clean(payload.standard),sourceReference:clean(payload.sourceReference),notes:clean(payload.notes),technicalData:payload.technicalData||{},lubricationData:payload.lubricationData||{},updatedAt:new Date().toISOString()});
 global.LubricaCore.State.setDatabase(global.LubricaCore.Database.normalize(d));global.LubricaApp?.refreshFromCore?.();return clone(x)
}
function remove(id){const d=db();if(!d)return false;const i=(d.componentLibraryEntries||[]).findIndex(x=>x.id===id);if(i<0)return false;d.componentLibraryEntries.splice(i,1);global.LubricaCore.State.setDatabase(global.LubricaCore.Database.normalize(d));return true}
global.LubricaComponents=Object.freeze({categories:()=>[...defs.values()].map(clone),registerCategory,registerAdapter,all,search,save,remove,getCustom:()=>clone(custom())});
global.LubricaSystem?.registerModule?.('Component Library','ok','Единый справочник элементов');
})(window);
