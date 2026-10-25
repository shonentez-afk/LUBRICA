# LUBRICA 1.0.33.25 — Chain / Gearbox task sync fix

- Chain calculator now projects calculated/accepted quantity and interval to all `lubricant_apply` tasks of the point.
- Gearbox calculator now projects oil-change volume and maintenance interval to all `oil_change` tasks of the point, not only the task used to open the calculator.
- Existing databases are repaired on normalization from saved point calculations.
- Calculated values remain distinct from approved values; accepted/approved chain values populate `approved`, otherwise Map shows calculated quantity.
- Gearbox interval is materialized in `schedule.legacyText` (`ч` or `мес.`) so the Map and task card no longer show an empty period after calculation.
