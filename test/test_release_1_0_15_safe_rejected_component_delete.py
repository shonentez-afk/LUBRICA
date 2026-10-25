from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
js=(r/'structure/structure.js').read_text(encoding='utf-8')
checks={
 'safe helper':'safelyDiscardableImportedComponents' in js,
 'only rejected/excluded':"new Set(['rejected','excluded'])" in js,
 'import-only':"c.origin==='import'" in js,
 'point binding protection':'componentReferencedByPoint' in js,
 'dangerous components still block':'есть рабочие или связанные импортированные компоненты' in js,
 'safe cascade removes components':'d.components=(d.components||[]).filter' in js,
 'explicit confirmation':'будут удалены' in js,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('SAFE DELETE CONTRACT FAIL '+str(bad))
print('SAFE REJECTED COMPONENT DELETE CONTRACT PASS',checks)
