import math

import torch
import torchaudio

MIN_RMS = 0.008
# 成人の一般的な低声から高声までを含める。狭すぎる下限は
# torchaudio に基音ではなく倍音を選ばせ、低い声を誤認させる。
MIN_FREQUENCY_HZ = 70.0
MAX_FREQUENCY_HZ = 1_000.0


class PitchDetectionError(ValueError):
    """利用可能な音高を音声から検出できなかった場合。"""


def frequency_to_midi(frequency_hz: float) -> int:
    return round(69 + 12 * math.log2(frequency_hz / 440.0))


def midi_to_name(midi_number: int) -> str:
    names = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
    return f"{names[midi_number % 12]}{midi_number // 12 - 1}"


def detect_pitch(waveform: torch.Tensor, sample_rate: int) -> dict[str, float | int | str]:
    if waveform.ndim == 2:
        waveform = waveform.mean(dim=0)
    waveform = waveform.float().flatten()
    if waveform.numel() < sample_rate // 4:
        raise PitchDetectionError("録音が短すぎます。1秒ほど声を伸ばしてください。")
    waveform = waveform - waveform.mean()
    rms = waveform.square().mean().sqrt().item()
    if rms < MIN_RMS:
        raise PitchDetectionError("声を検出できませんでした。マイクに近づいて発声してください。")

    # ボタンを押してから発声するまでの無音を除く。無音を含むまま自己相関へ
    # 渡すと、境界を高い倍音として誤検出することがある。
    frame_size = max(1, sample_rate // 50)
    frame_count = waveform.numel() // frame_size
    if frame_count:
        frames = waveform[: frame_count * frame_size].reshape(frame_count, frame_size)
        frame_rms = frames.square().mean(dim=1).sqrt()
        active_threshold = max(MIN_RMS, float(frame_rms.max().item()) * 0.15)
        active_indices = torch.nonzero(frame_rms >= active_threshold).flatten()
        if active_indices.numel():
            start = max(0, int(active_indices[0].item()) - 1) * frame_size
            end = min(frame_count, int(active_indices[-1].item()) + 2) * frame_size
            waveform = waveform[start:end]
        if waveform.numel() < sample_rate // 4:
            raise PitchDetectionError("声が短すぎます。一定の高さで1秒ほど発声してください。")

    target_rate = 16_000
    if sample_rate != target_rate:
        waveform = torchaudio.functional.resample(waveform, sample_rate, target_rate)
        sample_rate = target_rate
    # FFTの卓越周波数で探索帯域を絞る。torchaudio のNCCFを70〜1000Hzの
    # 全域で一度に探索すると、周期の整数倍を基音として選ぶことがある。
    windowed = waveform * torch.hann_window(waveform.numel(), device=waveform.device)
    spectrum = torch.fft.rfft(windowed).abs()
    frequencies = torch.fft.rfftfreq(waveform.numel(), 1 / sample_rate)
    spectral_band = (frequencies >= MIN_FREQUENCY_HZ) & (frequencies <= MAX_FREQUENCY_HZ)
    dominant_frequency = float(frequencies[spectral_band][spectrum[spectral_band].argmax()].item())
    search_low = max(MIN_FREQUENCY_HZ, dominant_frequency * 0.5)
    search_high = min(MAX_FREQUENCY_HZ, max(dominant_frequency * 2.0, search_low * 2.1))

    pitches = torchaudio.functional.detect_pitch_frequency(
        waveform.unsqueeze(0), sample_rate, frame_time=0.02,
        freq_low=search_low, freq_high=search_high,
    ).flatten()
    valid = pitches[(pitches >= search_low) & (pitches <= search_high)]
    if valid.numel() < 5:
        raise PitchDetectionError("安定した音程を検出できませんでした。一定の高さで発声してください。")
    frequency = float(valid.median().item())
    cents = 1200 * torch.log2(valid / frequency).abs()
    stability = max(0.0, 1.0 - float(cents.median().item()) / 100.0)
    loudness = min(1.0, rms / 0.05)
    confidence = round(stability * 0.8 + loudness * 0.2, 3)
    midi_number = frequency_to_midi(frequency)
    return {
        "frequencyHz": round(frequency, 2),
        "midiNumber": midi_number,
        "noteName": midi_to_name(midi_number),
        "confidence": confidence,
    }
