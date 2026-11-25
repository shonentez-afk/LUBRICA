#!/usr/bin/env python3
"""Capture only real application DOM from index.html (file://). No rendered mockups."""
import json, pathlib, shutil, traceback, ast
from playwright.sync_api import sync_playwright
from PIL import Image
from openpyxl import load_workbook

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'test-artifacts'/'guide-r82'
OUT.mkdir(parents=True,exist_ok=True)
def shot(page,name,selector=None):
    if selector:
        page.locator(selector).first.wait_for(state='visible')
        page.locator(selector).first.scroll_into_view_if_needed()
    page.evaluate('document.fonts.ready')
    page.screenshot(path=str(OUT/name),animations='disabled')
    print('GUIDE SCREEN',name,flush=True)
def view(page,id):
    page.locator('[data-view="'+id+'"]').click()
def close(page):
    page.evaluate("document.querySelector('dialog[open]')?.close()")
def upload(page,data,name='guide-synthetic.json'):
    page.locator('#jsonFileInput').set_input_files({'name':name,'mimeType':'application/json','buffer':data.encode('utf8')})
    page.wait_for_function('LubricaCore.State.isDemo()===false')
def boot(browser):
    c=browser.new_context(viewport={'width':1600,'height':1000},accept_downloads=True)
    c.add_init_script("window.print=()=>{}")
    page=c.new_page();page.set_default_timeout(15000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'index.html').as_uri(),wait_until='load')
    assert page.evaluate('LubricaBootOK===true'),page.evaluate('String(window.LubricaBootError||"")')
    return c,page,errors
def basics(browser):
    c,p,errors=boot(browser)
    try:
        shot(p,'02-demo-header.png','.topbar')
        view(p,'settings')
        shot(p,'01-settings-overview.png','.settings-tile-database')
        shot(p,'23-backup-recovery.png','.settings-tile-backup')
        # Load a disposable copy of the built-in demo data as a working JSON.
        # The application itself must enable import/export; never bypass the demo guard.
        demo=p.evaluate("""() => {const d=JSON.parse(JSON.stringify(LubricaCore.State.getDatabase()));d.project={...d.project,name:'Учебная рабочая база — руководство'};return JSON.stringify(d)}""")
        upload(p,demo,'guide-demo-copy.json')
        p.locator('#importBtn').click()
        shot(p,'03-import-dialog.png','#importDialog')
        close(p)
        view(p,'structureView')
        p.evaluate("LubricaStructure.selectEntity('equipment',LubricaCore.State.getDatabase().equipment[0].id)")
        shot(p,'04-structure-tree.png','#structureSummary')
        view(p,'candidatesView')
        shot(p,'05-candidates.png','#candidatesView')
        view(p,'materials')
        shot(p,'07-material-list-label.png','#libraryAdd')
        p.locator('[data-edit-material]').first.click()
        shot(p,'06-material-card.png','#libMatName')
        close(p)
        with p.expect_popup() as pop:
            p.locator('[data-print-material]').first.click()
        popup=pop.value
        popup.locator('.lubrica-label').wait_for(state='visible')
        popup.screenshot(path=str(OUT/'09-printed-label.png'),animations='disabled')
        popup.close()
        p.locator('[data-lib-tab="tools"]').click()
        shot(p,'08-tool-material-label.png','#libraryAdd')
        view(p,'workspace')
        task=p.evaluate("""() => {const d=LubricaCore.State.getDatabase(),ids=new Set(d.lubricationPoints.filter(x=>x.category==='bearing').map(x=>x.id));return (d.tasks.find(x=>ids.has(x.lubricationPointId))||d.tasks[0]).id}""")
        assert p.evaluate('(id)=>LubricaWorkspaceNavigation.openTask(id)',task)
        for tab,name in [('point','10-map-point-card.png'),('task','11-map-multiple-tasks.png'),('analysis','24-analysis.png'),('calc','12-calculation.png')]:
            p.locator('[data-detail-tab="'+tab+'"]').click()
            shot(p,name,'[data-detail-pane="'+tab+'"]')
        p.locator('#calcBtn').click()
        p.locator('dialog[open]').first.wait_for()
        shot(p,'37-calculation-detail.png','dialog[open]')
        close(p)
        with p.expect_download(timeout=45000) as dl: p.locator('#exportBtn').click()
        xlsx=dl.value.path()
        w=load_workbook(xlsx,read_only=True)
        assert len(w.sheetnames)>1
        w.close()
        shot(p,'22-final-excel.png','#exportBtn')
        assert not errors,errors
    finally:c.close()

def constructors(browser):
    c,p,errors=boot(browser)
    try:
        # Entire application boots normally. Only the input JSON is synthetic.
        data=p.evaluate("""() => {
        const d=LubricaCore.Database.createEmpty('Учебная база — конструкторы');
        d.plants=[{id:'P',name:'Учебный завод'}];
        d.lines=[{id:'L',plantId:'P',name:'Линия 1'}];
        d.areas=[{id:'A',lineId:'L',name:'Учебный участок'}];
        const eq=(id,name,type,parent)=>({id,name,lineId:'L',areaId:'A',equipmentType:type,externalCode:'QA-'+id,status:'active',origin:'import',...(parent?{parentEquipmentId:parent}:{})});
        d.equipment=[eq('CV','Конвейер ленточный','conveyor'),eq('SAW','Пила ленточная №1','other'),eq('WHEEL','Колесо №1 пилы по толщине','other','SAW'),eq('SHAFT','Вал приводной','rotating_shaft')];
        const comp=(id,equipmentId,name,category,extra={})=>({id,equipmentId,name,externalCode:'QA-'+id,candidateCategory:category,candidateState:'candidate',status:'active',...extra});
        d.components=[comp('DRIVE','CV','Вал приводной',null,{candidateEquipmentType:'rotating_shaft'}),comp('RETURN','CV','Вал натяжной',null,{candidateEquipmentType:'rotating_shaft'}),comp('B-CV','CV','Узел подшипниковый UCPA 210','bearing'),comp('B-SAW','WHEEL','Узел подшипниковый UCPA 210','bearing'),comp('B-SHAFT','SHAFT','Подшипниковый узел UCP210','bearing')];
        return JSON.stringify(d);
        }""")
        upload(p,data)
        view(p,'structureView')
        p.evaluate("LubricaStructure.selectEntity('equipment','CV');LubricaCandidateFinalizer.open('equipment','CV')")
        shot(p,'25-conveyor.png','#structureDialog')
        close(p)
        p.evaluate("LubricaStructure.selectEntity('equipment','SAW');LubricaSawCutArrangement.open('SAW')")
        shot(p,'26-saw.png','.saw-cut-form')
        close(p)
        p.evaluate("LubricaStructure.selectEntity('equipment','SHAFT');LubricaRotatingArrangement.open('equipment','SHAFT')")
        p.locator('select[name=rot_count]').select_option('2')
        p.locator('input[name=rot_count_confirmed]').check()
        shot(p,'27-shaft.png','.rotating-confirm-form')
        close(p)
        view(p,'programQA')
        shot(p,'21-control.png','#programQA')
        p.locator('[data-pa-panel] > summary').click()
        shot(p,'28-control-queue.png','.point-acceleration')
        assert not errors,errors
    finally:c.close()

if __name__=='__main__':
    failed=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=shutil.which('chromium') or None,headless=True,args=['--no-sandbox'])
        try:
            for f in (basics,constructors):
                try:f(browser)
                except Exception as e:
                    traceback.print_exc();failed.append(f.__name__+': '+str(e))
        finally:browser.close()
    if failed:raise SystemExit('\n'.join(failed))
