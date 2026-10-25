"use strict";
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const js=fs.readFileSync(path.join(root,"lubrication/task-editor.js"),"utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(html.includes('id="pointWorkflowSummary"'),"workflow status summary must remain");
ok(!html.includes('id="detailBanner"'),"duplicated task status banner must be removed from task tab");
ok(!js.includes("$('#detailBanner')"),"task editor must not render duplicated detail banner");
ok((html.match(/data-workflow-state/g)||[]).length===1,"workflow state should have one authoritative renderer target");
console.log("PASS release 1.0.33.9 task status dedup UX");
