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
  AnswerMode,
} from './types';
import {
  generateGameQuestions,
  getMaxQuestionsNoDup,
  calculateClosenessScore,
  calculateSpeedBonus,
  calculateStreakBonus,
  createMistakePracticeQuestions,
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
import { SettingsScreen } from './components/SettingsScreen'; 
import { ReferenceToneScreen } from './components/ReferenceToneScreen';
import { CountdownOverlay } from './components/CountdownOverlay';
import { AuditionKeyboard } from './components/AuditionKeyboard';
import { BattleMode } from './components/BattleMode';
import { CoopMode } from './components/CoopMode';
import { VoiceAnswerController } from './components/VoiceAnswerController';

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
  const [answerMode, setAnswerMode] = useState<AnswerMode>('choice');
  // 出題設定: 問題数 + 重複ありなし
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [allowDuplicates, setAllowDuplicates] = useState<boolean>(false);

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

  // Feature 1: pre-question countdown (null = finished/ready, number = ticks left)
  const COUNTDOWN_TICKS = 2;
  const COUNTDOWN_TICK_MS = 800;
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownDoneRef = useRef<number>(-1);

  const currentQuestion = questions[currentQuestionIndex] || null;

  // 1. Start a new game -> First show Reference Tone Screen
  const handleStartGame = useCallback(() => {
    gameId.current = crypto.randomUUID();
    setSaveError(false);
    getAudioContext(); // Resume audio
    const maxNoDup = getMaxQuestionsNoDup(difficulty);
    const safeCount = allowDuplicates
      ? Math.max(1, Math.min(20, numQuestions))
      : Math.max(1, Math.min(maxNoDup, numQuestions));
    const newQuestions = generateGameQuestions(difficulty, safeCount, allowDuplicates);
    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setCumulativeScore(0);
    setCurrentStreak(0);
    setHistory([]);
    setLastRoundResult(null);
    setSelectedNoteChoice(null);
    countdownDoneRef.current = -1;
    setCountdown(null);
    setScreen('reference_tone');
  }, [difficulty, numQuestions, allowDuplicates]);

  const handleStartChoiceGame = useCallback(() => {
    setAnswerMode('choice');
    handleStartGame();
  }, [handleStartGame]);

  const handleStartVoiceGame = useCallback(() => {
    setAnswerMode('voice');
    handleStartGame();
  }, [handleStartGame]);

// Homeに戻る: タイマー停止 + start画面へ
  const handleGoHome = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
    setScreen('start');
  }, []);

  const handleOpenBattle = useCallback(() => {
    setScreen('battle');
  }, []);

  const handleOpenCoop = useCallback(() => {
    setScreen('coop');
  }, []);

  // Transition from Reference Tone Screen to First Question
  const handleProceedToFirstQuestion = useCallback(() => {
    setScreen('playing');
  }, []);

  // 2. Setup each question when index changes or screen becomes 'playing'
  // Feature 1: run a short countdown per question before sounding,
  // so users are not startled by a sudden note.
  useEffect(() => {
    if (screen !== 'playing' || !currentQuestion) return;

    if (countdownDoneRef.current !== currentQuestionIndex) {
      if (countdown === null) {
        setCountdown(COUNTDOWN_TICKS);
        return;
      }
      if (countdown > 0) {
        const t = window.setTimeout(
          () => setCountdown((c) => (c === null ? null : c - 1)),
          COUNTDOWN_TICK_MS
        );
        return () => window.clearTimeout(t);
      }
      countdownDoneRef.current = currentQuestionIndex;
      setCountdown(null);
      return;
    }

    // Reset round states
    setSelectedNoteChoice(null);
    setReplayCount(0);
    setRemainingTime(10.0);
    setIsPlayingSound(answerMode === 'choice');

    // 選択式では音を当て、音声回答では指定された音を参加者が発声する。
    if (answerMode === 'choice') {
      playNoteSound(currentQuestion.targetNote.frequency, 1.4, 'piano');
    }

    // Computer voice narration if enabled
    if (speechNarrationEnabled) {
      speakText(
        answerMode === 'voice'
          ? `第${currentQuestion.questionNumber}問、${currentQuestion.targetNote.nameJa}の音を出してください`
          : `第${currentQuestion.questionNumber}問、この音は何でしょう？`,
        true
      );
    }

    const soundTimer = answerMode === 'choice'
      ? window.setTimeout(() => setIsPlayingSound(false), 1400)
      : null;

    // Start speed countdown
    const startMs = Date.now();
    setQuestionStartTime(startMs);

    if (timerRef.current) clearInterval(timerRef.current);
    // マイク許可とサーバー解析に必要な時間は参加者が制御できないため、
    // 音声回答では自動タイムアウトを適用しない。
    if (answerMode === 'choice') {
      timerRef.current = window.setInterval(() => {
        const elapsedSec = (Date.now() - startMs) / 1000;
        const timeLeft = Math.max(0, 10.0 - elapsedSec);
        setRemainingTime(timeLeft);

        if (timeLeft <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAnswer(currentQuestion.choices[0], 'click', '時間切れ');
        }
      }, 100);
    }

    return () => {
      if (soundTimer !== null) clearTimeout(soundTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, currentQuestionIndex, questions, countdown, answerMode]);

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
      const isTimeout = rawText === '時間切れ';
      const closenessScore = isTimeout ? 0 : closeness.score;
      const speedBonus = !isTimeout && closeness.semitoneDiff <= 2
        ? calculateSpeedBonus(elapsedSec, 10.0)
        : 0;

      // 3. Streak Bonus
      let newStreak = 0;
      let streakBonus = 0;
      // A timeout is always incorrect. The fallback choice is only needed to
      // satisfy the answer shape and must never turn into an accidental success.
      const isExact = !isTimeout && closeness.semitoneDiff === 0;

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
      const roundTotal = closenessScore + speedBonus + streakBonus;
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
        closenessScore,
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

  // 4. Advance to Next Question or Game Over
  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setScreen('playing');
    } else {
      saveCompletedGame();
      setScreen('game_over');
    }
  }, [currentQuestionIndex, questions.length, saveCompletedGame]);

  const handlePracticeMistakes = useCallback(() => {
    const mistakeQuestions = createMistakePracticeQuestions(questions, history);
    if (mistakeQuestions.length === 0) return;

    gameId.current = crypto.randomUUID();
    setSaveError(false);
    getAudioContext();
    setQuestions(mistakeQuestions);
    setCurrentQuestionIndex(0);
    setCumulativeScore(0);
    setCurrentStreak(0);
    setHistory([]);
    setLastRoundResult(null);
    setSelectedNoteChoice(null);
    countdownDoneRef.current = -1;
    setCountdown(null);
    setScreen('reference_tone');
  }, [questions, history]);

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
      if (screen !== 'playing' || !currentQuestion || showHistory || countdown !== null || answerMode === 'voice') return;

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
  }, [screen, currentQuestion, handleAnswer, showHistory, countdown, answerMode]);

  return (
    <div className="min-h-screen bg-moss-50 text-slate-800 flex flex-col font-sans selection:bg-moss-200 selection:text-slate-800">
      {/* Top Navbar */}
      <Navbar
        onOpenHistory={() => setShowHistory(true)}
        onOpenRanking={() => setShowLeaderboard(true)}
        onOpenRules={() => setShowRules(true)}
        speechEnabled={speechNarrationEnabled}
        onToggleSpeech={() => setSpeechNarrationEnabled((prev) => !prev)}
        onGoHome={handleGoHome}
       showHome={screen !== 'start' && screen !== 'settings'}
      />
      {/* Main Game Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center items-center">
        {screen === 'start' && (
          <StartScreen
            difficulty={difficulty}
            onSelectDifficulty={setDifficulty}
            onStartGame={handleStartChoiceGame}
            onStartVoiceGame={handleStartVoiceGame}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            onOpenRules={() => setShowRules(true)}
            onOpenSettings={() => setScreen('settings')}
            onOpenBattle={handleOpenBattle}
            onOpenCoop={handleOpenCoop}
            numQuestions={numQuestions}
            onSelectNumQuestions={setNumQuestions}
            allowDuplicates={allowDuplicates}
            onToggleDuplicates={() => setAllowDuplicates((prev) => !prev)}
          />
        
        )}

          {screen === 'settings' && (
            <SettingsScreen
              difficulty={difficulty}
              onSelectDifficulty={setDifficulty}
              speechEnabled={speechNarrationEnabled}
              onToggleSpeech={() => setSpeechNarrationEnabled((prev) => !prev)}
              answerMode={answerMode}
              onSelectAnswerMode={setAnswerMode}
              onOpenLeaderboard={() => setShowLeaderboard(true)}
              onOpenRules={() => setShowRules(true)}
              onBack={() => setScreen('start')}
            />
          )}
       
        {screen === 'reference_tone' && (
          <ReferenceToneScreen
            onProceedToQuestion={handleProceedToFirstQuestion}
            speechEnabled={speechNarrationEnabled}
          />
        )}

        {screen === 'playing' && currentQuestion && countdown !== null && (
          <CountdownOverlay
            questionNumber={currentQuestion.questionNumber}
            totalQuestions={questions.length}
            count={countdown}
          />
        )}

        {screen === 'playing' && currentQuestion && countdown === null && (
          <div className="w-full space-y-4 animate-in fade-in duration-200">
            {/* Header with question progress, streak, and additive score */}
            <ScoreHeader
              questionNumber={currentQuestion.questionNumber}
              totalQuestions={questions.length}
              currentScore={cumulativeScore}
              streakCount={currentStreak}
            />

            {/* マイク許可・解析待ちは利用者の責任ではないため音声回答は時間無制限 */}
            {answerMode === 'choice' ? (
              <TimerSpeedBar remainingTime={remainingTime} totalTime={10.0} />
            ) : (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-center text-xs font-bold text-indigo-700">
                音声回答は時間無制限です。認識後すぐに正誤を判定します。
              </div>
            )}

            {answerMode === 'voice' ? (
              <>
                <div className="rounded-2xl border border-moss-200 bg-white p-5 text-center shadow-sm">
                  <p className="text-xs font-bold text-slate-500">この音を発声してください</p>
                  <p className="mt-2 text-4xl font-black text-moss-700">{currentQuestion.targetNote.nameJa}</p>
                  <p className="mt-1 text-sm text-slate-500">{currentQuestion.targetNote.nameEn}</p>
                </div>
                <VoiceAnswerController onSelectNote={handleAnswer} disabled={isPlayingSound} />
              </>
            ) : (
              <>
                <SoundPlayerCard targetNote={currentQuestion.targetNote} isPlaying={isPlayingSound} onPlaySound={handlePlayQuestionSound} replayCount={replayCount} />
                <AuditionKeyboard />
                <ChoicesGrid choices={currentQuestion.choices} selectedNote={selectedNoteChoice} onSelect={(note) => handleAnswer(note, 'click')} disabled={isPlayingSound} />
              </>
            )}
          </div>
        )}

        {screen === 'round_result' && lastRoundResult && (
          <RoundResultBreakdown
            result={lastRoundResult}
            currentTotalScore={cumulativeScore}
            onNextQuestion={handleNextQuestion}
            isLastQuestion={currentQuestionIndex === questions.length - 1}
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
            onPracticeMistakes={handlePracticeMistakes}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            answerNotes={history.map((h) => h.chosenNote)}
          />
          </>
        )}

        {screen === 'battle' && (
          <BattleMode
            difficulty={difficulty}
            numQuestions={numQuestions}
            onExit={handleGoHome}
          />
        )}

        {screen === 'coop' && (
          <CoopMode
            difficulty={difficulty}
            numQuestions={numQuestions}
            onExit={handleGoHome}
          />
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
