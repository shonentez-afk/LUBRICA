from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/'lubrication'/'task-editor.js').read_text(encoding='utf-8')
calc=(root/'bearings'/'calculator.js').read_text(encoding='utf-8')
assert 'Простой режим' in ui
assert 'Экспертный режим' in ui
assert 'data-auto-method-label' in ui
assert 'NSK — точная OEM-таблица' in ui
assert 'Показать методики других производителей' in ui
assert "methodSelect.value='auto_oem'" in ui
assert "calculationVersion:'multi-oem-1.0.26.6'" in ui
assert 'Multi-OEM v1.0.26.6 full housed units + all-OEM source audit' in calc
print('MULTI OEM BEARING 1.0.26.3 SIMPLIFIED UX PASS')
