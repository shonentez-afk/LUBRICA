# LUBRICA 1.0.33.47 — Chain / Scraper Conveyor Constructor

- Added recognition of scraper conveyors and longitudinal/transverse waste conveyors as `conveyor / chain_scraper`.
- Reuses the verified conveyor arrangement: drive shaft + tension/driven shaft, two bearing supports per shaft.
- Working chain remains a service candidate; sprockets and mounting parts remain excluded from automatic lubrication points.
- Drive gearbox/motor-gearbox is retained as a separate service asset.
- Manual equipment creation now offers conveyor construction: Belt or Chain / scraper and stores the subtype.
- Existing belt conveyor behavior remains on the same `conveyor_arrangement` engine.
- Bearing supports remain compatible with UC/UK units, SNL + internal bearing, or a bearing without a confirmed housing.
