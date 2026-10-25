const fs=require('fs'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'calculations/gearbox-oil-adapter.js');
const src=fs.readFileSync(file,'utf8');
const start=src.indexOf('const applyAutoInterval=()=>');
const end=src.indexOf('\n const input=',start);
assert(start>=0 && end>start,'applyAutoInterval source found');
const decl=src.slice(start,end).trim();
assert(decl.endsWith(';'),'applyAutoInterval declaration complete');
const expr=decl.slice('const applyAutoInterval='.length,-1);

function makeForm(temp='le65'){
  const field=(value='')=>({value,dataset:{}});
  return {elements:{
    intervalMode:field('auto'),temperatureClass:field(temp),conditionBased:{checked:false},
    changeHours:field(''),changeMonths:field(''),intervalSource:field(''),firstChangeHours:field('')
  }};
}
function build({form,isBonfiglioli=false,isRossi=false,base='unknown',chem='unknown'}={}){
  const policy={textContent:''};
  const dlg={querySelector(sel){return sel==='[data-simple-interval-policy]'?policy:null;}};
  const maintenancePolicy={
    rossiSyntheticHighHours:15000,rossiSyntheticVeryHighHours:10000,rossiSyntheticExtremeHours:5000,rossiSyntheticNormalHours:25000,
    rossiMineralHighHours:5000,rossiMineralVeryHighHours:2500,rossiMineralNormalHours:10000,
    bonfSyntheticHighHours:15000,bonfSyntheticVeryHighHours:12500,bonfSyntheticNormalHours:25000,
    bonfMineralHighHours:5000,bonfMineralVeryHighHours:2500,bonfMineralNormalHours:10000,
    bonfFirstChangeHours:300,syntheticMonths:null,mineralMonths:null
  };
  const names=['form','resolveOilBase','dlg','isRossi','maintenancePolicy','isBonfiglioli','resolveOilChemistry','bonfSmallA','bonfDefaultPag','materialName','bonfASize','isSew','linked','fmt','isPP53736'];
  const vals=[form,()=>base,dlg,isRossi,maintenancePolicy,isBonfiglioli,()=>chem,false,false,'','',false,null,v=>String(v),false];
  const fn=Function(...names,`return (${expr});`)(...vals);
  return {fn,policy};
}

// Regression for the reported crash: tc used after the Bonfiglioli block must exist in function scope.
{
  const form=makeForm('95_110');
  const {fn,policy}=build({form,isBonfiglioli:true,base:'synthetic',chem:'synthetic'});
  assert.doesNotThrow(()=>fn(),'Bonfiglioli 95-110 must not throw ReferenceError: tc is not defined');
  assert(form.elements.intervalSource.value.includes('температура выше диапазона OEM-таблицы'));
  assert(policy.textContent.includes('95–110'));
}

// Generic gearbox auto mode also reached the old out-of-scope tc expression.
{
  const form=makeForm('le65');
  const {fn}=build({form,isBonfiglioli:false,isRossi:false,base:'unknown'});
  assert.doesNotThrow(()=>fn(),'generic gearbox auto interval must not reference an undefined tc');
}

assert(src.includes("base=resolveOilBase(),tc=String(form.elements.temperatureClass?.value||'le65')"),'temperature class is declared once in applyAutoInterval scope');
console.log('PASS 1.0.33.55 gearbox-oil tc scope hotfix');
