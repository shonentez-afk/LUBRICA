import re
from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/'index.html').read_text(encoding='utf-8')
prod=[]
for p in r.rglob('*'):
    if p.is_file() and p.suffix.lower() in {'.js','.html'} and 'test' not in p.parts and 'vendor' not in p.parts:
        prod.append((p,p.read_text(encoding='utf-8',errors='ignore')))
joined='\n'.join(t for _,t in prod)
checks={
 'no fetch': 'fetch(' not in joined,
 'no xhr': 'XMLHttpRequest' not in joined,
 'no dynamic import': not re.search(r'\bimport\s*\(',joined),
 'no service worker': 'serviceWorker' not in joined,
 'no remote scripts': not re.search(r'<script[^>]+src=["\']https?://',idx,re.I),
 'no remote styles': not re.search(r'<link[^>]+href=["\']https?://',idx,re.I),
 'relative scripts': all(src.startswith('./') for src in re.findall(r'<script[^>]+src="([^"]+)"',idx)),
 'file mode shown': 'Локально · file://' in (r/'ui/checks-settings.js').read_text(encoding='utf-8'),
 'save picker fallback': 'if(window.showSaveFilePicker)' in (r/'core/database-session-ui.js').read_text(encoding='utf-8') and 'download(' in (r/'core/database-session-ui.js').read_text(encoding='utf-8'),
 'directory picker fallback': 'if(window.showDirectoryPicker)' in (r/'core/database-session-ui.js').read_text(encoding='utf-8'),
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('FILE PROTOCOL COMPATIBILITY FAIL '+str(bad))
print('STAGE 9.9 EDGE FILE PROTOCOL STATIC TEST PASS',checks)
