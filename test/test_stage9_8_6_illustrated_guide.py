from pathlib import Path
r=Path(__file__).resolve().parents[1]
g=r/'assets/guide'
files=sorted(g.glob('*.png'))
assert len(files)==23, f'expected 23 guide screenshots, got {len(files)}'
for p in files:
    assert p.stat().st_size>5000, f'too small: {p.name}'
ui=(r/'ui/user-guide.js').read_text(encoding='utf-8')
for p in files:
    assert p.name in ui, f'guide does not reference {p.name}'
print('STAGE 9.8.6 ILLUSTRATED GUIDE PASS',len(files))
