import { BOARD_NAMES } from '../gameLogic.js';

export default function GameStatusBanner({
  currentPlayer,
  activeBoardIndex,
  overallWinner,
  moveCount,
  playerNames = { X: 'Player 1', O: 'Player 2' },
}) {
  let bannerClass = 'status-banner';
  let content;

  const playerXLabel = `${playerNames.X} (X)`;
  const playerOLabel = `${playerNames.O} (O)`;
  const currentLabel = currentPlayer === 'X' ? playerXLabel : playerOLabel;

  if (overallWinner) {
    if (overallWinner === 'T') {
      bannerClass += ' status-draw';
      content = (
        <div className="status-content">
          <span className="status-icon">🤝</span>
          <div className="status-text-group">
            <span className="status-heading">Match Ended in a Draw!</span>
            <span className="status-detail">
              {playerNames.X} and {playerNames.O} finished all mini-boards without a 3-in-a-row victory.
            </span>
          </div>
        </div>
      );
    } else {
      const winnerName = overallWinner === 'X' ? playerXLabel : playerOLabel;
      bannerClass += overallWinner === 'X' ? ' status-win-x' : ' status-win-o';
      content = (
        <div className="status-content">
          <span className="status-icon">🏆</span>
          <div className="status-text-group">
            <span className="status-heading">{winnerName} Wins the Game!</span>
            <span className="status-detail">Three mini-boards conquered in a row!</span>
          </div>
        </div>
      );
    }
  } else if (moveCount === 0) {
    bannerClass += ' status-start';
    content = (
      <div className="status-content">
        <span className="status-badge-chip">First Move</span>
        <span className="status-message">
          <strong>{playerXLabel}</strong> starts — make your opening move in <strong>any cell of any mini-board</strong>.
        </span>
      </div>
    );
  } else if (activeBoardIndex === null) {
    bannerClass += ' status-free-choice';
    content = (
      <div className="status-content">
        <span className="free-choice-sparkle">⚡ Free Choice!</span>
        <span className="status-message">
          Target board was closed. <strong>{currentLabel}</strong> can choose <strong>any available mini-board</strong>!
        </span>
      </div>
    );
  } else {
    const boardName = BOARD_NAMES[activeBoardIndex];
    bannerClass += currentPlayer === 'X' ? ' status-turn-x' : ' status-turn-o';
    content = (
      <div className="status-content">
        <span className="board-target-chip">Target: {boardName}</span>
        <span className="status-message">
          <strong>{currentLabel}</strong> must play in the <strong>{boardName}</strong> mini-board.
        </span>
      </div>
    );
  }

  return (
    <div
      className={bannerClass}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {content}
    </div>
  );
}

