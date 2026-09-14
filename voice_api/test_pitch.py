import math
import io
import struct
import unittest
import wave

import torch

from voice_api.pitch import PitchDetectionError, detect_pitch
from voice_api.main import load_pcm_wav


class PitchDetectionTest(unittest.TestCase):
    def test_detects_a4_sine_wave(self) -> None:
        sample_rate = 16_000
        time = torch.arange(sample_rate * 2) / sample_rate
        waveform = 0.2 * torch.sin(2 * math.pi * 440 * time)
        result = detect_pitch(waveform, sample_rate)
        self.assertEqual(result["midiNumber"], 69)
        self.assertEqual(result["noteName"], "A4")
        self.assertAlmostEqual(result["frequencyHz"], 440, delta=5)

    def test_detects_low_c3_voice_range(self) -> None:
        sample_rate = 16_000
        time = torch.arange(sample_rate * 2) / sample_rate
        waveform = 0.2 * torch.sin(2 * math.pi * 130.81 * time)
        result = detect_pitch(waveform, sample_rate)
        self.assertEqual(result["midiNumber"], 48)
        self.assertEqual(result["noteName"], "C3")

    def test_ignores_leading_silence_before_voice(self) -> None:
        sample_rate = 16_000
        silence = torch.zeros(int(sample_rate * 0.8))
        time = torch.arange(int(sample_rate * 0.8)) / sample_rate
        voice = 0.12 * torch.sin(2 * math.pi * 220 * time)
        result = detect_pitch(torch.cat((silence, voice)), sample_rate)
        self.assertEqual(result["midiNumber"], 57)
        self.assertEqual(result["noteName"], "A3")

    def test_rejects_silence(self) -> None:
        with self.assertRaises(PitchDetectionError):
            detect_pitch(torch.zeros(16_000), 16_000)

    def test_loads_browser_compatible_pcm_wav(self) -> None:
        output = io.BytesIO()
        with wave.open(output, "wb") as wav:
            wav.setparams((1, 2, 16_000, 16_000, "NONE", ""))
            wav.writeframes(b"".join(struct.pack("<h", int(4_000 * math.sin(2 * math.pi * 440 * i / 16_000))) for i in range(16_000)))
        waveform, sample_rate = load_pcm_wav(output.getvalue())
        self.assertEqual(waveform.shape, (1, 16_000))
        self.assertEqual(sample_rate, 16_000)


if __name__ == "__main__":
    unittest.main()
