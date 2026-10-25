(function(global){
'use strict';
const MAP=Object.freeze({
 'SEW-EURODRIVE':Object.freeze({sourceId:'SEW-GEARBOX-FILL',datasetId:'SEW-GEARBOX-FILL-V1',datasetVersion:'1',evidenceType:'PRODUCT_DATA'}),
 'FRANCIA':Object.freeze({sourceId:'FRANCIA-SCREW-JACK',datasetId:'FRANCIA-M42VR-V1',datasetVersion:'1',evidenceType:'APPLICATION_OEM'}),
 'UNIT DRIVE':Object.freeze({sourceId:'UNIT-DRIVE-WORM',datasetId:'UNIT-DRIVE-WORM-V1',datasetVersion:'1',evidenceType:'PRODUCT_DATA'}),
 'BONFIGLIOLI':Object.freeze({sourceId:'BONFIGLIOLI-GEARBOX-FILL',datasetId:'BONFIGLIOLI-GEARBOX-FILL-V1',datasetVersion:'1',evidenceType:'PRODUCT_DATA'})
});
function gearbox(entry){if(!entry)return null;const text=((entry.manufacturer||'')+' '+(entry.sourceReference||'')).toUpperCase();if(text.includes('SEW-EURODRIVE'))return MAP['SEW-EURODRIVE'];if(text.includes('FRANCIA'))return MAP.FRANCIA;if(text.includes('UNIT DRIVE')||text.includes('ПТЦ'))return MAP['UNIT DRIVE'];if(text.includes('BONFIGLIOLI'))return MAP.BONFIGLIOLI;return null}
function chain(entry){if(!entry)return null;return {sourceId:'CHAIN-ISO606-RENOLD',datasetId:'CHAIN-B-SERIES-V1',datasetVersion:'1',evidenceType:'PRODUCT_DATA',parameterOwnership:{dimensions:true,relubeQuantity:false,relubeInterval:false}}}
function screwJack(entry){return String(entry?.manufacturer||'').toUpperCase().includes('FRANCIA')?MAP.FRANCIA:null}
global.LubricaNonBearingProvenance=Object.freeze({gearbox,chain,screwJack});
global.LubricaSystem?.registerModule?.('Non-Bearing Provenance','ok','SEW / BONFIGLIOLI / UNIT DRIVE / chains / FRANCIA');
})(window);
