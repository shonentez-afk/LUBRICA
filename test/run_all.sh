#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Run every regression even when one fails. Any failed test still blocks packaging.
failures=0
run_test() {
  if "$@"; then
    :
  else
    status=$?
    failures=$((failures + 1))
    printf 'REGRESSION FAIL (%s): %s\n' "$status" "$*" >&2
  fi
}
echo '[1/99] JS syntax'
find . -name '*.js' -type f ! -path './vendor/*' -print | sort | while IFS= read -r f; do node --check "$f" >/dev/null; done
echo '[2/99] Preflight'; run_test python3 test/preflight.py
echo '[PROJECT MEMORY]'; run_test python3 test/project_memory_audit.py
echo '[PLANT POINT COMPLETION 1.0.33.69]'; run_test node test/test_release_1_0_33_69_plant_point_completion.js
echo '[PLANT POINT DECISIONS STAGE 2]'; run_test node test/test_release_1_0_33_69_candidate_decisions.js
echo '[TASK READINESS AND SAFE ANALOG STAGE 3]'; run_test node test/test_release_1_0_33_71_task_readiness_safe_analog.js
echo '[3/99] Database modules'; run_test node test/test_database_modules.js
echo '[4/99] Safe database/recovery'; run_test node test/test_safe_database.js
echo '[5/99] Classifier unit'; run_test node test/test_classifier.js
echo '[6/99] Classifier real data'; run_test node test/test_classifier_actual.js
echo '[7/99] Structured activities'; run_test node test/test_structured_activities.js
echo '[8/99] Candidate finalization'; run_test node test/test_candidate_finalization.js
echo '[9/99] Material/tool logic'; run_test node test/test_material_logic.js
echo '[10/99] Route + export + import'; run_test node test/test_route_engine.js; run_test node test/test_export_workbook.js; run_test node test/test_import_integration.js
echo '[11/99] Bearing Library'; run_test node test/test_bearing_library.js
echo '[12/99] Bearing Calculator'; run_test node test/test_bearing_calculator.js
echo '[13/99] Calculation Framework'; run_test node test/test_calculation_framework.js
echo '[14/99] Linear Bearing Calculator'; run_test node test/test_linear_bearing_calculator.js
echo '[15/99] Gearbox Oil Calculator'; run_test node test/test_gearbox_oil_calculator.js
echo '[16/99] Chain Calculator'; run_test node test/test_chain_calculator.js
echo '[17/99] Coupling Calculator'; run_test node test/test_coupling_calculator.js
echo '[18/99] Grease Point Calculator'; run_test node test/test_grease_point_calculator.js
echo '[19/99] Ball Screw Calculator'; run_test node test/test_ball_screw_calculator.js
echo '[20/99] Component Library'; run_test node test/test_component_library.js
echo '[21/99] Component Category Schemas'; run_test node test/test_component_category_schemas.js
echo '[22/99] Component Binding'; run_test node test/test_component_binding.js
echo '[23/99] Stage 8.11-8.14 calculators'; run_test node test/test_stage8_11_17.js
echo '[24/99] Stage 8.15-8.17 material/source/matcher'; run_test node test/test_material_source_matcher.js
echo '[25/99] Data transfer matrix'; run_test node test/test_data_transfer_matrix.js
echo '[26/99] Transfer UI/calculator contract'; run_test node test/test_transfer_ui_contract.js
echo '[27/99] Legacy binding rehydration'; run_test node test/test_legacy_binding_rehydrate.js
echo '[28/99] UX audit'; run_test python3 test/test_ux_audit.py
echo '[29/99] User workflow simulation'; run_test node test/test_user_workflow_simulation.js
echo '[30/99] Stage 9.0 operational routes'; run_test node test/test_stage9_routes.js
echo '[31/99] Stage 9.0 UX contract'; run_test python3 test/test_stage9_ux_contract.py
echo '[32/99] Stage 9.1 checklist engine'; run_test node test/test_stage9_1_checklists.js
echo '[33/99] Stage 9.1 UX contract'; run_test python3 test/test_stage9_1_ux_contract.py
echo '[34/99] Stage 9.1 lifecycle'; run_test node test/test_stage9_1_lifecycle.js
echo '[35/99] Stage 9.1 Excel checklist'; run_test node test/test_stage9_1_excel.js
echo '[36/99] Equipment-derived checklist quantity'; run_test node test/test_stage9_1_equipment_quantity.js
echo '[37/99] Stage 9.1.5 lifecycle matrix'; run_test node test/test_stage9_1_5_lifecycle_matrix.js
echo '[38/99] Stage 9.1.5 routes UX/UI audit'; run_test python3 test/test_stage9_1_5_routes_ui_audit.py
echo '[39/99] Stage 9.1.6 point queue engine'; run_test node test/test_stage9_1_6_route_queue.js
echo '[40/99] Stage 9.1.6 point queue UX/UI'; run_test python3 test/test_stage9_1_6_route_queue_ui.py
echo '[41/99] Stage 9.1.6 queue/lifecycle integration'; run_test node test/test_stage9_1_6_queue_lifecycle.js
echo '[42/99] Stage 9.1.7 route creation & routing'; run_test node test/test_stage9_1_7_route_creation.js
echo '[43/99] Stage 9.1.9 event-centric route integration'; run_test node test/test_stage9_1_9_event_centric.js
echo '[44/99] Stage 9.1.10 route editor UX'; run_test python3 test/test_stage9_1_10_route_editor_ux.py
echo '[45/99] Stage 9.1.11 route modal UI audit'; run_test python3 test/test_stage9_1_11_route_modal_ui.py
echo '[46/99] Stage 9.1.12 route UI rebuild'; run_test python3 test/test_stage9_1_12_route_ui_rebuild.py
echo '[47/99] Stage 9.1.13 route creation guard UI'; run_test python3 test/test_stage9_1_13_route_creation_guard_ui.py
echo '[48/99] Stage 9.1.14 transactional create wizard'; run_test python3 test/test_stage9_1_14_transactional_create_wizard.py
echo '[49/99] Stage 9.1.15 archived route library'; run_test node test/test_stage9_1_15_archive_routes.js; run_test python3 test/test_stage9_1_15_archive_routes.py
echo '[50/99] Stage 9.1.16 final route UX/UI + integration audit'; run_test python3 test/test_stage9_1_16_final_route_audit.py
echo '[51/99] Stage 9.2 working route sheet'; run_test python3 test/test_stage9_2_working_route_sheet.py
echo '[52/99] Stage 9.2.1 route preparation engine'; run_test node test/test_stage9_2_1_route_preparation.js
echo '[53/99] Stage 9.2.1 route preparation UX/UI'; run_test python3 test/test_stage9_2_1_route_preparation_ui.py
echo '[54/99] Stage 9.2.2 route revisions engine'; run_test node test/test_stage9_2_2_route_revisions.js
echo '[55/99] Stage 9.2.2 route revisions UX/UI'; run_test python3 test/test_stage9_2_2_route_revisions_ui.py
echo '[56/99] Planning engine'; run_test node test/test_stage9_3_route_planning.js
echo '[57/99] Planning UX/UI'; run_test python3 test/test_stage9_3_route_planning_ui.py
echo '[58/99] Revisions + planning UX'; run_test python3 test/test_stage9_3_1_revision_ppr_ux.py
echo '[59/99] Planning preview-state UX'; run_test python3 test/test_stage9_3_2_ppr_preview_state.py
echo '[60/99] Source XLSX audit'; run_test python3 test/test_source_xlsx_audit.py
echo '[61/99] Stage 9.4 execution fact engine'; run_test node test/test_stage9_4_execution_fact.js
echo '[62/99] Stage 9.4 execution fact UX/UI'; run_test python3 test/test_stage9_4_execution_fact_ux.py
echo '[63/99] Stage 9.4.1 plan/fact engine'; run_test node test/test_stage9_4_1_plan_fact.js
echo '[64/99] Stage 9.4.1 plan/fact UX/UI'; run_test python3 test/test_stage9_4_1_plan_fact_ux.py
echo '[65/99] Stage 9.4.2 FRV engine'; run_test node test/test_stage9_4_2_frv.js
echo '[66/99] Stage 9.4.2 FRV UX/UI'; run_test python3 test/test_stage9_4_2_frv_ux.py
echo '[67/99] Stage 9.5 route analytics engine'; run_test node test/test_stage9_5_route_analytics.js
echo '[68/99] Stage 9.5 route analytics UX/UI'; run_test python3 test/test_stage9_5_route_analytics_ux.py
echo '[69/99] Stage 9.6 management dashboard engine'; run_test node test/test_stage9_6_management_dashboard.js
echo '[70/99] Stage 9.6 management dashboard UX/UI'; run_test python3 test/test_stage9_6_management_dashboard_ux.py
echo '[71/99] Stage 9.6.1 dashboard navigation'; run_test python3 test/test_stage9_6_1_dashboard_navigation.py
echo '[72/99] Final UI baseline audit'; run_test python3 test/test_final_ui_baseline_audit.py
echo '[73/99] Final Excel package engine'; run_test node test/test_stage9_7_final_excel.js
echo '[74/99] Final Excel package UX/contract'; run_test python3 test/test_stage9_7_final_excel_ui.py
echo '[75/99] Program QA engine'; run_test node test/test_stage9_8_program_qa.js
echo '[76/99] Program QA UX/UI'; run_test python3 test/test_stage9_8_program_qa_ui.py
echo '[77/99] Unified Control navigation'; run_test python3 test/test_stage9_8_1_unified_control.py
echo '[78/99] Settings + interactive guide'; run_test python3 test/test_stage9_8_2_settings_guide.py
echo '[79/99] Material/tool marking + labels'; run_test python3 test/test_stage9_8_3_material_tool_labels.py
echo '[80/99] Interactive guide marking/labels'; run_test python3 test/test_stage9_8_4_guide_labels.py
echo '[81/99] Detailed interactive user guide'; run_test python3 test/test_stage9_8_5_detailed_guide.py
echo '[82/99] Symmetric Settings design'; run_test python3 test/test_stage9_8_7_settings_symmetric.py
echo '[83/99] Engineering defaults UI'; run_test python3 test/test_stage9_8_8_engineering_defaults_ui.py
echo '[84/99] Illustrated interactive guide'; run_test python3 test/test_stage9_8_6_illustrated_guide.py
echo '[85/99] Button text fit'; run_test python3 test/test_stage9_8_9_button_text_fit.py
echo '[86/99] RC database safety'; run_test node test/test_stage9_9_database_safety.js
echo '[87/99] RC recovery corruption'; run_test node test/test_stage9_9_recovery_corruption.js
echo '[88/99] RC repeat import'; run_test node test/test_stage9_9_repeat_import.js
echo '[89/99] RC large database performance'; run_test node test/test_stage9_9_large_database.js
echo '[90/99] RC Edge file protocol'; run_test python3 test/test_stage9_9_file_protocol.py
echo '[91/99] RC end-to-end contract'; run_test python3 test/test_stage9_9_e2e_contract.py
echo '[92/99] RC final UX/UI audit'; run_test python3 test/test_stage9_9_final_ux_ui.py; run_test node tests/test_release_1_0_33_51_oscillating_single_mode_ux.js; run_test node test/test_release_1_0_33_52_skf_bs2_2208.js; run_test node test/test_release_1_0_33_53_ukf211.js; run_test node test/test_release_1_0_33_54_fleet_bearing_library.js; run_test node test/test_release_1_0_33_54_bs2_migration.js; run_test node test/test_release_1_0_33_55_gearbox_tc_scope.js; run_test node test/test_release_1_0_33_56_bonfiglioli_c412_parser.js; run_test node test/test_release_1_0_33_57_gearbox_fleet_completion.js; run_test node test/test_release_1_0_33_58_persisted_gearbox_binding_migration.js; run_test node test/test_release_1_0_33_59_full_gearbox_oem_dataset.js; run_test node test/test_release_1_0_33_60_current_fleet_gearbox_oem.js; run_test node test/test_release_1_0_33_60_current_fleet_acceptance.js; run_test node test/test_release_1_0_33_61_legacy_bonfiglioli_fill.js; run_test node test/test_release_1_0_33_61_bonfiglioli_fleet_acceptance.js; run_test node test/test_release_1_0_33_62_bonfiglioli_apply_quantity_persistence.js; run_test node test/test_release_1_0_33_63_pp53736_constructor.js; run_test node test/test_release_1_0_33_63_pp53736_integration.js; run_test node test/test_release_1_0_33_64_pp53736_manual_parity.js; run_test node test/test_release_1_0_33_64_pp53736_manual_ui.js; run_test node test/test_release_1_0_33_65_pp53736_physical_bearing_positions.js; run_test node test/test_release_1_0_33_66_pp53736_gearbox_audit.js; run_test node test/test_release_1_0_33_67_pp53736_persistence_interval.js
echo '[RUNTIME HOUR PLANNING]'; run_test node test/test_release_1_0_33_68_runtime_hour_planning.js
echo '[PP-53736 FULL MACHINE]'; run_test node test/test_release_1_0_33_68_pp53736_full_machine_acceptance.js
echo '[93/99] RC final documentation'; run_test python3 test/test_stage9_9_docs.py
echo '[94/99] RC2 unified Control diagnostics'; run_test python3 test/test_stage9_9_rc2_control_diagnostics.py
echo '[95/99] Structure right panel interaction'; run_test node test/test_release_1_0_1_structure_detail_interaction.js
echo '[96/99] Structure detail static contract'; run_test python3 test/test_release_1_0_1_structure_detail_static.py
echo '[97/99] Release 1.0.2 branding'; run_test python3 test/test_release_1_0_2_branding.py
echo '[98/99] Release 1.0.4 integrated header brand'; run_test python3 test/test_release_1_0_4_integrated_header_brand.py
echo '[99/99] Release 1.0.5 internal guide actual screenshots'; run_test python3 test/test_release_1_0_5_internal_guide.py
echo '[CONVEYOR FAMILIES STAGE 5B]'; run_test node test/test_release_1_0_33_73_conveyor_families.js
run_test node test/test_release_1_0_33_74_conveyor_header.js
run_test node test/test_release_1_0_33_75_composite_conveyor_ui.js
echo '[CONVEYOR COVERAGE STAGE 5B.6]'; run_test node test/test_release_1_0_33_76_conveyor_coverage.js
echo '[CONVEYOR TWO-SHAFT PHYSICAL SUPPORTS STAGE 5B.9]'; run_test node test/test_release_1_0_33_77_two_shaft_support_guard.js
echo '[CONVEYOR FULL UI/UX STAGE 5B.12]'; run_test node test/test_release_1_0_33_78_conveyor_ui_ux.js
echo '[POINT ACCELERATION 5C: PHYSICAL COUNT, ANALOG, MASS SAFETY]'; run_test node test/test_stage5c_point_acceleration.js
echo '[SAW CUT + ROTATING PHYSICAL SHAFTS STAGE 5D]'; run_test node test/test_stage5d_saws_shafts.js
echo '[ROUTE SAFETY STAGE R1]'; run_test node test/test_route_safety_stage_r1.js
echo '[ROUTE EXECUTION STAGE R2]'; run_test node test/test_route_execution_compact_r2.js; run_test python3 test/test_route_execution_compact_r2_ui.py
echo '[ROUTE AUTO GROUPING R3A]'; run_test node test/test_route_auto_grouping_r3a.js
echo '[ROUTE INDIVIDUAL DUE R3B]'; run_test node test/test_route_due_r3b.js
echo '[ROUTE WORKLOAD AND PPR R4]'; run_test node test/test_route_workload_r4.js
echo '[ROUTE AUTOMATION R5]'; run_test node test/test_route_automation_r5.js
echo '[R6 REAL MODULES AND MASS ROUTES]'; run_test node test/test_route_r6_integration.js
echo '[R7 ROUTE ENGINE CONSOLIDATION]'; run_test node test/test_route_r7_consolidation.js
echo '[R8 LIVE PLANNING]'; run_test node test/test_route_r8_live_planning.js
echo '[R8.1 UNIFIED SCHEDULE]'; run_test node test/test_route_r81_unified_schedule.js
echo '[R8.2 CORE AUDIT AND ROUTE SETTINGS]'; run_test node test/test_route_r82_audit.js
if [ "$failures" -ne 0 ]; then
  printf 'REGRESSION FAILED: %s test commands failed\n' "$failures" >&2
  exit 1
fi
echo 'ALL INTEGRATION TESTS PASS'
