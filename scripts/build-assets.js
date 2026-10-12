import { mkdir, writeFile } from 'node:fs/promises';
import { evaluate, createSpec } from '../src/engine.js';
const result = evaluate(createSpec('descent'), { rate: 0.23, steps: 18 });
const points = result.secondary.series[0].points;
const d = points
  .map((p, i) => `${i ? 'L' : 'M'}${(1000 + p.x * 27).toFixed(2)},${(200 - p.y * 19).toFixed(2)}`)
  .join(' ');
const contours = [1, 2, 3, 4]
  .map(
    (n) =>
      `<ellipse cx="1000" cy="200" rx="${n * 35}" ry="${(n * 35 * 19) / 27 / Math.sqrt(8)}" fill="none" stroke="#8b9e8e" stroke-width="1"/>`,
  )
  .join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="380" viewBox="0 0 1280 380" role="img" aria-labelledby="title desc"><title id="title">Counterplot</title><desc id="desc">Move one thing. Understand what changes. A computed gradient descent path with learning rate 0.23.</desc><rect width="1280" height="380" fill="#f8f5ed"/><path d="M40 40V12M40 40H75" fill="none" stroke="#172b2c" stroke-width="2"/><path d="M43 35 51 18 57 31 64 22 72 26" fill="none" stroke="#bb4b26" stroke-width="3"/><text x="88" y="38" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="-.7" fill="#172b2c">counterplot</text><path d="M40 60H1240" stroke="#c9cdc0"/><text x="48" y="139" font-family="Georgia,serif" font-size="58" fill="#172b2c">Move one thing.</text><text x="48" y="207" font-family="Georgia,serif" font-size="58" fill="#172b2c">Understand <tspan font-style="italic" fill="#bb4b26">what changes.</tspan></text><text x="50" y="262" font-family="Arial,sans-serif" font-size="19" fill="#536360">Portable interactive experiments. Inspect every calculation.</text><text x="50" y="325" font-family="monospace" font-size="12" letter-spacing="1.2" fill="#536360">BOUNDED MODELS · ONE HTML FILE · ZERO RUNTIME DEPENDENCIES</text>${contours}<path d="${d}" fill="none" stroke="#bb4b26" stroke-width="2.8" stroke-linejoin="round"/><circle cx="1000" cy="200" r="4" fill="#172b2c"/><text x="905" y="325" font-family="monospace" font-size="11" fill="#536360">η = 0.23 / 18 UPDATES</text></svg>\n`;
await mkdir(new URL('../assets/', import.meta.url), { recursive: true });
await writeFile(new URL('../assets/banner.svg', import.meta.url), svg);
