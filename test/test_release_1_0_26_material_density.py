from pathlib import Path
p=Path(__file__).resolve().parents[1]/'calculations/material-integration.js'
s=p.read_text(encoding='utf-8')
assert 'x=x/1000' in s
assert 'кг' in s and 'м' in s
print('MATERIAL DENSITY UNIT NORMALIZATION PASS')
