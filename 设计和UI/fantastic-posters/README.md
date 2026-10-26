# Fantastic Posters

A Claude Code skill that generates fantastic posters across **33 distinct visual styles** using OpenAI's GPT Image 2 (via Fal). Auto-picks the right style from your brief, builds a templated prompt, and renders. Now with multi-reference uploads, brand-book PDFs, structured briefs, batch generation, and template replication.

After generation, drop the PNG into **Canva → Magic / Smart Layers** to split foreground, background and text for editing.

## Quick start

```bash
git clone https://github.com/robonuggets/fantastic-posters
cd fantastic-posters
echo "FAL_KEY=your_fal_key_here" > .env
node generate.js --list
node generate.js "annual report cover for a green-energy holding company"
```

Then in Claude Code, in this folder, just say: **"make a poster for [brief]"**.

## What's new in v0.2

- **`--refs=hero.jpg,brand.pdf,logo.png`** — multi-reference uploads with auto-rendered PDF page 1
- **`--logo=<path>`** — base64 data URI logo embed, style-agnostic, "do not redraw" clause
- **`--brief=brief.{md,yaml}`** — structured client brief input
- **`--batch=listings.json`** — iterate many briefs sharing common refs
- **`--template=existing.png`** — replicate-template mode (copy layout, swap photo + text)
- **`--size=portrait|landscape|square|WxH`** + **`--quality=low|medium|high`**
- **`--palette="#hex,#hex,#hex"`** — strict-palette override
- Cost estimate + **`--yes`** confirmation. >=5 images or `--quality=high` always prompts.
- 2 new styles (**brutalist-broadcast**, **emerald-nocturne**) and `absurd-transit-map` flagged experimental.

## What's included

```
fantastic-posters/
├── .claude/skills/fantastic-posters/SKILL.md   # The skill — picker rules + style notes
├── styles.js                                   # 33 prompt templates + auto-picker
├── generate.js                                 # CLI: node generate.js "<brief>"
├── examples/                                   # One sample render per style (PNG)
├── CLAUDE.md
└── README.md
```

## The 33 styles

Each style ships with a reference render in `examples/<style-id>.png`. Show it to the user before generating — never regenerate the catalog.

| ID | Vibe | Example |
|---|---|---|
| `cinematic-neonoir` | Rainy Tokyo, neon, distressed serif | `examples/cinematic-neonoir.png` |
| `vintage-travel` | 1950s WPA flat-color | `examples/vintage-travel.png` |
| `swiss-minimal-typo` | One geometric shape, Helvetica stack | `examples/swiss-minimal-typo.png` |
| `tech-conf-darkmode` | Charcoal, chrome sculpture, monospace footer | `examples/tech-conf-darkmode.png` |
| `corporate-report` | Editorial photo, Didone serif, generous whitespace | `examples/corporate-report.png` |
| `indie-gig-riso` | Two-color risograph, hand-cut zine | `examples/indie-gig-riso.png` |
| `luxury-real-estate` | Photo top 2/3, forest-green serif (uses `--ref`) | `examples/luxury-real-estate.png` |
| `luxury-estate-cover` | Full-bleed dusk estate, magazine restraint | `examples/luxury-estate-cover.png` |
| `art-deco` | Gold sunburst on midnight, mirrored ornament | `examples/art-deco.png` |
| `bauhaus-geometric` | Primary shapes, lowercase sans, hairline rules | `examples/bauhaus-geometric.png` |
| `ukiyo-e` | Japanese woodblock, vertical kanji, hanko seal | `examples/ukiyo-e.png` |
| `psychedelic-60s` | Fillmore-era melting bubble lettering | `examples/psychedelic-60s.png` |
| `vaporwave-synth` | Sunset gradient, chrome floor grid, roman bust | `examples/vaporwave-synth.png` |
| `saul-bass-minimal` | Cut-paper graphic, two-pass screen print | `examples/saul-bass-minimal.png` |
| `memphis-80s` | Mint background, terrazzo and zigzag patterns | `examples/memphis-80s.png` |
| `editorial-fashion` | Full-bleed portrait, tall serif masthead | `examples/editorial-fashion.png` |
| `symmetric-storybook` | Pastel diorama, mustard Futura, deco border | `examples/symmetric-storybook.png` |
| `pop-art-comic` | Ben-Day dots, comic speech burst | `examples/pop-art-comic.png` |
| `pastel-mindful` | Dusty rose to sage gouache, ceramic teacup | `examples/pastel-mindful.png` |
| `sumi-e-zen` | Rice paper, single bamboo brushstroke | `examples/sumi-e-zen.png` |
| `loteria-folk` | Mexican folk-art, papel-picado border | `examples/loteria-folk.png` |
| `surreal-dreamscape` | Painterly oil, raining apples, floating doorway | `examples/surreal-dreamscape.png` |
| `documentary-portrait` | Magnum-style B&W reportage | `examples/documentary-portrait.png` |
| `sports-action-hero` | Stadium-night runner, lens flares, stencil sans | `examples/sports-action-hero.png` |
| `album-cover-portrait` | 70s soul-funk vinyl, mustard band + serif | `examples/album-cover-portrait.png` |
| `post-apoc-sword` | Korean action-RPG key art, female warrior | `examples/post-apoc-sword.png` |
| `lone-traveler-cargo` | Melancholic wanderer + cargo, Icelandic ash | `examples/lone-traveler-cargo.png` |
| `neon-noir-cyberpunk` | Rain-soaked megacity, hologram billboards | `examples/neon-noir-cyberpunk.png` |
| `streetwear-lookbook` | Concrete studio, oversized cargo + hoodie | `examples/streetwear-lookbook.png` |
| `minimal-tech-keynote` | Pure black, single floating product | `examples/minimal-tech-keynote.png` |
| `brutalist-broadcast` | Modular grid, jersey-number digit, duotone band | `examples/brutalist-broadcast.png` |
| `emerald-nocturne` | Velvet jewel-tone, brass + champagne, engraved caps | `examples/emerald-nocturne.png` |
| `absurd-transit-map` *(experimental)* | Vignelli subway diagram with mood-station names | `examples/absurd-transit-map.png` |

## Usage examples

```bash
# Auto-pick from keywords in the brief
node generate.js "Día de los Muertos community festival"

# Force a style + 3 variations
node generate.js "narrative game launch" --style=lone-traveler-cargo --n=3

# Multi-reference edit: hero photo + brand book PDF + logo
node generate.js "summer launch poster" \
  --refs=./hero.jpg,./brand-book.pdf,./logo.png \
  --quality=high

# Logo-anchored generation (any style)
node generate.js "open day, restaurant" \
  --style=emerald-nocturne \
  --logo=./client-logo.png

# Structured brief
node generate.js --brief=./briefs/forge-strength.yaml

# Bulk batch — array of distinct briefs sharing common refs
node generate.js --batch=./listings.json

# Replicate-template mode — copy an existing finished poster's layout
node generate.js --template=./template.png \
  --refs=./new-photo.jpg \
  "headline=New listing, subtitle=23 Oak Avenue"

# Strict palette override
node generate.js "executive briefing" \
  --style=corporate-report \
  --palette="#0E3B2E,#C9A96E,#FAFAF6"
```

## Reference image order (for `--refs`)

By convention, multi-reference uploads follow this order:

1. **Image 1 — hero photo** (the main subject)
2. **Image 2 — brand book** (PDF auto-renders to PNG page 1 at 2x DPI)
3. **Image 3+ — logos** (passed as additional refs or via `--logo`)

For `--template` mode the order is: template (1st) → new hero photo (2nd) → optional logos.

## Subagent fan-out (canonical bulk pattern)

For 10+ briefs, fan out via Claude's Agent tool — one subagent per brief, each running this skill independently:

```
Spawn N subagents. Each runs:
  fantastic-posters --brief=briefs/{client}.md --refs=hero.jpg,brand.pdf,logo.png
```

Subagents are how this skill produces real-client batches at speed.

## Settings

| Quality | $/image | Time | When to use |
|---|---|---|---|
| `low` | ~$0.011 | 10-15s | drafts, exploring directions |
| `medium` | ~$0.04 | 25-40s | client review |
| `high` | ~$0.17 | 60-90s | final delivery (then upscale externally) |

Default size is `portrait` (1024x1536). GPT Image 2 maxes out at 1536 on a side. For A2 print at 300 DPI you'll want to upscale externally (Topaz Photo AI, Real-ESRGAN).

GPT Image 2 is the strongest text-rendering model around — titles, billing blocks, masthead lockups all hold up. If a title runs more than ~6 words, expect typos; shorten and re-run.

## After you generate

1. Open the PNG in [Canva](https://canva.com).
2. Right-click → **Magic / Smart Layers** to split foreground, background and text.
3. Edit text or swap the subject without re-rendering.

PSD-layering is available via the adjacent `poster-to-layers` pipeline if you want Photoshop-editable output instead of Canva.

## Adding your own style

1. Open `styles.js`.
2. Add an entry to the `styles` object.
3. Add a row to the `PICK_RULES` array so auto-picker can find it.
4. Drop a reference render in `examples/<your-style-id>.png`.
5. Update the catalog table in `SKILL.md` and this README.

## License

MIT.
