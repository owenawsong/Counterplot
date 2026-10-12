import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { MODELS, validateSpec, evaluate } from '../src/engine.js';
import { experimentSchema } from '../src/schema.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const required = [
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'assets/banner.svg',
  'assets/experiment.png',
  'skills/counterplot/SKILL.md',
  'schema/experiment.schema.json',
  'site/index.html',
];
for (const file of required) assert.ok((await stat(resolve(root, file))).size > 0, `${file} empty`);
assert.deepEqual(
  JSON.parse(await readFile(resolve(root, 'schema/experiment.schema.json'), 'utf8')),
  experimentSchema(),
  'Schema drift',
);
for (const model of Object.keys(MODELS)) {
  const spec = validateSpec(
    JSON.parse(await readFile(resolve(root, `examples/${model}.json`), 'utf8')),
  );
  evaluate(spec);
  assert.deepEqual(JSON.parse(await readFile(resolve(root, `site/${model}.json`), 'utf8')), spec);
  const html = await readFile(resolve(root, `site/${model}.html`), 'utf8'),
    script = html.match(/<script>([\s\S]*)<\/script>/)?.[1],
    style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  assert.ok(script && style, `Missing bundle ${model}`);
  new Script(script, { filename: model + '.html' });
  for (const source of [script, style])
    assert.ok(
      html.includes(createHash('sha256').update(source).digest('base64')),
      `CSP hash drift ${model}`,
    );
  assert.ok(
    !/\beval\s*\(|new Function\s*\(|<script[^>]*src=/.test(html),
    'Unexpected execution surface',
  );
  assert.ok(html.includes('connect-src &#39;none&#39;'));
}
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }),
    files = [];
  for (const e of entries) {
    if (['.git', 'node_modules', 'site', 'dist', '_local'].includes(e.name)) continue;
    const path = resolve(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}
for (const path of await walk(root)) {
  if (!path.endsWith('.md')) continue;
  const content = await readFile(path, 'utf8');
  const links = [...content.matchAll(/(?:\]\(|src=")([^\s)"#]+)(?:#[^\s)"]*)?[)"]/g)].map(
    (m) => m[1],
  );
  for (const link of links) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(link)) continue;
    const target = resolve(dirname(path), link);
    assert.ok(!relative(root, target).startsWith('..'), `Link escapes repo: ${link}`);
    await stat(target).catch(() => {
      throw new Error(`${relative(root, path)}: missing ${link}`);
    });
  }
}
console.log(
  'Release checks passed: examples, schema, bundles, policy hashes, assets and documentation links.',
);
