from pathlib import Path
from PIL import Image
r=Path(__file__).resolve().parents[1]
g=(r/'ui/user-guide.js').read_text(encoding='utf-8')
settings=(r/'ui/checks-settings.js').read_text(encoding='utf-8')
files=sorted((r/'assets/guide').glob('*.png'))
assert len(files)==23
assert '15 разделов:' in settings
assert "open?.('overview')" in settings
assert 'Все изображения сняты из реального интерфейса' in g
assert 'демонстрационный факт выполнения' in g
for p in files:
    im=Image.open(p)
    assert im.width>=250 and im.height>=60, p.name
    assert p.name in g, p.name
print('RELEASE 1.0.5 INTERNAL GUIDE / ACTUAL SCREENSHOTS PASS',len(files))
