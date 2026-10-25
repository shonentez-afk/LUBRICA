const fs=require('fs'),vm=require('vm');
const ctx={console,window:{LubricaBearingCatalogData:[],LubricaSystem:{registerModule(){}}}};ctx.window.window=ctx.window;vm.createContext(ctx);
for(const f of ['bearings/multi-oem-data.js','bearings/calculator.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const C=ctx.window.LubricaBearingCalculator;
const assert=(x,m)=>{if(!x)throw new Error(m)};
const base={designation:'6212',d:60,D:110,B:22,bearingType:'deep_groove_ball',bearingMassKg:0.78,bearingMassKind:'bearing',massManufacturer:'SKF',massSource:'SKF test reference',fillRatio:0.25,greaseDensity:0.9,rpm:1800,temperatureC:70,shaftOrientation:'horizontal',loadClass:'medium',contamination:'normal',vibration:'normal',conditionFactor:1,intervalSource:'auto_oem'};
const expected={SKF:['B','X'],NSK:['A','A'],FAG:['X','X'],'NTN-SNR':['B','X'],TIMKEN:['X','X']};
for(const m of Object.keys(expected)){
 const r=C.calculate({...base,manufacturer:m,method:'auto_oem'});
 assert(r.relube.confidenceCode===expected[m][0],`${m} dose confidence ${r.relube.confidenceCode}`);
 assert(r.interval.confidenceCode===expected[m][1],`${m} interval confidence ${r.interval.confidenceCode}`);
 if(m!=='SKF') assert((r.initialFill.assumptions||[]).some(x=>/межбренд/i.test(x)),`${m} must expose cross-brand mass`);
}
let r=C.calculate({...base,manufacturer:'FAG',method:'schaeffler_monthly',baseHours:720,intervalSource:'fag'});
assert(r.relube.confidenceCode==='B'&&r.relube.value===7.26,'FAG explicit monthly');
r=C.calculate({...base,manufacturer:'NSK',method:'skf_side'});
assert(r.relube.confidenceCode==='D'&&(r.relube.assumptions||[]).some(x=>/не является OEM/i.test(x)),'NSK + SKF cross-brand must be D');
const ui=fs.readFileSync('lubrication/task-editor.js','utf8');
assert(ui.includes('Правило утверждения.'),'approval rule UI');
assert(ui.includes("startsWith('multi-oem-1.0.26.')"),'1.0.26.x full renewal compatibility gate');
assert(ui.includes('Укажите источник ${label}.'),'approval source validation');
assert(ui.includes('data-dose-confidence')&&ui.includes('data-fill-confidence')&&ui.includes('data-interval-confidence'),'per-block confidence UI');
console.log('MULTI OEM BEARING 1.0.26.2 UI/APPROVAL PASS');
