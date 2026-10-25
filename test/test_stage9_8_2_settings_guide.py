from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/'index.html').read_text(encoding='utf-8')
settings=(r/'ui/checks-settings.js').read_text(encoding='utf-8')
guide=(r/'ui/user-guide.js').read_text(encoding='utf-8')
css=(r/'assets/app.css').read_text(encoding='utf-8')
preflight=(r/'test/preflight.py').read_text(encoding='utf-8')
checks={
 'settings nav renamed':'data-view="settings"' in idx and '<small>Настройки</small>' in idx and '<small>Правила</small>' not in idx,
 'settings title':'<h1>Настройки</h1>' in idx,
 'guide dialog':'id="userGuideDialog"' in idx and 'user-guide.js' in idx,
 'settings sections':all(x in settings for x in ['Расчётные значения по умолчанию','Рабочая база данных','Резервное копирование и восстановление','Помощь пользователю','О программе']),
 'default wording':'начальные предложения' in settings and 'не пересчитывают утверждённые мероприятия' in settings,
 'guide buttons':'openFullGuide' in settings and 'openFullGuideCard' in settings,
 'control shortcut removed':'openControlFromSettings' not in settings and 'Открыть Контроль программы' not in settings,
 'guide chapters':guide.count('\"id\":')>=15 and 'Финальный Excel' in guide and 'Backup' in guide,
 'interactive navigation':'data-guide-prev' in guide and 'data-guide-next' in guide and 'data-guide-open-view' in guide and 'data-guide-search' in guide,
 'full workflow':'База → Импорт → Классификация → Материалы → Карта → Расчёты → Маршруты → Ревизия → План → Выполнение → ФРВ → Аналитика → Контроль → Excel → Backup' in guide,
 'responsive guide':'#userGuideDialog' in css and '.user-guide-layout' in css and '@media(max-width:700px)' in css,
 'preflight current architecture':'renderChecks' not in preflight and 'renderProgramQA' in preflight and 'user-guide.js' in preflight,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('STAGE 9.8.2 SETTINGS/GUIDE FAIL '+str(bad))
print('STAGE 9.8.2 SETTINGS/GUIDE PASS',checks)
