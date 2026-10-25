# LUBRICA 1.0.31.7 — Gearbox Context / OEM Resolver / Source UX

## Цель
Продолжить перенос расчётных модулей за пределами подшипников на архитектуру `Context -> Resolver -> Package -> Source Registry`, не меняя проверенную математику редукторного калькулятора.

## Реализовано
- Добавлен `calculations/gearbox-architecture.js`.
- Введён `GearboxContext` с производителем, моделью, типом редуктора, монтажным положением, способом смазывания, контролем уровня и OEM-политикой обслуживания.
- Введён operation/parameter resolver для:
  - рабочего объёма масла;
  - периода замены масла;
  - долива.
- SEW-EURODRIVE и UNIT DRIVE больше не используют один и тот же неявный источник.
- Для ручного интервала UNIT DRIVE не присваивается ложный OEM-статус: используется `MANUAL_CONFIRMED_INTERVAL`.
- Для SEW отдельно разделены:
  - `SEW-GEARBOX-FILL` — объём масла;
  - `SEW-GEARBOX-MAINTENANCE` — интервалы инспекции/замены.
- Добавлен локальный dataset `SEW-GEARBOX-MAINTENANCE-V1`.
- Результат редуктора сохраняет `calculationContext`, `methodPlan`, `calculationPackage` и parameter-level provenance.
- В обычном калькуляторе редуктора добавлена кнопка `Источники`.
- В специальном окне редукторной части FRANCIA также добавлена кнопка `Источники`.
- Кнопка источников показывает только источники, относящиеся к фактическому OEM редуктора.
- В окне редуктора добавлена краткая строка `Методика и происхождение`, не перегружающая основной workflow.

## Важные правила
- Product data объёма масла не является автоматически источником периода замены.
- Интервал другого OEM не подставляется скрыто.
- Ручное подтверждение хранится как пользовательское, а не OEM-значение.
- SEW maintenance dataset не переносится на UNIT DRIVE или неизвестный редуктор.
- Расчёт остаётся автономным и не зависит от доступности OEM-сайта.

## Version consistency
Исправлена ранее наследованная несинхронность `APP_VERSION`: runtime и default database теперь соответствуют manifest `1.0.31`.

## Regression
PASS:
- 1.0.31 Calculation Architecture Consolidation
- 1.0.31.2 Source Registry / Offline Evidence
- 1.0.31.3 Multi-OEM Offline Dataset Expansion
- 1.0.31.4 Non-Bearing Source Registry
- 1.0.31.5 Offline Table UX / Provenance
- 1.0.31.6 Chain / Screw Jack Sources
- 1.0.31.7 Gearbox Context / OEM Resolver / Source UX
- Gearbox Oil Calculator
- Chain Calculator
- FRANCIA screw-jack regression
- Preflight
