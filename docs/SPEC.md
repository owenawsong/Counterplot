# Experiment specification

The authoritative validator is `validateSpec` in `src/engine.js`. `schema/experiment.schema.json` is generated from the same control definitions for editor assistance. It follows JSON Schema draft 2020-12; cross-field relationships still require the engine validator.

| Field | Required | Meaning |
| --- | --- | --- |
| `schemaVersion` | yes | Exactly `1` |
| `model` | yes | `descent`, `loan`, `circuit`, `epidemic`, `bayes`, `classification` |
| `title` | yes | Nonempty plain text, maximum 140 characters |
| `description` | yes | Nonempty plain text, maximum 1,200 characters |
| `parameters` | yes | Every parameter for this family, finite numeric values within its bounds |
| `scenarios` | no | At most eight named partial parameter overrides |
| `data` | classification only | Required observed binary labels and scores for `classification`; forbidden in other models |

Run `node bin/counterplot.js inspect MODEL --json` to get labels, units, bounds, defaults, equations, references and assumptions. Parameters marked `integer` require whole numbers; other parameters accept finite values within bounds. Slider step is a UI increment, not a requirement that decimal input be aligned to a step grid.

Each scenario is `{ "name": "Plain text up to 80 characters", "parameters": { ... } }`. Overrides are merged onto the spec’s initial parameters, not onto whatever a viewer last changed. Scenarios may be empty. Unknown fields are rejected at every level. SIR initial infected count cannot exceed population, including within scenarios.

Specs are limited to 100 KB by the CLI reader and browser editor. JSON has no comments or function expressions. Units cannot be changed by writing a label. There is no custom formula, plugin, arbitrary HTML, Markdown rendering or remote asset field.

## Classification data

`data` is `{labels:[0,1,...], scores:[0.2,0.8,...], source?:"Plain source note"}`. Arrays must have equal length, between 2 and 2,000. Labels are numbers exactly 0 or 1. Scores are finite numbers in [0,1]; they need not be calibrated probabilities. No strings, coercion, sparse arrays or missing pairs are accepted. The optional source note is nonempty plain text up to 500 characters. The entire data payload is part of the canonical spec fingerprint.

The threshold is inclusive: `score >= threshold` predicts positive. ROC and PR ranking curves include one group per unique score, plus a null-threshold initial endpoint that represents predicting none. That endpoint is conceptual, not a finite user-selectable threshold. Data source notes are supplied claims, not verification that observations were independently collected or held out.

The factory and bundled example provide an explicitly authored fixture. Replace it with actual observations before interpreting results as model performance. See [model methodology](MODELS.md) and [analysis contracts](ANALYSIS.md).

## Results

The pure engine returns version, model, effective parameters, metrics with stable keys, primary chart series, optional secondary chart, table columns/rows, computed explanatory paragraphs and warnings. Undefined metric values are null. Chart x/y units appear in axis labels. Classification additionally returns counts, confusion cells, tied-group ROC/PR points, area summaries and the selected operating point. Results are not accepted as inputs to the spec validator.

CLI and browser result documents use the same envelope: format identifier/version, engine version, `engineSha256`, `specSha256`, validated spec and computed results. The spec fingerprint uses UTF-8 canonical JSON with recursively sorted object keys, preserved array order, and ordinary JSON number serialization. Optional undefined object values are omitted. The engine fingerprint is SHA-256 of the actual `src/engine.js` source with CRLF/CR normalized to LF; the HTML builder embeds that exact fingerprint alongside the bundled engine. Fingerprints identify data and code, not authorship or correctness. Browser hashing uses Web Crypto, available on localhost, HTTPS and supported local-file browser contexts. If unavailable, the JSON exporter reports an error instead of omitting provenance.

A browser download with a pinned baseline additionally contains `baseline`, a complete provenance envelope for those initial inputs. Without a baseline the browser and CLI use the same envelope schema, canonical spec fingerprint and engine fingerprint for the same effective spec and engine. JavaScript runtimes can differ at the last floating-point digits of functions such as `Math.exp`; raw result rows retain those values rather than pretending to be bit-identical across runtimes. Compare numerical outputs with model-appropriate tolerances, not full-result byte hashes. Browser “Save experiment” produces an ordinary valid spec with current inputs as defaults.

## A saved baseline

Pinning records inputs for the current model. It is an in-memory comparison and is lost on refresh. Reset restores initial inputs and preserves the pinned baseline. Applying a different spec clears it. Saved spec files do not include a baseline. Full result downloads include the baseline envelope for audit.

Comparison deltas are descriptive. If multiple inputs changed, a delta cannot isolate one cause. “Undefined” is not a number and produces no numerical delta.
