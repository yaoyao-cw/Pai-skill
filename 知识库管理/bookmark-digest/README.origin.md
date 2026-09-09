# bookmark-digest

![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue)
![License MIT](https://img.shields.io/badge/license-MIT-green)

Turn X Bookmarks into an agent inbox.

Save a post once. Your agent can collect it, decide what to do, route it to a real consumer, validate a durable receipt artifact, and only then remove the bookmark.

[中文](README.zh.md)

## What you get

- Read X Bookmarks from a logged-in local Chrome/Chromium session through CDP.
- Extract top-level bookmarked posts without mistaking quoted posts for bookmarks.
- Stable tweet-ID candidate IDs, even if X changes the displayed author URL.
- Fail-closed collection: authentication, GraphQL, schema, response, and target-cleanup uncertainty is an error, not an empty inbox.
- Receipt-artifact gate: `commit` validates a durable JSON receipt before creating processed state.
- Optional processed-only unbookmark with top-level DOM matching and fresh per-tweet detail-page verification.
- `--dry-run` preview before account mutation.

## How it works

The original v1 (February 2026) was a batch digest. v2 changes the primitive: a bookmark is a human-to-agent task ingress.

```text
Bookmark
  ↓
collect (read-only, source health required)
  ↓
analyze / dedupe / route
  ↓
downstream consumer writes an accepted receipt artifact
  ↓
commit validates receipt + tweet identity
  ↓
unbookmark-processed --dry-run
  ↓
unbookmark + fresh per-tweet detail verification
```

If analysis, routing, receipt validation, source health, mutation, or readback verification fails, the bookmark is not claimed as completed.

## Setup

Requirements:

- Python 3.10+
- macOS or Linux
- Chrome/Chromium with remote debugging enabled
- An already logged-in X session in that dedicated browser profile
- `websocket-client`

Install:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Start a dedicated browser profile. macOS example:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.bookmark-digest-chrome"
```

Linux example (binary name varies by distribution):

```bash
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.bookmark-digest-chrome"
```

Log in to X in that browser once. Never copy cookies or session tokens into this repo.

## Quick start

### 1. Read bookmarks

```bash
python3 bookmark_digest.py collect --count 20
```

A successful response includes `health: "ok"`, candidate IDs, `processed_pending_removal`, `complete`, `truncated`, and `inbox_empty`. `inbox_empty: true` is only emitted when the source is healthy, the observed GraphQL pagination is complete, no unresolved/processed-pending items remain, and the result is not truncated.

### 2. Produce a durable consumer receipt

Your downstream consumer writes JSON like `receipt.example.json`:

```json
{
  "schema_version": "bookmark-digest.receipt.v1",
  "status": "accepted",
  "source_url": "https://x.com/example/status/123",
  "consumer": "research",
  "receipt_id": "research-123"
}
```

The tool validates schema, accepted status, non-empty consumer/receipt ID, and exact tweet identity. This validates the receipt artifact contract; it is not a cryptographic attestation of an external service.

### 3. Commit processed state

```bash
python3 bookmark_digest.py commit \
  --url https://x.com/example/status/123 \
  --consumer research \
  --receipt-file ./receipt.json
```

The tool copies the accepted receipt into a private state-adjacent `receipts/` store. State v2.3 records its ID/SHA-256 and an HMAC made with a separate private `.gate-key`; mutation re-validates the stored receipt and HMAC. Editing state+receipt without the gate key is inert. The local operator who can write the state directory and `.gate-key` is the trust boundary—this is corruption/accidental-forgery protection, not protection from the machine owner.

### 4. Preview mutation

```bash
python3 bookmark_digest.py unbookmark-processed --dry-run
```

### 5. Remove only processed bookmarks

Only after you explicitly authorize X bookmark mutation:

```bash
python3 bookmark_digest.py unbookmark-processed
```

A click is not counted as success by itself. After DOM confirmation, the command opens each target tweet in a fresh read-only CDP target and requires that exact primary tweet to expose `bookmark` rather than `removeBookmark`. Partial or unprovable removal exits non-zero.

## Consumer adapters

v0.2 deliberately does not force Notion, Linear, Slack, MCP, or a specific agent framework. Anything can be a consumer if it can emit the receipt contract above. The agent is responsible for deciding whether a bookmark is `no_action`, research, content, product work, or another real disposition before generating/accepting a receipt.

A scheduler-safe runner is included:

```bash
python3 scheduler_runner.py --consumer-command "python3 consumer.example.py"
```

The runner collects first, exits quietly on an empty healthy inbox, takes a non-blocking local lock to prevent overlapping runs, and passes a mode-`0600` temporary inbox JSON path to the consumer command. Every returned receipt must resolve to a tweet ID in that exact collected batch before any commit occurs. On normal completion the temporary inbox is deleted; an abrupt process kill can leave a mode-`0600` file for local cleanup. Account mutation stays **off by default**. When explicitly enabled, automatic unbookmark is scoped only to tweet IDs successfully committed in that same scheduler cycle. `consumer.example.py` is intentionally non-consuming and returns no accepted receipts; replace it with an audited consumer before enabling mutation. To opt into Inbox Zero after you have audited your consumer:

```bash
BOOKMARK_DIGEST_AUTO_UNBOOKMARK=1 \
python3 scheduler_runner.py --consumer-command "/path/to/your-consumer"
```

On macOS, `install_launchd.py` can generate a `~/Library/LaunchAgents/*.plist`. It defaults to a two-hour interval, verifies the launchd interpreter is Python 3.10+, validates that the consumer executable exists and has execute permission, and only writes the plist; loading/enabling it remains an explicit operator action.

## Privacy

This tool operates on a logged-in browser session. Treat the browser profile as sensitive.

- No cookies, tokens, or X credentials are stored in processed state.
- The repo does not ship a browser profile.
- Local processed state is written under `~/.local/state/bookmark-digest/` with file mode `0600`.
- Use a dedicated Chrome profile rather than your primary browser profile.
- `collect` prints bookmark text/metadata to stdout. Agent logs, terminal capture, and CI artifacts containing that output may therefore be sensitive.
- The scheduler captures consumer output in memory but never persists raw consumer stderr; launchd logs contain only bounded status/result metadata. Treat those logs as local operational data anyway.
- `unbookmark-processed` changes account-visible state. Keep mutation disabled unless you explicitly want Inbox Zero behavior.

## Verification

The private workflow was real-account tested on 2026-08-29. The public release candidate additionally has regression coverage for strict X URL identity, stored-receipt revalidation, quoted-status exclusion, processed-state authorization, GraphQL error/schema failure, and false-success prevention. A live read-only detail-page canary also verified the current X DOM returns `bookmark` for an unbookmarked target tweet.

Run tests:

```bash
python3 -m unittest -v test_bookmark_digest.py
```

Safe live smoke:

```bash
python3 bookmark_digest.py collect --count 5
python3 bookmark_digest.py unbookmark-processed --dry-run --count 5
```

## Troubleshooting

**`SourceHealthError` instead of an empty list**
This is intentional. Check that the CDP browser is running, X is logged in, and `https://x.com/i/bookmarks` loads in that profile. X web GraphQL/DOM changes can also trigger fail-closed behavior.

**`ReceiptError` on commit**
Check `schema_version`, `status: "accepted"`, `consumer`, `receipt_id`, and that `source_url` refers to the same tweet as `--url`.

**`verified: false` or exit code 3 after unbookmark**
The tool could not prove the target tweet is unbookmarked through a fresh detail-page readback. Keep the item for retry; do not treat it as completed.

**Large bookmark inboxes**
Collection currently uses X's web pagination triggered by browser scrolling, not a public X API. A trailing Bottom cursor makes `complete: false`; `--count` is capped at 200. Completeness is required before `inbox_empty: true` can be trusted. Receipt-gated mutation is intentionally verified per exact tweet detail page and does not rely on full-list pagination completeness.

**Exit codes**
`0` = successful read/commit/dry-run/verified mutation; `2` = source, receipt, schema, completeness, or other controlled CLI failure; `3` = mutation was attempted but could not be fully verified.

## Known limitations

- Depends on X's private web GraphQL and DOM; X can change either without notice.
- Requires a local logged-in Chrome/Chromium CDP session.
- Pagination is browser-scroll driven rather than a direct cursor/API client.
- Does not transcribe attached video or fully expand X Articles by itself.
- Receipt artifacts and the local gate HMAC prove the local contract/integrity boundary was satisfied; they do not cryptographically attest a third-party consumer or defend against the local machine owner.
- Account mutation uses the visible `removeBookmark` control rather than an official public API.

## Roadmap

- Pluggable consumer adapters and receipt verifier hooks.
- Article/media enrichment.
- Richer scheduler observability and retry/backoff controls.
- Better browser/profile discovery and health checks.
- Direct cursor pagination if it can be made robust without user credentials in config.

## Author

Built by [Leo / runesleo](https://github.com/runesleo?utm_source=github&utm_medium=referral&utm_content=bookmark-digest). More projects at [Leo Labs](https://leolabs.me/?utm_source=github&utm_medium=referral&utm_content=bookmark-digest).

## License

MIT
