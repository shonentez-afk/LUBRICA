from pathlib import Path
r=Path(__file__).resolve().parents[1]
ui=(r/"routes/routes-ui.js").read_text(encoding="utf-8")
eng=(r/"checklist/checklist-engine.js").read_text(encoding="utf-8")
checks={
"result selector":'data-task-result' in ui and 'Пропущено' in ui and 'Не требуется' in ui,
"actual quantity":'data-task-actual-quantity' in ui and 'Фактическое количество' in ui,
"deviation reason":'deviationReason' in eng and 'причина пропуска' in ui,
"actual timing":'actualStartAt' in eng and 'actualEndAt' in eng and 'actualDurationMinutes' in eng,
"frozen fact":'executionFact' in eng,
"plan link preserved":'plannedItemId' in eng,
"revision preserved":'routeRevisionId' in eng,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit("STAGE 9.4 UX AUDIT FAIL "+str(bad))
print("STAGE 9.4 UX AUDIT PASS",checks)
