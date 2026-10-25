const fs=require('fs'),vm=require('vm');global.window=global;
global.SCOPE_LABELS={a:'Area A'};global.taskKey=p=>p.taskId||p.id;
global.state={points:[
 {id:'P1',taskId:'T1',line:'L1',scope:'a',interval:'4 недели'},
 {id:'P2',taskId:'T2',line:'L1',scope:'a',interval:'4 недели'},
 {id:'P3',taskId:'T3',line:'L1',scope:'a',interval:'8 недель'}
]};
global.LubricaCore={State:{getDatabase:()=>({tasks:[{id:'T1',approvalStatus:'approved'},{id:'T2',approvalStatus:'review'},{id:'T3',approvalStatus:'approved'}]})}};
vm.runInThisContext(fs.readFileSync('routes/route-engine.js','utf8'),{filename:'route-engine.js'});
const r=LubricaRouteEngine.routeEntries();
if(r.length!==2)throw new Error('expected 2 routes');
if(r.some(x=>x.points.some(p=>p.taskId==='T2')))throw new Error('review task leaked into routes');
console.log('ROUTE ENGINE TEST PASS');
