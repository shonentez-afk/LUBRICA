from pathlib import Path
r=Path(__file__).resolve().parents[1]
g=(r/'ui/user-guide.js').read_text(encoding='utf-8');css=(r/'assets/app.css').read_text(encoding='utf-8')
checks={
 '15 chapters':g.count('\"id\":')>=15,
 'function overview':'Функциональные возможности' in g and 'Критические правила' in g,
 'purpose':'Цель раздела' in g and 'Почему это важно' in g,
 'before':'Перед началом' in g,
 'step reason':'Почему' in g and 'Проверка' in g,
 'result':'Результат раздела' in g,
 'critical':'Критический момент' in g,
 'example':'Практический пример' in g,
 'screenshots':'Актуальные скриншоты LUBRICA 1.0.4' in g and 'assets/guide/' in g,
 'image zoom':'data-guide-image' in g and 'user-guide-lightbox' in g,
 'point event invariant':'Физическая точка и мероприятие' in g and 'Маршрут не создаёт свои мероприятия' in g,
 'planning reason':'предварительный план' in g.lower(),
 'qa formula':'готовност' in g.lower() and 'Контроль' in g,
 'responsive':'.user-guide-feature-grid' in css and '.user-guide-shot-grid' in css and '@media(max-width:800px)' in css,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('DETAILED GUIDE FAIL '+str(bad))
print('DETAILED GUIDE PASS',checks)
