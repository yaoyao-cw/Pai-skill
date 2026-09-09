# brands-design-md

> Documentation: [English](./README.md) · [中文](./README.zh-CN.md)

> Quick links: [Preview examples](#preview-examples) · [How to use](#how-to-use) · [What is DESIGN.md?](#what-is-designmd) · [Directory structure](#directory-structure) · [Included brands](#included-brands) · [Sources](#sources-and-attribution)

An open-source collection of brand design references, including `DESIGN.md` files, interactive previews, and website screenshots.

The library is built for designers, frontend developers, and anyone using AI-assisted design or coding tools. Use it to quickly understand a brand’s color palette, typography, spacing, component patterns, and overall visual character before designing or building an interface.

## Preview examples

The composite below highlights three examples from the collection. Use the links beneath it to open each brand’s `preview.html`—a browser-based overview of its design tokens, typography, colors, components, and visual direction.

![Preview](./public/preview.jpg)

| Cal.com | Caldera | Duolingo |
| --- | --- | --- |
| [Preview](./brands/cal/preview.html) | [Preview](./brands/caldera/preview.html) | [Preview](./brands/duolingo/preview.html) |

## How to use

1. Choose a brand directory under `brands/`.
2. Start with the screenshot and `preview.html` to get a quick feel for the brand.
3. Read `DESIGN.md` for a structured breakdown of its colors, typography, spacing, components, and layout rhythm.
4. When you are ready to build, use `tokens.json`, `variables.css`, and `theme.css` as implementation references.

## What is DESIGN.md?

`DESIGN.md` is a portable design brief written in Markdown. It captures the visual language of a brand or product in a structured format that works equally well as human-readable documentation and context for AI design or coding tools.

A typical `DESIGN.md` includes:

- The brand’s overall visual direction, tone, and character
- Colors, font families, font sizes, line heights, and letter spacing
- Spacing, corner radii, grids, and content-width rules
- Visual descriptions of common components such as buttons, cards, navigation, and forms
- Practical guidance on what to preserve—and what to avoid

`DESIGN.md` is not an official brand guideline or a substitute for the source website. Think of it as a practical starting point: detailed enough to guide design and implementation, but compact enough to reuse across tools and workflows.

## Directory structure

Each brand lives in its own directory:

```text
brands/
└── <brand>/
    ├── DESIGN.md             # Brand design reference
    ├── preview.html          # Browser-ready visual preview
    ├── cover_<domain>.webp   # Screenshot cover of the brand website
    ├── favicon.*             # Website icon, where available
    ├── tokens.json           # Structured design tokens
    ├── variables.css         # CSS custom properties
    └── theme.css             # Reusable theme styles

registry.json                 # Brand index and metadata
```

Some brands may not include every optional asset listed above. Check the individual brand directory for what is available.

## Included brands

The repository currently includes **69** brands. Choose **Open preview** to explore a brand’s visual reference in your browser.

| # | Brand | Website | Preview |
| ---: | --- | --- | --- |
| 1 | Airbnb | [Official site](https://www.airbnb.com/) | [Open preview](./brands/airbnb/preview.html) |
| 2 | Airtable | [Official site](https://www.airtable.com/) | [Open preview](./brands/airtable/preview.html) |
| 3 | Apple | [Official site](https://www.apple.com/) | [Open preview](./brands/apple/preview.html) |
| 4 | Binance | [Official site](https://www.binance.com/) | [Open preview](./brands/binance/preview.html) |
| 5 | BMW | [Official site](https://www.bmw.com/) | [Open preview](./brands/bmw/preview.html) |
| 6 | BMW-M | [Official site](https://www.bmw-m.com/) | [Open preview](./brands/bmw-m/preview.html) |
| 7 | Bugatti | [Official site](https://www.bugatti.com/) | [Open preview](./brands/bugatti/preview.html) |
| 8 | Cal.com | [Official site](https://cal.com/) | [Open preview](./brands/cal/preview.html) |
| 9 | Caldera | [Official site](https://caldera.xyz/) | [Open preview](./brands/caldera/preview.html) |
| 10 | Claude | [Official site](https://claude.ai/) | [Open preview](./brands/claude/preview.html) |
| 11 | Clay | [Official site](https://www.clay.com/) | [Open preview](./brands/clay/preview.html) |
| 12 | ClickHouse | [Official site](https://clickhouse.com/) | [Open preview](./brands/clickhouse/preview.html) |
| 13 | Cohere | [Official site](https://cohere.com/) | [Open preview](./brands/cohere/preview.html) |
| 14 | Composio | [Official site](https://composio.dev/) | [Open preview](./brands/composio/preview.html) |
| 15 | Cursor | [Official site](https://www.cursor.com/) | [Open preview](./brands/cursor/preview.html) |
| 16 | Duolingo | [Official site](https://www.duolingo.com/) | [Open preview](./brands/duolingo/preview.html) |
| 17 | ElevenLabs | [Official site](https://elevenlabs.io/) | [Open preview](./brands/elevenlabs/preview.html) |
| 18 | Expo | [Official site](https://expo.dev/) | [Open preview](./brands/expo/preview.html) |
| 19 | Figma | [Official site](https://www.figma.com/) | [Open preview](./brands/figma/preview.html) |
| 20 | Framer | [Official site](https://www.framer.com/) | [Open preview](./brands/framer/preview.html) |
| 21 | HashiCorp | [Official site](https://www.hashicorp.com/) | [Open preview](./brands/hashicorp/preview.html) |
| 22 | IBM | [Official site](https://www.ibm.com/) | [Open preview](./brands/ibm/preview.html) |
| 23 | Intercom | [Official site](https://www.intercom.com/) | [Open preview](./brands/intercom/preview.html) |
| 24 | Kraken | [Official site](https://www.kraken.com/) | [Open preview](./brands/kraken/preview.html) |
| 25 | Lamborghini | [Official site](https://www.lamborghini.com/) | [Open preview](./brands/lamborghini/preview.html) |
| 26 | Linear | [Official site](https://linear.app/) | [Open preview](./brands/linear.app/preview.html) |
| 27 | Lovable | [Official site](https://lovable.dev/) | [Open preview](./brands/lovable/preview.html) |
| 28 | Mastercard | [Official site](https://www.mastercard.com/) | [Open preview](./brands/mastercard/preview.html) |
| 29 | Mintlify | [Official site](https://www.mintlify.com/) | [Open preview](./brands/mintlify/preview.html) |
| 30 | Mistral-AI | [Official site](https://mistral.ai/) | [Open preview](./brands/mistral.ai/preview.html) |
| 31 | MongoDB | [Official site](https://www.mongodb.com/) | [Open preview](./brands/mongodb/preview.html) |
| 32 | Nike | [Official site](https://www.nike.com/) | [Open preview](./brands/nike/preview.html) |
| 33 | Notion | [Official site](https://www.notion.com/) | [Open preview](./brands/notion/preview.html) |
| 34 | NVIDIA | [Official site](https://www.nvidia.com/) | [Open preview](./brands/nvidia/preview.html) |
| 35 | Ollama | [Official site](https://ollama.com/) | [Open preview](./brands/ollama/preview.html) |
| 36 | OpenCode | [Official site](https://opencode.ai/) | [Open preview](./brands/opencode.ai/preview.html) |
| 37 | Pinterest | [Official site](https://www.pinterest.com/) | [Open preview](./brands/pinterest/preview.html) |
| 38 | PlayStation | [Official site](https://www.playstation.com/) | [Open preview](./brands/playstation/preview.html) |
| 39 | PostHog | [Official site](https://posthog.com/) | [Open preview](./brands/posthog/preview.html) |
| 40 | Raycast | [Official site](https://www.raycast.com/) | [Open preview](./brands/raycast/preview.html) |
| 41 | Renault | [Official site](https://www.renault.com/) | [Open preview](./brands/renault/preview.html) |
| 42 | Replicate | [Official site](https://replicate.com/) | [Open preview](./brands/replicate/preview.html) |
| 43 | Resend | [Official site](https://resend.com/) | [Open preview](./brands/resend/preview.html) |
| 44 | Revolut | [Official site](https://www.revolut.com/) | [Open preview](./brands/revolut/preview.html) |
| 45 | Runway | [Official site](https://runwayml.com/) | [Open preview](./brands/runwayml/preview.html) |
| 46 | Sanity | [Official site](https://www.sanity.io/) | [Open preview](./brands/sanity/preview.html) |
| 47 | Sentri-Inspired | [Official site](https://sentry.io/) | [Open preview](./brands/sentry/preview.html) |
| 48 | Shopifi-Inspired | [Official site](https://www.shopify.com/) | [Open preview](./brands/shopify/preview.html) |
| 49 | Slacc-Inspired | [Official site](https://slack.com/) | [Open preview](./brands/slack/preview.html) |
| 50 | Spacex-Inspired | [Official site](https://www.spacex.com/) | [Open preview](./brands/spacex/preview.html) |
| 51 | Spotify | [Official site](https://www.spotify.com/) | [Open preview](./brands/spotify/preview.html) |
| 52 | Starbucks | [Official site](https://www.starbucks.com/) | [Open preview](./brands/starbucks/preview.html) |
| 53 | Stripi-Inspired | [Official site](https://stripe.com/) | [Open preview](./brands/stripe/preview.html) |
| 54 | Supabaze-Inspired | [Official site](https://supabase.com/) | [Open preview](./brands/supabase/preview.html) |
| 55 | Superhumon-Inspired | [Official site](https://superhuman.com/) | [Open preview](./brands/superhuman/preview.html) |
| 56 | Tesla | [Official site](https://www.tesla.com/) | [Open preview](./brands/tesla/preview.html) |
| 57 | The Verge | [Official site](https://www.theverge.com/) | [Open preview](./brands/theverge/preview.html) |
| 58 | Together-AI-Inspired | [Official site](https://www.together.ai/) | [Open preview](./brands/together.ai/preview.html) |
| 59 | Uber-Inspired | [Official site](https://www.uber.com/) | [Open preview](./brands/uber/preview.html) |
| 60 | Vercel | [Official site](https://vercel.com/) | [Open preview](./brands/vercel/preview.html) |
| 61 | Vercel Dark | [Official site](https://vercel.com/) | [Open preview](./brands/vercel-dark/preview.html) |
| 62 | Vodafone-Inspired | [Official site](https://www.vodafone.com/) | [Open preview](./brands/vodafone/preview.html) |
| 63 | Voltagent-Inspired | [Official site](https://voltagent.dev/) | [Open preview](./brands/voltagent/preview.html) |
| 64 | Warp-Inspired | [Official site](https://www.warp.dev/) | [Open preview](./brands/warp/preview.html) |
| 65 | Webflow-Inspired | [Official site](https://webflow.com/) | [Open preview](./brands/webflow/preview.html) |
| 66 | Wired-Inspired | [Official site](https://www.wired.com/) | [Open preview](./brands/wired/preview.html) |
| 67 | Wise-Inspired | [Official site](https://wise.com/) | [Open preview](./brands/wise/preview.html) |
| 68 | SpaceXAI | [Official site](https://x.ai/) | [Open preview](./brands/x.ai/preview.html) |
| 69 | Zapier-Inspired | [Official site](https://zapier.com/) | [Open preview](./brands/zapier/preview.html) |

## Preview and screenshots

Each brand can include two visual companions to the written documentation:

- `preview.html` turns the documented design rules into a browsable reference page, making the palette, type hierarchy, components, and overall direction easier to understand at a glance.
- `cover_<domain>.webp` is a screenshot of the source website. It makes brands easier to identify and provides a visual point of comparison for the documentation and preview.

Together, they make the collection faster to scan and compare, so you can decide whether a visual direction fits your project before reading the full document.

## Sources and attribution

I created and curated the design documents, preview pages, screenshots, and supporting files in this repository, then reviewed them against each brand’s public-facing design language.

The research and documentation process also draws on public design references, including:

- [getdesign.md](https://getdesign.md/)
- [Refero Styles](https://styles.refero.design/)

Each brand’s public website remains the primary reference for its current visual identity. This repository is an independent, unofficial resource based on publicly available material; it is not affiliated with, authorized by, or endorsed by any of the featured brands.

## Disclaimer

Brand names, trademarks, and related visual assets belong to their respective owners. This repository is provided for learning, research, and design reference only. Inclusion does not imply authorization, partnership, affiliation, or endorsement.
