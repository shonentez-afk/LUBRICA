const fs=require('fs');
const s=fs.readFileSync('lubrication/task-editor.js','utf8');
function ok(v,m){if(!v){console.error('FAIL:',m);process.exit(1)}}
ok(s.includes('data-engineering-fallback'), 'engineering fallback has dedicated collapsible details');
ok(s.includes('Не используется текущей OEM-методикой без явного выбора.'), 'fallback status is explicit');
ok(s.includes('data-renewal-manual-approval'), 'manual renewal approval is separated from calculated result');
ok(s.includes('Сохранённое утверждение отличается от текущего расчёта'), 'stale approved value warning exists');
ok(s.includes("approvedFullRenewalIntervalHours)form.elements.approvedFullRenewalIntervalHours.value=''"), 'old renewal interval approval is cleared on fallback mode change');
ok(s.includes("fullRenewalIntervalSource)form.elements.fullRenewalIntervalSource.value=''"), 'old renewal interval source is cleared on fallback mode change');
ok(s.includes("const CURRENT_CALC_VERSION='multi-oem-1.0.30.6-bearing-ui-context-regression'"), 'UI hotfix does not bump calculation contract');
console.log('RENEWAL APPROVAL/FALLBACK UX TEST PASS');
