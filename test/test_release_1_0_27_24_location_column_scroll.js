const fs=require('fs');
const css=fs.readFileSync('assets/app.css','utf8');
function must(x,msg){if(!css.includes(x))throw new Error(msg)}
must('Release 1.0.27.24 - keep only checkbox + lubrication point horizontally sticky.', 'release marker missing');
must('.lubrication-map-table tbody td:nth-child(3){\n  position:static!important;', 'location body column is still horizontally sticky');
must('.lubrication-map-table thead th:nth-child(3){\n  position:static!important;', 'location header is still horizontally sticky');
must('.lubrication-map-table thead th:nth-child(-n+2){', 'first two sticky headers rule missing');
must('.lubrication-map-table tbody td:nth-child(2){left:34px;z-index:5}', 'point column sticky offset missing');
console.log('PASS release 1.0.27.24 location column scroll UX');
