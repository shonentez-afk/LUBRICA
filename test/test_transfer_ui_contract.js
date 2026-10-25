const fs=require('fs');const read=p=>fs.readFileSync(p,'utf8');const a=(x,m)=>{if(!x)throw Error(m)};
const te=read('lubrication/task-editor.js'),b=read('components/binding.js'),pw=read('structure/point-wizard.js');
a(te.includes('ensurePointTechnical?.(lp)'),'point card must rehydrate linked technical data');
a(te.includes("resolveBearingFields(false)")&&te.includes("ensurePointTechnical?.(point)"),'calculator context must synchronize linked data');
a(te.includes("linkedBearing?.designation"),'bearing designation must appear from catalog binding');
a(b.includes('d:p.dimensions?.d??t.d')&&b.includes('D:p.dimensions?.D??t.D')&&b.includes('B:p.dimensions?.B??t.B'),'bearing dimensions transfer');
a(pw.includes('form.elements.libraryEntryId.onchange'),'manual catalog selection handler');
const contracts={
 'calculations/chain-adapter.js':['ch.pitchMm','ch.strandCount'],
 'calculations/linear-bearing-adapter.js':['lb.manufacturer','lb.model'],
 'calculations/gearbox-oil-adapter.js':['g.manufacturer','g.model','c.oemFillLiters'],
 'calculations/coupling-adapter.js':['cp.manufacturer','cp.model'],
 'calculations/ball-screw-adapter.js':['b.manufacturer','b.model','b.screwDiameterMm','b.leadMm'],
 'calculations/simple-service-adapters.js':['point.componentBinding']
};
for(const [f,keys] of Object.entries(contracts)){const s=read(f);for(const k of keys)a(s.includes(k),`${f} missing ${k}`)}
console.log('TRANSFER UI/CALCULATOR CONTRACT TEST PASS');
