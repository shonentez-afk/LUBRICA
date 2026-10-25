# LUBRICA 1.0.29.4 — Bearing Policy Context Audit

Исправлена утечка текстов политики UC/UK/UEL в ZLG и другие типы подшипников.

- ZLG теперь показывает `OEM-досмазывание ZLG`, без упоминания UC/UK/UEL.
- Причины неприменимости полной замены формируются из фактической maintenance policy.
- Устаревшие calculation tasks получают контекстную причину для ZLG / slewing ring / UC-UK-UEL.
- Anti-overgreasing пояснения UC/UK/UEL выводятся только для `housed_relube_only`, а не для любого `housed` узла.
- REITZ ZLG расчёт и экспертный режим не изменены.
