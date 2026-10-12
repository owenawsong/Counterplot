# Experiment specification

The authoritative validator is `validateSpec` in `src/engine.js`. `schema/experiment.schema.json` is generated from the same control definitions for editor assistance. It follows JSON Schema draft 2020-12; cross-field relationships still require the engine validator.

| Field | Required | Meaning |
| --- | --- | --- |
| `schemaVersion` | yes | Exactly `1` |
| `model` | yes | `descent`, `loan`, `circuit`, `epidemic`, `bayes` |
| `title` | yes | Nonempty plain text, maximum 140 characters |
| `description` | yes | Nonempty plain text, maximum 1,200 characters |
| `parameters` | yes | Every parameter for this family, finite numeric values within its bounds |
| `scenarios` | no | At most eight named partial parameter overrides |

Run `node bin/counterplot.js inspect MODEL --json` to get labels, units, bounds, defaults, equations, references and assumptions. Parameters whose declared step is one are integers; other parameters accept finite values within bounds. Slider step is a UI increment, not a requirement that decimal input be aligned to a step grid.

Each scenario is `{ "name": "Plain text up to 80 characters", "parameters": { ... } }`. Overrides are merged onto the spec’s initial parameters, not onto whatever a viewer last changed. Scenarios may be empty. Unknown fields are rejected at every level. SIR initial infected count cannot exceed population, including within scenarios.

Specs are limited to 100 KB by the CLI reader and browser editor. JSON has no comments or function expressions. Units cannot be changed by writing a label. There is no custom formula, plugin, arbitrary HTML, Markdown rendering or remote asset field.

## Results

The pure engine returns version, model, effective parameters, metrics, primary chart series, optional secondary chart, table columns/rows, computed explanatory paragraphs and warnings. Undefined metric values are null. Chart x/y units appear in axis labels. Results are not accepted as inputs to the spec validator.

CLI result documents additionally wrap the validated spec, SHA-256 of `JSON.stringify(validatedSpec)`, and format version. The hash identifies this serialization; it is not a semantic canonical JSON hash. Browser result downloads contain effective inputs, pinned baseline and results without a hash. Browser “Save experiment” produces an ordinary valid spec with current inputs as defaults.

## A saved baseline

Pinning records inputs for the current model. It is an in-memory comparison and is lost on refresh. Reset restores initial inputs and preserves the pinned baseline. Applying a different spec clears it. Saved spec files do not include a baseline. Full result downloads include the baseline parameters for audit.

Comparison deltas are descriptive. If multiple inputs changed, a delta cannot isolate one cause. “Undefined” is not a number and produces no numerical delta.
