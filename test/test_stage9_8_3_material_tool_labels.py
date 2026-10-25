from pathlib import Path
r=Path(__file__).resolve().parents[1]
ui=(r/'materials/library-ui.js').read_text(encoding='utf-8')
css=(r/'assets/app.css').read_text(encoding='utf-8')
checks={
 'demo label contrast':'body.demo-mode .database-current small{color:#76520b!important' in css and 'body.demo-mode .database-current strong{color:#35280d!important' in css,
 'symbol catalogue':'const MATERIAL_SYMBOLS36=[' in ui and ui.count("value:'")>=24,
 'symbol select':'<select id="libMatSymbol">' in ui and 'materialSymbolOptions36' in ui,
 'symbol saved':"symbol:$('#libMatSymbol').value" in ui,
 'material label button':'data-print-material' in ui and '>Этикетка</button>' in ui,
 'tool label button':'data-print-tool' in ui and 'Сначала закрепите материал' in ui,
 'tool inherits material':"const m=kind==='tool'?material36(item.materialId):item" in ui and "color=m?.color" in ui and "symbol=m?.symbol" in ui,
 'small label size':'@page{size:60mm 30mm;margin:0}' in ui and 'width:60mm;height:30mm' in ui,
 'print color':'print-color-adjust:exact' in ui,
 'material visual mark':'material-symbol-badge' in ui and 'm.symbol' in ui and 'm.color' in ui,
 'tool visual mark':'tool-material-mark' in ui and "Маркировка:" in ui,
 'public diagnostics':'symbols:MATERIAL_SYMBOLS36' in ui and 'printLabel:printLubricationLabel36' in ui,
}
bad=[k for k,v in checks.items() if not v]
if bad: raise SystemExit('STAGE 9.8.3 LABELS FAIL '+str(bad))
print('STAGE 9.8.3 LABELS PASS',checks)
