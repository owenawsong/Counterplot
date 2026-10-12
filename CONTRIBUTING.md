# Contributing

Start with a question people should be able to investigate. Add one excellent example before expanding the renderer.

1. Explain the model's intended use, equations, units, parameter bounds and assumptions.
2. Use pure deterministic calculations with bounded compute. Include explicit undefined or failed outcomes.
3. Add an analytical reference case or meaningful invariant, edge cases and at least one genuinely revealing comparison.
4. Build a named-scenario example and document its limits in `docs/MODELS.md`.
5. Run `npm test`, `npm run build`, `npm run check` and `npm pack`.
6. Check the generated HTML in a browser at desktop and phone widths, including keyboard controls and exported values.

Do not add remotely hosted assets, telemetry or an AI provider to a portable document. Do not silently change existing formulas or units. Change engine version for altered numerical behavior, and describe the change in `CHANGELOG.md`.

Numerical correctness, clear assumptions and useful interaction matter more than the number of models. Pull requests should include their verification evidence and a screenshot when changing the interface.
