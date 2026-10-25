from pathlib import Path
s=Path('lubrication/task-editor.js').read_text(encoding='utf-8')
checks={
 'tracks manual approval edits': 'const manuallyTouchedApprovals=new Set()' in s,
 'refreshes stale expert approvals': "if((intervalStale||doseStale)&&!manualTouched)acceptQuick(c.kind,r,true);" in s,
 'syncs active task after maintenance task creation': 'if(activeTask)syncBearingCalculationToTask(lp,activeTask);' in s,
 'keeps selected task': 'if(activeTask)selectedId=activeTask.id;' in s,
 'updates runtime hours from approved calculation': "task.schedule.runtimeHours=approvedHours" in s,
 'updates legacy interval from approved calculation': "task.schedule.legacyText=`${approvedHours} ч`" in s,
}
missing=[k for k,v in checks.items() if not v]
if missing:
    raise SystemExit('1.0.32.16 CALC->TASK SYNC FAIL: '+', '.join(missing))
print('1.0.32.16 calculation-to-task synchronization PASS')
