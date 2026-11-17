#!/usr/bin/env python3
"""Stage 5B.12 - actual Chromium UI/UX smoke of conveyor surfaces.

Runs on a synthetic, non-production database. Renders the existing shipped
CSS and actual JS modules, checks behavior at desktop/tablet/mobile widths,
and leaves screenshots for independent visual review.
"""
import json
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "test-artifacts" / "conveyor-ui-ux"
OUTPUT.mkdir(parents=True, exist_ok=True)
SCRIPTS = [
    "structure/context.js",
    "import/component-classifier.js",
    "conveyors/conveyor-arrangement.js",
    "conveyors/conveyor-coverage.js",
    "structure/entity-dialogs.js",
    "import/candidate-finalizer.js",
    "qa/qa-ui.js",
]

def fixture():
    return {
        "project": {"name": "UI/UX test (no production data)"},
        "plants": [{"id": "P1", "name": "Тестовый завод"}],
        "lines": [{"id": "L1", "plantId": "P1", "name": "Линия 1"}],
        "areas": [{"id": "A1", "lineId": "L1", "name": "Участок 1"}],
        "equipment": [
            {"id": "E-IMPORTED", "lineId": "L1", "areaId": "A1",
             "name": "Конвейер роликовый импортированный",
             "equipmentType": "conveyor", "origin": "import",
             "externalCode": "10108215", "status": "active"},
            {"id": "E-BELT", "lineId": "L1", "areaId": "A1",
             "name": "Конвейер ленточный испытательный",
             "equipmentType": "conveyor", "origin": "import",
             "externalCode": "10101093", "status": "active"},
        ],
        "components": [
            {"id": "S-DRIVE", "equipmentId": "E-BELT", "name": "Вал приводной",
             "candidateEquipmentType": "rotating_shaft", "candidateState": "review", "status": "active"},
            {"id": "S-RETURN", "equipmentId": "E-BELT", "name": "Вал натяжной",
             "candidateEquipmentType": "rotating_shaft", "candidateState": "review", "status": "active"},
            {"id": "B-REAL", "equipmentId": "E-BELT", "name": "Узел подшипниковый UCPA 210",
             "externalCode": "10101111", "candidateCategory": "bearing",
             "candidateState": "candidate", "status": "active"},
        ],
        "nodes": [], "lubricationPoints": [], "tasks": [],
        "materials": [], "tools": [], "routes": [], "routePlanItems": [],
        "checklistRuns": [], "meta": {},
    }

SETUP = r"""
window.__db=__FIXTURE__;
window.__toasts=[];
window.LubricaCore={
  State:{getDatabase(){return window.__db},setDatabase(d){window.__db=d}},
  Database:{normalize:d=>d},
  DatabaseSchema:{clone:d=>JSON.parse(JSON.stringify(d))},
  IDs:{nextFrom(rows,prefix,size){
    let i=1,id;
    do{id=prefix+'-'+String(i++).padStart(size,'0')}
    while((rows||[]).some(x=>x.id===id));
    return id;
  }}
};
window.LubricaLubricationDomainCleanup={classifyStaticEquipment:()=>null};
window.LubricaApp={
  showToast:(message,level)=>window.__toasts.push({message,level}),
  refreshFromCore(){},renderAll(){}
};
window.LubricaStructure={render(){},selectEntity(){}};
window.LubricaCandidates={render(){}};
window.LubricaProgramQA={
  CATEGORY_LABELS:{},
  audit(){
    return{
      readiness:0,totalPassed:0,totalApplicable:0,
      severityCounts:{blocker:0,error:0,warn:0},
      issues:[],categories:[],taskCompletion:{},
      counts:{equipment:window.__db.equipment.length,
        points:window.__db.lubricationPoints.length,
        tasks:window.__db.tasks.length,routes:0},
      candidateQueue:{groups:[],lines:[],unlinked:0,totalCandidates:0,
        alreadyLinked:0,byCategory:{},categoryLabels:{}}
    }
  }
};
"""

def check_horizontal_overflow(page, label):
    dimensions = page.evaluate("""() => ({
      view: document.documentElement.clientWidth,
      doc: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    })""")
    assert dimensions["doc"] <= dimensions["view"] + 6, (
        label + " unwanted horizontal document scroll: " + str(dimensions))

def check_dialog_in_view(page, viewport, label):
    bbox = page.locator("#structureDialog").bounding_box()
    assert bbox, label + " dialog is not rendered"
    assert bbox["x"] >= -2 and bbox["x"] + bbox["width"] <= viewport["width"] + 2, (
        label + " dialog too wide: " + str(bbox))
    assert bbox["y"] >= -2 and bbox["y"] < viewport["height"], (
        label + " dialog starts off-screen: " + str(bbox))
    check_horizontal_overflow(page, label)

def install_fixture(page):
    page.set_content("""<!doctype html><html lang="ru"><head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>LUBRICA Conveyor UI/UX test</title></head><body>
      <dialog id="structureDialog"></dialog><main class="program-qa-view" id="programQaView"></main>
      </body></html>""")
    page.add_style_tag(content=(ROOT / "assets/app.css").read_text(encoding="utf-8"))
    page.add_style_tag(content="""html,body{max-width:100%;min-height:100%;margin:0}
      /* This fixture isolates conveyor surfaces from the desktop app shell.
         The production body has a legacy min-width:760px below 1120px;
         separate mobile-app acceptance is required for the entire shell. */
      body{display:block!important;min-width:0!important;overflow-x:hidden}
      #programQaView{max-width:100%;box-sizing:border-box}""")
    page.evaluate("() => {\n" + SETUP.replace("__FIXTURE__", json.dumps(fixture(), ensure_ascii=False)) + "\n}")
    for filename in SCRIPTS:
        page.add_script_tag(content=(ROOT / filename).read_text(encoding="utf-8"))

def test_viewport(browser, width, height, label):
    viewport = {"width": width, "height": height}
    page = browser.new_page(viewport=viewport, device_scale_factor=1, accept_downloads=True)
    console_errors = []
    page.on("pageerror", lambda error: console_errors.append(str(error)))
    install_fixture(page)

    # MANUAL ADD: default must not infer shafts / chain / gearbox or service.
    page.evaluate("""() => {
      window.LubricaStructureContext.selected={type:'project',id:null};
      window.LubricaEntityDialogs.open('equipment',null)
    }""")
    page.locator("select[name=equipmentType]").select_option("conveyor")
    assert page.locator("select[name=conveyorSubtype]").input_value() == "unknown"
    assert not page.locator("input[name=conveyorChainEnabled]").is_checked()
    assert page.locator("select[name=conveyorDriveMode]").input_value() == "none"
    page.locator("select[name=conveyorSubtype]").select_option("belt")
    assert page.locator("input[name=conveyorDriveShaftName]").input_value() == ""
    assert page.locator("input[name=conveyorReturnShaftName]").input_value() == ""
    assert page.locator("input[name=conveyorDriveShaftName]").is_visible()
    assert page.evaluate("""() => {
      const label=document.querySelector('select[name=equipmentType]').closest('label');
      return label.nextElementSibling?.matches('[data-manual-conveyor]');
    }"""), label + " subtype constructor should follow equipment type, not manufacturer"
    assert not page.locator("input[name=conveyorChainName]").is_visible()
    assert not page.locator("input[name=conveyorDriveName]").is_visible()
    check_dialog_in_view(page, viewport, label + ": manual")
    page.screenshot(path=str(OUTPUT / (label + "_manual.png")))

    # Dynamic action fields: only fields for selected physical configuration.
    page.locator("input[name=conveyorChainEnabled]").check()
    assert page.locator("input[name=conveyorChainName]").is_visible()
    page.locator("select[name=conveyorDriveMode]").select_option("separate")
    assert page.locator("input[name=conveyorGearboxName]").is_visible()
    assert page.locator("input[name=conveyorMotorName]").is_visible()
    assert not page.locator("input[name=conveyorDriveName]").is_visible()
    page.locator("input[name=conveyorChainEnabled]").uncheck()
    page.locator("select[name=conveyorDriveMode]").select_option("none")
    page.locator("input[name=name]").fill("Конвейер ленточный ручной")
    page.locator("input[name=externalCode]").fill("MAN-TEST")
    page.locator("button[data-save]").click()
    assert page.evaluate("""() => window.__db.components.filter(c =>
      c.equipmentId !== 'E-BELT' && c.equipmentId !== 'E-IMPORTED').length""") == 0, (
      label + " manual empty form manufactured equipment")

    # Subtype preview must not destroy draft form edits without confirmation.
    page.evaluate("() => window.LubricaCandidateFinalizer.open('equipment','E-IMPORTED')")
    assert page.locator('select[name="conveyorSubtypeChoice"]').input_value() == "roller"
    original_db = page.evaluate("JSON.stringify(window.__db)")
    page.locator('select[name="conveyorSubtypeChoice"]').select_option("chain")
    assert page.locator('[data-conveyor-switch-confirm]').is_visible()
    assert page.locator('button[data-save]').is_disabled()
    assert page.evaluate("JSON.stringify(window.__db)") == original_db
    page.locator('[data-conveyor-switch-cancel]').click()
    assert page.locator('select[name="conveyorSubtypeChoice"]').input_value() == "roller"
    assert page.locator('button[data-save]').is_enabled()
    page.locator('select[name="conveyorSubtypeChoice"]').select_option("chain")
    page.locator('[data-conveyor-switch-apply]').click()
    assert page.locator('#structureDialog h2').inner_text() == "Цепной конвейер"
    assert page.evaluate("JSON.stringify(window.__db)") == original_db
    page.locator('#structureDialog [data-cancel]').first.click()

    # SOURCE-CONFIRMED TWO-SHAFT REVIEW: no automatically selected points.
    page.evaluate("() => window.LubricaCandidateFinalizer.open('equipment','E-BELT')")
    assert page.locator('input[name="use_0"]').is_visible()
    assert page.locator('[data-conveyor-selected-count]').count() == 1
    assert page.locator('.conveyor-subtype-picker .conveyor-subtype-label').count() == 1
    assert "Выбрано точек: 0" in page.locator('[data-conveyor-selected-count]').inner_text()
    select_text = page.locator('select[name="bearing_assign_drive_left"]').inner_text()
    assert "10101111" in select_text or "B-REAL" in select_text
    check_dialog_in_view(page, viewport, label + ": support")
    page.screenshot(path=str(OUTPUT / (label + "_support.png")))
    page.locator('input[name="use_0"]').check()
    assert "Выбрано точек: 1" in page.locator('[data-conveyor-selected-count]').inner_text()
    page.locator('input[name="pos_0"]').fill("Приводной вал · подтверждённая левая опора")
    assert page.locator('input[name="name_0"]').input_value().endswith("левая опора")
    page.locator('button[data-save]').click()
    assert page.evaluate('window.__db.lubricationPoints.length') == 0, (
      label + " saved unverified physical support")
    page.locator('select[name="bearing_assign_drive_left"]').select_option("B-REAL")
    page.locator('input[name="conveyor_support_source"]').fill("Осмотр / фото 10101093")
    page.locator('input[name="conveyor_support_confirm"]').check()
    page.locator('button[data-save]').click()
    assert page.evaluate("window.__db.lubricationPoints.length") == 1
    assert page.evaluate("window.__db.tasks.every(t => t.approvalStatus==='review')")
    assert "подтверждённая левая опора" in page.evaluate(
        "window.__db.lubricationPoints[0].name")

    # CONTROL: source ID search, reset and local export at real desktop/mobile widths.
    page.evaluate("""() => {
      const host=document.getElementById('programQaView');
      host.dataset.qaConveyorExpanded='1';
      window.renderProgramQA(host);
    }""")
    control = page.locator('[data-qa-conveyor-details]')
    assert control.count() == 1
    assert control.get_attribute("open") is not None
    total = page.evaluate("window.LubricaConveyorCoverage.audit(window.__db).machineCount")
    assert total >= 2
    page.locator('[data-qa-conveyor-query]').fill("B-REAL")
    page.locator('[data-qa-conveyor-search]').click()
    assert "В выборке: 1 из" in page.locator('.qa-conveyor-coverage').inner_text()
    # A specific machine's CSV must be complete and exclude other machines.
    detail = page.locator('.qa-conveyor-coverage article.qa-issue details').first
    detail.locator('summary').click()
    with page.expect_download() as download_info:
        detail.locator('[data-qa-conveyor-one-csv]').click()
    target = OUTPUT / (label + "_belt_sources.csv")
    download_info.value.save_as(target)
    content = target.read_text(encoding="utf-8-sig")
    assert "B-REAL" in content and "E-BELT" in content, label + " CSV lost traceability"
    assert "E-IMPORTED" not in content, label + " CSV contains another conveyor"
    page.locator('[data-qa-conveyor-reset]').click()
    assert ("В выборке: " + str(total) + " из " + str(total)) in (
      page.locator('.qa-conveyor-coverage').inner_text())
    check_horizontal_overflow(page, label + ": QA")
    page.screenshot(path=str(OUTPUT / (label + "_control.png")))

    # Read-only audit must not create routes or overwrite historical facts.
    assert page.evaluate("window.__db.routes.length") == 0
    assert not console_errors, label + " JavaScript errors: " + " | ".join(console_errors)
    page.close()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    try:
        for width, height, label in [
            (1440, 900, "desktop_1440"), (768, 1024, "tablet_768"),
            (390, 844, "mobile_390"),
        ]:
            test_viewport(browser, width, height, label)
    finally:
        browser.close()
print("PASS Stage 5B.12 Chromium UX: manual, source-verified supports and Control at 1440/768/390px")
