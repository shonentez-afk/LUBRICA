const fs=require('fs');
const css=fs.readFileSync('assets/app.css','utf8');
function must(s,m){if(!css.includes(s))throw new Error(m)}
must('Release 1.0.27.26 - lubrication map unified horizontal scroll cleanup.','release marker missing');
must('.lubrication-map-table tbody td:nth-child(1),\n.lubrication-map-table tbody td:nth-child(2),\n.lubrication-map-table tbody td:nth-child(3){\n  position:static!important;','body columns still horizontally sticky');
must('.lubrication-map-table thead th:nth-child(-n+3)::before{display:none!important}','legacy header overlay still active');
must('width:210px!important','point width missing');
must('width:245px!important','location width missing');
console.log('PASS release 1.0.27.26 unified map scroll / stripe fix');
