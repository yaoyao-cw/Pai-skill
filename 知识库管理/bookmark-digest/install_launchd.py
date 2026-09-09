#!/usr/bin/env python3
import argparse, os, plistlib, re, shlex, shutil, subprocess, sys
from pathlib import Path

if sys.version_info < (3, 10):
    raise SystemExit("bookmark-digest requires Python 3.10+")

ap = argparse.ArgumentParser(description="Install a macOS launchd job for bookmark-digest")
ap.add_argument("--consumer-command", required=True)
ap.add_argument("--interval", type=int, default=7200, help="seconds; default 2h")
ap.add_argument("--auto-unbookmark", action="store_true")
ap.add_argument("--label", default="me.leolabs.bookmark-digest")
args = ap.parse_args()
if args.interval < 60:
    raise SystemExit("--interval must be at least 60 seconds")
if not re.fullmatch(r"[A-Za-z0-9.-]+", args.label):
    raise SystemExit("--label may contain only letters, digits, dots, and hyphens")
consumer_parts = shlex.split(args.consumer_command)
if not consumer_parts:
    raise SystemExit("--consumer-command must not be empty")
consumer_executable = shutil.which(consumer_parts[0]) if not os.path.isabs(consumer_parts[0]) else consumer_parts[0]
if not consumer_executable or not Path(consumer_executable).is_file():
    raise SystemExit("consumer executable was not found")
if not os.access(consumer_executable, os.X_OK):
    raise SystemExit("consumer executable is not executable")
consumer_parts[0] = str(Path(consumer_executable).resolve())
args.consumer_command = shlex.join(consumer_parts)
python_requested = os.environ.get("PYTHON") or sys.executable
python_executable = shutil.which(python_requested) if not os.path.isabs(python_requested) else python_requested
if not python_executable or not Path(python_executable).is_file():
    raise SystemExit("Python executable was not found")

probe = subprocess.run([python_executable, "-c", "import sys; raise SystemExit(0 if sys.version_info >= (3,10) else 1)"], capture_output=True)
if probe.returncode != 0:
    raise SystemExit("launchd Python must be version 3.10+")
python_executable = str(Path(python_executable).resolve())
root = Path(__file__).resolve().parent
logs = Path.home() / ".local" / "state" / "bookmark-digest" / "logs"
logs.mkdir(parents=True, exist_ok=True)
plist_dir = Path.home() / "Library" / "LaunchAgents"
plist_dir.mkdir(parents=True, exist_ok=True)
plist_path = plist_dir / f"{args.label}.plist"
env = {"BOOKMARK_DIGEST_CONSUMER_CMD": args.consumer_command}
if args.auto_unbookmark:
    env["BOOKMARK_DIGEST_AUTO_UNBOOKMARK"] = "1"
payload = {
    "Label": args.label,
    "ProgramArguments": [python_executable, str(root / "scheduler_runner.py")],
    "WorkingDirectory": str(root),
    "StartInterval": args.interval,
    "RunAtLoad": False,
    "EnvironmentVariables": env,
    "StandardOutPath": str(logs / "scheduler.out.log"),
    "StandardErrorPath": str(logs / "scheduler.err.log"),
}
with plist_path.open("wb") as f:
    plistlib.dump(payload, f)
print(plist_path)
print("Install created the plist only. Load it explicitly with launchctl bootstrap when ready.")
