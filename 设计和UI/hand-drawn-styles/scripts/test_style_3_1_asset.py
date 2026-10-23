#!/usr/bin/env python3
"""Exercise evidence gates with synthetic files; these tests make no visual claim."""

from __future__ import annotations

import copy
import hashlib
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib
from pathlib import Path

import render_prompt
import validate_style_3_1_asset as validator


ROOT = Path(__file__).resolve().parents[1]


class Style31AcceptanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        values = {"主体": "妈妈和孩子一起看书", "文字": "不加任何文字"}
        cls.bundle_template = render_prompt.build_payload(
            "3.1", render_prompt.render(render_prompt.extract_template("3.1"), values, "3:4"),
            values, "3:4", [],
        )

    def setUp(self) -> None:
        self.workspace = tempfile.TemporaryDirectory(prefix="style31-evidence-test-")
        self.addCleanup(self.workspace.cleanup)
        self.root = Path(self.workspace.name)
        for name in ("bundle", "run", "review", "images", "elsewhere"):
            (self.root / name).mkdir()
        self.bundle_path = self.root / "bundle/bundle.json"
        self.run_path = self.root / "run/run.json"
        self.review_path = self.root / "review/review.json"
        self.bundle = copy.deepcopy(self.bundle_template)
        self.outputs = [self.write_png(f"stage-{index}.png", index) for index in range(3)]
        character = self.write_png("character.png", 8)
        self.bundle["references"].append({
            "path": "../images/character.png", "role": "character",
            "required_for": "every image containing this recurring character",
            "must_not_replace": "the style-only reference",
        })
        anchor = Path(self.bundle["references"][0]["path"])
        self.run_record = {"stages": []}
        for index, definition in enumerate(self.bundle["workflow"]["stages"][:3]):
            input_paths = [anchor, character] if index == 0 else [self.outputs[index - 1], anchor]
            prompt = self.bundle["prompt"] if index == 0 else definition["prompt"]
            self.run_record["stages"].append({
                "stage_id": definition["id"],
                "prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
                "inputs": [self.file_record(path) for path in input_paths],
                "output": self.file_record(self.outputs[index]),
            })
        self.review = {
            "final_image_sha256": validator.sha256_file(self.outputs[-1]),
            "reviewer": {"kind": "agent", "id": "synthetic-test-fixture"},
            "reviewed_at": "2026-10-16T12:00:00+08:00",
            "checks": {dimension: {"status": "pass", "observation": "Synthetic evidence test only; not a visual review."}
                       for dimension in render_prompt.STYLE_3_1_REVIEW_DIMENSIONS},
        }
        self.save_records()

    def write_png(self, name: str, red: int) -> Path:
        def chunk(kind: bytes, content: bytes) -> bytes:
            return struct.pack(">I", len(content)) + kind + content + struct.pack(">I", zlib.crc32(kind + content) & 0xFFFFFFFF)
        path = self.root / "images" / name
        path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
                         + chunk(b"IDAT", zlib.compress(b"\x00" + bytes((red, 255, 255)))) + chunk(b"IEND", b""))
        return path

    def file_record(self, path: Path) -> dict[str, str]:
        return {"path": os.path.relpath(path.resolve(), self.run_path.parent.resolve()), "sha256": validator.sha256_file(path)}

    def save_records(self) -> None:
        self.bundle_path.write_text(json.dumps(self.bundle, ensure_ascii=False), encoding="utf-8")
        digest = validator.sha256_file(self.bundle_path)
        self.run_record["bundle_sha256"] = digest
        self.review["bundle_sha256"] = digest
        self.run_path.write_text(json.dumps(self.run_record), encoding="utf-8")
        self.review_path.write_text(json.dumps(self.review), encoding="utf-8")

    def report(self) -> dict:
        return validator.build_validation_report(self.bundle_path, self.run_path, self.review_path)

    def assert_not_final(self, expected_status: str | None = None) -> dict:
        report = self.report()
        self.assertNotEqual(report["status"], "pass", report)
        self.assertNotIn("output_status", report)
        if expected_status:
            self.assertEqual(report["status"], expected_status, report)
        return report

    def test_complete_evidence_passes_without_implying_user_acceptance(self) -> None:
        report = self.report()
        self.assertEqual(report["status"], "pass", report)
        self.assertEqual(report["output_status"], "final")
        self.assertEqual(report["workflow_evidence_status"], "pass")
        self.assertEqual(report["visual_review_status"], "pass")
        self.assertEqual(report["reviewer"], self.review["reviewer"])
        self.assertEqual(report["checks"], self.review["checks"])
        self.assertNotIn("user-approved", json.dumps(report))
        self.assertIn("cannot prove", report["trust_boundary"])

    def test_cli_resolves_each_record_relative_to_its_directory(self) -> None:
        anchor = Path(self.bundle["references"][0]["path"])
        shutil.copyfile(anchor, self.bundle_path.parent / "anchor.png")
        self.bundle["references"][0]["path"] = "anchor.png"
        for stage in self.bundle["workflow"]["stages"][1:3]:
            stage["references"][1]["path"] = "anchor.png"
        for index, stage in enumerate(self.run_record["stages"]):
            stage["inputs"][0 if index == 0 else 1] = self.file_record(self.bundle_path.parent / "anchor.png")
        self.save_records()
        output = self.root / "report.json"
        completed = self.run_cli("--output", str(output))
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertEqual(json.loads(output.read_text()), json.loads(completed.stdout))

    def run_cli(self, *extra: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run([
            sys.executable, "-B", str(ROOT / "scripts/validate_style_3_1_asset.py"),
            "--bundle", str(self.bundle_path), "--run-record", str(self.run_path),
            "--review", str(self.review_path), *extra,
        ], cwd=self.root / "elsewhere", capture_output=True, text=True, check=False)

    def test_missing_stage_is_pending(self) -> None:
        self.run_record["stages"].pop()
        self.save_records()
        self.assert_not_final("pending-review")

    def test_stage_order_is_rejected(self) -> None:
        self.run_record["stages"].reverse()
        self.save_records()
        self.assert_not_final("rejected")

    def test_extra_stage_is_rejected(self) -> None:
        self.run_record["stages"].append(copy.deepcopy(self.run_record["stages"][0]))
        self.save_records()
        self.assert_not_final("rejected")

    def test_broken_chain_is_rejected(self) -> None:
        self.run_record["stages"][2]["inputs"][0] = self.file_record(self.outputs[0])
        self.save_records()
        self.assert_not_final("rejected")

    def test_hash_mismatch_and_missing_file_cannot_pass(self) -> None:
        self.outputs[0].write_bytes(b"tampered")
        self.assert_not_final("rejected")
        self.outputs[0].unlink()
        self.assert_not_final("pending-review")

    def test_invalid_png_with_matching_hash_is_rejected(self) -> None:
        self.outputs[-1].write_bytes(b"not a PNG")
        self.run_record["stages"][-1]["output"] = self.file_record(self.outputs[-1])
        self.review["final_image_sha256"] = validator.sha256_file(self.outputs[-1])
        self.save_records()
        self.assert_not_final("rejected")

    def test_each_binding_rejects_mismatch(self) -> None:
        for path, field in ((self.run_path, "bundle_sha256"), (self.review_path, "bundle_sha256"),
                            (self.review_path, "final_image_sha256")):
            with self.subTest(path=path.name, field=field):
                self.save_records()
                record = json.loads(path.read_text())
                record[field] = "0" * 64
                path.write_text(json.dumps(record))
                self.assert_not_final("rejected")

    def test_missing_anchor_or_character_input_is_rejected(self) -> None:
        for stage_index, input_index in ((0, 0), (0, 1), (1, 1), (2, 1)):
            with self.subTest(stage=stage_index, reference=input_index):
                original = copy.deepcopy(self.run_record)
                self.run_record["stages"][stage_index]["inputs"].pop(input_index)
                self.save_records()
                self.assert_not_final("rejected")
                self.run_record = original

    def test_prompt_hash_mismatch_is_rejected(self) -> None:
        for stage in self.run_record["stages"]:
            original = stage["prompt_sha256"]
            stage["prompt_sha256"] = "0" * 64
            self.save_records()
            self.assert_not_final("rejected")
            stage["prompt_sha256"] = original

    def test_v3_cannot_be_relabelled_as_v4(self) -> None:
        self.bundle["style_contract"] = "family-crayon-card-v3"
        self.save_records()
        self.assert_not_final("rejected")
        self.bundle["style_contract"] = validator.STYLE_CONTRACT
        self.bundle["workflow"]["stages"].pop()
        self.save_records()
        self.assert_not_final("rejected")

    def test_modified_bundle_prompt_and_edit_rules_are_rejected(self) -> None:
        original = copy.deepcopy(self.bundle)
        self.bundle["prompt"] += " extra style instruction"
        self.save_records()
        self.assert_not_final("rejected")
        self.bundle = original
        self.bundle["workflow"]["stages"][1]["must_preserve"] = "nothing"
        self.save_records()
        self.assert_not_final("rejected")

    def test_bundle_anchor_mismatch_is_rejected(self) -> None:
        self.bundle["references"][0]["path"] = "../images/character.png"
        self.save_records()
        self.assert_not_final("rejected")

    def test_missing_review_and_run_record_stay_pending(self) -> None:
        self.review_path.unlink()
        report = self.assert_not_final("pending-review")
        self.assertEqual(report["workflow_evidence_status"], "pass")
        self.run_path.unlink()
        self.assert_not_final("pending-review")

    def test_review_missing_item_not_reviewed_and_empty_observation_stay_pending(self) -> None:
        for mutation in ("missing", "not-reviewed", "empty"):
            with self.subTest(mutation=mutation):
                original = copy.deepcopy(self.review)
                dimension = render_prompt.STYLE_3_1_REVIEW_DIMENSIONS[0]
                if mutation == "missing":
                    del self.review["checks"][dimension]
                elif mutation == "empty":
                    self.review["checks"][dimension]["observation"] = " "
                else:
                    self.review["checks"][dimension]["status"] = "not-reviewed"
                self.save_records()
                self.assert_not_final("pending-review")
                self.review = original

    def test_each_failed_visual_dimension_rejects(self) -> None:
        for dimension in render_prompt.STYLE_3_1_REVIEW_DIMENSIONS:
            with self.subTest(dimension=dimension):
                self.review["checks"][dimension]["status"] = "fail"
                self.save_records()
                report = self.assert_not_final("rejected")
                self.assertEqual(report["workflow_evidence_status"], "pass")
                self.assertEqual(report["visual_review_status"], "rejected")
                self.review["checks"][dimension]["status"] = "pass"

    def test_invalid_reviewer_or_date_is_rejected(self) -> None:
        for key, value in (("reviewer", []), ("reviewer", {"kind": "human", "id": ""}),
                           ("reviewer", {"kind": "service", "id": "a"}),
                           ("reviewed_at", "2026-02-31T12:00:00+08:00"),
                           ("reviewed_at", "2026-10-16"), ("reviewed_at", "2026-10-16T12:00:00")):
            with self.subTest(key=key, value=value):
                original = copy.deepcopy(self.review)
                self.review[key] = value
                self.save_records()
                self.assert_not_final("rejected")
                self.review = original

    def test_malformed_json_and_root_types_exit_cleanly(self) -> None:
        for path in (self.bundle_path, self.run_path, self.review_path):
            for raw in ("{broken", "null", "[]", '"text"'):
                with self.subTest(record=path.name, raw=raw):
                    self.save_records()
                    path.write_text(raw)
                    completed = self.run_cli()
                    self.assertEqual(completed.returncode, 2, completed.stderr)
                    self.assertNotIn("Traceback", completed.stderr)
                    self.assertNotIn("output_status", json.loads(completed.stdout))

    def test_empty_review_is_pending_and_cli_returns_two(self) -> None:
        self.review_path.write_text("{}")
        completed = self.run_cli()
        self.assertEqual(completed.returncode, 2)
        self.assertEqual(json.loads(completed.stdout)["status"], "pending-review")

    def test_unknown_or_invalid_review_dimensions_are_rejected(self) -> None:
        self.review["checks"]["not-in-contract"] = {"status": "pass", "observation": "test"}
        self.save_records()
        self.assert_not_final("rejected")
        del self.review["checks"]["not-in-contract"]
        self.review["checks"]["face-language"]["status"] = "approved"
        self.save_records()
        self.assert_not_final("rejected")


if __name__ == "__main__":
    unittest.main()
