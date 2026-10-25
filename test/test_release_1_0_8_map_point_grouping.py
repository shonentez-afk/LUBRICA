from pathlib import Path
r=Path(__file__).resolve().parents[1]
js=(r/'ui/workspace.js').read_text(encoding='utf-8')
css=(r/'assets/app.css').read_text(encoding='utf-8')

checks={
  'groups by physical point': 'p.lubricationPointId||pointDisplayId(p)' in js,
  'rowspan used': 'rowspan="${span}"' in js,
  'point name shown once': 'p.pointName||p.component' in js,
  'task count badge': 'point-task-count' in js,
  'task rows remain separate': 'data-id="${esc(taskKey(p))}"' in js,
  'task-specific operation remains': 'p.operation||"Не задано"' in js,
  'footer still counts tasks and unique points': 'uniquePointCount(rows)' in js,
  'group styling': 'Lubrication map visual grouping' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad:
    raise SystemExit('MAP GROUPING CONTRACT FAIL '+str(bad))
print('MAP GROUPING CONTRACT PASS',checks)
