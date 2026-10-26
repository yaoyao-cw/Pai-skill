#!/usr/bin/env python3
"""Check selection metadata and its isolation from generation; no visual assertions."""

from __future__ import annotations

import contextlib
import copy
import io
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


class StyleGuidanceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.payload = json.loads((ROOT / "catalog/style-guidance.json").read_text(encoding="utf-8"))
        self.workspace = tempfile.TemporaryDirectory(prefix="style-guidance-test-")
        self.addCleanup(self.workspace.cleanup)
        self.path = Path(self.workspace.name) / "guidance.json"

    def load_payload(self) -> dict:
        self.path.write_text(json.dumps(self.payload, ensure_ascii=False), encoding="utf-8")
        return render_prompt.load_style_guidance(self.path)

    def test_complete_catalog_preserves_legacy_fields_and_order(self) -> None:
        catalog = render_prompt.list_styles_with_guidance()
        self.assertEqual(len(catalog), 23)
        self.assertEqual([{key: value for key, value in style.items() if key != "guidance"} for style in catalog],
                         render_prompt.list_styles())
        self.assertEqual({style["style_id"] for style in catalog}, set(self.load_payload()))
        self.assertTrue(all(set(style) == {"style_id", "name", "aliases", "parameters", "references", "guidance"}
                            for style in catalog))

    def test_missing_or_unknown_style_is_rejected(self) -> None:
        del self.payload["styles"]["20"]
        with self.assertRaisesRegex(ValueError, "全部画风编号"):
            self.load_payload()
        self.payload["styles"]["99"] = copy.deepcopy(self.payload["styles"]["1"])
        with self.assertRaisesRegex(ValueError, "全部画风编号"):
            self.load_payload()

    def test_duplicate_style_id_and_malformed_json_are_rejected(self) -> None:
        for content in ('{"schema_version":1,"styles":{"1":{},"1":{}}}', '{broken', '[]', 'null'):
            with self.subTest(content=content):
                self.path.write_text(content, encoding="utf-8")
                with self.assertRaises(ValueError):
                    render_prompt.load_style_guidance(self.path)

    def test_schema_version_and_duplicated_canonical_fields_are_rejected(self) -> None:
        self.payload["schema_version"] = True
        with self.assertRaisesRegex(ValueError, "schema_version"):
            self.load_payload()
        self.payload["schema_version"] = 1
        self.payload["styles"]["1"]["name"] = "second source of truth"
        with self.assertRaisesRegex(ValueError, "字段必须"):
            self.load_payload()

    def test_related_styles_require_known_unique_other_ids(self) -> None:
        for target in ("99", "1", [], self.payload["styles"]["1"]["related_styles"][0]["style_id"]):
            with self.subTest(target=target):
                original = copy.deepcopy(self.payload)
                self.payload["styles"]["1"]["related_styles"][1]["style_id"] = target
                with self.assertRaisesRegex(ValueError, "相近画风编号"):
                    self.load_payload()
                self.payload = original

    def test_evidence_type_and_unsupported_approval_are_rejected(self) -> None:
        evidence = self.payload["styles"]["1"]["evidence"][0]
        evidence["type"] = "universally-verified"
        with self.assertRaisesRegex(ValueError, "证据类型"):
            self.load_payload()
        evidence["type"] = "user-approved"
        evidence["sources"] = []
        with self.assertRaisesRegex(ValueError, "来源必须"):
            self.load_payload()

    def test_recognition_and_comparison_require_recipe_sources(self) -> None:
        original = copy.deepcopy(self.payload)
        self.payload["styles"]["1"]["selection_cues"][0]["sources"][0]["section"] = "style:4"
        with self.assertRaisesRegex(ValueError, "自身配方章节"):
            self.load_payload()
        self.payload = original
        self.payload["styles"]["1"]["related_styles"][0]["sources"].pop()
        with self.assertRaisesRegex(ValueError, "两者的配方章节"):
            self.load_payload()

    def test_limitations_and_suggestions_keep_their_claim_types(self) -> None:
        self.payload["styles"]["1"]["limitations"][0]["kind"] = "automatic-recommendation"
        with self.assertRaisesRegex(ValueError, "限制必须区分"):
            self.load_payload()
        self.payload["styles"]["1"]["limitations"][0]["kind"] = "recipe-constraint"
        self.payload["styles"]["1"]["suitable_for"][0]["basis"] = "user-tested"
        with self.assertRaisesRegex(ValueError, "editorial-suggestion"):
            self.load_payload()

    def test_missing_runtime_document_or_section_is_rejected(self) -> None:
        source = self.payload["styles"]["1"]["suitable_for"][0]["sources"][0]
        source["document"] = "docs/missing.md"
        with self.assertRaisesRegex(ValueError, "来源不存在"):
            self.load_payload()
        source["document"] = "STYLES.md"
        source["section"] = "unrecorded heading"
        with self.assertRaisesRegex(ValueError, "来源章节不存在"):
            self.load_payload()

    def test_source_path_cannot_escape_repository(self) -> None:
        source = self.payload["styles"]["1"]["suitable_for"][0]["sources"][0]
        for path in ("../STYLES.md", "/tmp/outside.md"):
            with self.subTest(path=path):
                source["document"] = path
                with self.assertRaisesRegex(ValueError, "仓库内 Markdown 相对路径"):
                    self.load_payload()

    def test_empty_or_malformed_entry_fields_are_rejected(self) -> None:
        for field, value in (("evidence", []), ("selection_cues", "text"), ("limitations", [None])):
            with self.subTest(field=field):
                original = copy.deepcopy(self.payload)
                self.payload["styles"]["1"][field] = value
                with self.assertRaises(ValueError):
                    self.load_payload()
                self.payload = original

    def test_catalog_does_not_download_or_create_cache(self) -> None:
        cache = Path(self.workspace.name) / "empty-image-cache"
        completed = subprocess.run([sys.executable, "-B", str(ROOT / "scripts/render_prompt.py"), "--catalog"],
                                   env={**os.environ, "HAND_DRAWN_IMAGE_CACHE": str(cache), "HAND_DRAWN_OFFLINE": "1"},
                                   cwd=self.workspace.name, capture_output=True, text=True)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(len(json.loads(completed.stdout)), 23)
        self.assertFalse(cache.exists())

    def test_catalog_rejects_list_and_generation_arguments(self) -> None:
        options = (("--list",), ("--style", "20"), ("--subject", "child"), ("--text", "none"),
                   ("--title", "title"), ("--aspect", "3:4"), ("--var", "主体=child"),
                   ("--format", "auto"), ("--character-reference", "unused.png"), ("--text-only-preview",))
        for arguments in options:
            with self.subTest(arguments=arguments):
                completed = subprocess.run([sys.executable, "-B", str(ROOT / "scripts/render_prompt.py"),
                                            "--catalog", *arguments], capture_output=True, text=True)
                self.assertEqual(completed.returncode, 2)
                self.assertIn("--catalog 必须单独使用", completed.stderr)
                self.assertFalse(completed.stdout)

    def test_generation_and_legacy_list_never_read_guidance(self) -> None:
        for arguments in (["--list"], ["--style", "8", "--subject", "一只鸟", "--format", "json"]):
            with self.subTest(arguments=arguments):
                stdout = io.StringIO()
                with patch.object(render_prompt, "load_style_guidance", side_effect=AssertionError("unexpected metadata read")):
                    with patch.object(sys, "argv", ["render_prompt.py", *arguments]), contextlib.redirect_stdout(stdout):
                        self.assertEqual(render_prompt.main(), 0)
                output = json.loads(stdout.getvalue())
                self.assertNotIn("guidance", output if isinstance(output, dict) else output[0])

    def test_catalog_json_failure_is_reported_without_traceback(self) -> None:
        self.path.write_text("{invalid", encoding="utf-8")
        stderr = io.StringIO()
        with patch.object(render_prompt, "load_style_guidance", side_effect=json.JSONDecodeError("bad", "{", 0)):
            with patch.object(sys, "argv", ["render_prompt.py", "--catalog"]), contextlib.redirect_stderr(stderr):
                self.assertEqual(render_prompt.main(), 2)
        self.assertIn("render_prompt:", stderr.getvalue())
        self.assertNotIn("Traceback", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
