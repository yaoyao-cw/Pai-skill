# Changelog

All notable changes to this project are documented here.

## [0.2.0] - 2026-08-29

### Added
- X Bookmarks collection through a logged-in Chrome/Chromium CDP session.
- Top-level bookmark parsing that excludes quoted posts.
- Tweet-ID candidate identities exposed during collection.
- Durable `bookmark-digest.receipt.v1` validation plus a private canonical receipt store that is re-validated before mutation.
- Processed-only unbookmark preview with `--dry-run`.
- DOM confirmation plus fresh per-tweet detail-page bookmark-state verification before claiming removal success.
- Fail-closed source health for auth, GraphQL errors/schema drift, response parsing, pagination HTTP errors, and owned-target cleanup uncertainty.
- Agent-facing `SKILL.md`, bilingual README, tests, and independent Codex review record.
- Scheduler-safe `scheduler_runner.py` with a pluggable consumer command and account mutation disabled by default.
- Safe non-consuming `consumer.example.py` plus macOS `install_launchd.py` for opt-in periodic execution.

### Changed
- Reframed the original batch digest workflow into a receipt-gated agent inbox.
- Partial or uncertain unbookmark now exits non-zero.

## [0.1.0] - 2026-02-26

### Added
- Original private batch bookmark digest workflow: scrape, classify, draft actions.
