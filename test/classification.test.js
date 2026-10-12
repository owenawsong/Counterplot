import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpec, evaluate, validateSpec, SpecError, canonicalJson } from '../src/engine.js';
const close = (a, b, t = 1e-12) => assert.ok(Math.abs(a - b) <= t, `${a} ≠ ${b}`);
const fixture = (labels, scores, threshold = 0.5) => ({
  ...createSpec('classification'),
  parameters: { threshold },
  data: { labels, scores, source: 'Hand-calculated test fixture.' },
});
test('binary threshold metrics match a hand-calculated confusion matrix and ranking areas', () => {
  const result = evaluate(fixture([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8], 0.4));
  assert.deepEqual(result.classification.confusion, { tp: 1, fp: 1, tn: 1, fn: 1 });
  assert.deepEqual(
    result.metrics.map((m) => m.key),
    ['accuracy', 'precision', 'recall', 'f1', 'roc-auc', 'average-precision'],
  );
  close(result.metrics[0].value, 50);
  close(result.metrics[1].value, 50);
  close(result.metrics[2].value, 50);
  close(result.metrics[3].value, 0.5);
  close(result.classification.rocAuc, 0.75);
  close(result.classification.averagePrecision, 5 / 6);
  assert.equal(result.classification.roc.length, 5);
  assert.equal(result.rows[1].predicted, 1);
});
test('equal-score groups are indivisible and ranking metrics ignore within-group ordering', () => {
  const a = evaluate(fixture([0, 1], [0.5, 0.5], 0.5)),
    b = evaluate(fixture([1, 0], [0.5, 0.5], 0.5));
  assert.deepEqual(a.classification, b.classification);
  assert.equal(a.classification.roc.length, 2);
  close(a.classification.rocAuc, 0.5);
  close(a.classification.averagePrecision, 0.5);
  assert.deepEqual(a.classification.confusion, { tp: 1, fp: 1, tn: 0, fn: 0 });
});
test('AUC equals pairwise positive-negative comparison including half credit for ties', () => {
  const labels = [1, 0, 1, 0, 1, 0, 0, 1],
    scores = [0.7, 0.7, 0.4, 0.9, 0.8, 0.2, 0.4, 0.1];
  const positives = scores.filter((_, i) => labels[i] === 1),
    negatives = scores.filter((_, i) => labels[i] === 0);
  const expected =
    positives.reduce(
      (sum, p) => sum + negatives.reduce((inner, n) => inner + (p > n ? 1 : p === n ? 0.5 : 0), 0),
      0,
    ) /
    (positives.length * negatives.length);
  close(evaluate(fixture(labels, scores)).classification.rocAuc, expected);
});
test('perfect and reversed ranking yield correct areas', () => {
  const perfect = evaluate(fixture([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9]));
  close(perfect.classification.rocAuc, 1);
  close(perfect.classification.averagePrecision, 1);
  const reversed = evaluate(fixture([1, 1, 0, 0], [0.1, 0.2, 0.8, 0.9]));
  close(reversed.classification.rocAuc, 0);
  close(reversed.classification.averagePrecision, 5 / 12);
});
test('changing threshold changes decisions but not ranking summaries or curves', () => {
  const spec = fixture([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8], 0.2),
    before = canonicalJson(spec);
  const a = evaluate(spec),
    b = evaluate(spec, { threshold: 0.7 });
  assert.notDeepEqual(a.classification.confusion, b.classification.confusion);
  assert.deepEqual(a.classification.roc, b.classification.roc);
  assert.deepEqual(a.classification.pr, b.classification.pr);
  assert.equal(a.classification.rocAuc, b.classification.rocAuc);
  assert.equal(canonicalJson(spec), before);
});
test('undefined denominators remain null and one-class datasets do not acquire fake AUC', () => {
  const none = evaluate(fixture([0, 1], [0.1, 0.9], 1));
  assert.equal(none.metrics.find((m) => m.key === 'precision').value, null);
  assert.equal(none.metrics.find((m) => m.key === 'recall').value, 0);
  const negative = evaluate(fixture([0, 0], [0.1, 0.2], 1));
  assert.equal(negative.classification.rocAuc, null);
  assert.equal(negative.classification.averagePrecision, null);
  assert.equal(negative.metrics.find((m) => m.key === 'f1').value, null);
  assert.equal(negative.chart.series[0].points.length, 0);
  const positive = evaluate(fixture([1, 1], [0.1, 0.2], 1));
  assert.equal(positive.classification.rocAuc, null);
  close(positive.classification.averagePrecision, 1);
  assert.equal(positive.classification.operatingPoint.fpr, null);
});
test('score boundaries are inclusive and all counts are conserved', () => {
  const spec = fixture([0, 1, 1, 0], [0, 0, 1, 1]);
  for (const threshold of [0, 0.5, 1]) {
    const r = evaluate(spec, { threshold });
    assert.equal(
      Object.values(r.classification.confusion).reduce((a, b) => a + b, 0),
      4,
    );
  }
  assert.deepEqual(evaluate(spec, { threshold: 1 }).classification.confusion, {
    tp: 1,
    fp: 1,
    tn: 1,
    fn: 1,
  });
  assert.deepEqual(evaluate(spec, { threshold: 0 }).classification.confusion, {
    tp: 2,
    fp: 2,
    tn: 0,
    fn: 0,
  });
});
test('observed-data validation rejects mismatches, sparse arrays, coercion and unsupported data fields', () => {
  const base = fixture([0, 1], [0.2, 0.8]);
  for (const data of [
    undefined,
    { labels: [0], scores: [0.2] },
    { labels: [0, 1], scores: [0.2] },
    { labels: [0, '1'], scores: [0.2, 0.8] },
    { labels: [0, 1], scores: [0.2, Infinity] },
    { labels: [0, 1], scores: [-0.1, 0.8] },
    { labels: [0, 1], scores: [0.2, 1.1] },
    { labels: new Array(2), scores: [0.2, 0.8] },
    { labels: [0, null], scores: [0.2, 0.8] },
    { labels: [0, 1], scores: [0.2, null] },
    { labels: [0, 1], scores: new Array(2) },
    { labels: Array(2001).fill(0), scores: Array(2001).fill(0.5) },
    { ...base.data, source: ' ' },
    { ...base.data, url: 'https://example.com' },
  ])
    assert.throws(() => validateSpec({ ...base, data }), SpecError);
  assert.throws(
    () => validateSpec({ ...createSpec('loan'), data: base.data }),
    /only classification/,
  );
});
