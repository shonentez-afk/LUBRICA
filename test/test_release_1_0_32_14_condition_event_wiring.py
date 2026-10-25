from pathlib import Path
s=Path('lubrication/task-editor.js').read_text()
for name in ['loadClass','contamination','vibration','shaftOrientation','temperatureC','rpm']:
    assert name in s
assert 'immediateConditionNames' in s
assert "recalcQueued=false;recalc();" in s
print('1.0.32.14 condition event wiring PASS')
