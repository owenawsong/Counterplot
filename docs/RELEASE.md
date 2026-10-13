# Releasing Counterplot v0.2.0

## Verify the source and package

```bash
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
npm run check
npm pack
```

- [ ] The 42-test suite, TypeScript checks and release checks pass on the release commit.
- [ ] CI completes on Linux/Windows and Node 20/24.
- [ ] The package contains the engine, analysis module, worker/UI templates, examples, types and documentation. It contains no local logs, credentials or unneeded build files.
- [ ] Install the tarball in an empty directory and use its CLI to build an HTML file.
- [ ] The generated schema agrees with the engine, and README/local documentation links resolve.

## Check the actual user experience

- [ ] Run the README quickstart from a fresh checkout.
- [ ] Open an exported HTML file directly. Change inputs, pin a baseline and export results.
- [ ] Run one- and two-parameter studies in the browser; inspect selected points and the captured fixed inputs.
- [ ] Apply a study point and verify it restores that study's inputs with the chosen coordinates.
- [ ] Verify undefined and invalid points, plus warnings for a best sampled point and undefined-baseline sensitivity.
- [ ] Import a valid numeric `label,score` CSV. Reject malformed/oversized data; identify the bundled dataset as an authored fixture.
- [ ] Verify grouped ROC/PR geometry, threshold counts and undefined denominators.
- [ ] Save current inputs and a pinned baseline as HTML; reopen it and run the embedded worker.
- [ ] Check mobile layout, keyboard study navigation, reduced motion and cancel/restart behavior.
- [ ] Compare browser/CLI input and source fingerprints. Allow documented floating-point differences in raw numerical results.

## Publish and check the links

Release target: `owenawsong/Counterplot`. Verify the release commit and artifacts before publishing.

1. Push the reviewed release commit and confirm its CI results.
2. Confirm the repository is publicly accessible and check it without an authenticated account.
3. Create a `v0.2.0` release containing the npm tarball and generated gallery archive. npm registry publication is optional; the README uses a source checkout.
4. If publishing a gallery, enable GitHub Pages with GitHub Actions and manually dispatch the included workflow. Check the deployed examples, studies and exports before adding its URL to documentation.
5. Check the public README image, quickstart, license and methods links.
6. Use [the launch drafts](LAUNCH.md) for the maintainer's announcement. Publish external posts only with explicit authorization for that destination.

The launch should describe an inspectable toolkit with six supported model families. Its tests do not establish independent scientific validation, real-world forecast accuracy or increased agent productivity.
