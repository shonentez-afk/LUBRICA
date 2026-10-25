(function(global){'use strict';
const TYPES=Object.freeze({calculation:'Расчёт',oem:'OEM / руководство',measured:'Измерение',engineer:'Решение инженера',condition:'По состоянию',na:'Не применимо'});
function normalize(x={}){return{type:TYPES[x.type]?x.type:'engineer',reference:String(x.reference||'').trim(),section:String(x.section||'').trim(),note:String(x.note||'').trim(),approvedBy:String(x.approvedBy||'').trim(),approvedAt:x.approvedAt||'',updatedAt:new Date().toISOString()}}
function set(point,key,value){if(!point||!key)return null;point.engineeringSources=point.engineeringSources||{};point.engineeringSources[key]=normalize(value);return point.engineeringSources[key]}
function get(point,key){return point?.engineeringSources?.[key]||null}
function completeness(point){const src=Object.values(point?.engineeringSources||{});return{count:src.length,complete:src.filter(x=>x.type&&((x.reference||x.note)||x.type==='calculation'||x.type==='condition'||x.type==='na')).length}}
global.LubricaEngineeringSources=Object.freeze({types:TYPES,normalize,set,get,completeness});global.LubricaSystem?.registerModule?.('Engineering Sources','ok','Источники и обоснование');})(window);
