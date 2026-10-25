from pathlib import Path
r=Path(__file__).resolve().parents[1]
tree=(r/'structure/tree-ui.js').read_text(encoding='utf-8')
workspace=(r/'ui/workspace.js').read_text(encoding='utf-8')
migrations=(r/'core/database-migrations.js').read_text(encoding='utf-8')
runtime=(r/'js/runtime.js').read_text(encoding='utf-8')
checks={
 'tree uses lp.name':'const pointName=lp.name||categoryLabel' in tree,
 'tree keeps category context':'const pointSub=categoryLabel&&categoryLabel!==pointName' in tree,
 'legacy exposes pointName':migrations.count('pointName:')>=1 and 'p.pointName=lp?.name' in migrations,
 'workspace displays pointName':'p.pointName||p.component' in workspace,
 'search includes pointName':"${p.pointName||''}" in runtime,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('RELEASE 1.0.7 POINT NAME UI FAIL '+str(bad))
print('RELEASE 1.0.7 POINT NAME UI PASS',checks)
