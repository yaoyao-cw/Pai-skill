# Authoring a design.md

A design.md is an agent skill disguised as a brand file. It is not a brand book. It is the minimum judgment plus the documented primitive vocabulary another model can apply outside your repo.

## What belongs in the file

- Reader jobs this surface exists to serve
- Priority order when requirements compete
- How to choose composition from material
- Observable visual rules
- Exact class names and tokens the agent may emit
- Named failures you keep correcting
- Integration rules for host frameworks and assets

## What does not belong

- Raw CSS implementation (link it; do not paste it into the prompt)
- A component encyclopedia the model will ignore
- Subjective adjectives as the only guidance ("premium," "clean," "delightful")
- Marketing slogans copied in as if they were layout rules
- Secrets, customer data, or unpublished claims

## Recommended skeleton

```markdown
---
name: org-report-guidelines
description: Design or substantially improve official org-authored report websites. Use for customer reports, proposals, briefs, benchmarks, calculators, and decision pages that need this brand's type, grid, and evidence craft.
---

# Design report websites like Org

## Scope
Own editorial decision pages. Do not imitate the product app. Do not imitate a campaign landing page.

## Priority order
1. Preserve supplied facts, formulas, units, privacy, and task constraints.
2. Preserve the caller's framework and the published foundation stylesheet.
3. Make the reader's question, strongest supported answer, and material evidence clear.
4. Establish authorship through shell, type, grid, and restraint.
5. Choose a composition specific to this material.
6. Refine responsive behavior last.

## Frame the reader's job
...

## Choose the composition
...

## Authorship shell
Header, footer, wordmark rules, metadata fields that may exist, fields that must not be invented.

## Grid, type, color
Document roles and tokens by name. Ban arbitrary sizes.

## Primitive vocabulary
List the classes the agent may use. Show one HTML example per primitive, not the CSS.

## Copy and evidence
Two reading speeds. One evidence home. Honest caveats.

## Named failures
The list this org actually sees.

## Integration
How to resolve the stylesheet URL, fonts, and host framework. Forbidden dependencies.
```

## Stylesheet rules

Publish one CSS file with a namespace (`vbg-`, `acme-report-`, etc.).

- Tokens for type, space, color, radius, control height
- Light and dark via `color-scheme` / `light-dark()`, not a prompt-described palette
- Primitives agents otherwise invent — header, section, reading measure, full-width table wrap, stat strip, comparison, chart viewport, calculator field, footer
- Variants through data attributes (`data-priority`, `data-tone`, `data-mobile="stack"`), not new class families
- Page-specific CSS may add a custom namespace. It must not override published primitive layout, type, surface, or controls

Document the public API in design.md. Never ask the model to read the CSS source.

## Evaluation loop

Write 5–8 fixed scenarios from real work (renewal, benchmark, incident review, pricing calculator, build-vs-buy). Freeze the prompt, mock inputs, viewport, and model settings. Change only design.md or the CSS between runs.

Review with:

- Full-page render
- Blind A/B when a rule is in dispute
- Notes attached to the file version that produced the page

Encode accepted corrections. Re-run. Drop a rule that helps one scenario and damages another.

Seed checks for failures you can see without taste:

- Foundation stylesheet is linked and not rewritten
- Only documented primitive classes plus one custom namespace
- Tables are not constrained to reading measure
- Peer values share a type role
- No stock image domains, icon kits, or chart libraries unless allowlisted
- No invented metadata fields

## Maintenance

Collect the comments reviewers already repeat. Rewrite each as an observable rule. Decide the layer. If a new page type keeps appearing, add it as a scenario rather than stretching a rule that was written for a different job.

One owner. Many readers. Drift starts when everyone edits the definition of the brand.
