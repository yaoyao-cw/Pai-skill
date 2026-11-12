import importlib.util
from pathlib import Path
import tempfile
import unittest

from PIL import Image, ImageDraw, ImageSequence

spec = importlib.util.spec_from_file_location('lenticular', Path(__file__).parents[1] / 'scripts/export_lenticular.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LenticularExportTest(unittest.TestCase):
    def test_decoded_timing_black_background_and_both_states(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name, color in [('a', 'red'), ('b', 'cyan')]:
                im = Image.new('RGB', (64, 96), 'black')
                draw = ImageDraw.Draw(im)
                draw.rectangle((12, 16, 50, 78), fill=color)
                draw.rectangle((20, 24, 42, 32), fill='white')
                im.save(root / (name + '.png'))
            report = module.export(root / 'a.png', root / 'b.png', root / 'out.gif',
                                   width=64, height=96, footer_height=10)
            with Image.open(root / 'out.gif') as gif:
                frames = [f.convert('RGB') for f in ImageSequence.Iterator(gif)]
                gif.seek(0)
                total = sum(f.info.get('duration', 0) for f in ImageSequence.Iterator(gif))
            self.assertEqual(total, 6000)
            self.assertEqual(report['loop'], 0)
            self.assertLess(report['frames'], 120)  # Long identical holds are merged.
            self.assertTrue(report['fixed_footer'])
            self.assertEqual(report['seam_mean'], 0)
            self.assertTrue(all(f.getpixel((0, 0)) == (0, 0, 0) for f in frames))
            self.assertTrue(any(f.getpixel((30, 50))[0] > 240 for f in frames))
            self.assertTrue(any(f.getpixel((30, 50))[1] > 240 for f in frames))

    def test_wrong_aspect_is_rejected_instead_of_silent_crop(self):
        with tempfile.TemporaryDirectory() as folder:
            image = Path(folder) / 'square.png'
            Image.new('RGB', (96, 96), 'red').save(image)
            with self.assertRaisesRegex(ValueError, 'aspect ratio'):
                module.load_state(image, (64, 96))


if __name__ == '__main__':
    unittest.main()
