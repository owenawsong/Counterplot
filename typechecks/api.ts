import { createSpec, evaluate, validateSpec, type Experiment } from '../src/engine.js';
import { renderExperiment } from '../src/render.js';
function typeChecksOnly() {
  const loan = createSpec('loan');
  const result = evaluate(loan, { extra: 200 });
  result.parameters.principal.toFixed(2);
  renderExperiment(loan);
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
