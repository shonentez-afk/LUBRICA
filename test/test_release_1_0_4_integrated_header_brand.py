from pathlib import Path
from PIL import Image
r=Path(__file__).resolve().parents[1]
css=(r/'assets/app.css').read_text(encoding='utf-8')
idx=(r/'index.html').read_text(encoding='utf-8')
assert './assets/icons/lubrica-header-integrated.png' in idx
assert 'Release 1.0.4 — integrated header brand' in css
# Original application geometry remains present.
assert 'grid-template-columns:280px 1fr auto' in css
assert '.app-shell{display:grid;grid-template:64px calc(100vh - 64px)/84px 1fr}' in css
# Brand is constrained inside the existing first topbar column.
assert '.brand.brand-logo img{' in css
assert 'width:232px' in css
assert 'max-height:54px' in css
assert 'border-radius:0' in css and 'box-shadow:none' in css
im=Image.open(r/'assets/icons/lubrica-header-integrated.png')
assert im.width/im.height > 4.5
print('INTEGRATED HEADER BRAND / NO-LAYOUT-SHIFT PASS')
