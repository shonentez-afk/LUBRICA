(function(global){
'use strict';
const modules=new Map();

function normalizeModule(def){
  if(!def||!def.id)throw new Error('Calculation module id is required');
  return Object.freeze({
    id:String(def.id),
    title:def.title||String(def.id),
    description:def.description||'',
    categories:Array.isArray(def.categories)?[...def.categories]:[],
    activityTypes:Array.isArray(def.activityTypes)?[...def.activityTypes]:[],
    priority:Number(def.priority)||0,
    status:def.status||'ready',
    version:def.version||'1',
    canOpen:typeof def.canOpen==='function'?def.canOpen:null,
    open:typeof def.open==='function'?def.open:null,
    summarize:typeof def.summarize==='function'?def.summarize:null,
    capabilities:Array.isArray(def.capabilities)?[...def.capabilities]:[]
  });
}
function register(def){
  const module=normalizeModule(def);
  modules.set(module.id,module);
  return module;
}
function unregister(id){return modules.delete(String(id))}
function list(){return [...modules.values()].sort((a,b)=>b.priority-a.priority||a.title.localeCompare(b.title,'ru'))}
function matches(module,context={}){
  if(module.categories.length&& !module.categories.includes(context.category||context.point?.category))return false;
  if(module.activityTypes.length&& !module.activityTypes.includes(context.activityType||context.task?.activityType))return false;
  if(module.canOpen&&!module.canOpen(context))return false;
  return true;
}
function resolve(context={}){
  return list().find(m=>matches(m,context))||null;
}
function byId(id){return modules.get(String(id))||null}
function statusFor(context={}){
  const m=resolve(context);
  if(!m)return {registered:false,ready:false,module:null,message:'Для этой категории расчётный модуль ещё не зарегистрирован.'};
  return {
    registered:true,
    ready:m.status==='ready'&&typeof m.open==='function',
    module:m,
    message:m.status==='ready'?'Расчётный модуль доступен.':(m.description||'Расчётный модуль запланирован.')
  };
}
global.LubricaCalculationRegistry=Object.freeze({register,unregister,list,resolve,byId,statusFor});
global.LubricaSystem?.registerModule?.('Calculation Registry','ok','Загружен');
})(window);
