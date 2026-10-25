from pathlib import Path
from PIL import Image
r=Path(__file__).resolve().parents[1]
css=(r/'assets/app.css').read_text(encoding='utf-8')
idx=(r/'index.html').read_text(encoding='utf-8')
assert '.topbar{padding:0 20px' in css
assert 'grid-template-columns:280px 1fr auto' in css
assert '.app-shell{display:grid;grid-template:64px calc(100vh - 64px)/84px 1fr}' in css
assert 'Release 1.0.3 — Header logo fit hotfix' in css
assert '.brand.brand-logo{' in css and 'height:64px' in css
assert '.brand.brand-logo img{' in css and 'height:48px' in css
assert 'background:transparent' in css and 'box-shadow:none' in css
assert './assets/icons/lubrica-header.png' in idx
im=Image.open(r/'assets/icons/lubrica-header.png').convert('RGBA')
assert im.getpixel((0,0))[3]==0
print('HEADER LOGO FIT / NO-LAYOUT-SHIFT CONTRACT PASS')
