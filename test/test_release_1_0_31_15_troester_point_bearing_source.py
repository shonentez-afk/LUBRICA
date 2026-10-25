from pathlib import Path
p=Path(__file__).resolve().parents[1]
t=(p/'lubrication/task-editor.js').read_text(encoding='utf-8')
c=(p/'bearings/calculator.js').read_text(encoding='utf-8')
assert "const isTroesterPoint=String(lp?.fanLubrication?.housingFamily||'').trim().toUpperCase()==='TROESTER';" in t
assert "const inferredZoneBearing=!isTroesterPoint&&Array.isArray(lp?.fanLubrication?.internalBearings)" in t
assert "const inferredZoneBearing=resolvedHousingFamily!=='TROESTER'&&Array.isArray(lp.fanLubrication?.internalBearings)" in t
assert "bearingGeometrySource:isTroesterPoint?'POINT_BEARING'" in t
assert "D:isTroesterPoint&&!pointBearingDesignation?null:" in t
assert "B:isTroesterPoint&&!pointBearingDesignation?null:" in t
assert "pointBearingDesignation:input.bearingGeometrySource==='POINT_BEARING'?input.designation:null" in t
assert 'подшипнику текущей точки' in t
assert 'LUBRICA не определяет подшипник по маркировке Tröster' in c
print('PASS 1.0.31.15 Tröster point-bearing source guard')
