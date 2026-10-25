const fs=require('fs');
const css=fs.readFileSync('assets/app.css','utf8');
function must(s,msg){if(!css.includes(s)) throw new Error(msg)}
must('/* Release 1.0.27.18 - sticky header stacking-context hotfix.', 'release marker missing');
must('z-index:60!important;', 'thead stacking context not raised');
must('z-index:70!important;', 'sticky header cells not raised');
must('.lubrication-map-table tbody td:nth-child(3){z-index:4}', 'body sticky z-index baseline missing');
console.log('PASS release 1.0.27.18 sticky header stacking context');
