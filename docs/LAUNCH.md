# Counterplot launch material

Drafts for the maintainer to post after the repository and release are publicly accessible. They describe v0.2.0. Nothing in this file is an external publication.

## Short announcement

I built Counterplot: a local workbench for parameter studies and classifier evaluation that saves the whole experiment as one interactive HTML file.

You can sweep learning rate against curvature, inspect a threshold's confusion matrix, compare a baseline, and export the calculation. The file opens offline and includes the numerical engine and study worker.

Node 20+ to build, zero runtime dependencies, MIT. Six supported model families, with equations and limits documented.

https://github.com/owenawsong/Counterplot

## Developer post

**Counterplot: interactive numerical studies in one portable HTML file**

I wanted a way to share an experiment that someone could actually change, without asking them to install a notebook environment or deploy an app.

Counterplot builds that file from a JSON spec. It includes parameter controls, baseline comparisons, one-/two-parameter sweeps, local sensitivity, numerical tables and exports. The browser and CLI use the same implementation; result files identify the inputs and source with SHA-256 fingerprints.

The example I like most is gradient descent: scan learning rate against curvature, inspect the region where updates fail, then apply a sampled point to see its trajectory. There is also a classification workspace for your own binary labels and scores, with confusion counts, ROC/PR curves, AUC and average precision.

v0.2.0 has six bounded model families and 42 tests. Its bundled classifier scores are authored teaching data. Grid search is explicitly sampled—not a global-optimization claim—and the model assumptions stay beside each experiment.

Source and quickstart: https://github.com/owenawsong/Counterplot

Feedback I would find useful: what calculation do you currently explain with a static chart that readers should be able to investigate themselves?

## Demonstration sequence

Record a short screen capture using actual results:

1. Open the quadratic example and pin its baseline.
2. Run a learning-rate × y-curvature study. Keep the axes, color scale and sample count visible.
3. Select a cell and apply it; show the resulting optimization path.
4. Save the interactive HTML. Open the saved file directly and change one input.
5. Briefly show the equations and study JSON export so viewers can inspect the calculation.

Alternative demonstration: import a small numeric `label,score` CSV, change its threshold, show the confusion matrix, and point out that ROC AUC stays fixed when only the threshold changes. Identify the data's source. Avoid presenting the authored example as measured performance from a trained model.

## Suggested presentation

- Lead with an actual screen capture or `assets/study-v2.png`, not a generated illustration.
- Use the screenshot's measured sample count only for that specific study. The bundled CLI study has 135 points; the README screenshot shows a different 231-point interactive study.
- Link the public repository directly. Add a hosted gallery URL only after deploying and checking it.
- Show the standalone file opening and functioning, because that is a concrete reason to use the toolkit.
- Keep numerical limitations near claims about ranking, convergence or optimization. Do not advertise arbitrary equation support, independent scientific validation or measured agent-productivity gains.

## Repository description

Local parameter studies and classifier evaluation, exported as one interactive HTML file. Offline, inspectable, MIT.
