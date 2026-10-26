#!/usr/bin/env python3
"""Exercise standalone puppet generation without a photo or image cache."""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class ShadowPuppetTests(unittest.TestCase):
    def test_theme_only_json_works_with_empty_offline_cache(self):
        with tempfile.TemporaryDirectory() as cache:
            completed = subprocess.run([sys.executable, "-B", str(ROOT / "scripts/render_prompt.py"), "--style", "shadow-puppet", "--subject", "一把提梁茶壶微微倾斜", "--format", "json"], capture_output=True, text=True, env={**os.environ,"HAND_DRAWN_IMAGE_CACHE":cache,"HAND_DRAWN_OFFLINE":"1"}, check=True)
            payload = json.loads(completed.stdout)
            self.assertEqual(payload["style_id"], "23")
            self.assertEqual(payload["references"], [])
            self.assertEqual(list(Path(cache).rglob("*")), [])
            self.assertEqual(payload["inputs"]["variables"]["文字"], "不加任何文字")
            self.assertNotIn("【", payload["prompt"])

    def test_explicit_palette_text_aspect_and_nonhuman_subject_are_preserved(self):
        completed = subprocess.run([sys.executable, "-B", str(ROOT / "scripts/render_prompt.py"), "--style", "皮影彩染", "--subject", "一座双层飞檐楼阁", "--var", "配色=朱红与橄榄绿", "--text", "夜戏", "--aspect", "4:3", "--format", "json"], capture_output=True, text=True, check=True)
        payload = json.loads(completed.stdout)
        self.assertEqual(payload["inputs"]["aspect"], "4:3")
        for literal in ("一座双层飞檐楼阁", "朱红与橄榄绿", "夜戏", "4:3"):
            self.assertIn(literal, payload["prompt"])

if __name__ == "__main__":
    unittest.main()
