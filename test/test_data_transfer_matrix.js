const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.resolve(__dirname,'..');
const catalog=[
{id:'B',category:'bearing',designation:'6205',technicalData:{d:25,D:52,B:15,bearingType:'deep_groove_ball'},sourceType:'builtin'},
{id:'C',category:'chain',designation:'12B-2',technicalData:{chainType:'Роликовая',pitchMm:19.05,strandCount:2}},
{id:'L',category:'linear_bearing',designation:'LM8UU',manufacturer:'THK',technicalData:{subtype:'Линейная втулка',blockLengthMm:24}},
{id:'S',category:'ball_screw',designation:'JPF1605-4',manufacturer:'THK',technicalData:{diameterMm:16,leadMm:5}},
{id:'G',category:'gearbox_oil',designation:'RX77',manufacturer:'SEW',technicalData:{mountingFillLiters:{M1:1.1}},sourceReference:'OEM'},
{id:'K',category:'coupling',designation:'1020T',manufacturer:'Falk',technicalData:{couplingType:'Пружинная'},lubricationData:{quantity:27,quantityUnit:'г'},sourceReference:'OEM'},
{id:'O',category:'oil_system',designation:'SYS1',technicalData:{systemType:'circulation',workingVolumeLiters:100,filterRatingMicron:10},sourceReference:'OEM'},
{id:'OG',category:'open_gear',designation:'GEAR1',technicalData:{module:8,teeth:120,faceWidthMm:200},lubricationData:{quantity:5,quantityUnit:'г'},sourceReference:'OEM'},
{id:'R',category:'wire_rope',designation:'ROPE1',technicalData:{diameterMm:20,construction:'6x36'},lubricationData:{quantity:1,quantityUnit:'л'},sourceReference:'OEM'},
{id:'CL',category:'central_point',designation:'CLS1',technicalData:{systemType:'progressive',meteringType:'divider',outletCount:12},sourceReference:'OEM'}];
const db={lubricationPoints:[],components:[],equipment:[]};
const window={LubricaSystem:{registerModule(){}},LubricaCore:{State:{getDatabase:()=>db}},LubricaComponents:{all:c=>c==='all'?catalog:catalog.filter(x=>x.category===c)},LubricaBearings:{lookup:q=>{const ok=String(q).includes('6205');return{record:ok?catalog[0]:null,sourceType:'builtin',parsed:{baseDesignation:ok?'6205':'',recognized:ok,dimensions:ok?{d:25,D:52,B:15}:null,catalogId:ok?'B':null,inferredType:'deep_groove_ball'}}}}};window.window=window;const ctx={window,console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'components/binding.js'),'utf8'),ctx);
const B=window.LubricaComponentBinding,A=(x,m)=>{if(!x)throw Error(m)},p=(category,id,extra={})=>{const x={category,...extra};B.setLibraryEntry(x,id);return x};
let x=p('bearing','B');A(x.bearing.d===25&&x.bearing.D===52&&x.bearing.B===15,'bearing d/D/B');
x=p('chain','C');A(x.chain.pitchMm===19.05&&x.chain.strandCount===2,'chain');
x=p('linear_bearing','L');A(x.linearBearing.manufacturer==='THK'&&x.linearBearing.model==='LM8UU','linear');
x=p('ball_screw','S');A(x.ballScrew.screwDiameterMm===16&&x.ballScrew.leadMm===5,'ball screw');
x=p('gearbox_oil','G',{gearboxOil:{mountingPosition:'M1'}});A(x.gearboxOil.calculation.oemFillLiters===1.1,'gearbox');
x=p('coupling','K');A(x.coupling.calculation.oemTotalG===27,'coupling');
x=p('oil_system','O');A(x.oilSystem.calculation.oemVolumeLiters===100&&x.oilSystem.calculation.filterRatingMicron===10,'oil system');
x=p('open_gear','OG');A(x.openGear.module===8&&x.openGear.teeth===120&&x.openGear.faceWidthMm===200,'open gear');
x=p('rope','R');A(x.wireRope.diameterMm===20&&x.wireRope.construction==='6x36','rope');
x=p('central_point','CL');A(x.centralLubrication.calculation.outletCount===12,'central lubrication');
console.log('DATA TRANSFER MATRIX TEST PASS');
