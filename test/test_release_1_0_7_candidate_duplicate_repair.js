const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const context={console,window:{}};context.window.window=context.window;vm.createContext(context);
for(const rel of ['core/database-schema.js','core/database-normalizer.js'])vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
const N=context.window.LubricaCore.DatabaseNormalizer;
const db={
 schemaVersion:'2.0',project:{name:'Demo'},plants:[],lines:[],areas:[],equipment:[{id:'EQ1',name:'Конвейер'}],components:[],
 nodes:[
  {id:'NODE1',equipmentId:'EQ1',name:'Барабан приводной',origin:'candidate',candidateOriginKey:'component:COMP1:bearing_left'},
  {id:'NODE2',equipmentId:'EQ1',name:'Барабан приводной',origin:'candidate',candidateOriginKey:'component:COMP1:bearing_right'}
 ],
 lubricationPoints:[
  {id:'LP1',equipmentId:'EQ1',nodeId:'NODE1',name:'Подшипниковая опора левая',category:'bearing'},
  {id:'LP2',equipmentId:'EQ1',nodeId:'NODE2',name:'Подшипниковая опора правая',category:'bearing'}
 ],tasks:[],materials:[],routes:[],checklistRuns:[],tools:[],imports:[],bearingOverrides:[],componentLibraryEntries:[]
};
const fixed=N.normalize(db);
if(fixed.nodes.length!==1)throw new Error('duplicate candidate nodes were not merged');
if(!fixed.lubricationPoints.every(p=>p.nodeId===fixed.nodes[0].id))throw new Error('points were not rebound to merged node');
if(fixed.nodes[0].candidateOriginKey!=='component:COMP1:node')throw new Error('shared candidate node key not normalized');
console.log('RELEASE 1.0.7 CANDIDATE DUPLICATE REPAIR PASS');
