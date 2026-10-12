/** Pure, shared numerical engine. No DOM, dependencies, network, or expression evaluation. */
export const VERSION = '0.1.0';
const control = (label, unit, min, max, step, value, help) => ({
  label,
  unit,
  min,
  max,
  step,
  value,
  help,
});
export const MODELS = Object.freeze({
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
      (c.step === 1 && !Number.isInteger(value))
    ) {
      issues.push(
        `${path}.${key}: expected ${c.step === 1 ? 'integer' : 'finite number'} in [${c.min}, ${c.max}]`,
      );
    }
  }
}
export function validateSpec(spec) {
  const issues = [];
  if (
    !exact(
      spec,
      ['schemaVersion', 'model', 'title', 'description', 'parameters', 'scenarios'],
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
  if (spec.scenarios !== undefined) {
    if (!Array.isArray(spec.scenarios) || spec.scenarios.length > 8)
      issues.push('spec.scenarios: expected at most eight scenarios');
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
export function createSpec(model = 'descent') {
  if (typeof model !== 'string' || !Object.hasOwn(MODELS, model))
    throw new SpecError([`Unknown model: ${model}`]);
  const definition = MODELS[model];
  return {
    schemaVersion: 1,
    model,
    title: definition.question,
    description: `An interactive ${definition.label.toLowerCase()} experiment. Change one assumption and compare the result.`,
    parameters: Object.fromEntries(
      Object.entries(definition.controls).map(([k, c]) => [k, c.value]),
    ),
  };
}
const metric = (label, value, unit = '', digits = 2) => ({ label, value, unit, digits });
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
  const result = calculators[clean.model](p);
  return { engineVersion: VERSION, model: clean.model, parameters: p, ...result };
}
const calculators = {
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
      tau = R * C;
    const rows = Array.from({ length: 201 }, (_, i) => {
      const time = (i / 200) * p.duration * tau,
        voltage = p.supply + (p.initial - p.supply) * Math.exp(-time / tau);
      return { seconds: time, voltage, currentMilliamp: ((p.supply - voltage) / R) * 1000 };
    });
    return {
      metrics: [
        metric('Time constant', tau, 'seconds', 4),
        metric('90% of transition', Math.log(10) * tau, 'seconds', 4),
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
          text: `After ${fmt(tau, 4)} seconds the capacitor has completed about 63.2% of its voltage transition.`,
        },
        {
          label: 'Not quite finished',
          text: `At ${fmt(p.duration)}τ the transition is ${(100 * (1 - Math.exp(-p.duration))).toFixed(2)}% complete. The ideal exponential reaches its target asymptotically.`,
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
      r0 = p.beta / gamma;
    return {
      metrics: [
        metric('Initial R₀', r0, '', 3),
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
          text: `Initial R₀ is ${fmt(r0, 3)}. The instantaneous growth factor also depends on the remaining susceptible fraction; R₀ alone does not locate the peak.`,
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
