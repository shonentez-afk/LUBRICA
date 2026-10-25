from pathlib import Path
from openpyxl import load_workbook
import re, os, sys
BASE=Path(os.environ.get('LUBRICA_IMPORT_DIR','/mnt/data'))
AREA_FILES=['Участок ламинирования и кэширования.xlsx','Участок упаковки.xlsx','Участок распиловки.xlsx','Участок возврата отходов краёв.xlsx','Участок камеры полимеризации.xlsx','Участок камеры волокноосаждения.xlsx','Участок центрифуг.xlsx','Участок дожига ваграночных газов.xlsx','Участок вагранки.xlsx','Участок загрузки суточных силосов структура и позиции.xlsx']
FULL='Структура оборудования_01.09.2026.xlsx'
if not all((BASE/n).exists() for n in AREA_FILES+[FULL]):
    print('SOURCE XLSX AUDIT SKIP: source files not found');sys.exit(0)
def clean(v):return str(v or '').strip()
def norm(v):return re.sub(r'\s+',' ',clean(v).lower()).strip()
def rows(wb,name):
    vals=list(wb[name].iter_rows(values_only=True));h=[clean(x) for x in vals[0]];return [dict(zip(h,r)) for r in vals[1:]]
def get(r,*ks):
    d={norm(k):v for k,v in r.items()}
    for k in ks:
        if norm(k) in d:return d[norm(k)]
    return ''
def strip_prefix(v):return re.sub(r'^\s*\d+[\.\s-]+','',clean(v)).strip()
equipment={};components={}
for name in AREA_FILES:
    wb=load_workbook(BASE/name,read_only=True,data_only=True)
    if wb.sheetnames!=['Позиции','Структура позиций','ТМЦ','Структура ТМЦ']:raise AssertionError(f'{name}: unexpected sheets {wb.sheetnames}')
    pos,ps,assets,astr=rows(wb,'Позиции'),rows(wb,'Структура позиций'),rows(wb,'ТМЦ'),rows(wb,'Структура ТМЦ')
    poscodes={clean(get(r,'Position')) for r in pos if clean(get(r,'Position'))}
    for r in pos:
        code=clean(get(r,'Position')); namev=clean(get(r,'Description'))
        if code and namev:equipment[code]={'externalCode':code,'name':namev}
    amap={clean(get(r,'Child code','Child Code')):clean(get(r,'Position Code')) for r in astr if clean(get(r,'Child code','Child Code'))}
    for r in assets:
        code=clean(get(r,'Asset')); namev=clean(get(r,'Description'))
        if not code or not namev:continue
        parent=amap.get(code,''); old=components.get(code,{})
        components[code]={**old,'externalCode':code,'name':namev,'parent':parent or old.get('parent',''),'equipmentCode':parent if parent in equipment else old.get('equipmentCode')}
# Full structure provides additional equipment and can resolve previously imported repair objects.
wb=load_workbook(BASE/FULL,read_only=True,data_only=True); vals=list(wb[wb.sheetnames[0]].iter_rows(values_only=True));h=[clean(x) for x in vals[0]];rs=[dict(zip(h,r)) for r in vals[1:]]
types={clean(get(r,'Оборудование')):clean(get(r,'Тип в структуре')) for r in rs}; names={clean(get(r,'Оборудование')):strip_prefix(get(r,'Наименование оборудования')) for r in rs}
def pcodes(r):return [x.strip() for x in clean(get(r,'Путь')).split(',') if x.strip()]
def context(r):
    line=area=''; path=pcodes(r)
    for c in path:
        tp=norm(types.get(c)); nm=names.get(c,'')
        if not line and tp=='система' and re.search(r'линия\s*№?\s*\d+',nm,re.I):line=c
        elif line and not area and tp=='система' and c!=line:area=c
    return path,line,area
full_eq={}; full_areas=set(); full_lines=set()
for r in rs:
    code=clean(get(r,'Оборудование'));tp=norm(get(r,'Тип в структуре'));lvl=int(get(r,'Уровень в структуре') or 0);path,line,area=context(r)
    if not code or not line:continue
    full_lines.add(line)
    if area:full_areas.add(area)
    if code in (line,area):continue
    if tp=='объект ремонта':
        parent=next((c for c in reversed(path) if c!=code and c in full_eq),None); old=components.get(code,{})
        if parent:components[code]={**old,'externalCode':code,'name':names.get(code,''),'parent':parent,'equipmentCode':parent}
    elif tp=='позиция' or (tp=='система' and lvl>=3):
        equipment[code]={'externalCode':code,'name':names.get(code,'')};full_eq[code]=equipment[code]
# final cross-file parent resolution
for c in components.values():
    if not c.get('equipmentCode') and c.get('parent') in equipment:c['equipmentCode']=c['parent']
unresolved=[c for c in components.values() if not c.get('equipmentCode')]
assert len(full_lines)==2, len(full_lines)
assert len(full_areas)==23, len(full_areas)
assert len(equipment)==1244, len(equipment)
assert len(components)==5672, len(components)
assert len(unresolved)==1, [(x['externalCode'],x['name']) for x in unresolved]
print('SOURCE XLSX AUDIT PASS',{'equipment':len(equipment),'components':len(components),'fullAreas':len(full_areas),'unresolved':len(unresolved)})
print('UNRESOLVED',[(x['externalCode'],x['name'],x.get('parent','')) for x in unresolved])
