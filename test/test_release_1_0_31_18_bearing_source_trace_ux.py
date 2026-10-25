from pathlib import Path
root=Path(__file__).resolve().parents[1]
t=(root/'lubrication/task-editor.js').read_text(encoding='utf-8')
s=(root/'bearings/source-registry.js').read_text(encoding='utf-8')
c=(root/'bearings/calculator.js').read_text(encoding='utf-8')
checks={
 'current calculation source title': ("title:'Источники текущего расчёта'" in t) or ("title:'Обоснование расчёта'" in t),
 'focused source ids': 'sourceIds,title:' in t and 'sourceIds' in s,
 'point bearing geometry trace': (('источник геометрии' in t) or ('геометрия:' in t)) and 'POINT_BEARING' in t,
 'troester defaults ventapp': "resolvedHousingFamily==='TROESTER'?'Ventapp':''" in t,
 'bearing header clarified': 'Подшипник точки:' in t and 'производитель:' in t,
 'tf provenance retained or superseded by automatic diagram': ('troesterBaseIntervalSource' in t) or ('troesterUseAutomaticDiagram' in t),
 'tf source semantics superseded safely': ('Это не автоматический расчёт' in t and 'Источник значения tf в карточке не зафиксирован' in c) or ('data-troester-auto-tf' in t and 'troesterUseAutomaticDiagram' in t),
 'global registry remains available': 'Реестр источников расчёта' in s,
}
failed=[k for k,v in checks.items() if not v]
if failed:
    raise SystemExit('FAIL: '+', '.join(failed))
print('PASS 1.0.31.18 bearing current-source trace UX')
