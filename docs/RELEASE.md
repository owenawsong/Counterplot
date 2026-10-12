# Release checklist

## Local gates

- [ ] `npm test`: analytical checks, invariants, input errors, CLI and server boundaries pass.
- [ ] `npm ci --ignore-scripts` and `npm run typecheck`: model-specific declarations accept valid inputs and reject incorrect parameter names.
- [ ] `npm run build`: six examples, schema and gallery are generated.
- [ ] `npm run check`: packaged sources, schema parity, document safety and link/artifact checks pass.
- [ ] `npm pack`: package has no local logs, credentials, dependencies or build clutter.
- [ ] Install the tarball in an empty directory; run its CLI and HTML renderer.
- [ ] Open a standalone file without the local server. Change controls and export values.
- [ ] Run browser/CLI parameter studies and local sensitivity; verify invalid/undefined points and frozen inputs.
- [ ] Import valid/invalid labeled-score CSV; verify threshold counts and ranking curves.
- [ ] Save current inputs plus a baseline as interactive HTML and run its worker from the file.
- [ ] Browser QA: desktop/mobile, baseline, scenarios, invalid edit, null probability, playback and reduced motion.
- [ ] Numerical and prose changes are reflected in model docs and changelog.

## Publishing

1. Push reviewed source to the intended repository. Keep private visibility until the owner approves publication.
2. Let CI complete on Windows/Linux and Node 20/24.
3. Enable GitHub Pages with GitHub Actions and manually dispatch the Pages workflow if a public gallery is desired. Workflow permissions do not automatically change repository visibility.
4. Create a `v0.2.0` release with the npm tarball and generated gallery archive. npm publication is optional and is not assumed by the README.
5. Record the deployed gallery URL only after checking it. Do not advertise an unavailable URL.

## Launch copy

“Counterplot turns a small JSON spec into an interactive explanation you can send as one HTML file. Change a learning rate, loan payment, circuit parameter, intervention, test assumption or classification threshold; compare a baseline and inspect the calculation. Six tested model families, no API key, no external runtime requests, MIT.”

Show the same gradient-descent starting point at a stable rate, the boundary and a divergent rate. Then show the numerical table and saved standalone document. Say which model and assumptions are being demonstrated. Avoid claims of scientific audit, universal simulation coverage or measured agent productivity without evidence.
