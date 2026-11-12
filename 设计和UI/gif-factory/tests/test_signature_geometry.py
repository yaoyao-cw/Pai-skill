"""Observable ink behavior, without FFmpeg or a font-name lookup table."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np
from PIL import Image, ImageDraw

SCRIPTS = Path(__file__).resolve().parents[1]/'skills/dynamic-art-signature/scripts'
sys.path.insert(0, str(SCRIPTS))
from ink_geometry import ink_progress, reveal_times, stroke_profile, fragment_defaults
from render_ink_signature import InkAnimation


class SignatureGeometryTests(unittest.TestCase):
    def test_returning_tail_follows_ink_past_right_turn(self):
        im = Image.new('L', (96, 80))
        ImageDraw.Draw(im).line([(15, 15), (75, 15), (75, 60), (15, 60)], 255, 5)
        mask = np.asarray(im)>0
        progress, report = ink_progress(mask, start_point=[15, 15])
        self.assertLess(progress[15, 75], progress[60, 75])
        self.assertLess(progress[60, 75], progress[60, 15])
        self.assertTrue(np.isinf(progress[35, 35]))
        self.assertEqual(report['coverage'], 1.)

    def test_disconnected_accents_do_not_draw_a_connector(self):
        im = Image.new('L', (80, 64))
        draw = ImageDraw.Draw(im)
        draw.line((8, 12, 35, 12), 255, 3)
        draw.line((48, 28, 70, 28), 255, 3)
        mask = np.asarray(im)>0
        times, _, report = reveal_times(mask, .3, .44)
        self.assertEqual(report['components'], 2)
        self.assertTrue(np.isfinite(times[mask]).all())
        self.assertTrue(np.isinf(times[~mask]).all())
        self.assertAlmostEqual(times[mask].max()+report['front_duration'], .44)
        self.assertTrue((times[mask]<.37).any() and (times[mask]>.37).any())

    def test_thin_and_thick_ink_receive_different_parameters(self):
        profiles = []
        for width in [3, 15]:
            im = Image.new('L', (120, 64))
            ImageDraw.Draw(im).line((10, 30, 110, 30), 255, width)
            profiles.append(stroke_profile(np.asarray(im)>0))
        self.assertLess(profiles[0]['median_width_px'], profiles[1]['median_width_px'])
        timing = {'first_start':1.46, 'first_end':1.64}
        thin, thick = [fragment_defaults(p, 960, timing) for p in profiles]
        self.assertGreater(thin['cell_width'], thick['cell_width'])
        self.assertLess(thin['drift'], thick['drift'])
        self.assertLess(thin['rotation'], thick['rotation'])

    def fixture(self, root, effect='ink-fragments', rgba=False):
        bg = (235, 240, 245)
        art = Image.new('RGBA' if rgba else 'RGB', (128, 96),
                        (0, 0, 0, 0) if rgba else bg)
        masks = {}
        lines = {'upper':[(8, 12), (50, 8), (115, 16)],
                 'first':[(14, 36), (14, 68), (42, 48)],
                 'rest':[(55, 38), (65, 67), (85, 48)],
                 'tail':[(85, 73), (115, 73), (115, 85), (80, 85)]}
        colors = {'upper':(10, 20, 30), 'first':(15, 25, 35),
                  'rest':(30, 70, 120), 'tail':(210, 110, 40)}
        draw = ImageDraw.Draw(art)
        for name, points in lines.items():
            mask = Image.new('L', art.size)
            ImageDraw.Draw(mask).line(points, 255, 3)
            mask.save(root/(name+'.png'))
            masks[name] = name+'.png'
            color = colors[name]+(255,) if rgba else colors[name]
            draw.line(points, color, 3)
        art.save(root/'art.png')
        cfg = {'art':'art.png', 'masks':masks, 'background':bg, 'effect':effect}
        config = root/'config.json'
        config.write_text(json.dumps(cfg))
        return config, art, bg

    def test_dark_ink_and_alpha_keep_final_pixels_and_clean_pause(self):
        for alpha in [False, True]:
            with self.subTest(alpha=alpha), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                config, art, bg = self.fixture(root, rgba=alpha)
                a = InkAnimation(config)
                self.assertEqual(a.upper_report['start_source'], 'automatic ink endpoints')
                self.assertEqual(a.tail_report['start_source'], 'nearest body join')
                if alpha:
                    art = Image.alpha_composite(Image.new('RGBA', art.size, (*bg,255)), art).convert('RGB')
                self.assertTrue(np.array_equal(np.asarray(a.frame_at(3.2)), np.asarray(art)))
                pause = np.asarray(a.frame_at(.8))
                self.assertTrue(np.all(pause[~a.masks['upper']]==bg))
                self.assertGreater(len(a.fragments), 0)

    def test_plain_write_does_not_add_particles(self):
        with tempfile.TemporaryDirectory() as temp:
            config, _, _ = self.fixture(Path(temp), effect='write')
            a = InkAnimation(config)
            self.assertEqual(len(a.fragments), 0)
            self.assertFalse(a.masks['rest'].any())
            self.assertTrue(np.isfinite(a.first_times[a.masks['first']]).all())

    def test_user_start_and_timing_override_automatic_defaults(self):
        with tempfile.TemporaryDirectory() as temp:
            config, _, _ = self.fixture(Path(temp))
            cfg = json.loads(config.read_text())
            cfg['upper_pen'] = {'start_point':[115,16]}
            cfg['timing'] = {'upper_start':.1,'upper_end':.24}
            config.write_text(json.dumps(cfg))
            a = InkAnimation(config)
            self.assertEqual(a.upper_report['start_source'], 'configured start')
            self.assertEqual(a.upper_report['start_point'], [115,16])
            self.assertEqual(a.upper_report['start_seconds'], .1)

    def test_overlapping_layers_fail_instead_of_double_inking(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            config, _, _ = self.fixture(root)
            Image.open(root/'upper.png').save(root/'first.png')
            with self.assertRaisesRegex(ValueError, 'overlap'):
                InkAnimation(config)


if __name__ == '__main__':
    unittest.main()
