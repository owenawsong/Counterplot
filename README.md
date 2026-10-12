# Counterplot

### A calculation you can change—and send as one file.

**Explore the inputs. Map the outcomes. Keep the evidence.**

Counterplot turns a small JSON experiment into a complete interactive document: parameter controls, computed plots, baseline comparisons, local sensitivity, one- and two-parameter studies, numerical tables and reproducible exports. The document runs offline. The browser and CLI use the same numerical engine.

**Node 20+ to build · zero runtime dependencies · offline HTML · MIT**

[Start here](#your-first-experiment) · [Models](docs/MODELS.md) · [Parameter studies](docs/ANALYSIS.md) · [CLI](docs/CLI.md) · [Agent workflow](docs/AGENTS.md)

```text
    JSON SPEC                     INTERACTIVE FILE
    inputs + scenarios ──────► controls + plots + comparisons
    labeled scores             parameter grid + local sensitivity
                               exact values + methods + exports
                                          │
                                          ▼
                            browser · offline · static hosting
```

A learning rate can look fine at one curvature and fail at another. A classifier can rank examples well and still use a poor threshold. An extra loan payment changes interest and payoff time together. Counterplot lets a reader inspect those relationships and carry the calculation away.

## Your first experiment

```bash
git clone https://github.com/owenawsong/Counterplot.git
cd Counterplot
node bin/counterplot.js init descent --out experiment.json
node bin/counterplot.js build experiment.json --out experiment.html
```

**Open `experiment.html`.** No installation, account, API key, server or bundler is needed. Node builds the document; the exported document runs independently in a modern browser.

For the six-example gallery:

```bash
npm run build
npm start
# http://127.0.0.1:18872/
```

## Go beyond a slider

| Question | Tool |
| --- | --- |
| What changed from my starting point? | Pin a baseline; inspect overlays and numerical deltas |
| Where does this setting work? | Sweep one parameter and inspect sampled outcomes |
| How do two assumptions interact? | Run a two-parameter grid and select a heatmap cell |
| Which small changes matter here? | Measure local sensitivity with explicit perturbations |
| What does the calculation actually do? | Inspect steps, equations, units and raw rows |
| Can somebody reproduce this? | Export the spec, result envelope, study grid or complete interactive HTML |

<p><img src="assets/study-v2.png" width="100%" alt="Actual Counterplot workspace calculating 231 learning-rate and curvature combinations, with selectable heatmap cells, explicit color scale and study exports."></p>

Studies run in a local background worker so the interface remains usable. They capture their fixed inputs and report invalid or undefined points explicitly. Applying a point restores the captured inputs with that point's coordinates. Keyboard users can move between points with arrow keys and apply with Enter.

A “best sampled point” is the best point in your grid, not a proof of a global optimum. Sensitivity is local and depends on perturbation size and units. [Methods and limits →](docs/ANALYSIS.md)

## Bring your own classifier scores

The classification workspace accepts a local numeric CSV:

```csv
label,score
1,0.91
0,0.72
1,0.63
0,0.18
```

Change the decision threshold and inspect the **confusion matrix, precision, recall, F1, ROC curve, precision–recall curve, ROC AUC and average precision**. Sweep the threshold against an outcome you choose. Tied scores are grouped; zero denominators stay undefined; average precision uses its stepwise definition.

Labels must be 0/1 and scores between 0 and 1, with 2–2,000 observations. Scores need not be calibrated probabilities. The included dataset is **authored demonstration data**. Your imported data is processed locally and embedded in any experiment you save; nothing is uploaded.

## Six bounded model families

| Model | Inputs and questions | Calculation |
| --- | --- | --- |
| `classification` | Threshold and your labeled scores | Exact counts, grouped ROC/PR, rank AUC and average precision |
| `descent` | Step size, curvature, start, iterations | Gradient updates on a 2D positive quadratic |
| `loan` | Rate, term, principal and extra payments | Monthly amortization with capped final payment |
| `circuit` | Resistance, capacitance, voltages and direction | Analytical ideal RC step response |
| `epidemic` | Transmission, recovery and intervention timing | Illustrative SIR equations using fourth-order Runge–Kutta |
| `bayes` | Prevalence, sensitivity and specificity | Expected contingency counts and Bayes' theorem |

Each family declares its equations, units, bounds, assumptions and references. These are teaching and inspection models; applying them to real decisions requires the relevant domain assumptions and validation. [Model verification →](docs/MODELS.md)

## Repeat a study from the CLI

`examples/study-descent.json` varies learning rate and y-curvature, then selects the lowest sampled final objective:

```bash
node bin/counterplot.js sweep examples/descent.json \
  --config examples/study-descent.json --out grid.json

node bin/counterplot.js sensitivity examples/descent.json --out sensitivity.json
```

The report retains exact coordinates, statuses, warnings, objective, normalized spec and hashes of the numerical and analysis source. Browser exports use the same envelope. Grid exports also include CSV.

Use the pure engine and analysis functions in your own code:

```js
import { createSpec, evaluate } from './src/engine.js';
import { sweep } from './src/analysis.js';

const spec = createSpec('descent');
const study = sweep(spec, {
  axes: [{ parameter: 'rate', min: 0.02, max: 0.3, points: 29 }],
  metrics: ['final-objective'],
  objective: { metric: 'final-objective', direction: 'min' }
});
console.log(study.best, evaluate(spec).metrics);
```

Installed packages export the engine at `counterplot`, analysis at `counterplot/analysis`, and the Node HTML builder at `counterplot/render`. TypeScript declarations cover model parameters and study reports. [CLI and API reference →](docs/CLI.md)

## A numerical workshop for coding agents

Give your agent [the included skill](skills/counterplot/SKILL.md). It can inspect model contracts, author a spec, validate it, calculate a parameter study and build a document with actual values.

> Use Counterplot to show how learning rate and curvature interact. Include the stability boundary, run a bounded grid, inspect invalid points and export an interactive explanation with its assumptions visible.

Specs contain data and plain-text framing. They cannot execute formulas, inject HTML or fetch remote assets. The engine owns the calculation; the agent authors the explanation. Unknown fields, invalid parameters and unsupported relationships are rejected.

## Save the work, not just a picture

- **Interactive HTML:** current inputs and a pinned baseline, with the engine and worker embedded.
- **Experiment JSON:** validated source inputs and named scenarios.
- **Result JSON:** full values, inputs, canonical spec hash and engine-source fingerprint.
- **Study JSON/CSV:** sampled coordinates, outcomes, warnings and fixed inputs.
- **Chart SVG and print/PDF:** presentation exports alongside inspectable numbers.

Documents make no external runtime requests and include a hash-based Content Security Policy. No telemetry, hosted AI service or remote model dependency. The development server binds only to loopback; built files work with ordinary static hosting.

## Verification

```bash
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
npm run check
npm pack
```

Tests check analytic answers, numerical invariants and failure cases: optimizer recurrence, principal conservation, RC unit conversions, SIR population, Bayes denominators, tied classifier scores, one-class data, exact sweep coordinates, immutable inputs, sensitivity boundaries and bounded work. Integration checks cover CLI provenance, portable bundles, worker source, CSP hashes, schema parity and local server boundaries.

CI runs Node 20/24 on Linux and Windows. Floating-point results can differ in their final digits across JavaScript runtimes. Source fingerprints identify the included implementations; they are not an independent scientific audit.

## Contribute a calculation worth exploring

A new model needs a useful question, explicit assumptions, meaningful numerical checks and an example that reveals something when an input changes.

[Contributing](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Release checklist](docs/RELEASE.md) · [Security](SECURITY.md) · [MIT license](LICENSE)

Built by [Owen Song](https://github.com/owenawsong), a student developer working on machine learning and useful software.
