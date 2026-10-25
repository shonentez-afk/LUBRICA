# LUBRICA 1.0.32.15 — Universal Condition Source Alignment Hotfix

Исправлен дефект, при котором сохранённый `baseIntervalHours` вместе с `intervalSource=unified_auto` мог ошибочно наследовать производителя карточки подшипника как источник интервала. Из-за этого LUBRICA Universal 3.2 не применял коэффициенты нагрузки, загрязнения и вибрации, хотя UI показывал Universal 3.2.

Теперь `unified_auto/auto_oem` считается инженерным источником до тех пор, пока resolver реально не выбрал точный OEM-интервал. Для точного NSK interval table источник явно переключается на NSK.

Контроль UCP 212 / 300 об/мин / база 2250 ч: heavy contamination 1125 ч; heavy load 1575 ч; high vibration 1350 ч.
