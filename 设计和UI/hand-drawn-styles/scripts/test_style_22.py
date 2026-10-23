#!/usr/bin/env python3
"""Verify ink-transfer input roles and required preprocessing without generating images."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import render_prompt

ROOT = Path(__file__).resolve().parents[1]
ANCHOR_KEY = "assets/style-22/anchor-vermilion-ink-wash.png"


class Style22Tests(unittest.TestCase):
    def render_command(self, *arguments: str, environment: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, "-B", str(ROOT / "scripts/render_prompt.py"), *arguments],
            env=environment, capture_output=True, text=True, timeout=30,
        )

    def test_content_source_follows_style_anchor_and_preserves_preprocessing(self) -> None:
        source = render_prompt.hosted_images.resolve_image(ANCHOR_KEY)
        completed = self.render_command(
            "--style", "vermilion-ink-wash", "--subject", "原图人物扶着自行车", "--source-image", str(source),
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        payload = json.loads(completed.stdout)
        self.assertEqual(payload["style_id"], "22")
        self.assertEqual(payload["execution"]["mode"], "style-transfer")
        self.assertEqual([reference["role"] for reference in payload["references"]], ["style-only", "content-source"])
        self.assertEqual(payload["references"][1]["path"], str(source.resolve()))
        instructions = (ROOT / "docs/image-art-direction.md").read_text(encoding="utf-8")
        self.assertTrue(payload["preprocessing"]["required"])
        self.assertEqual(payload["preprocessing"]["instructions"], instructions)
        self.assertEqual(payload["preprocessing"]["sha256"], hashlib.sha256(instructions.encode()).hexdigest())
        self.assertIn("不加任何文字", payload["prompt"])
        self.assertIn("must_not_copy", payload["references"][0])

    def test_missing_content_source_is_not_replaced_with_style_anchor(self) -> None:
        completed = self.render_command("--style", "22", "--subject", "一只猫停在自行车旁")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        payload = json.loads(completed.stdout)
        self.assertEqual(payload["execution"]["mode"], "generate")
        self.assertIsNone(payload["inputs"]["source_image"])
        self.assertEqual([reference["role"] for reference in payload["references"]], ["style-only"])

    def test_text_requires_explicit_preview_and_preview_does_not_download(self) -> None:
        arguments = ("--style", "22", "--subject", "一只猫", "--format", "text")
        rejected = self.render_command(*arguments)
        self.assertNotEqual(rejected.returncode, 0)
        with tempfile.TemporaryDirectory() as empty_cache:
            environment = {**os.environ, "HAND_DRAWN_IMAGE_CACHE": empty_cache, "HAND_DRAWN_OFFLINE": "1"}
            preview = self.render_command(*arguments, "--text-only-preview", environment=environment)
            self.assertEqual(preview.returncode, 0, preview.stderr)
            self.assertIn("朱墨水墨漫画", preview.stdout)
            execution = self.render_command("--style", "22", "--subject", "一只猫", environment=environment)
            self.assertNotEqual(execution.returncode, 0)

    def test_source_image_is_scoped_and_missing_input_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "仅适用于"):
            render_prompt.validate_source_image("unused.png", "8")
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "内容原图不可用"):
                render_prompt.validate_source_image(str(Path(directory) / "missing.png"), "22")

    def test_missing_preprocessing_document_stops_payload(self) -> None:
        with tempfile.TemporaryDirectory() as directory, patch.object(render_prompt, "ROOT", Path(directory)):
            with self.assertRaises(OSError):
                render_prompt.build_payload("22", "a cat", {"主体": "a cat"}, None, [])


if __name__ == "__main__":
    unittest.main()
