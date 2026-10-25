# GitHub migration status

## Current status

Repository initialized and ready for full baseline import.

Already committed:
- README.md
- START_NEW_CHAT_RU.md
- project/PROJECT_STATE_RU.md
- project/DECISIONS_RU.md
- project/GITHUB_WORKFLOW_RU.md
- project/RELEASE_HISTORY_RU.md
- 1.0.33.67 release note
- 1.0.33.67 regression acceptance
- 1.0.33.67 PP-53736 engineering acceptance (MD + JSON)
- automated import workflow: .github/workflows/import-baseline.yml

## Full baseline import

Expected release/tag: `v1.0.33.67`

Expected release asset filename:
`LUBRICA_GITHUB_IMPORT_PACKAGE.zip`

When that release is published, GitHub Actions automatically:
1. downloads the release asset;
2. unpacks `LUBRICA_GITHUB_IMPORT/`;
3. copies the full baseline into the repository;
4. commits it to `main`.

After the workflow succeeds, verify that `components/`, `calculations/`, `test/`, `assets/`, `project/sources/` and the application entry files are present in `main`.
