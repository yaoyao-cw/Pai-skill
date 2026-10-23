#!/usr/bin/env python3
"""Validate style 3.1 evidence and review records without running an image model."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import sys
import zlib
from datetime import datetime
from pathlib import Path

import hosted_images
import render_prompt


STYLE_CONTRACT = "family-crayon-card-v4"
TRUST_BOUNDARY = (
    "This report checks file and record consistency. It cannot prove that a model used "
    "the recorded prompts or references, or that the reviewer actually inspected the "
    "images. Visual conclusions are attributed reviewer claims, not user acceptance."
)


class MissingEvidence(ValueError):
    """Required evidence has not been supplied yet."""


def require_object(value: object, label: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


def require_field(record: dict, key: str, label: str) -> object:
    if key not in record:
        raise MissingEvidence(f"{label}.{key} is missing")
    return record[key]


def require_text(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_record(path: Path) -> dict:
    if not path.is_file():
        raise MissingEvidence(f"record is unavailable: {path}")
    return require_object(json.loads(path.read_text(encoding="utf-8")), str(path))


def resolve_record_path(value: object, directory: Path) -> Path:
    path = Path(require_text(value, "file path")).expanduser()
    return (directory / path).resolve()


def validate_file_record(record: object, directory: Path) -> tuple[Path, str]:
    record = require_object(record, "file record")
    path = resolve_record_path(require_field(record, "path", "file record"), directory)
    digest = require_field(record, "sha256", "file record")
    if not isinstance(digest, str) or re.fullmatch(r"[0-9a-f]{64}", digest) is None:
        raise ValueError("file sha256 must be 64 lowercase hex characters")
    if not path.is_file():
        raise MissingEvidence(f"file is unavailable: {path}")
    if sha256_file(path) != digest:
        raise ValueError(f"file sha256 mismatch: {path}")
    return path, digest


def validate_bundle(bundle: dict, directory: Path) -> list[tuple[Path, str]]:
    if bundle.get("style_id") != "3.1" or bundle.get("style_contract") != STYLE_CONTRACT:
        raise ValueError("bundle requires style 3.1 / family-crayon-card-v4; v3 cannot be promoted")
    inputs = require_object(require_field(bundle, "inputs", "bundle"), "bundle.inputs")
    variables = require_object(require_field(inputs, "variables", "inputs"), "inputs.variables")
    if set(variables) != {"主体", "文字"}:
        raise ValueError("bundle variables must contain exactly 主体 and 文字")
    for key, value in variables.items():
        require_text(value, f"variables.{key}")
    render_prompt.validate_style_3_1_subject(variables["主体"])
    title_prefix, title_suffix = render_prompt.style_3_1_title_instruction("{title}").split("{title}")
    text_instruction = variables["文字"]
    expected_title = None
    if text_instruction.startswith(title_prefix) and text_instruction.endswith(title_suffix):
        title = text_instruction[len(title_prefix):-len(title_suffix)]
        expected_title = render_prompt.style_3_1_title_instruction(title)
    render_prompt.validate_style_3_1_text(text_instruction, expected_title)
    aspect = require_field(inputs, "aspect", "inputs")
    if aspect is not None:
        require_text(aspect, "inputs.aspect")
    expected_prompt = render_prompt.render(render_prompt.extract_template("3.1"), variables, aspect)
    if bundle.get("prompt") != expected_prompt:
        raise ValueError("bundle prompt does not match its inputs and the unchanged recipe")
    references = require_field(bundle, "references", "bundle")
    if not isinstance(references, list) or not references:
        raise MissingEvidence("bundle references must contain the required style anchor")
    anchor = require_object(references[0], "style anchor")
    identity = hosted_images.image_record("assets/style-3.1/anchor-family.png")
    if (
        anchor.get("role") != "style-only"
        or anchor.get("priority") != "primary-visual-truth"
        or anchor.get("url") != identity["url"]
        or anchor.get("sha256") != identity["sha256"]
    ):
        raise ValueError("bundle style anchor identity mismatch")
    anchor_file = validate_file_record(anchor, directory)
    render_prompt.validate_style_3_1_anchor(anchor_file[0])
    reference_files = [anchor_file]
    for reference in references[1:]:
        reference = require_object(reference, "character reference")
        if reference.get("role") != "character":
            raise ValueError("references after the style anchor must have character role")
        path = resolve_record_path(require_field(reference, "path", "character reference"), directory)
        if not path.is_file():
            raise MissingEvidence(f"character reference unavailable: {path}")
        reference_files.append((path, sha256_file(path)))
    anchor_input = {key: anchor[key] for key in ("path", "url", "sha256", "role")}
    if bundle.get("workflow") != render_prompt.style_3_1_workflow(anchor_input):
        raise ValueError("bundle workflow must preserve three image operations and one validation step")
    if bundle.get("acceptance_contract") != render_prompt.style_3_1_acceptance_contract():
        raise ValueError("bundle acceptance_contract mismatch")
    return reference_files


def validate_run_record(
    run_record: dict,
    directory: Path,
    bundle: dict,
    bundle_sha256: str,
    reference_files: list[tuple[Path, str]],
) -> tuple[Path, str]:
    if require_field(run_record, "bundle_sha256", "run-record") != bundle_sha256:
        raise ValueError("run-record bundle_sha256 mismatch")
    stages = require_field(run_record, "stages", "run-record")
    if not isinstance(stages, list):
        raise ValueError("run-record stages must be a list")
    if len(stages) < 3:
        raise MissingEvidence("run-record must include all three image stages")
    if len(stages) != 3:
        raise ValueError("run-record must include exactly three image stages")
    previous_output: tuple[Path, str] | None = None
    for index, stage_definition in enumerate(bundle["workflow"]["stages"][:3]):
        stage = require_object(stages[index], "run stage")
        if require_field(stage, "stage_id", "run stage") != stage_definition["id"]:
            raise ValueError("run stage order or stage_id mismatch")
        prompt = bundle["prompt"] if index == 0 else stage_definition["prompt"]
        if require_field(stage, "prompt_sha256", "run stage") != hashlib.sha256(prompt.encode("utf-8")).hexdigest():
            raise ValueError(f"prompt_sha256 mismatch: {stage_definition['id']}")
        stage_inputs = require_field(stage, "inputs", "run stage")
        if not isinstance(stage_inputs, list):
            raise ValueError("run stage inputs must be a list")
        input_files = [validate_file_record(reference, directory) for reference in stage_inputs]
        expected_inputs = reference_files if index == 0 else [previous_output, reference_files[0]]
        if input_files != expected_inputs:
            raise ValueError(f"input chain, anchor, or character references mismatch: {stage_definition['id']}")
        previous_output = validate_file_record(require_field(stage, "output", "run stage"), directory)
        size, _, _, _ = render_prompt.decode_png_pixel_bytes(previous_output[0])
        if min(size) <= 0:
            raise ValueError("stage outputs require a non-empty decoded PNG")
    assert previous_output is not None
    return previous_output


def validate_review(review: dict, bundle_sha256: str, image_sha256: str) -> tuple[str, list[str]]:
    if require_field(review, "bundle_sha256", "review") != bundle_sha256:
        raise ValueError("review bundle_sha256 mismatch")
    if require_field(review, "final_image_sha256", "review") != image_sha256:
        raise ValueError("review final_image_sha256 mismatch")
    reviewer = require_object(require_field(review, "reviewer", "review"), "reviewer")
    if require_field(reviewer, "kind", "reviewer") not in ("human", "agent"):
        raise ValueError("reviewer.kind must be human or agent")
    require_text(require_field(reviewer, "id", "reviewer"), "reviewer.id")
    reviewed_at = require_text(require_field(review, "reviewed_at", "review"), "reviewed_at")
    if "T" not in reviewed_at:
        raise ValueError("reviewed_at must be an ISO 8601 timestamp with timezone")
    timestamp = datetime.fromisoformat(reviewed_at.replace("Z", "+00:00"))
    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        raise ValueError("reviewed_at must include a timezone")
    checks = require_object(require_field(review, "checks", "review"), "review.checks")
    unknown = set(checks) - set(render_prompt.STYLE_3_1_REVIEW_DIMENSIONS)
    if unknown:
        raise ValueError("unknown review dimensions: " + ", ".join(sorted(unknown)))
    pending: list[str] = []
    failures: list[str] = []
    for dimension in render_prompt.STYLE_3_1_REVIEW_DIMENSIONS:
        if dimension not in checks:
            pending.append(f"{dimension}: missing review")
            continue
        check = require_object(checks[dimension], dimension)
        status = check.get("status")
        if status not in ("pass", "fail", "not-reviewed"):
            raise ValueError(f"{dimension}: status must be pass, fail, or not-reviewed")
        observation = check.get("observation")
        if not isinstance(observation, str) or not observation.strip():
            pending.append(f"{dimension}: missing observation")
        if status == "fail":
            failures.append(f"{dimension}: {observation or 'no observation supplied'}")
        elif status == "not-reviewed":
            pending.append(f"{dimension}: not reviewed")
    if failures:
        return "rejected", failures + pending
    return ("pending-review", pending) if pending else ("pass", [])


def build_validation_report(bundle_path: Path, run_path: Path, review_path: Path) -> dict[str, object]:
    report: dict[str, object] = {
        "style_contract": STYLE_CONTRACT,
        "bundle": str(bundle_path.resolve()),
        "run_record": str(run_path.resolve()),
        "review": str(review_path.resolve()),
        "workflow_evidence_status": "pending-review",
        "visual_review_status": "pending-review",
        "status": "pending-review",
        "failures": [],
        "trust_boundary": TRUST_BOUNDARY,
    }
    evidence_section = "workflow_evidence_status"
    try:
        bundle = load_record(bundle_path)
        bundle_sha256 = sha256_file(bundle_path)
        report["bundle_sha256"] = bundle_sha256
        reference_files = validate_bundle(bundle, bundle_path.resolve().parent)
        candidate_path, candidate_sha256 = validate_run_record(
            load_record(run_path), run_path.resolve().parent, bundle, bundle_sha256, reference_files,
        )
        report.update({"workflow_evidence_status": "pass", "image": str(candidate_path), "image_sha256": candidate_sha256})
        evidence_section = "visual_review_status"
        review = load_record(review_path)
        review_status, failures = validate_review(review, bundle_sha256, candidate_sha256)
        report.update({
            "visual_review_status": review_status,
            "status": review_status,
            "failures": failures,
            "reviewer": review["reviewer"],
            "reviewed_at": review["reviewed_at"],
            "checks": review["checks"],
        })
        if review_status == "pass":
            report["output_status"] = "final"
    except MissingEvidence as error:
        report["failures"] = [str(error)]
    except (OSError, ValueError, struct.error, zlib.error) as error:
        report[evidence_section] = "invalid"
        report["status"] = "rejected"
        report["failures"] = [str(error)]
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="验收风格 3.1 的三阶段记录与逐项视觉审核；不调用模型、不联网")
    parser.add_argument("--bundle", type=Path, required=True, help="原始 v4 正式调用包 JSON")
    parser.add_argument("--run-record", type=Path, required=True, help="三次图像操作的文件及 prompt 哈希记录 JSON")
    parser.add_argument("--review", type=Path, required=True, help="绑定本候选的逐项审核 JSON")
    parser.add_argument("--output", type=Path, help="可选报告 JSON 路径")
    args = parser.parse_args()
    report = build_validation_report(args.bundle, args.run_record, args.review)
    report_json = json.dumps(report, ensure_ascii=False, indent=2)
    try:
        if args.output:
            args.output.write_text(report_json + "\n", encoding="utf-8")
    except OSError as error:
        print(f"validate_style_3_1_asset: {error}", file=sys.stderr)
        return 2
    print(report_json)
    return 0 if report["status"] == "pass" else 2


if __name__ == "__main__":
    raise SystemExit(main())
