# Equations, numerical checks and limitations

All calculations use JavaScript IEEE-754 double precision. Parameters have fixed units and documented bounds. The engine is deterministic within a runtime; numerical tolerances acknowledge finite precision. Transcendental functions such as `Math.exp` may differ at the last binary digits across runtimes, even with matching source/spec fingerprints. Raw rows preserve those values. There is no stochastic sampling, external data, trained model or LLM involved in evaluation.

## Quadratic gradient descent

`f(x,y) = 0.5(a x² + b y²)` with `a,b > 0`. Exact gradients are `(a x, b y)`. Updates are `x ← (1 − ηa)x`, `y ← (1 − ηb)y`. The minimum is the origin. Convergence from every starting point requires `0 < η < 2/max(a,b)`.

At the boundary, the steepest active coordinate can oscillate with constant magnitude. A zero starting coordinate remains zero even if its associated factor would be unstable from other starting points. The explanation accounts for active coordinates; the global stability metric is still the all-starting-points condition.

The trace stops immediately after a recorded objective exceeds 10¹². This preserves a visible divergence result without producing infinite coordinates. Final metrics describe the actual stopping point, not the requested iteration count. Linear and logarithmic objective views are available; zeros are omitted on the log axis. The path plot uses the same actual x/y trajectory.

Tests compare explicit two-step results, monotonic decrease for a stable rate, boundary oscillation, the origin, and early stopping on divergence.

Reference: [Boyd and Vandenberghe, Convex Optimization, Chapter 9](https://web.stanford.edu/~boyd/cvxbook/).

## Monthly loan amortization

Principal `P`, nominal annual percentage `apr`, monthly rate `r = apr/1200`, contractual count `n = 12 × years`.

Scheduled payment is `P r / (1 − (1+r)^−n)`. `log1p` and `expm1` avoid cancellation at small rates. At zero interest use `P/n` directly.

For each month: interest is current balance × r; payment is the lesser of scheduled payment + extra and balance + interest; principal reduction is payment − interest. The last payment is capped. A balance under 10⁻⁷ ends the loop to avoid an irrelevant floating-point residual payment. A residual within this threshold is display-rounding scale, not simulated debt forgiveness.

This is a fixed-rate mathematical illustration, without cent rounding, taxes, fees, penalties, changing rates or inflation. The unit is an abstract currency; none is inferred from locale. Payment dates are not calendar dates.

Tests compare the known monthly payment for 100,000 at 6% over 30 years, zero interest, principal conservation, extra-payment effects and a capped single payment.

Reference: [OpenStax Principles of Finance, annuities](https://openstax.org/books/principles-finance/pages/8-2-analyzing-an-annuity).

## Ideal RC step response

Input resistance in kΩ is multiplied by 1000; capacitance in µF is multiplied by 10⁻⁶. Time constant `τ = RC` is in seconds.

`V(t) = Vs + (V0 − Vs)exp(−t/τ)`. Current is defined from source toward capacitor: `I(t) = (Vs − V(t))/R`. CSV current is in mA. Initial voltage can exceed supply, so negative current and a decreasing voltage are valid.

The curve contains 201 evenly spaced samples over the selected number of time constants. The “90%” metric is 90% of the transition from V0 toward Vs, not necessarily 90% of the supply. When V0 equals Vs there is no transition, the timing is `null`/Undefined, and the explanations do not claim a completed fraction. The characteristic time constant still remains a property of the RC network.

Changing R or C changes the actual time axis. With a fixed observation window in time constants, the final fraction reached is unchanged. Baseline overlays use their own actual seconds on a shared axis.

Tests check the τ unit conversion, the exponential at one τ, doubled resistance, discharge and equilibrium.

Reference: [OpenStax University Physics, RC circuits](https://openstax.org/books/university-physics-volume-2/pages/10-6-rc-circuits).

## SIR dynamics

`S′ = −βSI/N`, `I′ = βSI/N − γI`, `R′ = γI`, with `γ = 1 / recoveryDays`. Initially `S = N − I0`, `I = I0`, `R = 0`.

At the chosen intervention day, β is multiplied by `(1 − reduction/100)` permanently. Integration uses classical fourth-order Runge–Kutta with a maximum internal step of 0.1 day. Steps split exactly at the intervention boundary; daily samples are exported. An intervention at day zero affects the first derivative. An intervention at the final observation instant has no effect before that instant.

The initial reproduction-number metric is `R0 = β/γ`, including the reduced β when intervention starts at day zero, and assumes full susceptibility. Effective reproduction also depends on S/N. This is a homogeneous closed deterministic population with fractional expected counts, not a forecast. It excludes latency, age, births, deaths, varying contact structure, waning immunity and randomness.

Peak metrics are the maximum of daily samples within the selected horizon. They are not an exact continuous peak or necessarily the eventual peak.

Tests check positivity, constant population, monotonic S/R, exact intervention equivalence, pure exponential recovery under zero transmission, and the no-intervention invariant `ln(S/S0) + R0 × R/N = 0`, with rounding tolerance.

Reference: [Kermack and McKendrick (1927)](https://doi.org/10.1098/rspa.1927.0118).

## Bayes and expected test outcomes

Percentages are converted to fractions. Expected true positives are `N × prevalence × sensitivity`; false positives are `N × (1 − prevalence) × (1 − specificity)`. False negatives and true negatives complete the four-cell table.

`PPV = TP / (TP + FP)`; `NPV = TN / (TN + FN)`. When either denominator is zero that conditional probability is `null`, displayed as “Undefined”. It is never silently replaced by zero. The plotted prevalence curve keeps sensitivity and specificity fixed, and marks the selected prevalence; it is not a time series.

Expected counts can be fractional. No actual patients, diagnoses or test calibration are included. Repeated tests require additional assumptions about dependence that this model does not make.

Tests check the known 95/194 positive denominator, expected-count conservation, population scaling, perfect tests and impossible conditioning events.

Reference: [OpenStax introductory statistics, probability](https://openstax.org/books/introductory-statistics-2e/pages/3-2-independent-and-mutually-exclusive-events).

## Observed binary classification

Input consists of 2–2,000 paired binary labels and scores in [0,1]. Labels encode the observed positive class as 1. A threshold t predicts positive exactly when `score >= t`, including ties. Scores need not be calibrated probabilities. The toolkit verifies numeric shape, not dataset independence, representativeness, label quality or evaluation split.

At the selected threshold count TP, FP, TN and FN. Accuracy is `(TP+TN)/N`; precision is `TP/(TP+FP)`; recall is `TP/(TP+FN)`; F1 is `2TP/(2TP+FP+FN)`. A zero denominator produces null, not the zero-filling convention used by some libraries. Accuracy, precision and recall metrics are displayed in percent; F1, ROC AUC and average precision are fractions in [0,1].

ROC and PR curves sort scores descending, adding **all equal scores together**. The initial null-threshold point represents no predicted positives: recall/TPR zero if positives exist, FPR zero if negatives exist, and precision undefined because no predictions exist. Then each unique-score threshold includes the whole group at that score. This avoids arbitrary within-tie ordering and agrees with a pairwise interpretation of ROC AUC: probability that a positive scores above a negative, with half credit for a tie.

ROC AUC uses the trapezoidal integral of tied-group TPR versus FPR. It is undefined if either observed class is absent. Average precision uses `sum((recall_k−recall_(k−1)) × precision_k)` over included groups. It is a right-step precision–recall integral, **not trapezoidal PR area**. Average precision is undefined without positives; with only positive labels it is one. The PR baseline under uninformative ordering depends on the positive fraction, not a universal 0.5.

Changing the selected threshold changes the confusion matrix and threshold metrics. Ranking areas/curves are unchanged. Selecting a threshold to maximize a metric on these rows is tuning on these labels; report final performance on independent data. No confidence intervals, calibration assessment or multiclass evaluation are inferred.

Tests check hand-calculated confusion/areas, an independent pairwise AUC identity, perfect/reversed rankings, exact ties, score boundaries, threshold invariance, one-class and no-prediction undefined outcomes, and invalid/sparse data rejection.

Reference: [scikit-learn model evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html#classification-metrics). This implementation is dependency-free and documents its explicit null conventions rather than inheriting a library's defaults.
