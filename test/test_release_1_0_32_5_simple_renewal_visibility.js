const fs=require('fs');
const s=fs.readFileSync(__dirname+'/../lubrication/task-editor.js','utf8');
function a(x,m){if(!x)throw new Error(m)}
const primary=s.indexOf('data-primary-result>');
const renewal=s.indexOf('<div class="simple-renewal-line" data-simple-renewal-line>');
const context=s.indexOf('calc-simple-context');
a(primary>=0&&renewal>primary&&renewal<context,'full renewal summary must be visible in primary simple result block');
a((s.match(/<div class="simple-renewal-line" data-simple-renewal-line>/g)||[]).length===1,'exactly one simple renewal summary markup expected');
a(s.includes("else if(rd!=null&&ri!=null)sp.textContent=`${rd} г · каждые ${ri} ч`"),'calculated renewal dose/interval presenter missing');
a(s.includes("result?.renewalInterval?.fallbackAvailable"),'fallback renewal state presenter missing');
a(s.includes("if(!fullAllowed)sp.textContent='планово не предусмотрено'"),'not-applicable renewal state presenter missing');
a(s.includes("conditionBased)sp.textContent='по состоянию / при ТО'"),'condition-based renewal state presenter missing');
console.log('1.0.32.5 simple renewal visibility regression: OK');
