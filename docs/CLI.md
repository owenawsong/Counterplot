# CLI reference

All commands work from any directory. The source checkout entrypoint is `node /path/to/Counterplot/bin/counterplot.js`. Installing a locally built package with `npm install -g ./counterplot-0.1.0.tgz` adds the `counterplot` command. There is no public npm release assumed by the quickstart.

## init

`counterplot init MODEL --out experiment.json`

Create a valid spec with defaults. Files are never replaced unless `--force` is explicit.

## inspect

`counterplot inspect [MODEL] [--json]`

List model families or inspect one family’s exact controls, units, bounds, assumptions and references. JSON output is suitable for agent tool calls.

## validate

`counterplot validate experiment.json [--json]`

Validate a spec and evaluate its baseline. Exit 0 on success, 1 on error. Invalid input is explained using field paths. `--json` emits a success summary; validation failures are human-readable on stderr.

## build

`counterplot build experiment.json --out experiment.html [--force]`

Produce one standalone HTML file. It contains its spec, numerical engine, interaction code, CSS and hash-based Content Security Policy. It requires no external scripts, fonts or server. Read the saved file in a modern browser. A browser or enterprise policy that prohibits local scripts may require `serve`.

## export

`counterplot export experiment.json --format json|csv --out results.json [--force]`

JSON preserves complete results, exact inputs and provenance. CSV exports the family’s numerical table at full numeric precision, not screen-rounded values. Null fields are empty in CSV. Text cells with spreadsheet formula prefixes are protected; numeric negative values remain numeric.

## compare

`counterplot compare before.json after.json [--out comparison.json] [--force]`

Specs must use the same model family. Produces both complete result documents and per-metric raw deltas. Without `--out`, writes JSON to stdout. Different units/families cannot be compared. It does not test causal identifiability or rank scenarios as “better”.

## serve

`counterplot serve DIRECTORY [--port 18872]`

Serve a built gallery or experiment directory on `127.0.0.1` only. Port must be 1024–65535. No directory listing, upload, write API or remote model service. GET/HEAD only, Host allowlist, MIME headers and symlink-aware path boundaries. Put an `index.html` in the directory or navigate to a specific HTML filename. Press Ctrl+C to stop.

The development server is not a production host. Publish the built `site/` directory with an ordinary static host; GitHub Pages workflow is included as a manual release action.

## Node API

`createSpec(model)`, `validateSpec(spec)`, `evaluate(spec, partialOverrides)`, `csv(result)`, `MODELS`, `VERSION` are exported from the package root. Validation returns a clone; evaluation does not mutate its inputs. `renderExperiment(spec)` is exported from `counterplot/render` and requires Node filesystem access to packaged templates.
