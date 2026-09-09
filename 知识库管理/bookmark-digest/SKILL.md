---
name: bookmark-digest
description: Turn a logged-in X bookmark list into a fail-closed agent inbox. Collect bookmarks, route them, validate a durable consumer receipt artifact, commit processed state, then optionally remove only processed bookmarks with fresh readback verification.
---

# Bookmark Digest v2

Use X Bookmarks as a lightweight human-to-agent inbox.

## Contract

1. `collect` is read-only and must fail closed if authentication, GraphQL/schema, response parsing, or owned-target cleanup is uncertain.
2. The agent decides what each bookmark means and routes actionable work to a real consumer.
3. `commit` is allowed only with a JSON receipt artifact using `bookmark-digest.receipt.v1`, `status: accepted`, a matching tweet URL, non-empty consumer, and non-empty receipt ID.
4. `commit` copies the accepted receipt into the private state-adjacent store and binds state v2.3 to it with an HMAC from a separate `.gate-key`. Mutation re-validates the stored artifact, SHA-256, consumer, receipt ID, tweet identity, and HMAC. The local state directory/gate-key owner is trusted.
5. `unbookmark-processed --dry-run` is the default preview before mutation.
6. Actual unbookmark may run only after the user has authorized X bookmark removal and the exact tweet is authorized by valid receipt-gated processed state. Mutation is verified per tweet on its detail page and does not depend on proving the full bookmark list is paginated to completion. DOM selectors only use nodes whose nearest tweet article is the current article; fresh detail verification must also match the final page tweet ID before `bookmark` can prove success.
7. Failed analysis, routing, receipt validation, source health, mutation, or readback leaves the item unresolved/retriable.

## Commands

```bash
python3 bookmark_digest.py collect --count 20
python3 bookmark_digest.py commit --url <x-status-url> --consumer <name> --receipt-file <receipt.json>
python3 bookmark_digest.py unbookmark-processed --dry-run
python3 bookmark_digest.py unbookmark-processed
```

The local state defaults to `~/.local/state/bookmark-digest/state.json`.

## Receipt

```json
{
  "schema_version": "bookmark-digest.receipt.v1",
  "status": "accepted",
  "source_url": "https://x.com/example/status/123",
  "consumer": "research",
  "receipt_id": "research-123"
}
```

## Agent loop

```text
collect
  → for each unresolved bookmark:
      read/deep-research if needed
      dedupe against existing work
      choose a real disposition/consumer
      obtain durable accepted receipt
      commit(url, consumer, receipt-file)
  → unbookmark-processed --dry-run
  → after explicit mutation authorization: unbookmark-processed
  → collect again and trust Inbox Zero only when health=ok, truncated=false,
    unresolved_count=0, and processed_pending_removal=[]
```

Do not treat “the model read it” or “the button was clicked” as completion.
