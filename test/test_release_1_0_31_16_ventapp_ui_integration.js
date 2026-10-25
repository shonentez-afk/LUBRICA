const fs=require('fs');const t=fs.readFileSync('lubrication/task-editor.js','utf8');const a=(x,m)=>{if(!x)throw new Error(m)};
['ventappMachineDoseG','ventappMachineIntervalHours','ventappGrease','ventappLubricationSource','Приоритет Ventapp → Tröster','Fallback Tröster OEM','data-header-fan-maker'].forEach(x=>a(t.includes(x),'Missing UI integration: '+x));
console.log('PASS 1.0.31.16 Ventapp UI integration');
