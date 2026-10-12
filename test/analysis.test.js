import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpec, evaluate, SpecError, canonicalJson } from '../src/engine.js';
import { sweep, sensitivity, metricCatalog } from '../src/analysis.js';
const close = (a, b, t = 1e-10) => assert.ok(Math.abs(a - b) <= t, `${a} ≠ ${b}`);
test('1D grid returns real evaluated metrics and identifies only a best sampled point', () => {
  const spec = {
      ...createSpec('descent'),
      parameters: { rate: 0.12, a: 2, b: 2, x: 5, y: 4, steps: 1 },
    },
    before = canonicalJson(spec);
  const result = sweep(spec, {
    axes: [{ parameter: 'rate', min: 0.25, max: 0.75, points: 3 }],
    metrics: ['final-objective'],
    objective: { metric: 'final-objective', direction: 'min' },
  });
  assert.equal(result.cells, 3);
  assert.equal(result.best.coordinates.rate, 0.5);
  assert.equal(result.best.value, 0);
  result.rows.forEach((row) =>
    close(row.values['final-objective'], evaluate(spec, row.coordinates).metrics[0].value),
  );
  assert.ok(result.warnings[0].includes('not a global'));
  assert.equal(canonicalJson(spec), before);
});
test('2D grid preserves both coordinates, actual units and deterministic row ordering', () => {
  const spec = createSpec('circuit');
  const r = sweep(spec, {
    axes: [
      { parameter: 'resistance', min: 1, max: 3, points: 3 },
      { parameter: 'capacitance', min: 100, max: 200, points: 2 },
    ],
    metrics: ['time-constant'],
  });
  assert.equal(r.cells, 6);
  assert.deepEqual(
    r.rows.map((row) => row.gridIndex),
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  );
  assert.deepEqual(r.axes[0].values, [1, 2, 3]);
  assert.equal(r.axes[0].unit, 'kΩ');
  r.rows.forEach((row) =>
    close(
      row.values['time-constant'],
      row.coordinates.resistance * row.coordinates.capacitance * 0.001,
    ),
  );
});
test('integer grids expose distinct rounded integer coordinates', () => {
  const r = sweep(createSpec('descent'), {
    axes: [{ parameter: 'steps', min: 1, max: 8, points: 5 }],
    metrics: ['updates-completed'],
  });
  assert.deepEqual(r.axes[0].values, [1, 3, 5, 6, 8]);
  assert.ok(r.rows.every((row) => row.values['updates-completed'] === row.coordinates.steps));
});
test('invalid coupled domain combinations remain visible and excluded from objectives', () => {
  const spec = createSpec('epidemic');
  spec.parameters.infected = 500;
  const r = sweep(spec, {
    axes: [{ parameter: 'population', min: 100, max: 1000, points: 4 }],
    metrics: ['peak-infectious'],
    objective: { metric: 'peak-infectious', direction: 'min' },
  });
  assert.equal(r.invalidCells, 2);
  assert.deepEqual(
    r.rows.slice(0, 2).map((row) => row.status),
    ['invalid', 'invalid'],
  );
  assert.ok(r.rows[0].warnings.some((message) => message.includes('infected')));
  assert.ok(r.best.coordinates.population >= 500);
});
test('undefined metric cells stay null rather than zero and ties count sampled points', () => {
  const spec = createSpec('classification');
  spec.data = { labels: [0, 0], scores: [0.1, 0.2] };
  const r = sweep(spec, {
    axes: [{ parameter: 'threshold', min: 0, max: 1, points: 3 }],
    metrics: ['roc-auc'],
    objective: { metric: 'roc-auc', direction: 'max' },
  });
  assert.equal(r.undefinedCells, 3);
  assert.equal(r.best, null);
  assert.ok(r.rows.every((row) => row.values['roc-auc'] === null));
  const ties = sweep(createSpec('loan'), {
    axes: [{ parameter: 'extra', min: 0, max: 100, points: 3 }],
    metrics: ['scheduled-payment'],
    objective: { metric: 'scheduled-payment', direction: 'max' },
  });
  assert.equal(ties.best.ties, 3);
});
test('analysis refuses unknown fields, duplicate axes, invalid grids and excessive work', () => {
  const spec = createSpec('descent'),
    axis = { parameter: 'rate', min: 0.01, max: 0.2, points: 5 };
  for (const config of [
    { axes: [] },
    { axes: [axis, axis] },
    { axes: [{ ...axis, points: 202 }] },
    { axes: [{ ...axis, max: 1.1 }] },
    { axes: [{ ...axis, min: 0.2, max: 0.1 }] },
    { axes: [axis], metrics: ['invented'] },
    { axes: [axis], metrics: ['final-objective', 'Final objective'] },
    { axes: [axis], objective: { metric: 'final-objective', direction: 'best' } },
    { axes: [axis], script: 'x' },
    { axes: [{ parameter: 'rate', min: 0.5, max: 0.5000000000000001, points: 5 }] },
    { axes: [{ parameter: 'steps', min: 1, max: 2, points: 3 }] },
    {
      axes: [
        { ...axis, points: 26 },
        { parameter: 'a', min: 1, max: 2, points: 26 },
      ],
    },
  ])
    assert.throws(() => sweep(spec, config), SpecError);
  assert.throws(
    () =>
      sweep(createSpec('epidemic'), {
        axes: [
          { parameter: 'beta', min: 0.01, max: 1, points: 25 },
          { parameter: 'recovery', min: 1, max: 30, points: 25 },
        ],
      }),
    /estimated work/,
  );
});
test('work budgets include catalogue/base and actual varied horizons', () => {
  const loan = createSpec('loan');
  const sampled = sweep(loan, {
    axes: [{ parameter: 'years', min: 1, max: 3, points: 3 }],
    metrics: ['interest-paid'],
  });
  assert.equal(sampled.estimatedWork, 30 * 12 + 1 * 12 + 2 * 12 + 3 * 12);
  loan.parameters.years = 1;
  const local = sensitivity(loan, {
    parameters: ['years'],
    steps: { years: 10 },
    metrics: ['interest-paid'],
  });
  assert.equal(local.estimatedWork, 1 * 12 + 11 * 12);
  const classified = createSpec('classification');
  classified.data = {
    labels: Array.from({ length: 2000 }, (_, i) => i % 2),
    scores: Array(2000).fill(0.5),
  };
  assert.throws(
    () =>
      sweep(classified, {
        axes: [{ parameter: 'threshold', min: 0, max: 1, points: 83 }],
        metrics: ['f1'],
      }),
    /2016000/,
  );
});
test('analysis input arrays must be dense and explicit null slots are not defaults', () => {
  const spec = createSpec('descent'),
    axis = { parameter: 'rate', min: 0.01, max: 0.2, points: 3 };
  for (const axes of [new Array(1), new Array(2), [axis, ,]]) {
    assert.throws(
      () => sweep(spec, { axes }),
      (error) => error instanceof SpecError && error.message.includes('sparse'),
    );
  }
  for (const metrics of [new Array(1), ['final-objective', ,]]) {
    assert.throws(
      () => sweep(spec, { axes: [axis], metrics }),
      (error) => error instanceof SpecError && error.message.includes('sparse'),
    );
    assert.throws(
      () => sensitivity(spec, { metrics }),
      (error) => error instanceof SpecError && error.message.includes('sparse'),
    );
  }
  for (const parameters of [new Array(1), ['rate', ,]]) {
    assert.throws(
      () => sensitivity(spec, { parameters }),
      (error) => error instanceof SpecError && error.message.includes('sparse'),
    );
  }
  assert.throws(() => sweep(spec, { axes: [null] }), SpecError);
  assert.throws(() => sweep(spec, { axes: [axis], metrics: [null] }), SpecError);
  assert.throws(() => sensitivity(spec, { parameters: [null] }), SpecError);
  assert.throws(() => sensitivity(spec, { parameters: null }), SpecError);
});
test('finite differences recover exact RC slopes and dimensionless elasticity', () => {
  const r = sensitivity(createSpec('circuit'), {
    parameters: ['resistance'],
    steps: { resistance: 0.5 },
    metrics: ['time-constant'],
  });
  const row = r.rows[0],
    m = row.estimates['time-constant'];
  assert.equal(row.method, 'central');
  assert.equal(row.step, 0.5);
  close(m.slope, 0.1);
  close(m.elasticity, 1);
  assert.equal(m.deltaInput, 1);
});
test('boundary sensitivity uses one-sided differences and reports sampled coordinates', () => {
  const spec = createSpec('circuit');
  spec.parameters.resistance = 0.1;
  const row = sensitivity(spec, { parameters: ['resistance'], metrics: ['time-constant'] }).rows[0];
  assert.equal(row.method, 'forward');
  assert.equal(row.lower.status, 'unavailable');
  close(row.estimates['time-constant'].slope, 0.1);
  const asym = { ...spec, parameters: { ...spec.parameters, resistance: 0.15 } };
  assert.equal(
    sensitivity(asym, { parameters: ['resistance'], steps: { resistance: 0.1 } }).rows[0].method,
    'secant',
  );
});
test('finite differences expose coupled-domain failures and undefined values', () => {
  const spec = createSpec('epidemic');
  spec.parameters.population = 100;
  spec.parameters.infected = 100;
  const row = sensitivity(spec, { parameters: ['infected'], metrics: ['peak-infectious'] }).rows[0];
  assert.equal(row.upper.status, 'invalid');
  assert.equal(row.method, 'backward');
  const flat = createSpec('circuit');
  flat.parameters.initial = 5;
  const zero = sensitivity(flat, { parameters: ['resistance'], metrics: ['90-of-transition'] })
    .rows[0].estimates['90-of-transition'];
  assert.equal(zero.slope, null);
  assert.equal(zero.elasticity, null);
  const discontinuous = sensitivity(flat, {
    parameters: ['initial'],
    metrics: ['90-of-transition'],
  });
  const atCenter = discontinuous.rows[0].estimates['90-of-transition'];
  assert.equal(atCenter.baseline, null);
  assert.equal(atCenter.baselineDefined, false);
  assert.equal(atCenter.status, 'undefined-baseline');
  assert.equal(atCenter.slope, null);
  assert.equal(atCenter.endpointSlope, 0);
  assert.ok(discontinuous.rows[0].warnings.some((w) => w.includes('undefined at the baseline')));
  const loan = createSpec('loan');
  loan.parameters.extra = 0;
  const zeroInput = sensitivity(loan, { parameters: ['extra'], metrics: ['interest-paid'] }).rows[0]
    .estimates['interest-paid'];
  assert.ok(zeroInput.slope < 0);
  assert.equal(zeroInput.elasticity, null);
});
test('sensitivity validates explicit steps and model-specific parameters', () => {
  const spec = createSpec('descent');
  for (const config of [
    { parameters: ['missing'] },
    { parameters: ['rate', 'rate'] },
    { parameters: [] },
    { parameters: ['rate'], steps: { x: 0.1 } },
    { parameters: ['rate'], steps: { rate: 0 } },
    { parameters: ['rate'], steps: { rate: 1e-310 } },
    { parameters: ['steps'], steps: { steps: 1.5 } },
    { parameters: ['rate'], metrics: ['missing'] },
    { code: 'x' },
  ])
    assert.throws(() => sensitivity(spec, config), SpecError);
  assert.deepEqual(
    metricCatalog(spec).map((m) => m.key),
    evaluate(spec).metrics.map((m) => m.key),
  );
});
