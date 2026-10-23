#!/usr/bin/env python3

from __future__ import annotations

import hashlib
import json
import importlib.util
import os
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
RENDERER = ROOT / "scripts/render_prompt.py"
STYLE_20_VALIDATOR = ROOT / "scripts/validate_style_20_asset.py"
SPEC = importlib.util.spec_from_file_location("render_prompt", RENDERER)
RENDER_PROMPT = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(RENDER_PROMPT)


class RenderPromptTests(unittest.TestCase):
    def test_recipe_and_correction_prompts_match_recorded_baseline(self) -> None:
        # Contract-only changes must not silently alter visual recipes (4132988).
        expected_templates = {
            "1": "c53c58d41d8863dce16b369f71252abb332a17f8486b1152917e73e7d96c0fad",
            "2": "3a35430148844254f4f3f7a3ded3c6f62112d4f64ee3b48662227a622c3df8ee",
            "3": "9511c0a6e2b85c29b1c56ac14e19ad017f18e3ca0ec96db0ca1c7e6eb4b20583",
            "3.1": "90ec2fb4b565ae8030b2908100a411785ccd1ac44b1dca87db96ea0e1b44fcd8",
            "4": "8c68baa897e15209239220182cc57b13c113515f8d7d9724b036e332ddf840f9",
            "5": "a30b92cdbe3e10ace50857dcd7df09ec954ee0e0cf63a34fbbab44664e8bb29c",
            "6": "b49d9a4d3f145dc672402b7b3670fed56e33740972a45da78552b3f4d71f2941",
            "7": "36bed3c07424ecddbd6a0cd4bad476495cfdd6a9629ca62e0ebaa8acec477d3b",
            "8": "75643d33845302934488598f65b5c41292c59316afec57679c157b1a829287ca",
            "9": "bdea531e355bdf03d3fb280735b222a94228c685f52862e301b1534aeb251a6c",
            "10": "a46910c70e578dbf608f8d2c520112fb33b877d3ed8147ae8d819fa8267e7d3f",
            "11": "7c9612874104d5e44702d5f6c0cb8bc1e761e91501f2f24f8fda708a947fa639",
            "12": "c709208be5dd986d13279bc95474bc51825e451792149bb129befab15b0a7344",
            "13": "9454df2a3cafb2c927e0db20e2818d0eefda9a5ee9cff83f28af802e422bddf5",
            "14": "7137ff94aad9df3d8043f3b09d28b4c14540d1c438309843ff0bc4210428b9fb",
            "15": "276d632670e473b94ccdbf0d0afac4ca16d1bf5509d0c78c2d50cb5d4450c798",
            "16": "89dd208ac149d227f6dc51d0c57c05585c408c882bd36a80295046055566b0b3",
            "17": "e7a21b1d91df531d82b269842a67a4ce5d33589d222a77d68508d30452d8df6a",
            "18": "608695cfb9edfc296711653c9ed78246cdad3119780e64767e9a7e5c99edb232",
            "19": "8d20f8ade57c18c8d3e366fc064ffebcf81527494e520eba47b24a023b0fdd90",
            "20": "980d1e844ea8496de2f248e86b41a2c27df4776733e940d0250547a570ff6cae",
            "22": "f6b65c6a6ada9f7372b3a65576c87299f19628d1d3560883f3049ebe18e62e4a",
            "23": "715bee1f051a584f2d01667892297b987e9056f2d6ee0f70031ed56f38b5efb8"
        }
        self.assertEqual(set(RENDER_PROMPT.load_style_sections()), set(expected_templates))
        for style_id, digest in expected_templates.items():
            with self.subTest(style_id=style_id):
                self.assertEqual(hashlib.sha256(RENDER_PROMPT.extract_template(style_id).encode("utf-8")).hexdigest(), digest)
        self.assertEqual(hashlib.sha256(RENDER_PROMPT.STYLE_3_1_SCRIBBLE_CORRECTION_PROMPT.encode("utf-8")).hexdigest(), "e17c10538539c8b5321bd10b182f701b2752a0e8dd266d984c1f456fd08e4c18")
        self.assertEqual(hashlib.sha256(RENDER_PROMPT.STYLE_3_1_SCRIBBLE_CHAOS_PROMPT.encode("utf-8")).hexdigest(), "34c649537e864550ae262cd2e9b6b15a6885f9b6de3f5a67b29214f79cf56847")

    def create_palette_fixture(self, directory: Path, name: str = "candidate") -> tuple[Path, Path]:
        image = directory / f"{name}.png"
        width = height = 100
        paper = b"\xf8\xf7\xf1" if name == "candidate" else b"\xfa\xf9\xf3"
        pixels = paper * 9000 + b"\x1e\x1e\x1e" * 400 + b"\xb4\x8c\x28" * 600
        rows = b"".join(b"\x00" + pixels[row * width * 3:(row + 1) * width * 3] for row in range(height))

        def png_chunk(kind: bytes, content: bytes) -> bytes:
            return struct.pack(">I", len(content)) + kind + content + struct.pack(">I", zlib.crc32(kind + content) & 0xFFFFFFFF)

        image.write_bytes(b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + png_chunk(b"IDAT", zlib.compress(rows)) + png_chunk(b"IEND", b""))
        scorecard = directory / f"{name}.scorecard.json"
        digest = hashlib.sha256(image.read_bytes()).hexdigest()
        scorecard.write_text(json.dumps({
            "style_contract": "warm-yellow-ink-story-v3",
            "image_sha256": digest,
            "source_image_sha256": digest,
            "content_lock": {"expected_subjects": {"human": 2}, "observed_subjects": {"human": 2}, "identity_preserved": True, "required_objects_preserved": True},
            "scores": {dimension: 5 for dimension in ("shape-language", "face-language", "line-material", "directional-black-hatching", "mustard-yellow-material", "negative-space", "single-action-storytelling", "originality-boundary")},
            "hard_failures": [],
        }), encoding="utf-8")
        return image, scorecard

    def run_renderer(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(RENDERER), *args],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )

    def run_style_20_validator(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(STYLE_20_VALIDATOR), *args],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )

    def test_integer_styles_shift_forward_and_deleted_ids_stay_deleted(self) -> None:
        self.assertIn("xkcd 风格", RENDER_PROMPT.extract_template("1"))
        self.assertIn("real 5-year-old child", RENDER_PROMPT.extract_template("2"))
        self.assertIn("Studio Ghibli style", RENDER_PROMPT.extract_template("3"))
        self.assertIn("round blob person", RENDER_PROMPT.extract_template("4"))
        for deleted_id in ("1.1", "1.2"):
            with self.subTest(deleted_id=deleted_id):
                with self.assertRaisesRegex(ValueError, "不存在画风"):
                    RENDER_PROMPT.extract_template(deleted_id)

    def test_rawkid_alias_uses_current_3_1_anchor_contract(self) -> None:
        result = self.run_renderer(
            "--style",
            "rawkid",
            "--subject",
            "一家四口站在一起",
            "--text",
            "不加任何文字",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["style_id"], "3.1")
        self.assertEqual(payload["style_contract"], "family-crayon-card-v4")
        self.assertIn("assets/style-3.1/anchor-family.png", payload["references"][0]["path"])

    def test_formal_json_has_public_url_and_verified_cached_reference(self) -> None:
        result = self.run_renderer("--style", "19", "--subject", "a child holding one kite")
        self.assertEqual(result.returncode, 0, result.stderr)
        reference = json.loads(result.stdout)["references"][0]
        self.assertIn("url", reference)
        self.assertTrue(reference["url"].startswith("https://hand-drawn-images.pages.dev/hand-drawn/"))
        self.assertEqual(hashlib.sha256(Path(reference["path"]).read_bytes()).hexdigest(), reference["sha256"])

    def test_paper_folk_plain_prompt_does_not_require_image_download(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.dict(os.environ, {"HAND_DRAWN_IMAGE_CACHE": temp_dir, "HAND_DRAWN_OFFLINE": "1"}):
                result = self.run_renderer("--style", "paper-folk", "--subject", "a musician holding a violin", "--var", "构图=centered, waist-up", "--var", "底色=warm ochre-brown", "--var", "点缀元素=one stylized folk cloud", "--format", "text")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(result.stdout.strip())

    def test_style_3_1_json_contains_required_anchor(self) -> None:
        result = self.run_renderer(
            "--style",
            "family-crayon-card",
            "--subject",
            "爸爸把零食袋放回柜子,男孩站在旁边看着",
            "--text",
            "不加任何文字",
            "--aspect",
            "3:4",
            "--format",
            "json",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["style_id"], "3.1")
        self.assertEqual(payload["style_contract"], "family-crayon-card-v4")
        self.assertEqual(payload["references"][0]["role"], "style-only")
        self.assertEqual(payload["references"][0]["priority"], "primary-visual-truth")
        self.assertTrue(Path(payload["references"][0]["path"]).is_file())
        self.assertIn("画面内容:爸爸把零食袋放回柜子", payload["prompt"])
        self.assertIn("画幅比例:3:4。", payload["prompt"])
        self.assertNotIn("【主体】", payload["prompt"])
        self.assertNotIn("【文字】", payload["prompt"])
        self.assertEqual(payload["inputs"]["variables"]["主体"], "爸爸把零食袋放回柜子,男孩站在旁边看着")
        self.assertEqual(payload["workflow"]["final_output_stage"], "style-contract-check")
        correction = payload["workflow"]["stages"][1]
        self.assertEqual(correction["operation"], "edit")
        self.assertTrue(correction["required"])
        self.assertEqual(correction["references"][0]["role"], "edit-target")
        self.assertEqual(correction["references"][1]["role"], "style-only")
        self.assertIn("NO fine dense parallel lines", correction["prompt"])
        self.assertEqual(correction["output_status"], "intermediate-only")
        chaos = payload["workflow"]["stages"][2]
        self.assertEqual(chaos["id"], "scribble-chaos-correction")
        self.assertEqual(chaos["operation"], "edit")
        self.assertTrue(chaos["required"])
        self.assertEqual(chaos["output_status"], "final-candidate")
        self.assertEqual(len(payload["workflow"]["stages"]), 4)
        validation = payload["workflow"]["stages"][3]
        self.assertEqual(validation["id"], "style-contract-check")
        self.assertEqual(validation["operation"], "validate")
        self.assertTrue(validation["required"])
        self.assertEqual(validation["success_output_status"], "final")
        self.assertEqual(payload["acceptance_contract"]["require_all_dimensions"], "pass")
        self.assertEqual(chaos["references"][0]["source"], "scribble-correction.output")
        self.assertEqual(chaos["references"][1]["role"], "style-only")
        self.assertIn("Leave 35-55%", chaos["prompt"])
        self.assertIn("Do not change any clothing or object color", chaos["prompt"])

    def test_parent_child_natural_language_alias_routes_to_style_3_1(self) -> None:
        result = self.run_renderer(
            "--style",
            "亲子手绘",
            "--subject",
            "妈妈坐着听女儿讲学校里的事",
            "--text",
            "不加任何文字",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["style_id"], "3.1")
        self.assertEqual(payload["references"][0]["priority"], "primary-visual-truth")

    def test_style_3_1_auto_defaults_to_formal_json(self) -> None:
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "妈妈牵着孩子走过一把歪倒的小椅子",
            "--text",
            "不加任何文字",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["references"][0]["role"], "style-only")

    def test_style_3_1_prompt_contains_irregular_crayon_trajectory_contract(self) -> None:
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "妈妈坐着听女儿讲学校里的事",
            "--text",
            "不加任何文字",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        prompt = payload["prompt"]
        self.assertIn("蜡笔涂抹轨迹(一级画风身份,不是后期纹理)", prompt)
        self.assertIn("最高优先级·涂抹门禁:", prompt)
        self.assertIn("中途停笔、从别处重新起笔、突然换方向和回头重压", prompt)
        self.assertIn("单一方向的平行斜线", prompt)
        self.assertIn("NO neat diagonal hatching", prompt)
        self.assertIn("蜡笔排线滤镜", prompt)

    def test_style_3_1_plain_text_requires_explicit_preview(self) -> None:
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "妈妈牵着孩子",
            "--text",
            "不加任何文字",
            "--format",
            "text",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("正式生产不能只输出 prompt", result.stderr)

    def test_style_3_1_rejects_style_terms_in_subject(self) -> None:
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "妈妈牵着孩子,统一粗黑轮廓并使用低饱和四色配色",
            "--text",
            "不加任何文字",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("疑似业务画风注入", result.stderr)

    def test_style_3_1_rejects_business_fill_trajectory_override(self) -> None:
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "妈妈牵着孩子,改成均匀斜线并套统一蜡笔滤镜",
            "--text",
            "不加任何文字",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("疑似业务画风注入", result.stderr)

    def test_style_3_1_rejects_synonym_style_injection(self) -> None:
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "妈妈牵着孩子,外轮廓加粗,只用四种灰调颜色",
            "--text",
            "不加任何文字",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("疑似业务画风注入", result.stderr)

    def test_style_3_1_rejects_numeric_fill_defect_injection(self) -> None:
        injections = (
            "每块衣服都严格留白30%",
            "每块衣服都严格留白百分之三十",
            "每件衣服都空出三成白色",
            "每处涂色都超出边缘十分之一",
        )
        for injection in injections:
            with self.subTest(injection=injection):
                result = self.run_renderer(
                    "--style",
                    "3.1",
                    "--subject",
                    f"妈妈牵着孩子,{injection}",
                    "--text",
                    "不加任何文字",
                )
                self.assertEqual(result.returncode, 2)
                self.assertIn("疑似业务画风注入", result.stderr)

    def test_style_3_1_rejects_character_standardization_injection(self) -> None:
        injections = (
            "所有人的眼睛和脸型都按同一尺寸模板绘制",
            "衣服的蜡笔覆盖率统一定为七成",
            "每张都套用固定人物模板,姿势尽量对称规整",
            "所有越界色痕平均控制在两毫米",
        )
        for injection in injections:
            with self.subTest(injection=injection):
                result = self.run_renderer(
                    "--style",
                    "3.1",
                    "--subject",
                    f"妈妈牵着孩子,{injection}",
                    "--text",
                    "不加任何文字",
                )
                self.assertEqual(result.returncode, 2)
                self.assertIn("疑似业务画风注入", result.stderr)

    def test_style_3_1_rejects_freeform_text_instruction(self) -> None:
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "妈妈牵着孩子",
            "--text",
            "改成低饱和四色配色",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("只允许 --text '不加任何文字' 或独立 --title", result.stderr)

    def test_style_3_1_title_is_wrapped_by_renderer(self) -> None:
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "妈妈牵着孩子",
            "--title",
            "摔倒以后，妈妈先做什么？",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertIn("逐字为“摔倒以后，妈妈先做什么？”", payload["prompt"])

    def test_character_reference_is_appended_after_style_anchor(self) -> None:
        character_reference = RENDER_PROMPT.hosted_images.resolve_image("assets/style-3.1/anchor-family.png")
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "妈妈蹲下帮男孩整理裤脚",
            "--text",
            "不加任何文字",
            "--character-reference",
            str(character_reference),
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["references"][0]["role"], "style-only")
        self.assertEqual(payload["references"][1]["role"], "character")
        self.assertEqual(payload["references"][1]["must_not_replace"], "the style-only reference")

    def test_style_19_alias_defaults_to_locked_json_contract(self) -> None:
        result = self.run_renderer(
            "--style",
            "roundhead-redline",
            "--subject",
            "a small elephant calf lifting one coral-red paper lantern with its trunk",
            "--aspect",
            "3:4",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["style_id"], "19")
        self.assertEqual(payload["style_contract"], "roundhead-redline-v1")
        self.assertEqual(payload["references"][0]["role"], "style-only")
        self.assertIn("assets/style-19/anchor-roundhead-redline.png", payload["references"][0]["path"])
        self.assertTrue(Path(payload["references"][0]["path"]).is_file())
        self.assertEqual(payload["inputs"]["variables"]["文字"], "No text anywhere.")
        self.assertIn("SUBJECT: a small elephant calf", payload["prompt"])
        self.assertIn("画幅比例:3:4。", payload["prompt"])
        self.assertNotIn("【主体】", payload["prompt"])
        self.assertNotIn("【文字】", payload["prompt"])
        self.assertEqual(
            payload["model_requirements"]["model_snapshot"],
            "gpt-image-2-2026-04-21",
        )
        self.assertTrue(payload["model_requirements"]["snapshot_lock_required"])
        self.assertFalse(payload["validation_evidence"]["exact_candidate_snapshot_observed"])
        self.assertEqual(payload["workflow"]["final_output_stage"], "style-contract-check")
        self.assertEqual(payload["workflow"]["stages"][0]["output_status"], "candidate-only")
        self.assertEqual(payload["workflow"]["stages"][1]["pass_status"], "final")
        self.assertEqual(payload["acceptance_contract"]["minimum_score"], 30)
        self.assertIn(
            "clean digital outline without visible graphite pressure variation",
            payload["acceptance_contract"]["hard_failures"],
        )

    def test_style_19_character_reference_follows_style_anchor(self) -> None:
        character_reference = RENDER_PROMPT.hosted_images.resolve_image("assets/style-19/anchor-roundhead-redline.png")
        result = self.run_renderer(
            "--style",
            "19",
            "--subject",
            "a tall gardener leaning down to water one seedling",
            "--character-reference",
            str(character_reference),
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["references"][0]["role"], "style-only")
        self.assertEqual(payload["references"][1]["role"], "character")
        self.assertEqual(payload["references"][1]["must_not_replace"], "the style-only reference")

    def test_style_19_rejects_subject_style_injection(self) -> None:
        result = self.run_renderer(
            "--style",
            "19",
            "--subject",
            "一只狐狸采用水彩风格和粗黑轮廓",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("画风 19 的主体字段只能描述人物、动作、关系和道具", result.stderr)

    def test_style_19_rejects_inline_text_and_title(self) -> None:
        text_result = self.run_renderer(
            "--style",
            "19",
            "--subject",
            "a girl holding a kite",
            "--text",
            "hello",
        )
        self.assertEqual(text_result.returncode, 2)
        self.assertIn("固定为无字底图", text_result.stderr)

        title_result = self.run_renderer(
            "--style",
            "19",
            "--subject",
            "a girl holding a kite",
            "--title",
            "hello",
        )
        self.assertEqual(title_result.returncode, 2)
        self.assertIn("标题需走独立排版流程", title_result.stderr)

    def test_style_19_metadata_only_change_preserves_anchor_identity(self) -> None:
        original = RENDER_PROMPT.hosted_images.resolve_image("assets/style-19/anchor-roundhead-redline.png")
        with tempfile.TemporaryDirectory() as temp_dir:
            candidate = Path(temp_dir) / "anchor.png"
            data = original.read_bytes()
            iend_offset = data.rfind(b"\x00\x00\x00\x00IEND")
            self.assertGreater(iend_offset, 0)
            chunk_type = b"tEXt"
            chunk_data = b"audit=metadata-only-change"
            metadata_chunk = (
                struct.pack(">I", len(chunk_data))
                + chunk_type
                + chunk_data
                + struct.pack(">I", zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF)
            )
            candidate.write_bytes(data[:iend_offset] + metadata_chunk + data[iend_offset:])
            self.assertNotEqual(candidate.read_bytes(), original.read_bytes())
            RENDER_PROMPT.validate_style_19_anchor(candidate)

    def test_style_19_modified_anchor_pixels_fail_closed(self) -> None:
        original = RENDER_PROMPT.hosted_images.resolve_image("assets/style-19/anchor-roundhead-redline.png")
        with tempfile.TemporaryDirectory() as temp_dir:
            candidate = Path(temp_dir) / "anchor.png"
            data = bytearray(original.read_bytes())
            idat_offset = data.find(b"IDAT")
            self.assertGreater(idat_offset, 0)
            data[idat_offset + 8] ^= 1
            candidate.write_bytes(data)
            with self.assertRaisesRegex(ValueError, "PNG 校验失败|像素不匹配|像素数据损坏"):
                RENDER_PROMPT.validate_style_19_anchor(candidate)

    def test_style_20_alias_defaults_to_generate_then_validate_contract(self) -> None:
        result = self.run_renderer(
            "--style",
            "warm-yellow-ink-story",
            "--subject",
            "a grandmother and child repairing one mustard-yellow kite together",
            "--aspect",
            "3:4",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["style_id"], "20")
        self.assertEqual(payload["style_contract"], "warm-yellow-ink-story-v3")
        self.assertEqual(payload["references"][0]["role"], "style-only")
        self.assertIn(
            "assets/style-20/anchor-warm-yellow-ink-story.png",
            payload["references"][0]["path"],
        )
        self.assertTrue(Path(payload["references"][0]["path"]).is_file())
        self.assertEqual(payload["inputs"]["variables"]["文字"], "No text anywhere.")
        self.assertIn("SUBJECT: a grandmother and child", payload["prompt"])
        self.assertIn("画幅比例:3:4。", payload["prompt"])
        self.assertEqual(
            payload["model_requirements"]["model_snapshot"],
            "gpt-image-2-2026-04-21",
        )
        self.assertEqual(payload["workflow"]["final_output_stage"], "style-contract-check")
        base_stage, validation_stage = payload["workflow"]["stages"]
        self.assertEqual(base_stage["output_status"], "final-candidate")
        self.assertEqual(validation_stage["operation"], "validate")
        self.assertEqual(validation_stage["input_source"], "base-generation.output")
        self.assertEqual(validation_stage["validator"]["required_exit_code"], 0)
        self.assertIn("validate_style_20_asset.py", validation_stage["validator"]["command"][1])
        self.assertIn("--source-image", validation_stage["validator"]["command"])
        self.assertEqual(validation_stage["pass_status"], "final")
        self.assertIn("reject and regenerate", payload["workflow"]["rejection_policy"])
        self.assertEqual(payload["acceptance_contract"]["minimum_score"], 34)
        self.assertEqual(payload["acceptance_contract"]["maximum_score"], 40)

    def test_style_20_character_reference_follows_style_anchor(self) -> None:
        character_reference = RENDER_PROMPT.hosted_images.resolve_image("assets/style-20/anchor-warm-yellow-ink-story.png")
        result = self.run_renderer(
            "--style",
            "20",
            "--subject",
            "a girl passing one paper boat to her grandfather",
            "--character-reference",
            str(character_reference),
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["references"][0]["role"], "style-only")
        self.assertEqual(payload["references"][1]["role"], "character")
        self.assertEqual(payload["references"][1]["must_not_replace"], "the style-only reference")

    def test_style_20_rejects_subject_style_injection(self) -> None:
        result = self.run_renderer(
            "--style",
            "20",
            "--subject",
            "一位奶奶和孩子采用水彩质感与统一粗黑轮廓",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("画风 20 的主体字段只能描述人物、动作、关系和道具", result.stderr)

    def test_style_20_rejects_inline_text_and_title(self) -> None:
        text_result = self.run_renderer(
            "--style",
            "20",
            "--subject",
            "a child holding a kite",
            "--text",
            "hello",
        )
        self.assertEqual(text_result.returncode, 2)
        self.assertIn("固定为无字底图", text_result.stderr)

        title_result = self.run_renderer(
            "--style",
            "20",
            "--subject",
            "a child holding a kite",
            "--title",
            "hello",
        )
        self.assertEqual(title_result.returncode, 2)
        self.assertIn("画风 19/20 的标题需走独立排版流程", title_result.stderr)

    def test_style_20_metadata_only_change_preserves_anchor_identity(self) -> None:
        original = RENDER_PROMPT.hosted_images.resolve_image("assets/style-20/anchor-warm-yellow-ink-story.png")
        with tempfile.TemporaryDirectory() as temp_dir:
            candidate = Path(temp_dir) / "anchor.png"
            data = original.read_bytes()
            iend_offset = data.rfind(b"\x00\x00\x00\x00IEND")
            self.assertGreater(iend_offset, 0)
            chunk_type = b"tEXt"
            chunk_data = b"audit=metadata-only-change"
            metadata_chunk = (
                struct.pack(">I", len(chunk_data))
                + chunk_type
                + chunk_data
                + struct.pack(">I", zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF)
            )
            candidate.write_bytes(data[:iend_offset] + metadata_chunk + data[iend_offset:])
            self.assertNotEqual(candidate.read_bytes(), original.read_bytes())
            RENDER_PROMPT.validate_style_20_anchor(candidate)

    def test_style_20_modified_anchor_pixels_fail_closed(self) -> None:
        original = RENDER_PROMPT.hosted_images.resolve_image("assets/style-20/anchor-warm-yellow-ink-story.png")
        with tempfile.TemporaryDirectory() as temp_dir:
            candidate = Path(temp_dir) / "anchor.png"
            data = bytearray(original.read_bytes())
            idat_offset = data.find(b"IDAT")
            self.assertGreater(idat_offset, 0)
            data[idat_offset + 8] ^= 1
            candidate.write_bytes(data)
            with self.assertRaisesRegex(ValueError, "PNG 校验失败|像素不匹配|像素数据损坏"):
                RENDER_PROMPT.validate_style_20_anchor(candidate)

    def test_style_20_validator_accepts_bound_palette_fixture(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            image, scorecard = self.create_palette_fixture(Path(temp_dir))
            result = self.run_style_20_validator("--image", str(image), "--source-image", str(image), "--scorecard", str(scorecard))
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report["status"], "pass")
        self.assertGreaterEqual(report["review_score"], 34)
        self.assertEqual(report["failures"], [])

    def test_style_20_validator_rejects_scorecard_for_different_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            source_image, scorecard = self.create_palette_fixture(Path(temp_dir))
            image, _ = self.create_palette_fixture(Path(temp_dir), "different")
            result = self.run_style_20_validator("--image", str(image), "--source-image", str(source_image), "--scorecard", str(scorecard))
        self.assertEqual(result.returncode, 2)
        report = json.loads(result.stdout)
        self.assertIn("scorecard image_sha256 mismatch", report["failures"])

    def test_style_20_validator_rejects_content_lock_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            image, scorecard = self.create_palette_fixture(Path(temp_dir))
            scorecard_data = json.loads(scorecard.read_text(encoding="utf-8"))
            scorecard_data["content_lock"]["observed_subjects"] = {"fox": 1}
            scorecard.write_text(json.dumps(scorecard_data), encoding="utf-8")
            result = self.run_style_20_validator(
                "--image",
                str(image),
                "--source-image",
                str(image),
                "--scorecard",
                str(scorecard),
            )
        self.assertEqual(result.returncode, 2)
        report = json.loads(result.stdout)
        self.assertIn("content_lock observed_subjects mismatch", report["failures"])

    def test_style_20_validator_rejects_blank_image_despite_high_review_scores(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            image = Path(temp_dir) / "blank.png"
            width = 32
            height = 32
            raw_rows = b"".join(b"\x00" + b"\xff\xff\xff" * width for _ in range(height))

            def png_chunk(chunk_type: bytes, chunk_data: bytes) -> bytes:
                return (
                    struct.pack(">I", len(chunk_data))
                    + chunk_type
                    + chunk_data
                    + struct.pack(">I", zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF)
                )

            image.write_bytes(
                b"\x89PNG\r\n\x1a\n"
                + png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
                + png_chunk(b"IDAT", zlib.compress(raw_rows))
                + png_chunk(b"IEND", b"")
            )
            scorecard = Path(temp_dir) / "scorecard.json"
            scorecard.write_text(
                json.dumps(
                    {
                        "style_contract": "warm-yellow-ink-story-v3",
                        "image_sha256": hashlib.sha256(image.read_bytes()).hexdigest(),
                        "source_image_sha256": hashlib.sha256(image.read_bytes()).hexdigest(),
                        "content_lock": {
                            "expected_subjects": {"human": 1},
                            "observed_subjects": {"human": 1},
                            "identity_preserved": True,
                            "required_objects_preserved": True,
                        },
                        "scores": {dimension: 5 for dimension in (
                            "shape-language",
                            "face-language",
                            "line-material",
                            "directional-black-hatching",
                            "mustard-yellow-material",
                            "negative-space",
                            "single-action-storytelling",
                            "originality-boundary",
                        )},
                        "hard_failures": [],
                    }
                ),
                encoding="utf-8",
            )
            result = self.run_style_20_validator(
                "--image",
                str(image),
                "--source-image",
                str(image),
                "--scorecard",
                str(scorecard),
            )
            self.assertEqual(result.returncode, 2)
            report = json.loads(result.stdout)
            self.assertEqual(report["status"], "rejected")
            self.assertTrue(any("white_ratio" in failure for failure in report["failures"]))

    def test_metadata_only_change_preserves_anchor_identity(self) -> None:
        original = RENDER_PROMPT.hosted_images.resolve_image("assets/style-3.1/anchor-family.png")
        with tempfile.TemporaryDirectory() as temp_dir:
            candidate = Path(temp_dir) / "anchor.png"
            data = original.read_bytes()
            iend_offset = data.rfind(b"\x00\x00\x00\x00IEND")
            self.assertGreater(iend_offset, 0)
            chunk_type = b"tEXt"
            chunk_data = b"audit=metadata-only-change"
            metadata_chunk = (
                struct.pack(">I", len(chunk_data))
                + chunk_type
                + chunk_data
                + struct.pack(">I", zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF)
            )
            candidate.write_bytes(data[:iend_offset] + metadata_chunk + data[iend_offset:])
            self.assertNotEqual(candidate.read_bytes(), original.read_bytes())
            RENDER_PROMPT.validate_style_3_1_anchor(candidate)

    def test_modified_anchor_pixels_fail_closed(self) -> None:
        original = RENDER_PROMPT.hosted_images.resolve_image("assets/style-3.1/anchor-family.png")
        with tempfile.TemporaryDirectory() as temp_dir:
            candidate = Path(temp_dir) / "anchor.png"
            data = bytearray(original.read_bytes())
            idat_offset = data.find(b"IDAT")
            self.assertGreater(idat_offset, 0)
            data[idat_offset + 8] ^= 1
            candidate.write_bytes(data)
            with self.assertRaisesRegex(ValueError, "PNG 校验失败|像素不匹配|像素数据损坏"):
                RENDER_PROMPT.validate_style_3_1_anchor(candidate)

    def test_missing_placeholder_fails_closed(self) -> None:
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "一位妈妈牵着孩子",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("只允许 --text '不加任何文字' 或独立 --title", result.stderr)

    def test_unknown_placeholder_is_rejected(self) -> None:
        result = self.run_renderer(
            "--style",
            "3.1",
            "--subject",
            "一位妈妈牵着孩子",
            "--text",
            "不加任何文字",
            "--var",
            "业务画风=再加粗线稿",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("配方不包含这些占位符", result.stderr)

    def test_minimal_line_renders_without_replacing_fixed_label(self) -> None:
        result = self.run_renderer("--style", "minimal-line", "--var", "N=3", "--var", "分镜列表=准备、工作、休息")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("【最重要·硬性负向约束】", result.stdout)
        self.assertIn("版式:3格", result.stdout)
        self.assertNotIn("【分镜列表】", result.stdout)

    def test_user_text_and_parameter_values_are_not_substituted_again(self) -> None:
        prompt = RENDER_PROMPT.render("【主体】 / 【文字】", {"主体": "写着【文字】的书", "文字": "【加油】"}, None)
        self.assertEqual(prompt, "写着【文字】的书 / 【加油】")
        result = self.run_renderer("--style", "10", "--subject", "一个孩子举起书", "--var", "橙色关键物=书", "--text", "记住【加油】这句话。")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("【加油】", result.stdout)

    def test_optional_stubble_can_be_empty_but_subject_cannot(self) -> None:
        self.assertEqual(RENDER_PROMPT.parse_vars(["胡茬="]), {"胡茬": ""})
        with self.assertRaises(ValueError):
            RENDER_PROMPT.parse_vars(["主体="])

    def test_scene_background_is_expanded_without_rewriting_scene(self) -> None:
        for background in (None, " and loose sketchy green plant strokes"):
            arguments = ["--style", "12", "--subject", "a child", "--var", "构图=waist-up portrait", "--var", "场景=SCENE: pale dry brush【背景元素】.", "--text", "No text anywhere."]
            if background is not None:
                arguments.extend(("--var", f"背景元素={background}"))
            with self.subTest(background=background):
                result = self.run_renderer(*arguments)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertNotIn("【背景元素】", result.stdout)
                self.assertIn("SCENE: pale dry brush and loose sketchy green plant strokes." if background else "SCENE: pale dry brush.", result.stdout)

    def test_menu_contains_all_styles_and_declared_parameters(self) -> None:
        result = self.run_renderer("--list")
        self.assertEqual(result.returncode, 0, result.stderr)
        catalog = json.loads(result.stdout)
        self.assertEqual(len(catalog), 23)
        self.assertEqual(catalog[0]["parameters"], ["N", "分镜列表"])
        self.assertEqual(catalog[3]["style_id"], "3.1")
        self.assertEqual([style["style_id"] for style in catalog][-4:], ["19", "20", "22", "23"])
        for style in catalog:
            with self.subTest(style_id=style["style_id"]):
                self.assertEqual(RENDER_PROMPT.canonical_style_id(style["name"]), style["style_id"])

    def test_removed_style_and_aliases_are_unavailable(self) -> None:
        for style in ("21", "pencil-monologue", "handwritten-monologue", "monologue-card", "手写独白", "彩铅独白", "独白卡", "手写独白彩铅"):
            with self.subTest(style=style):
                result = self.run_renderer("--style", style, "--text", "今天慢一点。")
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")
                self.assertIn("不存在画风", result.stderr)

    def test_paper_folk_json_includes_both_documented_reference_images(self) -> None:
        result = self.run_renderer("--style", "paper-folk", "--subject", "a musician holding a violin", "--var", "构图=centered, waist-up", "--var", "底色=warm ochre-brown", "--var", "点缀元素=one stylized folk cloud", "--format", "json")
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual({Path(reference["path"]).name for reference in payload["references"]}, {"13-paper-folk.png", "13-paper-folk-musician.png"})
        self.assertTrue(all(reference["role"] == "style-only" for reference in payload["references"]))

    def test_missing_paper_folk_reference_is_reported(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.dict(os.environ, {"HAND_DRAWN_IMAGE_CACHE": temp_dir, "HAND_DRAWN_OFFLINE": "1"}):
                with self.assertRaisesRegex(ValueError, "离线缓存缺少有效图片"):
                    RENDER_PROMPT.build_payload("13", "prompt", {"主体": "a musician"}, None, [])

    def test_missing_recipe_does_not_steal_next_style_template(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            styles = Path(temp_dir) / "STYLES.md"
            styles.write_text("## 1. First\nNo recipe.\n## 2. Second\n```\nsecond recipe\n```\n", encoding="utf-8")
            with patch.object(RENDER_PROMPT, "STYLES_PATH", styles):
                with self.assertRaisesRegex(ValueError, "不存在画风 1"):
                    RENDER_PROMPT.extract_template("1")

    def test_missing_catalog_is_a_readable_cli_error(self) -> None:
        with patch.object(RENDER_PROMPT, "STYLES_PATH", Path("/missing-style-catalog/STYLES.md")):
            with patch.object(sys, "argv", ["render_prompt.py", "--list"]):
                self.assertEqual(RENDER_PROMPT.main(), 2)


if __name__ == "__main__":
    unittest.main()
