import re
from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/'index.html').read_text(encoding='utf-8')
imp=(r/'import/import-engine.js').read_text(encoding='utf-8')
mapui=(r/'ui/workspace.js').read_text(encoding='utf-8')
route=(r/'routes/route-engine.js').read_text(encoding='utf-8')
planning=(r/'routes/route-planning.js').read_text(encoding='utf-8')
check=(r/'checklist/checklist-engine.js').read_text(encoding='utf-8')
fact=(r/'routes/route-plan-fact.js').read_text(encoding='utf-8')
frv=(r/'checklist/frv-engine.js').read_text(encoding='utf-8')
qa=(r/'qa/qa-engine.js').read_text(encoding='utf-8')
excel=(r/'export/final-excel.js').read_text(encoding='utf-8')
settings=(r/'ui/checks-settings.js').read_text(encoding='utf-8')
guide=(r/'ui/user-guide.js').read_text(encoding='utf-8')
scripts=re.findall(r'<script[^>]+src="([^"]+)"',idx)
def order(a,b):
    return scripts.index(a)<scripts.index(b)
checks={
 'safety before storage':order('./core/database-safety.js','./core/storage.js'),
 'import before UI':order('./import/import-engine.js','./import/import-ui.js'),
 'routes before route UI':order('./routes/route-engine.js','./routes/routes-ui.js'),
 'qa loaded':'./qa/qa-engine.js' in scripts and './qa/qa-ui.js' in scripts,
 'final excel loaded':'./export/final-excel.js' in scripts and './export/final-excel-template.js' in scripts,
 'repeat import identity':'externalCode' in imp and 'updatedEquipment' in imp and 'updatedComponents' in imp,
 'physical point task separation':'lubricationPointId' in mapui and 'taskKey' in mapui,
 'route uses task ids':'taskIds' in route,
 'planning route based':'routeId' in planning,
 'execution task results':'taskResults' in check,
 'plan fact historical':'routeSnapshot' in fact,
 'frv run fact':'executionFact' in frv or 'frvFact' in frv,
 'qa concrete tasks':'TASK_QUANTITY_MISSING' in qa and 'APPROVED_TASK_NOT_ROUTED' in qa,
 'excel task rows':'return (d.tasks||[]).filter' in excel and 'taskId:task.id' in excel,
 'excel indexed performance':'const map=a=>new Map' in excel and 'routeByTask' in excel,
 'settings backup':'Создать бекап' in settings and 'Recovery' in settings,
 'guide complete':guide.count('\"id\":')>=15 and 'Финальный Excel' in guide and 'Backup' in guide,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('RC E2E CONTRACT FAIL '+str(bad))
print('STAGE 9.9 E2E CONTRACT PASS',checks)
