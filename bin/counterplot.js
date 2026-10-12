#!/usr/bin/env node
import { readFile, writeFile, mkdir, rename, stat, realpath, link, unlink } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, dirname, relative, extname, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import {
  createSpec,
  validateSpec,
  evaluate,
  csv,
  MODELS,
  VERSION,
  canonicalJson,
  resultEnvelope,
} from '../src/engine.js';
import { renderExperiment } from '../src/render.js';
import { ENGINE_SHA256, ANALYSIS_SHA256 } from '../src/source.js';
import { sweep, sensitivity } from '../src/analysis.js';

export const HELP = `Counterplot ${VERSION} · portable, computed experiments

  counterplot init descent --out experiment.json
  counterplot inspect [model] [--json]
  counterplot validate experiment.json [--json]
  counterplot build experiment.json --out experiment.html [--force]
  counterplot export experiment.json --format json|csv --out results.json [--force]
  counterplot compare before.json after.json [--out comparison.json] [--force]
  counterplot sweep experiment.json --config study.json --out study-results.json [--force]
  counterplot sensitivity experiment.json [--config sensitivity.json] --out sensitivity-results.json [--force]
  counterplot serve directory [--port 18872]

Models: ${Object.keys(MODELS).join(', ')}
No network calls, expression execution, model API keys or runtime dependencies.
The server binds to 127.0.0.1 only. Build produces a single offline HTML file.
`;
export async function readSpec(path) {
  const info = await stat(path);
  if (info.size > 100000) throw new Error('Spec exceeds 100 KB.');
  let value;
  try {
    value = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`);
  }
  return validateSpec(value);
}
export async function atomicWrite(path, content, force = false) {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  if (!force) {
    try {
      await stat(absolute);
      throw new Error(`File exists: ${absolute}. Use --force to replace it.`);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  const temp = absolute + '.' + randomBytes(6).toString('hex') + '.tmp';
  await writeFile(temp, content, { flag: 'wx' });
  try {
    if (force) await rename(temp, absolute);
    else {
      await link(temp, absolute);
      await unlink(temp);
    }
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
  return absolute;
}
function parse(args, allowed) {
  const positionals = [],
    flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (!Object.hasOwn(allowed, key)) throw new Error(`Unknown option: ${arg}`);
    if (Object.hasOwn(flags, key)) throw new Error(`Repeated option: ${arg}`);
    if (allowed[key] === 'boolean') flags[key] = true;
    else {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${arg}`);
      flags[key] = args[++i];
    }
  }
  return { positionals, flags };
}
const need = (positionals, n) => {
  if (positionals.length !== n)
    throw new Error(
      `Expected ${n} positional argument${n === 1 ? '' : 's'}, received ${positionals.length}. Run counterplot --help.`,
    );
};
const out = (flags) => {
  if (!flags.out) throw new Error('Specify --out with an output filename.');
  return flags.out;
};
export function resultDocument(spec) {
  const clean = validateSpec(spec);
  const specSha256 = createHash('sha256').update(canonicalJson(clean)).digest('hex');
  return resultEnvelope(clean, ENGINE_SHA256, specSha256);
}
export function analysisDocument(spec, action, options) {
  const clean = validateSpec(spec);
  const results =
    action === 'sweep'
      ? sweep(clean, options)
      : action === 'sensitivity'
        ? sensitivity(clean, options)
        : null;
  if (!results) throw new Error('Unknown analysis action.');
  return {
    format: 'counterplot-analysis',
    formatVersion: 1,
    engineVersion: VERSION,
    engineSha256: ENGINE_SHA256,
    analysisSha256: ANALYSIS_SHA256,
    specSha256: createHash('sha256').update(canonicalJson(clean)).digest('hex'),
    spec: clean,
    action,
    options,
    results,
  };
}
export async function serve(directory, port = 18872) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Port must be an integer from 1024 to 65535.');
  const root = await realpath(resolve(directory));
  if (!(await stat(root)).isDirectory()) throw new Error('Serve expects a directory.');
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.css': 'text/css',
    '.js': 'text/javascript; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
  };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }
    // Reject hostile Host headers to avoid exposing local files through DNS rebinding.
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) {
      res.writeHead(403);
      res.end('Host not allowed');
      return;
    }
    try {
      const raw = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      if (raw.includes('\0') || raw.includes('\\')) throw new Error('Invalid path');
      let file = resolve(root, '.' + raw);
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      file = await realpath(file);
      const rel = relative(root, file);
      if (rel === '..' || rel.startsWith('..' + sep) || resolve(file) === root || isAbsolute(rel))
        throw new Error('Path escapes directory');
      const data = await readFile(file);
      res.writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
        'Content-Length': data.length,
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolvePromise);
  });
  return server;
}
export async function main(args = process.argv.slice(2)) {
  const command = args.shift();
  if (!command || ['help', '--help', '-h'].includes(command)) {
    console.log(HELP);
    return;
  }
  if (['--version', 'version'].includes(command)) {
    console.log(VERSION);
    return;
  }
  const options = {
    init: { out: 'string', force: 'boolean' },
    inspect: { json: 'boolean' },
    validate: { json: 'boolean' },
    build: { out: 'string', force: 'boolean' },
    export: { format: 'string', out: 'string', force: 'boolean' },
    compare: { out: 'string', force: 'boolean' },
    sweep: { config: 'string', out: 'string', force: 'boolean' },
    sensitivity: { config: 'string', out: 'string', force: 'boolean' },
    serve: { port: 'string' },
  };
  if (!Object.hasOwn(options, command)) throw new Error(`Unknown command: ${command}`);
  const { positionals, flags } = parse(args, options[command]);
  if (command === 'init') {
    need(positionals, 1);
    console.log(
      await atomicWrite(
        out(flags),
        JSON.stringify(createSpec(positionals[0]), null, 2) + '\n',
        flags.force,
      ),
    );
  } else if (command === 'inspect') {
    if (positionals.length > 1) throw new Error('Inspect accepts zero or one model name.');
    const model = positionals[0];
    if (model && !Object.hasOwn(MODELS, model)) throw new Error(`Unknown model: ${model}`);
    const data = model
      ? { model, ...MODELS[model] }
      : Object.entries(MODELS).map(([key, value]) => ({
          model: key,
          label: value.label,
          question: value.question,
        }));
    console.log(
      flags.json
        ? JSON.stringify(data, null, 2)
        : model
          ? `${data.label}\n${data.formula}\n\n${Object.entries(data.controls)
              .map(
                ([k, c]) => `${k}: ${c.label} [${c.min}, ${c.max}] ${c.unit}; default ${c.value}`,
              )
              .join('\n')}\n\n${data.assumptions.join('\n')}`
          : data.map((m) => `${m.model.padEnd(10)} ${m.question}`).join('\n'),
    );
  } else if (command === 'validate') {
    need(positionals, 1);
    const spec = await readSpec(positionals[0]);
    const result = evaluate(spec);
    console.log(
      flags.json
        ? JSON.stringify({
            valid: true,
            model: spec.model,
            rows: result.rows.length,
            engineVersion: VERSION,
          })
        : `Valid ${spec.model} experiment · ${result.rows.length} computed rows · engine ${VERSION}`,
    );
  } else if (command === 'build') {
    need(positionals, 1);
    console.log(
      await atomicWrite(
        out(flags),
        await renderExperiment(await readSpec(positionals[0])),
        flags.force,
      ),
    );
  } else if (command === 'export') {
    need(positionals, 1);
    if (!['json', 'csv'].includes(flags.format)) throw new Error('--format must be json or csv');
    const spec = await readSpec(positionals[0]);
    console.log(
      await atomicWrite(
        out(flags),
        flags.format === 'json'
          ? JSON.stringify(resultDocument(spec), null, 2) + '\n'
          : csv(evaluate(spec)),
        flags.force,
      ),
    );
  } else if (command === 'compare') {
    need(positionals, 2);
    const a = await readSpec(positionals[0]),
      b = await readSpec(positionals[1]);
    if (a.model !== b.model) throw new Error('Comparison requires the same model family.');
    const before = resultDocument(a),
      after = resultDocument(b);
    const report = {
      format: 'counterplot-comparison',
      formatVersion: 1,
      engineVersion: VERSION,
      before,
      after,
      deltas: after.results.metrics.map((m, i) => ({
        label: m.label,
        unit: m.unit,
        before: before.results.metrics[i].value,
        after: m.value,
        delta:
          m.value === null || before.results.metrics[i].value === null
            ? null
            : m.value - before.results.metrics[i].value,
      })),
    };
    const text = JSON.stringify(report, null, 2) + '\n';
    if (flags.out) console.log(await atomicWrite(flags.out, text, flags.force));
    else console.log(text);
  } else if (command === 'sweep' || command === 'sensitivity') {
    need(positionals, 1);
    if (command === 'sweep' && !flags.config)
      throw new Error('Sweep requires --config with explicit axes.');
    const spec = await readSpec(positionals[0]);
    let options = {};
    if (flags.config) {
      const info = await stat(flags.config);
      if (info.size > 100000) throw new Error('Analysis config exceeds 100 KB.');
      options = JSON.parse(await readFile(flags.config, 'utf8'));
    }
    const value = analysisDocument(spec, command, options);
    console.log(await atomicWrite(out(flags), JSON.stringify(value, null, 2) + '\n', flags.force));
  } else if (command === 'serve') {
    need(positionals, 1);
    const port = flags.port === undefined ? 18872 : Number(flags.port);
    await serve(positionals[0], port);
    console.log(`Counterplot: http://127.0.0.1:${port}/ · Ctrl+C to stop`);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
