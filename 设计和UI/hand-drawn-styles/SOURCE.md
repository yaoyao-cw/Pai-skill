# SOURCE

- Skill: `hand-drawn-styles` (SKILL.md name: `hand-drawn`)
- Upstream: https://github.com/threerocks/hand-drawn-styles
- Commit: 5a2f91fcbd32694a6caa9c7d09b2b3bad2666bc3 (2026-10-23 16:07 +0800, "feat: add shadow puppet style with DAAI inspiration credit")
- Saved: 2026-10-23 (America/New_York)
- Skill path: repo root (SKILL.md + PROTOCOL.md + STYLES.md + scripts/ + catalog/ + docs/)
- Category: 设计和UI
- Licence: MIT (LICENSE file present upstream, "Copyright (c) 2026 liulei"). Upstream README also credits inspiration to DAAI (@daaihq); keep that credit if redistributing.

Claude Code skill that wraps content in built-in hand-drawn style recipes (22 numbered styles plus the 3.1 stable variant, e.g. 儿童涂色 / 极简线条 / 蜡笔童涂 / 吉卜力 / 水墨 / 皮影) and outputs copy-ready image-generation prompts (or formal JSON call bundles with reference anchors). It does not generate images. Includes a Python renderer (`scripts/render_prompt.py`) and checker (`scripts/check_skill.py`).

Not the same repo as `handraw-style` (https://github.com/yang0/handraw-style, a 329-style prompt library already in Pai-skill). Both are hand-drawn prompt generators but from different authors with different contents.

Layout:
- GitHub: full upstream tree loose (50 files) + this SOURCE.md. No zip.
- Drive (185 and 477): the same 50 files loose in the same folder layout + this SOURCE.md + `hand-drawn-styles-upstream-5a2f91f.zip` (the 50 upstream files, without SOURCE.md). Nothing skipped.
- Reference images are not in the repo; upstream hosts them publicly via `assets/image-manifest.json` and downloads them on first use (needs network). Only small provenance/privacy JSON files sit under `assets/`.
