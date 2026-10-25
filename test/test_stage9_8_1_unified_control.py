from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/'index.html').read_text(encoding='utf-8')
router=(r/'ui/view-router.js').read_text(encoding='utf-8')
old=(r/'ui/checks-settings.js').read_text(encoding='utf-8')
ui=(r/'qa/qa-ui.js').read_text(encoding='utf-8')
assert idx.count('<small>Контроль</small>')==1
assert 'data-view="programQA"' in idx
assert 'data-view="checks"' not in idx
assert 'id="checks"' not in idx
assert 'Контроль программы смазки' in idx
assert '<small>QA</small>' not in idx
assert 'QA программы смазки' not in idx
assert 'renderChecks' not in old
assert 'id==="checks"' not in router
assert 'Реестр проблем контроля' in ui
assert 'Экспорт контроля CSV' in ui
assert 'Подтвердить заполненные' not in old
print('STAGE 9.8.1 UNIFIED CONTROL TEST PASS')