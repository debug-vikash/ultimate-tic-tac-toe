export default function MatchHistory({
  history = [],
  onOpenResetConfirm,
}) {
  const recentMatches = history.slice(0, 5);

  return (
    <section className="history-container" aria-label="Recent match history">
      <div className="history-header">
        <div className="history-title-wrap">
          <span className="history-kicker">MATCH LOG</span>
          <h2 className="history-heading">Recent Matches</h2>
        </div>
        <div className="history-header-actions">
          <span className="history-count-badge">
            {history.length} {history.length === 1 ? 'match recorded' : 'matches recorded'}
          </span>
          {history.length > 0 && onOpenResetConfirm && (
            <button
              type="button"
              className="btn-clear-history"
              onClick={onOpenResetConfirm}
              title="Clear history and reset match scores"
              aria-label="Clear match history"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {recentMatches.length === 0 ? (
        <div className="history-empty-state">
          <p className="empty-primary">No completed matches yet</p>
          <p className="empty-secondary">
            Finish a game to log the winner, matchup, and completion time.
          </p>
        </div>
      ) : (
        <ul className="history-list" aria-label="List of recent completed matches">
          {recentMatches.map((match, idx) => {
            const isXWinner = match.winner === 'X';
            const isOWinner = match.winner === 'O';
            const isDraw = match.winner === 'T';
            const matchNumber = history.length - idx;

            let outcomeClass = 'history-item';
            if (isXWinner) outcomeClass += ' match-x-won';
            else if (isOWinner) outcomeClass += ' match-o-won';
            else outcomeClass += ' match-draw';

            return (
              <li key={match.id || `match-${idx}`} className={outcomeClass}>
                <div className="match-status-badge-wrap">
                  {isXWinner && (
                    <span className="match-badge badge-x">
                      <strong className="badge-symbol">X</strong>
                      <span>WIN</span>
                    </span>
                  )}
                  {isOWinner && (
                    <span className="match-badge badge-o">
                      <strong className="badge-symbol">O</strong>
                      <span>WIN</span>
                    </span>
                  )}
                  {isDraw && (
                    <span className="match-badge badge-draw">
                      <span className="badge-symbol">🤝</span>
                      <span>DRAW</span>
                    </span>
                  )}
                </div>

                <div className="match-details">
                  <div className="match-headline">
                    <span className="match-number-tag">Match #{matchNumber}</span>
                    <span className="headline-separator">•</span>
                    {isDraw ? (
                      <span className="match-winner-text draw-text">Draw (Tie)</span>
                    ) : (
                      <span className="match-winner-text">
                        Winner: <strong>{match.winnerName || (isXWinner ? 'Player 1' : 'Player 2')}</strong> ({match.winner})
                      </span>
                    )}
                  </div>
                  <div className="match-sub-info">
                    <span className="match-players">
                      <span className="player-tag-x">{match.playerX || 'Player 1'} (X)</span>
                      <span className="vs-sep">vs</span>
                      <span className="player-tag-o">{match.playerO || 'Player 2'} (O)</span>
                    </span>
                    {typeof match.moveCount === 'number' && match.moveCount > 0 && (
                      <>
                        <span className="history-bullet">•</span>
                        <span className="match-move-count">{match.moveCount} moves</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="match-time-wrap">
                  <time className="match-time" dateTime={match.timestamp ? new Date(match.timestamp).toISOString() : undefined}>
                    {match.completedAt || 'Recently'}
                  </time>
                  {match.completedDate && (
                    <span className="match-date">{match.completedDate}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
