# Architecture

```
question → bounded JSON spec → validate → pure numerical engine
                                      ↙                   ↘
                           versioned JSON/CSV       standalone HTML
                                                     same engine
                                                     controls + SVG
```

## Source map

- `src/engine.js`: model definitions, authoritative validator, calculations and CSV.
- `src/analysis.js`: metric catalogs, bounded grids and local sensitivity; no browser/Node dependencies.
- `src/schema.js`: editor JSON Schema generated from model controls.
- `src/source.js`: Node source fingerprint, normalized to LF for cross-platform consistency.
- `src/render.js`: Node-only HTML generation, escaping, safe script serialization and CSP hashes.
- `web/app.js`: browser interaction, comparison, playback, edit dialog and exports.
- `web/study.js`: worker lifecycle, frozen study inputs, grid/sensitivity views, numeric CSV import and interactive export.
- `web/style.css`: responsive visual system, keyboard focus, print and reduced-motion styles.
- `bin/counterplot.js`: CLI, atomic output, provenance and restricted local server.
- `scripts/build-gallery.js`: deterministic gallery and individual standalone example pages.
- `test/`: analytic/numerical invariants, error handling and integration/security boundaries.

The builder embeds the exact engine source after removing ESM export keywords. There are no imported modules in the output. The browser retains the pure validation/evaluation functions. A generated document is an executable artifact built from trusted package code plus inert validated JSON; untrusted JavaScript is never accepted through a spec.

Inline CSS and script bytes are normalized to the HTML parser's LF form and pinned with SHA-256 in a meta Content Security Policy. External resource loading is denied. Document text is escaped; embedded JSON escapes `<` and Unicode line separators. Export downloads use Blob URLs. Parameter studies use a fixed local Blob worker with the same embedded engine and analysis code; only `sweep` and `sensitivity` actions are accepted. There is no server request on parameter changes. Saving an interactive file embeds current validated inputs and the pinned baseline, then recomputes the script policy hash.

Model definitions, controls, assumptions and references are deeply frozen. They are exposed for inspection but cannot be changed by callers to weaken numeric bounds. Browser/CLI exports share canonical spec serialization and one provenance envelope; source fingerprints and spec fingerprints remain separate from the document's CSP hashes.

SIR has a bounded number of RK4 steps; all models cap inputs, iterations and exported rows. These bounds protect interactivity and encode teaching scope. They are not necessarily natural physical limits.

## Extending a model

A new family needs a control definition, validation relations where applicable, pure deterministic calculator, explainable output, numerical invariants, a spec example and methodological documentation. It must not accept formula source text for dynamic execution. Keep metric labels and units stable: `compare` aligns metrics within a family by position.

The supported calculations are intentionally bounded. It does not parse symbolic expressions, solve arbitrary ODE systems or infer models from prose. Supporting those would require substantially different validation, dimensional analysis and verification.
