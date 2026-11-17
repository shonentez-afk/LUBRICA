"use strict";
/* Stage 5C.0: existing bulk editor now has an explicit readiness gate and
   commits one cloned database only after the user reviews the exact preview. */
(function(){
 function bulkEdit(){
  if(!selectedRows.size){toast("Отметьте нужные строки флажками","warn");return}
  const db=window.LubricaCore?.State?.getDatabase?.();
  const guard=window.LubricaSafeBulk;
  if(!db||!guard){toast("Безопасное групповое изменение недоступно","error");return}
  const activeMaterials=(db.materials||[]).filter(m=>m.status!=='retired');
  const opts=['<option value="">Материал — без изменения</option>',...activeMaterials.map(m=>`<option value="${esc(m.id)}">${esc(m.code||m.id)} · ${esc(m.name)}</option>`)].join('');
  let reviewed='';
  const selected=Array.from(selectedRows).map(String);
  const values=()=>({materialId:$("#actionMaterialId")?.value||'',
    interval:$("#actionInterval")?.value.trim()||'',approve:$("#actionApproved")?.checked===true});
  const status=()=>$("#safeBulkPreview");
  const check=()=>{
   const patch=values(),p=guard.preview(window.LubricaCore.State.getDatabase(),selected,patch);
   reviewed=p.allowed?p.signature:'';
   const el=status();if(el)el.innerHTML='<b>'+(p.allowed?'Предварительная проверка пройдена':'Применение заблокировано')+'</b>'+ 
    '<ul>'+p.errors.map(x=>'<li class="warn">'+esc(x)+'</li>').concat(p.warnings.map(x=>'<li>'+esc(x)+'</li>')).join('')+'</ul>'+
    '<small>Выбрано '+p.selected.length+' мероприятий. Точки и маршруты не изменяются.</small>';
   return p;
  };
  openAction("Групповое изменение",`Выбрано мероприятий: ${selected.length}`,[
   {label:"Отмена",kind:"ghost"},
   {label:"Проверить",kind:"secondary",run:()=>{check();return false}},
   {label:"Применить после проверки",kind:"primary",run:()=>{
    const p=guard.preview(window.LubricaCore.State.getDatabase(),selected,values());
    if(!p.allowed||reviewed!==p.signature){reviewed='';check();toast('Сначала проверьте текущие изменения','warn');return false}
    try{
     const result=guard.apply(window.LubricaCore.State.getDatabase(),selected,values());
     LubricaCore.State.setDatabase(result.database);
     state=LubricaCore.Database.toLegacy(result.database);
     selectedRows.clear();renderAll();updateBulkButton();toast('Групповые изменения проверены и применены');
    }catch(err){reviewed='';toast(err.message,'warn');return false}
   }}
  ],`<label>Смазочный материал<select id="actionMaterialId">${opts}</select></label><label>Периодичность<input id="actionInterval" placeholder="Без изменения"></label><label class="checkline"><input id="actionApproved" type="checkbox"> Утвердить выбранные мероприятия после проверки готовности</label><section class="safe-bulk-preview" id="safeBulkPreview"><small>Для применения сначала нажмите «Проверить».</small></section>`);
  ["actionMaterialId","actionInterval","actionApproved"].forEach(id=>$("#"+id)?.addEventListener('change',()=>{reviewed='';if(status())status().textContent='Данные изменены. Запустите проверку заново.'}));
 }
 window.LubricaBulkEdit=Object.freeze({bulkEdit});
})();
