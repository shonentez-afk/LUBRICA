(function(global){
  'use strict';
  const D=global.LubricaDiagnostics=global.LubricaDiagnostics||{};
  D.runSmokeTest=function(){
    const failures=[],checks=[];
    const check=(name,ok,detail='')=>{checks.push({name,ok:!!ok,detail});if(!ok)failures.push(name+(detail?`: ${detail}`:''));};
    const db=global.LubricaCore?.State?.getDatabase?.();
    check('Core database',!!global.LubricaCore?.Database);
    check('Core state',!!global.LubricaCore?.State);
    check('Core IDs',!!global.LubricaCore?.IDs);
    check('Structure module',!!global.LubricaStructure);
    check('Bearing Library',!!global.LubricaBearings);
    check('Bearing Calculator',!!global.LubricaBearingCalculator);
    check('Calculation Registry',!!global.LubricaCalculationRegistry);
    check('Calculation Framework',!!global.LubricaCalculations);
    check('Component Binding',!!global.LubricaComponentBinding);
    check('Linear Bearing Calculator',!!global.LubricaLinearBearingCalculator);
    check('Gearbox Oil Calculator',!!global.LubricaGearboxOilCalculator);
    check('Chain Calculator',!!global.LubricaChainCalculator);
    check('Coupling Calculator',!!global.LubricaCouplingCalculator);
    check('Grease Point Calculator',!!global.LubricaGreasePointCalculator);
    check('Ball Screw Calculator',!!global.LubricaBallScrewCalculator);
    check('Checklist Execution',!!global.LubricaChecklistEngine);
    check('Bearing UI',typeof global.renderBearings==='function');
    check('Application API',!!global.LubricaApp&&global.LubricaApp.booted===true,global.LubricaApp?'boot flag false':'API missing');
    ['importBtn','exportBtn','newDatabaseBtn','openJsonBtn','saveJsonBtn','openStructureBtn','columnsBtn','bulkBtn','addPointBtn','resetFilters','selectAll','closeDetail','savePointBtn','duplicateBtn','calcBtn','lineScopeSelect','areaScopeSelect','typeFilter','statusFilter','tableSearch'].forEach(id=>check(`#${id}`,!!document.getElementById(id),'element missing'));
    ['importBtn','exportBtn','newDatabaseBtn','openJsonBtn','saveJsonBtn','openStructureBtn','columnsBtn','bulkBtn','addPointBtn','resetFilters','closeDetail','savePointBtn','duplicateBtn','calcBtn'].forEach(id=>{const el=document.getElementById(id);check(`${id} handler`,!!el&&global.LubricaApp?.hasHandler?.(id,'click')===true,'registered click handler missing')});
    check('Points table container',!!document.getElementById('pointsBody'),'#pointsBody missing');
    const activeView=document.querySelector('.main-view.active');
    check('Active view',!!activeView,activeView?.id||'none');
    if(activeView?.id==='workspace'){
      check('Workspace controls',!!document.getElementById('lineScopeSelect')&&!!document.getElementById('areaScopeSelect'),'workspace controls missing');
    }
    if(db){
      const ids=a=>new Set((a||[]).map(x=>String(x.id))),eq=ids(db.equipment),nodes=ids(db.nodes),pts=ids(db.lubricationPoints),mats=ids(db.materials),tools=ids(db.tools);
      check('Tasks -> points',(db.tasks||[]).every(t=>!t.lubricationPointId||pts.has(String(t.lubricationPointId))));
      check('Points -> equipment',(db.lubricationPoints||[]).every(p=>!p.equipmentId||eq.has(String(p.equipmentId))));
      check('Points -> nodes',(db.lubricationPoints||[]).every(p=>!p.nodeId||nodes.has(String(p.nodeId))));
      check('Task material refs',(db.tasks||[]).every(t=>!t.materialId||mats.has(String(t.materialId))));
      check('Task tool refs',(db.tasks||[]).every(t=>!t.toolId||tools.has(String(t.toolId))));
    }
    D.lastResult={ok:failures.length===0,failures,checks,at:new Date().toISOString()};
    if(failures.length){
      console.error('[LUBRICA diagnostics] Smoke test failed',D.lastResult);
      global.LubricaSystem?.registerModule?.('Diagnostics','error',`Smoke test: ${failures.length} ошибок`);
      global.LubricaSystem?.notify?.(`Smoke-test: ${failures.length} ошибок`,'error',{module:'diagnostics',detail:D.lastResult});
    }else{
      console.info('[LUBRICA diagnostics] Smoke test OK',D.lastResult);
      global.LubricaSystem?.registerModule?.('Diagnostics','ok','Smoke test passed');
    }
    global.LubricaSystem?.healthCheck?.({notify:false});
    return D.lastResult;
  };
  window.addEventListener('load',()=>setTimeout(()=>D.runSmokeTest(),0),{once:true});
})(window);
