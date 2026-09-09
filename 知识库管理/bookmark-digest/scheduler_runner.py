#!/usr/bin/env python3
import argparse, fcntl, json, os, shlex, subprocess, sys, tempfile
from pathlib import Path

from bookmark_digest import tweet_id_from_url

ROOT = Path(__file__).resolve().parent
CLI = ROOT / "bookmark_digest.py"
STATE_DIR = Path.home() / ".local" / "state" / "bookmark-digest" / "scheduler"


def run_json(cmd):
    p = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError(f"child command failed with exit code {p.returncode}")
    lines = [x for x in p.stdout.splitlines() if x.strip()]
    if not lines:
        raise RuntimeError("command returned no JSON")
    return json.loads(lines[-1])


def acquire_lock():
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    lock_path = STATE_DIR / "runner.lock"
    handle = lock_path.open("a+")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        handle.close()
        return None
    return handle


def main():
    ap = argparse.ArgumentParser(description="Scheduler-safe bookmark-digest runner")
    ap.add_argument("--consumer-command", default=os.environ.get("BOOKMARK_DIGEST_CONSUMER_CMD", ""))
    ap.add_argument("--count", type=int, default=int(os.environ.get("BOOKMARK_DIGEST_COUNT", "20")))
    ap.add_argument("--auto-unbookmark", action="store_true", default=os.environ.get("BOOKMARK_DIGEST_AUTO_UNBOOKMARK") == "1")
    args = ap.parse_args()
    if not args.consumer_command:
        raise SystemExit("BOOKMARK_DIGEST_CONSUMER_CMD is required")

    lock_handle = acquire_lock()
    if lock_handle is None:
        print(json.dumps({"status": "busy", "reason": "another scheduler run holds the lock"}))
        return 0

    inbox_path = None
    try:
        inbox = run_json([sys.executable, str(CLI), "collect", "--count", str(args.count)])
        items = inbox.get("items") or []
        if not items:
            print(json.dumps({"status": "idle", "inbox_empty": inbox.get("inbox_empty", False)}))
            return 0

        fd, inbox_path = tempfile.mkstemp(prefix="inbox-", suffix=".json", dir=STATE_DIR)
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(inbox, handle, ensure_ascii=False, indent=2)
            handle.write("\n")

        cmd = shlex.split(args.consumer_command) + [inbox_path]
        p = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
        if p.returncode != 0:
            print(json.dumps({"status": "consumer_failed", "reason": "consumer_exit", "exit_code": p.returncode}))
            return 2
        lines = [x for x in p.stdout.splitlines() if x.strip()]
        if not lines:
            print(json.dumps({"status": "consumer_failed", "reason": "no manifest"}))
            return 2
        manifest = json.loads(lines[-1])
        receipts = manifest.get("receipts") or []
        current_ids = {str(item.get("id") or "") for item in items}
        validated_receipts = []
        for r in receipts:
            if not isinstance(r, dict):
                print(json.dumps({"status": "consumer_failed", "reason": "invalid_receipt_manifest"}))
                return 2
            receipt_file = r.get("receipt_file")
            url = r.get("source_url")
            consumer = r.get("consumer")
            if not (receipt_file and url and consumer):
                print(json.dumps({"status": "consumer_failed", "reason": "invalid_receipt_manifest"}))
                return 2
            try:
                tweet_id = tweet_id_from_url(str(url))
            except ValueError:
                print(json.dumps({"status": "consumer_failed", "reason": "receipt_url_invalid"}))
                return 2
            if tweet_id not in current_ids:
                print(json.dumps({"status": "consumer_failed", "reason": "receipt_not_in_current_inbox", "tweet_id": tweet_id}))
                return 2
            validated_receipts.append((str(receipt_file), str(url), str(consumer), tweet_id))
        committed = []
        committed_ids = []
        for receipt_file, url, consumer, tweet_id in validated_receipts:
            out = run_json([sys.executable, str(CLI), "commit", "--url", url, "--consumer", consumer, "--receipt-file", receipt_file])
            committed.append(out)
            committed_ids.append(tweet_id)

        removal = None
        if args.auto_unbookmark and committed_ids:
            command = [sys.executable, str(CLI), "unbookmark-processed", "--count", str(args.count)]
            for tweet_id in committed_ids:
                command.extend(["--tweet-id", tweet_id])
            removal = run_json(command)

        print(json.dumps({"status": "ok", "items": len(items), "committed": len(committed), "auto_unbookmark": args.auto_unbookmark, "removal": removal}, ensure_ascii=False))
        return 0
    finally:
        if inbox_path:
            try:
                Path(inbox_path).unlink(missing_ok=True)
            except OSError:
                pass
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_UN)
        lock_handle.close()


if __name__ == "__main__":
    raise SystemExit(main())
