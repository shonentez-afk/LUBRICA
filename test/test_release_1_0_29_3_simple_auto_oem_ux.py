from pathlib import Path
s=(Path(__file__).resolve().parents[1]/'lubrication/task-editor.js').read_text()
assert 'Производитель вентилятора<select name="fanManufacturer"' in s
assert 'Для REITZ методика KXE включится автоматически. Экспертный режим не требуется.' in s
assert 'USER_CONFIRMED_SIMPLE_OEM' in s
assert "multi-oem-1.0.30-skf-snl-engine" in s
print('SIMPLE AUTO OEM UX TEST PASS')
