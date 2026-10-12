import { MODELS, VERSION, SpecError, validateSpec, evaluate } from './engine.js';

export const ANALYSIS_LIMITS = Object.freeze({
  axisPoints: 201,
  cells: 625,
  estimatedWork: 2000000,
});
const analysisObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
function analysisExact(value, keys, path) {
  if (!analysisObject(value)) throw new SpecError([`${path}: expected an object`]);
  const unknown = Object.keys(value).filter((key) => !keys.includes(key));
  if (unknown.length) throw new SpecError(unknown.map((key) => `${path}.${key}: unknown field`));
}
function analysisDense(array, path) {
  for (let index = 0; index < array.length; index++) {
    if (!Object.hasOwn(array, index))
      throw new SpecError([`${path}[${index}]: sparse array slot is missing`]);
  }
}
export function metricCatalog(spec) {
  return evaluate(spec).metrics.map(({ key, label, unit }) => ({ key, label, unit }));
}
function analysisMetrics(spec, requested, evaluated) {
  const all = evaluated
    ? evaluated.metrics.map(({ key, label, unit }) => ({ key, label, unit }))
    : metricCatalog(spec);
  if (requested === undefined) return all;
  if (!Array.isArray(requested) || !requested.length || requested.length > all.length)
    throw new SpecError(['analysis.metrics: expected a nonempty list of metric keys']);
  analysisDense(requested, 'analysis.metrics');
  const selected = requested.map((name) => {
    const metric = all.find((m) => m.key === name || m.label === name);
    if (!metric)
      throw new SpecError([
        `analysis.metrics: unknown metric ${String(name)}; choose ${all.map((m) => m.key).join(', ')}`,
      ]);
    return metric;
  });
  if (new Set(selected.map((m) => m.key)).size !== selected.length)
    throw new SpecError(['analysis.metrics: duplicate metrics']);
  return selected;
}
function analysisCost(spec, parameters = spec.parameters) {
  switch (spec.model) {
    case 'classification':
      return spec.data.labels.length * Math.ceil(Math.log2(spec.data.labels.length) + 1);
    case 'epidemic':
      return parameters.days * 40;
    case 'loan':
      return parameters.years * 12;
    case 'descent':
      return parameters.steps + 1;
    case 'circuit':
      return 201;
    case 'bayes':
      return 301;
    default:
      throw new SpecError(['Unknown model']);
  }
}
function analysisValues(result, metrics) {
  return Object.fromEntries(
    metrics.map((m) => [m.key, result.metrics.find((item) => item.key === m.key).value]),
  );
}
function analysisAxis(spec, axis, index) {
  const path = `sweep.axes[${index}]`;
  analysisExact(axis, ['parameter', 'min', 'max', 'points'], path);
  if (
    typeof axis.parameter !== 'string' ||
    !Object.hasOwn(MODELS[spec.model].controls, axis.parameter)
  )
    throw new SpecError([`${path}.parameter: choose a parameter from this model`]);
  const control = MODELS[spec.model].controls[axis.parameter];
  if (
    !Number.isFinite(axis.min) ||
    !Number.isFinite(axis.max) ||
    axis.min < control.min ||
    axis.max > control.max ||
    axis.min >= axis.max
  )
    throw new SpecError([`${path}: min < max must lie within [${control.min}, ${control.max}]`]);
  if (!Number.isInteger(axis.points) || axis.points < 2 || axis.points > ANALYSIS_LIMITS.axisPoints)
    throw new SpecError([`${path}.points: expected integer 2..${ANALYSIS_LIMITS.axisPoints}`]);
  if (
    control.integer &&
    (!Number.isInteger(axis.min) ||
      !Number.isInteger(axis.max) ||
      axis.points > axis.max - axis.min + 1)
  )
    throw new SpecError([
      `${path}: integer parameters require integer bounds and enough distinct integer coordinates`,
    ]);
  const values = Array.from({ length: axis.points }, (_, i) => {
    if (i === 0) return axis.min;
    if (i === axis.points - 1) return axis.max;
    const value = axis.min + ((axis.max - axis.min) * i) / (axis.points - 1);
    return control.integer ? Math.round(value) : value;
  });
  if (values.some((value, i) => i > 0 && value <= values[i - 1]))
    throw new SpecError([
      `${path}: requested coordinates are not distinct at floating-point precision; widen bounds or reduce points`,
    ]);
  return { ...axis, label: control.label, unit: control.unit, integer: control.integer, values };
}

/** Exhaustive bounded grid sampling, not a continuous/global optimization claim. */
export function sweep(spec, config) {
  const clean = validateSpec(spec);
  analysisExact(config, ['axes', 'metrics', 'objective'], 'sweep');
  if (!Array.isArray(config.axes) || config.axes.length < 1 || config.axes.length > 2)
    throw new SpecError(['sweep.axes: supply one or two axes']);
  analysisDense(config.axes, 'sweep.axes');
  const axes = config.axes.map((axis, index) => analysisAxis(clean, axis, index));
  if (new Set(axes.map((axis) => axis.parameter)).size !== axes.length)
    throw new SpecError(['sweep.axes: parameters must differ']);
  const cells = axes.reduce((n, axis) => n * axis.points, 1);
  if (cells > ANALYSIS_LIMITS.cells)
    throw new SpecError([
      `sweep: ${cells} cells exceeds limit ${ANALYSIS_LIMITS.cells}; reduce points`,
    ]);
  const metrics = analysisMetrics(clean, config.metrics);
  let objective = null;
  if (config.objective !== undefined) {
    analysisExact(config.objective, ['metric', 'direction'], 'sweep.objective');
    const metric = metrics.find(
      (m) => m.key === config.objective.metric || m.label === config.objective.metric,
    );
    if (!metric || !['min', 'max'].includes(config.objective.direction))
      throw new SpecError(['sweep.objective: select a requested metric and direction min|max']);
    objective = { metric: metric.key, direction: config.objective.direction };
  }
  // Include the catalogue evaluation and each requested grid point's actual horizon.
  // Invalid coupled combinations are conservatively charged their potential model cost.
  let estimatedWork = analysisCost(clean);
  for (let j = 0; j < (axes[1]?.points || 1); j++)
    for (let i = 0; i < axes[0].points; i++) {
      const sampled = { ...clean.parameters, [axes[0].parameter]: axes[0].values[i] };
      if (axes[1]) sampled[axes[1].parameter] = axes[1].values[j];
      estimatedWork += analysisCost(clean, sampled);
    }
  if (estimatedWork > ANALYSIS_LIMITS.estimatedWork)
    throw new SpecError([
      `sweep: estimated work ${estimatedWork} exceeds limit ${ANALYSIS_LIMITS.estimatedWork}; reduce points, horizon or data size`,
    ]);
  const rows = [];
  let invalidCells = 0,
    undefinedCells = 0,
    best = null;
  for (let j = 0; j < (axes[1]?.points || 1); j++)
    for (let i = 0; i < axes[0].points; i++) {
      const coordinates = { [axes[0].parameter]: axes[0].values[i] };
      if (axes[1]) coordinates[axes[1].parameter] = axes[1].values[j];
      const gridIndex = axes.length === 2 ? [i, j] : [i];
      let row;
      try {
        const result = evaluate(clean, coordinates),
          values = analysisValues(result, metrics),
          undefinedMetric = Object.values(values).some((value) => value === null);
        row = {
          gridIndex,
          coordinates,
          values,
          status: undefinedMetric ? 'undefined' : 'ok',
          warnings: result.warnings,
        };
        if (undefinedMetric) undefinedCells++;
        if (objective && values[objective.metric] !== null) {
          const value = values[objective.metric],
            better =
              !best || (objective.direction === 'min' ? value < best.value : value > best.value);
          if (better)
            best = {
              ...objective,
              value,
              coordinates: { ...coordinates },
              gridIndex: [...gridIndex],
              ties: 1,
            };
          else if (value === best.value) best.ties++;
        }
      } catch (error) {
        if (!(error instanceof SpecError)) throw error;
        invalidCells++;
        row = {
          gridIndex,
          coordinates,
          values: Object.fromEntries(metrics.map((m) => [m.key, null])),
          status: 'invalid',
          warnings: error.issues,
        };
      }
      rows.push(row);
    }
  const warnings = [
    'Grid sampling only: the best sampled point is not a global or continuous optimum. Unsampled behavior can be missed.',
  ];
  if (invalidCells)
    warnings.push(
      `${invalidCells} sampled combinations violate the model domain and are excluded from the objective.`,
    );
  if (undefinedCells)
    warnings.push(
      `${undefinedCells} valid sampled combinations contain undefined selected metrics.`,
    );
  return {
    kind: 'sweep',
    engineVersion: VERSION,
    model: clean.model,
    parameters: { ...clean.parameters },
    axes,
    metrics,
    objective,
    rows,
    best,
    cells,
    invalidCells,
    undefinedCells,
    estimatedWork,
    warnings,
  };
}

/** Finite perturbations with explicit coordinates and one-sided boundary handling. */
export function sensitivity(spec, config = {}) {
  const clean = validateSpec(spec);
  analysisExact(config, ['parameters', 'steps', 'metrics'], 'sensitivity');
  const controls = MODELS[clean.model].controls;
  const parameters = config.parameters === undefined ? Object.keys(controls) : config.parameters;
  if (Array.isArray(parameters) && parameters.length <= Object.keys(controls).length)
    analysisDense(parameters, 'sensitivity.parameters');
  if (
    !Array.isArray(parameters) ||
    !parameters.length ||
    parameters.length > Object.keys(controls).length ||
    parameters.some((key) => typeof key !== 'string' || !Object.hasOwn(controls, key)) ||
    new Set(parameters).size !== parameters.length
  )
    throw new SpecError(['sensitivity.parameters: select distinct parameter names from the model']);
  if (config.steps !== undefined) analysisExact(config.steps, parameters, 'sensitivity.steps');
  const plans = parameters.map((parameter) => {
    const control = controls[parameter],
      center = clean.parameters[parameter],
      step = config.steps?.[parameter] ?? control.step;
    const minimumStep = Math.max(
      (control.max - control.min) * 1e-9,
      Number.EPSILON * Math.max(1, Math.abs(center)) * 8,
    );
    if (
      !Number.isFinite(step) ||
      step < minimumStep ||
      step > control.max - control.min ||
      (control.integer && !Number.isInteger(step))
    )
      throw new SpecError([
        `sensitivity.steps.${parameter}: ${control.integer ? 'integer ' : ''}step must lie within [${minimumStep}, ${control.max - control.min}]`,
      ]);
    const lowerCoordinate = Math.max(control.min, center - step),
      upperCoordinate = Math.min(control.max, center + step);
    return { parameter, control, center, step, lowerCoordinate, upperCoordinate };
  });
  // Baseline doubles as the metric catalogue; each distinct attempted endpoint is charged.
  const estimatedWork =
    analysisCost(clean) +
    plans.reduce(
      (sum, plan) =>
        sum +
        (plan.lowerCoordinate === plan.center
          ? 0
          : analysisCost(clean, { ...clean.parameters, [plan.parameter]: plan.lowerCoordinate })) +
        (plan.upperCoordinate === plan.center
          ? 0
          : analysisCost(clean, { ...clean.parameters, [plan.parameter]: plan.upperCoordinate })),
      0,
    );
  if (estimatedWork > ANALYSIS_LIMITS.estimatedWork)
    throw new SpecError(['sensitivity: estimated work exceeds budget']);
  const baseline = evaluate(clean),
    metrics = analysisMetrics(clean, config.metrics, baseline),
    baselineValues = analysisValues(baseline, metrics);
  const rows = plans.map(
    ({ parameter, control, center, step, lowerCoordinate, upperCoordinate }) => {
      function endpoint(coordinate) {
        if (coordinate === center)
          return {
            coordinate,
            status: 'unavailable',
            warnings: ['No distinct coordinate within this boundary.'],
            values: baselineValues,
          };
        try {
          const result = evaluate(clean, { [parameter]: coordinate });
          return {
            coordinate,
            status: 'ok',
            warnings: result.warnings,
            values: analysisValues(result, metrics),
          };
        } catch (error) {
          if (!(error instanceof SpecError)) throw error;
          return {
            coordinate,
            status: 'invalid',
            warnings: error.issues,
            values: Object.fromEntries(metrics.map((m) => [m.key, null])),
          };
        }
      }
      const lower = endpoint(lowerCoordinate),
        upper = endpoint(upperCoordinate),
        hasLower = lower.status === 'ok',
        hasUpper = upper.status === 'ok';
      const method =
        hasLower && hasUpper
          ? Math.abs(center - lower.coordinate - (upper.coordinate - center)) < 1e-12
            ? 'central'
            : 'secant'
          : hasUpper
            ? 'forward'
            : hasLower
              ? 'backward'
              : 'unavailable';
      const from = hasLower ? lower : { coordinate: center, values: baselineValues },
        to = hasUpper ? upper : { coordinate: center, values: baselineValues };
      const deltaInput = method === 'unavailable' ? null : to.coordinate - from.coordinate;
      const estimates = Object.fromEntries(
        metrics.map((m) => {
          const low = from.values[m.key],
            high = to.values[m.key],
            deltaOutput = low === null || high === null || deltaInput === null ? null : high - low,
            endpointSlope = deltaOutput === null ? null : deltaOutput / deltaInput;
          const base = baselineValues[m.key],
            baselineDefined = base !== null,
            slope = baselineDefined ? endpointSlope : null,
            elasticity =
              slope === null || base === null || base === 0 || center === 0
                ? null
                : (slope * center) / base;
          return [
            m.key,
            {
              baseline: base,
              lower: lower.values[m.key],
              upper: upper.values[m.key],
              deltaInput,
              deltaOutput,
              slope,
              endpointSlope,
              baselineDefined,
              status: !baselineDefined
                ? 'undefined-baseline'
                : endpointSlope === null
                  ? 'undefined-comparison'
                  : 'ok',
              elasticity,
            },
          ];
        }),
      );
      return {
        parameter,
        label: control.label,
        unit: control.unit,
        center,
        step,
        discrete: control.integer,
        lower: { coordinate: lower.coordinate, status: lower.status, warnings: lower.warnings },
        upper: { coordinate: upper.coordinate, status: upper.status, warnings: upper.warnings },
        method,
        estimates,
        warnings: metrics
          .filter((m) => baselineValues[m.key] === null)
          .map(
            (m) =>
              `${m.label} is undefined at the baseline; no local slope is reported. Any defined endpoint comparison is a secant only.`,
          ),
      };
    },
  );
  return {
    kind: 'sensitivity',
    engineVersion: VERSION,
    model: clean.model,
    parameters: { ...clean.parameters },
    metrics,
    rows,
    estimatedWork,
    warnings: [
      'Finite differences describe explicit finite perturbations, not proven derivatives. Integer parameters and decision thresholds can be discontinuous.',
      'Elasticity is a local relative-change ratio and is undefined when the input baseline is zero or the metric baseline is zero or undefined.',
      ...(rows.some((row) => row.warnings.length)
        ? [
            'At least one selected baseline metric is undefined. Its local slope is null even if an endpoint secant can be computed; inspect row warnings.',
          ]
        : []),
    ],
  };
}
