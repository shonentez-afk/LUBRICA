from pathlib import Path
r=Path(__file__).resolve().parents[1]
css=(r/'assets/app.css').read_text(encoding='utf-8')
checks={
 'centered':'align-items:center!important' in css and 'justify-content:center!important' in css,
 'inside box':'box-sizing:border-box!important' in css and 'max-width:100%!important' in css,
 'no forced clipping':'white-space:normal!important' in css and 'overflow-wrap:anywhere!important' in css,
 'desktop one line':'@media(min-width:1000px)' in css and 'white-space:nowrap!important' in css,
 'padding':'padding:8px 12px!important' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('BUTTON TEXT FIT FAIL '+str(bad))
print('BUTTON TEXT FIT PASS',checks)
