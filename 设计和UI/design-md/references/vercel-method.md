# Vercel method notes

Source article — https://vercel.com/blog/how-our-agents-build-on-brand-pages-with-design-md
Public skill file — https://vercel.com/design.md
Foundation CSS — https://vercel.com/geist/vercel-brand.css

Use these notes when the user wants the original system or a faithful Vercel-authored page. Do not treat Vercel assets as a generic default for other brands.

## Why a single public file

Internal product-design skills work when the design system lives in the same repo. Agents building reports, proposals, and one-off pages often work outside that repo. design.md is the portable substitute — one URL any agent can load.

Porting subjective product-design language into a public prompt failed. Models rebuilt style from adjectives and converged on generic SaaS layouts. The rewrite started from evaluation, not from a style guide dump.

## Three parts that made it work

1. Guidance in design.md — reader job, evidence structure, composition, copy, publishing rules, named anti-patterns.
2. Public stylesheet — bounded class and token vocabulary. Agents emit class names; the browser loads CSS. The implementation does not consume context tokens.
3. Evaluation loop — human review for hierarchy and job-to-be-done; deterministic checks for mechanical failures.

## Eval setup they used

Seven frozen scenarios drawn from real work:

1. Usage and performance report
2. Renewal proposal
3. Benchmark report
4. Interactive planning page
5. Build-versus-buy brief
6. Security governance brief
7. Presentation deck

Same prompt, mock data, viewport, and model settings. Only design.md changed. They reviewed on multiple models, stored prompt + inputs + model + file version + screenshot + notes, and used blind A/B.

Reported result after 200+ runs — in a small final check, known encoded failures fell from 91 to 39 (about 57%). Caveats they stated — the check only sees failures already named; the sample was small; pages could still be unshippable. The useful property — once a failure is named and encoded, it tends to stay gone.

## Example they published

Renewal proposal without the file → generic SaaS dashboard.
With the file → recommendation first, commercial evidence in a grid, peer values on one scale, supporting detail de-emphasized.

Same type, color, and spacing across scenarios. Different structure per reader job. An interactive planning page puts controls first; a renewal proposal puts the recommendation first.

## Where they put a correction

Example — a table squeezed to prose width.

- Rule in design.md — evidence tables use full available width
- Deterministic check — catch the same failure next time
- Stylesheet change only if a reusable primitive was missing

Judgment stays in prose. Mechanics stay in CSS. Anything mechanically visible becomes a check.

## What keeps the file current

A Slack `@design-agent` loads design.md, builds the page, and posts a screenshot plus deploy URL. Weekly aggregation from Slack, GitHub, and Figma. Recurring complaints become proposed changes. A human chooses the layer. New page types become new eval scenarios.

## Practical rule for this skill

If the user wants pages that look like official Vercel customer surfaces, load https://vercel.com/design.md and use the published `vbg-*` API unchanged.

If the user wants the method for another brand, copy the architecture and the judgment framework, not the wordmark, triangle, or Vercel copy rules.
