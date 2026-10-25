const fs=require('fs'),vm=require('vm'),path=require('path');
const base=path.resolve(__dirname,'..');
const handlers={},detailCalls=[];
class El{
 constructor(id=''){this.id=id;this.innerHTML='';this.dataset={};this.className='';}
 querySelectorAll(sel){if(sel==='.structure-row')return [Object.assign(new El(),{dataset:{type:'equipment',id:'EQ-1'}})];if(sel==='.structure-toggle')return[];return[]}
 querySelector(){return null}
}
const persistentRow=Object.assign(new El(),{dataset:{type:'equipment',id:'EQ-1'}});
const root=new El('structureTree'),summary=new El('structureSummary'),detail=new El('structureDetail'),expand=new El('structureExpandBtn');
root.querySelectorAll=sel=>sel==='.structure-row'?[persistentRow]:sel==='.structure-toggle'?[]:[];
global.window=global;
global.document={getElementById:id=>({structureTree:root,structureSummary:summary,structureDetail:detail,structureExpandBtn:expand}[id]||null)};
global.LubricaStructureContext={
 selected:{type:'project',id:null},expandedKeys:new Set(),
 esc:v=>String(v??''),icons:{equipment:'E'},pointContextLabel:()=>'',byId:(a,id)=>(a||[]).find(x=>x.id===id)||null,
 labels:{equipment:'Оборудование'},defaultChildType:()=> 'node',
 entity:d=>d.equipment.find(x=>x.id===global.LubricaStructureContext.selected.id)||d.project,
 equipmentTypeLabel:x=>x||''
};
global.LubricaStructureDetail={render:d=>detailCalls.push(global.LubricaStructureContext.selected.id)};
vm.runInThisContext(fs.readFileSync(path.join(base,'structure/tree-ui.js'),'utf8'),{filename:'structure/tree-ui.js'});
const d={project:{name:'P'},plants:[],lines:[],areas:[],equipment:[{id:'EQ-1',name:'E1'}],components:[],nodes:[],lubricationPoints:[],tasks:[]};
global.LubricaStructureTree.renderTree(d);
const row=root.querySelectorAll('.structure-row')[0];
if(typeof row.onclick!=='function')throw new Error('tree row click handler missing');
row.onclick();
if(global.LubricaStructureContext.selected.id!=='EQ-1')throw new Error('selection did not change');
if(detailCalls.length!==1||detailCalls[0]!=='EQ-1')throw new Error('right detail panel was not rerendered after tree selection');
console.log('STRUCTURE RIGHT PANEL INTERACTION PASS');
