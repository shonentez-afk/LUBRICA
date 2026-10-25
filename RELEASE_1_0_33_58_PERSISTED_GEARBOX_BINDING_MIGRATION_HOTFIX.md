# LUBRICA 1.0.33.58 — Persisted Gearbox Binding Migration Hotfix

## Причина
В 1.0.33.57 Cross-OEM Guard корректно работал при новом разрешении справочника, но уже сохранённые точки не проходили reconciliation непосредственно при `State.activateDatabase()`. Кроме того, старый автоматически применённый OEM-расчёт сохранялся, если `approvedFillLiters` уже был записан.

## Исправления
- `Core.State.activateDatabase()` и `setDatabase()` выполняют `LubricaComponentBinding.reconcileDatabase()` до сохранения recovery и до первого отображения.
- `ensurePointTechnical()` сам проверяет устаревший gearbox binding перед использованием записи справочника.
- при доказанном stale/cross-OEM автоматическом binding удаляются чужие `linkedTechnicalData`, `linkedLubricationData`, OEM-derived calculation package, provenance и summary, даже если старый объём ранее был применён/approved; ручной `actualLibraryEntryId` не затрагивается.
- синхронизированное количество в мероприятии очищается, если оно было рассчитано из отвергнутого OEM-профиля; выбранный материал и инструмент сохраняются.
- карточка точки выполняет rehydrate до вывода строки «Справочник».

## Целевой кейс
`LP-000213` / `COMP-0001583`: `SEW EURODRIVE R97 DRE132M4/TF/ES7C/V i=25,03` больше не сохраняет `UNIT DRIVE UD-PC080` и 0,15 л. После открытия базы binding становится `STD-GBX-SEW-R97`; до подтверждения монтажного положения количество масла не подставляется.
