# LUBRICA 1.0.30.1 — REITZ SNL OEM Priority & Context Audit

## Цель
Исключить смешение SKF SNL, REITZ application-specific и LUBRICA Universal 3.2 в одном результате.

## Исправлено
- Для вентилятора REITZ с SNL/SN и подтвержденным внутренним подшипником сначала проверяется таблица REITZ KXE для одиночных подшипниковых корпусов.
- Для 22222 K сопоставляется строка REITZ 522/200: 100 г на досмазывание; при 1450 об/мин используется колонка 1500 об/мин = 460 ч до температурной коррекции.
- Generic speed warning больше не показывается как OEM-предупреждение поверх REITZ/SKF. Он доступен только как техническая проверка инженерного fallback.
- SKF SNL full-renewal after ~5 side relubes не переносится в REITZ application-specific режим.
- В простом режиме REITZ можно выбрать один раз как производителя вентилятора; далее resolver работает автоматически.
- В экспертном режиме доступны Auto / REITZ KXE / SKF SNL, локальная таблица REITZ, SKF reference и источники.
- REITZ refill quantity сохраняется как справочная величина, но периодическая полная замена не создается без OEM-интервала.

## Приоритет
1. Табличка/регламент конкретного вентилятора REITZ.
2. REITZ KXE application-specific table.
3. SKF SNL housing method.
4. LUBRICA Universal 3.2 только как явно помеченный engineering fallback.

## Контекстный аудит
Проверены границы ZLG / SNL / UC-UK-UEL / generic bearing. Тексты, full-renewal policy и speed warning теперь зависят от активной методики, а не только от признака housed bearing.
