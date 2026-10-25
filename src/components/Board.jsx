import MiniBoard from './MiniBoard.jsx';
import { getValidBoardIndices } from '../gameLogic.js';

export default function Board({
  boards,
  macroBoard,
  activeBoardIndex,
  miniWinningLines,
  macroWinningLine,
  overallWinner,
  lastMove,
  currentPlayer,
  onCellClick,
}) {
  const isGameOver = overallWinner !== null;
  const validBoardIndices = getValidBoardIndices(
    macroBoard,
    activeBoardIndex,
    isGameOver
  );
  const isFreeChoice = !isGameOver && validBoardIndices.length > 1;

  return (
    <div
      className="macro-board-wrapper"
      role="region"
      aria-label="Ultimate Tic-Tac-Toe Game Board"
    >
      <div className="macro-board">
        {boards.map((cells, boardIndex) => {
          const isActiveTarget = validBoardIndices.includes(boardIndex);
          const isMacroWinning =
            macroWinningLine && macroWinningLine.includes(boardIndex);

          return (
            <MiniBoard
              key={boardIndex}
              boardIndex={boardIndex}
              cells={cells}
              status={macroBoard[boardIndex]}
              isActiveTarget={isActiveTarget}
              isFreeChoice={isFreeChoice}
              isMacroWinningBoard={Boolean(isMacroWinning)}
              miniWinningLine={miniWinningLines[boardIndex]}
              lastMove={lastMove}
              currentPlayer={currentPlayer}
              onCellClick={onCellClick}
            />
          );
        })}
      </div>
    </div>
  );
}
