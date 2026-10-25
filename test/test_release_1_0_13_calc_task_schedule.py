from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/'index.html').read_text(encoding='utf-8')
task=(r/'lubrication/task-editor.js').read_text(encoding='utf-8')
ws=(r/'ui/workspace.js').read_text(encoding='utf-8')
mig=(r/'core/database-migrations.js').read_text(encoding='utf-8')
ent=(r/'structure/entity-dialogs.js').read_text(encoding='utf-8')
pw=(r/'structure/point-wizard.js').read_text(encoding='utf-8')
checks={
 'quantity hint': 'fQuantityHint' in idx and 'renderQuantityHint(task)' in task,
 'explicit unit selector': 'fIntervalUnit' in idx and 'Календарная периодичность' in task,
 'calendar units': all(x in idx for x in ['value="days"','value="weeks"','value="months"','value="years"']),
 'runtime hours': "strategy==='По наработке'" in task and 'runtimeHours' in task,
 'condition disables interval': "strategy==='По состоянию'" in task and 'valueEl.disabled=true' in task,
 'bearing sync helper': 'function syncBearingCalculationToTask' in task,
 'bearing calculation calls sync': 'syncBearingCalculationToTask(lp,task)' in task,
 'calculated dose synced': 'calculated:bc.calculatedDoseG' in task,
 'full fill synced': 'calculated:bc.calculatedFullFillG' in task,
 'approved value preserved separately': 'if(bc.approvedDoseG!=null)task.quantity.approved' in task,
 'legacy projection includes calculated': 'calculatedQty' in mig,
 'map calculated badge': 'расч.</small>' in ws,
 'structure task unit': 'Единица периодичности' in ent,
 'point wizard unit': 'Единица базовой периодичности' in pw,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('1.0.13 CONTRACT FAIL '+str(bad))
print('RELEASE 1.0.13 CALC/TASK/SCHEDULE CONTRACT PASS', checks)
