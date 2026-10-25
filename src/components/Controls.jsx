export default function Controls({
  onRestartGame,
  onNewGame,
  onOpenResetConfirm,
  onUndoMove,
  canUndo,
  onOpenRules,
}) {
  return (
    <footer className="game-controls" aria-label="Game controls">
      <div className="controls-row primary-controls">
        <button
          type="button"
          className="btn btn-restart"
          onClick={onRestartGame}
          title="Restart the current game board while keeping session match scores"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Restart Game</span>
        </button>

        <button
          type="button"
          className="btn btn-new-game btn-reset-action"
          onClick={onOpenResetConfirm || onNewGame}
          title="Reset session scores and match history (requires confirmation)"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span>Reset Scores</span>
        </button>

        <button
          type="button"
          className="btn btn-undo"
          onClick={onUndoMove}
          disabled={!canUndo}
          title={canUndo ? 'Undo the previous move' : 'No moves to undo'}
          aria-disabled={!canUndo}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
          </svg>
          <span>Undo</span>
        </button>
      </div>

      <div className="controls-row secondary-controls">
        <button
          type="button"
          className="btn-text"
          onClick={onOpenRules}
        >
          <span>📖 View Rules & How to Play</span>
        </button>
      </div>
    </footer>
  );
}
