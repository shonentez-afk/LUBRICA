from pathlib import Path
r=Path(__file__).resolve().parents[1]
ui=(r/'ui/checks-settings.js').read_text(encoding='utf-8')
css=(r/'assets/app.css').read_text(encoding='utf-8')
checks={
 'four tiles':ui.count('settings-card settings-tile ') == 4,
 'database tile':'Рабочая база данных' in ui,
 'backup tile':'Резервное копирование и восстановление' in ui,
 'help tile':'Помощь пользователю' in ui,
 'about tile':'О программе' in ui,
 'no control button':'openControlFromSettings' not in ui and 'Открыть Контроль программы' not in ui,
 'symmetric grid':'grid-template-columns:repeat(2,minmax(0,1fr))' in css and 'grid-auto-rows:1fr' in css,
 'equal tile layout':'.settings-grid-symmetric .settings-tile' in css and 'height:100%' in css,
 'primary actions':all(x in ui for x in ['settings-action-blue','settings-action-green','settings-action-orange']),
 'guide fifteen':'15 разделов:' in ui,
 'engineering defaults retained':'engineering-defaults-panel' in ui and 'saveRules' in ui,
 'responsive':'@media(max-width:980px)' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad:
    raise SystemExit('SETTINGS SYMMETRIC DESIGN FAIL '+str(bad))
print('SETTINGS SYMMETRIC DESIGN PASS', checks)
