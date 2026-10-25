export default function Header({ soundEnabled, onToggleSound, onOpenRules }) {
  return (
    <header className="game-header">
      <div className="header-top-bar">
        <div className="header-tag">LOCAL 2-PLAYER BATTLE</div>
        <div className="header-actions">
          <button
            type="button"
            className={`action-btn ${soundEnabled ? 'active' : ''}`}
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute sound (M)' : 'Unmute sound (M)'}
            aria-label={soundEnabled ? 'Mute audio feedback' : 'Enable audio feedback'}
          >
            {soundEnabled ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
            <span className="btn-label">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>

          <button
            type="button"
            className="action-btn"
            onClick={onOpenRules}
            title="How to play Ultimate Tic-Tac-Toe"
            aria-label="View game rules and instructions"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="btn-label">Rules</span>
          </button>
        </div>
      </div>

      <h1 className="game-title">
        <span className="title-ultimate">ULTIMATE</span>{' '}
        <span className="title-tictactoe">TIC-TAC-TOE</span>
      </h1>
      <p className="game-subtitle">
        Win mini-boards to claim the macro grid. Each move directs where your opponent plays next!
      </p>
    </header>
  );
}
