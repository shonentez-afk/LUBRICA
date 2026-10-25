const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const presenter=fs.readFileSync(path.join(root,'calculations/ui-presenter.js'),'utf8');
assert(presenter.includes('function unifyCalculatorShell'));
assert(presenter.includes('Простой режим')&&presenter.includes('Экспертный режим')&&presenter.includes('Обоснование')); // 1.0.32.x: unified evidence label
for(const f of ['chain-adapter.js','screw-jack-adapter.js','gearbox-oil-adapter.js','coupling-adapter.js','grease-point-adapter.js','ball-screw-adapter.js','linear-bearing-adapter.js']){
  const s=fs.readFileSync(path.join(root,'calculations',f),'utf8');
  assert(s.includes('unifyCalculatorShell'),`${f}: unified shell missing`);
  assert(s.includes('bearing-calc-modal-form'),`${f}: common form class missing`);
}
const chain=fs.readFileSync(path.join(root,'calculations/chain-adapter.js'),'utf8');
assert(chain.includes("IWIS-CHAIN-LUBRICATION")&&chain.includes("TSUBAKI-CHAIN-LUBRICATION")&&chain.includes("CHAIN-ISO606-RENOLD"));
const jack=fs.readFileSync(path.join(root,'calculations/screw-jack-adapter.js'),'utf8');
assert(jack.includes("FRANCIA-SCREW-JACK"));
const css=fs.readFileSync(path.join(root,'assets/app.css'),'utf8');
assert(css.includes('1.0.31.8 — unified calculator shell'));
console.log('PASS 1.0.31.8 unified calculator UI/UX');
