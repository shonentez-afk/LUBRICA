from pathlib import Path
import re, subprocess, sys, json
base=Path(__file__).resolve().parents[1]
errors=[]; warnings=[]
html=(base/'index.html').read_text(encoding='utf-8')
ids=re.findall(r'id=["\']([^"\']+)["\']',html)
for x in sorted(set(ids)):
    if ids.count(x)>1: errors.append(f'duplicate HTML id: {x}')
# scripts exist
scripts=re.findall(r'<script[^>]+src=["\']([^"\']+)["\']',html)
for src in scripts:
    p=(base/src.replace('./',''))
    if not p.exists(): errors.append(f'missing script: {src}')
# JS syntax
for p in base.rglob('*.js'):
    r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
    if r.returncode: errors.append(f'JS syntax {p.relative_to(base)}: {r.stderr.strip()}')
# initial wire must not contain unsafe direct .onclick/.onchange assignments
app=(base/'js/app.js').read_text(encoding='utf-8')
if 'function wire()' in app:
    wire=app[app.index('function wire()'):app.index('function bootApplication()',app.index('function wire()'))]
    unsafe=re.findall(r'\$\(["\']#[^"\']+["\']\)\.(?:onclick|onchange|oninput)\s*=',wire)
    if unsafe: errors.append(f'unsafe startup handlers: {len(unsafe)}')
# referenced hidden inputs critical to backup/open
for req in ['jsonFileInput','backupJsonFileInput','fileInput','importDialog','processImport']:
    if req not in ids: errors.append(f'missing critical initial element: {req}')
# manifest consistency
m=json.loads((base/'manifest.json').read_text(encoding='utf-8'))
version_sources=[base/'data/demo-data.js', base/'js/app.js']
match=None
for vp in version_sources:
    if vp.exists():
        match=re.search(r'const APP_VERSION="([^"]+)"',vp.read_text(encoding='utf-8'))
        if match: break
if not match: errors.append('APP_VERSION not found')
elif m.get('appVersion')!=match.group(1): errors.append('manifest appVersion != APP_VERSION')
# modular architecture guard
required_modules=['core/observability.js','data/demo-data.js','js/runtime.js','ui/workspace.js','ui/view-router.js','routes/route-engine.js','routes/routes-ui.js','ui/checks-settings.js','ui/user-guide.js','qa/qa-engine.js','qa/qa-ui.js','core/database-safety.js','core/database-session-ui.js','export/export-ui.js','import/import-ui.js','ui/column-dialog.js','materials/library-ui.js','lubrication/task-editor.js','ui/bulk-edit.js','ui/workspace-enhancements.js','structure/context.js','structure/tree-ui.js','structure/entity-dialogs.js','structure/point-wizard.js','structure/detail-ui.js','structure/structure.js']
for rel in required_modules:
    if not (base/rel).exists(): errors.append(f'missing modular app file: {rel}')
app_lines=len(app.splitlines())
if app_lines>150: errors.append(f'js/app.js grew to {app_lines} lines; bootstrap must stay <=150')
for rel in required_modules:
    marker='./'+rel
    if marker not in scripts: errors.append(f'module not connected in index.html: {marker}')

# cross-module renderer contracts: never rely on accidental implicit globals
contracts={
    'materials/library-ui.js':['window.renderMaterials=renderMaterials;','window.LubricaMaterials=Object.freeze'],
    'lubrication/task-editor.js':['window.LubricaTaskEditor=Object.freeze'],
    'routes/route-engine.js':['window.LubricaRouteEngine=Object.freeze'],
    'ui/bulk-edit.js':['window.LubricaBulkEdit=Object.freeze'],
    'routes/routes-ui.js':['window.renderRoutes=renderRoutes;'],
    'ui/checks-settings.js':['window.renderSettings=renderSettings;'],
    'qa/qa-ui.js':['global.renderProgramQA=render'],
    'ui/user-guide.js':['global.LubricaUserGuide=Object.freeze'],
}
for rel,needles in contracts.items():
    text=(base/rel).read_text(encoding='utf-8')
    for needle in needles:
        if needle not in text: errors.append(f'missing explicit module export in {rel}: {needle}')
router=(base/'ui/view-router.js').read_text(encoding='utf-8')
for name in ['renderMaterials','renderRoutes','renderProgramQA','renderSettings']:
    if f'window.{name}?.' not in router: errors.append(f'view-router must use explicit optional export: {name}')
# Regression guard for the Stage 5.6 crash: strict-mode library must declare renderer, not assign undeclared name.
lib=(base/'materials/library-ui.js').read_text(encoding='utf-8')
if re.search(r'(?m)^renderMaterials\s*=\s*function',lib): errors.append('unsafe undeclared renderMaterials assignment in strict mode')
if 'function renderMaterials(' not in lib: errors.append('renderMaterials function declaration missing')

# observability must load before all application modules
if './core/observability.js' not in scripts:
    errors.append('observability module not connected')
elif scripts.index('./core/observability.js')>scripts.index('./vendor/jszip.min.js'):
    errors.append('observability must load before vendor/application scripts')
if 'id="systemStatusBtn"' not in html or 'id="systemDialog"' not in html:
    errors.append('system diagnostics UI missing')
# title/stage sanity
# flag remaining cross-module monkey patches for planned refactor
for rel in ['materials/library-ui.js']:
    text=(base/rel).read_text(encoding='utf-8')
    overrides=re.findall(r'(?m)^(fillDetail|savePoint|routeEntries|bulkEdit)\s*=\s*function',text)
    if overrides: errors.append(f'{rel} overrides foreign globals: {", ".join(overrides)}')

# diagnostics contract after addEventListener refactor
if 'window.LubricaApp=window.LubricaApp||' not in app: errors.append('explicit LubricaApp API missing')
if 'window.LubricaApp.handlers[`${id}:${event}`]' not in app: errors.append('bindUI handler registry missing')
diag=(base/'core/diagnostics.js').read_text(encoding='utf-8')
if '.onclick' in diag: errors.append('diagnostics must not inspect .onclick after addEventListener refactor')
if "hasHandler?.(id,'click')" not in diag: errors.append('diagnostics must verify registered addEventListener handlers')
obs=(base/'core/observability.js').read_text(encoding='utf-8')
if "global.LubricaApp&&global.LubricaApp.booted===true" not in obs: errors.append('health check must use explicit LubricaApp boot state')
# Stage 5.9 structure decomposition guard
structure_facade=(base/'structure/structure.js').read_text(encoding='utf-8')
if len(structure_facade.splitlines())>80: errors.append('structure/structure.js must remain a small facade <=80 lines')
for forbidden in ['function renderTree(','function renderDetail(','function openPointWizard(','function upsert(']:
    if forbidden in structure_facade: errors.append(f'structure facade contains moved responsibility: {forbidden}')
structure_contracts={
 'structure/context.js':'LubricaStructureContext',
 'structure/tree-ui.js':'LubricaStructureTree',
 'structure/detail-ui.js':'LubricaStructureDetail',
 'structure/entity-dialogs.js':'LubricaEntityDialogs',
 'structure/point-wizard.js':'LubricaPointWizard',
}
for rel,api in structure_contracts.items():
    if api not in (base/rel).read_text(encoding='utf-8'): errors.append(f'missing Stage 5.9 API {api} in {rel}')
# Stage 5.10 database decomposition guard
db_modules={
 'core/database-schema.js':'DatabaseSchema',
 'core/database-normalizer.js':'DatabaseNormalizer',
 'core/database-migrations.js':'DatabaseMigrations',
}
for rel,api in db_modules.items():
    if not (base/rel).exists(): errors.append(f'missing Stage 5.10 module: {rel}')
    elif api not in (base/rel).read_text(encoding='utf-8'): errors.append(f'missing Stage 5.10 API {api} in {rel}')
for rel in ['core/database-schema.js','core/database-normalizer.js','core/database-migrations.js','core/database.js','core/database-safety.js']:
    marker='./'+rel
    if marker not in scripts: errors.append(f'database module not connected: {marker}')
expected_order=['./core/database-schema.js','./core/database-normalizer.js','./core/database-migrations.js','./core/database.js','./core/migration.js','./core/database-safety.js','./core/storage.js']
if all(x in scripts for x in expected_order):
    idx=[scripts.index(x) for x in expected_order]
    if idx!=sorted(idx): errors.append('database module script order invalid')
db_facade=(base/'core/database.js').read_text(encoding='utf-8')
if len(db_facade.splitlines())>40: errors.append('core/database.js must remain a small facade <=40 lines')
for forbidden in ['function normalize(','function fromLegacy(','function toLegacy(','function syncLegacy(','function createEmpty(']:
    if forbidden in db_facade: errors.append(f'database facade contains moved responsibility: {forbidden}')
if 'lubrica' not in html.lower(): warnings.append('HTML title does not identify LUBRICA')


# Stage 6 candidate finalization guard
stage6 = base/'import/candidate-finalizer.js'
if not stage6.exists(): errors.append('missing Stage 6 module: import/candidate-finalizer.js')
else:
    st6=stage6.read_text(encoding='utf-8')
    for token in ['LubricaCandidateFinalizer','candidateOriginKey','Подтвердить и создать','approvalStatus:\'review\'']:
        if token not in st6: errors.append(f'Stage 6 finalizer missing contract: {token}')
    if 'Core.State.setDatabase' not in st6: errors.append('Stage 6 finalizer does not persist database')
idx=(base/'index.html').read_text(encoding='utf-8')
if './import/candidate-finalizer.js' not in idx: errors.append('Stage 6 finalizer not loaded in index.html')

# Stage 6.3 runtime contract regression checks
app_js=(base/"js/app.js").read_text(encoding="utf-8")
runtime_js=(base/"js/runtime.js").read_text(encoding="utf-8")
obs_js=(base/"core/observability.js").read_text(encoding="utf-8")
finalizer_js=(base/"import/candidate-finalizer.js").read_text(encoding="utf-8")
if "refreshFromCore(){" not in app_js:
    errors.append("LubricaApp public refreshFromCore contract missing")
if "function refreshFromCore()" not in runtime_js:
    errors.append("Runtime refreshFromCore implementation missing")
if "record('warn','Браузер сообщил непрозрачную file:// ошибку" in obs_js:
    errors.append("Opaque file:// Script error must not create user warning")
if "global.LubricaApp?.refreshFromCore();" in finalizer_js:
    errors.append("Candidate finalizer uses unsafe direct refreshFromCore call")

# Stage 6.4 structured activity regression checks
ctx=(base/"structure/context.js").read_text(encoding="utf-8")
point_wizard=(base/"structure/point-wizard.js").read_text(encoding="utf-8")
normalizer=(base/"core/database-normalizer.js").read_text(encoding="utf-8")
if "C.activityCatalog" not in ctx or "C.activityTypesByCategory" not in ctx:
    errors.append("Structured activity catalog missing")
if 'name="actions_${i}"' in finalizer_js or "split(';')" in finalizer_js:
    errors.append("Candidate finalizer still uses free-text activity list")
if "activityType:activity.type" not in finalizer_js:
    errors.append("Candidate-created tasks do not persist activityType")
if 'name="activityTypes"' not in point_wizard:
    errors.append("Point wizard does not use structured activity types")
if "activityType:t.activityType||legacyActivityType" not in normalizer and "const activityType=canonicalTaskActivity(t)" not in normalizer:
    errors.append("Legacy tasks are not normalized to activityType")


# Stage 6.5 integration QA guards
import_engine=(base/"import/import-engine.js").read_text(encoding="utf-8")
materials_ui=(base/"materials/library-ui.js").read_text(encoding="utf-8")
if "reconcileImportedStructure" not in import_engine:
    errors.append("Import structure reconciliation missing")
if "problemComponents.clear()" not in import_engine:
    errors.append("Import problem summary may retain transient orphans")
if "activityTypeForLabel" not in materials_ui:
    errors.append("Material requirement logic is not activityType-aware")
if "applyConfirmedSpecs" not in finalizer_js:
    errors.append("Candidate finalization has no testable pure apply contract")


# Stage 7 Bearing Library guards
for rel in ['bearings/catalog-data.js','bearings/library.js','bearings/library-ui.js']:
    if not (base/rel).exists():
        errors.append(f'missing Stage 7 bearing module: {rel}')
for script in ['./bearings/catalog-data.js','./bearings/library.js','./bearings/library-ui.js']:
    if script not in scripts:
        errors.append(f'bearing module not connected: {script}')
bearing_lib=(base/'bearings/library.js').read_text(encoding='utf-8') if (base/'bearings/library.js').exists() else ''
task_editor=(base/'lubrication/task-editor.js').read_text(encoding='utf-8')
if 'LubricaBearings' not in bearing_lib or 'function parse(' not in bearing_lib or 'function lookup(' not in bearing_lib:
    errors.append('Bearing Library public parser/lookup contract missing')
if 'bearingOverrides' not in normalizer:
    errors.append('Bearing overrides are not normalized')
if 'fBearingStructural' not in html or 'fBearingActual' not in html:
    errors.append('Bearing point fields missing in card')
if 'resolveBearingImpl' not in task_editor:
    errors.append('Task editor bearing resolution integration missing')
if 'data-view="bearings"' not in html:
    errors.append('Bearing Library navigation item missing')


# Stage 7.1 Bearing editor UI regression checks
bearing_ui=(base/'bearings/library-ui.js').read_text(encoding='utf-8')
if '<form method="dialog" class="bearing-dialog" id="bearingOverrideForm">' in bearing_ui:
    errors.append('Bearing editor cancel still participates in dialog form validation')
if 'data-cancel' not in bearing_ui or "f.reportValidity()" not in bearing_ui:
    errors.append('Bearing editor cancel/save validation contract missing')
for bearing_type in ['angular_contact_ball','self_aligning_ball','cylindrical_roller','spherical_roller','tapered_roller','needle_roller','thrust_ball','thrust_roller','bearing_unit','plain_bearing']:
    if bearing_type not in bearing_ui:
        errors.append(f'Bearing editor type option missing: {bearing_type}')
if 'notes-field' not in bearing_ui or 'source-reference' not in bearing_ui:
    errors.append('Bearing editor source/notes layout contract missing')


# Stage 8 bearing calculation guards
if './bearings/calculator.js' not in scripts:
    errors.append('Bearing calculator not connected')
calc=(base/'bearings/calculator.js').read_text(encoding='utf-8') if (base/'bearings/calculator.js').exists() else ''
task_editor=(base/'lubrication/task-editor.js').read_text(encoding='utf-8')
for token in ['relubeQuantity','geometricBearingFill','adjustedInterval','speedAssessment']:
    if token not in calc: errors.append(f'Bearing calculator contract missing: {token}')
for token in ['bearingCalcDialog','bearingCalcSummary','calcBtn']:
    if token not in html: errors.append(f'Bearing calculation UI missing: {token}')
if 'openBearingCalculationImpl' not in task_editor or 'recalculateBearingImpl' not in task_editor:
    errors.append('Task editor Stage 8 bearing calculation integration missing')


# Stage 8.3 full-fill calculation audit guards
if 'bearingMassKg' not in calc or 'M/(7,8×10⁻³)' not in calc:
    errors.append('SKF mass-based bearing free-volume contract missing')
if "bearingType==='bearing_unit'" not in calc or 'blocked:true' not in calc:
    errors.append('Housed-bearing full-fill blocking contract missing')
if 'freeSpaceFactor' in calc or 'name="freeSpaceFactor"' in task_editor:
    errors.append('Obsolete universal free-space factor Ksv still active')
if 'geometricEnvelopeVolumeCm3' not in task_editor or 'bearingMassKg' not in task_editor:
    errors.append('Audited full-fill persistence contract missing')
if 'bearing-calc-modal-form' not in task_editor:
    errors.append('Bearing calculation is not implemented as a wide modal')


# Stage 8.2 Calculation Framework guards
for rel in ['calculations/registry.js','calculations/framework.js','calculations/catalog.js','calculations/bearing-adapter.js']:
    if not (base/rel).exists(): errors.append(f'Calculation Framework file missing: {rel}')
for script in ['./calculations/registry.js','./calculations/framework.js','./calculations/catalog.js','./calculations/bearing-adapter.js']:
    if script not in scripts: errors.append(f'Calculation Framework module not connected: {script}')
registry_js=(base/'calculations/registry.js').read_text(encoding='utf-8') if (base/'calculations/registry.js').exists() else ''
framework_js=(base/'calculations/framework.js').read_text(encoding='utf-8') if (base/'calculations/framework.js').exists() else ''
catalog_js=(base/'calculations/catalog.js').read_text(encoding='utf-8') if (base/'calculations/catalog.js').exists() else ''
task_editor=(base/'lubrication/task-editor.js').read_text(encoding='utf-8')
app_js=(base/'js/app.js').read_text(encoding='utf-8')
if 'function register(' not in registry_js or 'function resolve(' not in registry_js:
    errors.append('Calculation Registry register/resolve contract missing')
if 'markResult' not in framework_js or 'moduleStatus' not in framework_js:
    errors.append('Calculation Framework result/status contract missing')
for module_id in ['linear-bearing','gearbox-oil','oil-system','chain','coupling','open-gear','grease-point','wire-rope','central-lubrication']:
    if module_id not in catalog_js: errors.append(f'Planned calculation module missing: {module_id}')
if 'openCalculationImpl' not in task_editor or 'getCalculationContext' not in task_editor:
    errors.append('Task editor does not expose generic calculation context/open contract')
if 'p.type==="bearing"' in app_js:
    errors.append('Bootstrap calc button still contains bearing-specific routing')
if "calculations:{...(lp.calculations||{})}" not in normalizer:
    errors.append('Generic calculation metadata store is not normalized')
if 'linear_bearing' not in html:
    errors.append('Linear bearing category is not exposed in UI')


# Stage 8.3 Linear Bearings guards
for rel in ['calculations/linear-bearing-calculator.js','calculations/linear-bearing-adapter.js']:
    if not (base/rel).exists(): errors.append(f'Linear Bearing module missing: {rel}')
for script in ['./calculations/linear-bearing-calculator.js','./calculations/linear-bearing-adapter.js']:
    if script not in scripts: errors.append(f'Linear Bearing module not connected: {script}')
linear_calc=(base/'calculations/linear-bearing-calculator.js').read_text(encoding='utf-8') if (base/'calculations/linear-bearing-calculator.js').exists() else ''
linear_adapter=(base/'calculations/linear-bearing-adapter.js').read_text(encoding='utf-8') if (base/'calculations/linear-bearing-adapter.js').exists() else ''
classifier=(base/'import/component-classifier.js').read_text(encoding='utf-8')
task_editor=(base/'lubrication/task-editor.js').read_text(encoding='utf-8')
if 'qtyPerUnitCm3' not in linear_calc or 'orientationFactor' not in linear_calc or 'thk_reference' not in linear_calc:
    errors.append('Linear Bearing calculator OEM/orientation/interval contract missing')
if "status:'ready'" not in linear_adapter or "categories:['linear_bearing']" not in linear_adapter:
    errors.append('Linear Bearing ready adapter not registered')
if "category:'linear_bearing'" not in classifier:
    errors.append('Classifier does not distinguish linear bearings')
if "linearBearing:lp.category==='linear_bearing'" not in normalizer:
    errors.append('Linear Bearing point data is not normalized')
if "lp.category==='linear_bearing'" not in task_editor:
    errors.append('Linear Bearing calculation is not synchronized to task')
if '<option>см³</option>' not in html:
    errors.append('cm3 unit missing from task quantity selector')

# Stage 8.4 Gearbox/Oil guards
for rel in ['calculations/gearbox-oil-calculator.js','calculations/gearbox-oil-adapter.js']:
    if not (base/rel).exists(): errors.append(f'Gearbox Oil module missing: {rel}')
for script in ['./calculations/gearbox-oil-calculator.js','./calculations/gearbox-oil-adapter.js']:
    if script not in scripts: errors.append(f'Gearbox Oil module not connected: {script}')
gear_calc=(base/'calculations/gearbox-oil-calculator.js').read_text(encoding='utf-8') if (base/'calculations/gearbox-oil-calculator.js').exists() else ''
gear_adapter=(base/'calculations/gearbox-oil-adapter.js').read_text(encoding='utf-8') if (base/'calculations/gearbox-oil-adapter.js').exists() else ''
if 'effectiveFillLiters' not in gear_calc or 'conditionBased' not in gear_calc: errors.append('Gearbox Oil fill/interval contract missing')
if "status:'ready'" not in gear_adapter or "categories:['gearbox_oil']" not in gear_adapter: errors.append('Gearbox Oil ready adapter not registered')
if "gearboxOil:lp.category==='gearbox_oil'" not in normalizer: errors.append('Gearbox Oil data is not normalized')
if "lp.category==='gearbox_oil'" not in task_editor: errors.append('Gearbox Oil calculation is not synchronized to task')
linear_all=(base/'calculations/linear-bearing-calculator.js').read_text(encoding='utf-8')+(base/'calculations/linear-bearing-adapter.js').read_text(encoding='utf-8')+task_editor
for forbidden in ['travelKm','baseTravelKm','approvedTravelKm','Пробег, км','100 км','calculatedDistanceKm','approvedDistanceKm']:
    if forbidden in linear_all: errors.append(f'Linear Bearing distance field still present: {forbidden}')


# Stage 8.5 Chains guards
for rel in ['calculations/chain-calculator.js','calculations/chain-adapter.js']:
    if not (base/rel).exists(): errors.append(f'Chain module missing: {rel}')
for script in ['./calculations/chain-calculator.js','./calculations/chain-adapter.js']:
    if script not in scripts: errors.append(f'Chain module not connected: {script}')
chain_calc=(base/'calculations/chain-calculator.js').read_text(encoding='utf-8') if (base/'calculations/chain-calculator.js').exists() else ''
chain_adapter=(base/'calculations/chain-adapter.js').read_text(encoding='utf-8') if (base/'calculations/chain-adapter.js').exists() else ''
task_editor=(base/'lubrication/task-editor.js').read_text(encoding='utf-8')
if 'quantityMethod' not in chain_calc or 'nozzleDoseMl' not in chain_calc or 'applicationTarget' not in chain_calc:
    errors.append('Chain calculator quantity/application contract missing')
if "status:'ready'" not in chain_adapter or "categories:['chain']" not in chain_adapter:
    errors.append('Chain ready adapter not registered')
if "chain:lp.category==='chain'" not in normalizer:
    errors.append('Chain point data is not normalized')
if "lp.category==='chain'&&lp.chain?.calculation" not in task_editor:
    errors.append('Chain calculation is not synchronized to task')


# Stage 8.6 Couplings guards
for rel in ['calculations/coupling-calculator.js','calculations/coupling-adapter.js']:
    if not (base/rel).exists(): errors.append(f'Coupling module missing: {rel}')
for script in ['./calculations/coupling-calculator.js','./calculations/coupling-adapter.js']:
    if script not in scripts: errors.append(f'Coupling module not connected: {script}')
coupling_calc=(base/'calculations/coupling-calculator.js').read_text(encoding='utf-8') if (base/'calculations/coupling-calculator.js').exists() else ''
coupling_adapter=(base/'calculations/coupling-adapter.js').read_text(encoding='utf-8') if (base/'calculations/coupling-adapter.js').exists() else ''
task_editor=(base/'lubrication/task-editor.js').read_text(encoding='utf-8')
if 'cavityVolumeCm3' not in coupling_calc or 'fillRatio' not in coupling_calc or 'oemTotalG' not in coupling_calc:
    errors.append('Coupling quantity contract missing')
if "status:'ready'" not in coupling_adapter or "categories:['coupling']" not in coupling_adapter:
    errors.append('Coupling adapter not ready')
if "coupling:lp.category==='coupling'" not in normalizer: errors.append('Coupling data not normalized')
if "lp.category==='coupling'&&lp.coupling?.calculation" not in task_editor: errors.append('Coupling calculation not synchronized')


# Stage 8.7 Grease Points & Screw Drives guards
for rel in ['calculations/grease-point-calculator.js','calculations/grease-point-adapter.js','calculations/ball-screw-calculator.js','calculations/ball-screw-adapter.js']:
    if not (base/rel).exists(): errors.append(f'Stage 8.7 module missing: {rel}')
for script in ['./calculations/grease-point-calculator.js','./calculations/grease-point-adapter.js','./calculations/ball-screw-calculator.js','./calculations/ball-screw-adapter.js']:
    if script not in scripts: errors.append(f'Stage 8.7 module not connected: {script}')
classifier=(base/'import/component-classifier.js').read_text(encoding='utf-8')
task_editor=(base/'lubrication/task-editor.js').read_text(encoding='utf-8')
if "category:'ball_screw'" not in classifier: errors.append('Classifier does not distinguish ball screws')
if "ballScrew:lp.category==='ball_screw'" not in normalizer: errors.append('Ball screw data not normalized')
if "greasePoint:['guide','joint','bushing','screw'].includes(lp.category)" not in normalizer: errors.append('Grease point data not normalized')
if "lp.category==='ball_screw'&&lp.ballScrew?.calculation" not in task_editor: errors.append('Ball screw calculation not synchronized')
if "['guide','joint','bushing','screw'].includes(lp.category)&&lp.greasePoint?.calculation" not in task_editor: errors.append('Grease point calculation not synchronized')


# Stage 8.8 Component Library guards
for rel in ['components/registry.js','components/bearing-adapter.js','components/library-ui.js']:
    if not (base/rel).exists(): errors.append(f'Component Library missing: {rel}')
for script in ['./components/registry.js','./components/bearing-adapter.js','./components/library-ui.js']:
    if script not in scripts: errors.append(f'Component Library not connected: {script}')
registry=(base/'components/registry.js').read_text(encoding='utf-8') if (base/'components/registry.js').exists() else ''
router=(base/'ui/view-router.js').read_text(encoding='utf-8')
if 'componentLibraryEntries' not in normalizer: errors.append('Component Library entries not normalized')
if "['bearing','Подшипники качения']" not in registry or "['chain','Цепные передачи']" not in registry or "['ball_screw','Шарико-винтовые передачи (ШВП)']" not in registry: errors.append('Component categories incomplete')
if 'renderComponents' not in router: errors.append('Component Library UI not routed')
if '<small>Справочник</small>' not in html: errors.append('Left menu label is not Справочник')


# Stage 8.9 specialized reference cards
if not (base/'components/category-schemas.js').exists(): errors.append('Component category schemas missing')
if './components/category-schemas.js' not in scripts: errors.append('Component category schemas not connected')
component_ui=(base/'components/library-ui.js').read_text(encoding='utf-8')
if 'data-technical-fields' not in component_ui or 'data-lubrication-fields' not in component_ui: errors.append('Specialized component editor sections missing')
if 'OEM-данные смазки' not in component_ui: errors.append('OEM lubrication section missing')


# Stage 8.9.1 terminology + starter catalog guards
for rel in ['components/starter-data.js','components/starter-adapter.js']:
    if not (base/rel).exists(): errors.append(f'Starter catalog missing: {rel}')
for script in ['./components/starter-data.js','./components/starter-adapter.js']:
    if script not in scripts: errors.append(f'Starter catalog not connected: {script}')
component_ui=(base/'components/library-ui.js').read_text(encoding='utf-8')
component_registry=(base/'components/registry.js').read_text(encoding='utf-8')
category_schemas=(base/'components/category-schemas.js').read_text(encoding='utf-8')
starter_data=(base/'components/starter-data.js').read_text(encoding='utf-8') if (base/'components/starter-data.js').exists() else ''
bearing_catalog=(base/'bearings/catalog-data.js').read_text(encoding='utf-8')
bearing_ui=(base/'bearings/library-ui.js').read_text(encoding='utf-8')
if 'componentBearingParser' in component_ui or 'Распознать подшипник' in component_ui:
    errors.append('General Component Library still exposes bearing-only parser button')
if "filter(x=>x.id!=='bearing')" in component_ui:
    errors.append('Bearing category still excluded from Add Record')
if "id:'bearing'" not in category_schemas:
    errors.append('Bearing specialized editor schema missing')
if 'глубокоради' in bearing_catalog.lower() or 'глубокоради' in bearing_ui.lower():
    errors.append('Deprecated/nonpreferred term глубокорадиальный still visible in active bearing UI/catalog')
for label in ['Подшипники качения','Цепные передачи','Шарико-винтовые передачи (ШВП)','Редукторы и мотор-редукторы','Открытые зубчатые передачи']:
    if label not in component_registry: errors.append(f'Component terminology missing: {label}')
for token in ['08B-1','RX77','JPF1605-4','LM8UU','1020T']:
    if token not in starter_data: errors.append(f'Starter catalog representative missing: {token}')


# Stage 8.10 Component Binding & Autofill guards
for rel in ['components/binding.js']:
    if not (base/rel).exists(): errors.append(f'Component Binding missing: {rel}')
for script in ['./components/binding.js']:
    if script not in scripts: errors.append(f'Component Binding not connected: {script}')
binding_js=(base/'components/binding.js').read_text(encoding='utf-8') if (base/'components/binding.js').exists() else ''
point_wizard=(base/'structure/point-wizard.js').read_text(encoding='utf-8')
candidate_finalizer=(base/'import/candidate-finalizer.js').read_text(encoding='utf-8')
component_ui=(base/'components/library-ui.js').read_text(encoding='utf-8')
task_editor=(base/'lubrication/task-editor.js').read_text(encoding='utf-8')
structure_context=(base/'structure/context.js').read_text(encoding='utf-8')
classifier=(base/'import/component-classifier.js').read_text(encoding='utf-8')
if 'sourceComponentId' not in binding_js or 'libraryEntryId' not in binding_js or 'actualLibraryEntryId' not in binding_js:
    errors.append('Component Binding core links missing')
if "libraryCategory('screw')" not in (base/'test/test_component_binding.js').read_text(encoding='utf-8'):
    errors.append('Component category alias regression test missing')
if 'sourceComponentId' not in point_wizard or 'Элемент из структуры' not in point_wizard:
    errors.append('Point Wizard does not expose structure component binding')
if 'linkedPointForComponent' not in point_wizard:
    errors.append('Point Wizard duplicate source-component guard missing')
if 'Фактически установлен' not in point_wizard or 'actualLibraryEntryId' not in point_wizard:
    errors.append('Structural vs actual library binding UI missing')
if 'LubricaComponentBinding.bindPoint' not in candidate_finalizer:
    errors.append('Candidate finalizer does not auto-bind created points')
if "componentBinding:{sourceComponentId:null" not in normalizer:
    errors.append('componentBinding is not normalized for database compatibility')
if 'openViewer' not in component_ui or 'Сохранённые пользователем' not in component_ui:
    errors.append('Component Library saved-entry view/filter missing')
if 'data-edit-component' not in component_ui:
    errors.append('Component Library edit action missing')
if 'fSourceComponent' not in html or 'fLibraryEntry' not in html:
    errors.append('Point card binding summary missing')
if 'Картер / масляная полость редуктора' in structure_context or "gearbox_oil:'Картер" in classifier:
    errors.append('Deprecated gearbox user-facing term remains in active category labels')


# Approval guard: no implicit lubricant density defaults in engineering calculators/UI
for rel in ['bearings/calculator.js','calculations/chain-calculator.js','calculations/coupling-calculator.js','calculations/grease-point-calculator.js','calculations/ball-screw-calculator.js','calculations/linear-bearing-calculator.js','calculations/chain-adapter.js','calculations/coupling-adapter.js','calculations/grease-point-adapter.js','calculations/ball-screw-adapter.js','calculations/linear-bearing-adapter.js','lubrication/task-editor.js']:
    txt=(base/rel).read_text(encoding='utf-8')
    if 'greaseDensity??0.9' in txt or 'lubricantDensity??0.9' in txt or 'greaseDensity=0.9' in txt or '??c.greaseDensity??0.9' in txt:
        errors.append(f'Implicit lubricant density default remains: {rel}')


# Stage 8.11-8.17 Engineering Core
for rel in ['calculations/oil-system-calculator.js','calculations/open-gear-calculator.js','calculations/wire-rope-calculator.js','calculations/central-lubrication-calculator.js','calculations/simple-service-adapters.js','calculations/material-integration.js','calculations/engineering-sources.js','calculations/engineering-sources-ui.js','components/matcher.js']:
    if not (base/rel).exists(): errors.append(f'Stage 8.11-8.17 module missing: {rel}')
for script in ['./calculations/oil-system-calculator.js','./calculations/open-gear-calculator.js','./calculations/wire-rope-calculator.js','./calculations/central-lubrication-calculator.js','./calculations/material-integration.js','./calculations/engineering-sources.js','./calculations/engineering-sources-ui.js','./calculations/simple-service-adapters.js','./components/matcher.js']:
    if script not in scripts: errors.append(f'Stage 8.11-8.17 script not connected: {script}')
calc_catalog=(base/'calculations/catalog.js').read_text(encoding='utf-8')
service_adapters=(base/'calculations/simple-service-adapters.js').read_text(encoding='utf-8')
for module_id in ['oil-system','open-gear','wire-rope','central-lubrication']:
    if f"id:'{module_id}'" not in service_adapters: errors.append(f'Ready adapter missing: {module_id}')
material_ui=(base/'materials/library-ui.js').read_text(encoding='utf-8')
if 'libMatDensity' not in material_ui or 'libMatDensitySource' not in material_ui: errors.append('Material density/source UI missing')
if 'fEngineeringSourcesBtn' not in html: errors.append('Engineering sources UI button missing')
matcher=(base/'components/matcher.js').read_text(encoding='utf-8')
if 'suggestions' not in matcher or 'variants' not in matcher: errors.append('Advanced component matcher incomplete')
category_schema=(base/'components/category-schemas.js').read_text(encoding='utf-8')
for bad in ["field('unitCount','Количество кареток / втулок'","field('sectionCount','Количество секций'","field('lengthM','Длина','м')"]:
    if bad in category_schema: errors.append(f'Installation-specific field still stored in component reference: {bad}')
active_calc='\n'.join((base/'calculations'/f).read_text(encoding='utf-8') for f in ['chain-calculator.js','coupling-calculator.js','grease-point-calculator.js','ball-screw-calculator.js','material-integration.js'])
import re as _re
if _re.search(r'(?:\?\?|\|\|)\s*0\.9\b',active_calc): errors.append('Implicit 0.9 density fallback reintroduced')
for bad in ['travelKm','baseTravelKm','approvedTravelKm','calculatedDistanceKm','approvedDistanceKm','Пробег, км']:
    if bad in '\n'.join((base/'calculations'/f).read_text(encoding='utf-8') for f in ['linear-bearing-calculator.js','linear-bearing-adapter.js']): errors.append(f'Linear-bearing km field reintroduced: {bad}')


# Stage 9.1 checklist execution guards
for rel in ['checklist/checklist-engine.js']:
    if not (base/rel).exists(): errors.append(f'Stage 9.1 module missing: {rel}')
if './checklist/checklist-engine.js' not in scripts: errors.append('Checklist engine not connected')
checklist=(base/'checklist/checklist-engine.js').read_text(encoding='utf-8') if (base/'checklist/checklist-engine.js').exists() else ''
routes_ui=(base/'routes/routes-ui.js').read_text(encoding='utf-8')
export_ui=(base/'export/export-ui.js').read_text(encoding='utf-8')
if 'bearing_regrease' not in checklist or 'chain_lubricant_apply' not in checklist or 'gearbox_oil_change' not in checklist:
    errors.append('Operation-specific checklist templates incomplete')
if 'checklistRuns' not in normalizer: errors.append('Checklist execution state not normalized')
for token in ['ID точки смазки','Наименование точки смазки','Код смазки','Наблюдения, коррекции']:
    if token not in routes_ui: errors.append(f'Stage 9.1 task-list field missing: {token}')
if 'buildChecklistSheet91' not in export_ui: errors.append('Stage 9.1 checklist Excel export missing')


# Stage 9.1.5 route lifecycle UX/UI guards
routes_ui=(base/'routes/routes-ui.js').read_text(encoding='utf-8')
checklist_engine=(base/'checklist/checklist-engine.js').read_text(encoding='utf-8')
app_css=(base/'assets/app.css').read_text(encoding='utf-8')
for token in ['openStartRunDialog','openCompleteRunDialog','openCancelRunDialog','openRunHistory','route-history-layout']:
    if token not in routes_ui: errors.append(f'Route lifecycle UI missing: {token}')
if 'window.confirm(' in routes_ui: errors.append('Native confirm remains in route lifecycle')
if 'routeExecutionDialog' not in html: errors.append('Dedicated route execution dialog missing')
for token in ['lifecycleState','cancelReason','executionNo']:
    if token not in checklist_engine: errors.append(f'Route lifecycle engine missing: {token}')
if '.route-execution-dialog{width:min(1180px,94vw)' not in app_css: errors.append('Route history dialog is not wide enough')
if '.route-history-browser .run-history-list{flex:1' not in app_css: errors.append('Route history list lacks local scrolling')

print('PREFLIGHT', 'PASS' if not errors else 'FAIL')
for e in errors: print('ERROR',e)
for w in warnings: print('WARN',w)
sys.exit(1 if errors else 0)
