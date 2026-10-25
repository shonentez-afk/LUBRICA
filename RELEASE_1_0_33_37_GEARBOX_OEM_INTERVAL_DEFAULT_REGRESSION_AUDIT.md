# LUBRICA 1.0.33.37 — Gearbox OEM Interval Default + Regression Audit

## Исправлено

1. Для распознанных OEM-редукторов режим периодичности теперь по умолчанию остается `Автоматически по OEM`, если пользователь явно не выбрал ручной режим или обслуживание по состоянию.
2. Старое сохраненное состояние `manual`, возникшее из предыдущей логики распознавания источника, автоматически не блокирует Rossi OEM-интервал. Источники `ROSSI`, `SEW-EURODRIVE` и общие OEM-источники распознаются как автоматические.
3. Для Rossi MR V 63 UO3A 1:16 с синтетическим маслом локальная политика применяется автоматически: 18000 ч при нормальной температуре масла и 12500 ч при повышенной температуре 65–80 °C.
4. Если пользователь вручную меняет режим периодичности, выбор сохраняется как явное пользовательское переопределение и не перезаписывается автоматикой при следующем открытии.
5. Синхронизирована версия приложения в runtime, manifest и default database schema: 1.0.33.37.
6. Исправлен устаревший regression-test Bearing Calculator: текущая инженерная вертикальная поправка Universal равна 0.6, поэтому контрольный результат для 8000 ч / 85 °C / vertical / conditionFactor 0.5 равен 1200 ч.

## Проверки

- JS syntax — PASS
- Preflight — PASS
- Database / safe recovery — PASS
- Classifier + actual fleet — PASS
- Bearing Library / Bearing Calculator — PASS
- Calculation Framework — PASS
- Linear Bearing / Gearbox / Chain / Coupling / Grease Point / Ball Screw calculators — PASS
- Rossi MRV63 OEM fill/interval — PASS
- New 1.0.33.37 OEM interval default contract — PASS
- Route / planning / execution / analytics / dashboard / Excel / QA / Stage 9.9 checks — PASS in split regression runs
- Edge file:// static contract — PASS

Source XLSX integration tests remain skipped when source XLSX files are not present in the release test environment.
