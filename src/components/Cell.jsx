import { BOARD_NAMES, CELL_NAMES } from '../gameLogic.js';

export default function Cell({
  value,
  isValid,
  isLastMove,
  isWinningCell,
  currentPlayer,
  boardIndex,
  cellIndex,
  boardCompleted,
  onClick,
}) {
  const isClickable = isValid && value === null && !boardCompleted;

  let cellClass = 'cell';
  if (value) {
    cellClass += ` cell-${value.toLowerCase()}`;
  }
  if (isClickable) {
    cellClass += ` cell-clickable hover-preview-${currentPlayer.toLowerCase()}`;
  } else if (!value) {
    cellClass += ' cell-disabled';
  }
  if (isLastMove) {
    cellClass += ' cell-last-move';
  }
  if (isWinningCell) {
    cellClass += ' cell-winning-line';
  }

  const label = `${BOARD_NAMES[boardIndex]}, ${CELL_NAMES[cellIndex]}: ${
    value ? value : isClickable ? 'Available move' : 'Blocked'
  }`;

  return (
    <button
      type="button"
      className={cellClass}
      disabled={!isClickable}
      onClick={() => onClick(boardIndex, cellIndex)}
      aria-label={label}
      data-board={boardIndex}
      data-cell={cellIndex}
    >
      {value ? (
        <span className={`cell-mark mark-${value.toLowerCase()}`}>{value}</span>
      ) : isClickable ? (
        <span className="cell-ghost" aria-hidden="true">
          {currentPlayer}
        </span>
      ) : null}
      {isLastMove && <span className="last-move-indicator" aria-hidden="true" />}
    </button>
  );
}
