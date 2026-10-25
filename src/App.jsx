import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.jsx';
import PlayerPanel from './components/PlayerPanel.jsx';
import Scoreboard from './components/Scoreboard.jsx';
import GameStatusBanner from './components/GameStatusBanner.jsx';
import Board from './components/Board.jsx';
import Controls from './components/Controls.jsx';
import MatchHistory from './components/MatchHistory.jsx';
import RulesModal from './components/RulesModal.jsx';
import ResetConfirmModal from './components/ResetConfirmModal.jsx';
import {
  createInitialState,
  isValidMove,
  makeMove,
  getMiniBoardWinCounts,
  DEFAULT_PLAYER_NAMES,
  INITIAL_SESSION_SCORES,
  validatePlayerName,
  recordMatchResult,
  resetScoresAndHistory,
  formatCompletionTime,
  formatCompletionDate,
} from './gameLogic.js';
import { soundEffects } from './soundEffects.js';
import './App.css';

const PLAYER_NAMES_STORAGE_KEY = 'uttt_player_names_v1';
const SESSION_STORAGE_KEY = 'uttt_session_stats_v1';
const MATCH_HISTORY_STORAGE_KEY = 'uttt_match_history_v1';
const SOUND_STORAGE_KEY = 'uttt_sound_pref_v1';

export default function App() {
  const [gameState, setGameState] = useState(() => createInitialState());
  const [history, setHistory] = useState([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Prevent duplicate match records during re-renders or rapid events
  const recordedMatchIdRef = useRef(null);

  // Player Names
  const [playerNames, setPlayerNames] = useState(() => {
    try {
      const saved = localStorage.getItem(PLAYER_NAMES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.X === 'string' && typeof parsed.O === 'string') {
          return {
            X: validatePlayerName(parsed.X, DEFAULT_PLAYER_NAMES.X),
            O: validatePlayerName(parsed.O, DEFAULT_PLAYER_NAMES.O),
          };
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_PLAYER_NAMES;
  });

  // Session Stats (total completed, X wins, O wins, draws)
  const [sessionStats, setSessionStats] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const xWins = Number(parsed.xWins ?? parsed.p1Wins ?? 0);
        const oWins = Number(parsed.oWins ?? parsed.p2Wins ?? 0);
        const draws = Number(parsed.draws ?? 0);
        return {
          xWins,
          oWins,
          draws,
          p1Wins: xWins,
          p2Wins: oWins,
        };
      }
    } catch {
      // fallback
    }
    return INITIAL_SESSION_SCORES;
  });

  // Match History
  const [matchHistory, setMatchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(MATCH_HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Sound preference
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return true;
  });

  // Persist Player Names to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PLAYER_NAMES_STORAGE_KEY, JSON.stringify(playerNames));
    } catch {
      // ignore
    }
  }, [playerNames]);

  // Persist Session Stats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionStats));
    } catch {
      // ignore
    }
  }, [sessionStats]);

  // Persist Match History to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(MATCH_HISTORY_STORAGE_KEY, JSON.stringify(matchHistory));
    } catch {
      // ignore
    }
  }, [matchHistory]);

  // Persist Sound Setting to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(soundEnabled));
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundEffects.playClick(next);
      return next;
    });
  }, []);

  const handleUpdatePlayerName = useCallback((playerKey, newName) => {
    const defaultName = playerKey === 'X' ? DEFAULT_PLAYER_NAMES.X : DEFAULT_PLAYER_NAMES.O;
    const validated = validatePlayerName(newName, defaultName);
    setPlayerNames((prev) => ({
      ...prev,
      [playerKey]: validated,
    }));
  }, []);

  // Handle cell clicks
  const handleCellClick = useCallback(
    (boardIndex, cellIndex) => {
      if (!isValidMove(gameState, boardIndex, cellIndex)) {
        return;
      }

      const activePlayer = gameState.currentPlayer;
      soundEffects.playMove(activePlayer, soundEnabled);

      // Save state to undo stack
      setHistory((prevHistory) => [...prevHistory, gameState]);

      // Apply move immutably
      const nextState = makeMove(gameState, boardIndex, cellIndex);

      // Check if mini board was newly captured
      const previousBoardStatus = gameState.macroBoard[boardIndex];
      const newBoardStatus = nextState.macroBoard[boardIndex];

      if (previousBoardStatus === null && newBoardStatus !== null) {
        if (nextState.overallWinner) {
          if (nextState.overallWinner === 'T') {
            soundEffects.playDraw(soundEnabled);
          } else {
            soundEffects.playVictory(nextState.overallWinner, soundEnabled);
          }
        } else {
          soundEffects.playMiniWin(newBoardStatus, soundEnabled);
        }
      }

      // Record match exactly once upon conclusion (prevent duplicates via ID ref & pure deduplication)
      if (nextState.overallWinner && recordedMatchIdRef.current !== nextState.gameId) {
        recordedMatchIdRef.current = nextState.gameId;

        const winnerName = nextState.overallWinner === 'T'
          ? 'Draw'
          : (nextState.overallWinner === 'X' ? playerNames.X : playerNames.O);

        const matchData = {
          id: nextState.gameId,
          winner: nextState.overallWinner,
          winnerName,
          playerX: playerNames.X,
          playerO: playerNames.O,
          timestamp: Date.now(),
          completedAt: formatCompletionTime(),
          completedDate: formatCompletionDate(),
          moveCount: nextState.moveCount,
        };

        const result = recordMatchResult(matchHistory, sessionStats, matchData);
        if (result.recorded) {
          setMatchHistory(result.history);
          setSessionStats(result.scores);
        }
      }

      setGameState(nextState);
    },
    [gameState, matchHistory, sessionStats, playerNames, soundEnabled]
  );

  // Restart Game: resets ONLY the current board and starts with X.
  // Does NOT change completed match scores or history.
  const handleRestartGame = useCallback(() => {
    soundEffects.playClick(soundEnabled);
    setGameState(createInitialState());
    setHistory([]);
    recordedMatchIdRef.current = null;
  }, [soundEnabled]);

  // Clear History / Reset Scores: clears history and resets scores.
  // Must NOT accidentally reset an active game.
  const handleConfirmResetScores = useCallback(() => {
    soundEffects.playClick(soundEnabled);
    const reset = resetScoresAndHistory();
    setSessionStats(reset.scores);
    setMatchHistory(reset.history);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(reset.scores));
      localStorage.setItem(MATCH_HISTORY_STORAGE_KEY, JSON.stringify(reset.history));
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  // Undo move
  const handleUndoMove = useCallback(() => {
    if (history.length === 0 || gameState.overallWinner !== null) {
      return;
    }
    soundEffects.playClick(soundEnabled);
    const prevHistory = [...history];
    const previousState = prevHistory.pop();
    setHistory(prevHistory);
    setGameState(previousState);
  }, [history, gameState.overallWinner, soundEnabled]);

  // Keyboard accessibility shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'm' || e.key === 'M') {
        toggleSound();
      } else if (e.key === '?' || e.key === 'h' || e.key === 'H') {
        setIsRulesOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSound]);

  const miniWinCounts = getMiniBoardWinCounts(gameState.macroBoard);
  const isGameActive = gameState.moveCount > 0 && gameState.overallWinner === null;

  return (
    <div className="game-wrapper">
      <div className="game-ambient-glow" aria-hidden="true" />
      <div className="game-container">
        <Header
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onOpenRules={() => setIsRulesOpen(true)}
        />

        <main className="game-main-content">
          <PlayerPanel
            currentPlayer={gameState.currentPlayer}
            miniWinCounts={miniWinCounts}
            sessionStats={sessionStats}
            overallWinner={gameState.overallWinner}
            playerNames={playerNames}
            onUpdatePlayerName={handleUpdatePlayerName}
          />

          <Scoreboard
            sessionStats={sessionStats}
            playerNames={playerNames}
            onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
          />

          <GameStatusBanner
            currentPlayer={gameState.currentPlayer}
            activeBoardIndex={gameState.activeBoardIndex}
            overallWinner={gameState.overallWinner}
            moveCount={gameState.moveCount}
            playerNames={playerNames}
          />

          <Board
            boards={gameState.boards}
            macroBoard={gameState.macroBoard}
            activeBoardIndex={gameState.activeBoardIndex}
            miniWinningLines={gameState.miniWinningLines}
            macroWinningLine={gameState.macroWinningLine}
            overallWinner={gameState.overallWinner}
            lastMove={gameState.lastMove}
            currentPlayer={gameState.currentPlayer}
            onCellClick={handleCellClick}
          />

          <Controls
            onRestartGame={handleRestartGame}
            onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
            onUndoMove={handleUndoMove}
            canUndo={history.length > 0 && gameState.overallWinner === null}
            onOpenRules={() => setIsRulesOpen(true)}
          />

          <MatchHistory
            history={matchHistory}
            onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
          />
        </main>
      </div>

      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmResetScores}
        isGameActive={isGameActive}
      />
    </div>
  );
}
