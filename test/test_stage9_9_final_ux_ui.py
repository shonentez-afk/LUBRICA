from pathlib import Path
import re
r=Path(__file__).resolve().parents[1]
idx=(r/'index.html').read_text(encoding='utf-8')
css=(r/'assets/app.css').read_text(encoding='utf-8')
settings=(r/'ui/checks-settings.js').read_text(encoding='utf-8')
routes=(r/'routes/routes-ui.js').read_text(encoding='utf-8')
guide=(r/'ui/user-guide.js').read_text(encoding='utf-8')
checks={
 'single control nav':idx.count('<small>Контроль</small>')==1 and 'data-view="checks"' not in idx,
 'settings nav':'<small>Настройки</small>' in idx and '<small>Правила</small>' not in idx,
 'settings four tiles':settings.count('settings-card settings-tile ')==4,
 'engineering panel':'engineering-defaults-panel' in settings,
 'button fit':'button text fit only' in css and 'box-sizing:border-box!important' in css,
 'checklist ten cols':all(f'nth-child({i})' in css for i in range(1,11)),
 'viewport dialogs':'max-height:calc(100vh - 24px)' in css or 'max-height:88vh!important' in css,
 'transactional route':'Создать маршрут' in routes and ('Отменить создание' in routes or 'до финального' in routes.lower()),
 'guide detailed':'Почему это важно' in guide and 'Критический момент' in guide and 'Практический пример' in guide and 'Результат раздела' in guide,
 'no visible stage labels':not re.search(r'<[^>]+>[^<]*STAGE\s*9',idx+routes+settings,re.I),
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('RC UX/UI AUDIT FAIL '+str(bad))
print('STAGE 9.9 FINAL UX/UI AUDIT PASS',checks)
