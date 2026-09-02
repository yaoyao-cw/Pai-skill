---
name: design-md
description: Build on-brand report, proposal, brief, benchmark, calculator, and decision pages, or author a design.md plus constrained stylesheet so agents stop inventing generic SaaS layouts. Use when the user mentions design.md, on-brand pages, Vercel brand pages, Geist report pages, renewal proposals, usage reports, or encoding a design system for coding agents.
metadata:
  type: workflow
  version: "1.0"
  source: Vercel design.md method
---

# Design.md

Encode brand judgment as a loadable markdown file, constrain mechanics in a public stylesheet, and improve both through an evaluation loop. Do not restyle a data dump. Do not assemble a generic SaaS dashboard.

Vercel published the original method and file at https://vercel.com/blog/how-our-agents-build-on-brand-pages-with-design-md and https://vercel.com/design.md. This skill extracts the transferable system. It does not grant Vercel authorship, wordmark, or triangle logo unless the user explicitly wants a Vercel-authored surface.

## Decide the job

Pick one mode and stay in it.

1. **Build a page** — the user wants a report, proposal, brief, benchmark, planner, calculator, or decision page that looks authored, not generated.
2. **Author a design.md** — the user wants a reusable brand file agents can load later.
3. **Harden an existing design.md** — turn repeated review comments into observable rules, CSS primitives, or checks.

If a brand file already exists (design.md, brand.md, guidelines URL, Geist/vbg CSS, company tokens), load it and treat it as authority. Do not invent a parallel visual system.

## Three-part system

Keep decisions in the narrowest layer that can enforce them.

- `design.md` prose holds judgment — reader job, composition choice, copy rules, named anti-patterns.
- Public stylesheet holds repeatable mechanics — type roles, spacing scale, table/stat/chart primitives, theme tokens.
- Deterministic checks hold mechanical failures — table uses full evidence width, peers share type role, no invented font sizes.

Models interpret "keep it clean" inconsistently. Write checkable rules instead — "evidence tables use the full available width," not "make the table feel less cramped."

The stylesheet stays out of the model context. Document class names and tokens in `design.md`. Agents reference those names; the browser loads the CSS at render time.

## Work in four passes

Do not start in components.

### 1. Frame the reader's job

Inspect all material first. Privately answer:

- Who opens this, in what context, to decide or understand what?
- What is the strongest supported answer?
- What evidence earns that answer?
- What caveat, limit, or tradeoff could change it?
- What must remain auditable without dominating the first read?

Preserve supplied facts, units, periods, populations, formulas, qualifiers, and privacy constraints. Never invent intent, ownership, urgency, certainty, deadlines, approvals, future behavior, or confidentiality.

Support two reading speeds:

- **Executive path** — identity, title, headings, decisive values, captions, and conclusion carry the argument.
- **Audit path** — exact tables, assumptions, methodology, caveats, and sources preserve the record.

Every section answers a new reader question. One evidence home per claim. Do not restate the same answer as a summary card, then a chart, then a conclusion at equal prominence.

### 2. Choose the composition

The first viewport is the argument, not a masthead plus setup. Name the obvious template for this artifact category, then reject it unless the material earns it.

Match opening to job:

- Decisive recommendation — answer and its decisive basis co-primary.
- Comparison — alternatives on one visual basis so the difference is seen, not reconstructed.
- Trend or benchmark — relationship or exception leads; exact records sit below.
- Calculator or planner — the control itself is focal evidence. Do not precede it with a ceremonial static version of the same answer.
- Brief with no supported decision — lead with the strongest supported state, implication, limit, or unresolved question. Do not invent a CTA.

Map material to a visual variable before picking components:

- Magnitude or rank → position or length on a common scale
- Change over time → horizontal order and aligned position
- Composition → proportion
- Threshold or range → distance from a boundary
- Process or dependency → connection and sequence
- Qualitative alternatives → aligned rows or contrasted columns

Use tables for precise lookup, prose for one conclusion, charts only when a relationship is faster to see than to read. Do not default to bars because values exist.

Squint test — the dominant claim or evidence is obvious. Text-mask test — with words blurred, hierarchy still shows identity, emphasis, grouping, and progression. If every block has equal weight, redesign before coding.

### 3. Apply the visual system

Use the caller's stack when one exists. Otherwise ship the smallest runnable web page — semantic HTML, one foundation stylesheet, small JavaScript only for stateful controls.

Constraints that survive without Vercel's CSS:

- One shared outer grid and one type scale. No arbitrary font sizes or weights.
- Reading prose is narrower than evidence. Tables, charts, calculators, and comparisons may use full evidence width.
- Brand-specified sans for prose and figures; mono only for code, paths, tokens, and short IDs.
- Design in monochrome. Color only for state, action, or a labelled data distinction, always paired with a non-color cue.
- Light and dark are implicit. No visible theme switcher unless requested.
- Open space amplifies the focal object. Empty rectangles from an underfilled split are layout failures.
- Equivalent peers share type role, size, weight, line-height, numeric treatment, and alignment.

If building an official Vercel-authored page, follow https://vercel.com/design.md and link https://vercel.com/geist/vercel-brand.css. Use only documented `vbg-*` classes. Do not restyle published primitives. Wordmark and triangle come from that file's asset rules — do not substitute text logos.

### 4. Refine without weakening hierarchy

Fix responsive behavior, interaction, and details last. Do not add decoration to rescue a weak argument. If the material is thin, improve selection and explanation; leave unsupported gaps honest.

## Copy rules

- Concrete claims, honest caveats. Simplify language, never the claim.
- Keep every qualifier that changes meaning. "Unthrottled" is not "a normal computer."
- Prefer a supported statement over evaluative shorthand such as tiny, huge, safe, or fast.
- Write the executive path in language the least specialized named stakeholder can repeat.
- Keep exact metric names and source vocabulary in the audit path.
- Do not leak authoring vocabulary into page copy — composition, hierarchy, focal relationship, mediation, design.md.
- Do not narrate how the page was organized.

Ask one grouped set of questions only when proceeding could change commercial meaning, legal or security claims, privacy, formulas, units, identity, recommendations, owners, or CTAs. Otherwise omit the unknown, label it honestly, and proceed.

## Named generated-design failures

Hard-reject these. Naming them is the point — agents avoid patterns they can recognize.

- Generic centered hero plus card grid
- Generic SaaS dashboard / equal metric boxes when one relationship would be clearer
- All-caps tracked eyebrows, kickers, overlines, decorative numbered section labels
- Em dash clutter in UI copy
- Decorative gradients, glows, blobs, stripes, textures, glass, ornamental shadows, fake depth
- Badge, pill, or capsule for ordinary metadata
- Cards nested in cards, or borders used to repair weak hierarchy
- Dark rounded rectangle around every chart or calculator
- Icon tiles, oversized icons, mixed icon styles, icons as decoration
- Stock imagery, decorative AI illustrations, abstract shapes, fake screenshots, mandatory hero media
- Auto-scrolling marquees, typing cursors, pulsing status, scroll-reveal of every section, parallax, bounce
- Narrow table in a wide section, or a wide table crushed into broken words
- Decorative charts, redundant visualizations, legends that replace direct labels, color without meaning
- Full-width bars that do not share a scale
- Identical section silhouettes across unrelated questions
- Repeated recommendation / summary / rationale / conclusion that say the same thing
- Visible theme controls or print-only chrome the reader did not ask for
- Invented confidence — hype, novelty, false certainty, manufactured CTAs

Full list and rewrite guidance — [references/anti-patterns.md](references/anti-patterns.md)

## Where a correction lands

When review finds a failure, put the fix in one place:

1. **Judgment** → a prose rule in `design.md` (lead a renewal proposal with the recommendation and its commercial basis).
2. **Reusable mechanic** → a stylesheet primitive or token (stat strip, full-width table wrap, type role).
3. **Mechanical failure** → a deterministic check (table width, peer type-role equality, forbidden class names).

A rule that helped one artifact and hurt another does not ship. Re-run a small fixed scenario set after each change.

## Authoring a design.md

When the user wants a file agents can load later, write one markdown file with this skeleton:

1. YAML frontmatter — `name` plus a trigger-rich `description` (what and when).
2. Scope — which artifacts this file owns, and which it does not (product UI vs editorial report vs marketing campaign).
3. Reader and task — jobs-to-be-done, two reading speeds, priority order when requirements compete.
4. Composition — how to choose structure from material, not from template.
5. Observable visual rules — type roles, grid, color discipline, shell, assets.
6. Documented primitive vocabulary — class names and tokens the agent may use. Do not dump raw CSS into the prompt.
7. Named anti-patterns — the failures this brand keeps seeing.
8. Integration — how to attach the stylesheet, fonts, and host framework without inventing a parallel system.

Keep mechanics in CSS. Keep judgment in prose. Keep the file public or in-repo so any agent can load it by URL or path.

Details and a starter outline — [references/authoring-design-md.md](references/authoring-design-md.md)

Method notes from the Vercel writeup — [references/vercel-method.md](references/vercel-method.md)

## Default deliverable

Unless the user specifies otherwise:

- Ship a working page (HTML/CSS/JS or the host framework), not a mock or a prompt.
- Link or copy one foundation stylesheet. Do not invent a third type scale.
- Make the first viewport carry the argument.
- Include sources, caveats, and an audit path when evidence exists.
- State assumptions instead of filling gaps.

If asked only to summarize or create the skill-side file, write `design.md` and optionally a companion `.css` with a bounded class vocabulary. Do not produce a 40-page brand book.
