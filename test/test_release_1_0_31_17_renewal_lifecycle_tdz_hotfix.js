const fs=require('fs');
const s=fs.readFileSync('lubrication/task-editor.js','utf8');
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exit(1)}}
const recalcStart=s.indexOf('const recalc=()=>{');
const readyPos=s.indexOf("const ready=dialog.querySelector('[data-readiness-summary]')", recalcStart);
const lifecyclePos=s.indexOf("const renewalLifecycle=result.fullRenewalLifecycleState", recalcStart);
ok(recalcStart>=0,'recalc must exist');
ok(lifecyclePos>recalcStart,'renewalLifecycle must be declared inside recalc');
ok(readyPos>lifecyclePos,'renewalLifecycle must be initialized before readiness summary uses it');
const readyEnd=s.indexOf("const policyBox=dialog.querySelector('[data-maintenance-policy]')", readyPos);
const readyBlock=s.slice(readyPos,readyEnd);
ok(readyBlock.includes("renewalLifecycle==='FALLBACK_AVAILABLE'"),'readiness summary still uses renewal lifecycle state');
console.log('RENEWAL LIFECYCLE TDZ HOTFIX TEST PASS');
