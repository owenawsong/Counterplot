# Agent workflow

Counterplot separates authored framing from numerical evaluation. An agent picks a supported model, writes a question and scenarios, and calls real tools to check its output. It has no embedded model provider, MCP server, private service or dependency on one agent product.

The skill at `skills/counterplot/SKILL.md` can be loaded as task context or installed through your agent's normal local-skill mechanism. Paths vary by agent, so there is no universal install command. A source checkout is enough; use its absolute `bin/counterplot.js` path from another project.

## A worked sequence

```bash
node bin/counterplot.js inspect descent --json
node bin/counterplot.js init descent --out lesson.json
# Edit title, description and scenarios using your file editor.
node bin/counterplot.js validate lesson.json --json
node bin/counterplot.js export lesson.json --format json --out lesson-results.json
node bin/counterplot.js build lesson.json --out lesson.html
```

Review the actual exported rows. At `a=1`, `b=8`, `x=5`, `y=4`, `η=0.1`, step one is `(4.5, 0.8)`. At `η=0.25`, the y coordinate changes sign without shrinking. Increasing η further can diverge. A good explanation distinguishes those outcomes, provides scenario buttons and lets the reader inspect the trajectory.

## What the toolkit contributes

| Agent authors | Engine guarantees |
| --- | --- |
| Title and description | Escaped plain-text rendering |
| Bounded inputs | Validation of types, ranges and relationships |
| Named scenario comparisons | Re-evaluation with the same numerical implementation |
| Explanation framing | Adaptive computed paragraphs, equations and assumptions |
| Output filename | Portable document and reproducible numerical exports |

Titles can still be misleading. A spec validator cannot verify the truth of all authored prose or relevance to the original question. Test the limiting cases, read the assumptions and inspect the artifact.

## Evaluating agent usefulness

No measured agent productivity claim is made for this toolkit. A future comparison should give the same tasks to agents with and without the toolkit, independently check numerical correctness, record invalid outputs and measure how much manual correction the final explanation requires. Code compilation and an attractive screenshot alone are insufficient evidence.
