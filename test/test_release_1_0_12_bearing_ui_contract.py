from pathlib import Path
r=Path(__file__).resolve().parents[1]
ui=(r/'bearings/library-ui.js').read_text(encoding='utf-8')
lib=(r/'bearings/library.js').read_text(encoding='utf-8')
calc=(r/'bearings/calculator.js').read_text(encoding='utf-8')
cat=(r/'bearings/catalog-data.js').read_text(encoding='utf-8')
checks={
 'type filter':'bearingTypeFilter' in ui,
 'bore filter':'bearingBoreFilter' in ui and 'd ≤ 150 мм' in ui,
 'housed insert display':'insertDesignation' in ui,
 'search housed fields':'housingStyleLabel' in lib and 'insertDesignation' in lib,
 'bearing unit calculator':'bearing_unit' in calc,
 'housed source':'expanded_housed_units' in cat,
 'roller source':'expanded_common_metric_roller' in cat,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('BEARING UI CONTRACT FAIL '+str(bad))
print('RELEASE 1.0.12 BEARING UI CONTRACT PASS',checks)
