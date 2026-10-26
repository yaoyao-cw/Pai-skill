# Fantastic Posters

This project gives Claude Code a poster generator backed by 33 hand-tuned visual styles. Reads a brief, picks the matching style, fills the prompt template, and renders via OpenAI's GPT Image 2 (through Fal).

The skill itself lives at `.claude/skills/fantastic-posters/SKILL.md`. The generator is `generate.js` at the project root.

## Setup

1. Drop your Fal API key into `.env` at the project root:

   ```
   FAL_KEY=your_fal_key_here
   ```

   Optional: `KIE_KEY=...` enables hosted reference uploads. Without it, refs are passed inline as base64 data URIs.

2. Install Node.js 18+ if you don't have it.

3. Optional dependencies for advanced features:
   ```bash
   npm install pdfjs-dist canvas js-yaml
   ```
   - `pdfjs-dist` + `canvas` enable PDF brand-book auto-rendering.
   - `js-yaml` enables YAML structured briefs.

4. From a Claude Code session in this folder, ask: **"make a poster for [your brief]"**.

## Manual usage

```bash
node generate.js "boutique wellness retreat in the redwoods"
node generate.js "underground techno gig at the warehouse" --style=indie-gig-riso
node generate.js --brief=./briefs/launch.yaml
node generate.js --batch=./listings.json
node generate.js --template=./reference.png --refs=./new-photo.jpg "headline=NEW, subtitle=YORK"
node generate.js --list
```

## After generation

To split text, foreground and background for editing, open the PNG in **Canva** and run **Magic Layers / Smart Layers**. PSD-layering is available via the adjacent `poster-to-layers` pipeline if you want Photoshop-editable output instead.

## Style catalog

33 styles, each with a sample render in `examples/`. See `.claude/skills/fantastic-posters/SKILL.md` for full picker rules and per-style notes.
