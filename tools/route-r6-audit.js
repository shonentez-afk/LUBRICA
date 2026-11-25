#!/usr/bin/env node
'use strict';
// Local, read-only production-copy audit. Never writes, uploads, or applies.
const fs=require('fs'),vm=require('vm'),path=require('path');
if(process.argv.length!==3){console.error('Usage: node tools/route-r6-audit.js /path/to/backup.json');process.exit(2)}
const root=path.resolve(__dirname,'..');
global.window=global;global.state={points:[]};global.SCOPE_LABELS={};global.LubricaSystem={registerModule(){},notify(){}};
for(const p of ['core/ids.js','core/database-schema.js','core/database-normalizer.js','core/database-migrations.js','core/database.js','core/migration.js','core/database-safety.js','structure/context.js','qa/task-readiness.js','qa/qa-engine.js','routes/route-auto-grouping.js','routes/route-due.js','routes/route-workload.js','routes/route-automation.js','routes/route-engine.js','checklist/checklist-engine.js','routes/route-preparation.js','routes/route-planning.js'])vm.runInThisContext(fs.readFileSync(path.join(root,p),'utf8'),{filename:p});
try{
 const d=LubricaCore.DatabaseSafety.parseAndPrepare(fs.readFileSync(process.argv[2],'utf8'),'Backup').database;
 const R=LubricaRouteAutomation,info=R.eligible(d),result=R.preview({recoverHistory:true,activateReady:false,forecastWeeks:52},d);
 const issues={};for(const i of info.issues)issues[i.code]=(issues[i.code]||0)+1;
 const active=d.routes.filter(r=>r.status==='active'),shared=LubricaRouteEngine.validationContext(d),invalid=active.filter(r=>!LubricaRouteEngine.validateRoute(r.id,d,shared).valid).length;
 const seen=new Set(),dups=new Set();for(const r of active)for(const id of r.taskIds||[]){if(seen.has(id))dups.add(id);seen.add(id)}
 console.log(JSON.stringify({readOnly:true,physicalPoints:d.lubricationPoints.length,tasks:d.tasks.length,eligible:info.valid.size,excludedByReason:issues,activeRoutes:active.length,invalidActiveRoutes:invalid,duplicateActiveTaskIds:dups.size,proposals:result.report?.summary||null,previewOK:result.ok,forecastWeeks:result.forecast?.weeks?.length||0,forecastWithoutBasis:result.forecast?.unknown?.length||0},null,2));
 if(!result.ok)process.exitCode=1;
}catch(e){console.error('Audit failed: '+String(e.message||e));process.exitCode=1}
