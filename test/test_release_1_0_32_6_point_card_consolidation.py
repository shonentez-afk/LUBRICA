from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
css=(root/'assets/app.css').read_text(encoding='utf-8')
js=(root/'js/app.js').read_text(encoding='utf-8')
assert 'class="detail-more-menu" id="detailMoreMenu"' in html
assert '>＋ Мероприятие</button>' in html
assert 'id="savePointBtn">Сохранить</button>' in html
assert 'id="duplicateBtn"' in html and 'id="fillFromAnalogBtn"' in html and 'id="deletePointBtn"' in html
assert 'Формулы, коэффициенты и источники открываются отдельно по кнопке «Подробнее».' in html
assert 'id="calcBtn" type="button">Подробнее</button>' in html
assert '.point-card-actions' in css and '.detail-more-popover' in css
assert '.source-registry-dialog [data-source-list]{min-height:0!important;overflow-y:auto!important' in css
assert '.source-registry-dialog .source-registry-card{min-width:0!important;overflow:visible!important;height:auto!important' in css
assert '["duplicateBtn","fillFromAnalogBtn","deletePointBtn"]' in js
print('1.0.32.6 point card consolidation: PASS')
