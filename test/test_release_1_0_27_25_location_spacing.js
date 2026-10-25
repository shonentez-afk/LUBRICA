const fs=require('fs');
const css=fs.readFileSync('assets/app.css','utf8');
function must(s,msg){if(!css.includes(s)) throw new Error(msg)}
must('Release 1.0.27.25 - lubrication map point/location spacing cleanup.', 'release marker missing');
must('width:210px!important;', 'point column width not increased');
must('width:245px!important;', 'location column width not set');
must('padding-left:16px!important;', 'location left spacing missing');
must('box-shadow:none!important;', 'stripe/shadow cleanup missing');
must('.lubrication-map-table tbody td:nth-child(3){\n  position:static!important;', 'location column lost non-sticky rule');
console.log('PASS release 1.0.27.25 location spacing');
