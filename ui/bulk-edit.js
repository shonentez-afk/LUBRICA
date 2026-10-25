"use strict";
/* Stage 5.8: group editing is isolated from materials catalog. */
(function(){
 function bulkEdit(){
  if(!selectedRows.size){toast("Отметьте нужные строки флажками","warn");return}
  const d=window.LubricaCore?.State?.getDatabase?.();
  if(!d){toast("База недоступна","error");return}
  const activeMaterials=(d.materials||[]).filter(m=>m.status!=='retired');
  const opts=['<option value="">Материал — без изменения</option>',...activeMaterials.map(m=>`<option value="${esc(m.id)}">${esc(m.code||m.id)} · ${esc(m.name)}</option>`)].join('');
  openAction("Групповое изменение",`Выбрано мероприятий: ${selectedRows.size}`,[{label:"Отмена",kind:"ghost"},{label:"Применить",kind:"primary",run:()=>{
    const materialId=$("#actionMaterialId").value||null,interval=$("#actionInterval").value.trim(),approve=$("#actionApproved").checked;
    const ids=new Set(selectedRows);
    (d.tasks||[]).forEach(t=>{if(!ids.has(String(t.id)))return;if(materialId){const m=(d.materials||[]).find(x=>String(x.id)===String(materialId));t.materialMode='explicit';t.materialId=materialId;t.materialName=m?.name||''}if(interval)t.schedule={...(t.schedule||{}),legacyText:interval};if(approve){t.approvalStatus='approved';t.verified=true}});
    LubricaCore.State.setDatabase(d);state=LubricaCore.Database.toLegacy(d);selectedRows.clear();renderAll();updateBulkButton();toast("Групповые изменения применены");
  }}],`<label>Смазочный материал<select id="actionMaterialId">${opts}</select></label><label>Периодичность<input id="actionInterval" placeholder="Без изменения"></label><label class="checkline"><input id="actionApproved" type="checkbox"> Утвердить выбранные мероприятия</label>`);
 }
 window.LubricaBulkEdit=Object.freeze({bulkEdit});
})();
