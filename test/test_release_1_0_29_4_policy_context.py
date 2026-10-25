from pathlib import Path
r=Path(__file__).resolve().parents[1]
te=(r/'lubrication/task-editor.js').read_text()
ca=(r/'bearings/calculator.js').read_text()
assert "policy.id==='housed_relube_only'&&r.value" in te
assert "policyId==='zlg_relube_only'?'OEM-досмазывание ZLG'" in te
assert "error:policy.reason" in ca
assert "multi-oem-1.0.30" in te
print('PASS 1.0.29.4 policy context audit')
