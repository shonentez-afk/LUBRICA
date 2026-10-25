# LUBRICA 1.0.33.20 — Housed Unit Library Gap Fix

Исправлен пробел библиотеки корпусных подшипниковых узлов, выявленный на фактических ТМЦ конвейера.

## Добавлено
- `UCPA 210` / `UCPA210` — встроенная OEM-запись SKF, короткий опорный корпус (short-base pillow block), d=50 mm, D=90 mm, B=51.6 mm, масса узла 2.25 kg, вставка UC210.
- `UKHA 212` / `UKHA212` — встроенная запись HYC/NIKO, подвесной корпус (hanger), adapter type, вал 55 mm, вставка UK212, корпус HA212, масса узла 3.59 kg.
- Parser Bearing Library теперь распознаёт семейство `UKHA`.
- Multi-OEM housed-unit family map знает `UKHA` как hanger-unit с вставкой UK.

## Источники
- SKF, product page `UCPA 210`.
- NIKO / HYC Bearing Units Catalogue 2021, table `UKHA 200`.
- Для геометрии UK212 дополнительно используется OEM-геометрия insert bearing UK212 / adapter assembly.

## Поведение
Поиск работает как по чистому обозначению, так и по фактическому импортированному имени, например `Узел подшипниковый UKHA 212 Линия №2`.
Исходное имя ТМЦ не изменяется; библиотека связывает его с технической записью.
