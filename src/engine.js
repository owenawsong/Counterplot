/** Pure, shared numerical engine. No DOM, dependencies, network, or expression evaluation. */
export const VERSION = '0.2.0';
const control = (label, unit, min, max, step, value, help) => ({
  label,
  unit,
  min,
  max,
  step,
  integer: step === 1 || unit === 'people',
  value,
  help,
});
function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') deepFreeze(child);
  }
  return Object.freeze(value);
}
export const MODELS = deepFreeze({
  classification: {
    label: 'Classification thresholds',
    field: 'Real-data analysis',
    question: 'What does this classifier trade away when its threshold changes?',
    formula:
      'predicted positive ⇔ score ≥ threshold · precision = TP/(TP+FP) · recall = TP/(TP+FN)',
    controls: {
      threshold: control(
        'Decision threshold',
        'score',
        0,
        1,
        0.01,
        0.5,
        'Inclusive cutoff: scores equal to the threshold are predicted positive.',
      ),
    },
    assumptions: [
      'Binary observed labels (0/1) and finite scores in [0,1]; scores need not be calibrated probabilities.',
      'Metrics describe the supplied observations. No independence, representativeness or held-out evaluation is verified.',
      'ROC/PR points add equal-score groups together. Average precision uses a step integral, not trapezoidal PR area.',
      'Undefined denominators remain null. Choosing a threshold on these labels is tuning, not an unbiased final evaluation.',
    ],
    references: [
      {
        label: 'scikit-learn · Model evaluation: classification metrics',
        url: 'https://scikit-learn.org/stable/modules/model_evaluation.html#classification-metrics',
      },
    ],
  },
  descent: {
    label: 'Gradient descent',
    field: 'Machine learning',
    question: 'When does a bigger step stop being a better step?',
    formula: 'f(x, y) = ½(a x² + b y²) · zₖ₊₁ = zₖ − η∇f(zₖ)',
    controls: {
      rate: control(
        'Learning rate',
        '',
        0.005,
        1,
        0.005,
        0.12,
        'Step size η. Stability depends on the largest curvature.',
      ),
      a: control('Curvature along x', '', 0.2, 12, 0.1, 1, 'Positive quadratic coefficient a.'),
      b: control('Curvature along y', '', 0.2, 12, 0.1, 8, 'Positive quadratic coefficient b.'),
      x: control('Starting x', '', -10, 10, 0.1, 5, 'Initial coordinate on the x axis.'),
      y: control('Starting y', '', -10, 10, 0.1, 4, 'Initial coordinate on the y axis.'),
      steps: control(
        'Iterations',
        '',
        1,
        250,
        1,
        50,
        'Maximum number of gradient updates; integer.',
      ),
    },
    assumptions: [
      'A positive definite, axis-aligned quadratic, not a neural-network loss.',
      'Full-batch exact gradients. No noise, momentum, or optimizer adaptation.',
      'Updates stop if the objective exceeds 10¹²; a diverging trace is deliberately not clipped into a success.',
    ],
    references: [
      {
        label: 'Boyd & Vandenberghe · Convex Optimization, §9.3',
        url: 'https://web.stanford.edu/~boyd/cvxbook/',
      },
    ],
  },
  loan: {
    label: 'Loan repayment',
    field: 'Everyday mathematics',
    question: 'What does an extra payment actually change?',
    formula: 'M = P r / [1 − (1 + r)⁻ⁿ] · Bₖ₊₁ = Bₖ(1 + r) − paymentₖ',
    controls: {
      principal: control(
        'Principal',
        'currency units',
        100,
        1000000,
        100,
        250000,
        'An abstract currency; no exchange-rate assumption.',
      ),
      apr: control(
        'Nominal annual rate',
        '%',
        0,
        30,
        0.1,
        6,
        'Monthly rate = nominal annual rate / 12. Not effective APR including fees.',
      ),
      years: control(
        'Term',
        'years',
        1,
        40,
        1,
        30,
        'Contract term with twelve payments per year; integer.',
      ),
      extra: control(
        'Extra monthly payment',
        'currency units',
        0,
        10000,
        10,
        200,
        'Added to the scheduled payment; the final payment is capped at the amount due.',
      ),
    },
    assumptions: [
      'Fixed nominal interest rate, monthly compounding, end-of-month payments.',
      'No fees, insurance, taxes, missed payments, penalties or changing interest rates.',
      'Full floating-point arithmetic rather than lender-specific cent rounding. Educational scenario, not a quote.',
    ],
    references: [
      {
        label: 'OpenStax · Finance: amortization',
        url: 'https://openstax.org/books/principles-finance/pages/8-2-analyzing-an-annuity',
      },
    ],
  },
  circuit: {
    label: 'RC charging',
    field: 'Electronics',
    question: 'How long does a capacitor really take to charge?',
    formula: 'τ = RC · V(t) = Vₛ + (V₀ − Vₛ)e⁻ᵗ/τ · I(t) = [Vₛ − V(t)] / R',
    controls: {
      resistance: control(
        'Resistance',
        'kΩ',
        0.1,
        100,
        0.1,
        10,
        'Converted to ohms before calculation.',
      ),
      capacitance: control(
        'Capacitance',
        'µF',
        1,
        1000,
        1,
        100,
        'Converted to farads before calculation.',
      ),
      supply: control('Supply voltage', 'V', 0.1, 24, 0.1, 5, 'Ideal constant voltage source.'),
      initial: control(
        'Initial capacitor voltage',
        'V',
        0,
        24,
        0.1,
        0,
        'Can exceed the supply: the current is then negative.',
      ),
      duration: control(
        'Observe for',
        'time constants',
        1,
        10,
        0.5,
        5,
        'Observation window in multiples of τ.',
      ),
    },
    assumptions: [
      'Ideal resistor and capacitor with a constant source and no load.',
      'An analytical exponential solution, not a SPICE simulation.',
      'The time axis scales with RC; changing R or C changes actual seconds, not the fraction reached at the same number of time constants.',
    ],
    references: [
      {
        label: 'OpenStax · University Physics: RC circuits',
        url: 'https://openstax.org/books/university-physics-volume-2/pages/10-6-rc-circuits',
      },
    ],
  },
  epidemic: {
    label: 'SIR dynamics',
    field: 'Dynamical systems',
    question: 'How much can an earlier intervention change the curve?',
    formula: 'S′ = −βSI/N · I′ = βSI/N − γI · R′ = γI',
    controls: {
      population: control(
        'Population',
        'people',
        100,
        1000000,
        100,
        10000,
        'Closed, homogeneous population; integer.',
      ),
      infected: control(
        'Initially infected',
        'people',
        1,
        1000,
        1,
        10,
        'Must not exceed population; integer.',
      ),
      beta: control(
        'Transmission coefficient',
        'day⁻¹',
        0.01,
        1,
        0.01,
        0.3,
        'Contacts and transmission represented by one constant coefficient.',
      ),
      recovery: control(
        'Mean infectious period',
        'days',
        1,
        30,
        1,
        10,
        'γ is the reciprocal of this value.',
      ),
      intervention: control(
        'Intervention starts',
        'day',
        0,
        180,
        1,
        30,
        'At this day β is multiplied by (1 − reduction/100).',
      ),
      reduction: control(
        'Transmission reduction',
        '%',
        0,
        100,
        1,
        40,
        'Instantaneous, permanent reduction in the coefficient.',
      ),
      days: control(
        'Observation horizon',
        'days',
        10,
        365,
        1,
        180,
        'Integer number of days; not an automatic final-size calculation.',
      ),
    },
    assumptions: [
      'Teaching model of a closed homogeneous population, not a calibrated disease forecast.',
      'No births, deaths, waning immunity, latency, demographics or stochastic events.',
      'RK4 integration with maximum internal step 0.1 day, split exactly at the intervention. Fractional people are expected in this deterministic model.',
    ],
    references: [
      {
        label: 'Kermack & McKendrick (1927) · Original SIR formulation',
        url: 'https://doi.org/10.1098/rspa.1927.0118',
      },
    ],
  },
  bayes: {
    label: 'A positive test',
    field: 'Probability',
    question: 'A 99% specific test is positive. How sure should you be?',
    formula:
      'P(condition | +) = sensitivity × prevalence / [sensitivity × prevalence + (1 − specificity) × (1 − prevalence)]',
    controls: {
      prevalence: control(
        'Prevalence',
        '%',
        0.01,
        99.99,
        0.01,
        1,
        'Share of the tested population with the condition.',
      ),
      sensitivity: control(
        'Sensitivity',
        '%',
        0,
        100,
        0.1,
        95,
        'Probability of a positive result given the condition.',
      ),
      specificity: control(
        'Specificity',
        '%',
        0,
        100,
        0.1,
        99,
        'Probability of a negative result without the condition.',
      ),
      population: control(
        'Illustrative population',
        'people',
        100,
        1000000,
        100,
        10000,
        'Expected counts scale with population; probabilities do not.',
      ),
    },
    assumptions: [
      'Known, constant sensitivity and specificity for this hypothetical tested population.',
      'Counts are expectations, possibly fractional; they are not sampled individuals.',
      'No inference about an individual, real diagnostic test, or repeated correlated tests. Undefined conditional probabilities remain undefined.',
    ],
    references: [
      {
        label: 'OpenStax · Conditional probability',
        url: 'https://openstax.org/books/introductory-statistics-2e/pages/3-2-independent-and-mutually-exclusive-events',
      },
    ],
  },
});

export class SpecError extends Error {
  constructor(issues) {
    super(issues.join('\n'));
    this.name = 'SpecError';
    this.issues = issues;
  }
}
const object = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exact = (value, allowed, path, issues) => {
  if (!object(value)) {
    issues.push(`${path}: expected an object`);
    return false;
  }
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) issues.push(`${path}.${key}: unknown field`);
  return true;
};
const textField = (value, path, max, issues) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    issues.push(`${path}: expected nonempty text up to ${max} characters`);
};
function checkParameters(model, parameters, path, issues, partial = false) {
  if (!exact(parameters, Object.keys(model.controls), path, issues)) return;
  for (const [key, c] of Object.entries(model.controls)) {
    if (partial && !Object.hasOwn(parameters, key)) continue;
    const value = parameters[key];
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < c.min ||
      value > c.max ||
      (c.integer && !Number.isInteger(value))
    ) {
      issues.push(
        `${path}.${key}: expected ${c.integer ? 'integer' : 'finite number'} in [${c.min}, ${c.max}]`,
      );
    }
  }
}
function engineSparseIndex(array) {
  for (let index = 0; index < array.length; index++) {
    if (!Object.hasOwn(array, index)) return index;
  }
  return -1;
}
export function validateSpec(spec) {
  const issues = [];
  if (
    !exact(
      spec,
      ['schemaVersion', 'model', 'title', 'description', 'parameters', 'scenarios', 'data'],
      'spec',
      issues,
    )
  )
    throw new SpecError(issues);
  if (spec.schemaVersion !== 1) issues.push('spec.schemaVersion: expected 1');
  const model =
    typeof spec.model === 'string' && Object.hasOwn(MODELS, spec.model) ? MODELS[spec.model] : null;
  if (!model) issues.push(`spec.model: choose ${Object.keys(MODELS).join(', ')}`);
  textField(spec.title, 'spec.title', 140, issues);
  textField(spec.description, 'spec.description', 1200, issues);
  if (model) checkParameters(model, spec.parameters, 'spec.parameters', issues);
  if (spec.model === 'classification') checkClassificationData(spec.data, issues);
  else if (Object.hasOwn(spec, 'data'))
    issues.push('spec.data: only classification accepts observed data');
  if (spec.scenarios !== undefined) {
    if (!Array.isArray(spec.scenarios) || spec.scenarios.length > 8)
      issues.push('spec.scenarios: expected at most eight scenarios');
    else if (engineSparseIndex(spec.scenarios) !== -1)
      issues.push(
        `spec.scenarios[${engineSparseIndex(spec.scenarios)}]: sparse array slot is missing`,
      );
    else
      spec.scenarios.forEach((scenario, i) => {
        if (!exact(scenario, ['name', 'parameters'], `spec.scenarios[${i}]`, issues)) return;
        textField(scenario.name, `spec.scenarios[${i}].name`, 80, issues);
        if (model)
          checkParameters(
            model,
            scenario.parameters,
            `spec.scenarios[${i}].parameters`,
            issues,
            true,
          );
        if (model && object(scenario.parameters))
          checkRelations(
            spec.model,
            { ...spec.parameters, ...scenario.parameters },
            `spec.scenarios[${i}]`,
            issues,
          );
      });
  }
  if (model && object(spec.parameters))
    checkRelations(spec.model, spec.parameters, 'spec.parameters', issues);
  if (issues.length) throw new SpecError(issues);
  return structuredClone(spec);
}
function checkRelations(model, p, path, issues) {
  if (model === 'epidemic' && p.infected > p.population)
    issues.push(`${path}: infected must not exceed population`);
}
function checkClassificationData(data, issues) {
  if (!exact(data, ['labels', 'scores', 'source'], 'spec.data', issues)) return;
  for (const key of ['labels', 'scores']) {
    if (!Array.isArray(data[key]) || data[key].length < 2 || data[key].length > 2000) {
      issues.push(`spec.data.${key}: expected an array of 2..2000 observations`);
      continue;
    }
    const missingIndex = engineSparseIndex(data[key]);
    if (missingIndex !== -1) {
      issues.push(`spec.data.${key}[${missingIndex}]: sparse array slot is missing`);
      continue;
    }
    for (const [i, value] of data[key].entries()) {
      if (
        key === 'labels'
          ? value !== 0 && value !== 1
          : typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1
      ) {
        issues.push(
          `spec.data.${key}[${i}]: expected ${key === 'labels' ? 'binary label 0 or 1' : 'finite score in [0,1]'}`,
        );
      }
    }
  }
  if (
    Array.isArray(data.labels) &&
    Array.isArray(data.scores) &&
    data.labels.length !== data.scores.length
  ) {
    issues.push('spec.data: labels and scores must have the same length');
  }
  if (data.source !== undefined) textField(data.source, 'spec.data.source', 500, issues);
}
export function createSpec(model = 'descent') {
  if (typeof model !== 'string' || !Object.hasOwn(MODELS, model))
    throw new SpecError([`Unknown model: ${model}`]);
  const definition = MODELS[model];
  const spec = {
    schemaVersion: 1,
    model,
    title: definition.question,
    description: `An interactive ${definition.label.toLowerCase()} experiment. Change one assumption and compare the result.`,
    parameters: Object.fromEntries(
      Object.entries(definition.controls).map(([k, c]) => [k, c.value]),
    ),
  };
  if (model === 'classification')
    spec.data = {
      labels: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      scores: [
        0.94, 0.82, 0.81, 0.76, 0.73, 0.65, 0.62, 0.6, 0.58, 0.55, 0.55, 0.49, 0.44, 0.4, 0.35,
        0.31, 0.26, 0.18, 0.12, 0.07,
      ],
      source: 'Authored teaching fixture, not measured predictions from a trained model.',
    };
  return spec;
}
const metric = (label, value, unit = '', digits = 2) => ({
  key: label
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
  label,
  value,
  unit,
  digits,
});
const line = (name, points, unit = '') => ({ name, points, unit });
const fmt = (n, digits = 2) =>
  n === null ? 'undefined' : Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
export function evaluate(spec, overrides = {}) {
  const clean = validateSpec(spec);
  const issues = [];
  const model = MODELS[clean.model];
  checkParameters(model, overrides, 'overrides', issues, true);
  const p = { ...clean.parameters, ...overrides };
  checkRelations(clean.model, p, 'overrides', issues);
  if (issues.length) throw new SpecError(issues);
  const result = calculators[clean.model](p, clean.data);
  return { engineVersion: VERSION, model: clean.model, parameters: p, ...result };
}
function classificationCalculation(p, data) {
  const ratio = (a, b) => (b === 0 ? null : a / b);
  const percent = (value) => (value === null ? null : value * 100);
  const confusion = { tp: 0, fp: 0, tn: 0, fn: 0 };
  const rows = data.labels.map((label, index) => {
    const score = data.scores[index],
      predicted = score >= p.threshold ? 1 : 0;
    const outcome = label === 1 ? (predicted === 1 ? 'TP' : 'FN') : predicted === 1 ? 'FP' : 'TN';
    confusion[outcome.toLowerCase()]++;
    return { observation: index + 1, label, score, predicted, outcome };
  });
  const positives = confusion.tp + confusion.fn,
    negatives = confusion.tn + confusion.fp;
  const precision = ratio(confusion.tp, confusion.tp + confusion.fp),
    recall = ratio(confusion.tp, positives);
  const f1 = ratio(2 * confusion.tp, 2 * confusion.tp + confusion.fp + confusion.fn);
  const fpr = ratio(confusion.fp, negatives);
  const ordered = rows.slice().sort((a, b) => b.score - a.score);
  let tp = 0,
    fp = 0,
    auc = positives && negatives ? 0 : null,
    ap = positives ? 0 : null,
    previousRecall = 0,
    previousFpr = 0;
  const roc = [{ threshold: null, fpr: negatives ? 0 : null, tpr: positives ? 0 : null }];
  const pr = [{ threshold: null, recall: positives ? 0 : null, precision: null }];
  for (let start = 0; start < ordered.length; ) {
    let end = start;
    while (end < ordered.length && ordered[end].score === ordered[start].score) {
      if (ordered[end].label === 1) tp++;
      else fp++;
      end++;
    }
    const currentRecall = ratio(tp, positives),
      currentFpr = ratio(fp, negatives),
      currentPrecision = ratio(tp, tp + fp);
    roc.push({ threshold: ordered[start].score, fpr: currentFpr, tpr: currentRecall });
    pr.push({
      threshold: ordered[start].score,
      recall: currentRecall,
      precision: currentPrecision,
    });
    if (auc !== null) auc += ((currentFpr - previousFpr) * (currentRecall + previousRecall)) / 2;
    if (ap !== null) ap += (currentRecall - previousRecall) * currentPrecision;
    previousRecall = currentRecall;
    previousFpr = currentFpr;
    start = end;
  }
  const warnings = [];
  if (!positives || !negatives)
    warnings.push('ROC AUC is undefined because the supplied labels contain only one class.');
  if (!positives)
    warnings.push(
      'Recall and average precision are undefined because there are no positive observed labels.',
    );
  if (precision === null)
    warnings.push(
      'Precision is undefined because no observations are predicted positive at this threshold.',
    );
  warnings.push(
    'Metrics describe the supplied rows. Selecting a threshold here is tuning on these labels, not independent validation.',
  );
  const classification = {
    confusion,
    positives,
    negatives,
    count: rows.length,
    roc,
    pr,
    rocAuc: auc,
    averagePrecision: ap,
    operatingPoint: { threshold: p.threshold, precision, recall, fpr, tpr: recall },
  };
  return {
    metrics: [
      metric('Accuracy', ((confusion.tp + confusion.tn) / rows.length) * 100, '%', 2),
      metric('Precision', percent(precision), '%', 2),
      metric('Recall', percent(recall), '%', 2),
      metric('F1', f1, '', 4),
      metric('ROC AUC', auc, '', 4),
      metric('Average precision', ap, '', 4),
    ],
    chart: {
      xLabel: 'False-positive rate',
      yLabel: 'True-positive rate',
      kind: 'roc',
      series: [
        line(
          'ROC',
          roc
            .filter((point) => point.fpr !== null && point.tpr !== null)
            .map((point) => ({ x: point.fpr, y: point.tpr })),
        ),
      ],
      ...(fpr !== null && recall !== null ? { marker: { x: fpr, y: recall } } : {}),
    },
    secondary: {
      xLabel: 'Recall',
      yLabel: 'Precision',
      kind: 'pr',
      series: [
        line(
          'Precision–recall',
          pr
            .filter((point) => point.recall !== null)
            .map((point) => ({ x: point.recall, y: point.precision })),
        ),
      ],
      ...(precision !== null && recall !== null ? { marker: { x: recall, y: precision } } : {}),
    },
    columns: ['observation', 'label', 'score', 'predicted', 'outcome'],
    rows,
    classification,
    insights: [
      {
        label: 'One cutoff, four outcomes',
        text: `At score ≥ ${fmt(p.threshold, 4)}: ${confusion.tp} true positives, ${confusion.fp} false positives, ${confusion.tn} true negatives and ${confusion.fn} false negatives.`,
      },
      {
        label: 'Ranking and decisions are different',
        text: 'ROC AUC and average precision summarize rankings across every unique score. They do not change when only the selected decision threshold changes.',
      },
      {
        label: 'The evaluation set matters',
        text: `There are ${positives} positive and ${negatives} negative labels among ${rows.length} supplied observations. ${data.source ? 'Data source note: ' + data.source : 'No data source note was supplied.'}`,
      },
    ],
    warnings,
  };
}
const calculators = {
  classification: classificationCalculation,
  descent(p) {
    let x = p.x,
      y = p.y;
    const rows = [];
    let stopped = false;
    for (let k = 0; k <= p.steps; k++) {
      const loss = 0.5 * (p.a * x * x + p.b * y * y);
      rows.push({ iteration: k, x, y, loss });
      if (loss > 1e12) {
        stopped = true;
        break;
      }
      x *= 1 - p.rate * p.a;
      y *= 1 - p.rate * p.b;
    }
    const last = rows.at(-1);
    const boundary = 2 / Math.max(p.a, p.b);
    const activeCurvatures = [...(p.x !== 0 ? [p.a] : []), ...(p.y !== 0 ? [p.b] : [])];
    const convergent = activeCurvatures.every((c) => Math.abs(1 - p.rate * c) < 1);
    return {
      metrics: [
        metric('Final objective', last.loss, '', 5),
        metric('Stable step limit', boundary, 'η <', 4),
        metric('Updates completed', last.iteration, '', 0),
      ],
      chart: {
        xLabel: 'Iteration',
        yLabel: 'Objective',
        series: [
          line(
            'Objective',
            rows.map((r) => ({ x: r.iteration, y: r.loss })),
          ),
        ],
        logRecommended: last.loss > 1000,
      },
      secondary: {
        xLabel: 'x',
        yLabel: 'y',
        series: [
          line(
            'Optimization path',
            rows.map((r) => ({ x: r.x, y: r.y })),
          ),
        ],
        kind: 'trajectory',
      },
      columns: ['iteration', 'x', 'y', 'loss'],
      rows,
      insights: [
        {
          label: 'The stability boundary',
          text: `For convergence from every starting point, 0 < η < ${fmt(boundary, 4)}. At the boundary the steepest coordinate oscillates without shrinking.`,
        },
        {
          label: 'This starting point',
          text: convergent
            ? 'Every initially nonzero coordinate has a shrinking update factor. The trace converges toward the origin.'
            : 'At least one initially nonzero coordinate has a nonshrinking update factor. Inspect the path: oscillation and divergence are different outcomes.',
        },
        {
          label: 'Why the zigzag?',
          text: `Each step multiplies x by ${fmt(1 - p.rate * p.a, 4)} and y by ${fmt(1 - p.rate * p.b, 4)}. A negative factor flips that coordinate across the minimum.`,
        },
      ],
      warnings: stopped
        ? [
            'The objective exceeded 10¹². Computation stopped early; the final point is not a converged result.',
          ]
        : [],
    };
  },
  loan(p) {
    const n = p.years * 12,
      r = p.apr / 1200;
    const scheduled =
      r === 0 ? p.principal / n : (p.principal * r) / -Math.expm1(-n * Math.log1p(r));
    let balance = p.principal,
      totalInterest = 0,
      totalPaid = 0;
    const rows = [
      { month: 0, balance, interest: 0, principalPaid: 0, payment: 0, totalInterest: 0 },
    ];
    for (let month = 1; month <= n && balance > 1e-7; month++) {
      const interest = balance * r,
        payment = Math.min(scheduled + p.extra, balance + interest),
        principalPaid = payment - interest;
      balance = Math.max(0, balance - principalPaid);
      totalInterest += interest;
      totalPaid += payment;
      rows.push({ month, balance, interest, principalPaid, payment, totalInterest });
    }
    return {
      metrics: [
        metric('Scheduled payment', scheduled, '/ month'),
        metric('Interest paid', totalInterest),
        metric('Payoff time', rows.length - 1, 'months', 0),
      ],
      chart: {
        xLabel: 'Month',
        yLabel: 'Currency units',
        series: [
          line(
            'Balance',
            rows.map((r) => ({ x: r.month, y: r.balance })),
          ),
          line(
            'Interest paid so far',
            rows.map((r) => ({ x: r.month, y: r.totalInterest })),
          ),
        ],
      },
      columns: ['month', 'balance', 'interest', 'principalPaid', 'payment', 'totalInterest'],
      rows,
      insights: [
        {
          label: 'Payment and principal',
          text: `Your contractual monthly payment is ${fmt(scheduled)}. Adding ${fmt(p.extra)} goes toward repayment after that month’s interest is accounted for.`,
        },
        {
          label: 'Total outlay',
          text: `Over ${rows.length - 1} payments, principal plus interest totals ${fmt(totalPaid)}. The last payment is ${fmt(rows.at(-1).payment)}.`,
        },
        {
          label: 'Compare the right thing',
          text: 'Pin a baseline before changing the extra payment. Interest saved is not an investment return; fees and alternative uses of money are outside this model.',
        },
      ],
      warnings: [],
    };
  },
  circuit(p) {
    const R = p.resistance * 1000,
      C = p.capacitance * 1e-6,
      tau = R * C,
      equilibrium = p.initial === p.supply;
    const rows = Array.from({ length: 201 }, (_, i) => {
      const time = (i / 200) * p.duration * tau,
        voltage = p.supply + (p.initial - p.supply) * Math.exp(-time / tau);
      return { seconds: time, voltage, currentMilliamp: ((p.supply - voltage) / R) * 1000 };
    });
    return {
      metrics: [
        metric('Time constant', tau, 'seconds', 4),
        metric('90% of transition', equilibrium ? null : Math.log(10) * tau, 'seconds', 4),
        metric('Final voltage', rows.at(-1).voltage, 'V', 4),
      ],
      chart: {
        xLabel: 'Seconds',
        yLabel: 'Volts',
        series: [
          line(
            'Capacitor voltage',
            rows.map((r) => ({ x: r.seconds, y: r.voltage })),
          ),
        ],
      },
      columns: ['seconds', 'voltage', 'currentMilliamp'],
      rows,
      insights: [
        {
          label: 'One time constant',
          text: equilibrium
            ? `The RC time constant is ${fmt(tau, 4)} s, but the capacitor is already at equilibrium. There is no voltage transition.`
            : `At t = ${fmt(tau, 4)} s the capacitor has completed about 63.2% of its voltage transition.`,
        },
        {
          label: equilibrium ? 'Already at equilibrium' : 'Not quite finished',
          text: equilibrium
            ? 'A percentage of a zero-size transition is undefined. The 90%-transition timing is therefore undefined; voltage stays at the supply and current stays zero.'
            : `At ${fmt(p.duration)}τ the transition is ${(100 * (1 - Math.exp(-p.duration))).toFixed(2)}% complete. The ideal exponential reaches its target asymptotically.`,
        },
        {
          label: 'Direction matters',
          text:
            p.initial > p.supply
              ? 'The initial voltage exceeds the supply. Voltage falls toward the source and the defined current is negative.'
              : p.initial === p.supply
                ? 'There is no voltage difference to drive a transition; current remains zero.'
                : 'Voltage rises toward the supply while the charging current decays.',
        },
      ],
      warnings: [],
    };
  },
  epidemic(p) {
    const gamma = 1 / p.recovery;
    let state = [p.population - p.infected, p.infected, 0],
      time = 0;
    const rows = [{ day: 0, susceptible: state[0], infected: state[1], recovered: state[2] }];
    const deriv = (z, beta) => {
      const rate = (beta * z[0] * z[1]) / p.population;
      return [-rate, rate - gamma * z[1], gamma * z[1]];
    };
    for (let day = 1; day <= p.days; day++) {
      while (time < day - 1e-10) {
        let h = Math.min(0.1, day - time);
        if (time < p.intervention - 1e-10) h = Math.min(h, p.intervention - time);
        const beta = p.beta * (time >= p.intervention - 1e-10 ? 1 - p.reduction / 100 : 1);
        const k1 = deriv(state, beta),
          k2 = deriv(
            state.map((v, i) => v + (h * k1[i]) / 2),
            beta,
          ),
          k3 = deriv(
            state.map((v, i) => v + (h * k2[i]) / 2),
            beta,
          ),
          k4 = deriv(
            state.map((v, i) => v + h * k3[i]),
            beta,
          );
        state = state.map((v, i) => v + (h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) / 6);
        time += h;
      }
      rows.push({ day, susceptible: state[0], infected: state[1], recovered: state[2] });
    }
    const peak = rows.reduce((a, b) => (b.infected > a.infected ? b : a)),
      r0 = p.beta / gamma,
      initialR0 = r0 * (p.intervention === 0 ? 1 - p.reduction / 100 : 1);
    return {
      metrics: [
        metric('Initial R₀', initialR0, '', 3),
        metric('Peak infectious', peak.infected, 'people', 1),
        metric('Sampled peak day', peak.day, 'day', 0),
      ],
      chart: {
        xLabel: 'Day',
        yLabel: 'Expected people',
        series: ['susceptible', 'infected', 'recovered'].map((k) =>
          line(
            k[0].toUpperCase() + k.slice(1),
            rows.map((r) => ({ x: r.day, y: r[k] })),
          ),
        ),
      },
      columns: ['day', 'susceptible', 'infected', 'recovered'],
      rows,
      insights: [
        {
          label: 'Population stays accounted for',
          text: 'The equations transfer people between S, I and R. Their sum stays constant, up to numerical rounding.',
        },
        {
          label: 'Intervention',
          text: `At day ${p.intervention}, β changes from ${fmt(p.beta, 3)} to ${fmt(p.beta * (1 - p.reduction / 100), 3)} day⁻¹. If the day is outside the observation horizon, it has no visible effect.`,
        },
        {
          label: 'R₀ and actual growth',
          text: `Initial R₀ is ${fmt(initialR0, 3)}, including an intervention at day zero. The instantaneous growth factor also depends on the remaining susceptible fraction; R₀ alone does not locate the peak.`,
        },
      ],
      warnings: [
        'Illustrative dynamics, not a prediction about a real epidemic. Peak metrics use daily samples and may miss an intervening continuous maximum.',
      ],
    };
  },
  bayes(p) {
    const prev = p.prevalence / 100,
      sens = p.sensitivity / 100,
      spec = p.specificity / 100;
    const tp = p.population * prev * sens,
      fn = p.population * prev * (1 - sens),
      fp = p.population * (1 - prev) * (1 - spec),
      tn = p.population * (1 - prev) * spec;
    const positive = tp + fp,
      negative = tn + fn,
      ppv = positive === 0 ? null : tp / positive,
      npv = negative === 0 ? null : tn / negative;
    const posterior = (v) => {
      const a = v * sens,
        b = (1 - v) * (1 - spec);
      return a + b === 0 ? null : (a / (a + b)) * 100;
    };
    const points = Array.from({ length: 301 }, (_, i) => {
      const v = i / 300;
      return { x: v * 100, y: posterior(v) };
    });
    const rows = [
      { outcome: 'True positive', expected: tp },
      { outcome: 'False positive', expected: fp },
      { outcome: 'False negative', expected: fn },
      { outcome: 'True negative', expected: tn },
    ];
    return {
      metrics: [
        metric('Condition given positive', ppv === null ? null : ppv * 100, '%', 2),
        metric('True positives', tp, 'expected people', 1),
        metric('False positives', fp, 'expected people', 1),
      ],
      chart: {
        xLabel: 'Prevalence (%)',
        yLabel: 'P(condition | positive) (%)',
        series: [line('Positive predictive value', points)],
        marker: { x: p.prevalence, y: posterior(prev) },
      },
      columns: ['outcome', 'expected'],
      rows,
      insights: [
        {
          label: 'Count both sources of positives',
          text: `Expected positives: ${fmt(tp, 2)} from people with the condition and ${fmt(fp, 2)} from people without it.`,
        },
        {
          label: 'Use the denominator',
          text:
            ppv === null
              ? 'No positive results are possible under these settings. A probability conditional on a positive result is undefined.'
              : `Among positive results, ${fmt(ppv * 100, 2)}% are expected to have the condition. That is a different question from test sensitivity.`,
        },
        {
          label: 'A negative result',
          text:
            npv === null
              ? 'No negative results are possible under these settings. Negative predictive value is undefined.'
              : `Among negative results, ${fmt(npv * 100, 2)}% are expected not to have the condition.`,
        },
      ],
      warnings:
        positive === 0 || negative === 0
          ? [
              'At least one conditional probability is undefined because its conditioning event has probability zero.',
            ]
          : [],
    };
  },
};
export function csv(result) {
  const escape = (v) => {
    let s = v === null ? '' : String(v);
    if (/^[=+@\t\r]/.test(s) || (/^-/.test(s) && typeof v !== 'number')) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return (
    [result.columns, ...result.rows.map((row) => result.columns.map((key) => row[key]))]
      .map((row) => row.map(escape).join(','))
      .join('\r\n') + '\r\n'
  );
}

/** Canonical JSON for provenance: recursively sorted keys, unchanged array order and numbers. */
export function canonicalJson(value) {
  if (Array.isArray(value)) {
    const missingIndex = engineSparseIndex(value);
    if (missingIndex !== -1)
      throw new SpecError([`canonicalJson[${missingIndex}]: sparse array slot is missing`]);
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  if (value !== null && typeof value === 'object') {
    return (
      '{' +
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key]))
        .join(',') +
      '}'
    );
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined || (typeof value === 'number' && !Number.isFinite(value))) {
    throw new TypeError('Provenance requires JSON values with finite numbers.');
  }
  return encoded;
}

/** Shared envelope for CLI and browser exports. Hashes identify data and source, not authorship. */
export function resultEnvelope(spec, engineSha256, specSha256) {
  if (
    ![engineSha256, specSha256].every(
      (hash) => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash),
    )
  ) {
    throw new TypeError('Provenance hashes must be lowercase SHA-256 hexadecimal strings.');
  }
  const clean = validateSpec(spec);
  return {
    format: 'counterplot-results',
    formatVersion: 1,
    engineVersion: VERSION,
    engineSha256,
    specSha256,
    spec: clean,
    results: evaluate(clean),
  };
}
