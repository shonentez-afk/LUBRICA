(function(global){'use strict';
const data=global.LubricaComponentStarterData;if(!Array.isArray(data))return;
const byId=id=>data.find(x=>String(x.id)===String(id));
const merge=(id,patch)=>{const e=byId(id);if(!e)return false;const oldTd=e.technicalData||{},newTd=patch.technicalData||{};e.technicalData={...oldTd,...newTd,mountingFillLiters:{...(oldTd.mountingFillLiters||{}),...(newTd.mountingFillLiters||{})},mountingFillOptionsLiters:{...(oldTd.mountingFillOptionsLiters||{}),...(newTd.mountingFillOptionsLiters||{})},mountingPositions:[...new Set([...(newTd.mountingPositions||oldTd.mountingPositions||[])])]};e.lubricationData={...(e.lubricationData||{}),...(patch.lubricationData||{})};if(patch.sourceReference)e.sourceReference=patch.sourceReference;if(patch.sourceUrl)e.sourceUrl=patch.sourceUrl;if(patch.notes)e.notes=patch.notes;return true;};

// 1.0.33.67 does not change the audited PP-53736 oil tables. It adds a revision marker so
// persisted quantities that were applied from the pre-1.0.33.66 R77 compound-option dataset
// are invalidated and recalculated against the standalone R77 table.
merge('STD-GBX-SEW-R77',{technicalData:{fillRevisionId:'SEW-R77-STANDALONE-PP53736-1.0.33.67',invalidateAutoApprovedFillOnRevision:true,oemDatasetVersion:'1.0.33.67-pp53736-persistence-audit'},notes:'PP-53736 uses standalone R77DRE132S4/TF/ES7C/V. Parenthesized quantities in historical SEW tables belong to the large gear unit of multi-stage units and are not selectable alternatives for the standalone R77. Existing auto-applied values from the old alternative dataset are reset for recalculation.'});

for(const id of ['STD-GBX-SEW-K37','STD-GBX-SEW-KF37R17','STD-GBX-SEW-S37'])merge(id,{technicalData:{oemDatasetVersion:'1.0.33.67-pp53736-persistence-audit'}});
global.LubricaGearboxOemDatasetVersion='1.0.33.67-pp53736-persistence-audit';
})(window);
