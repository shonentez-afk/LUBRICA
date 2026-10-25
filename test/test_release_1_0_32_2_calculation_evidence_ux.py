from pathlib import Path
root=Path(__file__).resolve().parents[1]
task=(root/'lubrication/task-editor.js').read_text(encoding='utf-8')
pres=(root/'calculations/ui-presenter.js').read_text(encoding='utf-8')
assert 'data-open-source-registry>Обоснование</button>' in task
assert "dialog.querySelector('[data-show-calc-details]')?.addEventListener('click',openCalculationEvidence)" in task
assert "dialog.querySelector('[data-open-source-registry]')?.addEventListener('click',openCalculationEvidence)" in task
assert "title:'Обоснование расчёта'" in task
assert 'объект → узел → подшипник → входные данные → методика → источники → результат' in task
assert 'data-unified-calc-sources>Обоснование</button>' in pres
print('PASS 1.0.32.2 Calculation Evidence UX')
