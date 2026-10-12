import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateSpec, evaluate, VERSION } from './engine.js';

export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const scriptJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
const hash = (value) => createHash('sha256').update(value).digest('base64');
export const mark =
  '<svg class="mark" viewBox="0 0 30 30" aria-hidden="true"><path d="M2 25V4M2 25H28" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 21 10 7 15 18 20 11 26 14" fill="none" stroke="#bb4b26" stroke-width="2.5"/><circle cx="26" cy="14" r="2.5" fill="#bb4b26"/></svg>';
export function document(title, body, css, script = '') {
  const csp = `default-src 'none'; script-src 'sha256-${hash(script)}'; style-src 'sha256-${hash(css)}'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}"><meta name="color-scheme" content="light"><meta name="description" content="Portable interactive numerical experiments. Change an assumption. Inspect the calculation."><title>${escapeHtml(title)} · Counterplot</title><style>${css}</style></head><body>${body}${script ? `<script>${script}</script>` : ''}</body></html>\n`;
}
export async function renderExperiment(spec, { gallery = false } = {}) {
  const clean = validateSpec(spec);
  evaluate(clean);
  const [css, engine, app] = await Promise.all([
    readFile(new URL('../web/style.css', import.meta.url), 'utf8'),
    readFile(new URL('./engine.js', import.meta.url), 'utf8'),
    readFile(new URL('../web/app.js', import.meta.url), 'utf8'),
  ]);
  const bundledEngine = engine.replace(/^export /gm, '');
  const script = `'use strict';\nconst INITIAL_SPEC=${scriptJson(clean)};\n${bundledEngine}\n${app}`;
  const body = `<a class="skip" href="#main">Skip to experiment</a><header class="masthead"><a class="brand" href="${gallery ? 'index.html' : 'https://github.com/owenawsong/Counterplot'}">${mark}counterplot</a><nav>${gallery ? '<a href="index.html">All experiments</a>' : ''}<small>WORKING NOTES / ${VERSION}</small><a href="https://github.com/owenawsong/Counterplot">Source ↗</a></nav></header><main id="main"><div id="app"></div><noscript><h1>${escapeHtml(clean.title)}</h1><p>JavaScript is required for interactive calculations. Use the CLI export command for results without a browser.</p></noscript></main><footer class="footer"><span>Counterplot · numerical engine ${VERSION} · MIT</span><span>One file. Actual calculations. No external requests.</span></footer>`;
  return document(clean.title, body, css, script);
}
