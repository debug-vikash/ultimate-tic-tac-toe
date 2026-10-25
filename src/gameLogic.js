/**
 * Pure game logic for Ultimate Tic-Tac-Toe
 * Separated from UI for maximum testability and reusability.
 */

export const WINNING_LINES = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
];

export const BOARD_NAMES = [
  'Top Left',
  'Top Center',
  'Top Right',
  'Middle Left',
  'Center',
  'Middle Right',
  'Bottom Left',
  'Bottom Center',
  'Bottom Right',
];

export const CELL_NAMES = [
  'top-left',
  'top-center',
  'top-right',
  'mid-left',
  'center',
  'mid-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

/**
 * Creates a fresh, empty game state.
 */
export function createInitialState(customGameId = null) {
  return {
    gameId: customGameId || `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    // 9 mini boards, each with 9 cells
    boards: Array(9)
      .fill(null)
      .map(() => Array(9).fill(null)),
    // Status of each mini board: null | 'X' | 'O' | 'T' (T = tie/draw)
    macroBoard: Array(9).fill(null),
    // Winning line indices [a, b, c] for each mini board, if won
    miniWinningLines: Array(9).fill(null),
    // Winning line indices [a, b, c] for macro board, if won
    macroWinningLine: null,
    // Current player: 'X' | 'O'
    currentPlayer: 'X',
    // Board index that the current player must play in (0-8), or null for any available board
    activeBoardIndex: null,
    // Overall game winner: null | 'X' | 'O' | 'T'
    overallWinner: null,
    // Count of moves played
    moveCount: 0,
    // Details of the last move made: { boardIndex, cellIndex, player } | null
    lastMove: null,
  };
}

/**
 * Checks a 9-cell board for 3 in a row or a tie.
 * Returns { winner: 'X' | 'O' | 'T' | null, winningLine: [a, b, c] | null }
 */
export function checkMiniBoardWinner(cells) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a], winningLine: line };
    }
  }

  // If no winner, check if all cells are filled
  const isFull = cells.every((cell) => cell !== null);
  if (isFull) {
    return { winner: 'T', winningLine: null };
  }

  return { winner: null, winningLine: null };
}

/**
 * Checks the 9 mini boards on the macro board for an overall winner or draw.
 * Only 'X' and 'O' count toward 3-in-a-row.
 * If all 9 boards are completed and no player has 3-in-a-row, returns 'T'.
 */
export function checkMacroWinner(macroBoard) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (
      macroBoard[a] &&
      macroBoard[a] !== 'T' &&
      macroBoard[a] === macroBoard[b] &&
      macroBoard[a] === macroBoard[c]
    ) {
      return { winner: macroBoard[a], winningLine: line };
    }
  }

  // Check if all 9 mini boards are completed (won or drawn)
  const isMacroFull = macroBoard.every((status) => status !== null);
  if (isMacroFull) {
    return { winner: 'T', winningLine: null };
  }

  return { winner: null, winningLine: null };
}

/**
 * Checks if a specific mini board is completed (won or drawn).
 */
export function isBoardCompleted(macroStatus) {
  return macroStatus !== null;
}

/**
 * Returns an array of board indices (0-8) that are currently legal to play in.
 */
export function getValidBoardIndices(macroBoard, activeBoardIndex, isGameOver = false) {
  if (isGameOver) {
    return [];
  }

  // If designated board is not completed, it is the only valid board
  if (activeBoardIndex !== null && !isBoardCompleted(macroBoard[activeBoardIndex])) {
    return [activeBoardIndex];
  }

  // Free choice: player may play in any uncompleted board
  const validIndices = [];
  for (let i = 0; i < 9; i++) {
    if (!isBoardCompleted(macroBoard[i])) {
      validIndices.push(i);
    }
  }
  return validIndices;
}

/**
 * Checks whether a move at (boardIndex, cellIndex) is legal in the given state.
 */
export function isValidMove(state, boardIndex, cellIndex) {
  if (!state || !state.boards || !state.macroBoard) {
    return false;
  }

  // If game is already over
  if (state.overallWinner !== null) {
    return false;
  }

  // Board index and cell index must be integers in range [0, 8]
  if (
    !Number.isInteger(boardIndex) ||
    !Number.isInteger(cellIndex) ||
    boardIndex < 0 ||
    boardIndex > 8 ||
    cellIndex < 0 ||
    cellIndex > 8
  ) {
    return false;
  }

  // Board is already completed
  if (isBoardCompleted(state.macroBoard[boardIndex])) {
    return false;
  }

  // Cell is already occupied
  if (state.boards[boardIndex][cellIndex] !== null) {
    return false;
  }

  // Check if this board is allowed (either activeBoardIndex matches, or free choice applies)
  const validBoards = getValidBoardIndices(
    state.macroBoard,
    state.activeBoardIndex,
    state.overallWinner !== null
  );

  return validBoards.includes(boardIndex);
}

/**
 * Applies a move and returns a brand new immutable state.
 * If move is illegal, returns the original state unchanged.
 */
export function makeMove(state, boardIndex, cellIndex) {
  if (!isValidMove(state, boardIndex, cellIndex)) {
    return state;
  }

  const player = state.currentPlayer;

  // 1. Clone boards immutably and set cell
  const newBoards = state.boards.map((b, bIdx) => {
    if (bIdx !== boardIndex) return b;
    const nextCells = [...b];
    nextCells[cellIndex] = player;
    return nextCells;
  });

  const newMacroBoard = [...state.macroBoard];
  const newMiniWinningLines = [...state.miniWinningLines];
  let newMacroWinningLine = state.macroWinningLine;
  let newOverallWinner = state.overallWinner;

  // 2. Check mini board status if not already completed
  if (newMacroBoard[boardIndex] === null) {
    const miniResult = checkMiniBoardWinner(newBoards[boardIndex]);
    if (miniResult.winner !== null) {
      newMacroBoard[boardIndex] = miniResult.winner;
      newMiniWinningLines[boardIndex] = miniResult.winningLine;

      // 3. Check macro board winner
      const macroResult = checkMacroWinner(newMacroBoard);
      if (macroResult.winner !== null) {
        newOverallWinner = macroResult.winner;
        newMacroWinningLine = macroResult.winningLine;
      }
    }
  }

  // 4. Calculate next active board index
  // Rule: opponent must play in the board corresponding to cellIndex played.
  // If that target board is already completed (won or drawn), player gets free choice (null).
  let nextActiveBoardIndex = null;
  if (newOverallWinner === null) {
    if (!isBoardCompleted(newMacroBoard[cellIndex])) {
      nextActiveBoardIndex = cellIndex;
    } else {
      // Completed board -> free choice!
      nextActiveBoardIndex = null;
    }
  }

  return {
    gameId: state.gameId,
    boards: newBoards,
    macroBoard: newMacroBoard,
    miniWinningLines: newMiniWinningLines,
    macroWinningLine: newMacroWinningLine,
    currentPlayer: player === 'X' ? 'O' : 'X',
    activeBoardIndex: nextActiveBoardIndex,
    overallWinner: newOverallWinner,
    moveCount: state.moveCount + 1,
    lastMove: {
      boardIndex,
      cellIndex,
      player,
    },
  };
}

/**
 * Counts mini boards won by each player in the current game.
 */
export function getMiniBoardWinCounts(macroBoard) {
  let xWins = 0;
  let oWins = 0;
  let draws = 0;

  for (const status of macroBoard) {
    if (status === 'X') xWins++;
    else if (status === 'O') oWins++;
    else if (status === 'T') draws++;
  }

  return { xWins, oWins, draws };
}

export const DEFAULT_PLAYER_NAMES = {
  X: 'Player 1',
  O: 'Player 2',
};

export const INITIAL_SESSION_SCORES = {
  xWins: 0,
  oWins: 0,
  draws: 0,
  p1Wins: 0,
  p2Wins: 0,
};

/**
 * Validates and trims a player name, providing a fallback if empty.
 */
export function validatePlayerName(name, fallback = 'Player') {
  if (typeof name !== 'string') return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 20);
}

/**
 * Calculates total completed matches from a scores object.
 */
export function calculateTotalMatches(scores) {
  if (!scores) return 0;
  const x = Number(scores.xWins ?? scores.p1Wins ?? 0) || 0;
  const o = Number(scores.oWins ?? scores.p2Wins ?? 0) || 0;
  const d = Number(scores.draws ?? 0) || 0;
  return x + o + d;
}

/**
 * Formats a timestamp into a human-readable time string.
 */
export function formatCompletionTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a timestamp into a human-readable date string.
 */
export function formatCompletionDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Pure function to record a match result exactly once and update session scores.
 * Prevents duplicates by verifying match ID against history.
 */
export function recordMatchResult(currentHistory, currentScores, matchData) {
  const safeHistory = Array.isArray(currentHistory) ? currentHistory : [];
  const safeScores = {
    xWins: currentScores?.xWins ?? currentScores?.p1Wins ?? 0,
    oWins: currentScores?.oWins ?? currentScores?.p2Wins ?? 0,
    draws: currentScores?.draws ?? 0,
  };

  if (!matchData || !matchData.id) {
    return {
      history: safeHistory,
      scores: {
        ...safeScores,
        p1Wins: safeScores.xWins,
        p2Wins: safeScores.oWins,
      },
      recorded: false,
    };
  }

  // Deduplication check: do not record if already present
  if (safeHistory.some((item) => item.id === matchData.id)) {
    return {
      history: safeHistory,
      scores: {
        ...safeScores,
        p1Wins: safeScores.xWins,
        p2Wins: safeScores.oWins,
      },
      recorded: false,
    };
  }

  const updatedScores = {
    xWins: matchData.winner === 'X' ? safeScores.xWins + 1 : safeScores.xWins,
    oWins: matchData.winner === 'O' ? safeScores.oWins + 1 : safeScores.oWins,
    draws: matchData.winner === 'T' ? safeScores.draws + 1 : safeScores.draws,
  };

  updatedScores.p1Wins = updatedScores.xWins;
  updatedScores.p2Wins = updatedScores.oWins;

  const entry = {
    id: matchData.id,
    winner: matchData.winner, // 'X' | 'O' | 'T'
    winnerName: matchData.winnerName,
    playerX: matchData.playerX,
    playerO: matchData.playerO,
    completedAt: matchData.completedAt || formatCompletionTime(),
    completedDate: matchData.completedDate || formatCompletionDate(),
    timestamp: matchData.timestamp || Date.now(),
    moveCount: matchData.moveCount ?? 0,
  };

  const updatedHistory = [entry, ...safeHistory];

  return {
    history: updatedHistory,
    scores: updatedScores,
    recorded: true,
  };
}

/**
 * Resets scores and history to empty initial state.
 */
export function resetScoresAndHistory() {
  return {
    history: [],
    scores: {
      xWins: 0,
      oWins: 0,
      draws: 0,
      p1Wins: 0,
      p2Wins: 0,
    },
  };
}

