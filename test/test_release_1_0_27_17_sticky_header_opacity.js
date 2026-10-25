const fs=require('fs');
const css=fs.readFileSync('assets/app.css','utf8');
function must(s,msg){if(!css.includes(s)){throw new Error(msg)}}
must('/* Release 1.0.27.17 - sticky header opacity hotfix.', 'release marker missing');
must('.lubrication-map-table thead{', 'thead rule missing');
must('isolation:isolate;', 'header isolation missing');
must('z-index:40!important;', 'sticky header z-index missing');
must('background:#f3f6f8!important;', 'opaque header background missing');
must('.lubrication-map-table thead th:nth-child(-n+3)::before', 'header backing layer missing');
console.log('PASS release 1.0.27.17 sticky header opacity');
