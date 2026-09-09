#!/usr/bin/env python3
"""Turn X bookmarks into a receipt-gated agent inbox.

Collection is read-only. Account mutation is explicit and is only attempted for
bookmarks backed by a validated durable receipt artifact in local processed
state. Collection and mutation fail closed when X source health is uncertain.
"""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import hmac
import json
import re
import secrets
import time
import urllib.parse
import urllib.request
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

try:
    import websocket
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Install websocket-client: pip install -r requirements.txt") from exc

DEFAULT_CDP_CANDIDATES = ("http://127.0.0.1:9222", "http://127.0.0.1:9333")
DEFAULT_CDP = None
BOOKMARKS_URL = "https://x.com/i/bookmarks"
DEFAULT_STATE = Path.home() / ".local/state/bookmark-digest/state.json"
RECEIPT_SCHEMA = "bookmark-digest.receipt.v1"
STATE_VERSION = "2.3"
GATE_KEY_FILE = ".gate-key"
ALLOWED_X_HOSTS = {"x.com", "www.x.com", "twitter.com", "www.twitter.com"}
ALLOWED_INSTRUCTION_TYPES = {"TimelineAddEntries", "TimelineReplaceEntry"}
ALLOWED_TWEET_TYPES = {"Tweet"}


class BookmarkDigestError(RuntimeError):
    """Base fail-closed error for source, receipt, or mutation problems."""


class SourceHealthError(BookmarkDigestError):
    pass


class ReceiptError(BookmarkDigestError):
    pass


def canonical_json(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def tweet_id_from_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url.strip())
    if parsed.scheme != "https" or (parsed.hostname or "").lower() not in ALLOWED_X_HOSTS:
        raise ValueError("expected an https://x.com/.../status/<tweet_id> URL")
    if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.params:
        raise ValueError("X status URL must not contain userinfo, query, fragment, or params")
    try:
        if parsed.port not in (None, 443):
            raise ValueError("X status URL must use the default HTTPS port")
    except ValueError as exc:
        raise ValueError("invalid X status URL port") from exc
    match = re.fullmatch(r"/(?:i/web|[^/]+)/status/([0-9]+)/?", parsed.path, flags=re.ASCII)
    if not match:
        raise ValueError("expected an exact X status URL ending in /status/<ASCII tweet_id>")
    return match.group(1)


def candidate_id_from_tweet_id(tweet_id: str) -> str:
    if not re.fullmatch(r"[0-9]+", str(tweet_id), flags=re.ASCII):
        raise ValueError("tweet_id must contain ASCII digits only")
    digest = hashlib.sha256(canonical_json({"identity": f"tweet:{tweet_id}"})).hexdigest()
    return f"sig_{digest[:24]}"


def candidate_id(url: str) -> str:
    return candidate_id_from_tweet_id(tweet_id_from_url(url))


def read_state(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except FileNotFoundError:
        return {}


def write_state(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(canonical_json(value))
    tmp.chmod(0o600)
    tmp.replace(path)


@contextmanager
def state_lock(path: Path) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_suffix(path.suffix + ".lock")
    handle = lock_path.open("a+")
    lock_path.chmod(0o600)
    fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
    try:
        yield
    finally:
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


def gate_key_path(state_path: Path) -> Path:
    return state_path.parent / GATE_KEY_FILE


def load_gate_key(state_path: Path, *, create: bool = False) -> bytes:
    key_path = gate_key_path(state_path)
    if not key_path.exists():
        if not create:
            raise ReceiptError("mutation gate key is missing")
        key_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with key_path.open("xb") as handle:
                handle.write(secrets.token_bytes(32))
        except FileExistsError:
            pass
        key_path.chmod(0o600)
    key = key_path.read_bytes()
    if len(key) != 32:
        raise ReceiptError("mutation gate key is invalid")
    return key


def gate_payload(entry: dict[str, Any]) -> dict[str, str]:
    return {
        "status": str(entry.get("status") or ""),
        "tweet_id": str(entry.get("tweet_id") or ""),
        "source_url": str(entry.get("source_url") or ""),
        "consumer": str(entry.get("consumer") or ""),
        "receipt_id": str(entry.get("receipt_id") or ""),
        "receipt_sha256": str(entry.get("receipt_sha256") or ""),
        "receipt_file": str(entry.get("receipt_file") or ""),
    }


def gate_mac(key: bytes, entry: dict[str, Any]) -> str:
    return hmac.new(key, canonical_json(gate_payload(entry)), hashlib.sha256).hexdigest()


def validate_receipt(receipt_path: Path, source_url: str, consumer: str) -> dict[str, Any]:
    consumer = consumer.strip()
    if not consumer:
        raise ReceiptError("consumer must be non-empty")
    if not receipt_path.is_file():
        raise ReceiptError("receipt file does not exist")
    if receipt_path.stat().st_size > 1_000_000:
        raise ReceiptError("receipt file exceeds 1 MB")
    try:
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ReceiptError(f"invalid receipt JSON: {exc}") from exc
    if not isinstance(receipt, dict) or receipt.get("schema_version") != RECEIPT_SCHEMA:
        raise ReceiptError(f"receipt schema_version must be {RECEIPT_SCHEMA}")
    if receipt.get("status") != "accepted":
        raise ReceiptError("receipt status must be accepted")
    receipt_id = str(receipt.get("receipt_id") or "").strip()
    receipt_consumer = str(receipt.get("consumer") or "").strip()
    receipt_url = str(receipt.get("source_url") or "").strip()
    if not receipt_id:
        raise ReceiptError("receipt_id must be non-empty")
    if receipt_consumer != consumer:
        raise ReceiptError("receipt consumer does not match --consumer")
    try:
        expected_id = tweet_id_from_url(source_url)
        receipt_tweet_id = tweet_id_from_url(receipt_url)
    except ValueError as exc:
        raise ReceiptError(str(exc)) from exc
    if receipt_tweet_id != expected_id:
        raise ReceiptError("receipt source_url does not match --url tweet ID")
    return {
        "receipt_id": receipt_id,
        "consumer": consumer,
        "tweet_id": expected_id,
        "sha256": hashlib.sha256(receipt_path.read_bytes()).hexdigest(),
    }


def mark_processed(path: Path, url: str, consumer: str, receipt_path: Path) -> str:
    proof = validate_receipt(receipt_path, url, consumer)
    cid = candidate_id_from_tweet_id(proof["tweet_id"])
    with state_lock(path):
        receipt_store = path.parent / "receipts"
        receipt_store.mkdir(parents=True, exist_ok=True)
        stored_receipt = receipt_store / f"{cid}.json"
        stored_receipt.write_bytes(canonical_json(json.loads(receipt_path.read_text(encoding="utf-8"))))
        stored_receipt.chmod(0o600)
        stored_proof = validate_receipt(stored_receipt, url, consumer)
        state = read_state(path)
        processed = state.setdefault("processed", {})
        if not isinstance(processed, dict):
            processed = {}
            state["processed"] = processed
        entry = {
            "status": "processed",
            "tweet_id": stored_proof["tweet_id"],
            "source_url": url,
            "consumer": stored_proof["consumer"],
            "receipt_id": stored_proof["receipt_id"],
            "receipt_sha256": stored_proof["sha256"],
            "receipt_file": f"receipts/{cid}.json",
            "processed_at": time.time(),
        }
        entry["gate_mac"] = gate_mac(load_gate_key(path, create=True), entry)
        processed[cid] = entry
        state["version"] = STATE_VERSION
        write_state(path, state)
    return cid


def mark_removed(path: Path, tweet_ids: list[str]) -> list[str]:
    ids = sorted({str(value) for value in tweet_ids if str(value).isdigit()})
    if not ids:
        return []
    with state_lock(path):
        state = read_state(path)
        if state.get("version") != STATE_VERSION:
            raise ReceiptError("state version does not match current mutation contract")
        processed = state.get("processed")
        if not isinstance(processed, dict):
            raise ReceiptError("processed state is missing")
        key = load_gate_key(path)
        changed: list[str] = []
        now = time.time()
        for tweet_id in ids:
            cid = candidate_id_from_tweet_id(tweet_id)
            entry = processed.get(cid)
            if not isinstance(entry, dict) or entry.get("status") != "processed":
                continue
            if str(entry.get("tweet_id") or "") != tweet_id:
                continue
            source_url = str(entry.get("source_url") or "")
            consumer = str(entry.get("consumer") or "").strip()
            receipt_file = str(entry.get("receipt_file") or "")
            if not consumer or receipt_file != f"receipts/{cid}.json":
                continue
            proof = validate_receipt(path.parent / receipt_file, source_url, consumer)
            if proof["tweet_id"] != tweet_id or proof["receipt_id"] != entry.get("receipt_id") or proof["sha256"] != entry.get("receipt_sha256"):
                continue
            if not hmac.compare_digest(gate_mac(key, entry), str(entry.get("gate_mac") or "")):
                continue
            entry["status"] = "removed"
            entry["removed_at"] = now
            entry["gate_mac"] = gate_mac(key, entry)
            changed.append(tweet_id)
        if changed:
            write_state(path, state)
        return changed


def _http_json(url: str, method: str = "GET") -> Any:
    request = urllib.request.Request(url, method=method)
    with urllib.request.urlopen(request, timeout=8) as response:
        return json.load(response)


def _close_target(cdp: str, target_id: str) -> bool:
    for method in ("PUT", "GET"):
        try:
            request = urllib.request.Request(f"{cdp}/json/close/{target_id}", method=method)
            with urllib.request.urlopen(request, timeout=5) as response:
                response.read()
            break
        except Exception:
            continue
    for _ in range(20):
        try:
            if not any(row.get("id") == target_id for row in _http_json(f"{cdp}/json/list")):
                return True
        except Exception:
            pass
        time.sleep(0.2)
    return False


@contextmanager
def owned_cdp_target(cdp: str, timeout: int = 20) -> Iterator[Any]:
    created = _http_json(f"{cdp}/json/new?{urllib.parse.quote('about:blank', safe='')}", method="PUT")
    target_id = str(created["id"])
    connection = None
    try:
        connection = websocket.create_connection(created["webSocketDebuggerUrl"], timeout=timeout, origin=cdp)
        yield target_id, connection
    finally:
        if connection is not None:
            try:
                connection.close()
            except Exception:
                pass
        if not _close_target(cdp, target_id):
            raise SourceHealthError(f"owned target cleanup failed: {target_id}")


def _tweet_result(entry: dict[str, Any]) -> dict[str, Any] | None:
    content = entry.get("content")
    item = content.get("itemContent") if isinstance(content, dict) else None
    results = item.get("tweet_results") if isinstance(item, dict) else None
    result = results.get("result") if isinstance(results, dict) else None
    if not isinstance(result, dict):
        return None
    typename = result.get("__typename")
    if not typename:
        raise SourceHealthError("Bookmarks GraphQL tweet typename missing")
    if typename == "TweetWithVisibilityResults":
        if not isinstance(result.get("tweet"), dict):
            return None
        result = result["tweet"]
        typename = result.get("__typename")
        if not typename:
            raise SourceHealthError("Bookmarks GraphQL wrapped tweet typename missing")
    if typename not in ALLOWED_TWEET_TYPES:
        raise SourceHealthError(f"Bookmarks GraphQL tweet typename not recognized: {typename}")
    return result


def _screen_name(result: dict[str, Any]) -> str:
    core = result.get("core")
    user_results = core.get("user_results") if isinstance(core, dict) else None
    user = user_results.get("result") if isinstance(user_results, dict) else None
    legacy = user.get("legacy") if isinstance(user, dict) else None
    return str(legacy.get("screen_name")) if isinstance(legacy, dict) and legacy.get("screen_name") else "i/web"


def parse_bookmark_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    if payload.get("errors"):
        raise SourceHealthError("Bookmarks GraphQL returned errors")
    data = payload.get("data")
    timeline = data.get("bookmark_timeline_v2") if isinstance(data, dict) else None
    timeline = timeline.get("timeline") if isinstance(timeline, dict) else None
    instructions = timeline.get("instructions") if isinstance(timeline, dict) else None
    if not isinstance(instructions, list):
        raise SourceHealthError("Bookmarks GraphQL schema not recognized")
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for instruction in instructions:
        if not isinstance(instruction, dict):
            raise SourceHealthError("Bookmarks GraphQL instruction is not an object")
        instruction_type = instruction.get("type")
        if not instruction_type:
            raise SourceHealthError("Bookmarks GraphQL instruction type missing")
        if instruction_type not in ALLOWED_INSTRUCTION_TYPES:
            raise SourceHealthError(f"Bookmarks GraphQL instruction type not recognized: {instruction_type}")
        entries = instruction.get("entries")
        if entries is None:
            raise SourceHealthError("Bookmarks GraphQL instruction shape not recognized")
        if not isinstance(entries, list):
            raise SourceHealthError("Bookmarks GraphQL entries are not a list")
        for entry in entries:
            if not isinstance(entry, dict):
                raise SourceHealthError("Bookmarks GraphQL entry is not an object")
            content = entry.get("content")
            if not isinstance(content, dict):
                raise SourceHealthError("Bookmarks GraphQL entry content missing")
            entry_type = str(content.get("entryType") or "")
            if not entry_type:
                raise SourceHealthError("Bookmarks GraphQL entryType missing")
            if entry_type == "TimelineTimelineCursor":
                if content.get("cursorType") not in {"Top", "Bottom"}:
                    raise SourceHealthError("Bookmarks GraphQL cursorType not recognized")
                continue
            if entry_type != "TimelineTimelineItem":
                raise SourceHealthError(f"Bookmarks GraphQL entryType not recognized: {entry_type}")
            if content.get("cursorType") is not None:
                raise SourceHealthError("Bookmarks GraphQL tweet item unexpectedly contains cursorType")
            result = _tweet_result(entry)
            if not isinstance(result, dict):
                raise SourceHealthError("Bookmarks GraphQL tweet entry shape changed")
            legacy = result.get("legacy")
            tweet_id = str(result.get("rest_id") or "")
            if not re.fullmatch(r"[0-9]+", tweet_id, flags=re.ASCII) or not isinstance(legacy, dict):
                raise SourceHealthError("Bookmarks GraphQL tweet payload incomplete")
            if tweet_id in seen:
                continue
            author = _screen_name(result)
            text = str(legacy.get("full_text") or "").strip()
            if not text:
                raise SourceHealthError("Bookmarks GraphQL tweet text missing")
            rows.append({
                "id": tweet_id,
                "candidate_id": candidate_id_from_tweet_id(tweet_id),
                "url": f"https://x.com/{author}/status/{tweet_id}",
                "author": author,
                "text": text,
                "created_at": legacy.get("created_at"),
                "likes": legacy.get("favorite_count", 0),
                "retweets": legacy.get("retweet_count", 0),
                "replies": legacy.get("reply_count", 0),
            })
            seen.add(tweet_id)
    return rows


def collect(cdp: str, count: int = 50) -> dict[str, Any]:
    count = max(1, min(200, count))
    with owned_cdp_target(cdp) as (_target_id, connection):
        responses: dict[str, dict[str, Any]] = {}
        sequence = 0

        def record(message: dict[str, Any]) -> None:
            if message.get("method") != "Network.responseReceived":
                return
            params = message.get("params", {})
            response = params.get("response", {})
            url = str(response.get("url") or "")
            if "/Bookmarks?" in url:
                responses[str(params.get("requestId"))] = {
                    "url": url,
                    "status": int(response.get("status") or 0),
                }

        def call(method: str, params: dict[str, Any] | None = None, timeout: float = 25) -> dict[str, Any]:
            nonlocal sequence
            sequence += 1
            current = sequence
            connection.send(json.dumps({"id": current, "method": method, "params": params or {}}))
            deadline = time.time() + timeout
            while time.time() < deadline:
                message = json.loads(connection.recv())
                record(message)
                if message.get("id") == current:
                    if "error" in message:
                        raise SourceHealthError(str(message["error"]))
                    return message.get("result", {})
            raise SourceHealthError(f"CDP timeout: {method}")

        def evaluate(expression: str) -> Any:
            return call("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True}).get("result", {}).get("value")

        call("Network.enable")
        call("Page.enable")
        call("Runtime.enable")
        call("Page.navigate", {"url": BOOKMARKS_URL})
        state: dict[str, Any] = {}
        for _ in range(50):
            time.sleep(0.2)
            state = evaluate("({ready:document.readyState,url:location.href,n:document.querySelectorAll('article[data-testid=\"tweet\"]').length,w:innerWidth,h:innerHeight})") or {}
            page_url = str(state.get("url") or "")
            if "/login" in page_url or "/i/flow/login" in page_url:
                raise SourceHealthError("X session is not authenticated")
            if any(meta["status"] == 200 for meta in responses.values()):
                break
        good_responses = [request_id for request_id, meta in responses.items() if meta["status"] == 200]
        if not good_responses:
            statuses = sorted({meta["status"] for meta in responses.values()})
            raise SourceHealthError(f"no successful Bookmarks GraphQL response; statuses={statuses}")

        previous, stagnant = -1, 0
        while state.get("n", 0) > 0 and stagnant < 6:
            call("Input.dispatchMouseEvent", {
                "type": "mouseWheel",
                "x": int((state.get("w") or 1400) * 0.65),
                "y": int((state.get("h") or 900) * 0.75),
                "deltaX": 0,
                "deltaY": 1200,
            })
            time.sleep(0.7)
            state = evaluate("({n:document.querySelectorAll('article[data-testid=\"tweet\"]').length,w:innerWidth,h:innerHeight})") or {}
            now = len([meta for meta in responses.values() if meta["status"] == 200])
            stagnant = stagnant + 1 if now == previous else 0
            previous = now
            if now > len(good_responses):
                good_responses = [request_id for request_id, meta in responses.items() if meta["status"] == 200]

        items: list[dict[str, Any]] = []
        ids: set[str] = set()
        parsed_requests: set[str] = set()
        last_has_bottom = False
        stable_rounds = 0
        while stable_rounds < 2:
            bad_statuses = sorted({meta["status"] for meta in responses.values() if meta["status"] != 200})
            if bad_statuses:
                raise SourceHealthError(f"Bookmarks pagination returned non-200 status: {bad_statuses}")
            pending_responses = [request_id for request_id, meta in responses.items() if meta["status"] == 200 and request_id not in parsed_requests]
            if pending_responses:
                stable_rounds = 0
                for request_id in pending_responses:
                    try:
                        body = call("Network.getResponseBody", {"requestId": request_id}).get("body", "")
                        payload = json.loads(body)
                    except (json.JSONDecodeError, KeyError, TypeError) as exc:
                        raise SourceHealthError(f"could not read Bookmarks GraphQL response: {exc}") from exc
                    instructions = payload.get("data", {}).get("bookmark_timeline_v2", {}).get("timeline", {}).get("instructions", []) if isinstance(payload, dict) else []
                    last_has_bottom = any(
                        isinstance(entry, dict)
                        and isinstance(entry.get("content"), dict)
                        and (entry["content"].get("cursorType") == "Bottom")
                        for instruction in instructions if isinstance(instruction, dict)
                        for entry in instruction.get("entries", []) if isinstance(instruction.get("entries"), list)
                    )
                    for row in parse_bookmark_payload(payload):
                        if row["id"] not in ids:
                            items.append(row)
                            ids.add(row["id"])
                    parsed_requests.add(request_id)
            before = len(responses)
            time.sleep(0.15)
            evaluate("0")
            stable_rounds = stable_rounds + 1 if len(responses) == before else 0
        bad_statuses = sorted({meta["status"] for meta in responses.values() if meta["status"] != 200})
        if bad_statuses:
            raise SourceHealthError(f"Bookmarks pagination returned non-200 status: {bad_statuses}")
        unparsed_good = [request_id for request_id, meta in responses.items() if meta["status"] == 200 and request_id not in parsed_requests]
        if unparsed_good:
            raise SourceHealthError("Bookmarks responses arrived after final parse")
        complete = not last_has_bottom
        truncated = len(items) > count or not complete
        return {
            "health": "ok",
            "items": items[:count],
            "collected_count": min(len(items), count),
            "graphql_pages": len(parsed_requests),
            "complete": complete,
            "truncated": truncated,
        }


def processed_state_tweet_ids(state_path: Path) -> list[str]:
    with state_lock(state_path):
        state = read_state(state_path)
        if state.get("version") != STATE_VERSION:
            return []
        try:
            key = load_gate_key(state_path)
        except (ReceiptError, OSError):
            return []
        processed = state.get("processed", {})
        if not isinstance(processed, dict):
            return []
        allowed: list[str] = []
        for cid, entry in processed.items():
            if not isinstance(cid, str) or not isinstance(entry, dict):
                continue
            tweet_id = str(entry.get("tweet_id") or "")
            if not tweet_id.isdigit() or candidate_id_from_tweet_id(tweet_id) != cid:
                continue
            source_url = str(entry.get("source_url") or "")
            consumer = str(entry.get("consumer") or "").strip()
            receipt_file = str(entry.get("receipt_file") or "")
            if entry.get("status") != "processed" or not consumer or receipt_file != f"receipts/{cid}.json":
                continue
            stored_receipt = state_path.parent / receipt_file
            try:
                proof = validate_receipt(stored_receipt, source_url, consumer)
            except (ReceiptError, OSError, ValueError):
                continue
            if proof["tweet_id"] != tweet_id or proof["receipt_id"] != entry.get("receipt_id"):
                continue
            if proof["sha256"] != entry.get("receipt_sha256"):
                continue
            expected_mac = gate_mac(key, entry)
            if not hmac.compare_digest(expected_mac, str(entry.get("gate_mac") or "")):
                continue
            allowed.append(tweet_id)
        return sorted(set(allowed))


def processed_tweet_ids(items: list[dict[str, Any]], state_path: Path) -> list[str]:
    visible = {str(item.get("id") or "") for item in items}
    return [tweet_id for tweet_id in processed_state_tweet_ids(state_path) if tweet_id in visible]


def visible_top_level_ids_expression() -> str:
    return "[...document.querySelectorAll('article[data-testid=\\\"tweet\\\"]')].map(a=>{const hs=[...a.querySelectorAll('time')].filter(t=>t.closest('article[data-testid=\\\"tweet\\\"]')===a).map(t=>t.closest('a[href*=\\\"/status/\\\"]')).filter(Boolean);if(hs.length!==1)return null;const m=(hs[0].href||'').match(/status\\/([0-9]+)(?:[/?#]|$)/);return m?m[1]:null}).filter(Boolean)"


def click_top_level_bookmark_expression(tweet_id: str) -> str:
    if not tweet_id.isdigit():
        raise ValueError("tweet_id must contain digits only")
    return f"(()=>{{const a=[...document.querySelectorAll('article[data-testid=\\\"tweet\\\"]')].find(x=>{{const hs=[...x.querySelectorAll('time')].filter(t=>t.closest('article[data-testid=\\\"tweet\\\"]')===x).map(t=>t.closest('a[href*=\\\"/status/\\\"]')).filter(Boolean);if(hs.length!==1)return false;const m=(hs[0].href||'').match(/status\\/([0-9]+)(?:[/?#]|$)/);return m&&m[1]===\\\"{tweet_id}\\\"}});if(!a)return false;const bs=[...a.querySelectorAll('[data-testid=\\\"removeBookmark\\\"]')].filter(v=>v.closest('article[data-testid=\\\"tweet\\\"]')===a);if(bs.length!==1)return false;bs[0].click();return true}})()"


def top_level_bookmark_state_expression(tweet_id: str) -> str:
    if not tweet_id.isdigit():
        raise ValueError("tweet_id must contain digits only")
    return f"(()=>{{const a=[...document.querySelectorAll('article[data-testid=\\\"tweet\\\"]')].find(x=>{{const hs=[...x.querySelectorAll('time')].filter(t=>t.closest('article[data-testid=\\\"tweet\\\"]')===x).map(t=>t.closest('a[href*=\\\"/status/\\\"]')).filter(Boolean);if(hs.length!==1)return false;const m=(hs[0].href||'').match(/status\\/([0-9]+)(?:[/?#]|$)/);return m&&m[1]===\\\"{tweet_id}\\\"}});if(!a)return null;const bs=[...a.querySelectorAll('[data-testid=\\\"removeBookmark\\\"]')].filter(v=>v.closest('article[data-testid=\\\"tweet\\\"]')===a);if(bs.length!==1)return null;return true}})()"


def detail_bookmark_state_expression(tweet_id: str) -> str:
    if not tweet_id.isdigit():
        raise ValueError("tweet_id must contain digits only")
    target = json.dumps(tweet_id)
    return "(()=>{const page=(location.href.match(/status\\/([0-9]+)(?:[/?#]|$)/)||[])[1]||null;const arts=[...document.querySelectorAll('article[data-testid=\\\"tweet\\\"]')].filter(x=>{const hs=[...x.querySelectorAll('time')].filter(t=>t.closest('article[data-testid=\\\"tweet\\\"]')===x).map(t=>t.closest('a[href*=\\\"/status/\\\"]')).filter(Boolean);if(hs.length!==1)return false;const m=(hs[0].href||'').match(/status\\/([0-9]+)(?:[/?#]|$)/);return m&&m[1]===" + target + "});if(page!==" + target + "||arts.length!==1)return {pageId:page,ambiguous:true,remove:false,add:false};const a=arts[0];const own=s=>[...a.querySelectorAll(s)].filter(v=>v.closest('article[data-testid=\\\"tweet\\\"]')===a).filter(v=>{const r=v.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight});const rem=own('[data-testid=\\\"removeBookmark\\\"]');const add=own('[data-testid=\\\"bookmark\\\"]');return {pageId:page,ambiguous:(rem.length+add.length)!==1,remove:rem.length===1,add:add.length===1}})()"


def click_detail_unbookmark_expression(tweet_id: str) -> str:
    if not tweet_id.isdigit():
        raise ValueError("tweet_id must contain digits only")
    target = json.dumps(tweet_id)
    return "(()=>{const page=(location.href.match(/status\\/([0-9]+)(?:[/?#]|$)/)||[])[1]||null;if(page!==" + target + ")return false;const arts=[...document.querySelectorAll('article[data-testid=\\\"tweet\\\"]')].filter(x=>{const hs=[...x.querySelectorAll('time')].filter(t=>t.closest('article[data-testid=\\\"tweet\\\"]')===x).map(t=>t.closest('a[href*=\\\"/status/\\\"]')).filter(Boolean);if(hs.length!==1)return false;const m=(hs[0].href||'').match(/status\\/([0-9]+)(?:[/?#]|$)/);return m&&m[1]===" + target + "});if(arts.length!==1)return false;const a=arts[0];const visible=v=>{const r=v.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight};const rem=[...a.querySelectorAll('[data-testid=\\\"removeBookmark\\\"]')].filter(v=>v.closest('article[data-testid=\\\"tweet\\\"]')===a&&visible(v));const add=[...a.querySelectorAll('[data-testid=\\\"bookmark\\\"]')].filter(v=>v.closest('article[data-testid=\\\"tweet\\\"]')===a&&visible(v));if(rem.length!==1||add.length!==0)return false;rem[0].click();return true})()"


def unbookmark(cdp: str, tweet_ids: list[str], verify_count: int = 200) -> dict[str, Any]:
    pending = {str(value) for value in tweet_ids if str(value).isdigit()}
    requested = len(pending)
    if not pending:
        return {"requested": 0, "removed": 0, "removed_ids": [], "failed": [], "verified": True}
    clicked_ids: list[str] = []
    with owned_cdp_target(cdp, timeout=12) as (_target_id, connection):
        sequence = 0

        def call(method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
            nonlocal sequence
            sequence += 1
            current = sequence
            connection.send(json.dumps({"id": current, "method": method, "params": params or {}}))
            deadline = time.time() + 12
            while time.time() < deadline:
                message = json.loads(connection.recv())
                if message.get("id") == current:
                    if "error" in message:
                        raise SourceHealthError(str(message["error"]))
                    return message.get("result", {})
            raise SourceHealthError(f"CDP timeout: {method}")

        def evaluate(expression: str) -> Any:
            return call("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True}).get("result", {}).get("value")

        call("Page.enable")
        call("Runtime.enable")
        call("Page.navigate", {"url": BOOKMARKS_URL})
        time.sleep(1.2)
        stagnant = 0
        while pending and stagnant < 12:
            visible = set(evaluate(visible_top_level_ids_expression()) or [])
            touched = False
            for tweet_id in list(pending):
                if tweet_id not in visible:
                    continue
                if not evaluate(click_top_level_bookmark_expression(tweet_id)):
                    continue
                confirmed = False
                for _ in range(15):
                    time.sleep(0.2)
                    state = evaluate(top_level_bookmark_state_expression(tweet_id))
                    if state is None or state is False:
                        confirmed = True
                        break
                if confirmed:
                    clicked_ids.append(tweet_id)
                    pending.remove(tweet_id)
                    touched = True
            if pending:
                call("Input.dispatchMouseEvent", {"type": "mouseWheel", "x": 900, "y": 700, "deltaX": 0, "deltaY": 1100})
                time.sleep(0.5)
            stagnant = 0 if touched else stagnant + 1

    detail_verification = verify_unbookmarked_tweets(cdp, clicked_ids)
    return verify_removal_result(tweet_ids, clicked_ids, pending, detail_verification)


def unbookmark_direct(cdp: str, tweet_ids: list[str]) -> dict[str, Any]:
    requested_ids = sorted({str(value) for value in tweet_ids if str(value).isdigit()})
    if not requested_ids:
        return {"requested": 0, "removed": 0, "removed_ids": [], "failed": [], "verified": True}
    candidates_for_oracle: list[str] = []
    failed: set[str] = set()
    for tweet_id in requested_ids:
        try:
            with owned_cdp_target(cdp, timeout=12) as (_target_id, connection):
                sequence = 0

                def call(method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
                    nonlocal sequence
                    sequence += 1
                    current = sequence
                    connection.send(json.dumps({"id": current, "method": method, "params": params or {}}))
                    deadline = time.time() + 12
                    while time.time() < deadline:
                        message = json.loads(connection.recv())
                        if message.get("id") == current:
                            if "error" in message:
                                raise SourceHealthError(str(message["error"]))
                            return message.get("result", {})
                    raise SourceHealthError(f"CDP timeout: {method}")

                def evaluate(expression: str) -> Any:
                    return call("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True}).get("result", {}).get("value")

                call("Page.enable")
                call("Runtime.enable")
                call("Page.navigate", {"url": f"https://x.com/i/web/status/{tweet_id}"})
                state: dict[str, Any] | None = None
                for _ in range(50):
                    time.sleep(0.2)
                    value = evaluate(detail_bookmark_state_expression(tweet_id))
                    if isinstance(value, dict) and value.get("pageId") == tweet_id and not value.get("ambiguous"):
                        state = value
                        break
                if state is None:
                    raise SourceHealthError(f"could not resolve unique bookmark control for tweet {tweet_id}")
                if state.get("add") is True and state.get("remove") is False:
                    candidates_for_oracle.append(tweet_id)
                    continue
                if not (state.get("remove") is True and state.get("add") is False):
                    raise SourceHealthError(f"bookmark state is not uniquely actionable for tweet {tweet_id}")
                if evaluate(click_detail_unbookmark_expression(tweet_id)) is not True:
                    raise SourceHealthError(f"unbookmark click was not accepted for tweet {tweet_id}")
                confirmed = False
                for _ in range(20):
                    time.sleep(0.2)
                    value = evaluate(detail_bookmark_state_expression(tweet_id))
                    if isinstance(value, dict) and value.get("pageId") == tweet_id and not value.get("ambiguous") and value.get("add") is True and value.get("remove") is False:
                        confirmed = True
                        break
                if not confirmed:
                    raise SourceHealthError(f"same-page unbookmark oracle failed for tweet {tweet_id}")
                candidates_for_oracle.append(tweet_id)
        except (SourceHealthError, OSError, ValueError, KeyError, TypeError):
            failed.add(tweet_id)
    detail_verification = verify_unbookmarked_tweets(cdp, candidates_for_oracle)
    verified_removed = sorted(tweet_id for tweet_id in candidates_for_oracle if detail_verification.get(tweet_id) is True)
    failed.update(set(requested_ids) - set(verified_removed))
    return {"requested": len(requested_ids), "removed": len(verified_removed), "removed_ids": verified_removed, "failed": sorted(failed), "verified": not failed}


def verify_unbookmarked_tweets(cdp: str, tweet_ids: list[str]) -> dict[str, bool]:
    results: dict[str, bool] = {}
    for tweet_id in tweet_ids:
        if not tweet_id.isdigit():
            results[tweet_id] = False
            continue
        with owned_cdp_target(cdp, timeout=12) as (_target_id, connection):
            sequence = 0

            def call(method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
                nonlocal sequence
                sequence += 1
                current = sequence
                connection.send(json.dumps({"id": current, "method": method, "params": params or {}}))
                deadline = time.time() + 12
                while time.time() < deadline:
                    message = json.loads(connection.recv())
                    if message.get("id") == current:
                        if "error" in message:
                            raise SourceHealthError(str(message["error"]))
                        return message.get("result", {})
                raise SourceHealthError(f"CDP timeout: {method}")

            def evaluate(expression: str) -> Any:
                return call("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True}).get("result", {}).get("value")

            call("Page.enable")
            call("Runtime.enable")
            call("Page.navigate", {"url": f"https://x.com/i/web/status/{tweet_id}"})
            verified: bool | None = None
            for _ in range(50):
                time.sleep(0.2)
                state = evaluate(detail_bookmark_state_expression(tweet_id))
                if isinstance(state, dict):
                    if state.get("pageId") != tweet_id or state.get("ambiguous"):
                        continue
                    if state.get("remove"):
                        verified = False
                        break
                    if state.get("add"):
                        verified = True
                        break
            if verified is None:
                raise SourceHealthError(f"could not verify bookmark state for tweet {tweet_id}")
            results[tweet_id] = verified
    return results


def verify_removal_result(
    requested_ids: list[str],
    clicked_ids: list[str],
    pending: set[str],
    detail_verification: dict[str, bool],
) -> dict[str, Any]:
    verified_removed = [tweet_id for tweet_id in clicked_ids if detail_verification.get(tweet_id) is True]
    failed = sorted((set(requested_ids) - set(verified_removed)) | set(pending))
    return {
        "requested": len({str(value) for value in requested_ids if str(value).isdigit()}),
        "removed": len(verified_removed),
        "removed_ids": sorted(verified_removed),
        "failed": failed,
        "verified": not failed,
    }


def collect_cli_payload(cdp: str, state_path: Path, count: int) -> dict[str, Any]:
    result = collect(cdp, count)
    processed_ids = set(processed_tweet_ids(result["items"], state_path))
    unresolved = [item for item in result["items"] if item["id"] not in processed_ids]
    return {
        "health": result["health"],
        "items": unresolved,
        "processed_pending_removal": sorted(processed_ids),
        "collected_count": result["collected_count"],
        "unresolved_count": len(unresolved),
        "graphql_pages": result["graphql_pages"],
        "complete": result["complete"],
        "truncated": result["truncated"],
        "inbox_empty": not unresolved and not processed_ids and result["complete"] and not result["truncated"],
    }


def resolve_cdp(explicit: str | None) -> str:
    if explicit:
        return explicit.rstrip("/")
    errors: list[str] = []
    for candidate in DEFAULT_CDP_CANDIDATES:
        try:
            with urllib.request.urlopen(candidate + "/json/version", timeout=1.5) as response:
                if response.status == 200:
                    return candidate
        except Exception as exc:
            errors.append(f"{candidate}: {type(exc).__name__}")
    raise RuntimeError("No Chrome CDP endpoint found; tried " + ", ".join(errors))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cdp", default=DEFAULT_CDP)
    parser.add_argument("--state", type=Path, default=DEFAULT_STATE)
    sub = parser.add_subparsers(dest="command", required=True)
    collect_parser = sub.add_parser("collect")
    collect_parser.add_argument("--count", type=int, default=50)
    commit_parser = sub.add_parser("commit")
    commit_parser.add_argument("--url", required=True)
    commit_parser.add_argument("--consumer", required=True)
    commit_parser.add_argument("--receipt-file", type=Path, required=True)
    unbookmark_parser = sub.add_parser("unbookmark-processed")
    unbookmark_parser.add_argument("--count", type=int, default=100)
    unbookmark_parser.add_argument("--dry-run", action="store_true")
    unbookmark_parser.add_argument("--tweet-id", action="append", default=[])
    args = parser.parse_args()
    try:
        if args.command == "commit":
            cid = mark_processed(args.state, args.url, args.consumer, args.receipt_file)
            print(json.dumps({"candidate_id": cid, "status": "processed"}, ensure_ascii=False))
            return 0
        if args.command == "unbookmark-processed" and args.dry_run:
            allowed = processed_state_tweet_ids(args.state)
            if args.tweet_id:
                requested = {str(value) for value in args.tweet_id if str(value).isdigit()}
                if len(requested) != len(args.tweet_id):
                    raise ReceiptError("--tweet-id must contain ASCII digits only")
                allowed = [tweet_id for tweet_id in allowed if tweet_id in requested]
            allowed = allowed[:max(1, min(200, args.count))]
            print(json.dumps({"dry_run": True, "would_remove": allowed, "count": len(allowed)}, ensure_ascii=False))
            return 0
        cdp = resolve_cdp(args.cdp).rstrip("/")
        if args.command == "collect":
            print(json.dumps(collect_cli_payload(cdp, args.state, args.count), ensure_ascii=False))
            return 0
        allowed = processed_state_tweet_ids(args.state)
        if args.tweet_id:
            requested = {str(value) for value in args.tweet_id if str(value).isdigit()}
            if len(requested) != len(args.tweet_id):
                raise ReceiptError("--tweet-id must contain ASCII digits only")
            allowed = [tweet_id for tweet_id in allowed if tweet_id in requested]
        allowed = allowed[:max(1, min(200, args.count))]
        result = unbookmark_direct(cdp, allowed)
        removed_state = mark_removed(args.state, result.get("removed_ids", []))
        result["state_marked_removed"] = removed_state
        result["state_verified"] = sorted(removed_state) == sorted(result.get("removed_ids", []))
        print(json.dumps(result, ensure_ascii=False))
        return 0 if result["verified"] and result["state_verified"] else 3
    except Exception as exc:
        print(json.dumps({"success": False, "error": type(exc).__name__, "message": str(exc)}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
