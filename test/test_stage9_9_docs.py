from pathlib import Path
r=Path(__file__).resolve().parents[1]
names=['01_СОСТАВ_АРХИВА.md','02_РУКОВОДСТВО_ПО_КОДУ.md']
missing=[x for x in names if not (r/x).exists()]
if missing: raise SystemExit('PRODUCTION DOCS MISSING '+str(missing))
for x in names:
    if (r/x).stat().st_size<5000: raise SystemExit('PRODUCTION DOC TOO SMALL '+x)
print('PRODUCTION DOCUMENTATION TEST PASS',names)
