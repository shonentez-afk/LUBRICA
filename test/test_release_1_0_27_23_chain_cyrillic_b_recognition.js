const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const window={LubricaSystem:{registerModule(){}},LubricaComponents:{all(){return[]}}};window.window=window;
const ctx={window,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'calculations/chain-calculator.js'),'utf8'),ctx);
const C=window.LubricaChainCalculator;
const a=(x,m)=>{if(!x)throw Error(m)};
for(const [raw,designation,pitch,rows] of [
 ['Цепь роликовая 16В-1 Линия №1','16B-1',25.4,1],
 ['цепь 08в-3','08B-3',12.7,3],
 ['28 В – 2','28B-2',44.45,2],
 ['16B1','16B-1',25.4,1],
 ['16 B-1','16B-1',25.4,1]
]){
 const x=C.inferStandard(raw);a(x,raw+' recognized');a(x.designation===designation,raw+' designation');a(x.pitchMm===pitch,raw+' pitch');a(x.strandCount===rows,raw+' rows');
}
console.log('RELEASE 1.0.27.23 CHAIN CYRILLIC B RECOGNITION PASS');
