---
name: quality-posters
description: Generate quality posters across 31 distinct visual styles using GPT Image 2 (via Fal). Auto-picks the right style from the user's brief, builds a templated prompt, and renders. Triggers on "quality posters", "make a poster", "poster style", "generate poster".
---

# Quality Posters

A poster generator with a curated catalog of 31 visual styles. The agent picks the style that fits the brief, builds the prompt, and generates with GPT Image 2.

After generation, layer separation is handled outside this skill — open the PNG in Canva and use Magic / Smart Layers to split foreground/background/text for editing.

## How to Run

`generate.js` lives at the project root (alongside `styles.js`). This skill folder holds only `SKILL.md`.

```bash
cd <repo-root>
node generate.js "<brief>"                         # auto-pick style
node generate.js "<brief>" --style=<style_id>      # force a style
node generate.js "<brief>" --n=3                   # 3 design variations
node generate.js "<brief>" --style=<style_id> --n=3
```

The script reads `FAL_KEY` from `.env` at the project root. Output PNGs go to `./out/`.

## When the User Says "Make a Poster"

1. Read the brief. Identify mood (calm / vibrant / nostalgic / mystical / luxury / corporate / playful) and subject (event / product / album / movie / listing / retreat).
2. Pick the best matching style from the catalog using the **Style Picker** rules below. If two styles fit, pick the more distinctive one — the user can ask for a different style if it misses.
3. Tell the user which style you picked and why (one sentence).
4. Run `generate.js`. Default to `--n=1`. If they say "more designs" or "variations", run with `--n=3` (or the number they ask for).
5. After it saves, give them the file path and remind them: **open in Canva and use Magic Layers if they want to edit the text or swap the subject.**

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
| absurd transit map / mood diagram | `absurd-transit-map` |

If nothing matches confidently, ask the user to pick from a 3-option shortlist of the closest styles.

## Style Catalog

Each style is a self-contained prompt template defined in `styles.js`. The fields the agent fills in vary by style (title, subtitle, date, location, etc.) — the template tells the user what's needed. Common fields:

- `title` — main headline
- `subtitle` — supporting line or kicker
- `body` — small block of text (lineup, quote, listing details)
- `footer` — date / venue / billing block
- `subject` — the central illustrated or photographed element

If a field isn't provided, leave it generic (e.g. "EVENT NAME · CITY · DATE") rather than ask 5 questions.

### Catalog (31 styles)

1. `cinematic-neonoir` — rainy Tokyo alley, neon, distressed serif title, fake billing block
2. `vintage-travel` — 1950s WPA / Roger Broders, flat color, cobalt + cream + red
3. `swiss-minimal-typo` — pure white, single geometric shape, Helvetica stack, generous space
4. `tech-conf-darkmode` — charcoal, abstract chrome sculpture, geometric sans-serif title, monospace footer
5. `corporate-report` — premium off-white, single editorial photo, Didone serif, refined whitespace
6. `indie-gig-riso` — risograph two-color, halftone collage, hand-cut zine feel
7. `luxury-real-estate` — listing flyer, photo top 2/3, forest-green serif, three-column data block (uses `--ref=<image>`)
8. `luxury-estate-cover` — full-bleed dusk estate photo, Didone "QUIET MAJESTY", magazine-cover restraint
9. `art-deco` — gold geometric sunburst on midnight black, tall condensed serif, mirrored ornament
10. `bauhaus-geometric` — primary red/blue/yellow shapes, lowercase sans, hairline rules
11. `ukiyo-e` — Japanese woodblock, great wave or Fuji, vertical kanji column + small hanko seal
12. `psychedelic-60s` — Fillmore-era hand-drawn melting bubble lettering, hot magenta + lime + tangerine
13. `vaporwave-synth` — sunset gradient, chrome floor grid, roman bust, glowing pink + cyan title
14. `saul-bass-minimal` — single torn-paper graphic on cream, two-pass screen print
15. `memphis-80s` — mint background, clashing terrazzo and zigzag patterns, chunky multicolor type
16. `editorial-fashion` — full-bleed studio portrait, tall serif masthead, vertical cover lines
17. `symmetric-storybook` — perfectly symmetric pastel diorama, mustard Futura, decorative deco border
18. `pop-art-comic` — Ben-Day dots, bold black ink outlines, comic speech burst
19. `pastel-mindful` — dusty rose to sage gouache wash, ceramic teacup, light serif typography
20. `sumi-e-zen` — rice paper, single bamboo brushstroke, vast negative space, vermilion hanko
21. `loteria-folk` — vibrant Mexican folk-art, papel-picado border, marigold + sapphire + cactus green
22. `surreal-dreamscape` — clear sky raining apples, floating doorway, painterly oil-on-canvas
23. `documentary-portrait` — Magnum-style B&W reportage portrait, harsh natural light, exhibition poster
24. `sports-action-hero` — stadium-night runner mid-stride, lens flares, stencil sans + tangerine
25. `album-cover-portrait` — 70s soul-funk vinyl cover, mustard band + serif title, warm tungsten light
26. `post-apoc-sword` — Korean AAA action-RPG key art, female warrior + glowing blade, ruined megacity
27. `lone-traveler-cargo` — melancholic sci-fi wanderer with cargo stack, Icelandic ash plain, golden particulate
28. `neon-noir-cyberpunk` — rain-soaked megacity, hologram billboards, anamorphic flares, cinematic 70mm
29. `streetwear-lookbook` — concrete studio backdrop, oversized cargo + hoodie, Tokyo-NYC editorial
30. `minimal-tech-keynote` — pure black, single floating product hero, ultra-thin lowercase sans, generous whitespace
31. `absurd-transit-map` — Vignelli subway diagram, coloured route lines, stations named after emotional states

## Generation Settings (locked)

```
endpoint:    https://fal.run/openai/gpt-image-2
image_size:  portrait_16_9
quality:     medium
num_images:  1 (per --n)
output:      png
```

For `luxury-real-estate` with a photo reference, use `https://fal.run/openai/gpt-image-2/edit` and pass the uploaded image URL (any S3/CDN URL works; the script handles upload via Kie if a Kie key is in `.env`).

## Rules

- **Anonymize** — don't put a real person's name or a known brand in the prompt unless the user explicitly asks. Use generic stand-ins (e.g. "Acme Holdings" not a real company).
- **Don't oversell calm styles** — for `pastel-mindful` and `sumi-e-zen`, restraint is the whole point. Don't load the prompt with extra elements.
- **Footer billing line** is always last — date · venue · price/credit.
- **Title rendering** — GPT Image 2 is strong on typography but not perfect. If a title has more than ~6 words, expect typos. Suggest shortening.
- **Variations** — when running `--n=3`, vary the subject slightly (different colour accent, different framing) rather than the same prompt 3×.

## Out of Scope

- **No PSD layering.** Direct the user to **Canva → Magic / Smart Layers** for foreground/background/text separation and editing.
- **No upscaling.** Output is whatever GPT Image 2 returns.
- **No animation.** This is a still-image skill.
