from pathlib import Path
r=Path(__file__).resolve().parents[1]
idx=(r/"index.html").read_text(encoding="utf-8");ui=(r/"routes/routes-ui.js").read_text(encoding="utf-8");ce=(r/"checklist/checklist-engine.js").read_text(encoding="utf-8");f=(r/"checklist/frv-engine.js").read_text(encoding="utf-8")
checks={"loaded":'frv-engine.js' in idx,"categories":all(x in f for x in ['preparation','movement','lubrication','waiting','search','access','other_loss']),"run scoped":'frvEntries' in f,"single active":'FRV_ALREADY_ACTIVE' in f,"ui":'ФРВ выполнения' in ui and 'Фотография рабочего времени' in ui,"freeze":'LubricaFRV?.freeze' in ce and 'frv:frvFact' in ce,"no new tasks":'taskResults.push' not in f and 'tasks.push' not in f}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit("STAGE 9.4.2 FRV UX FAIL "+str(bad))
print("STAGE 9.4.2 FRV UX PASS",checks)