(function(global){'use strict';
const data=global.LubricaComponentStarterData;if(!Array.isArray(data))return;
const byId=id=>data.find(x=>String(x.id)===String(id));
const merge=(id,patch)=>{const e=byId(id);if(!e)return false;const oldTd=e.technicalData||{},newTd=patch.technicalData||{};e.technicalData={...oldTd,...newTd,mountingFillLiters:{...(oldTd.mountingFillLiters||{}),...(newTd.mountingFillLiters||{})},mountingFillOptionsLiters:{...(oldTd.mountingFillOptionsLiters||{}),...(newTd.mountingFillOptionsLiters||{})},mountingPositions:[...new Set([...(oldTd.mountingPositions||[]),...(newTd.mountingPositions||[])])]};e.lubricationData={...(e.lubricationData||{}),...(patch.lubricationData||{})};if(patch.sourceReference)e.sourceReference=patch.sourceReference;if(patch.sourceUrl)e.sourceUrl=patch.sourceUrl;if(patch.notes)e.notes=patch.notes;return true;};
const legacySource='Bonfiglioli legacy IOM / Annex 2 — historical lubricant fill quantity table for older C/A/F gear units. Quantities are reference fills; final operating level is verified by the OEM level plug/sight glass/dipstick.';
const legacyUrl='https://www.transdrive.co.uk/media/1225/bonfiglioli-helical-bevel-gearmotors-owners-manual.pdf';
const legacy=(id,mountingFillLiters,notes='')=>merge(id,{technicalData:{mountingFillLiters,mountingPositions:Object.keys(mountingFillLiters),recognitionOnly:false,fillVerificationRequired:false,technicalSupportRequired:false,legacyReferenceFill:true,fillRevisionId:'bonfiglioli-legacy-1.0.33.61',oemDatasetVersion:'1.0.33.61-bonfiglioli-legacy-fill',evidenceType:'OEM_LEGACY_TABLE'},lubricationData:{fillPolicy:'legacy_oem_by_mounting'},sourceReference:legacySource,sourceUrl:legacyUrl,notes:notes||'Для старого редуктора использовать исторический справочный объём; окончательный уровень имеет приоритет.'});

// User-confirmed policy for the installed fleet: these are older Bonfiglioli units.
// Use the historical Bonfiglioli oil quantity tables when a matching size/stage/mounting value exists.
legacy('STD-GBX-BONF-A-20-2-UH30-29-2-P90-VB',{B3:2.3,B6:2.3,B7:2.3,B8:2.3,VA:2.3,VB:2.3});
legacy('STD-GBX-BONF-A-41-2-NH-7-1-P132-B3',{B3:3.8,B6:3.1,B7:3.0,B8:4.0,VA:5.3,VB:3.3});
// A412/NR ... B5 stays verification-only: B5 is not one of the legacy A-series gearbox mounting positions in the table.
legacy('STD-GBX-BONF-A412-UH45-11_7-P112-B3',{B3:3.8,B6:3.1,B7:3.0,B8:4.0,VA:5.3,VB:3.3});
legacy('STD-GBX-BONF-A-41-2-UH45-45-1-P100-B3',{B3:3.8,B6:3.1,B7:3.0,B8:4.0,VA:5.3,VB:3.3});
legacy('STD-GBX-BONF-A413-NR-92_8-P100-B3',{B3:4.6,B6:3.9,B7:3.8,B8:4.8,VA:6.1,VB:4.0});
legacy('STD-GBX-BONF-A503-NR-81_5-P100-B3',{B3:5.1,B6:8.1,B7:4.7,B8:8.4,VA:11.0,VB:9.2});
legacy('STD-GBX-BONF-A-50-3-UH50-32-4-P90-VA',{B3:5.1,B6:8.1,B7:4.7,B8:8.4,VA:11.0,VB:9.2});

legacy('STD-GBX-BONF-C-31-2-P-15-6-P100-B7',{B3:1.4,B6:1.4,B7:1.4,B8:1.4,V5:1.5,V6:1.5});
legacy('STD-GBX-BONF-C-31-2-P-22-6-P90-B8',{B3:1.4,B6:1.4,B7:1.4,B8:1.4,V5:1.5,V6:1.5});
legacy('STD-GBX-BONF-C412-P-25-P100-B3',{B3:2.2,B6:2.0,B7:2.1,B8:1.9,V5:2.7,V6:3.4});
legacy('STD-GBX-BONF-C-41-2-P-9-6-P100-B7',{B3:2.2,B6:2.0,B7:2.1,B8:1.9,V5:2.7,V6:3.4});
legacy('STD-GBX-BONF-C-41-2-P-15-8-P100-B7',{B3:2.2,B6:2.0,B7:2.1,B8:1.9,V5:2.7,V6:3.4});
legacy('STD-GBX-BONF-C412-UFB-9_6-P100-B5',{B5:2.2,B51:2.0,B53:2.1,B52:1.9,V1:2.7,V3:3.4});
legacy('STD-GBX-BONF-C412-U-11_2-P112-B5',{B5:2.2,B51:2.0,B53:2.1,B52:1.9,V1:2.7,V3:3.4});
legacy('STD-GBX-BONF-C-41-3-P-31-2-P100-B6',{B3:2.1,B6:1.9,B7:2.1,B8:1.9,V5:2.6,V6:3.2});
legacy('STD-GBX-BONF-C-51-2-P-23-4-P132-B6',{B3:3.1,B6:3.0,B7:3.1,B8:3.0,V5:4.3,V6:5.0});
legacy('STD-GBX-BONF-C-51-3-P-93-P90-B3',{B3:3.0,B6:2.8,B7:3.1,B8:3.0,V5:4.1,V6:4.9});
legacy('STD-GBX-BONF-C-61-2-P-10-9-P132-B3',{B3:4.2,B6:4.0,B7:4.2,B8:4.1,V5:6.0,V6:6.7});
legacy('STD-GBX-BONF-F603-H60-32_1-P132-H1',{H1:14.0,H2:11.0,H3:7.9,H4:11.0,H5:15.0,H6:11.0});

// The exact current-fleet C412/P 31.4 B6 entry was added in 1.0.33.60; make the legacy table authoritative for this old unit.
legacy('STD-GBX-BONF-C412-P-31_4-P100-B6',{B3:2.2,B6:2.0,B7:2.1,B8:1.9,V5:2.7,V6:3.4});

global.LubricaGearboxOemDatasetVersion='1.0.33.61-bonfiglioli-legacy-fill';
})(window);
