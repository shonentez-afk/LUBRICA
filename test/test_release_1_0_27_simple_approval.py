from pathlib import Path
ui=Path(__file__).resolve().parents[1]/'lubrication'/'task-editor.js'
s=ui.read_text(encoding='utf-8')
for token in ['Быстрое утверждение','data-approve-all','data-approve-dose','data-approve-fill','data-approve-interval','autoApprovalSource','multi-oem-1.0.27.0']:
    assert token in s, token
css=(Path(__file__).resolve().parents[1]/'assets'/'app.css').read_text(encoding='utf-8')
assert '.bearing-simple-approval' in css
print('PASS 1.0.27 simple approval UX')
