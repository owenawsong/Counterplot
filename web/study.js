/* Parameter studies run in a fixed, local worker. No user formulas are executed. */
let currentStudy = null,
  studySpec = null,
  studyOptions = null,
  studyAction = null,
  studyWorker = null,
  studyRevision = 0,
  studyCancel = null;
function effectiveSpec() {
  return validateSpec({ ...spec, parameters: { ...params } });
}
function studyStatus(message) {
  if ($('study-status')) $('study-status').textContent = message;
}
function rangeFor(key) {
  const c = MODELS[spec.model].controls[key],
    v = params[key],
    radius = Math.abs(v) * 0.5 || (c.max - c.min) * 0.15;
  let min = Math.max(c.min, v - radius),
    max = Math.min(c.max, v + radius);
  if (c.integer) {
    min = Math.ceil(min);
    max = Math.floor(max);
  }
  if (min >= max) {
    min = c.min;
    max = c.max;
  }
  return { min, max };
}
function setAxis(second = false) {
  const suffix = second ? '2' : '',
    key = $('study-axis' + suffix).value;
  const bounds = $('second-bounds');
  if (second) bounds.hidden = !key;
  if (!key) return;
  const r = rangeFor(key),
    c = MODELS[spec.model].controls[key];
  for (const part of ['min', 'max']) {
    const input = $('study-' + part + suffix);
    input.value = r[part];
    input.min = c.min;
    input.max = c.max;
    input.step = c.integer ? '1' : 'any';
  }
  const points = $('study-points' + suffix);
  points.value = Math.min(second ? 11 : 21, c.integer ? r.max - r.min + 1 : 21);
}
function cancelStudy() {
  studyRevision++;
  if (studyCancel) {
    studyCancel();
    studyCancel = null;
  }
  if (studyWorker) {
    studyWorker.terminate();
    studyWorker = null;
  }
}
function bindStudy() {
  cancelStudy();
  const controls = MODELS[spec.model].controls,
    metrics = Analysis.metricCatalog(effectiveSpec());
  for (const id of ['study-axis', 'study-axis2', 'study-metric']) $(id).replaceChildren();
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'One parameter / line study';
  $('study-axis2').append(none);
  for (const [key, c] of Object.entries(controls)) {
    for (const id of ['study-axis', 'study-axis2']) {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = c.label;
      $(id).append(o);
    }
  }
  for (const m of metrics) {
    const o = document.createElement('option');
    o.value = m.key;
    o.textContent = m.label + (m.unit ? ' · ' + m.unit : '');
    $('study-metric').append(o);
  }
  if (spec.model === 'classification') {
    $('study-metric').value = 'f1';
    $('study-direction').value = 'max';
  }
  $('study-axis2').disabled = Object.keys(controls).length < 2;
  const filterAxes = () => {
    for (const o of $('study-axis2').options)
      o.disabled = o.value !== '' && o.value === $('study-axis').value;
    if ($('study-axis2').value === $('study-axis').value) {
      $('study-axis2').value = '';
      $('second-bounds').hidden = true;
    }
  };
  setAxis();
  filterAxes();
  $('study-axis').onchange = () => {
    setAxis();
    filterAxes();
  };
  $('study-axis2').onchange = () => setAxis(true);
  $('run-study').onclick = () => runAnalysis('sweep');
  $('study-color').onchange = () => {
    if (currentStudy?.kind === 'sweep') renderStudy(currentStudy);
  };
  $('run-sensitivity').onclick = () => runAnalysis('sensitivity');
  $('apply-best').onclick = () => {
    if (!currentStudy?.best) return;
    try {
      params = { ...studySpec.parameters, ...currentStudy.best.coordinates };
      cursor = evaluate(spec, params).rows.length - 1;
      const saved = currentStudy;
      const snapshot = studySpec;
      const options = studyOptions;
      shell();
      currentStudy = saved;
      studySpec = snapshot;
      studyOptions = options;
      studyAction = 'sweep';
      renderStudy(saved);
      studyStatus(
        'Applied the best sampled point. The study below keeps its original fixed inputs.',
      );
    } catch (e) {
      studyStatus(e.message);
    }
  };
  $('export-study').onclick = exportStudy;
  $('export-study-csv').onclick = () =>
    download('counterplot-grid.csv', studyCsv(currentStudy), 'text/csv;charset=utf-8');
  currentStudy = null;
  studySpec = null;
  renderDataset();
}
async function runAnalysis(action) {
  cancelStudy();
  const revision = studyRevision;
  $('run-study').disabled = true;
  $('run-sensitivity').disabled = true;
  studyStatus('Calculating in a local worker…');
  $('study-chart').replaceChildren();
  $('sensitivity-results').replaceChildren();
  $('apply-best').hidden = true;
  $('export-study').hidden = true;
  $('export-study-csv').hidden = true;
  try {
    const snapshot = effectiveSpec(),
      metric = $('study-metric').value;
    let options;
    if (action === 'sweep') {
      const ids = [
        'study-min',
        'study-max',
        'study-points',
        ...($('study-axis2').value ? ['study-min2', 'study-max2', 'study-points2'] : []),
      ];
      for (const id of ids) {
        const field = $(id);
        if (field.value.trim() === '' || !field.checkValidity()) {
          field.reportValidity();
          throw Error('Enter valid explicit bounds and sample counts.');
        }
      }
    }
    if (action === 'sweep') {
      const axis = {
        parameter: $('study-axis').value,
        min: Number($('study-min').value),
        max: Number($('study-max').value),
        points: Number($('study-points').value),
      };
      options = {
        axes: [axis],
        metrics: [metric],
        objective: { metric, direction: $('study-direction').value },
      };
      if ($('study-axis2').value)
        options.axes.push({
          parameter: $('study-axis2').value,
          min: Number($('study-min2').value),
          max: Number($('study-max2').value),
          points: Number($('study-points2').value),
        });
    } else options = { metrics: [metric] };
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    const worker = new Worker(url);
    studyWorker = worker;
    URL.revokeObjectURL(url);
    const response = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        worker.terminate();
        reject(Error('Study exceeded 30 seconds. Reduce the grid or calculation horizon.'));
      }, 30000);
      studyCancel = () => {
        clearTimeout(timer);
        worker.terminate();
        reject(Error('Study canceled because the experiment changed.'));
      };
      worker.onmessage = (e) => {
        clearTimeout(timer);
        worker.terminate();
        e.data.ok ? resolve(e.data.value) : reject(Error(e.data.error));
      };
      worker.onerror = () => {
        clearTimeout(timer);
        worker.terminate();
        reject(
          Error(
            'The local analysis worker could not run in this browser. Use the CLI study commands.',
          ),
        );
      };
      worker.postMessage({ id: revision, action, spec: snapshot, options });
    });
    if (revision !== studyRevision) return;
    currentStudy = response;
    studySpec = snapshot;
    studyOptions = options;
    studyAction = action;
    if (action === 'sweep') renderStudy(response);
    else renderSensitivity(response);
    $('export-study').hidden = false;
  } catch (e) {
    if (revision === studyRevision) studyStatus(e.message);
  } finally {
    if (revision === studyRevision) {
      $('run-study').disabled = false;
      $('run-sensitivity').disabled = false;
      studyWorker = null;
      studyCancel = null;
    }
  }
}
function renderStudy(study) {
  const m = study.metrics[0],
    valid = study.rows.filter((r) => Number.isFinite(r.values[m.key])),
    values = valid.map((r) => r.values[m.key]),
    min = values.length ? Math.min(...values) : 0,
    max = values.length ? Math.max(...values) : 1;
  studyStatus(
    `${study.cells} sampled points · ${study.invalidCells} invalid · ${study.undefinedCells} undefined. ${study.axes.map((a) => a.label).join(' × ')}`,
  );
  $('study-summary').replaceChildren();
  const frozen = document.createElement('details');
  const label = document.createElement('summary');
  label.textContent = 'Inputs captured for this study';
  const text = document.createElement('pre');
  text.textContent = JSON.stringify(studySpec.parameters, null, 2);
  frozen.append(label, text);
  $('study-summary').append(frozen);
  if (study.best) {
    const best = document.createElement('p');
    best.className = 'study-best';
    best.textContent = `Best sampled ${m.label.toLowerCase()}: ${number(study.best.value, 5)}${m.unit ? ' ' + m.unit : ''} at ${Object.entries(
      study.best.coordinates,
    )
      .map(([k, v]) => MODELS[spec.model].controls[k].label + ' ' + number(v, 5))
      .join(
        ', ',
      )}. ${study.best.ties > 1 ? study.best.ties + ' points tie. ' : ''}This is a grid result, not a global optimum.`;
    $('study-summary').append(best);
    $('apply-best').hidden = false;
  }
  for (const warning of study.warnings || []) {
    const p = document.createElement('p');
    p.className = 'warning';
    p.textContent = warning;
    $('study-summary').append(p);
  }
  const W = 760,
    H = 350,
    L = 70,
    R = 25,
    T = 24,
    B = 58,
    w = W - L - R,
    h = H - T - B;
  let markup = '';
  if (study.axes.length === 1) {
    const a = study.axes[0],
      span = max - min || 1,
      low = Math.min(0, min),
      high = Math.max(max, low + span),
      sx = (v) => L + ((v - a.min) / (a.max - a.min)) * w,
      sy = (v) => T + h - ((v - low) / (high - low)) * h;
    const paths = [];
    let segment = '';
    for (const row of study.rows) {
      const value = row.values[m.key];
      if (!Number.isFinite(value)) {
        if (segment) paths.push(segment);
        segment = '';
        continue;
      }
      segment += (segment ? 'L' : 'M') + sx(row.coordinates[a.parameter]) + ',' + sy(value) + ' ';
    }
    if (segment) paths.push(segment);
    markup = `<path class="study-grid" d="M${L} ${T}V${T + h}H${W - R}"/><text x="${L}" y="${H - 32}">${esc(number(a.min, 4))}</text><text x="${W - R}" y="${H - 32}" text-anchor="end">${esc(number(a.max, 4))}</text><text x="${L - 10}" y="${T + 10}" text-anchor="end">${esc(number(high, 4))}</text><text x="${L - 10}" y="${T + h}" text-anchor="end">${esc(number(low, 4))}</text>${paths.map((d) => `<path class="study-line" d="${d}"/>`).join('')}${valid.map((r, i) => `<circle class="study-point" data-sample="${study.rows.indexOf(r)}" cx="${sx(r.coordinates[a.parameter])}" cy="${sy(r.values[m.key])}" r="5" tabindex="0" role="button" aria-label="Apply ${esc(a.label)} ${r.coordinates[a.parameter]}: ${esc(m.label)} ${r.values[m.key]}"><title>${esc(a.label)} ${number(r.coordinates[a.parameter], 5)} · ${esc(m.label)} ${number(r.values[m.key], 5)}</title></circle>`).join('')}<text x="${L + w / 2}" y="${H - 6}" text-anchor="middle">${esc(a.label)} ${esc(a.unit)}</text><text x="${L}" y="16">${esc(m.label)} ${esc(m.unit)}</text>`;
  } else {
    const magnitudes = values.filter((v) => v !== 0).map((v) => Math.abs(v)),
      floor = magnitudes.length ? Math.min(...magnitudes) : 1,
      mode = $('study-color').value,
      useLog =
        mode === 'log' ||
        (mode === 'auto' && magnitudes.length > 0 && Math.max(...magnitudes) / floor >= 1000),
      transformColor = (v) => (useLog ? Math.sign(v) * Math.log1p(Math.abs(v) / floor) : v),
      cmin = transformColor(min),
      cmax = transformColor(max);
    const note = document.createElement('p');
    note.className = 'hint';
    note.textContent = `Color: ${useLog ? 'signed log1p (compressed range)' : 'linear'} · light ${number(min, 5)} → dark ${number(max, 5)}. Tooltips and exports retain actual values.`;
    $('study-summary').prepend(note);
    const [a, b] = study.axes,
      cw = w / a.values.length,
      ch = h / b.values.length;
    markup =
      study.rows
        .map((r, i) => {
          const v = r.values[m.key],
            ratio = Number.isFinite(v) ? (transformColor(v) - cmin) / (cmax - cmin || 1) : 0,
            fill = Number.isFinite(v)
              ? `rgb(${Math.round(230 - 190 * ratio)},${Math.round(237 - 148 * ratio)},${Math.round(251 - 72 * ratio)})`
              : r.status === 'invalid'
                ? '#ddbaa9'
                : '#d5d9e2';
          return `<rect x="${L + r.gridIndex[0] * cw}" y="${T + (b.values.length - 1 - r.gridIndex[1]) * ch}" width="${cw}" height="${ch}" fill="${fill}" stroke="#fff" stroke-width="1" data-sample="${i}" tabindex="0" role="button" aria-label="${esc(a.label)} ${r.coordinates[a.parameter]}, ${esc(b.label)} ${r.coordinates[b.parameter]}, ${esc(m.label)} ${Number.isFinite(v) ? v : r.status}"><title>${esc(a.label)} ${number(r.coordinates[a.parameter], 5)} · ${esc(b.label)} ${number(r.coordinates[b.parameter], 5)} · ${esc(m.label)} ${Number.isFinite(v) ? number(v, 5) : r.status}</title></rect>`;
        })
        .join('') +
      `<text x="${L}" y="${H - 31}">${esc(number(a.min, 4))}</text><text x="${W - R}" y="${H - 31}" text-anchor="end">${esc(number(a.max, 4))}</text><text x="${L - 8}" y="${T + 10}" text-anchor="end">${esc(number(b.max, 4))}</text><text x="${L - 8}" y="${T + h}" text-anchor="end">${esc(number(b.min, 4))}</text><text x="${L + w / 2}" y="${H - 6}" text-anchor="middle">${esc(a.label)} ${esc(a.unit)}</text><text x="${L}" y="16">${esc(b.label)} · ${esc(m.label)} ${number(min, 4)} to ${number(max, 4)} ${esc(m.unit)}</text>`;
  }
  $('study-chart').innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" class="study-plot" role="group" aria-label="Computed sampled parameter study. Use arrow keys to move between points and Enter to apply. ${esc(m.label)}. Select a point to apply its inputs.">${markup}</svg>`;
  const targets = [...document.querySelectorAll('[data-sample]')];
  targets.forEach((t, i) => t.setAttribute('tabindex', i === 0 ? '0' : '-1'));
  for (const target of targets) {
    const apply = () => {
      const r = currentStudy.rows[Number(target.dataset.sample)];
      if (r.status === 'invalid') {
        studyStatus(r.warnings.join(' '));
        return;
      }
      params = { ...studySpec.parameters, ...r.coordinates };
      for (const [key, value] of Object.entries(params)) {
        if ($('n-' + key)) $('n-' + key).value = value;
        if ($('s-' + key)) $('s-' + key).value = value;
      }
      cursor = evaluate(spec, params).rows.length - 1;
      update();
      studyStatus('Applied sampled coordinates together with the study’s captured fixed inputs.');
    };
    target.onclick = apply;
    target.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        apply();
      } else if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)
      ) {
        e.preventDefault();
        let i = targets.indexOf(target);
        const width = study.axes[0].values.length;
        if (e.key === 'Home') i = 0;
        else if (e.key === 'End') i = targets.length - 1;
        else
          i +=
            e.key === 'ArrowRight'
              ? 1
              : e.key === 'ArrowLeft'
                ? -1
                : e.key === 'ArrowUp'
                  ? study.axes.length === 2
                    ? width
                    : 1
                  : -(study.axes.length === 2 ? width : 1);
        i = Math.max(0, Math.min(targets.length - 1, i));
        targets.forEach((t) => t.setAttribute('tabindex', '-1'));
        targets[i].setAttribute('tabindex', '0');
        targets[i].focus();
      }
    };
  }
  $('study-table').innerHTML =
    `<table><thead><tr>${study.axes.map((a) => `<th>${esc(a.label)}</th>`).join('')}<th>${esc(m.label)}</th><th>Status</th></tr></thead><tbody>${study.rows.map((r) => `<tr>${study.axes.map((a) => `<td>${number(r.coordinates[a.parameter], 6)}</td>`).join('')}<td>${r.values[m.key] === null ? 'Undefined' : number(r.values[m.key], 6)}</td><td>${esc(r.status)}${r.warnings.length ? ' · ' + esc(r.warnings.join('; ')) : ''}</td></tr>`).join('')}</tbody></table>`;
  $('study-table-wrap').hidden = false;
  $('export-study-csv').hidden = false;
}
function renderSensitivity(study) {
  studyStatus(
    'Local sensitivity uses explicit finite perturbations around the captured inputs. It is not a global importance ranking.',
  );
  const m = study.metrics[0];
  $('study-summary').replaceChildren();
  $('study-table-wrap').hidden = true;
  $('sensitivity-results').innerHTML =
    `<table><thead><tr><th>Parameter</th><th>Perturbation</th><th>Outcome change</th><th>Per input unit</th><th>Method</th></tr></thead><tbody>${study.rows
      .map((r) => {
        const e = r.estimates[m.key];
        return `<tr><td>${esc(r.label)}</td><td>${number(r.lower.coordinate, 5)} → ${number(r.upper.coordinate, 5)}</td><td>${e.deltaOutput === null ? 'Undefined' : number(e.deltaOutput, 6)}</td><td>${e.slope === null ? 'Undefined' : number(e.slope, 6)}</td><td>${esc(r.method)}${r.discrete ? ' · discrete' : ''}${r.warnings?.length ? ' · ' + esc(r.warnings.join('; ')) : ''}</td></tr>`;
      })
      .join(
        '',
      )}</tbody></table><p class="hint">Outcome: ${esc(m.label)}. Slopes depend on the perturbation size and units. Undefined endpoints remain unestimated; full coordinates, elasticity and warnings are included in the JSON export.</p>`;
  for (const warning of study.warnings || []) {
    const p = document.createElement('p');
    p.className = 'warning';
    p.textContent = warning;
    $('sensitivity-results').append(p);
  }
}
function studyCsv(study) {
  if (!study || study.kind !== 'sweep') throw Error('No grid to export.');
  const columns = [
    ...study.axes.map((a) => a.parameter),
    ...study.metrics.map((m) => m.key),
    'status',
    'warnings',
  ];
  const quote = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  return (
    columns.map(quote).join(',') +
    '\n' +
    study.rows
      .map((r) =>
        columns
          .map((k) =>
            quote(
              k === 'status'
                ? r.status
                : k === 'warnings'
                  ? r.warnings.join('; ')
                  : (r.coordinates[k] ?? r.values[k]),
            ),
          )
          .join(','),
      )
      .join('\n') +
    '\n'
  );
}
async function textSha(text) {
  if (!crypto?.subtle)
    throw Error('Fingerprint export needs Web Crypto. Open the file locally or use localhost.');
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
async function exportStudy() {
  try {
    if (!currentStudy || !studySpec) throw Error('Run a study before exporting.');
    const snapshot = structuredClone({
      spec: studySpec,
      action: studyAction,
      options: studyOptions,
      results: currentStudy,
    });
    const payload = {
      format: 'counterplot-analysis',
      formatVersion: 1,
      engineVersion: VERSION,
      engineSha256: ENGINE_SHA256,
      analysisSha256: ANALYSIS_SHA256,
      specSha256: await textSha(canonicalJson(snapshot.spec)),
      ...snapshot,
    };
    download(
      'counterplot-' + snapshot.action + '.json',
      JSON.stringify(payload, null, 2) + '\n',
      'application/json',
    );
    studyStatus('Exported frozen study inputs, exact coordinates and source fingerprints.');
  } catch (e) {
    studyStatus(e.message);
  }
}
function renderDataset() {
  if (!$('dataset-panel')) return;
  $('dataset-panel').hidden = spec.model !== 'classification';
  if (spec.model !== 'classification') return;
  const c = result.classification;
  $('dataset-source').textContent =
    `${spec.data.source || 'User-supplied labeled scores'} · ${c.count} observations · ${c.positives} positive, ${c.negatives} negative. Scores need not be calibrated probabilities.`;
  $('confusion-matrix').innerHTML =
    `<div class="confusion-grid"><div><small>True positive</small><strong>${c.confusion.tp}</strong></div><div><small>False positive</small><strong>${c.confusion.fp}</strong></div><div><small>False negative</small><strong>${c.confusion.fn}</strong></div><div><small>True negative</small><strong>${c.confusion.tn}</strong></div></div>`;
  if ($('data-csv').dataset.initialized !== spec.data.source) {
    $('data-csv').value =
      'label,score\n' +
      spec.data.labels.map((label, i) => label + ',' + spec.data.scores[i]).join('\n');
    $('data-csv').dataset.initialized = spec.data.source || 'data';
  }
  $('apply-data').onclick = () => {
    try {
      const lines = $('data-csv')
          .value.replace(/^\uFEFF/, '')
          .trim()
          .split(/\r?\n/),
        unquote = (s) => s.trim().replace(/^"(.*)"$/, '$1'),
        header = lines
          .shift()
          .split(',')
          .map((s) => unquote(s).toLowerCase());
      if (header.length !== 2 || !header.includes('label') || !header.includes('score'))
        throw Error('Use exactly two numeric columns with headers label,score.');
      const labels = [],
        scores = [];
      for (const [i, line] of lines.entries()) {
        if (!line.trim()) continue;
        const cells = line.split(',').map(unquote);
        if (cells.length !== 2 || cells.some((c) => !c))
          throw Error(`Row ${i + 2}: two nonempty numeric values required.`);
        labels.push(Number(cells[header.indexOf('label')]));
        scores.push(Number(cells[header.indexOf('score')]));
      }
      const next = validateSpec({
        ...spec,
        data: { labels, scores, source: 'Imported labeled scores' },
      });
      spec = next;
      params = { ...spec.parameters };
      baseline = null;
      cursor = evaluate(spec, params).rows.length - 1;
      shell();
      status('Validated imported data. Baseline cleared because the underlying dataset changed.');
    } catch (e) {
      $('data-error').textContent = e.message;
    }
  };
  $('import-data').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 160000) throw Error('Numeric CSV must be under 160 KB.');
      $('data-csv').value = await file.text();
      $('data-error').textContent = 'Loaded locally. Validate and use data to apply it.';
    } catch (e) {
      $('data-error').textContent = e.message;
    }
  };
}
async function saveInteractiveHtml() {
  const button = $('save-html');
  const fileName = 'counterplot-' + spec.model + '-interactive.html';
  button.disabled = true;
  try {
    const clone = document.documentElement.cloneNode(true),
      script = clone.querySelector('script'),
      serialize = (v) =>
        JSON.stringify(v)
          .replace(/</g, '\\u003c')
          .replace(/\u2028/g, '\\u2028')
          .replace(/\u2029/g, '\\u2029');
    script.textContent = script.textContent
      .replace(
        /const INITIAL_SPEC=[\s\S]*?;\nconst ENGINE_SHA256=/,
        'const INITIAL_SPEC=' + serialize(effectiveSpec()) + ';\nconst ENGINE_SHA256=',
      )
      .replace(
        /const INITIAL_BASELINE=[\s\S]*?;\nconst WORKER_SOURCE=/,
        'const INITIAL_BASELINE=' + serialize(baseline) + ';\nconst WORKER_SOURCE=',
      );
    const digest = new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(script.textContent)),
      ),
      encoded = btoa(String.fromCharCode(...digest)),
      meta = clone.querySelector('meta[http-equiv="Content-Security-Policy"]');
    meta.content = meta.content.replace(
      /script-src 'sha256-[^']+'/,
      "script-src 'sha256-" + encoded + "'",
    );
    clone.querySelectorAll('dialog[open]').forEach((d) => d.removeAttribute('open'));
    for (const link of clone.querySelectorAll('.masthead a[href="index.html"]')) {
      if (link.classList.contains('brand'))
        link.setAttribute('href', 'https://github.com/owenawsong/Counterplot');
      else link.remove();
    }
    download(fileName, '<!doctype html>\n' + clone.outerHTML, 'text/html');
    status('Saved a standalone interactive file with your current inputs and pinned baseline.');
  } catch (e) {
    status('Could not save interactive file: ' + e.message);
  } finally {
    button.disabled = false;
  }
}
