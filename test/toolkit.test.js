import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createSpec } from '../src/engine.js';
import { renderExperiment, scriptJson } from '../src/render.js';
import { atomicWrite, readSpec, serve, resultDocument } from '../bin/counterplot.js';
const cli = new URL('../bin/counterplot.js', import.meta.url);

test('portable output is deterministic, escaped and hash-protected by CSP', async () => {
  const spec = {
    ...createSpec(),
    title: '</script><img src=x onerror=alert(1)>',
    description: 'Text & "quotes"',
  };
  const html = await renderExperiment(spec);
  assert.equal(await renderExperiment(spec), html);
  assert.ok(html.includes('&lt;/script&gt;&lt;img'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(scriptJson(spec).includes('\\u003c/script>'));
  assert.ok(!html.includes('src="https:'));
  assert.ok(!html.includes('<script src='));
  assert.ok(!/\beval\s*\(|new Function\s*\(/.test(html));
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1],
    style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.ok(html.includes(createHash('sha256').update(script).digest('base64')));
  assert.ok(html.includes(createHash('sha256').update(style).digest('base64')));
  assert.doesNotThrow(() => new Function(script)); // Parse generated, trusted source without executing DOM code.
});
test('browser Web Crypto and CLI produce identical provenance envelopes', async () => {
  const spec = createSpec('circuit'),
    html = await renderExperiment(spec);
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const prefix = script.slice(0, script.indexOf('/* Bundled behind'));
  const app = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
  const helper = app.slice(
    app.indexOf('async function browserResultDocument'),
    app.indexOf('function bind'),
  );
  const browser = await runInNewContext(
    'const structuredClone = value => JSON.parse(JSON.stringify(value));\n' +
      prefix +
      '\nconst spec=INITIAL_SPEC, params={...spec.parameters};\n' +
      helper +
      '\nbrowserResultDocument();',
    { TextEncoder, crypto: webcrypto },
  );
  const cli = resultDocument(spec);
  assert.deepEqual(JSON.parse(JSON.stringify(browser)), cli);
  const engine = await readFile(new URL('../src/engine.js', import.meta.url), 'utf8');
  assert.equal(
    cli.engineSha256,
    createHash('sha256').update(engine.replace(/\r\n?/g, '\n')).digest('hex'),
  );
  const reordered = {
    parameters: spec.parameters,
    description: spec.description,
    title: spec.title,
    model: spec.model,
    schemaVersion: 1,
  };
  assert.equal(resultDocument(reordered).specSha256, cli.specSha256);
});
test('atomic writes refuse overwrite and input files have a size limit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'counterplot-test-'));
  try {
    const path = join(root, 'x.json');
    await atomicWrite(path, JSON.stringify(createSpec()));
    await assert.rejects(() => atomicWrite(path, 'bad'), /exists/);
    assert.equal((await readSpec(path)).model, 'descent');
    await writeFile(join(root, 'large.json'), 'x'.repeat(100001));
    await assert.rejects(() => readSpec(join(root, 'large.json')), /100 KB/);
    await atomicWrite(path, 'replacement', true);
    assert.equal(await readFile(path, 'utf8'), 'replacement');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('CLI init, validate, export, build and compare work from any cwd', async () => {
  const root = await mkdtemp(join(tmpdir(), 'counterplot-cli-'));
  const run = (...args) =>
    spawnSync(process.execPath, [fileURLToPath(cli), ...args], { cwd: root, encoding: 'utf8' });
  try {
    for (const args of [
      ['init', 'loan', '--out', 'loan.json'],
      ['validate', 'loan.json', '--json'],
      ['build', 'loan.json', '--out', 'loan.html'],
      ['export', 'loan.json', '--format', 'csv', '--out', 'loan.csv'],
      ['export', 'loan.json', '--format', 'json', '--out', 'loan-results.json'],
      ['compare', 'loan.json', 'loan.json', '--out', 'comparison.json'],
    ]) {
      const r = run(...args);
      assert.equal(r.status, 0, r.stderr);
    }
    const result = JSON.parse(await readFile(join(root, 'loan-results.json'), 'utf8'));
    assert.equal(result.specSha256, resultDocument(createSpec('loan')).specSha256);
    assert.ok((await readFile(join(root, 'loan.html'), 'utf8')).includes('INITIAL_SPEC'));
    assert.equal(run('build', 'loan.json', '--out', 'loan.html').status, 1);
    assert.equal(run('validate', 'loan.json', '--bad').status, 1);
    assert.equal(run('init', 'loan', '--out', 'x', '--out', 'y').status, 1);
    await writeFile(join(root, 'circuit.json'), JSON.stringify(createSpec('circuit')));
    assert.equal(run('compare', 'loan.json', 'circuit.json').status, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('local server denies writes, hostile hosts, traversal and escaping symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'counterplot-server-'));
  await mkdir(join(root, 'public'));
  await writeFile(join(root, 'public', 'index.html'), 'local');
  await writeFile(join(root, 'secret.txt'), 'secret');
  const port = 19761;
  const server = await serve(join(root, 'public'), port);
  try {
    const base = `http://127.0.0.1:${port}`;
    assert.equal(await (await fetch(base)).text(), 'local');
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    const hostile = await new Promise((resolve, reject) => {
      const req = request(base, { headers: { host: 'hostile.example' } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(hostile, 403);
    assert.equal((await fetch(base + '/%2e%2e%2fsecret.txt')).status, 404);
    try {
      await symlink(join(root, 'secret.txt'), join(root, 'public', 'leak.txt'));
      assert.equal((await fetch(base + '/leak.txt')).status, 404);
    } catch (e) {
      if (e.code !== 'EPERM') throw e;
    }
    assert.equal((await fetch(base, { method: 'HEAD' })).headers.get('content-length'), '5');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
