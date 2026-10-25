from pathlib import Path
r=Path(__file__).resolve().parents[1]
g=(r/'ui/user-guide.js').read_text(encoding='utf-8')
checks={
 'materials chapter':'Материалы, маркировка, инструменты и этикетки' in g,
 'symbol explained':'символ' in g.lower() and 'маркиров' in g.lower(),
 'material label explained':'60×30' in g and 'этикет' in g.lower(),
 'tool inheritance explained':'наслед' in g.lower() and 'закрепл' in g.lower(),
 'tool label guard':'без закреплённого материала' in g,
 'materials view':'\"view\":\"materials\"' in g,
 'workflow updated':'Материалы → Карта' in g,
 '15 chapters':g.count('\"id\":')>=15,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('GUIDE LABELS FAIL '+str(bad))
print('GUIDE LABELS PASS',checks)
