const fs=require('fs');
const assert=require('assert');
const chain=fs.readFileSync('calculations/chain-adapter.js','utf8');
const presenter=fs.readFileSync('calculations/ui-presenter.js','utf8');
const simple=fs.readFileSync('calculations/simple-service-adapters.js','utf8');
const bearing=fs.readFileSync('lubrication/task-editor.js','utf8');
const motor=fs.readFileSync('motors/motor-ui.js','utf8');
assert(chain.includes('calc-simple-overview simple-only'));
assert(chain.includes('data-chain-primary'));
assert(chain.includes('data-accept-simple>Применить расчёт'));
assert(chain.includes('РАСЧЁТ СМАЗКИ'));
assert(chain.includes('unifyCalculatorShell'));
assert(presenter.includes('Простой режим')&&presenter.includes('Экспертный режим')&&presenter.includes('Обоснование'));
assert(simple.includes('Подача и баланс системы'));
assert(bearing.includes('Простой режим')&&bearing.includes('Экспертный режим')&&bearing.includes('Обоснование'));
assert(motor.includes('Простой режим')&&motor.includes('Экспертный режим')&&motor.includes('Обоснование'));
for(const f of ['ball-screw-adapter.js','coupling-adapter.js','gearbox-oil-adapter.js','grease-point-adapter.js','linear-bearing-adapter.js','screw-jack-adapter.js']){
 const s=fs.readFileSync('calculations/'+f,'utf8'); assert(s.includes('unifyCalculatorShell'),f+' is not unified');
}
console.log('PASS 1.0.33.26 unified calculation UX audit');
