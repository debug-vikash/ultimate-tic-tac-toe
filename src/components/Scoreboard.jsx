import { calculateTotalMatches } from '../gameLogic.js';

export default function Scoreboard({
  sessionStats,
  playerNames = { X: 'Player 1', O: 'Player 2' },
  onOpenResetConfirm,
}) {
  const totalMatches = calculateTotalMatches(sessionStats);
  const xWins = sessionStats?.xWins ?? sessionStats?.p1Wins ?? 0;
  const oWins = sessionStats?.oWins ?? sessionStats?.p2Wins ?? 0;
  const draws = sessionStats?.draws ?? 0;

  const player1Label = `${playerNames.X || 'Player 1'} (X) Victories`;
  const player2Label = `${playerNames.O || 'Player 2'} (O) Victories`;

  return (
    <section className="scoreboard-container" aria-label="Session scoreboard">
      <div className="scoreboard-header">
        <div className="scoreboard-title-wrap">
          <span className="scoreboard-kicker">SESSION SCOREBOARD</span>
          <h2 className="scoreboard-heading">Match Series Tally</h2>
        </div>
        {onOpenResetConfirm && (
          <button
            type="button"
            className="btn-reset-scores"
            onClick={onOpenResetConfirm}
            title="Clear match history and reset session win tally (requires confirmation)"
            aria-label="Clear match history and reset session scores"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Reset Scores</span>
          </button>
        )}
      </div>

      <div className="scoreboard-grid">
        {/* Total Matches */}
        <div className="score-stat-card card-total">
          <div className="stat-card-header">
            <span className="stat-card-label" title="Total Matches">Total Matches</span>
            <span className="stat-card-badge total-badge">ALL</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-number">{totalMatches}</div>
            <div className="stat-card-sub">{totalMatches === 1 ? 'completed game' : 'completed games'}</div>
          </div>
        </div>

        {/* Player 1 (X) Victories */}
        <div className="score-stat-card card-x">
          <div className="stat-card-header">
            <span className="stat-card-label" title={player1Label}>
              {player1Label}
            </span>
            <span className="stat-card-badge x-badge">X</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-number number-x">{xWins}</div>
            <div className="stat-card-sub">{xWins === 1 ? 'victory' : 'victories'}</div>
          </div>
        </div>

        {/* Player 2 (O) Victories */}
        <div className="score-stat-card card-o">
          <div className="stat-card-header">
            <span className="stat-card-label" title={player2Label}>
              {player2Label}
            </span>
            <span className="stat-card-badge o-badge">O</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-number number-o">{oWins}</div>
            <div className="stat-card-sub">{oWins === 1 ? 'victory' : 'victories'}</div>
          </div>
        </div>

        {/* Draws */}
        <div className="score-stat-card card-draws">
          <div className="stat-card-header">
            <span className="stat-card-label" title="Draws">Draws</span>
            <span className="stat-card-badge draw-badge">TIE</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-number number-draw">{draws}</div>
            <div className="stat-card-sub">{draws === 1 ? 'tie match' : 'tie matches'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
