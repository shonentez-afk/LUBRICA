from pathlib import Path
css = (Path(__file__).resolve().parents[1] / "assets" / "app.css").read_text(encoding="utf-8")
assert "LUBRICA 1.0.33.46 — conveyor constructor field collision hotfix" in css
assert "grid-template-columns:minmax(260px,1.45fr) minmax(220px,1.05fr) minmax(190px,.9fr) minmax(180px,.8fr)!important;" in css
assert "grid-column:2!important;" in css
assert "#structureDialog.candidate-finalize-dialog .candidate-source-tmc{" in css
assert "@container candidateFinalize (max-width:620px)" in css
print("PASS: conveyor constructor point/TMC fields are separated and responsive")
