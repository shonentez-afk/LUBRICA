from pathlib import Path
r=Path(__file__).resolve().parents[1]
tree=(r/'structure/tree-ui.js').read_text(encoding='utf-8')
detail=(r/'structure/detail-ui.js').read_text(encoding='utf-8')
assert 'global.LubricaStructureDetail?.render?.(d)' in tree
assert 'renderDetail(d)' not in tree
assert 'x.dC.escription' not in detail
assert 'x.description' in detail
print('STRUCTURE DETAIL STATIC CONTRACT PASS')
