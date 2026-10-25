from pathlib import Path
root=Path(__file__).resolve().parents[1]
js=(root/'lubrication/task-editor.js').read_text(encoding='utf-8')
css=(root/'assets/app.css').read_text(encoding='utf-8')
assert 'data-primary-result-value' in js
assert 'data-primary-method-human' in js
assert 'data-primary-result-context' in js
assert 'data-simple-renewal-line' in js
assert "рассчитано по данным изготовителя" in js
assert "планово не предусмотрена" in js
assert "data-show-calc-details" in js
assert "data-open-source-registry" in js
assert '.calc-primary-result' in css
assert '.simple-renewal-line' in css
assert 'Обоснование' in css
print('PASS 1.0.32.1 Calculation Result UX')
