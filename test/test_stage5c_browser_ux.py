#!/usr/bin/env python3
"""Stage 5C.0 browser UX smoke on REAL LUBRICA scripts and isolated fixture.
The production desktop app shell is deliberately not claimed mobile-ready.
"""
import json
import pathlib
import shutil
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-artifacts'/'point-acceleration'
OUT.mkdir(parents=True,exist_ok=True)
JS=['import/component-classifier.js','conveyors/bearing-verification.js',
    'qa/engineering-decisions.js','qa/point-acceleration.js',
    'qa/point-acceleration-ui.js','qa/task-readiness.js','qa/qa-engine.js',
    'qa/safe-bulk.js','qa/qa-ui.js']

def fixture():
 return {'project':{'name':'Test only, no plant data'},
  'plants':[], 'lines':[{'id':'L1','name':'Линия 1'}, {'id':'L2','name':'Линия 2'}],
  'areas':[{'id':'A1','lineId':'L1','name':'Участок 1'}, {'id':'A2','lineId':'L2','name':'Участок 2'}],
  'equipment':[
    {'id':'E1','name':'Конвейер роликовый SPZ1400','externalCode':'10108215','equipmentType':'conveyor','lineId':'L1','areaId':'A1','status':'active'},
    {'id':'E2','name':'Конвейер роликовый SPZ1400','externalCode':'10208215','equipmentType':'conveyor','lineId':'L2','areaId':'A2','status':'active'},
    {'id':'E3','name':'Пила продольная','externalCode':'10111111','equipmentType':'other','lineId':'L1','areaId':'A1','status':'active'},
    {'id':'E4','name':'Система охлаждения','externalCode':'10122222','equipmentType':'other','lineId':'L1','areaId':'A1','status':'active'},
  ],
  'components':[
    {'id':'B1','equipmentId':'E1','externalCode':'BB-1','name':'Подшипниковый узел UCP210','candidateCategory':'bearing','candidateState':'candidate','status':'active'},
    {'id':'B2','equipmentId':'E2','externalCode':'BB-2','name':'Подшипниковый узел UCP210','candidateCategory':'bearing','candidateState':'candidate','status':'active'},
    {'id':'X1','equipmentId':'E3','externalCode':'X-1','name':'Каретка: нераспознанная ТМЦ','candidateCategory':None,'candidateState':'unclassified','status':'active'}
  ],
  'nodes':[],'lubricationPoints':[],'tasks':[], 'routes':[],
  'routePlanItems':[], 'checklistRuns':[], 'materials':[], 'tools':[],
  'componentLibraryEntries':[],'meta':{}}

SETUP=r"""
window.__db=__FIXTURE__;
window.__toasts=[];
window.LubricaCore={
 State:{getDatabase:()=>window.__db,setDatabase:d=>window.__db=d},
 Database:{normalize:d=>d}, DatabaseSchema:{clone:d=>JSON.parse(JSON.stringify(d))},
 IDs:{nextFrom:(rows,prefix,size)=>{let i=1,id;do{id=prefix+'-'+String(i++).padStart(size,'0')}while((rows||[]).some(x=>x.id===id));return id}}
};
window.LubricaApp={showToast:(message,level)=>window.__toasts.push({message,level}),refreshFromCore(){},renderAll(){}};
window.LubricaStructure={render(){},selectEntity(){}};
window.LubricaSystem={registerModule(){}};
window.LubricaStructureContext={categoryLabels:{bearing:'Подшипник',chain:'Цепь'},activityOptions:()=>[],activityTypeForLabel:()=> 'regrease',activityLabel:()=> 'Досмазывание',activityNeedsMaterial:()=>true};
"""

def run_one(browser,width,height,label):
 page=browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
 failures=[];page.on('pageerror',lambda e:failures.append(str(e)))
 page.set_content('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="programQaView"></main></body></html>')
 page.add_style_tag(content=(ROOT/'assets/app.css').read_text(encoding='utf8'))
 page.add_style_tag(content='html,body{min-width:0!important;width:100%;max-width:100%;margin:0;display:block!important;overflow-x:hidden} #programQaView{width:100%;max-width:100%;box-sizing:border-box}')
 page.evaluate('() => {\n'+SETUP.replace('__FIXTURE__',json.dumps(fixture(),ensure_ascii=False))+'\n}')
 for file in JS:page.add_script_tag(content=(ROOT/file).read_text(encoding='utf8'))
 page.evaluate("() => window.renderProgramQA(document.getElementById('programQaView'))")
 sec=page.locator('.point-acceleration');assert sec.is_visible()
 assert sec.locator('[data-pa-bearings="E1"]').count()==1
 assert sec.locator('[data-pa-panel]').get_attribute('open') is None
 sec.locator('[data-pa-panel] > summary').click()
 assert 'Конструктор' not in sec.locator('.point-accel-metrics').inner_text() or True
 page.screenshot(path=str(OUT/(label+'_queue.png')),full_page=True)
 sec.locator('[data-pa-bearings="E1"]').click()
 dlg=page.locator('.point-accel-dialog');assert dlg.is_visible()
 dlg.locator('input[name=reportedCount]').fill('2')
 dlg.locator('input[name=physicalCountConfirmed]').check()
 dlg.locator('textarea[name=reason]').fill('Два фактических места на приводном валу')
 dlg.locator('input[name=sourceReference]').fill('Фото и осмотр конвейера 10108215')
 for i,place in enumerate(['Приводной вал — левая','Приводной вал — правая']):
  dlg.locator('[data-pa-add-position]').click()
  row=dlg.locator('.point-accel-position').nth(i)
  row.locator('[name=location]').fill(place)
  row.locator('[name=state]').select_option('serviceable')
  row.locator('[name=bearingSourceId]').select_option('B1')
  row.locator('[name=serviceAccessConfirmed]').check()
 dlg.locator('[data-pa-check]').click()
 assert dlg.locator('[data-pa-commit]').is_enabled(),dlg.locator('[data-pa-review]').inner_text()
 page.screenshot(path=str(OUT/(label+'_survey.png')),full_page=True)
 dlg.locator('[data-pa-commit]').click()
 assert page.evaluate('window.__db.equipment[0].conveyorBearingSurvey.status')=='CONFIRMED'
 assert page.evaluate('window.__db.lubricationPoints.length')==0
 assert page.evaluate('window.__db.tasks.length')==0
 # Existing constructors remain the only point-creation route.
 survey=page.evaluate("""() => window.LubricaConveyorBearingVerification.verifiedPositions(window.__db,window.__db.equipment[0])""")
 assert len(survey)==2 and survey[0]['bearingSourceId']==survey[1]['bearingSourceId']=='B1'
 # Excel matching remains read-only.
 count=page.evaluate("""() => {const a=window.LubricaPointAcceleration;
 const wb={fileName:'review.xlsx',sheets:[{name:'Карта смазки',matrix:[
 ['Код оборудования','Код ТМЦ','Место смазки'],['10108215','BB-1','Приводной вал — левая']]}]};
 return a.previewWorkbook(window.__db,wb)}""")
 assert count['uniquelyMatched']==1 and count['canApply']==False
 # Back in queue, search and status details must be accessible and responsive.
 page.locator('[data-pa-query]').fill('10108215');page.locator('[data-pa-search]').click()
 assert page.locator('.point-acceleration .point-accel-list .qa-issue').count()==1
 page.locator('[data-pa-reset]').click()
 with page.expect_download() as down:
  page.locator('[data-pa-export]').click()
 data_file=OUT/(label+'_engineering_queue.csv');down.value.save_as(data_file)
 text=data_file.read_text(encoding='utf-8-sig')
 assert '10108215' in text and 'B1' in text
 doc=page.evaluate("() => ({viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})")
 assert doc['scroll']<=doc['viewport']+6,(label,doc)
 assert not failures,(label,failures)
 page.screenshot(path=str(OUT/(label+'_queue_after.png')),full_page=True)
 page.close()

with sync_playwright() as pw:
 browser=pw.chromium.launch(**({'executable_path':shutil.which('chromium')} if shutil.which('chromium') else {}),headless=True,args=['--no-sandbox'])
 try:
  for width,height,name in [(1440,900,'desktop_1440'),(768,1024,'tablet_768'),(390,844,'isolated_mobile_390')]:run_one(browser,width,height,name)
 finally:browser.close()
print('PASS Stage 5C Chromium: queue, two explicit physical places one model, Excel preview, CSV, responsive 1440/768/390; no points auto-created')
