from pathlib import Path
r=Path(__file__).resolve().parents[1]
te=(r/'lubrication/task-editor.js').read_text()
ca=(r/'bearings/calculator.js').read_text()
oem=(r/'bearings/multi-oem-data.js').read_text()
assert 'Конструкция и идентификация опоры' in te
assert 'name="snlFeedMethod"' in te
assert 'Сбоку подшипника' in te and 'Через канавку / отверстия наружного кольца' in te
assert "skf_snl_side_service" in ca and "skf_snl_groove_service" in ca
assert "activities=fullReady?['regrease','grease_full_replacement']:['regrease']" in te
assert 'skfSnlHousingTable' in oem and "'522-619':{fill20G:530,fill40G:850,guideRelubeG:70}" in oem
assert "multi-oem-1.0.30" in te
print('SKF SNL UI/LIFECYCLE TEST PASS')
