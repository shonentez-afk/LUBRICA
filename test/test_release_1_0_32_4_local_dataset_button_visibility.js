const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'bearings/source-registry.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/app.css'),'utf8');
function ok(v,m){if(!v)throw new Error(m)}
ok(src.includes('source-registry-local-actions'),'local dataset quick action block missing');
ok(src.includes("global.LubricaOfflineEvidence?.get?.(id)"),'buttons must only be shown for registered datasets');
ok(src.includes('Открыть локальную таблицу'),'single local table action missing');
ok(src.includes('Локальная таблица ${i+1}'),'multi dataset action missing');
ok(src.includes("global.LubricaOfflineEvidence?.open(b.dataset.openDataset)"),'local dataset click handler missing');
ok(css.includes('.source-registry-local-actions'),'local dataset action css missing');
console.log('1.0.32.4 local dataset button visibility: OK');
