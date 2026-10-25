#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_MEMORY_FILES = [
    "START_NEW_CHAT_RU.md",
    "project/PROJECT_INDEX_RU.md",
    "project/PROJECT_CHARTER_RU.md",
    "project/PROJECT_STATE_RU.md",
    "project/OPEN_QUESTIONS_RU.md",
    "project/ROADMAP_RU.md",
    "project/DECISIONS_RU.md",
    "project/ARCHITECTURE_OVERVIEW_RU.md",
    "project/DATA_MODEL_MAP_RU.md",
    "project/UI_UX_PRINCIPLES_RU.md",
    "project/ENGINEERING_EVIDENCE_POLICY_RU.md",
    "project/OEM_SOURCE_INDEX_RU.md",
    "project/SOURCE_INDEX_RU.md",
    "project/EQUIPMENT_COVERAGE_MATRIX_RU.md",
    "project/MODULE_STATUS_RU.md",
    "project/TEST_ACCEPTANCE_POLICY_RU.md",
    "project/TEST_MATRIX_RU.md",
    "project/KNOWN_LIMITATIONS_RU.md",
    "project/PROJECT_CHRONICLE_RU.md",
    "project/RELEASE_HISTORY_RU.md",
    "project/NEXT_RELEASE_PLAN_RU.md",
    "project/NEXT_RELEASE_TEMPLATE_RU.md",
    "project/GITHUB_WORKFLOW_RU.md",
    "project/DEPRECATED_BASELINES_RU.md",
    "project/SITE_ENGINEERING_RULES_RU.md",
]

VERSION_SYNC_FILES = [
    "README.md",
    "START_NEW_CHAT_RU.md",
    "project/PROJECT_STATE_RU.md",
    "project/NEXT_RELEASE_PLAN_RU.md",
    "project/RELEASE_HISTORY_RU.md",
]

INDEX_REQUIRED_REFERENCES = [
    "PROJECT_CHARTER_RU.md",
    "PROJECT_STATE_RU.md",
    "OPEN_QUESTIONS_RU.md",
    "ROADMAP_RU.md",
    "DECISIONS_RU.md",
    "ARCHITECTURE_OVERVIEW_RU.md",
    "DATA_MODEL_MAP_RU.md",
    "UI_UX_PRINCIPLES_RU.md",
    "ENGINEERING_EVIDENCE_POLICY_RU.md",
    "OEM_SOURCE_INDEX_RU.md",
    "EQUIPMENT_COVERAGE_MATRIX_RU.md",
    "TEST_ACCEPTANCE_POLICY_RU.md",
    "TEST_MATRIX_RU.md",
    "KNOWN_LIMITATIONS_RU.md",
    "PROJECT_CHRONICLE_RU.md",
    "RELEASE_HISTORY_RU.md",
    "NEXT_RELEASE_TEMPLATE_RU.md",
    "GITHUB_WORKFLOW_RU.md",
    "DEPRECATED_BASELINES_RU.md",
    "SITE_ENGINEERING_RULES_RU.md",
]

def read_text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")

def exists(rel: str) -> bool:
    return (ROOT / rel).is_file()

def version_token(version: str) -> str:
    return version.replace(".", "_")

def find_release_note(version: str) -> list[Path]:
    token = version_token(version)
    patterns = [
        f"RELEASE_{token}_*.md",
        f"releases/RELEASE_{token}_*.md",
        f"project/releases/RELEASE_{token}_*.md",
    ]
    found: list[Path] = []
    for pattern in patterns:
        found.extend(ROOT.glob(pattern))
    return sorted(set(found))

def find_regression_acceptance(version: str) -> list[Path]:
    token = version_token(version)
    patterns = [
        f"LUBRICA_{token}_REGRESSION_ACCEPTANCE.txt",
        f"acceptance/LUBRICA_{token}_REGRESSION_ACCEPTANCE.txt",
        f"project/releases/LUBRICA_{token}_REGRESSION_ACCEPTANCE.txt",
    ]
    found: list[Path] = []
    for pattern in patterns:
        found.extend(ROOT.glob(pattern))
    return sorted(set(found))

def main() -> int:
    parser = argparse.ArgumentParser(description="Audit persistent LUBRICA project memory.")
    parser.add_argument("--release-tag", default="", help="Optional GitHub release tag, e.g. v1.0.33.67")
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []

    manifest_path = ROOT / "manifest.json"
    if not manifest_path.is_file():
        errors.append("manifest.json missing")
        version = ""
    else:
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            version = str(manifest.get("appVersion") or "").strip()
        except Exception as exc:
            errors.append(f"manifest.json cannot be parsed: {exc}")
            version = ""

    if not version:
        errors.append("manifest appVersion missing")
    elif not re.fullmatch(r"\d+\.\d+\.\d+(?:\.\d+)?", version):
        warnings.append(f"unusual appVersion format: {version}")

    for rel in REQUIRED_MEMORY_FILES:
        if not exists(rel):
            errors.append(f"required project-memory file missing: {rel}")

    if version:
        for rel in VERSION_SYNC_FILES:
            if exists(rel) and version not in read_text(rel):
                errors.append(f"{rel} does not mention current appVersion {version}")

        release_notes = find_release_note(version)
        if not release_notes:
            errors.append(f"no release note found for {version}")

        acceptances = find_regression_acceptance(version)
        if not acceptances:
            errors.append(f"no regression acceptance found for {version}")
        else:
            if not any("PASS" in p.read_text(encoding="utf-8", errors="ignore") for p in acceptances):
                errors.append(f"regression acceptance for {version} does not contain PASS")

        if args.release_tag:
            tag_version = args.release_tag[1:] if args.release_tag.startswith("v") else args.release_tag
            if tag_version != version:
                errors.append(
                    f"release tag {args.release_tag} does not match manifest appVersion {version}"
                )

    if exists("project/PROJECT_INDEX_RU.md"):
        idx = read_text("project/PROJECT_INDEX_RU.md")
        for ref in INDEX_REQUIRED_REFERENCES:
            if ref not in idx:
                errors.append(f"PROJECT_INDEX_RU.md does not reference {ref}")

    if exists("project/DEPRECATED_BASELINES_RU.md"):
        deprecated = read_text("project/DEPRECATED_BASELINES_RU.md")
        for forbidden in (
            "LUBRICA_Setup_1.0.4_DESKTOP_UI.exe",
            "LUBRICA_RELEASE_1_0_4_DESKTOP_UI.zip",
        ):
            if forbidden not in deprecated:
                errors.append(f"deprecated baseline not preserved: {forbidden}")

    if exists("project/SITE_ENGINEERING_RULES_RU.md"):
        site = read_text("project/SITE_ENGINEERING_RULES_RU.md")
        for invariant in ("SNR ZLG", "SNR DLG", "Tröster", "Ferrari", "direct drive"):
            if invariant not in site:
                errors.append(f"site engineering invariant missing: {invariant}")

    print("LUBRICA PROJECT MEMORY AUDIT")
    print(f"root: {ROOT}")
    print(f"appVersion: {version or 'UNKNOWN'}")
    if args.release_tag:
        print(f"release tag: {args.release_tag}")
    print(f"required memory files: {len(REQUIRED_MEMORY_FILES)}")

    if warnings:
        print("\nWARNINGS:")
        for item in warnings:
            print(f"- {item}")

    if errors:
        print("\nFAIL:")
        for item in errors:
            print(f"- {item}")
        return 1

    print("\nPASS: project memory, version references, release note and regression acceptance are consistent.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
