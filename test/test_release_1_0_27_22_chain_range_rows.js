const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}}};window.window=window;
const ctx={window,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'calculations/chain-calculator.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'components/starter-data.js'),'utf8'),ctx);
const C=window.LubricaChainCalculator,D=window.LubricaComponentStarterData;
const a=(x,m)=>{if(!x)throw Error(m)};
for(const [des,pitch,rows] of [['08B-1',12.7,1],['08B-3',12.7,3],['28B-1',44.45,1],['28B-3',44.45,3]]){
 const x=C.inferStandard('Цепь роликовая '+des);a(x&&x.pitchMm===pitch&&x.strandCount===rows,des+' infer');
 const rec=D.find(r=>r.category==='chain'&&r.designation===des);a(rec,des+' library');a(rec.technicalData.pitchMm===pitch&&rec.technicalData.strandCount===rows,des+' dimensions');
}
for(const size of ['08B','10B','12B','16B','20B','24B','28B']) for(const rows of [1,2,3]) a(D.some(r=>r.designation===`${size}-${rows}`),`${size}-${rows} coverage`);
const q1=C.engineeringRatePerM({pitchMm:12.7,strandCount:1});
const q3=C.engineeringRatePerM({pitchMm:12.7,strandCount:3});a(q3===Number((q1*3).toFixed(2)),'triplex scales per strand');
console.log('RELEASE 1.0.27.22 CHAIN RANGE/ROWS PASS');
