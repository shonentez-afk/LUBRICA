const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const window={};window.window=window;window.LubricaSystem={registerModule(){}};window.LubricaCore={State:{getDatabase:()=>({bearingOverrides:[]})}};
const ctx={window,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'bearings/catalog-data.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'bearings/library.js'),'utf8'),ctx);
const B=ctx.window.LubricaBearings;
function a(c,m){if(!c)throw new Error(m)}
const checks={
 '22211':[55,100,25],'22230':[150,270,73],
 '22307':[35,80,31],'22319':[95,200,67],'22330':[150,320,108],
 '23020':[100,150,37],'23030':[150,225,56],
 '23120':[100,165,52],'23130':[150,250,80],
 '23218':[90,160,52.4],'23230':[150,270,96],
 '23920':[100,140,30],'23930':[150,210,45],
 '24020':[100,150,50],'24030':[150,225,75],
 '24120':[100,165,65],'24130':[150,250,100]
};
for(const [des,dims] of Object.entries(checks)){
 const r=B.lookup(des+' CC/W33');
 a(r.record,des+' missing');
 a(r.record.bearingType==='spherical_roller',des+' type');
 a(r.record.d===dims[0]&&r.record.D===dims[1]&&r.record.B===dims[2],des+' dimensions');
}
for(const des of ['22222 EK','22320 E','23026 CC/W33','23128 CAK/W33','23224 CCK/W33','23928 K','24026 CCK30/W33','24124 CA/W33']){
 const p=B.parse(des);a(p.inferredType==='spherical_roller',des+' inferred type');a(p.baseDesignation.match(/^(222|223|230|231|232|239|240|241)/),des+' base parse');
}
console.log('OK 1.0.33.42 spherical roller series coverage');
