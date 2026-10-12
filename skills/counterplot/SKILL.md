---
name: counterplot
description: Build offline interactive numerical explanations and parameter studies with Counterplot's validated models, including classification thresholds and labeled scores.
---

# Counterplot

Make an explanation that readers can change and inspect. The numerical engine calculates results; author the question, framing and meaningful comparison scenarios.

## Locate the tool

Use the `counterplot` command if installed. In a source checkout, use `node bin/counterplot.js`. Do not assume an npm release exists. The minimum runtime is Node 20. No network, API key, model calls or dependency installation is needed to build.

## Workflow

1. Identify the question and choose a supported family. Run `counterplot inspect --json`, then `counterplot inspect MODEL --json`. Read the units, bounds and assumptions.
2. If the question is outside those models, explain the mismatch. Do not put a new formula or generated JavaScript into a spec, approximate an unrelated system with a convenient model, or label a teaching example as an empirical forecast.
3. Run `counterplot init MODEL --out experiment.json`. Edit the JSON title, description and inputs. Include two to four scenarios that reveal a meaningful difference. Scenario overrides always merge onto the initial inputs.
4. Run `counterplot validate experiment.json --json`. Repair invalid fields and relationships. Keep uncertainty or undefined events visible.
5. Run `counterplot export experiment.json --format json --out results.json`. Inspect actual metrics and selected rows. Check a known limiting case: zero-interest repayment, RC equilibrium, quadratic stability boundary, no-transmission SIR, or impossible Bayes conditioning.
6. State conclusions only for the engine's actual model and settings. Do not invent statistical uncertainty, real-world population baselines or causal claims.
7. For an interaction or sensitivity question, use `counterplot sweep experiment.json --config study.json --out grid.json` or `counterplot sensitivity experiment.json --out sensitivity.json`. Read `docs/ANALYSIS.md` for configuration. Inspect exact coordinates, undefined/invalid points, perturbation sizes and captured fixed inputs. A grid optimum is only the best sampled point; local slopes depend on units and perturbations.
8. Run `counterplot build experiment.json --out experiment.html`. Open it in the user's requested browser, or use the available browser skill. Check a scenario, pin a baseline, confirm plotted units and read the method section. If browser access is unavailable, report that limitation.
9. Deliver the HTML, original spec and optional raw result/study JSON. The HTML is standalone and works without the checkout. Explain the important assumption and the comparison readers should try first.

## Example tasks

### Why does my optimizer zigzag?

Use `descent` with `a=1`, `b=8`, `x=5`, `y=4`. Scenarios: rates `0.035`, `0.23`, `0.25`, `0.29`. The global stability threshold is `2/max(a,b)=0.25`. A boundary oscillation is different from divergence. Use the x/y path view to reveal alternating steep-coordinate updates. This is an exact quadratic demonstration, not a diagnosis of a particular neural-network training run.

### What changes when I overpay a loan?

Use `loan` with a declared principal, nominal annual interest rate and term. Start with no extra payment, then add a monthly amount. Compare total interest and actual payoff months. Explain excluded fees and rounding; do not recommend a financial decision from this model alone.

### How reliable is a positive result?

Use `bayes` with a hypothetical population and stated sensitivity/specificity. Vary prevalence. Inspect expected true and false positives. `P(positive | condition)` and `P(condition | positive)` are distinct quantities. A zero positive denominator produces `null`, not zero accuracy.

## Authoring constraints

For classification, supply real `data.labels` (0/1) and `data.scores` (0–1), with 2–2,000 matching observations, or clearly label the authored example as demonstration data. Scores need not be calibrated probabilities. The browser accepts local numeric `label,score` CSV. Retain one-class/zero-denominator metrics as undefined. Explain whether an outcome uses a decision threshold or a full ranking; ROC AUC and average precision do not change merely by moving the threshold.

- Top-level keys: schemaVersion, model, title, description, parameters, optional scenarios; classification also requires data.
- Full parameters are required; scenario parameters are partial.
- Input units are fixed. Use `inspect` rather than guessing scale or bounds.
- Titles and descriptions are escaped plain text.
- No custom HTML, executable formulas, remote assets or arbitrary renderer plugins. Classification accepts validated numeric data embedded in the spec.
- Keep written framing accurate if readers change parameters. Computed explanation paragraphs adapt automatically.
- `--force` explicitly replaces an output. Choose an unused filename unless replacing it is intended.

See `docs/AGENTS.md` for a worked transcript and `docs/MODELS.md` for verification details.
