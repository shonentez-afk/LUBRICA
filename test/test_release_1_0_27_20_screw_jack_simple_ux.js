const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={window:{},console};ctx.window.window=ctx.window;ctx.window.LubricaSystem={registerModule(){}};vm.createContext(ctx);
function load(rel){vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),ctx,{filename:rel});}
load('calculations/screw-jack-calculator.js');
let c=ctx.window.LubricaScrewJackCalculator.calculate({environment:'normal',usageMode:'normal'});
assert.equal(c.interval.targetCycles,300);assert.equal(c.interval.hours,null);assert.equal(c.warnings.length,0);
c=ctx.window.LubricaScrewJackCalculator.calculate({environment:'dusty',usageMode:'intensive',cyclesPerHour:10,operatingHoursPerDay:8});
assert.equal(c.interval.targetCycles,150);assert.equal(c.interval.hours,15);assert.equal(c.interval.days,1.9);
c=ctx.window.LubricaScrewJackCalculator.calculate({environment:'severe',usageMode:'normal'});assert(c.warnings.length===1);
const adapter=fs.readFileSync(path.join(root,'calculations/screw-jack-adapter.js'),'utf8');
assert(adapter.includes('Условия среды'));assert(adapter.includes('Интенсивность работы'));assert(adapter.includes('Принять рекомендацию'));assert(!adapter.includes('ПВ / duty cycle'));assert(!adapter.includes('Источник утверждения'));
const gb=fs.readFileSync(path.join(root,'calculations/gearbox-oil-adapter.js'),'utf8');assert(gb.includes('franciaJackGearboxSimple'));assert(gb.includes('Плановая замена по моточасам автоматически не назначается'));
console.log('PASS 1.0.27.20 screw jack simple UX');
