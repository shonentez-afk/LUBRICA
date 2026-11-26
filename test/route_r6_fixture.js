/* R6 synthetic physical data, no factory identities or OEM values. */
(function(global){
 function fixture(count=48){
  const d=global.LubricaCore.Database.createEmpty('R6 SYNTHETIC — NOT FOR PRODUCTION'),C=global.LubricaStructureContext;
  const variants=[['bearing','regrease','fan'],['bearing','regrease','conveyor'],['bearing','regrease','motor'],['bearing','regrease','rotating_shaft'],['bearing','regrease','saw'],['chain','lubricant_apply','conveyor'],['gearbox_oil','oil_change','gearbox'],['gearbox_oil','oil_level_check','gearbox'],['linear_bearing','regrease','saw'],['coupling','regrease','rotating_shaft'],['guide','lubricant_apply','conveyor'],['ball_screw','regrease','other']];
  d.lines=[{id:'L1',name:'Линия 1'},{id:'L2',name:'Линия 2'}];
  for(let n=0;n<6;n++)d.areas.push({id:'A'+n,lineId:n<3?'L1':'L2',name:'Участок '+n});
  d.materials=[{id:'G',code:'G',name:'Тестовая смазка',kind:'grease',approved:true,reference:'Synthetic QA only'},{id:'O',code:'O',name:'Тестовое масло',kind:'oil',approved:true,reference:'Synthetic QA only'}];
  d.tools=[{id:'TL',code:'TL',name:'Тестовый инструмент',status:'active'}];
  d.componentLibraryEntries=[{id:'LIB',name:'Тестовая деталь'}];
  d.routePlanItems=[];d.routeRevisions=[];
  for(let i=0;i<count;i++){
   const [category,activityType,family]=variants[i%variants.length],area=d.areas[Math.floor(i/variants.length)%d.areas.length],id=String(i+1),eq='E'+id,node='N'+id,lp='P'+id,mat=category==='gearbox_oil'?'O':'G',needs=C.activityCatalog[activityType].needsMaterial;
   const interval=i%24<12?'7 дней':'14 дней';
   d.equipment.push({id:eq,lineId:area.lineId,areaId:area.id,name:'Тест '+family+' '+id,externalCode:'EQ-'+id,equipmentType:family,status:'active'});
   d.nodes.push({id:node,equipmentId:eq,name:'Узел '+id,quantity:1});
   d.lubricationPoints.push({id:lp,equipmentId:eq,nodeId:node,name:'Точка '+id,category,status:'confirmed',targetMaterialId:mat,componentBinding:{libraryEntryId:'LIB',actualLibraryEntryId:'LIB',matchStatus:'matched'},materialRationale:'Synthetic QA only',engineeringSources:{quantity:{reference:'Synthetic QA only'},interval:{reference:'Synthetic QA only'}}});
   d.tasks.push({id:'T'+id,lubricationPointId:lp,activityType,operation:C.activityCatalog[activityType].label,approvalStatus:'approved',verified:true,materialMode:needs?'explicit':'none',materialId:needs?mat:null,toolId:needs?'TL':null,quantity:needs?{approved:'10',unit:mat==='O'?'л':'г',source:'Synthetic QA only'}:{},schedule:{legacyText:interval,source:'Synthetic QA only'}});
  }
  // Non-serviceable, incomplete and ambiguous tasks must remain excluded.
  for(const [i,kind] of [[0,'dry'],[1,'review'],[2,'ambiguous']]){
   if(i>=count)continue;
   if(kind==='dry')d.lubricationPoints[i].serviceMode='dry';
   if(kind==='review'){d.tasks[i].approvalStatus='review';d.tasks[i].verified=false}
   if(kind==='ambiguous')d.tasks[i].schedule.legacyText='5000/500 ч';
  }
  return d;
 }
 global.createR6RouteFixture=fixture;
 if(typeof module!=='undefined')module.exports=fixture;
})(typeof window!=='undefined'?window:globalThis);
