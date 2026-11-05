(function(global){
  'use strict';
  const Core=global.LubricaCore=global.LubricaCore||{};
  const clone=x=>JSON.parse(JSON.stringify(x));
  const now=()=>new Date().toISOString();
  const clean=s=>String(s??'').trim();
  const safeKey=s=>clean(s).toLowerCase().replace(/\s+/g,' ').replace(/[^a-zа-яё0-9|:_-]+/gi,'-');
  function uniqueBy(items,keyFn){const out=[],seen=new Set();for(const item of items){const k=keyFn(item);if(seen.has(k))continue;seen.add(k);out.push(item)}return out}
  function normalizePointCategory(value){const v=clean(value).toLowerCase();if(v==='motor'||v==='fan')return 'bearing';if(v==='gearbox')return 'gearbox_oil';return v||'other'}
  function inferEquipmentType(point){const legacy=clean(point?.type).toLowerCase();const text=`${clean(point?.equipment)} ${clean(point?.unit)}`.toLowerCase();if(legacy==='motor'||/электродвиг|\bмотор\b/.test(text))return 'motor';if(legacy==='fan'||/вентилятор|дымосос|воздуходув|эксгауст/.test(text))return 'fan';if(legacy==='gearbox'||/редуктор|мотор-редуктор|вариатор/.test(text))return 'gearbox';if(/конвейер|транспортер|транспортёр/.test(text))return 'conveyor';if(/насос/.test(text))return 'pump';return 'other'}
  function normalizeTaskApproval(value,verified=false){const v=clean(value).toLowerCase();if(v==='approved'||v==='ready'||verified)return 'approved';if(v==='draft')return 'draft';if(v==='disabled')return 'disabled';return 'review'}
  function createEmpty(projectName='Новая база'){
    return {schemaVersion:'2.0',appVersion:'1.0.33.71',meta:{createdAt:now(),updatedAt:now()},project:{name:projectName,code:'',description:''},plants:[],lines:[],areas:[],equipment:[],components:[],nodes:[],lubricationPoints:[],tasks:[],materials:[],routes:[],checklistRuns:[],tools:[],rules:{},imports:[],bearingOverrides:[],componentLibraryEntries:[]};
  }
  Core.DatabaseSchema=Object.freeze({clone,now,clean,safeKey,uniqueBy,normalizePointCategory,inferEquipmentType,normalizeTaskApproval,createEmpty});
})(window);
