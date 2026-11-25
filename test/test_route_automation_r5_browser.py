#!/usr/bin/env python3
"""R5 Chromium — unified real route automation master and approved early PPR job."""
import pathlib,shutil
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-artifacts'/'routes-r5'
OUT.mkdir(parents=True,exist_ok=True)
setup=r'''
window.global=window;window.state={points:[]};window.SCOPE_LABELS={};
window.esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.taskKey=p=>p.taskId||p.id;window.exportRoutesCsv=()=>{};window.switchView=()=>{};
window.LubricaSystem={registerModule(){}};
window.__writes=0;
window.__db={lines:[{id:'L1',name:'Линия 1'}],areas:[{id:'A1',lineId:'L1',name:'Распиловка'},{id:'A2',lineId:'L1',name:'Упаковка'}],equipment:[],nodes:[],lubricationPoints:[],tasks:[],routes:[],routeRevisions:[],routePlanItems:[],checklistRuns:[],materials:[],tools:[]};
window.LubricaCore={State:{getDatabase:()=>window.__db,setDatabase:d=>{window.__db=d;window.__writes++}},Database:{toLegacy:d=>({points:d.tasks.map(t=>{const lp=d.lubricationPoints.find(p=>p.id===t.lubricationPointId),e=d.equipment.find(e=>e.id===lp.equipmentId);return{id:t.id,taskId:t.id,lubricationPointId:lp.id,pointDisplayId:lp.id,position:e.externalCode,equipment:e.name,unit:'Опора',operation:t.operation,type:lp.category,interval:t.schedule.legacyText}})})}};
window.LubricaApp={refreshFromCore(){},showToast(){}};
window.LubricaProgramQA={audit:()=>({issues:[]})};
window.LubricaTaskReadiness={summarize:d=>({items:d.tasks.map(t=>({taskId:t.id,status:'ready',steps:[{ok:true}]}))})};
window.makeTask=(id,category,activity,operation,interval,type,areaId='A1',status='approved')=>{
 const d=window.__db,e='E'+id,n='N'+id,p='P'+id;
 d.equipment.push({id:e,name:type,equipmentType:type,lineId:'L1',areaId,externalCode:id});
 d.nodes.push({id:n,equipmentId:e,name:'Опора'});
 d.lubricationPoints.push({id:p,equipmentId:e,nodeId:n,category,name:'Точка '+id});
 d.tasks.push({id,lubricationPointId:p,activityType:activity,operation,approvalStatus:status,schedule:{legacyText:interval}});
};

makeTask('C1','bearing','regrease','Досмазывание','7 дней','Конвейер');
makeTask('C2','bearing','regrease','Досмазывание','7 дней','Вентилятор');
makeTask('C3','bearing','regrease','Досмазывание','7 дней','Двигатель');
makeTask('H1','bearing','regrease','Досмазывание','500 ч','Пила');
window.__db.materials.push({id:'MAT',name:'Смазка',code:'GR-01'});
window.__db.tasks.forEach(t=>Object.assign(t,{materialMode:'explicit',materialId:'MAT',materialName:'Смазка',quantity:{approved:'10',unit:'г'}}));
'''

def check(browser,width,height,label):
 page=browser.new_page(viewport={'width':width,'height':height})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body><div id="routes" style="display:block;width:100%;height:100%;min-width:0"></div><dialog id="routeExecutionDialog" class="route-execution-dialog"></dialog><dialog id="routePlanningDialog" class="route-planning-dialog"></dialog><dialog id="actionDialog"></dialog></body></html>')
 for path in ['assets/app.css','assets/route-compact.css','assets/route-workload.css','assets/route-automation.css']:page.add_style_tag(content=(ROOT/path).read_text(encoding='utf-8'))
 page.add_style_tag(content='html,body{min-width:0!important;width:100%;max-width:100%;margin:0;overflow-x:hidden} #routes{position:relative!important;inset:auto!important;display:block!important;overflow:visible!important}')
 page.evaluate('() => {'+setup+'}')
 for path in ['core/database-schema.js','structure/context.js','routes/route-auto-grouping.js','routes/route-due.js','routes/route-workload.js','routes/route-automation.js','routes/route-engine.js','routes/route-planning.js','routes/route-planning-ui.js','routes/route-workload-ui.js','checklist/checklist-engine.js','routes/route-preparation.js','routes/route-plan-fact.js','routes/route-compact-ui.js','routes/route-automation-ui.js','routes/routes-ui.js']:
  page.add_script_tag(content=(ROOT/path).read_text(encoding='utf-8'))
 page.evaluate('() => renderRoutes(document.getElementById("routes"))')
 today=page.evaluate('LubricaRouteDue.today()')
 tomorrow=page.evaluate('LubricaRoutePlanning.addInterval(LubricaRouteDue.today(),{kind:"days",value:1})')
 # Shared company settings, separate from route selection.
 page.locator('#routeSettings').click()
 plan=page.locator('#routePlanningDialog')
 for box in plan.locator('[data-rw-weekday]').all():box.check()
 plan.locator('[data-rw-capacity="1"]').fill('45');plan.locator('[data-rw-capacity="2"]').fill('45')
 plan.locator('[data-rw-ppr-line="L1"]').fill(today)
 plan.locator('[data-rw-save-settings]').click()
 assert page.evaluate('window.__writes')==1
 plan.locator('[data-rw-close]').last.click()
 page.locator('#autoCreateRoute').click()
 dlg=page.locator('#routeExecutionDialog')
 assert dlg.locator('.r5-shell').is_visible()
 def f(key):return dlg.locator('[data-r5="'+key+'"]')
 def section(label):return dlg.locator('.r5-section>summary').filter(has_text=label)
 f('line').select_option('L1');f('area').select_option('A1')
 assert dlg.locator('[data-r8-row]').count()==2
 weekly=dlg.locator('[data-r8-schedule="days:7"]')
 assert '1 неделя (7 дней)' in weekly.inner_text()
 assert dlg.locator('[data-r8-schedule="runtime_hours:500"]').count()==1
 f('preview').click()
 assert not f('apply').is_enabled()
 dlg.locator('[data-r8-select-all]').click()
 f('preview').click()
 assert f('apply').is_enabled(),f('report').inner_text()
 assert 'Новых маршрутов' in f('report').inner_text()
 assert page.evaluate('window.__writes')==1
 page.screenshot(path=str(OUT/(label+'_simple_preview.png')))
 weekly.locator('[data-r8-date]').fill(tomorrow)
 f('advanced').click()
 f('service').select_option('bearing:regrease')
 section('3. Общий порядок').click()
 f('order').select_option('EC3');f('up').click();f('up').click();f('apply-order').check()
 section('4. Условия').click()
 f('policy-enabled').check()
 f('access').select_option('ppr');f('early').fill('1')
 dlg.locator('[data-r5-task="H1"]').check()
 f('preview').click()
 assert not f('apply').is_enabled()
 assert 'Укажите основание' in f('report').inner_text()
 f('early-reason').fill('Утверждённое окно')
 f('preview').click()
 assert 'Выбрать подходящие' in f('report').inner_text()
 assert not f('apply').is_enabled()
 f('select-all').click()
 assert not dlg.locator('[data-r5-task="H1"]').is_checked()
 assert dlg.locator('[data-r5-task="C1"]').is_checked()
 # Optional engineering settings cannot affect a basic preview.
 dlg.locator('[data-r5-task="H1"]').check()
 f('advanced').click();f('preview').click()
 assert f('apply').is_enabled(),f('report').inner_text()
 f('advanced').click()
 f('service').select_option('bearing:regrease');f('select-none').click()
 dlg.locator('[data-r5-task="C1"]').check()
 f('timing').check();f('service-minutes').fill('20');f('transition').fill('2');f('split').check();f('balance').check()
 f('preview').click()
 assert f('apply').is_enabled(),f('report').inner_text()
 assert page.evaluate('window.__writes')==1
 page.screenshot(path=str(OUT/(label+'_configuration.png')))
 f('apply').click()
 assert not dlg.is_visible()
 assert page.evaluate('window.__writes')==2
 assert page.evaluate('window.__db.routes.length')==2
 assert page.evaluate('window.__db.routePlanItems.length')==0
 assert page.evaluate('window.__db.routes.find(x=>x.scheduleKey==="days:7").taskIds[0]')=='C3'
 page.locator('#routePlanning').click()
 plan.locator('[data-plan-start]').fill(today);plan.locator('[data-plan-end]').fill(tomorrow)
 assert plan.locator('[data-r8-live-day]').count()==2
 assert plan.locator('.r8-projected-label').count()>0
 plan.locator('[data-rw-open]').click()
 plan.locator('[data-r8-plan-preview]').click()
 assert 'Новых ближайших заданий: 3' in plan.locator('.rw-preview').inner_text()
 assert page.evaluate('window.__writes')==2
 page.screenshot(path=str(OUT/(label+'_preview.png')))
 plan.locator('[data-rw-apply]').click()
 assert page.evaluate('window.__writes')==3
 assert page.evaluate('window.__db.routePlanItems.length')==3
 assert page.evaluate('window.__db.routePlanItems.every(x=>x.taskIds.length===1&&x.plannedMinutes===30)')
 assert page.evaluate('window.__db.routePlanItems.find(x=>x.taskIds[0]==="C1").workAssignment.date')==today
 assert page.evaluate('window.__db.routePlanItems.find(x=>x.taskIds[0]==="C1").plannedDate')==tomorrow
 plan.locator('[data-rw-back]').click()
 planId=page.evaluate('window.__db.routePlanItems.find(x=>x.taskIds[0]==="C1").id')
 plan.locator('[data-plan-id="'+planId+'"]').click()
 assert page.locator('.route-visit-task').count()==1
 page.locator('[data-start-run]').click()
 dlg.locator('[name="performer"]').fill('Смазчик')
 dlg.locator('[data-confirm-start]').click()
 assert page.evaluate('window.__db.checklistRuns.length')==1
 assert page.evaluate('window.__db.checklistRuns[0].routeTaskIds.join(",")')=='C1'
 page.locator('[data-task-result="C1"]').select_option('completed')
 page.locator('[data-task-actual-quantity="C1"]').fill('10 г')
 page.locator('[data-complete-run]').click()
 assert dlg.locator('[data-confirm-complete]').is_enabled()
 dlg.locator('[data-confirm-complete]').click()
 assert page.evaluate('window.__db.checklistRuns[0].status')=='completed'
 assert page.evaluate('window.__db.tasks.find(t=>t.id==="C1").routeDue.nextDate')==page.evaluate('LubricaRoutePlanning.addInterval(LubricaRouteDue.today(),{kind:"days",value:7})')
 assert page.locator('#syncRoutes').count()==0
 page.locator('#autoCreateRoute').click()
 dlg.locator('[data-r8-select-all]').click()
 f('preview').click()
 assert '2. Результат проверки' in f('report').inner_text()
 assert not f('apply').is_enabled(),f('report').inner_text()
 # Existing unstarted jobs are protected, not rewritten by another preview.
 assert page.evaluate('window.__db.routePlanItems.length')==3
 f('close').click()
 assert not errors,errors
 page.close()
with sync_playwright() as pw:
 b=shutil.which('chromium')
 browser=pw.chromium.launch(**({'executable_path':b} if b else {}),headless=True,args=['--no-sandbox'])
 try:
  for width,height,label in [(1440,900,'desktop_1440'),(768,1024,'tablet_768')]:check(browser,width,height,label)
 finally:browser.close()
print('R5 CHROMIUM PASS — unified master, no preview writes, settings and order, split jobs, approved PPR early start and actual completion')
