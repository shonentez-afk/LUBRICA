# LUBRICA 1.0.33.62 — Bonfiglioli Apply Quantity Persistence Hotfix

## Симптом

После нажатия «Применить расчёт» для старого Bonfiglioli (например `C412/P 1:25 B3 PAM100`) калькулятор показывал `2.2 л · 8000 ч / 12 мес.`, но в мероприятии поле «Количество» оставалось пустым. Период `8000 ч` сохранялся.

## Причина

В 1.0.33.61 для старых Bonfiglioli введён `fillRevisionId='bonfiglioli-legacy-1.0.33.61'`. При явном применении расчёта `gearbox-oil-adapter.js` создавал новый объект `calculation`, но не переносил в него `fillRevisionId`. На следующем `State.setDatabase()` компонентный reconcile видел пустую ревизию как старую, запускал защитную миграцию и очищал `approved/effective/applied fill` и количество мероприятия. Интервал при этой миграции не очищался, поэтому дефект выглядел как «8000 ч есть, 2.2 л нет».

## Исправление

`gearbox-oil-adapter.js` при применении результата сохраняет активную ревизию:

`fillRevisionId: td.fillRevisionId || c.fillRevisionId || ''`

Теперь новый результат помечен текущей OEM-ревизией и не попадает под миграцию устаревшего объёма.

## Regression

Добавлен `test/test_release_1_0_33_62_bonfiglioli_apply_quantity_persistence.js`:
- `C412/P 1:25 B3 PAM100 = 2.2 л` сохраняется;
- `approvedFillLiters/effectiveFillLiters/appliedFillLiters` не очищаются;
- `task.quantity.approved = '2.2'` и единица `л` сохраняются;
- период `8000 ч` сохраняется;
- старая миграция 1.0.33.61 по-прежнему очищает действительно устаревшие 3.0 л.
