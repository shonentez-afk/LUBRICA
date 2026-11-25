#!/usr/bin/env python3
"""R4 actual planning dialog, workload/PPR UI and shift assignment."""
import pathlib,shutil
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-artifacts'/'routes-r4'
OUT.mkdir(parents=True,exist_ok=True)
SETUP=r'''
window.global=window;window.__writes=0;
window.LubricaSystem={registerModule(){}};
window.LubricaApp={showToast(){}};
window.__db={lines:[{id:'L1',name:'Линия 1'},{id:'L2',name:'Линия 2'}],routes:[{id:'A',name:'Подшипники',code:'A',lineId:'L1',status:'active',scheduleKey:'days:7',interval:'1 нед.'},{id:'B',name:'Цепи',code:'B',lineId:'L2',status:'active',scheduleKey:'days:14',interval:'2 нед.'}],routePlanItems:[],checklistRuns:[]};
window.LubricaCore={State:{getDatabase:()=>window.__db,setDatabase:x=>{window.__db=x;window.__writes++}}};
window.LubricaRouteEngine={routeRevisions:()=>[]};
'''
def check(browser,width,height,label):
 page=browser.new_page(viewport={'width':width,'height':height})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body><div id="routes"></div><dialog id="routePlanningDialog"></dialog></body></html>')
 for path in ['assets/app.css','assets/route-compact.css','assets/route-workload.css']:
  page.add_style_tag(content=(ROOT/path).read_text(encoding='utf-8'))
 page.evaluate('() => {'+SETUP+'}')
 for path in ['routes/route-workload.js','routes/route-planning.js','routes/route-workload-ui.js','routes/route-planning-ui.js']:
  page.add_script_tag(content=(ROOT/path).read_text(encoding='utf-8'))
 page.evaluate('''() => {
  const W=LubricaRouteWorkload,P=LubricaRoutePlanning,t=W.today(),tom=P.addInterval(t,{kind:'days',value:1});
  window.__today=t;window.__tomorrow=tom;window.__end=P.addInterval(t,{kind:'days',value:15});
  window.__addJobs=()=>{for(const [id,route,name,lineId] of [['J1','A','Подшипники','L1'],['J2','B','Цепи','L2']])
   window.__db.routePlanItems.push({id,routeId:route,routeCode:route,routeName:name,lineId,line:'Линия '+lineId,area:'Участок',plannedDate:t,plannedMinutes:30,status:'planned',runId:'',taskIds:['T'+id],dueEntries:[{taskId:'T'+id,dueDate:t}],routeRevision:1,routeRevisionId:'',checklistSnapshot:{taskCount:1}})};
  LubricaRoutePlanningUI.open(document.getElementById('routes'),{startDate:t,endDate:window.__end});
 }''')
 today=page.evaluate('window.__today');tomorrow=page.evaluate('window.__tomorrow')
 dlg=page.locator('#routePlanningDialog')
 dlg.locator('[data-rw-open]').click()
 assert dlg.locator('.rw-shell').is_visible()
 for box in dlg.locator('[data-rw-weekday]').all():box.check()
 dlg.locator('[data-rw-workers="1"]').fill('2')
 dlg.locator('[data-rw-capacity="1"]').fill('30')
 assert '1 ч' in dlg.locator('[data-rw-total="1"]').inner_text()
 dlg.locator('[data-rw-ppr-line="L1"]').fill(today)
 dlg.locator('[data-rw-ppr-line="L2"]').fill(tomorrow)
 dlg.locator('.rw-ppr-routes summary').click()
 dlg.locator('[data-rw-ppr-route="A"]').check()
 dlg.locator('[data-rw-ppr-route="B"]').check()
 page.screenshot(path=str(OUT/(label+'_settings.png')))
 dlg.locator('[data-rw-save-settings]').click()
 assert page.evaluate('window.__writes')==1
 page.evaluate('''() => {window.__addJobs();LubricaRoutePlanningUI.open(document.getElementById('routes'),{startDate:window.__today,endDate:window.__end});}''')
 dlg.locator('[data-rw-open]').click()
 assert page.evaluate('window.__db.routeWorkload.shifts[0].workers')==2
 assert page.evaluate('window.__db.routeWorkload.shifts[0].minutes')==60
 assert 'Линия 1' in dlg.locator('[data-rw-day="'+today+'"] .rw-ppr-marker').inner_text()
 assert 'Линия 2' in dlg.locator('[data-rw-day="'+tomorrow+'"] .rw-ppr-marker').inner_text()
 dlg.locator('[data-rw-preview]').click()
 assert dlg.locator('.rw-proposal:not(.rw-unplaced)').count()==1
 assert 'ППР' in dlg.locator('.rw-unplaced').inner_text()
 assert page.evaluate('window.__writes')==1
 dlg.locator('[data-rw-delay]').check()
 dlg.locator('[data-rw-delay-reason]').fill('Согласованный перенос')
 dlg.locator('[data-rw-preview]').click()
 assert dlg.locator('.rw-proposal:not(.rw-unplaced)').count()==2
 page.screenshot(path=str(OUT/(label+'_preview.png')))
 dlg.locator('[data-rw-apply]').click()
 assert page.evaluate('window.__writes')==2
 assert page.evaluate('window.__db.routePlanItems.find(x=>x.id==="J2").workAssignment.date')==tomorrow
 assert page.evaluate('window.__db.routePlanItems.find(x=>x.id==="J2").plannedDate')==today
 assert dlg.locator('.rw-queue .rw-job').count()==0
 dlg.locator('[data-rw-move="J2"]').click()
 dlg.locator('[data-rw-move-date]').fill(today)
 dlg.locator('[data-rw-move-reason]').fill('Проверка запрета')
 dlg.locator('[data-rw-save-move]').click()
 assert 'ППР' in dlg.locator('[data-rw-move-error]').inner_text()
 assert page.evaluate('window.__writes')==2
 dlg.locator('[data-rw-cancel-move]').click()
 page.screenshot(path=str(OUT/(label+'_calendar.png')))
 dlg.locator('[data-rw-range="week"]').click()
 assert dlg.locator('[data-rw-day]').count()==7
 assert dlg.locator('.rw-week').count()==1
 dlg.locator('[data-rw-range="month"]').click()
 assert 28<=dlg.locator('[data-rw-day]').count()<=31
 assert dlg.locator('.rw-week').count()>=4
 dlg.locator('.rw-cadences > summary').click()
 assert dlg.locator('.rw-cycle').count()==2
 dlg.locator('[data-rw-back]').click()
 assert dlg.locator('[data-rw-open]').is_visible()
 assert not errors,errors
 page.close()
with sync_playwright() as p:
 b=shutil.which('chromium')
 browser=p.chromium.launch(**({'executable_path':b} if b else {}),headless=True,args=['--no-sandbox'])
 try:
  for w,h,label in [(1440,900,'desktop'),(768,1024,'tablet')]:check(browser,w,h,label)
 finally:browser.close()
print('R4 CHROMIUM PASS — line-specific PPR markers, settings, no silent transfer, confirmed distribution, manual guard and week/month views')
