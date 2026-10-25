const fs=require('fs');
const ui=fs.readFileSync('motors/motor-ui.js','utf8');
const calc=fs.readFileSync('motors/motor-calculator.js','utf8');
const css=fs.readFileSync('assets/app.css','utf8');
function ok(v,msg){if(!v)throw new Error(msg)}
ok(ui.includes('data-auto-oem-dose'),'catalog OEM dose card missing');
ok(ui.includes('data-auto-oem-interval'),'catalog OEM interval card missing');
ok(ui.includes('data-auto-oem-source'),'catalog OEM source card missing');
ok(ui.includes('Автоматически из OEM-каталога · не шильдик'),'catalogue vs plate semantics missing');
ok(calc.includes('provenance:{catalogBaseline:'),'CalculationPackage catalog provenance missing');
ok(calc.includes('machineSpecificOverride:'),'CalculationPackage machine override provenance missing');
ok(ui.includes("ids=sourceButtons(r)"),'current calculation source filtering missing');
ok(css.includes('LUBRICA 1.0.33.7 — motor OEM catalogue provenance cards'),'responsive provenance CSS missing');
console.log('Motor OEM auto-fill provenance 1.0.33.7: PASS');
