import { createSpec, evaluate, validateSpec, MODELS, type Experiment } from '../src/engine.js';
import { renderExperiment } from '../src/render.js';
import { sweep, sensitivity } from '../src/analysis.js';
function typeChecksOnly() {
  const loan = createSpec('loan');
  // @ts-expect-error Numerical constraints are deeply readonly.
  MODELS.bayes.controls.prevalence.min = -10;
  const result = evaluate(loan, { extra: 200 });
  result.parameters.principal.toFixed(2);
  renderExperiment(loan);
  sweep(loan, { axes: [{ parameter: 'extra', min: 0, max: 200, points: 3 }] });
  sensitivity(loan, { parameters: ['extra'], steps: { extra: 20 } });
  // @ts-expect-error Sweep coordinates must belong to the chosen model.
  sweep(loan, { axes: [{ parameter: 'rate', min: 0.1, max: 0.2, points: 3 }] });
  // @ts-expect-error Sensitivity parameter must belong to the chosen model.
  sensitivity(loan, { parameters: ['rate'] });
  const observed = createSpec('classification');
  observed.data.scores[0] = 0.7;
  evaluate(observed, { threshold: 0.3 });
  // @ts-expect-error A classification spec requires paired data.
  const noData: Experiment<'classification'> = {
    schemaVersion: 1,
    model: 'classification',
    title: 'x',
    description: 'x',
    parameters: { threshold: 0.5 },
  };
  void noData;
  // @ts-expect-error Wrong model parameter
  evaluate(loan, { rate: 0.2 });
  // @ts-expect-error Model names are bounded
  createSpec('anything');
  const invalid: Experiment<'loan'> = {
    schemaVersion: 1,
    model: 'loan',
    title: 'x',
    description: 'x',
    // @ts-expect-error Loan fields cannot be replaced with a learning rate
    parameters: { rate: 0.1 },
  };
  const checked = validateSpec(JSON.parse('{}'));
  if (checked.model === 'bayes') evaluate(checked, { specificity: 99.5 });
  void invalid;
}
void typeChecksOnly;
