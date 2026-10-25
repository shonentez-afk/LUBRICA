from pathlib import Path
import json,re
r=Path(__file__).resolve().parents[1]
s=(r/'components/starter-data.js').read_text(encoding='utf-8')
assert s.startswith('window.LubricaComponentStarterData=')
data=json.loads(s.split('=',1)[1].rstrip().rstrip(';'))
by={x['designation']:x for x in data if x.get('category')=='gearbox_oil'}
expected={
'KA57B':{'M1':1.1,'M2':2.2,'M3':2.2,'M4':2.8,'M5':2.3,'M6':2.1},
'KA77B':{'M1':2.2,'M2':4.1,'M3':4.4,'M4':5.8,'M5':4.2,'M6':4.4},
'KA87B':{'M1':3.7,'M2':8.0,'M3':8.7,'M4':10.9,'M5':8.0,'M6':8.0},
'KA107B':{'M1':10.0,'M2':21.0,'M3':25.5,'M4':33.5,'M5':24.0,'M6':24.0},
}
for k,v in expected.items():
    assert k in by,k
    assert by[k]['manufacturer']=='SEW-EURODRIVE'
    assert by[k]['technicalData']['mountingFillLiters']==v,(k,by[k]['technicalData']['mountingFillLiters'])
js=(r/'lubrication/task-editor.js').read_text(encoding='utf-8')
assert "summary.style.display=isBearing?'':'none'" in js
assert "generic.style.display=isBearing?'none':''" in js
adapter=(r/'calculations/gearbox-oil-adapter.js').read_text(encoding='utf-8')
assert 'Объём из Справочника подставится автоматически' in adapter
assert 'task.activityType===\'oil_change\'' in adapter
binding=(r/'components/binding.js').read_text(encoding='utf-8')
assert "point.category!=='bearing'&&!entry" in binding
print('1.0.24 GEARBOX CONTRACT PASS',len(expected))
