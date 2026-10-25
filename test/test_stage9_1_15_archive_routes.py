from pathlib import Path
root=Path(__file__).resolve().parents[1]
eng=(root/'routes/route-engine.js').read_text(encoding='utf-8')
ui=(root/'routes/routes-ui.js').read_text(encoding='utf-8')
css=(root/'assets/app.css').read_text(encoding='utf-8')
checks={
    'engine_can_include_archived': 'includeArchived=false' in eng and "includeArchived||r.status!=='archived'" in eng,
    'restore_api_exists': 'function restoreRoute(' in eng and 'restoreRoute,setRouteStatus' in eng,
    'ui_loads_all_routes': "routeEntries({includeArchived:true})" in ui,
    'archive_filter_exists': 'id="routeStatusFilter"' in ui and '>Архив<' in ui,
    'all_filter_exists': '>Все маршруты<' in ui,
    'restore_button_exists': 'Восстановить в черновик' in ui,
    'archived_not_executable': "if(selected?.status!=='archived')bindChecklistExecution" in ui,
    'archive_preview_exists': 'route-archive-preview' in ui and 'АРХИВНЫЙ МАРШРУТ' in ui,
    'archive_css_exists': 'ROUTES — STAGE 9.1.15 ARCHIVE LIBRARY' in css,
}
failed=[k for k,v in checks.items() if not v]
for k,v in checks.items(): print(('PASS' if v else 'FAIL'), k)
if failed: raise SystemExit('failed: '+', '.join(failed))
