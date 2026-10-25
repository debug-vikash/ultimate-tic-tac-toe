import { useState } from 'react';
import { validatePlayerName } from '../gameLogic.js';

export default function PlayerPanel({
  currentPlayer,
  miniWinCounts,
  sessionStats,
  overallWinner,
  playerNames = { X: 'Player 1', O: 'Player 2' },
  onUpdatePlayerName,
}) {
  const isXTurn = currentPlayer === 'X' && overallWinner === null;
  const isOTurn = currentPlayer === 'O' && overallWinner === null;

  const [editingPlayer, setEditingPlayer] = useState(null); // 'X' | 'O' | null
  const [nameInput, setNameInput] = useState('');

  const handleStartEdit = (playerKey) => {
    setEditingPlayer(playerKey);
    setNameInput(playerNames[playerKey] || (playerKey === 'X' ? 'Player 1' : 'Player 2'));
  };

  const handleSaveEdit = (playerKey) => {
    if (onUpdatePlayerName) {
      const defaultName = playerKey === 'X' ? 'Player 1' : 'Player 2';
      const cleanName = validatePlayerName(nameInput, defaultName);
      onUpdatePlayerName(playerKey, cleanName);
    }
    setEditingPlayer(null);
  };

  const handleCancelEdit = () => {
    setEditingPlayer(null);
  };

  const handleKeyDown = (e, playerKey) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(playerKey);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const xWins = sessionStats?.xWins ?? sessionStats?.p1Wins ?? 0;
  const oWins = sessionStats?.oWins ?? sessionStats?.p2Wins ?? 0;
  const draws = sessionStats?.draws ?? 0;

  return (
    <section className="players-container" aria-label="Player status and scores">
      {/* Player 1 (X) Card */}
      <div
        className={`player-card player-x ${isXTurn ? 'active-turn' : ''} ${
          overallWinner === 'X' ? 'winner-card' : ''
        }`}
      >
        <div className="player-indicator-ring">
          <div className="player-avatar-symbol x-symbol">
            <span>X</span>
          </div>
          {isXTurn && <span className="turn-pulse-dot" />}
        </div>
        <div className="player-info">
          <div className="player-name-row">
            {editingPlayer === 'X' ? (
              <div className="player-name-edit-form">
                <input
                  type="text"
                  className="player-name-input input-x"
                  value={nameInput}
                  maxLength={20}
                  autoFocus
                  aria-label="Edit Player X name"
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'X')}
                  onBlur={() => handleSaveEdit('X')}
                />
                <button
                  type="button"
                  className="btn-name-action btn-name-save"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSaveEdit('X');
                  }}
                  title="Save name"
                  aria-label="Save Player X name"
                >
                  ✓
                </button>
              </div>
            ) : (
              <div className="player-name-display-wrap">
                <span
                  className="player-name"
                  title="Click to edit name"
                  onClick={() => handleStartEdit('X')}
                >
                  {playerNames.X}
                </span>
                <button
                  type="button"
                  className="btn-edit-pencil"
                  onClick={() => handleStartEdit('X')}
                  title={`Edit ${playerNames.X} name`}
                  aria-label={`Edit ${playerNames.X} name`}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}
            <span className="player-mark-badge x-badge">X</span>
          </div>
          <div className="player-stats-row" aria-label={`Stats: ${miniWinCounts.xWins} mini-boards, ${xWins} match wins`}>
            <span className="stat-item" title="Mini-boards captured in this game">
              <span className="stat-label">
                <span className="stat-label-full">Boards</span>
                <span className="stat-label-short">Boards:</span>
              </span>
              <strong className="stat-value">{miniWinCounts.xWins}</strong>
            </span>
            <span className="stat-divider" aria-hidden="true">•</span>
            <span className="stat-item" title="Match victories in this session">
              <span className="stat-label">
                <span className="stat-label-full">Match Wins</span>
                <span className="stat-label-short">Wins:</span>
              </span>
              <strong className="stat-value">{xWins}</strong>
            </span>
          </div>
        </div>
        {isXTurn && <div className="turn-tag">YOUR TURN</div>}
        {overallWinner === 'X' && <div className="victory-tag">WINNER</div>}
      </div>

      {/* Center Match Stats / VS */}
      <div className="match-center-badge">
        <span className="vs-text">VS</span>
        <div className="session-draws" title="Tied matches in this session">
          <span className="draw-count">{draws}</span>
          <span className="draw-label">{draws === 1 ? 'Draw' : 'Draws'}</span>
        </div>
      </div>

      {/* Player 2 (O) Card */}
      <div
        className={`player-card player-o ${isOTurn ? 'active-turn' : ''} ${
          overallWinner === 'O' ? 'winner-card' : ''
        }`}
      >
        <div className="player-indicator-ring">
          <div className="player-avatar-symbol o-symbol">
            <span>O</span>
          </div>
          {isOTurn && <span className="turn-pulse-dot" />}
        </div>
        <div className="player-info">
          <div className="player-name-row">
            {editingPlayer === 'O' ? (
              <div className="player-name-edit-form">
                <input
                  type="text"
                  className="player-name-input input-o"
                  value={nameInput}
                  maxLength={20}
                  autoFocus
                  aria-label="Edit Player O name"
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'O')}
                  onBlur={() => handleSaveEdit('O')}
                />
                <button
                  type="button"
                  className="btn-name-action btn-name-save"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSaveEdit('O');
                  }}
                  title="Save name"
                  aria-label="Save Player O name"
                >
                  ✓
                </button>
              </div>
            ) : (
              <div className="player-name-display-wrap">
                <span
                  className="player-name"
                  title="Click to edit name"
                  onClick={() => handleStartEdit('O')}
                >
                  {playerNames.O}
                </span>
                <button
                  type="button"
                  className="btn-edit-pencil"
                  onClick={() => handleStartEdit('O')}
                  title={`Edit ${playerNames.O} name`}
                  aria-label={`Edit ${playerNames.O} name`}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}
            <span className="player-mark-badge o-badge">O</span>
          </div>
          <div className="player-stats-row" aria-label={`Stats: ${miniWinCounts.oWins} mini-boards, ${oWins} match wins`}>
            <span className="stat-item" title="Mini-boards captured in this game">
              <span className="stat-label">
                <span className="stat-label-full">Boards</span>
                <span className="stat-label-short">Boards:</span>
              </span>
              <strong className="stat-value">{miniWinCounts.oWins}</strong>
            </span>
            <span className="stat-divider" aria-hidden="true">•</span>
            <span className="stat-item" title="Match victories in this session">
              <span className="stat-label">
                <span className="stat-label-full">Match Wins</span>
                <span className="stat-label-short">Wins:</span>
              </span>
              <strong className="stat-value">{oWins}</strong>
            </span>
          </div>
        </div>
        {isOTurn && <div className="turn-tag">YOUR TURN</div>}
        {overallWinner === 'O' && <div className="victory-tag">WINNER</div>}
      </div>
    </section>
  );
}
