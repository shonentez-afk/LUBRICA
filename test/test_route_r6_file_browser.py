#!/usr/bin/env python3
"""R6: actual desktop application, file://, actual QA/DB/storage, no module stubs."""
import csv,io,pathlib,shutil
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-artifacts'/'routes-r6';OUT.mkdir(parents=True,exist_ok=True)
def check(browser):
 context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
 page=context.new_page();page.set_default_timeout(20000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto((ROOT/'index.html').as_uri(),wait_until='load')
 assert page.evaluate('window.LubricaBootOK===true'),page.evaluate('String(window.LubricaBootError||"")')
 page.add_script_tag(path=str(ROOT/'test'/'route_r6_fixture.js'))
 page.evaluate('''() => {LubricaCore.State.activateDatabase(createR6RouteFixture(48),'R6 synthetic');LubricaApp.refreshFromCore();LubricaApp.renderAll()}''')
 assert page.evaluate('LubricaRouteAutomation.eligible(LubricaCore.State.getDatabase()).valid.size')==45
 page.locator('[data-view="routes"]').click()
 page.locator('#autoCreateRoute').click()
 dlg=page.locator('#routeExecutionDialog')
 def field(n):return dlg.locator('[data-r5="'+n+'"]')
 def section(name):return dlg.locator('.r5-section > summary').filter(has_text=name)
 today=page.evaluate('LubricaRouteDue.today()')
 field('initial-date').fill(today)
 section('4. Условия').click();field('timing').check();field('split').check()
 section('5. Рабочие дни').click();field('workload').check()
 for i in range(1,8):field('weekday-'+str(i)).check()
 field('minutes-1').fill('20')
 field('ppr-0').fill(today);field('ppr-1').fill(today)
 field('plan').check();field('start').fill(today);field('end').fill(today);field('forecast-weeks').select_option('4')
 before=page.evaluate('JSON.stringify(LubricaCore.State.getDatabase())')
 field('preview').click()
 assert field('apply').is_enabled(),field('report').inner_text()
 assert page.evaluate('JSON.stringify(LubricaCore.State.getDatabase())')==before
 page.screenshot(path=str(OUT/'01_full_app_master.png'))
 field('apply').click();assert not dlg.is_visible()
 assert page.evaluate('LubricaCore.State.getDatabase().routes.flatMap(r=>r.taskIds).length')==45
 pair=page.evaluate('''() => {const m=new Map();for(const x of LubricaCore.State.getDatabase().routePlanItems){if(!m.has(x.routeId))m.set(x.routeId,[]);m.get(x.routeId).push(x)}return [...m.values()].find(x=>x.length>=2).slice(0,2).map(x=>({id:x.id,routeId:x.routeId,ids:x.taskIds}))}''')
 a,b=pair
 plan=page.locator('#routePlanningDialog')
 def select_job(id):
  page.locator('#routePlanning').click()
  plan.locator('[data-plan-start]').fill(today)
  plan.locator('[data-plan-end]').fill(today)
  plan.locator('[data-plan-id="'+id+'"]').click()
 select_job(a['id'])
 assert page.locator('.route-visit-task').count()==len(a['ids'])
 page.locator('[data-start-run]').click()
 dlg.locator('[name="performer"]').fill('Смазчик QA');dlg.locator('[name="shift"]').fill('1')
 dlg.locator('[data-confirm-start]').click()
 assert page.evaluate('LubricaCore.State.getDatabase().checklistRuns.length')==1
 select_job(b['id'])
 assert page.locator('text=Другое задание этого маршрута уже выполняется').is_visible()
 assert page.locator('.route-visit-task').count()==len(b['ids'])
 assert page.locator('[data-start-run]').count()==0
 assert page.locator('[data-task-result]').count()==len(b['ids'])
 assert all(el.is_disabled() for el in page.locator('[data-task-result]').all())
 page.screenshot(path=str(OUT/'02_other_job_protected.png'))
 page.locator('[data-current-run]').click()
 for task in a['ids']:
  page.locator('[data-task-result="'+task+'"]').select_option('completed')
  page.locator('[data-task-actual-quantity="'+task+'"]').fill('10')
 # Native print lifecycle with exact selected snapshot; compact restored.
 page.evaluate("window.dispatchEvent(new Event('beforeprint'))")
 assert page.locator('.checklist-task-table').count()>=1
 assert page.locator('[data-task-result]').count()==len(a['ids'])
 page.emulate_media(media='print')
 assert page.locator('.checklist-task-table').first.is_visible()
 page.screenshot(path=str(OUT/'03_print_table.png'))
 page.emulate_media(media='screen');page.evaluate("window.dispatchEvent(new Event('afterprint'))")
 assert page.locator('.route-visit-task').count()==len(a['ids'])
 page.locator('[data-complete-run]').click();dlg.locator('[data-confirm-complete]').click()
 assert page.evaluate('LubricaCore.State.getDatabase().checklistRuns[0].status')=='completed'
 page.locator('#routePlanning').click()
 plan.locator('[data-plan-start]').fill(today);plan.locator('[data-plan-end]').fill(today)
 with page.expect_download() as download:plan.locator('[data-export-plan]').click()
 data=download.value.path().read_text(encoding='utf-8-sig')
 rows=list(csv.reader(io.StringIO(data),delimiter=';'))
 assert len(rows)==46
 assert set(r[10] for r in rows[1:])==set(page.evaluate('LubricaCore.State.getDatabase().routePlanItems.flatMap(x=>x.taskIds)'))
 plan.locator('[data-close]').last.click()
 # Real file-origin browser storage and reload, no in-memory State stub.
 frozen=page.evaluate('''() => {const d=LubricaCore.State.getDatabase();return JSON.stringify([d.routes,d.routePlanItems,d.routeRevisions,d.checklistRuns,d.routeWorkload,d.routeAutomation,d.tasks.map(t=>[t.id,t.routeDue,t.routePolicy])])}''')
 assert page.evaluate("async () => await LubricaCore.Storage.saveRecovery(LubricaCore.State.getDatabase(),'R6 browser')")
 page.reload(wait_until='load');assert page.evaluate('LubricaBootOK===true')
 assert page.evaluate("async () => !!(await LubricaCore.State.restoreRecovery())")
 after=page.evaluate('''() => {const d=LubricaCore.State.getDatabase();return JSON.stringify([d.routes,d.routePlanItems,d.routeRevisions,d.checklistRuns,d.routeWorkload,d.routeAutomation,d.tasks.map(t=>[t.id,t.routeDue,t.routePolicy])])}''')
 assert after==frozen,'route data and fact must survive browser reload/recovery'
 page.evaluate('LubricaApp.refreshFromCore();LubricaApp.renderAll()');page.locator('[data-view="routes"]').click()
 page.screenshot(path=str(OUT/'04_recovery.png'))
 assert not errors,errors
 context.close()
with sync_playwright() as p:
 binary=shutil.which('chromium')
 browser=p.chromium.launch(**({'executable_path':binary} if binary else {}),headless=True,args=['--no-sandbox'])
 try:check(browser)
 finally:browser.close()
print('R6 FULL FILE ORIGIN PASS — real application boot, real QA and normalization, master, split job selection, print lifecycle, actual CSV download, recovery and reload')
