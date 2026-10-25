const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const s=fs.readFileSync(path.join(root,'calculations/gearbox-oil-adapter.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'core/database-schema.js'),'utf8');
function ok(v,m){if(!v)throw new Error(m)}
ok(schema.includes("appVersion:'1.0.33.39'"),'app version');
ok(s.includes("ready.textContent=okFill&&okInterval?'Расчёт готов':okFill?'Нужно уточнить периодичность':'Требуются данные'"),'partial readiness');
ok(s.includes("if(primary)primary.textContent=okFill?`${r.fill.effectiveFillLiters} л · ${intervalText}`:'Рабочий объём не определён'"),'simple/expert same fill');
ok(s.includes('Источники и происхождение результата находятся во вкладке «Обоснование».'),'justification copy');
ok(!s.includes('data-gearbox-sources data-footer-sources>Источники'),'no footer sources');
ok(!s.includes('data-gearbox-sources>Почему такой результат?'),'no duplicate result sources');
console.log('PASS 1.0.33.31 gearbox result/source consistency');
