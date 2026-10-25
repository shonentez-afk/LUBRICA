from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
s=(r/'components/starter-data.js').read_text(encoding='utf-8')
assert s.startswith('window.LubricaComponentStarterData=')
data=json.loads(s.split('=',1)[1].rstrip().rstrip(';'))
by={x['designation']:x for x in data if x.get('category')=='gearbox_oil'}
fixed={
 'UD-RV025':0.023,'UD-RV030':0.05,'UD-RV040':0.1,'UD-RV050':0.15,
 'UD-RV063':0.3,'UD-RV075':0.5,'UD-RV090':1.0,
 'UD-PC063':0.05,'UD-PC071':0.07,'UD-PC080':0.15,'UD-PC090':0.16,
}
for k,v in fixed.items():
    assert k in by,k
    assert by[k]['technicalData']['fixedFillLiters']==v,(k,by[k]['technicalData'])
    assert 'стр. 62' in by[k]['sourceReference']
variable={
 'UD-RV110':{'B3':3.0,'B6':2.5,'B7':2.5,'B8':2.2,'V5':3.0,'V6':2.2},
 'UD-RV130':{'B3':4.5,'B6':3.5,'B7':3.5,'B8':3.3,'V5':4.5,'V6':3.3},
 'UD-RV150':{'B3':7.0,'B6':5.1,'B7':5.4,'B8':5.4,'V5':7.0,'V6':5.1},
}
for k,v in variable.items():
    assert k in by,k
    assert by[k]['technicalData']['mountingFillLiters']==v,(k,by[k]['technicalData'])
    assert list(by[k]['technicalData']['mountingFillLiters'])==['B3','B6','B7','B8','V5','V6']
# Source-table oil recommendations are captured, not invented.
assert by['UD-RV063']['lubricationData']['recommendedOil']['isoViscosity']=='VG320'
assert by['UD-RV063']['lubricationData']['recommendedOil']['shell']=='Tivela OILS 320'
opts=by['UD-RV130']['lubricationData']['recommendedOilOptions']
assert opts[0]=={'temperatureC':'-5…+40','isoViscosity':'VG460','shell':'Omala OIL 460'}
assert opts[1]=={'temperatureC':'-15…+25','isoViscosity':'VG460','shell':'Omala OIL 220'}
# UX supports fixed catalog fills and non-SEW mounting-position codes.
adapter=(r/'calculations/gearbox-oil-adapter.js').read_text(encoding='utf-8')
assert 'fixedFill=n(td.fixedFillLiters)' in adapter
assert 'positionCodes=fills?Object.keys(fills):[]' in adapter
assert 'Выберите положение' in adapter
assert 'объём ${esc(fixedFill)} л не зависит от монтажного положения' in adapter
# Binding applies fixed volumes immediately.
binding=(r/'components/binding.js').read_text(encoding='utf-8')
assert 't.fixedFillLiters!=null?t.fixedFillLiters' in binding
# Matcher supports explicit aliases such as UD-RV-063 / RV063.
matcher=(r/'components/matcher.js').read_text(encoding='utf-8')
assert 'aliasVariants' in matcher
assert 'UD-RV-063' in by['UD-RV063']['aliases']
print('1.0.25 UNIT DRIVE GEARBOX CONTRACT PASS',len(fixed)+len(variable))
