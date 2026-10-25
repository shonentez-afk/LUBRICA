const fs=require('fs');
const task=fs.readFileSync('/mnt/data/lubrica1279/lubrication/task-editor.js','utf8');
const html=fs.readFileSync('/mnt/data/lubrica1279/index.html','utf8');
const entity=fs.readFileSync('/mnt/data/lubrica1279/structure/entity-dialogs.js','utf8');
const checks={
  'hours option exists in task editor html':html.includes('value="hours">часы работы</option>'),
  'runtime display prefers structured runtimeHours':task.includes("strategy==='По наработке'&&schedule.runtimeHours!=null"),
  'runtime formatting strips duplicate suffix':task.includes('scheduleNumberText(raw)'),
  'runtime sync clears stale calendar fields':task.includes('task.schedule.calendarValue=null;task.schedule.calendarUnit=null;task.schedule.runtimeUnit=\'hours\''),
  'task save normalizes runtime value':task.includes("intervalValue=strategy==='По наработке'?scheduleNumberText(intervalRaw):intervalRaw"),
  'structure dialog also normalizes runtime':entity.includes("strategy==='По наработке'&&item?.schedule?.runtimeHours!=null") && entity.includes('scheduleNumberText(f.intervalValue.value)')
};
for(const [k,v] of Object.entries(checks)){if(!v){console.error('FAIL',k);process.exit(1)}console.log('PASS',k)}
console.log('RELEASE 1.0.27.9 SCHEDULE UNIT HOTFIX PASS');
