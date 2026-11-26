#!/usr/bin/env python3
"""R3A actual UI + actual route engine, synthetic cross-machine grouping."""
import json,pathlib,shutil
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-artifacts'/'routes-r3a'
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
makeTask('T1','bearing','regrease','Досмазывание','500 ч','Конвейер');
makeTask('T2','bearing','regrease','Досмазывание','500 часов','Вентилятор');
makeTask('T3','chain','lubricant_apply','Нанесение смазки','7 дней','Пила');
makeTask('T4','bearing','regrease','Досмазывание','500 ч','Двигатель','A2');
makeTask('T5','bearing','regrease','Досмазывание','500 ч','Пила','A1','review');
'''
def check(browser,width,height,label):
 page=browser.new_page(viewport={'width':width,'height':height})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body><div id="routes" style="display:block;width:100%;height:100%;min-width:0"></div><dialog id="routeExecutionDialog" class="route-execution-dialog"></dialog><dialog id="actionDialog"></dialog></body></html>')
 for path in ['assets/app.css','assets/route-compact.css','assets/route-automation.css']:page.add_style_tag(content=(ROOT/path).read_text(encoding='utf-8'))
 page.add_style_tag(content='html,body{min-width:0!important;width:100%;max-width:100%;margin:0;overflow-x:hidden} #routes{position:relative!important;inset:auto!important;display:block!important;overflow:visible!important}')
 page.evaluate('() => {'+setup+'}')
 for path in ['core/database-schema.js','structure/context.js','routes/route-auto-grouping.js','routes/route-due.js','routes/route-workload.js','routes/route-automation.js','routes/route-engine.js','routes/route-planning.js','routes/route-automation-ui.js','checklist/checklist-engine.js','routes/route-compact-ui.js','routes/routes-ui.js']:page.add_script_tag(content=(ROOT/path).read_text(encoding='utf-8'))
 page.evaluate('() => renderRoutes(document.getElementById("routes"))')
 assert page.locator('.route-list-item').count()==0,'no implicit auto routes'
 page.locator('#autoCreateRoute').click()
 dlg=page.locator('#routeExecutionDialog')
 assert dlg.is_visible()
 f=lambda n:dlg.locator('[data-r5="'+n+'"]')
 assert page.locator('#syncRoutes').count()==0
 f('line').select_option('L1')
 f('area').select_option('A1')
 dlg.locator('[data-r8-select-all]').click()
 f('preview').click()
 assert '2 точек' in f('report').inner_text()
 assert 'Новых маршрутов' in f('report').inner_text()
 assert page.evaluate('window.__writes')==0
 assert f('apply').is_enabled()
 page.screenshot(path=str(OUT/(label+'_preview.png')))
 f('apply').click()
 assert page.evaluate('window.__writes')==1
 assert page.evaluate('window.__db.routes.length')==2
 assert page.evaluate('window.__db.routes.every(r=>r.status==="draft")')
 assert page.evaluate('window.__db.routes.find(r=>r.serviceKey==="bearing:regrease").taskIds.join(",")')=='T1,T2'
 assert page.locator('.route-list-item').count()==2
 page.locator('#autoCreateRoute').click()
 f('area').select_option('A1')
 dlg.locator('[data-r8-select-all]').click()
 f('preview').click()
 assert f('apply').is_disabled()
 assert page.evaluate('window.__writes')==1
 f('close').click()
 assert not errors,errors
 page.close()
with sync_playwright() as pw:
 b=shutil.which('chromium')
 browser=pw.chromium.launch(**({'executable_path':b} if b else {}),headless=True,args=['--no-sandbox'])
 try:
  for width,height,label in [(1440,900,'desktop_1440'),(768,1024,'tablet_768')]:check(browser,width,height,label)
 finally:browser.close()
print('R3A CHROMIUM PASS — preview is read-only; grouping ignores machine family; area scope; explicit draft commit; repeated update is idempotent')
