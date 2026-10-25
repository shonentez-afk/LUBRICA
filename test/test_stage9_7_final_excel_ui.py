from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/'index.html').read_text(encoding='utf-8')
js=(r/'export/final-excel.js').read_text(encoding='utf-8')
checks={
 'module loaded':'export/final-excel-template.js' in idx and 'export/final-excel.js' in idx,
 'button':'id="exportBtn">Финальный Excel' in idx,
 'six sheets':all(x in js for x in ['Выбор смазочного материала','Карта смазки','Справочники','Код типа смазочного материала','Стандарт Чек-листа','Расчёт и обоснование']),
 'one row per event':'(d.tasks||[]).filter' in js and 'taskId:task.id' in js,
 'physical point separate':'pointId:lp?.id' in js,
 'task trace':'ID мероприятия' in js,
 'route trace':'routeCodesForTask' in js,
 'sources':'Источник нормы' in js and 'Источник периодичности' in js and 'Источник выбора материала' in js,
 'calculations':'Расчёт и обоснование' in js and 'calcRaw' in js,
 'template based':'LubricaExcelTemplateBase64' in js and 'buildTemplateWorkbookBlob' in js,
 'final filename':'LUBRICA_Финальный_Excel_по_эталону.xlsx' in js,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('STAGE 9.7 FINAL EXCEL UI FAIL '+str(bad))
print('STAGE 9.7 FINAL EXCEL UI PASS',checks)
