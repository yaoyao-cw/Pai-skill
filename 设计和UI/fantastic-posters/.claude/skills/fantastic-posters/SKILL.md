---
name: fantastic-posters
description: Generate fantastic posters across 33 distinct visual styles using GPT Image 2 (via Fal). Auto-picks the right style from the user's brief, builds a templated prompt, and renders. Multi-ref + logo + brief + batch + template modes. Triggers on "fantastic posters", "quality posters", "make a poster", "poster style", "generate poster".
---

# Fantastic Posters

A poster generator with a curated catalog of 33 visual styles. The agent picks the style that fits the brief, builds the prompt, and generates with GPT Image 2 (via Fal). Multi-reference uploads, brand-book PDFs, structured briefs, batch generation, and template replication are all first-class.

After generation, layer separation is handled outside this skill — open the PNG in Canva and use Magic / Smart Layers to split foreground/background/text.

## How to Run

`generate.js` lives at the project root (alongside `styles.js`).

```bash
cd <repo-root>
node generate.js "<brief>"                                     # auto-pick, 1 image
node generate.js "<brief>" --style=<style_id>                  # force a style
node generate.js "<brief>" --n=3                               # 3 variations
node generate.js "<brief>" --refs=hero.jpg,brand.pdf,logo.png  # multi-ref edit
node generate.js "<brief>" --logo=<path>                       # logo-anchored edit
node generate.js --brief=path/to/brief.{md,yaml}               # structured brief
node generate.js --batch=path/to/listings.json                 # iterate many briefs
node generate.js --template=existing.png "<brief>"             # replicate-template
```

Flags: `--size=portrait|landscape|square|WxH`, `--quality=low|medium|high`, `--palette="#hex,..."`, `--yes`, `--include-experimental`.

The script reads `FAL_KEY` (and optional `KIE_KEY`) from `.env` at the project root. Output PNGs go to `./out/`.

## When the User Says "Make a Poster"

1. Read the brief. Identify mood (calm / vibrant / nostalgic / mystical / luxury / corporate / playful) and subject (event / product / album / movie / listing / retreat).
2. Pick the best matching style from the catalog using the **Style Picker** rules below.
3. **Show the relevant `examples/<style-id>.png` to the user before generating** — never regenerate the catalog showcase. The reference render is the baseline.
4. Tell the user which style you picked and why (one sentence).
5. Run `generate.js`. Default to `--n=1`. If they say "more designs" or "variations", run with `--n=3`.
6. The script will print an estimated cost and ask for confirmation. For >=5 images or `--quality=high` it always prompts regardless of `--yes`.
7. After it saves, give them the file path and remind them: **open in Canva and use Magic Layers if they want to edit text or swap the subject.**

## Reference Image Order (for `--refs`)

Multi-reference uploads follow this convention:

1. **Image 1 — hero photo** (the main subject)
2. **Image 2 — brand book** (PDF auto-renders to PNG page 1 at 2x DPI)
3. **Image 3+ — logos**

For `--template` mode the order is: template (1st) → new hero photo (2nd) → optional logos.

## Style Picker (auto-match by brief intent)

| If the brief is about... | Pick |
|---|---|
| moody crime / thriller / dark cinematic | `cinematic-neonoir` |
| travel / destination / vintage tourism | `vintage-travel` |
| design lecture / minimal swiss / typography | `swiss-minimal-typo` |
| tech conference / agentic web / dev event | `tech-conf-darkmode` |
| annual report / executive / finance | `corporate-report` |
| live music / DIY gig / underground band | `indie-gig-riso` |
| home listing / open house with photo | `luxury-real-estate` |
| luxury estate brochure / architectural retreat | `luxury-estate-cover` |
| art deco / Gatsby / 1920s glam | `art-deco` |
| Bauhaus / primary geometric / design school | `bauhaus-geometric` |
| Japanese woodblock / Edo / classical Japan | `ukiyo-e` |
| sixties rock / Fillmore / hippie concert | `psychedelic-60s` |
| synthwave / retro futurism / 80s sunset | `vaporwave-synth` |
| minimalist film / cut-paper / Hitchcock vibe | `saul-bass-minimal` |
| 80s postmodern / playful clashing patterns | `memphis-80s` |
| high fashion magazine / editorial cover | `editorial-fashion` |
| symmetric pastel / dollhouse / storybook film | `symmetric-storybook` |
| comic / Ben-Day dots / pop art | `pop-art-comic` |
| wellness / meditation / retreat / soft calm | `pastel-mindful` |
| zen / Japanese ink / monastic minimal | `sumi-e-zen` |
| Día de los Muertos / Mexican folk / festival | `loteria-folk` |
| surreal / Magritte / dreamlike | `surreal-dreamscape` |
| documentary / Magnum reportage / photo essay | `documentary-portrait` |
| stadium / race / athletic event campaign | `sports-action-hero` |
| album cover / vinyl / soul-funk debut | `album-cover-portrait` |
| post-apocalyptic action game key art | `post-apoc-sword` |
| melancholic sci-fi wanderer / cargo / Iceland | `lone-traveler-cargo` |
| cyberpunk / neon noir / dystopian megacity | `neon-noir-cyberpunk` |
| streetwear lookbook / drop / collection | `streetwear-lookbook` |
| tech product reveal / keynote / Apple-style | `minimal-tech-keynote` |
| brutalist / broadcast / jersey-number / HYROX-style | `brutalist-broadcast` |
| restaurant / wine bar / jazz lounge / brasserie / hospitality | `emerald-nocturne` |
| absurd transit map / mood diagram *(experimental)* | `absurd-transit-map` |

If nothing matches confidently, ask the user to pick from a 3-option shortlist.

## Out-of-Left-Field Mode

When the user asks for "out of left field", "weird", "different", "surprise me", or "experimental" ideas, default catalog picks are forbidden. Instead:

1. **Vary palette and typography away from catalog defaults.** Don't reach for the obvious one.
2. **Pull inspiration from less-obvious design references via online research.** Web search/fetch from: Polish theatre poster archives (Jan Lenica, Henryk Tomaszewski), Japanese book covers (Kohei Sugiura, Tadanori Yokoo), Czech New Wave film posters, AIGA poster annuals, Dribbble's experimental tag.
3. **Propose 5+ ideas with a one-line vibe each BEFORE generating.** Let the user pick.
4. **Never default to safe catalog picks for these requests.**

## Logo Handling Protocol

- Pass logos as base64 data URIs (handled automatically when you supply `--logo=<path>`), never as a local path string.
- Use the `gpt-image-2/edit` endpoint when a logo is supplied (handled automatically).
- Add the "do NOT redraw, recolour, or modify proportions" clause to the prompt (handled automatically).
- When a brief specifies "mark on black panel" or "mark on white panel" (HYROX-affiliate work), enforce it in the prompt.
- For **dual-wordmark** layouts (client + partner), specify equal visual weight, separated by a hairline rule, never combined into a single lockup.
- Logo placement reliability is imperfect even with the edit endpoint — review the rendered logo carefully before delivering.

## Trust the Reference

When using `--template` or any multi-ref edit mode, **the shortest prompt that names ONLY what changes outperforms verbose specs.** Trust the reference image to carry layout, typography, palette, and logo. Don't restate what the reference already shows. Verbose specs make the model drift.

## What References Can and Can't Do

- References guide style/content, not pixel-copy templates.
- Exact font reproduction is unreliable past ~6 words. Shorten titles.
- Logos may be subtly redrawn — pass them as a separate ref for stronger anchor (`--logo=`) or composite in Canva afterward.
- Output aspect follows `image_size` (the `--size` flag), not the reference image. For `--template` mode, set `--size` to match the template's aspect manually.

## Generation Settings (cost table)

| Quality | $/image | Time | When to use |
|---|---|---|---|
| `low` | ~$0.011 | 10-15s | drafts, exploring directions |
| `medium` | ~$0.04 | 25-40s | client review |
| `high` | ~$0.17 | 60-90s | final delivery (then upscale externally) |

Default `--size=portrait` is 1024x1536 (max 1536/side). For A2 print at 300 DPI, upscale externally with Topaz Photo AI or Real-ESRGAN.

For >=5 images or `--quality=high`, the CLI always prompts for confirmation regardless of `--yes`.

## Subagent Fan-Out (canonical bulk pattern)

For 10+ briefs, use Claude's Agent tool to fan out — one subagent per brief, each running this skill independently. Example:

```
Spawn N subagents. Each runs:
  fantastic-posters --brief=briefs/{client}.md --refs=hero.jpg,brand.pdf,logo.png
```

Subagents are how this skill produces real-client batches at speed.

## Rules

- **Use real brand names when supplied.** Real-client work is the primary use case. Only anonymise for generic demos.
- **Don't oversell calm styles** — for `pastel-mindful` and `sumi-e-zen`, restraint is the whole point.
- **Footer billing line** is always last — date · venue · price/credit.
- **Title rendering** — GPT Image 2 is strong on typography but not perfect. If a title has more than ~6 words, expect typos.
- **Variations** — when running `--n=3`, vary the subject slightly rather than the same prompt 3x.
- **Show, don't regenerate.** When auto-picking a style, show `examples/<style-id>.png` first — never regenerate the catalog.

## Out of Scope

- **No PSD layering in this skill.** Direct the user to **Canva → Magic / Smart Layers**. PSD-layering is available via the adjacent `poster-to-layers` pipeline if Photoshop is preferred.
- **No upscaling in this skill.** Point users to Topaz Photo AI or Real-ESRGAN for print-resolution output.
- **No animation.** Still images only.
