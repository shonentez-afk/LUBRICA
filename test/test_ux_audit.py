from bs4 import BeautifulSoup
from pathlib import Path
from collections import Counter
import re, sys
base=Path(__file__).resolve().parents[1]
html=(base/'index.html').read_text(encoding='utf-8')
soup=BeautifulSoup(html,'html.parser')
errors=[]; warnings=[]
ids=[x.get('id') for x in soup.find_all(id=True)]
for k,v in Counter(ids).items():
    if v>1: errors.append(f'duplicate id: {k} x{v}')
# navigation targets
views={x.get('id') for x in soup.select('.main-view[id]')}
for b in soup.select('[data-view]'):
    target=b.get('data-view')
    if target not in views: errors.append(f'navigation target missing: {target}')
# detail tabs
pane_names={x.get('data-detail-pane') for x in soup.select('[data-detail-pane]')}
for b in soup.select('[data-detail-tab]'):
    if b.get('data-detail-tab') not in pane_names: errors.append(f'detail pane missing: {b.get("data-detail-tab")}')
# close button usability in static forms
for form in soup.find_all('form'):
    has_required=bool(form.find(attrs={'required':True}))
    if has_required:
        for b in form.find_all('button'):
            if b.get_text(' ',strip=True) in {'Отмена','×'} and b.get('type') not in {'button'} and form.get('method')!='dialog':
                errors.append('cancel/close button may trigger validation')
# critical UX vocabulary
ui_files=[base/'index.html',base/'import/candidate-finalizer.js',base/'calculations/gearbox-oil-adapter.js',base/'calculations/simple-service-adapters.js',base/'calculations/chain-adapter.js',base/'calculations/linear-bearing-adapter.js',base/'calculations/grease-point-adapter.js',base/'calculations/coupling-adapter.js',base/'calculations/engineering-sources-ui.js',base/'calculations/framework.js']
active='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in ui_files)
for bad in ['Картер редуктора','Редуктор редуктора','STAGE 6.4 · ИНЖЕНЕРНОЕ ПОДТВЕРЖДЕНИЕ','>GEARBOX / OIL CALCULATOR<','>CHAIN CALCULATOR<','>LINEAR BEARING CALCULATOR<','>GREASE POINT CALCULATOR<','>COUPLING CALCULATOR<','>CALCULATION FRAMEWORK<','>ENGINEERING BASIS<']:
    if bad in active: errors.append(f'user-facing technical/jargon phrase remains: {bad}')
# left rail should not wrap
css=(base/'assets/app.css').read_text(encoding='utf-8')
if '.rail-item small{font-size:10px;white-space:nowrap}' not in css: errors.append('left rail labels may wrap')
# component library usability contracts
lib=(base/'components/library-ui.js').read_text(encoding='utf-8')
for token in ['Сохранённые пользователем','data-view-component','data-edit-component','technicalLabels(category)','Пользовательская запись']:
    if token not in lib: errors.append(f'component library UX contract missing: {token}')
if "name=\"category\" ${existing?'disabled':''}" not in lib: errors.append('existing catalog entry category can still be changed')
# point binding UX
pw=(base/'structure/point-wizard.js').read_text(encoding='utf-8')
for token in ['Элемент из структуры','По структуре','Фактически установлен','linkedPointForComponent','libraryEntryId','actualLibraryEntryId']:
    if token not in pw: errors.append(f'point binding UX missing: {token}')
# current point card must expose source/catalog link
te=(base/'lubrication/task-editor.js').read_text(encoding='utf-8')
for token in ['fSourceComponent','fLibraryEntry','ensurePointTechnical?.(lp)']:
    if token not in te: errors.append(f'point card transfer UX missing: {token}')
# crude modal size/overflow guards
for selector in ['#bearingCalcDialog','#actionDialog:has(.bearing-editor-form)']:
    if selector not in css: warnings.append(f'no explicit sizing rule found for {selector}')
print('UX AUDIT', 'PASS' if not errors else 'FAIL')
print('duplicate_ids',sum(1 for _,v in Counter(ids).items() if v>1))
print('views',len(views),'rail_items',len(soup.select('.rail-item')),'detail_tabs',len(soup.select('[data-detail-tab]')))
for w in warnings: print('WARN',w)
for e in errors: print('ERROR',e)
sys.exit(1 if errors else 0)
