import React, { useEffect, useRef } from 'react';
import { getAudioContext } from '../utils/audioSynthesizer';

interface BgmLoopPlayerProps {
  /**
   * ループするメロディー（周波数の配列）。
   * 省略時は穏やかな五音階ループを使う（対戦モード用）。
   * 協力モードでは協力メロディーの周波数列を渡す。
   */
  melodyFreqs?: number[];
  /** 1音の間隔（秒） */
  stepSec?: number;
  /** マスター音量（0〜1。小さめ推奨） */
  volume?: number;
}

/** 既定BGM: Cメジャーペンタトニックの穏やかな往復フレーズ */
const DEFAULT_MELODY_FREQS = [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66];

/**
 * BGMループを開始し、停止関数を返す（機能3の再生エンジン）。
 * 既存の getAudioContext を再利用する。共有コンテキストは閉じない。
 */
export function startBgmLoop(freqs: number[], stepSec = 0.45, volume = 0.05): () => void {
  let stopped = false;
  let timer: number | null = null;
  let master: GainNode | null = null;

  try {
    const ctx = getAudioContext();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);

    let step = 0;
    let nextTime = ctx.currentTime + 0.1;
    const masterNode: GainNode = master;

    const tick = () => {
      if (stopped) return;
      const ahead = ctx.currentTime + 0.6;
      while (nextTime < ahead) {
        const freq = freqs[step % freqs.length];
        const at = nextTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, at);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(1.0, at + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, at + stepSec * 1.8);
        osc.connect(g);
        g.connect(masterNode);
        osc.start(at);
        osc.stop(at + stepSec * 2);
        nextTime += stepSec;
        step += 1;
      }
    };

    timer = window.setInterval(tick, 200);
    tick();
  } catch {
    // 音声初期化に失敗してもゲームは続行する
  }

  return () => {
    stopped = true;
    if (timer !== null) window.clearInterval(timer);
    const m = master;
    if (!m) return;
    try {
      const ctx = getAudioContext();
      m.gain.cancelScheduledValues(ctx.currentTime);
      m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
      m.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      window.setTimeout(() => {
        try {
          m.disconnect();
        } catch {
          // 切断時の誤差は無視する
        }
      }, 400);
    } catch {
      // 停止時の誤差は無視する
    }
  };
}

/**
 * 描画なしのBGMプレイヤー（機能3）。
 * マウント中にループ再生し、アンマウント時（問題画面の離脱時）に確実に停止する。
 */
export const BgmLoopPlayer: React.FC<BgmLoopPlayerProps> = ({
  melodyFreqs,
  stepSec = 0.45,
  volume = 0.05,
}) => {
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    stopRef.current?.();
    stopRef.current = startBgmLoop(melodyFreqs ?? DEFAULT_MELODY_FREQS, stepSec, volume);
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [melodyFreqs, stepSec, volume]);

  return null;
};
