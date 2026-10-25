from pathlib import Path
r=Path(__file__).resolve().parents[1]
w=(r/'ui/workspace.js').read_text(encoding='utf-8')
s=(r/'structure/structure.js').read_text(encoding='utf-8')
d=(r/'structure/detail-ui.js').read_text(encoding='utf-8')
checks={
 'last task cascades empty point': "if(removePoint)live.lubricationPoints=" in w,
 'route/history blocks task deletion': 'routeRefs.length||runRefs.length||revisionRefs.length' in w,
 'structure delete exposed': 'S.deleteSelected=deleteSelected' in s,
 'point with tasks blocked': "type==='lubricationPoint'&&(d.tasks||[]).some" in s,
 'node with points blocked': "type==='node'" in s and "v.nodeId===x.id" in s,
 'equipment descendants blocked': "parentEquipmentId===x.id" in s and "v.equipmentId===x.id" in s,
 'history blocks structure task delete': 'истории ревизий' in s and 'истории выполнения' in s,
 'delete button in detail': 'data-delete>Удалить' in d,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('DELETE LIFECYCLE CONTRACT FAIL '+str(bad))
print('DELETE LIFECYCLE CONTRACT PASS',checks)
