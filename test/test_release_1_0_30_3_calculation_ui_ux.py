from pathlib import Path
ui=Path('lubrication/task-editor.js').read_text(encoding='utf-8')
css=Path('assets/app.css').read_text(encoding='utf-8')
assert 'calc-simple-overview' in ui
assert 'data-simple-method-title' in ui
assert 'data-simple-status' in ui
assert 'Почему такой результат?' in ui
assert "saveBtn.textContent='Применить расчёт'" in ui
assert 'Производитель узла' in ui
assert '>Ferrari</option>' in ui
assert '>Ventapp</option>' in ui
assert 'Tröster' in ui
assert 'data-snl-simple-note' in ui
assert 'multi-oem-1.0.30.5-expert-context-operation-resolver' in ui
assert '.calc-simple-overview' in css
assert '.calc-simple-status.blocked' in css
assert '.bearing-calc-modal-form.simple-mode .oem-profile-section' in css
assert '.bearing-calc-modal-form.simple-mode .modal-warnings' in css
print('RELEASE 1.0.30.3 CALCULATION UI/UX CONSOLIDATION PASS')
