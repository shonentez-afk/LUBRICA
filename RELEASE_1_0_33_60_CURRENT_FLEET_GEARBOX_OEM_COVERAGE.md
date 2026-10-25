# LUBRICA 1.0.33.60 — Current Fleet Gearbox OEM Coverage

Основание: полный OEM-аудит актуальной производственной базы `Филиал_завода__Техно__г._Юрга(20260918-095105).json` (363 экземпляра, 202 уникальные связки производитель+обозначение).

## P0 — safety
- Заблокирована опасная внутрипроизводительская подмена Tandler `STD EА1` → `STD B1`.
- Старые автоматические B1-связи для EA1 инвалидируются через общий persisted-binding migration; расчётные количества и источники очищаются, ручной `actualLibraryEntryId` остаётся приоритетным.
- ABB/Nabtesco RV (`RV40E`, `RV400C`, `RV450E` + 3HAC) переведены в `robot_joint_grease` и блокируются для обычного gearbox_oil.
- ZIMM `Z-50-SN` остаётся в `screw_jack_fluid_grease`.
- Cross-OEM guard не ослаблен.

## P1 — новые OEM/семейства
- UNIMEC XRC54 — OEM fill 0.02 l, synthetic oil reference.
- SEW PSF822 — M1/M3/M5/M6 1.55 l; M2 2.55 l; M4 3.35 l.
- SEW FH77 — полная M1…M6 таблица 5.9 / 7.3 / 4.3 / 8.0 / 6.0 / 6.3 l.
- SEW FH87 — полная M1…M6 таблица 10.8 / 13.0 / 7.7 / 13.8 / 10.8 / 11.0 l.
- SEW KHF47 — подтверждённый для текущего парка M1 = 0.80 l.
- SEW KHF87 — recognition-only до подтверждения точного исполнения/положения.
- SEW KA87 — M1…M6 = 3.7 / 8.0 / 8.7 / 10.9 / 8.0 / 8.0 l.
- SEW SF67 — подтверждённый для текущего парка M6 = 2.70 l.
- SEW KH47 — M1 = 0.80 l.

## Parser / resolver
- Распознаются PSF, KHF, SF и UNIMEC XRC54.
- Суффиксы SEW `M1A`, `M1B`, `M6A` нормализуются как монтажные положения `M1`, `M1`, `M6`.
- Rossi MRIV63 добавлен как recognition-only с обязательным подтверждением type-code/mounting semantics.
- Bonfiglioli C412/P 1:31.4 B6 PAM100 распознаётся точно, но объём не наследуется с другого C412/C512: `technicalSupportRequired`.

## Фактическая проверка актуальной базы
- До исправления 1.0.33.59: 314 связанных экземпляров / 49 несвязанных.
- 1.0.33.60: 331 связанных / 32 несвязанных.
- Новые правильные привязки: +19 экземпляров.
- Удалены опасные Tandler EA1→B1: −2 ошибочные привязки.
- Net coverage: +17 экземпляров.
- Cross-OEM false matches: 0.
- Wrong-domain blocked: 6 экземпляров (ABB/Nabtesco 4 + ZIMM 2).

## Final acceptance
После внедрения все 32 несвязанных экземпляра являются намеренными safety-block случаями: 20 manufacturer conflict, 6 wrong-domain, 2 Tandler type-code confirmation и 4 недостаточно идентифицированные строки. Неожиданных unresolved записей в текущей базе нет.
