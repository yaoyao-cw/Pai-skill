# Tinycharts

A Claude skill. Give it a process ("how a letter gets delivered", "a cat's day") and it draws an interactive, hand-drawn sheet in one of nine diagram types, with a real statechart behind it and buttons that follow it.

- `SKILL.md`: what Claude reads.
- `assets/`: the drawing kit, the page builder (`build.py`) and one example sheet per type.
- `references/`: one note per type, the sheet contract and the kit's functions.

Build with `--logic` to add **The logic** button under the sheet: the rules the check proved, and the statechart drawn as a flow chart (needs `pele` from npm; without it the rules still show).

Install: put this `tinycharts` folder in `~/.claude/skills/` (Claude Code) or upload `tinycharts.skill` in Claude.ai under Settings → Capabilities → Skills.

Free for personal and fun use; no resale. Commercial use needs the upgrade, Tinycharts Pro, at https://april-zhu.com/shop. See `LICENSE` and `NOTICE.md`.
