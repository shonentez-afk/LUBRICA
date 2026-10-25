from pathlib import Path
r=Path(__file__).resolve().parents[1]
ui=(r/'ui/checks-settings.js').read_text(encoding='utf-8')
css=(r/'assets/app.css').read_text(encoding='utf-8')
checks={
 'panel':'engineering-defaults-panel is-open' in ui,
 'clean header':'Инженерные значения по умолчанию' in ui and 'engineering-defaults-head' in ui,
 'save in header':'engineering-save-btn' in ui and 'Сохранить значения' in ui,
 'collapsible':'toggleEngineeringDefaults' in ui and 'aria-expanded="true"' in ui,
 'four fields':all(x in ui for x in ['rBearing','rHarsh','rChain','rInspection']),
 'units':'engineering-unit' in ui and ui.count('нед.</span>')>=4,
 'sealed select':'<select id="rSealed">' in ui and 'Не досмазывать — проверить конструкцию' in ui,
 'principle':'engineering-principle' in ui and 'Инженерный принцип' in ui,
 'two column desktop':'grid-template-columns:repeat(2,minmax(0,1fr))' in css,
 'field alignment':'.engineering-field{' in css and 'grid-template-columns:minmax(240px,320px) 240px minmax(220px,1fr)' in css,
 'responsive':'@media(max-width:900px)' in css,
 'old raw details removed':'<details class="settings-advanced">' not in ui,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('ENGINEERING DEFAULTS DESIGN FAIL '+str(bad))
print('ENGINEERING DEFAULTS DESIGN PASS',checks)
