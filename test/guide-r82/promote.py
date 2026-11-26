#!/usr/bin/env python3
"""Install a guide only after all required real screenshots have been captured."""
import hashlib,json,pathlib,shutil,os
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[2]
source=root/'test'/'guide-r82'
out=root/'test-artifacts'/'guide-r82'
names=json.loads((source/'images.json').read_text())
assert len(names)==38 and len(set(names))==38
missing=[n for n in names if not (out/n).is_file()]
assert not missing,'Missing real screenshots: '+str(missing)
guide=(source/'user-guide.js').read_text()
assert guide.count('"id":')==18
manifest={'capture':'Real application index.html, Chromium file://; demo and synthetic input JSON only','sourceCommit':os.environ.get('GITHUB_SHA','local'),'chapters':18,'images':[]}
for n in names:
    p=out/n
    assert n in guide and p.stat().st_size>5000,n
    with Image.open(p) as im:
        im.verify()
    with Image.open(p) as im:
        w,h=im.size
    assert w>=250 and h>=60,n
    manifest['images'].append({'file':n,'width':w,'height':h,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
dst=root/'assets'/'guide';dst.mkdir(exist_ok=True)
for n in names:shutil.copyfile(out/n,dst/n)
assert sorted(p.name for p in dst.glob('*.png'))==sorted(names)
for name in ('user-guide.js','checks-settings.js'):shutil.copyfile(source/name,root/'ui'/name)
for p in source.glob('test_*.py'):shutil.copyfile(p,root/'test'/p.name)
(dst/'capture-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('GUIDE PROMOTED',len(names),'real PNGs, 18 chapters',flush=True)
