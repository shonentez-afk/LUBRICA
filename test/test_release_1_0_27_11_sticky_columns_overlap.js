const fs=require('fs');
const css=fs.readFileSync('assets/app.css','utf8');
function must(s,msg){if(!css.includes(s))throw new Error(msg)}
must('.lubrication-map-table th:nth-child(3)', 'third map column is not sticky');
must('left:214px;', 'third sticky column offset is missing');
must('left:34px;', 'second sticky column offset is missing');
must('background:#f7f9fa;', 'opaque sticky body background is missing');
must('white-space:normal;', 'sticky text wrapping protection is missing');
console.log('PASS release 1.0.27.11 sticky columns overlap');
