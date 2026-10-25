const fs=require('fs');
const s=fs.readFileSync(__dirname+'/../calculations/gearbox-oil-adapter.js','utf8');
function ok(v,msg){if(!v)throw new Error(msg)}
ok(s.includes("ready.textContent=okFill&&okInterval?'Расчёт готов':okFill?'Нужно уточнить периодичность':'Требуются данные'"),'simple readiness must preserve known fill');
ok(s.includes("if(primary)primary.textContent=okFill?`${r.fill.effectiveFillLiters} л · ${intervalText}`:'Рабочий объём не определён'"),'simple recommendation must use same fill result as expert');
ok(s.includes('Источники и происхождение результата находятся во вкладке «Обоснование».'),'result must direct evidence to justification tab');
ok(!s.includes('data-gearbox-sources>Почему такой результат?'),'duplicate result-source button must be removed');
ok(!s.includes('data-gearbox-sources data-footer-sources>Источники'),'footer source button must be removed');
ok(s.includes('OEM-источники и происхождение параметров доступны во вкладке «Обоснование».'),'expert explanation must refer to justification tab');
console.log('PASS gearbox simple/expert/source consistency 1.0.33.31');
