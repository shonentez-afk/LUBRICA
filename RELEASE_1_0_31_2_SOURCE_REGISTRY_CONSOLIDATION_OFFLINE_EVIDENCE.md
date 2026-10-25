# LUBRICA 1.0.31.2 — Source Registry Consolidation & Offline Evidence

## Цель
Сделать Source Registry единым слоем прослеживаемости для Calculation Architecture 1.0.31/1.0.31.1 и обеспечить офлайн-доступ к критичным табличным OEM-данным без зависимости расчёта от сайта производителя.

## Реализовано
- В центральный Bearing Source Registry добавлены REITZ KXE Single, REITZ KXE ZLG и NTN-SNR ZLG 2024.
- Для ключевых источников введены `landingPage`, `documentUrl`, `datasetIds`, `supports`.
- Добавлен `bearings/offline-evidence.js` — registry локальных нормализованных OEM datasets.
- Локально доступны таблицы: REITZ KXE single bearing housings; REITZ ZLG AA/AK; REITZ ZLG AC; NTN-SNR ZLG 2024; SKF SNL housing grease quantities.
- Source Registry показывает статус офлайн-данных и кнопку «Локальная таблица».
- `multi-oem-data.js/sourceRefs` получил мост `sourceId`/`datasetId`, сохраняя старые title/url/note для обратной совместимости.
- Расчёт не выполняет сетевых запросов. Внешние URL используются только для доказательной проверки инженером.
- Данные versioned (`datasetId`, `version`, `verifiedAt`), что оставляет задел для параллельного хранения будущих редакций OEM-таблиц.

## Regression baseline
Формулы и расчётные значения не менялись. Проверено локальными тестами:
- REITZ 522/200 + 22222K: 100 g relube, 1100 g new fill, 460 h @ 1500 rpm.
- REITZ ZLG316 AA/AK: 96 g, 2760 h in >1800–3000 rpm band.
- NTN-SNR ZLG316: 227 cm3, 3000 h baseline, minimum 2/year.
- SKF SNL522-619: 20%=530 g, 40%=850 g.
- 1.0.31 architecture, 1.0.31.1 presenter and relevant 1.0.30.x UI regressions pass.

## Extension contract
Новый табличный источник добавляется как:
`sourceId -> datasetId/version -> normalized rows -> Method Registry/CalculationPackage`.
UI Source Registry не требует отдельной OEM-ветки: локальные datasets открываются по metadata.
