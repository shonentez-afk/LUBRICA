#!/usr/bin/env python3
"""Stage R2: real route UI + real checklist engine, synthetic in-progress route.
No factory JSON, route generation or production writes.
"""
import json
import pathlib
import shutil
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-artifacts'/'routes-r2'
OUT.mkdir(parents=True,exist_ok=True)

def fixture():
 tasks=[
  {'taskId':'T1','pointKey':'P1','pointId':'LP-001','pointName':'Опора привода DE','routeStep':1,
   'operation':'Досмазывание','quantityPrimary':'12 г','materialCode':'GR-01','materialName':'SKF LGHP 2',
   'toolCode':'G-01','toolName':'Шприц','templateTitle':'Проверка подшипника','steps':['Очистить маслёнку','Внести 12 г']},
  {'taskId':'T2','pointKey':'P1','pointId':'LP-001','pointName':'Опора привода DE','routeStep':1,
   'operation':'Проверка состояния','quantityPrimary':'—','materialCode':'','materialName':'',
   'templateTitle':'Контроль','steps':['Осмотреть']},
  {'taskId':'T3','pointKey':'P2','pointId':'LP-002','pointName':'Опора привода NDE','routeStep':2,
   'operation':'Досмазывание','quantityPrimary':'10 г','materialCode':'GR-01','materialName':'SKF LGHP 2',
   'templateTitle':'Проверка подшипника','steps':['Очистить','Внести 10 г']}]
 model={'title':'Маршрут пилы','line':'Линия 1','area':'Распиловка','assignee':'Смазчик','interval':'1 месяц',
        'pointCount':2,'taskCount':3,'estimatedMinutes':35,'materials':[{'code':'GR-01','name':'SKF LGHP 2'}],
        'tools':[{'code':'G-01','name':'Шприц'}],
        'groups':[{'equipmentCode':'10110182','equipment':'Пила ленточная № 1',
                   'node':'Привод','tasks':tasks}]}
 points=[{'id':t['taskId'],'taskId':t['taskId'],'pointDisplayId':t['pointId'],
          'equipment':'Пила ленточная № 1','position':'10110182','unit':'Привод',
          'operation':t['operation'],'interval':'1 месяц','material':'SKF LGHP 2'} for t in tasks]
 route={'id':'R1','code':'M-01','name':'Маршрут пилы','source':'manual','status':'active',
        'line':'Линия 1','area':'Распиловка','interval':'1 месяц','lineId':'L1','areaId':'A1',
        'revision':1,'estimatedMinutes':35,'points':points,'pointGroups':[{'equipmentCode':'10110182',
        'pointName':'Опора привода','pointDisplayId':'LP-001','equipment':'Пила ленточная № 1',
        'node':'Привод','tasks':[{'operation':'Досмазывание','id':'T1'}]}],
        'taskIds':['T1','T2','T3'],'physicalPointCount':2}
 run={'id':'CHK-01','status':'in_progress','routeId':'R1','executionNo':1,'routeRevision':1,
      'date':'2026-11-19','performer':'Смазчик А.','shift':'1','routeTaskIds':['T1','T2','T3'],
      'taskResults':{'T1':{'done':True,'resultStatus':'completed','actualQuantity':'12'}},
      'routeSnapshot':model,'startedAt':'2026-11-19T05:00:00Z','updatedAt':'2026-11-19T05:00:00Z'}
 return {'route':route,'model':model,'run':run,
         'db':{'tasks':[{'id':t['taskId'],'approvalStatus':'approved'} for t in tasks],
               'checklistRuns':[run],'routePlanItems':[]}}

def check(browser,width,height,label):
 page=browser.new_page(viewport={'width':width,'height':height})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body>'+
                  '<div id="routes" style="display:block;width:100%;max-width:100%;height:100%;min-width:0"></div>'+
                  '<dialog id="routeExecutionDialog"></dialog><dialog id="actionDialog"></dialog></body></html>')
 page.add_style_tag(content=(ROOT/'assets/app.css').read_text(encoding='utf-8'))
 page.add_style_tag(content=(ROOT/'assets/route-compact.css').read_text(encoding='utf-8'))
 page.add_style_tag(content='html,body{min-width:0!important;width:100%;max-width:100%;margin:0;overflow-x:hidden;}'
                    '#routes{display:block!important;position:relative!important;inset:auto!important;padding:0!important;overflow:visible!important;}'
                    '.routes-workspace{height:auto!important;min-height:600px;}'
                    '.routes-split{height:auto!important;min-height:700px;}'
                    '.route-preview{min-width:0!important;}'
                    '.route-preview-scroll{height:auto!important;max-height:none!important;overflow:visible!important;}')
 data=fixture()
 setup="""
 window.global=window;
 window.__fixture=__DATA__;
 window.__db=window.__fixture.db;
 window.__route=window.__fixture.route;
 window.esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.SCOPE_LABELS={};
 window.taskKey=p=>p.taskId||p.id;
 window.LubricaSystem={registerModule(){}};
 window.LubricaApp={showToast:(message)=>{window.__toasts=(window.__toasts||[]).concat(message)},refreshFromCore(){}};
 window.LubricaCore={State:{getDatabase:()=>window.__db,setDatabase:d=>{window.__db=d}}};
 window.LubricaRouteEngine={routeEntries:()=>[window.__route],
   revisionState:()=>({revision:1,changed:false}),routeRevisions:()=>[]};
 window.__printedTable=false;
 window.print=()=>{window.__printedTable=!!document.querySelector('.checklist-task-table');window.dispatchEvent(new Event('afterprint'))};
 """
 page.evaluate('() => { '+setup.replace('__DATA__',json.dumps(data,ensure_ascii=False))+' }')
 for path in ['checklist/checklist-engine.js','routes/route-compact-ui.js','routes/routes-ui.js']:
  page.add_script_tag(content=(ROOT/path).read_text(encoding='utf-8'))
 page.evaluate('() => window.renderRoutes(document.getElementById("routes"))')
 assert page.locator('[data-route-sheet-mode="compact"]').get_attribute('aria-pressed')=='true'
 assert page.locator('.route-visit-card').count()==2,'3 events -> 2 physical places'
 assert page.locator('.route-visit-task').count()==3
 assert page.locator('.route-visit-card:first-child .route-visit-task').count()==2
 assert page.locator('.checklist-task-table').count()==0,'no duplicate live inputs in compact view'
 assert page.locator('[data-task-actual-quantity="T1"]').input_value()=='12'
 assert page.locator('.route-visit-step').first.inner_text()=='1'
 assert 'Обработано 1/3' in page.locator('.checklist-progress-block').inner_text()
 page.locator('[data-task-result="T2"]').select_option('skipped')
 assert page.locator('[data-task-observation="T2"]').count()==1,'skipped reason field remains visible'
 page.locator('[data-task-observation="T2"]').fill('Нет доступа к узлу')
 assert page.evaluate('window.__db.checklistRuns[0].taskResults.T2.deviationReason')=='Нет доступа к узлу'
 assert 'Обработано 2/3' in page.locator('.checklist-progress-block').inner_text()
 page.locator('[data-route-visit-filter]').select_option('deviations')
 assert page.locator('.route-visit-card').count()==1
 assert page.locator('.route-visit-card').first.get_attribute('data-route-visit')=='P1'
 page.locator('[data-route-sheet-mode="table"]').click()
 assert page.locator('.route-visit-card').count()==0
 assert page.locator('.checklist-task-table').count()==1
 assert page.locator('.checklist-task-table [data-task-result]').count()==3
 page.locator('[data-route-sheet-mode="compact"]').click()
 assert page.locator('.route-visit-card').count()==1,'filter and fact persist across layout change'
 page.locator('#printChecklist').click()
 assert page.evaluate('window.__printedTable')==True,'print must have full table'
 assert page.locator('.route-visit-card').count()==1,'compact mode restored after print'
 page.locator('[data-route-visit-filter]').select_option('all')
 page.locator('[data-task-result="T3"]').select_option('completed')
 assert page.evaluate('window.__db.checklistRuns[0].taskResults.T3.done')==True
 assert 'Обработано 3/3' in page.locator('.checklist-progress-block').inner_text()
 assert not errors,errors
 dim=page.evaluate('({doc:document.documentElement.clientWidth,body:document.body.scrollWidth,card:document.querySelector(".route-visit-card").getBoundingClientRect().width})')
 assert dim['body'] <= dim['doc']+8,(label,dim)
 page.screenshot(path=str(OUT/(label+'.png')),full_page=True)
 page.close()

with sync_playwright() as pw:
 binary=shutil.which('chromium')
 browser=pw.chromium.launch(**({'executable_path':binary} if binary else {}),headless=True,args=['--no-sandbox'])
 try:
  for width,height,label in [(1440,900,'desktop_1440'),(768,1024,'tablet_768'),(390,844,'isolated_390')]:
   check(browser,width,height,label)
 finally:
  browser.close()
print('ROUTE COMPACT R2 CHROMIUM PASS: 1440/768/390, real checklist writes, skipped reasons, print and focus, screenshots')
