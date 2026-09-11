from io import BytesIO
import wave

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .pitch import PitchDetectionError, detect_pitch

MAX_AUDIO_BYTES = 5 * 1024 * 1024
app = FastAPI(title="Pitch Training Voice API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


def load_pcm_wav(content: bytes) -> tuple[torch.Tensor, int]:
    """ブラウザが生成する16-bit PCM WAVを追加コーデックなしで読み込む。"""
    with wave.open(BytesIO(content), "rb") as wav:
        channels = wav.getnchannels()
        sample_width = wav.getsampwidth()
        sample_rate = wav.getframerate()
        if channels not in {1, 2} or sample_width != 2 or sample_rate < 8_000 or sample_rate > 192_000:
            raise ValueError("対応していないWAV形式です。")
        frames = wav.readframes(wav.getnframes())
    samples = torch.frombuffer(bytearray(frames), dtype=torch.int16).float() / 32768.0
    return samples.reshape(-1, channels).transpose(0, 1), sample_rate


@app.post("/pitch")
async def pitch(audio: UploadFile = File(...)) -> dict[str, float | int | str]:
    if audio.content_type not in {"audio/wav", "audio/x-wav", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="WAV形式の音声を送信してください。")
    content = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="音声ファイルが大きすぎます。")
    try:
        waveform, sample_rate = load_pcm_wav(content)
        duration = waveform.shape[-1] / sample_rate
        if duration > 5:
            raise HTTPException(status_code=422, detail="録音は5秒以内にしてください。")
        return detect_pitch(waveform, sample_rate)
    except PitchDetectionError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=422, detail="WAV音声を読み込めませんでした。") from error
