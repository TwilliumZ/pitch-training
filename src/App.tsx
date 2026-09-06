/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameDifficulty,
  GameQuestion,
  GameScreen,
  NoteInfo,
  AnswerResult,
} from './types';
import {
  generateGameQuestions,
  calculateClosenessScore,
  calculateSpeedBonus,
  calculateStreakBonus,
} from './utils/notesData';
import {
  playNoteSound,
  playSuccessChime,
  playNearMissChime,
  playComboStreakSound,
  getAudioContext,
} from './utils/audioSynthesizer';
import { speakText } from './utils/voiceManager';
import { saveResult } from './utils/resultStorage';
import { ResultHistoryModal } from './components/ResultHistoryModal';
import { Navbar } from './components/Navbar';
import { ScoreHeader } from './components/ScoreHeader';
import { SoundPlayerCard } from './components/SoundPlayerCard';
import { TimerSpeedBar } from './components/TimerSpeedBar';
import { ChoicesGrid } from './components/ChoicesGrid';
import { RoundResultBreakdown } from './components/RoundResultBreakdown';
import { GameOverModal } from './components/GameOverModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { RulesModal } from './components/RulesModal';
import { StartScreen } from './components/StartScreen';
import { ReferenceToneScreen } from './components/ReferenceToneScreen';

export default function App() {
  const [showHistory, setShowHistory] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const gameId = useRef('');
  // Screen & Modals
  const [screen, setScreen] = useState<GameScreen>('start');
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [speechNarrationEnabled, setSpeechNarrationEnabled] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('standard');

  // Game Progress State
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [cumulativeScore, setCumulativeScore] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [history, setHistory] = useState<AnswerResult[]>([]);
  const [lastRoundResult, setLastRoundResult] = useState<AnswerResult | null>(null);

  // Question Playback & Timer State
  const [isPlayingSound, setIsPlayingSound] = useState<boolean>(false);
  const [replayCount, setReplayCount] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(10.0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [selectedNoteChoice, setSelectedNoteChoice] = useState<NoteInfo | null>(null);

  // Timer interval ref
  const timerRef = useRef<number | null>(null);

  const currentQuestion = questions[currentQuestionIndex] || null;

  // 1. Start a new 5-question game -> First show Reference Tone Screen
  const handleStartGame = useCallback(() => {
    gameId.current = crypto.randomUUID();
    setSaveError(false);
    getAudioContext(); // Resume audio
    const newQuestions = generateGameQuestions(difficulty);
    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setCumulativeScore(0);
    setCurrentStreak(0);
    setHistory([]);
    setLastRoundResult(null);
    setSelectedNoteChoice(null);
    setScreen('reference_tone');
  }, [difficulty]);

// Homeに戻る: タイマー停止 + start画面へ
  const handleGoHome = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setScreen('start');
  }, []);

  // Transition from Reference Tone Screen to First Question
  const handleProceedToFirstQuestion = useCallback(() => {
    setScreen('playing');
  }, []);

  // 2. Setup each question when index changes or screen becomes 'playing'
  useEffect(() => {
    if (screen !== 'playing' || !currentQuestion) return;

    // Reset round states
    setSelectedNoteChoice(null);
    setReplayCount(0);
    setRemainingTime(10.0);
    setIsPlayingSound(true);

    // Play computer audio for question
    const targetFreq = currentQuestion.targetNote.frequency;
    playNoteSound(targetFreq, 1.4, 'piano');

    // Computer voice narration if enabled
    if (speechNarrationEnabled) {
      speakText(`第${currentQuestion.questionNumber}問、この音は何でしょう？`, true);
    }

    const soundTimer = setTimeout(() => {
      setIsPlayingSound(false);
    }, 1400);

    // Start speed countdown
    const startMs = Date.now();
    setQuestionStartTime(startMs);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const elapsedSec = (Date.now() - startMs) / 1000;
      const timeLeft = Math.max(0, 10.0 - elapsedSec);
      setRemainingTime(timeLeft);

      if (timeLeft <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        // Timeout: auto-submit with timeout
        handleAnswer(currentQuestion.choices[0], 'click', '時間切れ');
      }
    }, 100);

    return () => {
      clearTimeout(soundTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, currentQuestionIndex, questions]);

  // 3. Handle Answer Submission (from voice recognition or click)
  const handleAnswer = useCallback(
    (
      chosenNote: NoteInfo,
      answeredVia: 'voice_speech' | 'voice_singing' | 'click',
      rawText?: string
    ) => {
      if (screen !== 'playing' || !currentQuestion) return;

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const elapsedSec = Math.min(10.0, Math.max(0.2, (Date.now() - questionStartTime) / 1000));
      setSelectedNoteChoice(chosenNote);

      // Scoring formulas:
      // 1. Closeness Score
      const closeness = calculateClosenessScore(currentQuestion.targetNote, chosenNote);

      // 2. Speed Bonus (only rewarded if semitone diff is within 2)
      const speedBonus = closeness.semitoneDiff <= 2 ? calculateSpeedBonus(elapsedSec, 10.0) : 0;

      // 3. Streak Bonus
      let newStreak = 0;
      let streakBonus = 0;
      const isExact = closeness.semitoneDiff === 0;

      if (isExact) {
        newStreak = currentStreak + 1;
        streakBonus = calculateStreakBonus(newStreak);
      } else if (closeness.semitoneDiff === 1) {
        // Near-miss preserves streak without increasing
        newStreak = currentStreak;
        streakBonus = 0;
      } else {
        // Reset streak
        newStreak = 0;
        streakBonus = 0;
      }

      // Additive total
      const roundTotal = closeness.score + speedBonus + streakBonus;
      const updatedTotalScore = cumulativeScore + roundTotal;

      // Audio feedback chime
      if (isExact) {
        if (newStreak >= 2) {
          playComboStreakSound(newStreak);
        } else {
          playSuccessChime(true);
        }
      } else if (closeness.semitoneDiff === 1) {
        playNearMissChime();
      }

      const result: AnswerResult = {
        questionNumber: currentQuestion.questionNumber,
        targetNote: currentQuestion.targetNote,
        chosenNote,
        semitoneDiff: closeness.semitoneDiff,
        closenessScore: closeness.score,
        speedBonus,
        streakBonus,
        totalRoundScore: roundTotal,
        timeTakenSec: elapsedSec,
        isExact,
        streakCountAfter: newStreak,
        answeredVia,
        rawInputText: rawText,
      };

      setCumulativeScore(updatedTotalScore);
      setCurrentStreak(newStreak);
      setHistory((prev) => [...prev, result]);
      setLastRoundResult(result);
      setScreen('round_result');
    },
    [screen, currentQuestion, questionStartTime, currentStreak, cumulativeScore]
  );

  const saveCompletedGame = useCallback(() => {
    try {
      saveResult(gameId.current, difficulty, cumulativeScore, history);
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [difficulty, cumulativeScore, history]);

  // 4. Advance to Next Question or Game Over (after 5 questions)
  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < 4) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setScreen('playing');
    } else {
      saveCompletedGame();
      setScreen('game_over');
    }
  }, [currentQuestionIndex, saveCompletedGame]);

  // 5. Sound replay handler
  const handlePlayQuestionSound = () => {
    if (!currentQuestion) return;
    setIsPlayingSound(true);
    setReplayCount((prev) => prev + 1);
    playNoteSound(currentQuestion.targetNote.frequency, 1.4, 'piano');
    setTimeout(() => {
      setIsPlayingSound(false);
    }, 1400);
  };

  // Keyboard shortcut listener (1, 2, 3, 4 for choices, R for replay)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing' || !currentQuestion || showHistory) return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handlePlayQuestionSound();
        return;
      }

      const keyIndex = parseInt(e.key, 10);
      if (keyIndex >= 1 && keyIndex <= currentQuestion.choices.length) {
        e.preventDefault();
        handleAnswer(currentQuestion.choices[keyIndex - 1], 'click');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, currentQuestion, handleAnswer, showHistory]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenHistory={() => setShowHistory(true)}
        onOpenRanking={() => setShowLeaderboard(true)}
        onOpenRules={() => setShowRules(true)}
        speechEnabled={speechNarrationEnabled}
        onToggleSpeech={() => setSpeechNarrationEnabled((prev) => !prev)}
        onGoHome={handleGoHome}
        showHome={screen !== 'start'}
      />
      {/* Main Game Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center items-center">
        {screen === 'start' && (
          <StartScreen
            difficulty={difficulty}
            onSelectDifficulty={setDifficulty}
            onStartGame={handleStartGame}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            onOpenRules={() => setShowRules(true)}
          />
        )}

        {screen === 'reference_tone' && (
          <ReferenceToneScreen
            onProceedToQuestion={handleProceedToFirstQuestion}
            speechEnabled={speechNarrationEnabled}
          />
        )}

        {screen === 'playing' && currentQuestion && (
          <div className="w-full space-y-4 animate-in fade-in duration-200">
            {/* Header with question progress, streak, and additive score */}
            <ScoreHeader
              questionNumber={currentQuestion.questionNumber}
              totalQuestions={5}
              currentScore={cumulativeScore}
              streakCount={currentStreak}
            />

            {/* Timer and speed bonus preview */}
            <TimerSpeedBar remainingTime={remainingTime} totalTime={10.0} />

            {/* Computer sound question player card */}
            <SoundPlayerCard
              targetNote={currentQuestion.targetNote}
              isPlaying={isPlayingSound}
              onPlaySound={handlePlayQuestionSound}
              replayCount={replayCount}
            />

            {/* Choices Grid (4 choices to select directly by clicking/tapping or 1-4 keys) */}
            <ChoicesGrid
              choices={currentQuestion.choices}
              selectedNote={selectedNoteChoice}
              onSelect={(note) => handleAnswer(note, 'click')}
              disabled={isPlayingSound}
            />
          </div>
        )}

        {screen === 'round_result' && lastRoundResult && (
          <RoundResultBreakdown
            result={lastRoundResult}
            currentTotalScore={cumulativeScore}
            onNextQuestion={handleNextQuestion}
            isLastQuestion={currentQuestionIndex === 4}
          />
        )}

        {screen === 'game_over' && (
          <>
          <div className="mb-4 text-center text-sm" role="status">
            {saveError ? <>履歴を保存できませんでした。<button onClick={saveCompletedGame} className="ml-2 underline text-amber-300">再試行</button></> : <span className="text-emerald-300">採点結果を保存しました。</span>}
            <button onClick={() => setShowHistory(true)} className="ml-3 underline text-indigo-300">学習履歴・グラフを見る</button>
          </div>
          <GameOverModal
            difficulty={difficulty}
            totalScore={cumulativeScore}
            history={history}
            onRestart={handleStartGame}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
          />
          </>
        )}
      </main>

      {/* Modals */}
      {showHistory && <ResultHistoryModal onClose={() => setShowHistory(false)} />}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
