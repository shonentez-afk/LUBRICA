#!/usr/bin/env python3
"""R3B Chromium — actual UI, planning, preparation and checklist on synthetic data."""
import pathlib,shutil
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-artifacts'/'routes-r3b'
OUT.mkdir(parents=True,exist_ok=True)
setup=r'''
window.global=window;window.state={points:[]};window.SCOPE_LABELS={};
window.esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.taskKey=p=>p.taskId||p.id;window.exportRoutesCsv=()=>{};window.switchView=name=>{window.__lastView=name};
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
 for path in ['core/database-schema.js','structure/context.js','routes/route-auto-grouping.js','routes/route-due.js','routes/route-workload.js','routes/route-automation.js','routes/route-automation-ui.js','routes/route-engine.js','routes/route-planning.js','routes/route-workload-ui.js','routes/route-planning-ui.js','checklist/checklist-engine.js','routes/route-preparation.js','routes/route-plan-fact.js','routes/route-compact-ui.js','routes/routes-ui.js']:page.add_script_tag(content=(ROOT/path).read_text(encoding='utf-8'))
 page.evaluate('() => renderRoutes(document.getElementById("routes"))')
 today=page.evaluate('LubricaRouteDue.today()')
 tomorrow=page.evaluate('LubricaRoutePlanning.addInterval(LubricaRouteDue.today(),{kind:"days",value:1})')
 page.locator('#autoCreateRoute').click()
 dialog=page.locator('#routeExecutionDialog')
 dialog.locator('[data-r8-select-all]').click()
 dialog.locator('[data-r5="preview"]').click()
 dialog.locator('[data-r5="apply"]').click()
 assert page.evaluate('window.__db.routes.length')==2
 cal=page.evaluate('window.__db.routes.find(r=>r.scheduleKey==="days:7").id')
 runtime=page.evaluate('window.__db.routes.find(r=>r.scheduleKey==="runtime_hours:500").id')
 def select(route_id):
  page.evaluate('(id)=>{const v=document.getElementById("routes");v.dataset.routeStatusFilter="working";v.dataset.selectedRoute=id;delete v.dataset.checklistRun;delete v.dataset.plannedItemId;renderRoutes(v)}',route_id)
 select(cal)
 assert page.locator('#routeToMap').count()==1
 assert page.get_by_role('button',name='К карте',exact=True).count()==1
 assert page.locator('.route-map-open').count()==0
 page.locator('#routeToMap').click()
 assert page.evaluate('window.__lastView')=='workspace'
 assert page.locator('#routeDue').count()==0
 assert page.locator('#prepareRoute').count()==0
 # R8.2: manual order and metadata are independent of lifecycle.
 page.locator('#editRoute').click()
 editor=page.locator('#actionDialog')
 assert editor.locator('[name="status"]').count()==0
 assert editor.locator('[data-route-state]').is_visible()
 assert not editor.locator('[data-route-parameters]').evaluate('(x)=>x.open')
 assert editor.locator('[name="planningAnchorDate"]').count()==0
 assert editor.locator('[name="runtimePlanningHoursPerDay"]').count()==0
 editor.locator('[data-route-parameters] > summary').click()
 assert editor.locator('[data-route-activate]').is_disabled()
 assert not editor.locator('[data-archive-review]').is_visible()
 before_archive=page.evaluate('JSON.stringify(window.__db)')
 editor.locator('[data-route-archive]').click()
 assert editor.locator('[data-archive-review]').is_visible()
 assert page.evaluate('JSON.stringify(window.__db)')==before_archive
 editor.locator('[data-archive-back]').click()
 assert not editor.locator('[data-archive-review]').is_visible()
 assert page.evaluate('JSON.stringify(window.__db)')==before_archive
 first=page.evaluate('(id)=>window.__db.routes.find(r=>r.id===id).taskIds[0]',cal)
 editor.locator('[data-point-down]').first.click()
 assert page.evaluate('(id)=>window.__db.routes.find(r=>r.id===id).taskIds[0]',cal)!=first
 editor.locator('[data-point-up]').last.click()
 assert page.evaluate('(id)=>window.__db.routes.find(r=>r.id===id).taskIds[0]',cal)==first
 editor.locator('[name="name"]').fill('Маршрут R8.2')
 editor.locator('[data-save-route]').click()
 assert page.evaluate('(id)=>window.__db.routes.find(r=>r.id===id).status',cal)=='draft'
 page.screenshot(path=str(OUT/(label+'_r82_settings.png')))
 editor.locator('[data-close-route]').last.click()
 page.locator('#editRoute').click()
 editor.locator('[data-open-schedule]').click()
 dialog.locator('[data-r81-individual] > summary').click()
 assert dialog.locator('[data-due-task]').count()==2
 dialog.locator('[data-due-bulk]').fill(today)
 dialog.locator('[data-due-fill]').click()
 dialog.locator('[data-due-task="C2"] [data-due-field="nextDate"]').fill(tomorrow)
 page.screenshot(path=str(OUT/(label+'_calendar_setup.png')))
 dialog.locator('[data-due-activate]').click()
 assert page.evaluate('(id)=>window.__db.routes.find(r=>r.id===id).status',cal)=='active'
 assert page.locator('#routeDue').count()==0
 # Runtime due date must not be fabricated. A reading and threshold are explicit.
 select(runtime)
 page.locator('#editRoute').click()
 editor.locator('[data-open-schedule]').click()
 dialog.locator('[data-r81-method]').select_option('meter')
 assert dialog.locator('[data-r81-access]').is_visible()
 assert dialog.locator('[data-r81-save-access]').is_visible()
 assert not dialog.locator('[data-r81-calendar]').is_visible()
 dialog.locator('[data-r81-individual] > summary').click()
 for name,value in [('nextHours','1000'),('readingHours','1001'),('readingDate',today),('hoursPerDay','0')]:
  dialog.locator('[data-due-field="'+name+'"]').fill(value)
 dialog.locator('[data-due-confirm-meter]').check()
 page.screenshot(path=str(OUT/(label+'_runtime_setup.png')))
 dialog.locator('[data-due-activate]').click()
 assert page.evaluate('window.__db.tasks.find(t=>t.id==="H1").routeDue.meterKey===window.__db.routeMeters[0].key')
 assert page.evaluate('(id)=>window.__db.routes.find(r=>r.id===id).status',runtime)=='active'
 page.locator('#routeSettings').click()
 settings=page.locator('#routePlanningDialog')
 assert settings.locator('[data-rw-ppr-route]').count()==0
 settings.locator('[data-rw-close]').last.click()
 page.locator('#routePlanning').click()
 plan=page.locator('#routePlanningDialog')
 plan.locator('[data-plan-start]').fill(today)
 plan.locator('[data-plan-end]').fill(today)
 plan.locator('[data-preview]').click()
 assert plan.locator('.route-plan-row.preview').count()==2
 daily=plan.locator('[data-r8-live-day="'+today+'"] [data-day-total]')
 total_before=int(plan.locator('[data-calendar-total]').get_attribute('data-calendar-total'))
 assert total_before>0
 assert int(daily.get_attribute('data-day-total'))==total_before
 assert int(plan.locator('[data-calendar-forecast]').get_attribute('data-calendar-forecast'))==total_before
 page.screenshot(path=str(OUT/(label+'_plan_preview.png')))
 plan.locator('[data-commit]').click()
 assert page.evaluate('window.__db.routePlanItems.length')==2
 assert int(plan.locator('[data-calendar-total]').get_attribute('data-calendar-total'))==total_before
 assert int(plan.locator('[data-calendar-forecast]').get_attribute('data-calendar-forecast'))==0
 assert int(plan.locator('[data-calendar-planned]').get_attribute('data-calendar-planned'))==total_before
 # Open the exact reserved job from the compact editor; no automatic deletion.
 plan.locator('[data-close]').last.click()
 select(cal)
 page.locator('#editRoute').click()
 assert editor.locator('[data-release-route]').is_visible()
 assert editor.locator('[data-route-point]').count()==2
 editor.locator('[data-route-parameters] > summary').click()
 assert editor.locator('[data-route-archive]').is_disabled()
 assert not editor.locator('[data-archive-review]').is_visible()
 assert editor.locator('[data-point-down]').first.is_disabled()
 editor.locator('[data-release-route]').click()
 assert editor.locator('[data-release-review]').is_visible()
 editor.locator('[data-release-back]').click()
 assert not editor.locator('[data-release-review]').is_visible()
 editor.locator('[data-close-route]').last.click()
 page.locator('#routePlanning').click()
 plan.locator('[data-plan-start]').fill(today)
 plan.locator('[data-plan-end]').fill(today)
 assert plan.is_visible()
 # Open the calendar job, not all points of the template.
 cid=page.evaluate('(id)=>window.__db.routePlanItems.find(p=>p.routeId===id).id',cal)
 assert page.locator('#prepareRoute').count()==0
 plan.locator('[data-prepare-job="'+cid+'"]').click()
 assert dialog.locator('.route-preparation-status').is_visible()
 assert cid in dialog.locator('.dialog-copy').inner_text()
 assert dialog.locator('[data-prep-start]').is_enabled()
 dialog.locator('[data-prep-back]').click()
 assert plan.is_visible()
 plan.locator('[data-plan-id="'+cid+'"]').click()
 assert page.locator('.route-visit-card').count()==1
 assert page.locator('.route-visit-task').count()==1
 assert 'Плановое задание' in page.locator('.route-checklist-sheet').inner_text()
 page.locator('#prepareRoute').click()
 assert dialog.locator('.route-preparation-status').is_visible()
 assert 'Мероприятий' in dialog.locator('.route-preparation-status').inner_text()
 dialog.locator('[data-close]').first.click()
 page.locator('[data-start-run]').click()
 dialog.locator('[name="performer"]').fill('Смазчик')
 dialog.locator('[name="shift"]').fill('1')
 dialog.locator('[data-confirm-start]').click()
 assert page.evaluate('window.__db.checklistRuns.length')==1
 assert page.evaluate('window.__db.checklistRuns[0].routeTaskIds.join(",")')=='C1'
 page.locator('[data-task-result="C1"]').select_option('completed')
 page.locator('[data-task-actual-quantity="C1"]').fill('10 г')
 page.locator('[data-complete-run]').click()
 assert dialog.locator('[data-confirm-complete]').is_enabled()
 dialog.locator('[data-confirm-complete]').click()
 assert page.evaluate('window.__db.checklistRuns[0].status')=='completed'
 assert page.evaluate('window.__db.tasks.find(t=>t.id==="C1").routeDue.nextDate')==page.evaluate('LubricaRoutePlanning.addInterval(LubricaRouteDue.today(),{kind:"days",value:7})')
 assert page.evaluate('window.__db.tasks.find(t=>t.id==="C2").routeDue.nextDate')==tomorrow
 # Run the runtime job and verify mandatory actual meter is present in both views.
 select(runtime)
 page.locator('#routePlanning').click()
 hid=page.evaluate('(id)=>window.__db.routePlanItems.find(p=>p.routeId===id).id',runtime)
 plan.locator('[data-plan-id="'+hid+'"]').click()
 page.locator('[data-start-run]').click()
 dialog.locator('[name="performer"]').fill('Смазчик')
 dialog.locator('[name="shift"]').fill('1')
 dialog.locator('[data-confirm-start]').click()
 assert page.locator('[data-task-meter="H1"]').is_visible()
 page.locator('[data-task-result="H1"]').select_option('completed')
 page.locator('[data-complete-run]').click()
 assert dialog.locator('[data-confirm-complete]').is_disabled()
 dialog.locator('[data-close]').last.click()
 page.locator('[data-task-meter="H1"]').fill('1003')
 page.locator('[data-route-sheet-mode="table"]').click()
 assert page.locator('[data-task-meter="H1"]').input_value()=='1003'
 page.locator('[data-route-sheet-mode="compact"]').click()
 page.screenshot(path=str(OUT/(label+'_runtime_execution.png')))
 page.locator('[data-complete-run]').click()
 assert dialog.locator('[data-confirm-complete]').is_enabled()
 dialog.locator('[data-confirm-complete]').click()
 assert page.evaluate('window.__db.tasks.find(t=>t.id==="H1").routeDue.nextHours')==1503
 assert page.evaluate('window.__db.routePlanItems.every(p=>p.status==="completed")')
 # R8.1: explicitly convert an existing meter route to safe calendar planning.
 select(runtime)
 page.locator('#editRoute').click()
 editor.locator('[data-open-schedule]').click()
 assert not dialog.locator('[data-r81-individual]').evaluate('(x)=>x.open')
 dialog.locator('[data-r81-method]').select_option('calendar_runtime')
 dialog.locator('[data-r81-date]').fill(today)
 dialog.locator('[data-r81-confirm]').check()
 dialog.locator('[data-r81-replace]').check()
 assert '2 недель' in dialog.locator('[data-r81-rule]').inner_text()
 page.screenshot(path=str(OUT/(label+'_r81_common_calendar.png')))
 dialog.locator('[data-r81-save-common]').click()
 assert not dialog.is_visible(),dialog.inner_text()
 assert page.evaluate('window.__db.tasks.find(t=>t.id==="H1").routeDue.planningMode')=='calendar_runtime'
 assert page.evaluate('window.__db.tasks.find(t=>t.id==="H1").routeDue.cycleDays')==14
 assert page.evaluate('window.__db.tasks.find(t=>t.id==="H1").routeDue.nextHours===undefined')
 # Explicit inline confirmation archives the selected route, preserving history.
 select(cal)
 page.locator('#editRoute').click()
 editor.locator('[data-route-parameters] > summary').click()
 editor.locator('[data-route-archive]').click()
 assert editor.locator('[data-archive-review]').is_visible()
 history_before=page.evaluate('JSON.stringify(window.__db.checklistRuns)')
 editor.locator('[data-archive-confirm]').click()
 assert not editor.is_visible()
 assert page.evaluate('(id)=>window.__db.routes.find(r=>r.id===id).status',cal)=='archived'
 assert page.evaluate('JSON.stringify(window.__db.checklistRuns)')==history_before
 # Reproduce the reported 20-point, 2250 h, PPR-only route on a short window.
 large=page.evaluate('''() => {
  const ids=Array.from({length:20},(_,i)=>'LONG'+String(i+1).padStart(2,'0'));
  for(const id of ids){makeTask(id,'bearing','regrease','Досмазывание','2250 ч','Конвейер');const t=window.__db.tasks.find(x=>x.id===id);Object.assign(t,{materialMode:'explicit',materialId:'MAT',materialName:'Смазка',quantity:{approved:'10',unit:'г'}})}
  const today=LubricaRouteDue.today(),cfg={weekdays:[1,2,3,4,5,6,7],shifts:[{id:'1',workers:1,minutesPerWorker:480}],ppr:[{lineId:'L1',anchorDate:today}],pprRouteIds:[]};
  let r=LubricaRouteWorkload.saveSettings(cfg,window.__db);if(!r.ok)throw Error(r.message||r.reason);
  r=LubricaRouteEngine.createRoute({lineId:'L1',areaId:'A1',interval:'2250 ч',name:'Линия 1 — Загрузки суточных силосов — Подшипники — Досмазывание — 2250 ч',taskIds:ids,status:'draft'},window.__db);
  if(!r.ok)throw Error(r.reason);const id=r.route.id;
  r=LubricaRouteDue.configureRoute(id,{date:today,mode:'next',pprMode:'ppr',planningMode:'calendar_runtime',maxHoursPerDay:24,confirmCalendar:true},window.__db,{activate:true});
  if(!r.ok)throw Error(r.message||r.reason);return id;
 }''')
 page.set_viewport_size({'width':974 if width>=1000 else 768,'height':878 if width>=1000 else 600})
 select(large)
 page.locator('#editRoute').click()
 body=editor.locator('[data-route-scroll]')
 assert editor.locator('[data-route-point]').count()==20
 assert not editor.locator('[data-route-parameters]').evaluate('(x)=>x.open')
 assert body.evaluate('(x)=>x.clientHeight>160 && x.scrollHeight>x.clientHeight')
 assert body.evaluate('(x)=>x.scrollWidth<=x.clientWidth+1')
 assert editor.locator('[data-route-point]').first.evaluate('(x)=>{const p=x.getBoundingClientRect(),b=x.closest("[data-route-scroll]").getBoundingClientRect();return p.top<b.bottom&&p.bottom>b.top}')
 page.screenshot(path=str(OUT/(label+'_r82_long_route_top.png')))
 bounds=body.bounding_box()
 page.mouse.move(bounds['x']+bounds['width']/2,bounds['y']+bounds['height']/2)
 page.mouse.wheel(0,650)
 page.wait_for_function('document.querySelector("[data-route-scroll]").scrollTop>0')
 editor.locator('[data-route-point]').last.scroll_into_view_if_needed()
 assert editor.locator('[data-route-point]').last.evaluate('(x)=>{const p=x.getBoundingClientRect(),b=x.closest("[data-route-scroll]").getBoundingClientRect();return p.top<b.bottom&&p.bottom>b.top}')
 assert editor.locator('.route-editor-footer').evaluate('(x)=>{const r=x.getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0}')
 page.screenshot(path=str(OUT/(label+'_r82_long_route_bottom.png')))
 # Opening parameters cannot remove the scrollable area; the last point remains reachable.
 body.evaluate('(x)=>x.scrollTop=0')
 editor.locator('[data-route-parameters] > summary').click()
 assert body.evaluate('(x)=>x.clientHeight>160 && x.scrollHeight>x.clientHeight')
 editor.locator('[data-route-point]').last.scroll_into_view_if_needed()
 assert body.evaluate('(x)=>x.scrollTop>0')
 editor.locator('[data-close-route]').last.click()
 # Reserve the exact route, explain the protection and remove only the actual planned job.
 assert page.evaluate('(id)=>LubricaRoutePlanning.commit({startDate:LubricaRouteDue.today(),endDate:LubricaRouteDue.today(),routeIds:[id]},window.__db).ok',large)
 select(large)
 page.locator('#editRoute').click()
 assert editor.locator('[data-release-route]').is_visible()
 assert editor.locator('[data-route-point]').count()==20
 assert editor.locator('[data-point-down]').first.is_disabled()
 editor.locator('[data-route-parameters] > summary').click()
 assert editor.locator('[data-route-archive]').is_disabled()
 assert not editor.locator('[data-archive-review]').is_visible()
 page.screenshot(path=str(OUT/(label+'_r82_locked_route.png')))
 job_ids=page.evaluate('(id)=>window.__db.routePlanItems.filter(x=>x.routeId===id&&x.status==="planned").map(x=>x.id)',large)
 assert len(job_ids)>0
 editor.locator('[data-release-route]').click()
 assert editor.locator('[data-release-review]').is_visible()
 editor.locator('[data-release-confirm]').click()
 assert page.evaluate('(id)=>!window.__db.routePlanItems.some(x=>x.routeId===id&&x.status==="planned")',large)
 assert editor.is_visible()
 assert not editor.locator('[data-release-route]').count()
 assert editor.locator('[data-route-archive]').is_enabled()
 editor.locator('[data-route-archive]').click()
 assert editor.locator('[data-archive-review]').is_visible()
 editor.locator('[data-archive-confirm]').click()
 assert page.evaluate('(id)=>window.__db.routes.find(r=>r.id===id).status',large)=='archived'
 assert not editor.is_visible()
 assert not errors,errors
 page.close()
with sync_playwright() as pw:
 b=shutil.which('chromium')
 browser=pw.chromium.launch(**({'executable_path':b} if b else {}),headless=True,args=['--no-sandbox'])
 try:
  for width,height,label in [(1440,900,'desktop_1440'),(768,1024,'tablet_768')]:check(browser,width,height,label)
 finally:browser.close()
print('R3B CHROMIUM PASS — actual setup, activation, exact plan selection, preparation, calendar completion and mandatory meter fact in both layouts')
