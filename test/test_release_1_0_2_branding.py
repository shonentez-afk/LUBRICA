from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/'index.html').read_text(encoding='utf-8')
css=(r/'assets/app.css').read_text(encoding='utf-8')
bat=(r/'Создать ярлык LUBRICA.bat').read_text(encoding='utf-8-sig')
required=[
 'assets/icons/lubrica-header.png',
 'assets/icons/lubrica-app.png',
 'assets/icons/lubrica-shortcut.png',
 'assets/icons/lubrica-shortcut.ico',
 'assets/icons/lubrica-favicon-16.png',
 'assets/icons/lubrica-favicon-32.png',
 'assets/icons/lubrica-favicon-48.png',
 'assets/icons/lubrica-favicon-64.png',
 'assets/icons/lubrica-favicon-128.png',
 'assets/icons/lubrica-favicon-180.png',
 'assets/icons/lubrica-favicon-256.png',
]
bad=[x for x in required if not (r/x).exists() or (r/x).stat().st_size<500]
checks={
 'header logo':(('lubrica-header.png' in idx or 'lubrica-header-integrated.png' in idx) and 'brand brand-logo' in idx),
 'favicon32':'lubrica-favicon-32.png' in idx,
 'favicon64':'lubrica-favicon-64.png' in idx,
 'apple180':'lubrica-favicon-180.png' in idx,
 'logo sizing':('.brand.brand-logo img' in css and ('Release 1.0.2 — Branding & Icons' in css or 'Release 1.0.3 — Header logo fit hotfix' in css or 'Release 1.0.4 — integrated header brand' in css)),
 'shortcut target':"index.html" in bat and "msedge.exe" in bat,
 'shortcut icon':'lubrica-shortcut.ico' in bat,
}
failed=[k for k,v in checks.items() if not v]
if bad or failed:
    raise SystemExit('BRANDING INTEGRATION FAIL files='+str(bad)+' checks='+str(failed))
print('RELEASE 1.0.2 BRANDING INTEGRATION PASS',checks)
