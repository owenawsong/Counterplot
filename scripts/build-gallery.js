import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODELS, evaluate, VERSION } from '../src/engine.js';
import { document, escapeHtml as esc, mark, renderExperiment } from '../src/render.js';
import { experimentSchema } from '../src/schema.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, 'site');
await mkdir(out, { recursive: true });
await mkdir(resolve(root, 'schema'), { recursive: true });
await writeFile(
  resolve(root, 'schema/experiment.schema.json'),
  JSON.stringify(experimentSchema(), null, 2) + '\n',
);
const css = await readFile(resolve(root, 'web/style.css'), 'utf8');
const examples = [];
for (const model of Object.keys(MODELS)) {
  const spec = JSON.parse(await readFile(resolve(root, `examples/${model}.json`), 'utf8'));
  await writeFile(resolve(out, `${model}.html`), await renderExperiment(spec, { gallery: true }));
  await copyFile(resolve(root, `examples/${model}.json`), resolve(out, `${model}.json`));
  examples.push({ model, spec, result: evaluate(spec) });
}
function sparkline(result, width = 480, height = 80) {
  const p = result.chart.series[0].points.filter((p) => p.y !== null),
    max = Math.max(...p.map((p) => p.y)),
    min = Math.min(0, ...p.map((p) => p.y)),
    xmax = Math.max(...p.map((p) => p.x)),
    xmin = Math.min(...p.map((p) => p.x));
  const d = p
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${(8 + ((v.x - xmin) / (xmax - xmin || 1)) * (width - 16)).toFixed(2)},${(height - 10 - ((v.y - min) / (max - min || 1)) * (height - 20)).toFixed(2)}`,
    )
    .join(' ');
  return `<svg class="mini" viewBox="0 0 ${width} ${height}" aria-hidden="true"><path d="M8 ${height - 10}H${width - 8}" stroke="#c9cdc0" fill="none"/><path d="${d}" stroke="#bb4b26" stroke-width="2" fill="none"/></svg>`;
}
const artResult = evaluate(examples[0].spec, { rate: 0.23, steps: 18 });
const path = artResult.secondary.series[0].points;
const artPath = path
  .map((p, i) => `${i ? 'L' : 'M'}${(250 + p.x * 30).toFixed(2)},${(185 - p.y * 22).toFixed(2)}`)
  .join(' ');
const hero = `<div class="hero-art"><svg viewBox="0 0 500 340" role="img" aria-label="Computed gradient-descent path across elliptical contours"><defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#cbd3c3" stroke-width=".5"/></pattern></defs><rect width="500" height="340" fill="url(#grid)"/>${[1, 2, 3, 4, 5].map((n) => `<ellipse cx="250" cy="185" rx="${n * 38}" ry="${(n * 38 * 22) / 30 / Math.sqrt(8)}" stroke="#94ab9b" fill="none" stroke-width="1"/>`).join('')}<path d="${artPath}" stroke="#bb4b26" stroke-width="2.5" stroke-linejoin="round" fill="none"/>${path
  .filter((_, i) => i < 7)
  .map((p) => `<circle cx="${250 + p.x * 30}" cy="${185 - p.y * 22}" r="3" fill="#bb4b26"/>`)
  .join(
    '',
  )}<circle cx="250" cy="185" r="4" fill="#172b2c"/><text x="26" y="35" font-family="monospace" font-size="11" fill="#536360">QUADRATIC VALLEY / 18 UPDATES</text><text x="26" y="305" font-family="monospace" font-size="11" fill="#536360">η = 0.23 · a = 1 · b = 8</text></svg><div class="caption">A computed path. A fixed equation. One assumption to change.</div></div>`;
const body = `<a class="skip" href="#main">Skip to experiments</a><header class="masthead"><a href="index.html" class="brand">${mark}counterplot</a><nav><a href="#experiments">Explore</a><a href="https://github.com/owenawsong/Counterplot">GitHub ↗</a><small>EXPERIMENTS / ${VERSION}</small></nav></header><main id="main"><section class="hero"><div><div class="eyebrow">A small workshop for big “what ifs”</div><h1>Move one thing.<br>Understand<br><em>what changes.</em></h1><p>Turn a question into something you can test. Every plot comes from a bounded numerical model, with calculations you can inspect.</p><div class="hero-actions"><a class="button primary" href="descent.html">Try an experiment →</a><a class="button quiet" href="#build">Build your own</a></div><div class="meta-row">Offline HTML · inspectable calculations · no API key</div></div>${hero}</section><section id="experiments"><div class="gallery-heading"><h2>Five questions. Five working models.</h2><p>Change inputs. Pin a baseline. Follow the evidence.</p></div><div class="experiments">${examples.map((e, i) => `<a class="experiment" href="${e.model}.html"><div class="index">0${i + 1}</div><div><div class="section-label">${esc(MODELS[e.model].field)}</div><h3>${esc(e.spec.title)}</h3><p>${esc(e.spec.description)}</p>${sparkline(e.result)}<span class="open-link">Open ${esc(MODELS[e.model].label.toLowerCase())} →</span></div></a>`).join('')}</div></section><section class="build-strip" id="build"><div><div class="eyebrow">For people. And coding agents.</div><h2>The model does the math.<br>You tell the story.</h2><p>Write a short JSON experiment: choose a model, title, inputs and named scenarios. Validate it, then build a single HTML file you can send to anyone.</p><p><a href="https://github.com/owenawsong/Counterplot/tree/main/skills/counterplot">Read the agent skill ↗</a></p></div><pre><code>git clone https://github.com/owenawsong/Counterplot.git\ncd Counterplot\nnode bin/counterplot.js init descent --out experiment.json\nnode bin/counterplot.js validate experiment.json\nnode bin/counterplot.js build experiment.json --out experiment.html</code></pre></section><p class="scope">Version ${VERSION} ships five teaching models, with documented equations, units and limits. It does not execute arbitrary formulas or claim to simulate any system. Read each experiment’s assumptions before interpreting its results.</p></main><footer class="footer"><span>Counterplot · created by Owen Song · MIT</span><span>Keep the explanation. Inspect the calculation.</span></footer>`;
await writeFile(
  resolve(out, 'index.html'),
  document('Move one thing. Understand what changes.', body, css).replace(
    '<body>',
    '<body class="gallery">',
  ),
);
console.log(`Built ${examples.length} portable experiments and gallery: ${out}`);
