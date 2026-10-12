# Changelog

## 0.2.0

- Classification threshold workspace with local numeric CSV, confusion counts, tied-score ROC/PR curves, ROC AUC and average precision.
- Bounded one- and two-parameter studies, exact sampled coordinates, invalid/undefined statuses and optional sampled objectives.
- Local sensitivity with explicit perturbations, units, boundary methods and undefined-baseline handling.
- Background worker studies, sampled-point application, keyboard grid navigation and cancellation when an experiment changes.
- Study JSON/CSV with frozen inputs and numerical/analysis source fingerprints; matching CLI `sweep` and `sensitivity` commands.
- Standalone interactive export retains current inputs and a pinned baseline, recalculating its policy hash.
- Rebuilt six-model gallery and analysis workspace; improved small-number display and precision–recall step geometry.
- Dense-array validation, exact work budgeting and regression checks for parser-normalized policy hashes.

## 0.1.0

- Five bounded numerical model families with explicit units and assumptions.
- Portable interactive HTML: baseline overlays, scenario buttons, playback, trajectory view, editable specs, responsive SVG plots and numerical tables.
- CLI init, inspect, validate, build, export, compare and loopback serve.
- CSV, provenance JSON, chart SVG and print/PDF exports.
- Agent skill, schema, documented equations and numerical/integration checks.
- MIT source and a static demonstration gallery.
- Deeply immutable model definitions, explicit no-transition RC timing, and matching browser/CLI provenance with canonical spec and actual engine-source SHA-256 fingerprints.
