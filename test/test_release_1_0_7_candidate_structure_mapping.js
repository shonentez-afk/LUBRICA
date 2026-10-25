const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const nextFrom=(arr,prefix,width=6)=>{let max=0;for(const x of arr||[]){const m=String(x.id||'').match(new RegExp('^'+prefix+'-(\\d+)$'));if(m)max=Math.max(max,Number(m[1]));}return `${prefix}-${String(max+1).padStart(width,'0')}`};
const context={console,window:{LubricaCore:{State:{getDatabase(){return null}},Database:{normalize:x=>x},IDs:{nextFrom}}}};
context.window.window=context.window;
vm.createContext(context);
for(const rel of ['structure/context.js','import/candidate-finalizer.js'])vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
const F=context.window.LubricaCandidateFinalizer;
const assert=(x,m)=>{if(!x)throw new Error(m)};
const db={nodes:[],lubricationPoints:[],tasks:[]};
const equipment={id:'EQ-000001',name:'Конвейер отсева каменного материала'};
const record={id:'COMP-DRUM-1',name:'Барабан приводной',candidateState:'candidate'};
const template={title:'Барабан',items:[]};
const chosen=[
 {key:'bearing_left',name:'Подшипниковая опора левая',category:'bearing',position:'Левая',activities:[{type:'regrease',label:'Досмазывание'},{type:'grease_full_replacement',label:'Полная замена смазки'}]},
 {key:'bearing_right',name:'Подшипниковая опора правая',category:'bearing',position:'Правая',activities:[{type:'regrease',label:'Досмазывание'},{type:'grease_full_replacement',label:'Полная замена смазки'}]}
];
F.applyConfirmedSpecs(db,'component',record,equipment,template,chosen);
assert(db.nodes.length===1,'one imported component must create one structure node');
assert(db.nodes[0].name==='Барабан приводной','source component name must be preserved as node name');
assert(db.lubricationPoints.length===2,'two physical points must be created');
assert(db.lubricationPoints.every(p=>p.nodeId===db.nodes[0].id),'both points must belong to same component node');
assert(db.lubricationPoints.map(p=>p.name).join('|')==='Подшипниковая опора левая|Подшипниковая опора правая','entered physical point names must be preserved');
assert(db.lubricationPoints.map(p=>p.positionLabel).join('|')==='Левая|Правая','positions must be preserved');
assert(db.tasks.length===4,'two selected activities for each point must create four tasks');
console.log('RELEASE 1.0.7 CANDIDATE STRUCTURE MAPPING PASS');
