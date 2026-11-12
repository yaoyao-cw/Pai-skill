import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location('review_gif', Path(__file__).parents[1]/'scripts/review_gif.py')
review_gif = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review_gif)


class ReviewGate(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.gif = self.root/'sample.gif'
        frames = []
        for x in [24, 32]:
            image = Image.new('RGBA', (96, 96))
            ImageDraw.Draw(image).rectangle((x, 20, x+30, 70), fill='#CC5577')
            frames.append(image)
        frames[0].save(self.gif, save_all=True, append_images=frames[1:],
                       duration=[80, 120], disposal=2, loop=0)
        self.folder = self.root/'review'
        self.report = review_gif.audit(self.gif, self.folder, [10, 10, 80, 80])
        self.review_path = self.folder/'review.json'

    def approve(self):
        record = json.loads(self.review_path.read_text())
        record.update(reviewer='test-only reviewer', playback='pass', loop_seam='pass')
        for frame in record['frames']:
            frame['decision'] = 'pass'
        self.review_path.write_text(json.dumps(record))
        return record

    def check(self):
        return review_gif.check_review(self.folder/'audit.json', self.review_path, self.gif)

    def test_extract_preserves_actual_timing_and_starts_pending(self):
        self.assertEqual(self.report['durations_ms'], [80, 120])
        self.assertTrue((self.folder/'frame-001.png').is_file())
        self.assertTrue((self.folder/'focus.png').is_file())
        with self.assertRaisesRegex(ValueError, 'incomplete'):
            self.check()

    def test_assistant_review_does_not_claim_user_acceptance(self):
        self.approve()
        self.assertEqual(self.check()['user_acceptance'], 'pending')

    def test_duplicate_frame_decisions_cannot_replace_missing_frames(self):
        record = self.approve()
        record['frames'][1]['index'] = 0
        self.review_path.write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, 'exactly once'):
            self.check()

    def test_rejected_frame_blocks_review(self):
        record = self.approve()
        record['frames'][1].update(decision='repair', issues=['malformed hand'])
        self.review_path.write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, 'rejected'):
            self.check()

    def test_changed_deliverable_invalidates_previous_signoff(self):
        self.approve()
        self.gif.write_bytes(self.gif.read_bytes()+b'changed revision')
        with self.assertRaisesRegex(ValueError, 'changed after extraction'):
            self.check()
        review_gif.audit(self.gif, self.folder)
        reset = json.loads(self.review_path.read_text())
        self.assertEqual(reset['playback'], 'pending')
        self.assertTrue(all(f['decision'] == 'pending' for f in reset['frames']))

    def test_invalid_focus_does_not_silently_crop_face(self):
        with self.assertRaisesRegex(ValueError, 'Focus box'):
            review_gif.audit(self.gif, self.root/'bad-focus', [-4, 0, 50, 50])


if __name__ == '__main__':
    unittest.main()
