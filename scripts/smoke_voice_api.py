"""音声解析APIの疎通確認スクリプト（Mac / Windows 共通、標準ライブラリのみ）。

使い方:
    python scripts/smoke_voice_api.py [--url http://127.0.0.1:8000]

440Hz・2秒の正弦波をメモリ上でWAV化して /pitch へPOSTし、
midiNumber == 69（A4）と判定されれば成功（exit 0）。
"""
import argparse
import io
import json
import math
import struct
import sys
import urllib.request
import wave


def make_sine_wav(frequency_hz: float = 440.0, seconds: float = 2.0, sample_rate: int = 16_000) -> bytes:
    buffer = io.BytesIO()
    frames = int(sample_rate * seconds)
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(
            b"".join(
                struct.pack("<h", int(0.5 * 32767 * math.sin(2 * math.pi * frequency_hz * i / sample_rate)))
                for i in range(frames)
            )
        )
    return buffer.getvalue()


def post_multipart(url: str, wav: bytes) -> dict:
    boundary = "----smokeboundary"
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="audio"; filename="answer.wav"\r\n'
        "Content-Type: audio/wav\r\n\r\n"
    ).encode() + wav + f"\r\n--{boundary}--\r\n".encode()
    request = urllib.request.Request(
        url, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    base = args.url.rstrip("/")

    try:
        with urllib.request.urlopen(f"{base}/health", timeout=10) as response:
            health = json.loads(response.read().decode())
    except Exception as error:
        print(f"FAIL: /health に接続できません: {error}")
        print("音声解析APIを先に起動してください（READMEの手順2）。")
        return 1
    if health.get("ok") is not True:
        print(f"FAIL: /health の応答が不正です: {health}")
        return 1
    print(f"OK: /health -> {health}")

    try:
        result = post_multipart(f"{base}/pitch", make_sine_wav())
    except Exception as error:
        print(f"FAIL: /pitch の呼び出しに失敗しました: {error}")
        return 1
    print(f"OK: /pitch -> {result}")
    if result.get("midiNumber") != 69 or result.get("noteName") != "A4":
        print("FAIL: 440HzがA4(midiNumber=69)と判定されませんでした。")
        return 1
    print("PASS: 音声解析APIは正常です。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
