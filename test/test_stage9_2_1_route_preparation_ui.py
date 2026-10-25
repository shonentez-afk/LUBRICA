from pathlib import Path
root=Path(__file__).resolve().parents[1]
ui=(root/'routes/routes-ui.js').read_text(encoding='utf-8');css=(root/'assets/app.css').read_text(encoding='utf-8');idx=(root/'index.html').read_text(encoding='utf-8');eng=(root/'routes/route-preparation.js').read_text(encoding='utf-8')
checks={'module loaded':'./routes/route-preparation.js' in idx,'preparation button':'Подготовка к выполнению' in ui,'existing events wording':'мероприятиям, уже включённым в маршрут и настроенным в карточках точек' in ui,'materials section':'Материалы к подготовке' in ui,'tools section':'Смазочное оборудование / инструмент' in ui,'readiness':'Готовность маршрута' in ui,'csv':'CSV подготовки' in ui,'print':'data-prep-print' in ui,'safe units':'calculatedGrams' in eng and "dim:'mass'" in eng and "dim:'volume'" in eng,'no invented PPE resources':'Общие СИЗ' in ui and 'не рассчитываются автоматически' in ui,'modal owned sizing':'#routeExecutionDialog:has(.route-preparation-dialog)' in css,'sticky footer':'.route-preparation-dialog>.route-modal-footer' in css,'start integration':'prepBlocked' in ui and 'data-open-preparation' in ui and "data-confirm-start ${prepBlocked?'disabled':''}" in ui}
bad=[k for k,v in checks.items() if not v]
if bad: print('STAGE 9.2.1 ROUTE PREPARATION UI FAIL',bad);raise SystemExit(1)
print('STAGE 9.2.1 ROUTE PREPARATION UI PASS',checks)
