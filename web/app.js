/* Bundled behind the pure engine. All spec content is escaped, never executed. */
let spec = validateSpec(INITIAL_SPEC),
  params = { ...spec.parameters },
  baseline = null,
  result = evaluate(spec),
  view = 'primary',
  cursor = result.rows.length - 1,
  timer = null;
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const number = (v, d = 2) =>
  v === null ? 'Undefined' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d });
function shell() {
  stop();
  const model = MODELS[spec.model];
  $('app').innerHTML =
    `<section class="page-header"><div><div class="eyebrow">${esc(model.field)} / ${esc(model.label)}</div><h1>${esc(spec.title)}</h1><p>${esc(spec.description)}</p></div><div><div class="tools"><button id="pin" class="primary">Pin baseline</button><button id="edit" class="quiet">Edit experiment</button></div><div id="baseline-status" class="baseline-status"></div></div></section><div class="workbench"><aside class="controls" aria-label="Experiment parameters"><div class="control-header"><h2 class="section-label">01 / Change the inputs</h2><button id="reset" class="quiet">Reset</button></div><div id="controls">${Object.entries(
      model.controls,
    )
      .map(
        ([key, c]) =>
          `<div class="control"><label for="n-${key}">${esc(c.label)}</label><div class="entry"><input id="n-${key}" data-key="${key}" type="number" min="${c.min}" max="${c.max}" step="any" value="${params[key]}" aria-describedby="h-${key}"><span class="unit">${esc(c.unit)}</span></div><input id="s-${key}" data-key="${key}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${params[key]}" aria-label="${esc(c.label)} slider" aria-describedby="h-${key}"><p id="h-${key}" class="hint">${esc(c.help)}</p></div>`,
      )
      .join(
        '',
      )}</div>${spec.scenarios?.length ? `<div class="scenarios"><h3 class="section-label">Try a scenario</h3>${spec.scenarios.map((s, i) => `<button class="quiet scenario" data-scenario="${i}">${esc(s.name)} ↗</button>`).join('')}</div>` : ''}<p class="comparison-help">Pin the current inputs, then change one thing. Dashed lines show that baseline.</p><p id="status" class="status" role="status" aria-live="polite"></p></aside><section class="canvas" aria-label="Computed result"><div class="view-head"><div><div class="section-label">02 / Follow the result</div><h2 id="chart-title">${esc(model.label)}</h2></div><div class="switcher"><button id="primary-view" aria-pressed="true">${spec.model === 'descent' ? 'Objective' : 'Chart'}</button>${spec.model === 'descent' ? '<button id="path-view" aria-pressed="false">Path through x, y</button>' : ''}<button id="scale" aria-pressed="false" hidden>Log scale</button></div></div><div id="legend" class="legend"></div><div class="chart-wrap" id="chart"></div><p id="chart-note" class="chart-note"></p><div class="transport" id="transport"><button id="play" aria-label="Play calculation steps">Play</button><input id="scrub" type="range" min="0" max="${result.rows.length - 1}" value="${cursor}" step="1" aria-label="Inspect calculation step"><output id="step-label" for="scrub"></output></div><div id="metrics" class="metrics"></div><div id="warnings"></div><div id="reading" class="reading"></div></section></div><section class="method"><div><div class="section-label">03 / Look under the surface</div><h2>How this is calculated</h2></div><div><div class="formula">${esc(model.formula)}</div><ul>${model.assumptions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul><div class="references">${model.references.map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.label)} ↗</a>`).join('')}</div><details><summary>Inspect the numerical table <span id="row-count"></span></summary><div id="table" class="table-wrap"></div></details><div class="export-bar"><button id="csv">Download CSV</button><button id="json">Download results</button><button id="save-spec">Save experiment</button><button id="svg">Export chart SVG</button><button id="print">Print / PDF</button></div><p class="chart-note">Exports contain full computed results. Pinning and playback only change the view. Saved experiments use your current inputs.</p></div></section><dialog id="editor"><h2>Make it your experiment.</h2><p>Edit the title, inputs and named scenarios. Model equations are fixed and versioned.</p><label class="section-label" for="spec-text">Experiment JSON · schema version 1</label><textarea id="spec-text" spellcheck="false"></textarea><pre class="error" id="spec-error" role="alert" hidden></pre><div class="actions"><button id="cancel" class="quiet">Cancel</button><button id="apply" class="primary">Validate & apply</button></div></dialog>`;
  bind();
  update();
}
let logScale = false;
function stop() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if ($('play')) $('play').textContent = 'Play';
}
function update() {
  result = evaluate(spec, params);
  cursor = Math.min(cursor, result.rows.length - 1);
  const prior = baseline ? evaluate(spec, baseline) : null;
  $('metrics').innerHTML = result.metrics
    .map((m, i) => {
      const previous = prior?.metrics[i]?.value;
      const delta =
        m.value !== null && previous !== null && previous !== undefined ? m.value - previous : null;
      return `<div class="metric"><span class="metric-label">${esc(m.label)}</span><span class="metric-value">${number(m.value, m.digits)}</span><span class="metric-unit">${esc(m.unit)}</span>${delta !== null ? `<span class="metric-delta">${delta > 0 ? '+' : ''}${number(delta, m.digits)} vs baseline</span>` : ''}</div>`;
    })
    .join('');
  $('warnings').innerHTML = result.warnings.map((w) => `<p class="warning">${esc(w)}</p>`).join('');
  $('reading').innerHTML = result.insights
    .map(
      (s, i) =>
        `<article><span class="number">0${i + 1}</span><h3>${esc(s.label)}</h3><p>${esc(s.text)}</p></article>`,
    )
    .join('');
  $('baseline-status').innerHTML = baseline
    ? 'Baseline pinned · <button id="clear-baseline" class="quiet">Clear</button>'
    : 'No baseline pinned';
  if ($('clear-baseline'))
    $('clear-baseline').onclick = () => {
      baseline = null;
      update();
    };
  $('pin').textContent = baseline ? 'Replace baseline' : 'Pin baseline';
  $('scrub').max = result.rows.length - 1;
  $('scrub').value = cursor;
  $('transport').hidden = spec.model === 'bayes';
  $('row-count').textContent = `· ${result.rows.length} rows`;
  $('table').innerHTML =
    `<table><caption class="section-label">${esc(MODELS[spec.model].label)} · full calculation</caption><thead><tr>${result.columns.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${result.rows.map((r) => `<tr>${result.columns.map((c) => `<td>${typeof r[c] === 'number' ? number(r[c], 6) : esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  $('scale').hidden = spec.model !== 'descent' || view !== 'primary';
  draw(prior);
  status('');
}
function status(message) {
  $('status').textContent = message;
}
function draw(prior = baseline ? evaluate(spec, baseline) : null) {
  const chart = view === 'path' ? result.secondary : result.chart;
  const baselineChart = prior ? (view === 'path' ? prior.secondary : prior.chart) : null;
  const stepFraction = cursor / Math.max(1, result.rows.length - 1);
  const visible = chart.series.map((s) => ({
    ...s,
    points:
      spec.model === 'bayes'
        ? s.points
        : s.points.slice(0, Math.max(1, Math.floor(stepFraction * (s.points.length - 1)) + 1)),
  }));
  const scaleLog = logScale && view === 'primary' && spec.model === 'descent';
  $('chart').innerHTML = plotSvg(chart, visible, baselineChart, scaleLog);
  $('legend').innerHTML =
    chart.series
      .map((s, i) => `<span><i class="swatch s${i}" aria-hidden="true"></i>${esc(s.name)}</span>`)
      .join('') +
    (prior ? '<span><i class="swatch baseline-key" aria-hidden="true"></i>Baseline</span>' : '');
  const row = result.rows[cursor];
  $('step-label').textContent =
    spec.model === 'descent'
      ? `Step ${row.iteration} / ${result.rows.at(-1).iteration}`
      : spec.model === 'loan'
        ? `Month ${row.month}`
        : spec.model === 'circuit'
          ? `${number(row.seconds, 3)} s`
          : `Day ${row.day}`;
  $('chart-note').textContent =
    spec.model === 'bayes'
      ? `The curve varies prevalence while sensitivity and specificity stay fixed. The marked point is your selected prevalence.`
      : view === 'path'
        ? `Dots follow successive updates. Axis limits include the full trace; change the iteration count to inspect a shorter path.`
        : `Shown through ${$('step-label').textContent.toLowerCase()}. Metrics below use the complete calculation.${scaleLog ? ' Zero values are omitted on a logarithmic axis.' : ''}`;
}
function plotSvg(chart, visible, baselineChart, logarithmic = false) {
  const W = Math.max(320, Math.min(860, $('chart').clientWidth)),
    H = W < 500 ? 300 : 380,
    L = W < 500 ? 55 : 72,
    R = 22,
    T = 22,
    B = 55,
    w = W - L - R,
    h = H - T - B;
  const full = [...chart.series, ...(baselineChart?.series || [])];
  const all = full.flatMap((s) => s.points);
  const valid = all.filter(
    (p) => p.y !== null && Number.isFinite(p.y) && (!logarithmic || p.y > 0),
  );
  const transform = (y) => (logarithmic ? Math.log10(y) : y);
  let xmin = Math.min(0, ...all.map((p) => p.x)),
    xmax = Math.max(0, ...all.map((p) => p.x)),
    ymin = Math.min(...valid.map((p) => transform(p.y))),
    ymax = Math.max(...valid.map((p) => transform(p.y)));
  if (!valid.length) {
    ymin = 0;
    ymax = spec.model === 'bayes' ? 100 : 1;
  }
  if (!logarithmic) ymin = Math.min(0, ymin);
  if (xmin === xmax) {
    xmin -= 0.5;
    xmax += 0.5;
  }
  if (ymin === ymax) {
    ymin -= 0.5;
    ymax += 0.5;
  }
  if (view === 'path') {
    const pad = (ymax - ymin) * 0.06;
    ymin -= pad;
    ymax += pad;
  } else ymax += (ymax - ymin) * 0.06;
  const sx = (x) => L + ((x - xmin) / (xmax - xmin)) * w,
    sy = (y) => T + h - ((transform(y) - ymin) / (ymax - ymin)) * h;
  const tick = (n) =>
    Math.abs(n) >= 100000 || (Math.abs(n) > 0 && Math.abs(n) < 0.001)
      ? n.toExponential(1)
      : number(n, Math.abs(n) < 1 ? 4 : 2);
  const xt = Array.from({ length: 6 }, (_, i) => xmin + ((xmax - xmin) * i) / 5),
    yt = Array.from({ length: 5 }, (_, i) => ymin + ((ymax - ymin) * i) / 4);
  const path = (points) => {
    let open = false;
    return points
      .map((p) => {
        if (p.y === null || !Number.isFinite(p.y) || (logarithmic && p.y <= 0)) {
          open = false;
          return '';
        }
        const q = `${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`,
          prefix = open ? 'L' : 'M';
        open = true;
        return prefix + q;
      })
      .join(' ');
  };
  const grid = yt
    .map(
      (t) =>
        `<line class="grid" x1="${L}" y1="${sy(logarithmic ? 10 ** t : t)}" x2="${W - R}" y2="${sy(logarithmic ? 10 ** t : t)}"/><text x="${L - 10}" y="${sy(logarithmic ? 10 ** t : t) + 4}" text-anchor="end">${tick(logarithmic ? 10 ** t : t)}</text>`,
    )
    .join('');
  const axes = `<line class="axis" x1="${L}" y1="${T + h}" x2="${W - R}" y2="${T + h}"/>${xt.map((t) => `<text x="${sx(t)}" y="${T + h + 23}" text-anchor="middle">${tick(t)}</text>`).join('')}<text x="${L + w / 2}" y="${H - 7}" text-anchor="middle">${esc(chart.xLabel)}</text><text x="${L}" y="12">${esc(chart.yLabel)}${logarithmic ? ' · log scale' : ''}</text>`;
  const baselinePaths = (baselineChart?.series || [])
    .map((s) => `<path class="trace baseline" d="${path(s.points)}"/>`)
    .join('');
  const paths = visible.map((s, i) => `<path class="trace s${i}" d="${path(s.points)}"/>`).join('');
  const contours =
    view === 'path'
      ? [0.01, 0.04, 0.12, 0.3, 0.6, 1]
          .map((f) => {
            const loss = Math.min(1e12, Math.max(1, result.rows[0].loss)) * f;
            const rx = (Math.sqrt((2 * loss) / params.a) / (xmax - xmin)) * w,
              ry = (Math.sqrt((2 * loss) / params.b) / (ymax - ymin)) * h;
            return `<ellipse class="contour" cx="${sx(0)}" cy="${sy(0)}" rx="${rx}" ry="${ry}" fill="none" stroke="#bac8b9" stroke-width="1"/>`;
          })
          .join('')
      : '';
  const points = visible
    .map((s) => s.points.at(-1))
    .filter((p) => p && p.y !== null && (!logarithmic || p.y > 0));
  const marker = chart.marker ? chart.marker : points[0];
  const mark =
    marker && marker.y !== null && (!logarithmic || marker.y > 0)
      ? `<line class="cursor" x1="${sx(marker.x)}" y1="${T}" x2="${sx(marker.x)}" y2="${T + h}"/><circle class="point" cx="${sx(marker.x)}" cy="${sy(marker.y)}" r="5"/>`
      : '';
  const empty = !valid.length
    ? `<text x="${L + w / 2}" y="${T + h / 2}" text-anchor="middle">No defined values to plot.</text>`
    : '';
  return `<svg id="plot-svg" class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="plot-title plot-description"><title id="plot-title">${esc(MODELS[spec.model].label)}: ${esc(chart.yLabel)} against ${esc(chart.xLabel)}</title><desc id="plot-description">${esc(result.insights[0].text)} Exact values are available in the numerical table and CSV export.</desc><defs><clipPath id="plot-area"><rect x="${L}" y="${T}" width="${w}" height="${h}"/></clipPath></defs>${grid}${axes}<g clip-path="url(#plot-area)">${contours}${baselinePaths}${paths}${mark}</g>${empty}</svg>`;
}
function change(key, value) {
  try {
    const next = { ...params, [key]: value };
    evaluate(spec, next);
    params = next;
    cursor = evaluate(spec, params).rows.length - 1;
    stop();
    $('n-' + key).value = value;
    $('s-' + key).value = value;
    update();
  } catch (error) {
    status(error.message);
    $('n-' + key).setAttribute('aria-invalid', 'true');
    return;
  }
  $('n-' + key).removeAttribute('aria-invalid');
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function bind() {
  Object.keys(MODELS[spec.model].controls).forEach((key) => {
    $('n-' + key).addEventListener('change', (e) =>
      change(key, e.target.value.trim() === '' ? NaN : Number(e.target.value)),
    );
    $('s-' + key).addEventListener('input', (e) => change(key, Number(e.target.value)));
  });
  $('reset').onclick = () => {
    params = { ...spec.parameters };
    cursor = evaluate(spec, params).rows.length - 1;
    view = 'primary';
    logScale = false;
    shell();
  };
  $('pin').onclick = () => {
    baseline = { ...params };
    update();
  };
  document.querySelectorAll('.scenario').forEach(
    (el) =>
      (el.onclick = () => {
        params = { ...spec.parameters, ...spec.scenarios[Number(el.dataset.scenario)].parameters };
        cursor = evaluate(spec, params).rows.length - 1;
        shell();
      }),
  );
  $('scrub').oninput = (e) => {
    stop();
    cursor = Number(e.target.value);
    draw();
  };
  $('play').onclick = () => {
    if (timer !== null) {
      stop();
      return;
    }
    if (cursor >= result.rows.length - 1) cursor = 0;
    $('play').textContent = 'Pause';
    const advance = () => {
      if (cursor >= result.rows.length - 1) {
        stop();
        return;
      }
      cursor++;
      $('scrub').value = cursor;
      draw();
      timer = setTimeout(advance, Math.max(30, 2500 / result.rows.length));
    };
    timer = setTimeout(advance, 80);
  };
  $('primary-view').onclick = () => {
    view = 'primary';
    $('primary-view').setAttribute('aria-pressed', 'true');
    $('path-view')?.setAttribute('aria-pressed', 'false');
    update();
  };
  if ($('path-view'))
    $('path-view').onclick = () => {
      view = 'path';
      $('path-view').setAttribute('aria-pressed', 'true');
      $('primary-view').setAttribute('aria-pressed', 'false');
      update();
    };
  $('scale').onclick = () => {
    logScale = !logScale;
    $('scale').setAttribute('aria-pressed', String(logScale));
    draw();
  };
  $('csv').onclick = () =>
    download(`counterplot-${spec.model}.csv`, csv(result), 'text/csv;charset=utf-8');
  $('json').onclick = () =>
    download(
      `counterplot-${spec.model}-results.json`,
      JSON.stringify(
        { spec: { ...spec, parameters: params }, baseline, results: result },
        null,
        2,
      ) + '\n',
      'application/json',
    );
  $('save-spec').onclick = () =>
    download(
      `counterplot-${spec.model}.json`,
      JSON.stringify({ ...spec, parameters: params }, null, 2) + '\n',
      'application/json',
    );
  $('svg').onclick = () => {
    const svg = $('plot-svg').cloneNode(true);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent =
      '.grid{stroke:#dde0d5}.axis{stroke:#c9cdc0}text{font:12px monospace;fill:#536360}.trace{fill:none;stroke:#bb4b26;stroke-width:2.7;stroke-linecap:round;stroke-linejoin:round}.s1{stroke:#22685e}.s2{stroke:#405b95}.baseline{stroke:#536360;stroke-dasharray:6 5;opacity:.7;stroke-width:1.5}.cursor{stroke:#536360;stroke-dasharray:3 4}.point{fill:#bb4b26;stroke:#f8f5ed;stroke-width:2}';
    svg.prepend(style);
    download(
      `counterplot-${spec.model}-chart.svg`,
      new XMLSerializer().serializeToString(svg),
      'image/svg+xml',
    );
  };
  $('print').onclick = () => window.print();
  $('edit').onclick = () => {
    $('spec-text').value = JSON.stringify({ ...spec, parameters: params }, null, 2);
    $('spec-error').hidden = true;
    $('editor').showModal();
  };
  $('cancel').onclick = () => $('editor').close();
  $('apply').onclick = () => {
    try {
      if ($('spec-text').value.length > 100000) throw new Error('Experiment must be under 100 KB.');
      const next = validateSpec(JSON.parse($('spec-text').value));
      spec = next;
      params = { ...spec.parameters };
      baseline = null;
      view = 'primary';
      logScale = false;
      cursor = evaluate(spec, params).rows.length - 1;
      $('editor').close();
      shell();
    } catch (error) {
      $('spec-error').textContent = error.message;
      $('spec-error').hidden = false;
    }
  };
}
shell();
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => draw(), 100);
});
