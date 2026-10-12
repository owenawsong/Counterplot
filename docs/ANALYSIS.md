# Bounded sweeps and finite perturbations

Counterplot analyses call the same validated numerical models as individual experiments. They do not invent chart values, fit a response surface or guarantee a global optimum. Inputs, sampled coordinates, selected metrics, invalid combinations and undefined values are explicit.

```js
import {createSpec} from 'counterplot';
import {sweep, sensitivity, metricCatalog} from 'counterplot/analysis';
const spec=createSpec('descent');
console.log(metricCatalog(spec));
const sampled=sweep(spec, {
  axes:[{parameter:'rate',min:0.005,max:0.3,points:25}],
  metrics:['final-objective'],
  objective:{metric:'final-objective',direction:'min'}
});
const local=sensitivity(spec, {
  parameters:['rate'], steps:{rate:0.005}, metrics:['final-objective']
});
```

## Metric identity

Two-parameter heatmaps offer linear or signed-log color. Automatic mode compresses ranges spanning at least three orders of magnitude in nonzero absolute values, using `sign(v) × log1p(abs(v)/smallestNonzeroAbs)`. The active scale and value endpoints are labeled. This changes color only; sampled outcomes, objectives, tooltips and exported values are unchanged.

Each engine metric has a stable `key` alongside its display label, numeric value, unit and digits. Analyses accept keys or exact labels and return keys. `metricCatalog(spec)` provides `{key,label,unit}` records. Unknown or duplicated metrics are errors. Metric values can be `null`; undefined values are never converted into zero or ranked as good outcomes.

Examples: `final-objective`, `interest-paid`, `payoff-time`, `time-constant`, `peak-infectious`, `condition-given-positive`; classification uses `accuracy`, `precision`, `recall`, `f1`, `roc-auc`, `average-precision`.

## One- or two-dimensional sweeps

`sweep(spec, {axes, metrics?, objective?})`.

Each axis is `{parameter, min, max, points}`. Bounds must satisfy `min < max`, within that parameter's declared domain. Endpoints are included. For continuous parameters interior coordinates are equally spaced in the parameter's original units. For integer parameters coordinates are rounded to distinct integers; the returned `values` array is authoritative, and spacing may differ by one. Bounds must be integers and enough integer coordinates must exist. Requested floating grids that collapse into duplicate coordinates are rejected.

For two axes the second-axis index is the outer loop and first-axis index is the inner loop. Each row includes `gridIndex`, exact `coordinates`, selected metric `values`, `status` and `warnings`.

- `ok`: all selected metrics are defined.
- `undefined`: the model evaluated but at least one selected metric is undefined.
- `invalid`: that parameter combination violates a coupled domain rule. Selected values are null and validation issues are retained.

The result includes axis definitions/values, metric definitions, `cells`, `invalidCells`, `undefinedCells` and warnings. Other model inputs stay fixed at `parameters` in the supplied spec. Data stays fixed too, so classification sweeps vary only its decision threshold.

### A best sampled point

Optional `objective:{metric,direction:'min'|'max'}` must choose one requested metric. The result's `best` contains the metric, direction, value, coordinates, grid index and number of exact ties; null means no defined objective value was available. Invalid cells are excluded. A row with an undefined different metric can still supply a defined objective.

This is exhaustive sampling **of the requested finite grid**. It is not continuous optimization and can miss an optimum between points, behavior outside bounds, or narrow unstable regions. The first point in traversal order wins an exact tie. Choosing a classifier threshold using the same labels is tuning; use independent data to estimate final performance.

### Compute budget

At most 201 coordinates per axis, 625 total cells and 2,000,000 estimated work units. These are practical computation limits, not scientific accuracy criteria or time guarantees. The estimate includes one baseline/catalogue evaluation and the iteration/horizon or score-sorting cost at each actual sampled coordinate. Sensitivity counts each distinct attempted endpoint at its own horizon. Reduce points, observation horizon or data size when rejected. Returned `estimatedWork` records the estimate. Analyses keep selected scalar metrics per cell, not a full trajectory at every cell. The browser runs studies in a local worker to keep input controls responsive.

## Finite-difference sensitivity

`sensitivity(spec, {parameters?, steps?, metrics?})`.

By default all model parameters and metrics are inspected, using each parameter's declared slider step. You can select a subset and provide an explicit positive step in the parameter's native unit. Integer parameters require integer steps. Steps cannot exceed the parameter span and must be large enough to avoid meaningless floating-point perturbations: at least the larger of span × 10⁻⁹ and 8 × machine epsilon × max(1, abs(center)).

Lower/upper coordinates are `max(minBound, center−step)` and `min(maxBound, center+step)`. Each endpoint records its actual coordinate, status and warnings. If a coupled domain relationship makes an endpoint invalid, the other valid endpoint and baseline support a one-sided comparison. If neither is usable, estimates are null.

Methods:

| Method | Comparison |
| --- | --- |
| `central` | Symmetric valid lower and upper coordinates |
| `secant` | Both valid, with unequal distances after boundary clipping |
| `forward` | Baseline to valid upper coordinate |
| `backward` | Valid lower coordinate to baseline |
| `unavailable` | No distinct valid endpoint |

For each selected metric: `slope = deltaOutput/deltaInput`. The result records baseline, lower and upper values and actual deltas. Units are metric units per parameter unit. `elasticity = slope × center / baselineMetric`, a local dimensionless relative-change ratio; it is null when the input baseline is zero, or the metric baseline is zero or undefined, because a relative change has no nonzero baseline.

An undefined center metric sets `baselineDefined:false`, `status:'undefined-baseline'` and a null local `slope`. An endpoint comparison can still exist as `endpointSlope`; it is a finite secant between endpoints, not a derivative at the undefined center. Row and study warnings expose this distinction.

## CLI and portable workbench

```bash
counterplot sweep experiment.json --config study.json --out sampled.json
counterplot sensitivity experiment.json --out sensitivity.json
```

The CLI and browser export `counterplot-analysis` envelopes with the frozen effective spec, options, exact results and SHA-256 fingerprints for both numerical modules. A grid CSV carries sampled coordinates and invalid/undefined status. The browser can apply a sampled point with its captured fixed inputs, and download a standalone interactive file containing current inputs and a pinned baseline. Classification CSV import accepts two numeric columns, `label,score`; it validates the entire dataset before applying it and clears the previous baseline.

These are explicit finite perturbations. They are not verified derivatives, uncertainty estimates, causal effects or significance tests. Decision thresholds and integer inputs are discontinuous; a slope can be zero simply because no observation crosses the sampled thresholds. Pick steps intentionally and compare more than one step size when interpretation matters.

## Verification

Tests compare sweep cells directly with model evaluation, exact RC slopes/elasticity, objective/grid consistency, integer coordinates, domain failures, null values, ties, boundary handling and compute limits. Classification areas are checked against hand calculations and an independent pairwise AUC identity. Floating-point tolerances are retained; source/data fingerprints identify a calculation, not mathematical infallibility.
