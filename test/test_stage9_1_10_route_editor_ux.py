from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/'routes/routes-ui.js').read_text(encoding='utf-8')
css=(root/'assets/app.css').read_text(encoding='utf-8')
errors=[]
for token in [
    'Как добавить точку в маршрут',
    'Добавить из карты смазки',
    '1 · ТОЧКА',
    '2 · Выберите мероприятия этой точки',
    '3 · Добавить выбранные в маршрут',
    'data-add-all-point',
    'Добавить все подходящие',
    'Маршрут пока пуст',
    'Параметры маршрута',
    'существующее мероприятие из карточки точки'
]:
    if token not in ui: errors.append(f'missing UX token: {token}')
for token in [
    '.route-editor-meta-card',
    '.route-add-guide',
    '.route-candidate-actions',
    '.route-empty-route',
    '#actionDialog.route-queue-dialog{width:min(1360px',
    '@media(max-width:900px)'
]:
    if token not in css: errors.append(f'missing CSS contract: {token}')
# Prevent the old overloaded six-control settings row from being the only layout rule.
if 'grid-template-columns:minmax(220px,1.3fr) minmax(170px,1fr) 130px 125px 125px auto' in css and '.route-editor-meta-card' not in css:
    errors.append('legacy overloaded route settings layout still active without replacement')
if errors:
    print('STAGE 9.1.10 ROUTE EDITOR UX AUDIT FAIL')
    for e in errors: print('ERROR', e)
    raise SystemExit(1)
print('STAGE 9.1.10 ROUTE EDITOR UX AUDIT PASS')
