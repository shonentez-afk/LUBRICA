const fs=require('fs');
const s=fs.readFileSync('lubrication/task-editor.js','utf8');
function ok(c,m){if(!c){console.error('FAIL:',m);process.exit(1)}}
ok(s.includes('data-renewal-status-panel'),'renewal status panel missing');
ok(s.includes('data-renewal-technical'),'renewal technical section missing');
ok(s.includes("policyId==='zlg_relube_only'"),'ZLG contextual status missing');
ok(s.includes("policyId==='slewing_ring_relube_procedure'"),'VLU contextual status missing');
ok(s.includes("policyId==='housed_relube_only'"),'housed-unit contextual status missing');
ok(s.includes("renewalLifecycle==='CONDITION_BASED'"),'condition-based renewal status missing');
ok(s.includes("renewalLifecycle==='PARTIAL_OEM'"),'partial OEM renewal state missing');
ok(s.includes("renewalLifecycle==='FALLBACK_AVAILABLE'"),'fallback renewal state missing');
ok(s.includes("['CALCULATED','FALLBACK_AVAILABLE','PARTIAL_OEM','REVIEW_REQUIRED'].includes(renewalLifecycle)"),'technical-section lifecycle gating missing');
ok(s.includes('Масса подшипника, плотность смазки и геометрический объём не требуются для штатного ZLG-сценария'),'ZLG must explicitly suppress generic full-fill inputs');
console.log('CONTEXT-AWARE RENEWAL UI TEST PASS');
