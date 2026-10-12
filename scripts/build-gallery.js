import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELS, evaluate, VERSION } from '../src/engine.js';
import { document, escapeHtml as esc, mark, renderExperiment } from '../src/render.js';
import { experimentSchema } from '../src/schema.js';
const root = fileURLToPath(new URL('../', import.meta.url)),
  out = resolve(root, 'site');
await mkdir(out, { recursive: true });
await mkdir(resolve(root, 'schema'), { recursive: true });
await writeFile(
  resolve(root, 'schema/experiment.schema.json'),
  JSON.stringify(experimentSchema(), null, 2) + '\n',
);
const css = await readFile(resolve(root, 'web/style.css'), 'utf8'),
  examples = [];
for (const model of ['classification', 'descent', 'loan', 'circuit', 'epidemic', 'bayes']) {
  const spec = JSON.parse(await readFile(resolve(root, `examples/${model}.json`), 'utf8'));
  await writeFile(resolve(out, `${model}.html`), await renderExperiment(spec, { gallery: true }));
  await copyFile(resolve(root, `examples/${model}.json`), resolve(out, `${model}.json`));
  examples.push({ model, spec, result: evaluate(spec) });
}
function mini(result) {
  const p = result.chart.series[0].points.filter((p) => Number.isFinite(p.y));
  if (!p.length) return '';
  const minX = Math.min(...p.map((p) => p.x)),
    maxX = Math.max(...p.map((p) => p.x)),
    minY = Math.min(...p.map((p) => p.y)),
    maxY = Math.max(...p.map((p) => p.y));
  const path = p
    .map(
      (p, i) =>
        `${i ? 'L' : 'M'}${8 + ((p.x - minX) / (maxX - minX || 1)) * 240},${69 - ((p.y - minY) / (maxY - minY || 1)) * 57}`,
    )
    .join(' ');
  return `<svg viewBox="0 0 256 78" class="gallery-spark" aria-hidden="true"><path d="M8 69H248" stroke="#d9dfe9"/><path d="${path}" fill="none" stroke="#315bcd" stroke-width="2"/></svg>`;
}
const descriptions = {
  classification:
    'Import labeled scores. Inspect the confusion matrix, ROC and precision–recall; sweep the decision threshold.',
  descent:
    'Follow exact updates through a quadratic valley. Scan step size and curvature, then inspect stability.',
  loan: 'Compare extra payments and repayment timelines. Sample interest-rate assumptions and inspect every month.',
  circuit:
    'Explore an ideal RC step response. Sweep resistance and capacitance, including equilibrium.',
  epidemic:
    'Compare intervention assumptions in a teaching SIR model. Inspect the fixed equations and conserved population.',
  bayes:
    'Change prevalence, sensitivity and specificity. Count true and false positives, including undefined cases.',
};
const body = `<a class="skip" href="#main">Skip to experiments</a><header class="masthead"><a class="brand" href="index.html">${mark}Counterplot</a><nav><small>ANALYSIS WORKBENCH / ${VERSION}</small><a href="https://github.com/owenawsong/Counterplot">Source ↗</a></nav></header><main id="main"><section class="library-head"><span class="eyebrow">INTERACTIVE NUMERICAL EXPERIMENTS</span><h1>Explore the calculation.</h1><p>Start with a working model. Change inputs, scan a parameter grid and keep an interactive document with the evidence inside.</p><div class="library-actions"><a class="button primary" href="classification.html">Analyze labeled scores →</a><a class="button quiet" href="descent.html">Explore gradient descent</a></div><div class="library-capabilities"><span>Parameter sweeps</span><span>Local sensitivity</span><span>Offline HTML</span><span>Inspectable equations</span></div></section><section class="experiment-library"><div class="gallery-heading"><h2>Choose a model</h2><p>Six bounded models. Each has documented assumptions, exact inputs and numerical exports.</p></div><div class="model-library">${examples.map((e) => `<a class="model-card" href="${e.model}.html"><span class="section-label">${esc(MODELS[e.model].field)}</span><h3>${esc(MODELS[e.model].label)}</h3><p>${esc(descriptions[e.model])}</p>${mini(e.result)}<div class="card-foot"><span>${Object.keys(MODELS[e.model].controls).length} inputs${e.spec.data ? ' · authored demo data' : ''}</span><strong>Open workbench ↗</strong></div></a>`).join('')}</div></section><section class="workflow-strip"><div><span class="section-label">FROM A QUESTION TO A SHAREABLE EXPERIMENT</span><h2>A complete study, in one file.</h2><ol><li><strong>Inspect</strong> the model and its assumptions.</li><li><strong>Explore</strong> inputs or import labeled scores.</li><li><strong>Study</strong> one or two parameters and local sensitivity.</li><li><strong>Export</strong> the interactive file, data and source fingerprints.</li></ol></div><div><pre>node bin/counterplot.js init classification --out experiment.json
node bin/counterplot.js build experiment.json --out experiment.html
node bin/counterplot.js sweep experiment.json --config study.json --out study-results.json</pre><p>Works with your coding agent through the <a href="https://github.com/owenawsong/Counterplot/tree/main/skills/counterplot">included agent skill</a>. The numerical engine calculates results from a fixed model; titles and explanations are editable.</p></div></section><p class="library-note">Models are bounded teaching and diagnostic tools. Dataset metrics describe the supplied observations; loan, circuit and SIR examples retain their stated simplifications. No model API, telemetry or external runtime requests.</p></main><footer class="footer">Counterplot · ${VERSION} · Owen Song · MIT</footer>`;
await writeFile(
  resolve(out, 'index.html'),
  document('Explore the calculation', body, css).replace('<body>', '<body class="gallery">'),
);
console.log(`Built ${examples.length} interactive analysis workbenches and gallery.`);
