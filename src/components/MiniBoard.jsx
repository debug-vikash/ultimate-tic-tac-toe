import Cell from './Cell.jsx';
import { BOARD_NAMES } from '../gameLogic.js';

export default function MiniBoard({
  boardIndex,
  cells,
  status, // null | 'X' | 'O' | 'T'
  isActiveTarget,
  isFreeChoice,
  isMacroWinningBoard,
  miniWinningLine,
  lastMove,
  currentPlayer,
  onCellClick,
}) {
  const isCompleted = status !== null;

  let boardClass = 'mini-board';
  if (isCompleted) {
    boardClass += ` board-completed board-won-${status.toLowerCase()}`;
  }
  if (isActiveTarget) {
    boardClass += ` board-active-target active-for-${currentPlayer.toLowerCase()}`;
    if (isFreeChoice) {
      boardClass += ' board-free-choice-active';
    }
  } else if (!isCompleted) {
    boardClass += ' board-inactive';
  }

  if (isMacroWinningBoard) {
    boardClass += ' board-macro-winning';
  }

  return (
    <div
      className={boardClass}
      role="group"
      aria-label={`Mini board ${BOARD_NAMES[boardIndex]}, status: ${
        isCompleted ? (status === 'T' ? 'Tied' : `Won by ${status}`) : isActiveTarget ? 'Playable' : 'Waiting'
      }`}
    >
      <div className="mini-board-header">
        <span className="mini-board-name">{BOARD_NAMES[boardIndex]}</span>
        {isActiveTarget && !isCompleted && (
          <span className="target-pill">
            {isFreeChoice ? 'Open' : 'Active'}
          </span>
        )}
      </div>

      <div className="mini-board-grid">
        {cells.map((cellValue, cellIndex) => {
          const isLastMove =
            lastMove?.boardIndex === boardIndex && lastMove?.cellIndex === cellIndex;
          const isWinningCell =
            miniWinningLine && miniWinningLine.includes(cellIndex);

          return (
            <Cell
              key={cellIndex}
              value={cellValue}
              isValid={isActiveTarget}
              isLastMove={isLastMove}
              isWinningCell={isWinningCell}
              currentPlayer={currentPlayer}
              boardIndex={boardIndex}
              cellIndex={cellIndex}
              boardCompleted={isCompleted}
              onClick={onCellClick}
            />
          );
        })}
      </div>

      {/* Completed Overlay with Large Symbol */}
      {isCompleted && (
        <div className={`mini-board-overlay overlay-${status.toLowerCase()}`}>
          <div className="overlay-badge">
            {status === 'T' ? (
              <span className="overlay-draw-icon">TIE</span>
            ) : (
              <span className={`overlay-symbol symbol-${status.toLowerCase()}`}>
                {status}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
