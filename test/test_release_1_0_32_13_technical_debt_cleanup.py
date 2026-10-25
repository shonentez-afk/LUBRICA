from pathlib import Path
r=Path(__file__).resolve().parents[1]
required=['01_СОСТАВ_АРХИВА.md','02_РУКОВОДСТВО_ПО_КОДУ.md','Создать ярлык LUBRICA.bat']
missing=[x for x in required if not (r/x).exists()]
assert not missing, missing
assert '1.0.32.13' in (r/'manifest.json').read_text(encoding='utf-8')
assert 'APP_VERSION="1.0.32.13"' in (r/'data/demo-data.js').read_text(encoding='utf-8')
assert "appVersion:'1.0.32.13'" in (r/'core/database-schema.js').read_text(encoding='utf-8')
assert "materialMode==='explicit'" in (r/'test/test_candidate_finalization.js').read_text(encoding='utf-8')
assert "guide fifteen" in (r/'test/test_stage9_8_7_settings_symmetric.py').read_text(encoding='utf-8')
print('RELEASE 1.0.32.13 TECHNICAL DEBT CLEANUP PASS')
