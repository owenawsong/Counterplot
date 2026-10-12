import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODELS,
  createSpec,
  validateSpec,
  evaluate,
  csv,
  SpecError,
  canonicalJson,
} from '../src/engine.js';
import { experimentSchema } from '../src/schema.js';
const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);

test('all defaults and slider corners produce finite bounded results', () => {
  for (const model of Object.keys(MODELS)) {
    const spec = createSpec(model);
    validateSpec(spec);
    for (const overrides of [
      {},
      ...Object.entries(MODELS[model].controls).flatMap(([k, c]) => [
        { [k]: c.min },
        { [k]: c.max },
      ]),
    ]) {
      if (
        model === 'epidemic' &&
        overrides.population &&
        overrides.population < spec.parameters.infected
      )
        continue;
      const result = evaluate(spec, overrides);
      assert.ok(result.rows.length > 0 && result.rows.length <= 481);
      for (const row of result.rows)
        for (const value of Object.values(row))
          if (typeof value === 'number') assert.ok(Number.isFinite(value));
      for (const metric of result.metrics)
        assert.ok(metric.value === null || Number.isFinite(metric.value));
      assert.ok(result.insights.every((s) => s.text && !/NaN|Infinity/.test(s.text)));
    }
  }
});
test('validation rejects code, unknown keys, missing values, hostile names and nonfinite values', () => {
  const spec = createSpec();
  for (const candidate of [
    null,
    [],
    { ...spec, formula: 'alert(1)' },
    { ...spec, model: '__proto__' },
    { ...spec, model: {} },
    { ...spec, parameters: { ...spec.parameters, rate: Infinity } },
    { ...spec, parameters: { ...spec.parameters, steps: 2.5 } },
    { ...spec, parameters: { rate: 0.1 } },
    { ...spec, title: ' ' },
    { ...spec, scenarios: Array(9).fill({ name: 'x', parameters: {} }) },
    { ...spec, scenarios: [{ name: 'x', parameters: { rate: 12 } }] },
  ])
    assert.throws(() => validateSpec(candidate), SpecError);
  assert.throws(() => evaluate(spec, { unknown: 2 }), SpecError);
  assert.throws(() => evaluate(spec, { rate: '0.1' }), SpecError);
});
test('inputs are never mutated and results are deterministic', () => {
  const spec = createSpec('epidemic'),
    original = structuredClone(spec),
    overrides = { reduction: 17 };
  assert.deepEqual(evaluate(spec, overrides), evaluate(spec, overrides));
  assert.deepEqual(spec, original);
  assert.deepEqual(overrides, { reduction: 17 });
  const clean = validateSpec(spec);
  clean.parameters.beta = 0.9;
  assert.equal(spec.parameters.beta, 0.3);
});
test('nested definitions are frozen and cannot change validation or calculation', () => {
  const spec = createSpec('bayes'),
    before = evaluate(spec);
  assert.throws(() => {
    MODELS.bayes.controls.prevalence.min = -100;
  }, TypeError);
  assert.throws(() => {
    MODELS.bayes.controls.prevalence.value = -10;
  }, TypeError);
  assert.throws(() => {
    MODELS.bayes.assumptions.push('Changed');
  }, TypeError);
  assert.throws(() => {
    MODELS.bayes.references[0].url = 'https://malicious.example';
  }, TypeError);
  assert.throws(() => evaluate(spec, { prevalence: -10 }), SpecError);
  assert.deepEqual(evaluate(spec), before);
});
test('canonical serialization preserves numbers and array order while normalizing key order', () => {
  assert.equal(
    canonicalJson({ b: 2, a: { z: 3, y: 1 }, list: [3, 1] }),
    canonicalJson({ list: [3, 1], a: { y: 1, z: 3 }, b: 2 }),
  );
  assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));
  assert.throws(() => canonicalJson(Infinity), /finite/);
  assert.equal(canonicalJson({ a: 1, optional: undefined }), canonicalJson({ a: 1 }));
});
test('sparse scenario arrays and sparse canonical arrays are rejected explicitly', () => {
  const spec = createSpec();
  for (const scenarios of [
    new Array(1),
    new Array(2),
    [{ name: 'valid', parameters: {} }, , { name: 'also valid', parameters: {} }],
  ]) {
    assert.throws(
      () => validateSpec({ ...spec, scenarios }),
      (error) => error instanceof SpecError && error.message.includes('sparse'),
    );
  }
  for (const value of [new Array(1), new Array(2), [1, , 3], { nested: [1, , 3] }]) {
    assert.throws(
      () => canonicalJson(value),
      (error) => error instanceof SpecError && error.message.includes('sparse'),
    );
  }
  assert.equal(canonicalJson([null]), '[null]');
  assert.notEqual(canonicalJson([null]), canonicalJson([]));
  assert.throws(() => canonicalJson(undefined), /JSON/);
  assert.throws(() => canonicalJson([undefined]), /JSON/);
  assert.throws(() => validateSpec({ ...spec, scenarios: [null] }), SpecError);
});
test('quadratic recurrence, descent, boundary oscillation and divergence are distinct', () => {
  const spec = createSpec();
  const stable = evaluate(spec, { rate: 0.1, x: 5, y: 4, a: 1, b: 8, steps: 2 });
  close(stable.rows[1].x, 4.5);
  close(stable.rows[1].y, 0.8);
  close(stable.rows[2].x, 4.05);
  close(stable.rows[2].y, 0.16);
  assert.ok(stable.rows.every((r, i) => i === 0 || r.loss < stable.rows[i - 1].loss));
  const boundary = evaluate(spec, { x: 0, rate: 0.25, steps: 10 });
  close(boundary.rows[0].loss, boundary.rows.at(-1).loss);
  assert.equal(boundary.rows[1].y, -4);
  const divergent = evaluate(spec, { rate: 1, steps: 250 });
  assert.ok(divergent.warnings.length);
  assert.ok(divergent.rows.length < 251);
  assert.ok(divergent.rows.at(-1).loss > 1e12);
  const origin = evaluate(spec, { x: 0, y: 0 });
  assert.ok(origin.rows.every((r) => r.loss === 0));
});
test('loan matches known payment, zero rate, conservation and capped last payment', () => {
  const spec = createSpec('loan');
  const regular = evaluate(spec, { principal: 100000, apr: 6, years: 30, extra: 0 });
  close(regular.metrics[0].value, 599.5505251527569, 1e-9);
  assert.equal(regular.rows.length, 361);
  close(regular.rows.at(-1).balance, 0, 1e-7);
  close(
    regular.rows.slice(1).reduce((s, r) => s + r.principalPaid, 0),
    100000,
    1e-7,
  );
  const zero = evaluate(spec, { principal: 12000, apr: 0, years: 1, extra: 0 });
  close(zero.metrics[0].value, 1000);
  close(zero.metrics[1].value, 0);
  assert.equal(zero.metrics[2].value, 12);
  const extra = evaluate(spec, { extra: 500 });
  assert.ok(extra.metrics[1].value < evaluate(spec, { extra: 0 }).metrics[1].value);
  assert.ok(extra.metrics[2].value < 360);
  const once = evaluate(spec, { principal: 100, years: 1, apr: 6, extra: 10000 });
  assert.equal(once.metrics[2].value, 1);
  close(once.rows[1].payment, 100.5);
});
test('RC analytical solution and unit conversions agree with time constant', () => {
  const spec = createSpec('circuit');
  const result = evaluate(spec, { duration: 5 });
  close(result.metrics[0].value, 1);
  close(result.rows[40].seconds, 1);
  close(result.rows[40].voltage, 5 * (1 - Math.exp(-1)));
  close(result.rows[0].currentMilliamp, 0.5);
  const twice = evaluate(spec, { resistance: 20 });
  close(twice.metrics[0].value, 2);
  close(twice.rows.at(-1).voltage, result.rows.at(-1).voltage);
  const discharge = evaluate(spec, { initial: 12 });
  assert.ok(discharge.rows.every((r, i) => i === 0 || r.voltage < discharge.rows[i - 1].voltage));
  assert.ok(discharge.rows.every((r) => r.currentMilliamp < 0));
  const flat = evaluate(spec, { initial: 5 });
  assert.ok(flat.rows.every((r) => r.voltage === 5 && r.currentMilliamp === 0));
  assert.equal(flat.metrics[1].value, null);
  assert.ok(flat.insights[0].text.includes('already at equilibrium'));
  assert.ok(flat.insights[1].text.includes('undefined'));
  assert.ok(
    flat.insights.every((item) => !item.text.includes('63.2%') && !item.text.includes('complete.')),
  );
});
test('SIR conserves population and aligns intervention at exact day', () => {
  const spec = createSpec('epidemic'),
    r = evaluate(spec);
  for (const row of r.rows) {
    close(row.susceptible + row.infected + row.recovered, 10000, 1e-7);
    assert.ok(row.susceptible >= 0 && row.infected >= 0 && row.recovered >= 0);
  }
  assert.ok(r.rows.every((row, i) => i === 0 || row.susceptible <= r.rows[i - 1].susceptible));
  assert.ok(r.rows.every((row, i) => i === 0 || row.recovered >= r.rows[i - 1].recovered));
  const none = evaluate(spec, { reduction: 0 }),
    late = evaluate(spec, { intervention: 180 });
  assert.deepEqual(none.rows, late.rows);
  const stop = evaluate(spec, { intervention: 0, reduction: 100 });
  close(stop.metrics[0].value, 0);
  close(stop.rows[10].infected, 10 * Math.exp(-1), 1e-8);
  close(stop.rows[10].susceptible, 9990);
  const early = evaluate(spec, { intervention: 10 });
  assert.ok(early.metrics[1].value < r.metrics[1].value);
  assert.throws(() => evaluate(spec, { population: 100, infected: 101 }), /infected/);
  assert.throws(() => evaluate(spec, { population: 100.5 }), /integer/);
});
test('SIR no-intervention final-size invariant within numerical tolerance', () => {
  const spec = createSpec('epidemic');
  const r = evaluate(spec, { reduction: 0 });
  for (const row of r.rows) {
    const invariant = Math.log(row.susceptible / 9990) + (0.3 * 10 * row.recovered) / 10000;
    close(invariant, 0, 1e-8);
  }
});
test('Bayes uses the positive denominator and exposes undefined events', () => {
  const spec = createSpec('bayes'),
    r = evaluate(spec);
  close(r.metrics[0].value, (95 / 194) * 100);
  close(
    r.rows.reduce((a, b) => a + b.expected, 0),
    10000,
  );
  const scale = evaluate(spec, { population: 100000 });
  assert.throws(() => evaluate(spec, { population: 100.5 }), /integer/);
  close(scale.metrics[0].value, r.metrics[0].value);
  close(scale.rows[0].expected, r.rows[0].expected * 10);
  const perfect = evaluate(spec, { specificity: 100, sensitivity: 100 });
  close(perfect.metrics[0].value, 100);
  const impossible = evaluate(spec, { specificity: 100, sensitivity: 0 });
  assert.equal(impossible.metrics[0].value, null);
  assert.ok(impossible.warnings.length);
  assert.ok(impossible.chart.series[0].points.every((p) => p.y === null));
});
test('CSV preserves numbers and escapes text and spreadsheet formula injection', () => {
  const text = csv({
    columns: ['name', 'value'],
    rows: [
      { name: '=SUM(1,2)', value: -1.5 },
      { name: 'a"b\nc', value: null },
    ],
  });
  assert.ok(text.includes('"\'=SUM(1,2)",-1.5'));
  assert.ok(text.includes('"a""b\nc",'));
  assert.ok(text.endsWith('\r\n'));
});
test('generated schema follows every model and authoritative bounds', () => {
  const schema = experimentSchema();
  assert.equal(schema.oneOf.length, Object.keys(MODELS).length);
  for (const branch of schema.oneOf) {
    const controls = MODELS[branch.properties.model.const].controls;
    assert.deepEqual(branch.properties.parameters.required, Object.keys(controls));
    for (const [key, c] of Object.entries(controls)) {
      assert.equal(branch.properties.parameters.properties[key].minimum, c.min);
      assert.equal(branch.properties.parameters.properties[key].maximum, c.max);
    }
  }
});
