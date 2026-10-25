# LUBRICA 1.0.31.18 — Current Calculation Source Trace UX

База: LUBRICA 1.0.31.17.

## Исправлено

1. Кнопка «Источники» внутри подшипникового калькулятора больше не показывает весь глобальный Source Registry. Она формирует список `sourceIds` из текущего результата `CalculationPackage` и открывает только фактически участвующие источники.
2. В окне источников текущего расчёта выводится контекст: подшипник точки, d/D/B, происхождение геометрии, источник дозы и источник интервала. Полный реестр всех OEM остаётся отдельной глобальной функцией.
3. Для Tröster без явно записанного производителя вентилятора применяется подтверждённое проектное правило `Ventapp fan → Tröster bearing block`; в форме и шапке больше не показывается вводящее в заблуждение «Производитель вентилятора: не указан».
4. Шапка расчёта теперь явно подписывает данные как `Подшипник точки`, отдельно от производителя вентилятора и производителя подшипникового блока.
5. Поле Tröster `tf` переименовано в «подтверждённый tf по диаграмме» и явно отмечено как ручное чтение OEM-диаграммы, а не автоматическое значение.
6. Добавлено отдельное поле `troesterBaseIntervalSource`; оно сохраняется в расчётной карточке и выводится в provenance. Существующие расчёты не блокируются только из-за отсутствия старого source-поля, но происхождение такого `tf` явно маркируется как незафиксированное.

## Архитектурные ограничения

- Расчётные формулы и приоритет `Ventapp machine-specific → Tröster OEM` не изменены.
- Подшипник Tröster по маркировке блока не выводится; геометрия берётся из текущей точки.
- Глобальный Source Registry не сокращён и не удалён — изменён только контекстный вызов из калькулятора.
- Cross-OEM правила REITZ, SKF SNL, NSK и Ferrari не изменялись.

## Проверки

PASS:
- syntax check: `task-editor.js`, `source-registry.js`, `calculator.js`;
- `test_release_1_0_31_18_bearing_source_trace_ux.py`;
- `test_bearing_source_registry.js` — 39 источников;
- `test_release_1_0_31_16_ventapp_troester_priority.js`;
- `test_release_1_0_31_16_ventapp_ui_integration.js`;
- `test_release_1_0_31_14_troester_ferrari_completion.js`;
- `test_release_1_0_31_11_source_integrity_completeness.js` — 39 sources / 37 datasets / 12 calculators / 34 traced claims;
- `test_release_1_0_31_15_troester_point_bearing_source.py`;
- REITZ ZLG priority;
- REITZ/SNL context audit;
- NSK auto-OEM resolver;
- REITZ SNL parameter fallback;
- SKF SNL UI/lifecycle;
- `preflight.py`.
