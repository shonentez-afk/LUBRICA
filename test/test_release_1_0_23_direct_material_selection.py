from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/'index.html').read_text(encoding='utf-8')
ui=(r/'materials/library-ui.js').read_text(encoding='utf-8')
te=(r/'lubrication/task-editor.js').read_text(encoding='utf-8')
cf=(r/'import/candidate-finalizer.js').read_text(encoding='utf-8')
pw=(r/'structure/point-wizard.js').read_text(encoding='utf-8')
ed=(r/'structure/entity-dialogs.js').read_text(encoding='utf-8')
checks={
 'explicit option first': idx.index('value="explicit">Выбрать материал из справочника') < idx.index('value="point_target">Наследовать TARGET точки'),
 'target special label':'Наследовать TARGET точки (если задан)' in idx,
 'empty material prompt':'Выберите материал' in ui,
 'target disabled without target':'targetOption.disabled=!hasTarget' in ui,
 'legacy point target fallback':'mode===\'point_target\'&&!lp.targetMaterialId' in te,
 'direct selection validation':'необходимо выбрать смазочный материал из справочника' in te,
 'candidate default explicit':"materialMode:needsMaterial?'explicit':'none'" in cf,
 'point wizard default explicit':"materialMode:C.activityNeedsMaterial(activityType)?'explicit':'none'" in pw,
 'structure default explicit':"?'none':'explicit'" in ed,
 'structure target disabled':"${targetMat?'':'disabled'}" in ed,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('DIRECT MATERIAL UX CONTRACT FAIL '+str(bad))
print('DIRECT MATERIAL UX CONTRACT PASS',checks)
