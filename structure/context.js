(function(global){
'use strict';
const Core=global.LubricaCore;
const C=global.LubricaStructureContext=global.LubricaStructureContext||{};
C.selected=C.selected||{type:'project',id:null};
C.expandedKeys=C.expandedKeys||new Set();
C.labels={plant:'Завод',line:'Линия',area:'Участок',equipment:'Оборудование',component:'ТМЦ / агрегат',node:'Узел',lubricationPoint:'Точка смазки',task:'Мероприятие'};
C.icons={plant:'▰',line:'▰',area:'▤',equipment:'▣',component:'◈',node:'◇',lubricationPoint:'●',task:'✓'};
C.categoryLabels={bearing:'Подшипник качения',linear_bearing:'Линейный подшипник / направляющая качения',chain:'Цепь / шарнир цепи',gearbox_oil:'Редуктор',coupling:'Муфта',open_gear:'Открытая зубчатая передача',guide:'Направляющая',joint:'Шарнир',bushing:'Втулка',screw:'Винтовая передача',ball_screw:'ШВП / шарико-винтовая передача',rope:'Канат',oil_system:'Масляная система',central_point:'Точка подачи централизованной системы',other:'Прочая точка смазки'};
C.esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
C.db=()=>Core?.State?.getDatabase();
C.byId=(items,id)=>(items||[]).find(x=>x.id===id);
C.equipmentTypeLabel=v=>({motor:'Электродвигатель',motor_gearbox:'Мотор-редуктор',fan:'Вентилятор',gearbox:'Редуктор',conveyor:'Конвейер',pump:'Насос / станция',compressor:'Компрессор',rotating_shaft:'Вращающийся узел',drum:'Барабан',roller:'Ролик',spindle:'Шпиндель',axis:'Ось',oscillating_mechanism:'Система качания / рычажный механизм',other:'Прочее оборудование'})[v]||v||'Прочее оборудование';
C.pointContextLabel=(d,lp)=>{const eq=C.byId(d.equipment,lp.equipmentId);const sourceComponentId=lp?.componentBinding?.sourceComponentId||null;const sourceComponent=sourceComponentId?C.byId(d.components,sourceComponentId):null;const componentRole=sourceComponent?.candidateEquipmentType||sourceComponent?.equipmentType||null;if(lp.category==='bearing'&&componentRole==='motor')return 'Подшипник электродвигателя';if(lp.category==='bearing'&&componentRole==='fan')return 'Подшипник вентилятора';if(lp.category==='bearing'&&eq?.equipmentType==='motor')return 'Подшипник электродвигателя';if(lp.category==='bearing'&&eq?.equipmentType==='fan')return 'Подшипник вентилятора';return C.categoryLabels[lp.category]||lp.category||'Точка смазки'};
C.defaultChildType=type=>({project:'plant',plant:'line',line:'area',area:'equipment',equipment:'node',node:'lubricationPoint',lubricationPoint:'task',task:'task'})[type]||'line';
C.entity=d=>{const map={plant:d.plants,line:d.lines,area:d.areas,equipment:d.equipment,component:d.components,node:d.nodes,lubricationPoint:d.lubricationPoints,task:d.tasks};return C.selected.type==='project'?d.project:C.byId(map[C.selected.type],C.selected.id)};
C.save=(database,message)=>{Core.State.setDatabase(database);global.LubricaApp?.refreshFromCore();global.LubricaApp?.showToast(message||'Структура сохранена');global.LubricaStructure?.render?.()};
C.options=(items,selectedId,labelFn=x=>x.name)=>(items||[]).map(x=>`<option value="${C.esc(x.id)}" ${x.id===selectedId?'selected':''}>${C.esc(labelFn(x))}</option>`).join('');
C.input=(label,name,value='',required=false,type='text')=>`<label>${label}<input name="${name}" type="${type}" value="${C.esc(value)}" ${required?'required':''}></label>`;
C.select=(label,name,html)=>`<label>${label}<select name="${name}">${html}</select></label>`;
C.activityCatalog=Object.freeze({
  regrease:{label:'Досмазывание',needsMaterial:true},
  grease_full_replacement:{label:'Полная замена смазки',needsMaterial:true},
  condition_check:{label:'Контроль состояния',needsMaterial:false},
  lubricant_apply:{label:'Нанесение смазки',needsMaterial:true},
  cleaning:{label:'Очистка',needsMaterial:false},
  tension_check:{label:'Контроль натяжения',needsMaterial:false},
  elongation_check:{label:'Контроль удлинения',needsMaterial:false},
  oil_level_check:{label:'Проверка уровня',needsMaterial:false},
  oil_topup:{label:'Долив масла',needsMaterial:true},
  oil_change:{label:'Замена масла',needsMaterial:true},
  oil_sample:{label:'Отбор пробы',needsMaterial:false},
  oil_inspection:{label:'Осмотр масла',needsMaterial:false},
  oil_filter:{label:'Фильтрация',needsMaterial:false},
  inspection:{label:'Осмотр',needsMaterial:false},
  replacement:{label:'Замена',needsMaterial:false},
  filter_dp_check:{label:'Контроль перепада',needsMaterial:false},
  filter_service:{label:'Замена / фильтрация',needsMaterial:false},
  lubrication_service:{label:'Смазочное обслуживание',needsMaterial:true},
  state_inspection:{label:'Осмотр состояния',needsMaterial:false},
  lubricant_supply_check:{label:'Проверка поступления смазки',needsMaterial:false},
  custom:{label:'Другое',needsMaterial:false}
});
C.activityTypesByCategory=Object.freeze({
  bearing:['regrease','grease_full_replacement','condition_check'],
  linear_bearing:['regrease','condition_check'],
  chain:['lubricant_apply','cleaning','tension_check','elongation_check'],
  gearbox_oil:['oil_level_check','oil_topup','oil_change','oil_sample','oil_inspection'],
  coupling:['regrease','grease_full_replacement','condition_check'],
  open_gear:['lubricant_apply','state_inspection'],
  guide:['lubricant_apply','cleaning'],
  joint:['regrease','condition_check'],
  bushing:['regrease','condition_check'],
  screw:['lubricant_apply','cleaning'],
  ball_screw:['regrease','cleaning','condition_check'],
  rope:['lubricant_apply','state_inspection'],
  oil_system:['oil_level_check','oil_topup','oil_change','oil_filter','oil_sample'],
  central_point:['lubricant_supply_check','condition_check'],
  other:['lubrication_service','inspection','condition_check','custom']
});
C.activityOptions=category=>(C.activityTypesByCategory[category]||C.activityTypesByCategory.other).map(type=>({type,...C.activityCatalog[type]}));
C.activityLabel=type=>C.activityCatalog[type]?.label||type||'Мероприятие';
C.activityTypeForLabel=label=>{
  const normalized=String(label||'').trim().toLowerCase();
  const aliases={
    'долив':'oil_topup',
    'долив масла':'oil_topup',
    'контроль перепада':'filter_dp_check',
    'замена / фильтрация':'filter_service',
    'замена/фильтрация':'filter_service',
    'осмотр':'inspection',
    'замена':'replacement',
    'смазочное обслуживание':'lubrication_service'
  };
  if(aliases[normalized])return aliases[normalized];
  const found=Object.entries(C.activityCatalog).find(([type,x])=>type!=='custom'&&x.label.toLowerCase()===normalized);
  return found?.[0]||'custom';
};
C.activityNeedsMaterial=type=>!!C.activityCatalog[type]?.needsMaterial;
C.operationOptions=category=>C.activityOptions(category).filter(x=>x.type!=='custom').map(x=>x.label);
})(window);
