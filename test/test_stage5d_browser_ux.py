#!/usr/bin/env python3
"""LUBRICA Stage 5D: real scripts in Chromium, synthetic saw/shaft equipment.
The responsive test isolates dialogs; the entire desktop shell is not mobile-certified.
"""
import json
import pathlib
import shutil
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-artifacts'/'saws-shafts';OUT.mkdir(parents=True,exist_ok=True)
MODULES=['import/component-classifier.js','import/candidate-finalizer.js',
         'rotating/rotating-arrangement.js','machines/saw-cut-arrangement.js']

def fixture():
 return {'project':{'name':'Synthetic saw proof'},'plants':[], 'lines':[{'id':'L1','name':'Линия 1'}],
 'areas':[{'id':'A1','lineId':'L1','name':'Распиловка'}],
 'equipment':[
  {'id':'GROUP','name':'Пилы ленточные','externalCode':'10110181','lineId':'L1','equipmentType':'other'},
  {'id':'SAW1','name':'Пила ленточная №1','externalCode':'10110182','lineId':'L1','parentEquipmentId':'GROUP','equipmentType':'other'},
  {'id':'WHEEL','name':'Колесо №1 пилы по толщине','externalCode':'10110196','lineId':'L1','parentEquipmentId':'SAW1','equipmentType':'other'},
  {'id':'SHAFT','name':'Вал приводной','externalCode':'10110195','lineId':'L1','equipmentType':'rotating_shaft'}],
 'components':[
  {'id':'B-SAW','name':'Узел подшипниковый UCPA 210','externalCode':'10110197','equipmentId':'WHEEL','candidateCategory':'bearing','candidateState':'candidate','status':'active'},
  {'id':'B-SEALED','name':'Подшипник 6211-2RS1-C3','externalCode':'10110186','equipmentId':'SAW1','candidateCategory':'bearing','candidateState':'candidate','status':'active'},
  {'id':'B-SHAFT','name':'Подшипниковый узел UCP210','externalCode':'10110198','equipmentId':'SHAFT','candidateCategory':'bearing','candidateState':'candidate','status':'active'}],
 'lubricationPoints':[],'tasks':[],'nodes':[],'routes':[], 'routePlanItems':[],
 'checklistRuns':[],'materials':[],'tools':[]}

SETUP=r'''
window.__db=__FIXTURE__;
window.__toasts=[];
window.LubricaCore={State:{getDatabase:()=>window.__db,setDatabase:d=>window.__db=d},
 Database:{normalize:d=>d},DatabaseSchema:{clone:d=>JSON.parse(JSON.stringify(d))},
 IDs:{nextFrom:(rows,prefix,n)=>{let i=1,k;do{k=prefix+'-'+String(i++).padStart(n,'0')}while(rows.some(x=>x.id===k));return k}}};
window.LubricaStructureContext={categoryLabels:{bearing:'Подшипник'},activityOptions:()=>[],
 activityTypeForLabel:()=> 'regrease',activityLabel:()=> 'Досмазывание',activityNeedsMaterial:()=>true};
window.LubricaApp={showToast:(message,level)=>window.__toasts.push({message,level}),refreshFromCore(){},renderAll(){}};
window.LubricaStructure={render(){}};
window.LubricaCandidates={render(){}};
window.LubricaSystem={registerModule(){}};
'''

def run_case(browser,width,height,label):
 page=browser.new_page(viewport={'width':width,'height':height})
 errors=[];page.on('pageerror',lambda x:errors.append(str(x)))
 page.set_content('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><dialog id="structureDialog"></dialog></body></html>')
 page.add_style_tag(content=(ROOT/'assets/app.css').read_text(encoding='utf-8'))
 page.add_style_tag(content='html,body{min-width:0!important;width:100%;max-width:100%;margin:0;display:block!important;overflow-x:hidden}')
 page.evaluate('() => {\n'+SETUP.replace('__FIXTURE__',json.dumps(fixture(),ensure_ascii=False))+'\n}')
 for filename in MODULES:page.add_script_tag(content=(ROOT/filename).read_text(encoding='utf8'))

 page.evaluate("() => window.LubricaSawCutArrangement.open('GROUP')")
 page.locator('.saw-cut-form details summary').first.click()
 assert page.locator('[data-saw-child="SAW1"]').is_visible()
 assert page.locator('.saw-physical-row').count()==0
 page.locator('[data-saw-child="SAW1"]').click()
 assert page.locator('.saw-cut-form').is_visible()
 assert page.locator('text=10110197').count()>0
 assert page.locator('.saw-physical-row').count()==0
 page.locator('[data-add]').click()
 row=page.locator('.saw-physical-row').first
 row.locator('select[name=sourceId]').select_option('B-SAW')
 row.locator('input[name=location]').fill('Колесо №1 — левая доступная опора')
 row.locator('select[name=state]').select_option('serviceable')
 row.locator('input[name=access]').check()
 page.locator('input[name=sourceReference]').fill('Осмотр колесо 10110196 / фото')
 page.locator('[data-check]').click()
 assert page.locator('[data-save]').is_enabled(),page.locator('[data-result]').inner_text()
 page.screenshot(path=str(OUT/(label+'_saw.png')))
 page.locator('[data-save]').click()
 assert page.evaluate('window.__db.lubricationPoints.length')==1
 assert page.evaluate('window.__db.tasks[0].approvalStatus')=='review'
 assert page.evaluate('window.__db.lubricationPoints[0].equipmentId')=='WHEEL'

 page.evaluate("() => window.LubricaRotatingArrangement.open('equipment','SHAFT')")
 assert page.locator('.rotating-confirm-form').is_visible()
 assert page.locator('select[name=rot_count]').input_value()=='0'
 assert page.locator('[data-rot-rows]').locator('article').count()==0
 page.locator('select[name=rot_count]').select_option('2')
 page.locator('input[name=rot_count_confirmed]').check()
 assert page.locator('.rotating-physical-row').count()==2
 for i,location in enumerate(['Вал — левая','Вал — правая']):
  row=page.locator('.rotating-physical-row').nth(i)
  row.locator('input[name=location]').fill(location)
  row.locator('select[name=bearingSourceId]').select_option('B-SHAFT')
  row.locator('select[name=state]').select_option('serviceable')
  row.locator('input[name=access]').check()
 page.locator('input[name=rot_source]').fill('Осмотр, шильдик и фото вала')
 page.locator('[data-check]').click()
 assert page.locator('[data-save]').is_enabled(),page.locator('[data-rot-result]').inner_text()
 page.screenshot(path=str(OUT/(label+'_shaft.png')))
 page.locator('[data-save]').click()
 assert page.evaluate('window.__db.lubricationPoints.length')==3
 assert page.evaluate('window.__db.tasks.every(t=>t.approvalStatus==="review")')
 assert page.evaluate('window.__db.lubricationPoints.filter(p=>p.equipmentId==="SHAFT").length')==2
 assert not errors,errors
 doc=page.evaluate('({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
 assert doc['scroll']<=doc['width']+6,(label,doc)
 page.close()

with sync_playwright() as pw:
 browser=pw.chromium.launch(**({'executable_path':shutil.which('chromium')} if shutil.which('chromium') else {}),headless=True,args=['--no-sandbox'])
 try:
  for width,height,label in [(1440,900,'desktop_1440'),(768,1024,'tablet_768'),(390,844,'isolated_mobile_390')]:
   run_case(browser,width,height,label)
 finally:browser.close()
print('PASS Stage 5D Chromium saw/shaft forms 1440/768/390; physical source/access, review only, no virtual supports')
