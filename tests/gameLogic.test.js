import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  checkMiniBoardWinner,
  checkMacroWinner,
  isBoardCompleted,
  getValidBoardIndices,
  isValidMove,
  makeMove,
  getMiniBoardWinCounts,
  validatePlayerName,
  calculateTotalMatches,
  recordMatchResult,
  resetScoresAndHistory,
  DEFAULT_PLAYER_NAMES,
  INITIAL_SESSION_SCORES,
} from '../src/gameLogic.js';

describe('Ultimate Tic-Tac-Toe Game Logic', () => {
  describe('Initial State & Scenario 1 & 11', () => {
    it('Scenario 1 & 11: createInitialState initializes clean game with Player 1 (X) and any board playable', () => {
      const state = createInitialState();
      expect(state.boards).toHaveLength(9);
      for (const board of state.boards) {
        expect(board).toHaveLength(9);
        expect(board.every((cell) => cell === null)).toBe(true);
      }
      expect(state.macroBoard).toHaveLength(9);
      expect(state.macroBoard.every((status) => status === null)).toBe(true);
      expect(state.miniWinningLines).toHaveLength(9);
      expect(state.miniWinningLines.every((line) => line === null)).toBe(true);
      expect(state.macroWinningLine).toBeNull();
      expect(state.currentPlayer).toBe('X');
      expect(state.activeBoardIndex).toBeNull();
      expect(state.overallWinner).toBeNull();
      expect(state.moveCount).toBe(0);
      expect(state.lastMove).toBeNull();

      // Rule 1: Player 1 can make the first move in any cell of any mini board
      const validBoards = getValidBoardIndices(state.macroBoard, state.activeBoardIndex, false);
      expect(validBoards).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      for (let b = 0; b < 9; b++) {
        for (let c = 0; c < 9; c++) {
          expect(isValidMove(state, b, c)).toBe(true);
        }
      }
    });
  });

  describe('Mini-Board Winner Detection & Scenario 7', () => {
    it('detects all horizontal row wins for X and O', () => {
      // Row 0
      const row0 = ['X', 'X', 'X', null, 'O', null, 'O', null, null];
      expect(checkMiniBoardWinner(row0)).toEqual({
        winner: 'X',
        winningLine: [0, 1, 2],
      });

      // Row 1
      const row1 = [null, 'X', null, 'O', 'O', 'O', 'X', null, null];
      expect(checkMiniBoardWinner(row1)).toEqual({
        winner: 'O',
        winningLine: [3, 4, 5],
      });

      // Row 2
      const row2 = ['O', null, 'O', null, 'O', null, 'X', 'X', 'X'];
      expect(checkMiniBoardWinner(row2)).toEqual({
        winner: 'X',
        winningLine: [6, 7, 8],
      });
    });

    it('detects all vertical column wins for X and O', () => {
      // Column 0
      const col0 = ['X', null, 'O', 'X', 'O', null, 'X', null, null];
      expect(checkMiniBoardWinner(col0)).toEqual({
        winner: 'X',
        winningLine: [0, 3, 6],
      });

      // Column 1
      const col1 = [null, 'O', null, 'X', 'O', 'X', null, 'O', null];
      expect(checkMiniBoardWinner(col1)).toEqual({
        winner: 'O',
        winningLine: [1, 4, 7],
      });

      // Column 2
      const col2 = [null, 'X', 'X', 'O', null, 'X', 'O', 'O', 'X'];
      expect(checkMiniBoardWinner(col2)).toEqual({
        winner: 'X',
        winningLine: [2, 5, 8],
      });
    });

    it('detects diagonal wins for X and O', () => {
      // Main diagonal [0, 4, 8]
      const diagMain = ['X', null, 'O', null, 'X', null, 'O', null, 'X'];
      expect(checkMiniBoardWinner(diagMain)).toEqual({
        winner: 'X',
        winningLine: [0, 4, 8],
      });

      // Anti diagonal [2, 4, 6]
      const diagAnti = [null, 'X', 'O', 'X', 'O', null, 'O', null, null];
      expect(checkMiniBoardWinner(diagAnti)).toEqual({
        winner: 'O',
        winningLine: [2, 4, 6],
      });
    });

    it('returns null winner for incomplete mini-board without 3 in a row', () => {
      const incomplete = ['X', 'O', 'X', null, null, null, null, null, null];
      expect(checkMiniBoardWinner(incomplete)).toEqual({
        winner: null,
        winningLine: null,
      });
    });
  });

  describe('Mini-Board Draw Detection', () => {
    it('returns T (tie) when all 9 cells are filled with no 3 in a row', () => {
      const tieBoard = [
        'X', 'O', 'X',
        'X', 'O', 'O',
        'O', 'X', 'X',
      ];
      expect(checkMiniBoardWinner(tieBoard)).toEqual({
        winner: 'T',
        winningLine: null,
      });
    });

    it('identifies completed board correctly via isBoardCompleted', () => {
      expect(isBoardCompleted(null)).toBe(false);
      expect(isBoardCompleted('X')).toBe(true);
      expect(isBoardCompleted('O')).toBe(true);
      expect(isBoardCompleted('T')).toBe(true);
    });
  });

  describe('Destination-Board Calculation & Scenarios 2 & 3', () => {
    it('Scenario 2: selecting center cell (4) forces opponent into center mini-board (4)', () => {
      let state = createInitialState();
      // Player 1 plays board 0, cell 4 (center cell)
      state = makeMove(state, 0, 4);

      expect(state.boards[0][4]).toBe('X');
      expect(state.currentPlayer).toBe('O');
      expect(state.activeBoardIndex).toBe(4);

      // Opponent O must play in board 4
      const validBoards = getValidBoardIndices(state.macroBoard, state.activeBoardIndex);
      expect(validBoards).toEqual([4]);
      expect(isValidMove(state, 4, 0)).toBe(true);
      expect(isValidMove(state, 0, 0)).toBe(false);
    });

    it('Scenario 3: selecting top-right cell (2) forces opponent into top-right mini-board (2)', () => {
      let state = createInitialState();
      // Player 1 plays board 4, cell 2 (top-right cell)
      state = makeMove(state, 4, 2);

      expect(state.boards[4][2]).toBe('X');
      expect(state.currentPlayer).toBe('O');
      expect(state.activeBoardIndex).toBe(2);

      // Opponent O must play in board 2
      const validBoards = getValidBoardIndices(state.macroBoard, state.activeBoardIndex);
      expect(validBoards).toEqual([2]);
      expect(isValidMove(state, 2, 8)).toBe(true);
      expect(isValidMove(state, 4, 8)).toBe(false);
    });
  });

  describe('Prevention of Invalid Moves & Scenario 4 & 5', () => {
    it('Scenario 4: occupied cells cannot be selected again', () => {
      let state = createInitialState();
      state = makeMove(state, 0, 0); // X plays (0, 0) -> target is 0
      expect(state.boards[0][0]).toBe('X');

      // O attempts to play in already occupied cell (0, 0)
      expect(isValidMove(state, 0, 0)).toBe(false);
      const afterAttempt = makeMove(state, 0, 0);
      expect(afterAttempt).toBe(state); // Unchanged
    });

    it('Scenario 5: won mini boards cannot accept further moves', () => {
      let state = createInitialState();
      // Mark board 3 as won by X
      state.macroBoard[3] = 'X';
      state.miniWinningLines[3] = [0, 1, 2];
      state.boards[3][0] = 'X';
      state.boards[3][1] = 'X';
      state.boards[3][2] = 'X';

      // Even if activeBoardIndex is somehow 3 or free choice
      expect(isValidMove(state, 3, 5)).toBe(false);
      const afterAttempt = makeMove(state, 3, 5);
      expect(afterAttempt).toBe(state);
    });

    it('rejects moves outside the active board when a specific board is targeted', () => {
      let state = createInitialState();
      state = makeMove(state, 1, 7); // Sends opponent to board 7

      expect(state.activeBoardIndex).toBe(7);
      expect(isValidMove(state, 0, 0)).toBe(false);
      expect(isValidMove(state, 1, 0)).toBe(false);
      expect(isValidMove(state, 7, 0)).toBe(true);
    });

    it('rejects out-of-bounds indices', () => {
      const state = createInitialState();
      expect(isValidMove(state, -1, 0)).toBe(false);
      expect(isValidMove(state, 9, 0)).toBe(false);
      expect(isValidMove(state, 0, -1)).toBe(false);
      expect(isValidMove(state, 0, 9)).toBe(false);
      expect(isValidMove(state, 'a', 0)).toBe(false);
      expect(isValidMove(state, 0, null)).toBe(false);
    });
  });

  describe('Free-Choice Behavior & Scenario 6', () => {
    it('Scenario 6: gives free choice when target board is won', () => {
      let state = createInitialState();
      // Pre-win board 5
      state.macroBoard[5] = 'O';

      // X plays cell 5 in board 1, directing O to board 5 (which is won)
      state.activeBoardIndex = 1;
      state = makeMove(state, 1, 5);

      // Next active board should be null (free choice)
      expect(state.activeBoardIndex).toBeNull();
      const validBoards = getValidBoardIndices(state.macroBoard, state.activeBoardIndex);
      expect(validBoards).toEqual([0, 1, 2, 3, 4, 6, 7, 8]); // board 5 excluded!
      expect(validBoards.includes(5)).toBe(false);
    });

    it('Scenario 6: gives free choice when target board is drawn (T)', () => {
      let state = createInitialState();
      // Pre-tie board 2
      state.macroBoard[2] = 'T';

      // X plays cell 2 in board 0, directing O to board 2 (which is drawn)
      state.activeBoardIndex = 0;
      state = makeMove(state, 0, 2);

      expect(state.activeBoardIndex).toBeNull();
      const validBoards = getValidBoardIndices(state.macroBoard, state.activeBoardIndex);
      expect(validBoards).toEqual([0, 1, 3, 4, 5, 6, 7, 8]); // board 2 excluded!
      expect(validBoards.includes(2)).toBe(false);
    });

    it('gives free choice to opponent if a player wins the board by playing the cell pointing to that board', () => {
      let state = createInitialState();
      // Setup board 4 with X at 0 and 1, playing cell 2 wins board 4 AND points to board 2 (uncompleted)
      // BUT if X plays cell 4 in board 4 (with X at 0 and 8 for diagonal win):
      state.boards[4][0] = 'X';
      state.boards[4][8] = 'X';
      state.activeBoardIndex = 4;
      state.currentPlayer = 'X';

      // X plays cell 4 in board 4: wins board 4! And cell 4 points to board 4 which is now completed!
      state = makeMove(state, 4, 4);

      expect(state.macroBoard[4]).toBe('X');
      // Because board 4 is now completed, opponent O gets free choice!
      expect(state.activeBoardIndex).toBeNull();
      const valid = getValidBoardIndices(state.macroBoard, state.activeBoardIndex);
      expect(valid.includes(4)).toBe(false);
    });
  });

  describe('Overall-Board Winner Detection & Scenario 8', () => {
    it('Scenario 8: three won mini boards in a row produce the overall winner (horizontal, vertical, diagonal)', () => {
      // Horizontal row on macro board: [0, 1, 2]
      const macroRow = ['X', 'X', 'X', 'O', null, 'O', null, null, null];
      expect(checkMacroWinner(macroRow)).toEqual({
        winner: 'X',
        winningLine: [0, 1, 2],
      });

      // Vertical column on macro board: [1, 4, 7]
      const macroCol = ['X', 'O', null, 'X', 'O', null, null, 'O', 'X'];
      expect(checkMacroWinner(macroCol)).toEqual({
        winner: 'O',
        winningLine: [1, 4, 7],
      });

      // Diagonal on macro board: [2, 4, 6]
      const macroDiag = ['X', null, 'O', null, 'O', null, 'O', null, 'X'];
      expect(checkMacroWinner(macroDiag)).toEqual({
        winner: 'O',
        winningLine: [2, 4, 6],
      });
    });

    it('tied mini-boards (T) do not count toward 3-in-a-row', () => {
      const macroWithTie = ['X', 'T', 'X', 'O', 'O', null, null, null, null];
      expect(checkMacroWinner(macroWithTie)).toEqual({
        winner: null,
        winningLine: null,
      });
    });
  });

  describe('Macro-Board Draw Detection & Scenario 9', () => {
    it('Scenario 9: a full macro board with no 3-in-a-row ends in a draw (T)', () => {
      const fullDrawMacro = [
        'X', 'O', 'X',
        'X', 'O', 'O',
        'O', 'X', 'X',
      ];
      expect(checkMacroWinner(fullDrawMacro)).toEqual({
        winner: 'T',
        winningLine: null,
      });

      const fullDrawWithTies = [
        'X', 'O', 'X',
        'O', 'T', 'O',
        'O', 'X', 'X',
      ];
      expect(checkMacroWinner(fullDrawWithTies)).toEqual({
        winner: 'T',
        winningLine: null,
      });
    });
  });

  describe('Game-Over Behavior & Scenario 10', () => {
    it('Scenario 10: no moves are allowed after the game ends', () => {
      let state = createInitialState();
      state.macroBoard = ['X', 'X', 'X', 'O', null, 'O', null, null, null];
      state.overallWinner = 'X';
      state.macroWinningLine = [0, 1, 2];

      // No boards should be valid
      const validBoards = getValidBoardIndices(state.macroBoard, state.activeBoardIndex, true);
      expect(validBoards).toEqual([]);

      // isValidMove must be false everywhere
      for (let b = 0; b < 9; b++) {
        for (let c = 0; c < 9; c++) {
          expect(isValidMove(state, b, c)).toBe(false);
        }
      }

      // makeMove must return state untouched
      const result = makeMove(state, 4, 0);
      expect(result).toBe(state);
    });

    it('ends game and records winner immediately when third mini board is won', () => {
      let state = createInitialState();
      // Boards 0 and 1 won by X
      state.macroBoard[0] = 'X';
      state.macroBoard[1] = 'X';

      // Board 2 has X at cells 0 and 1, turn is X in board 2
      state.boards[2][0] = 'X';
      state.boards[2][1] = 'X';
      state.activeBoardIndex = 2;
      state.currentPlayer = 'X';

      // X completes row 0 on board 2
      state = makeMove(state, 2, 2);

      expect(state.macroBoard[2]).toBe('X');
      expect(state.overallWinner).toBe('X');
      expect(state.macroWinningLine).toEqual([0, 1, 2]);

      // All future moves blocked
      expect(isValidMove(state, 5, 0)).toBe(false);
    });
  });

  describe('Mini Board Win Counts Helper', () => {
    it('accurately counts mini boards won by X, O, and ties', () => {
      const macroBoard = ['X', 'X', 'O', 'T', null, null, 'O', null, 'X'];
      const counts = getMiniBoardWinCounts(macroBoard);
      expect(counts).toEqual({
        xWins: 3,
        oWins: 2,
        draws: 1,
      });
    });
  });

  describe('Immutability of makeMove', () => {
    it('does not mutate previous state or nested board arrays', () => {
      const state1 = createInitialState();
      const state2 = makeMove(state1, 0, 0);

      expect(state1.boards[0][0]).toBeNull();
      expect(state2.boards[0][0]).toBe('X');
      expect(state1.boards).not.toBe(state2.boards);
      expect(state1.boards[0]).not.toBe(state2.boards[0]);
      // Other unedited mini boards remain untouched or referentially equal
      expect(state1.boards[1]).toBe(state2.boards[1]);
      expect(state1.macroBoard).not.toBe(state2.macroBoard);
    });
  });

  describe('Player Name Validation', () => {
    it('provides valid DEFAULT_PLAYER_NAMES', () => {
      expect(DEFAULT_PLAYER_NAMES).toEqual({ X: 'Player 1', O: 'Player 2' });
    });

    it('trims whitespace and preserves valid custom names', () => {
      expect(validatePlayerName('  Alice  ', 'Player 1')).toBe('Alice');
      expect(validatePlayerName('CyberKnight_99', 'Player 1')).toBe('CyberKnight_99');
    });

    it('falls back to default name when input is empty or blank', () => {
      expect(validatePlayerName('', 'Player 1')).toBe('Player 1');
      expect(validatePlayerName('   ', 'Player 2')).toBe('Player 2');
      expect(validatePlayerName(null, 'Player 1')).toBe('Player 1');
      expect(validatePlayerName(undefined, 'Player 2')).toBe('Player 2');
    });

    it('caps maximum length to 20 characters', () => {
      const longName = 'A'.repeat(30);
      expect(validatePlayerName(longName, 'Player 1')).toHaveLength(20);
    });
  });

  describe('Session Scoreboard & Score Updates', () => {
    it('provides zeroed INITIAL_SESSION_SCORES', () => {
      expect(INITIAL_SESSION_SCORES.xWins).toBe(0);
      expect(INITIAL_SESSION_SCORES.oWins).toBe(0);
      expect(INITIAL_SESSION_SCORES.draws).toBe(0);
    });

    it('calculates total completed matches correctly', () => {
      expect(calculateTotalMatches({ xWins: 0, oWins: 0, draws: 0 })).toBe(0);
      expect(calculateTotalMatches({ xWins: 5, oWins: 3, draws: 2 })).toBe(10);
      // Handles fallback/legacy fields p1Wins and p2Wins
      expect(calculateTotalMatches({ p1Wins: 4, p2Wins: 2, draws: 1 })).toBe(7);
      expect(calculateTotalMatches(null)).toBe(0);
    });

    it('updates X wins when Player X claims victory', () => {
      const initialScores = { xWins: 2, oWins: 1, draws: 0 };
      const history = [];
      const matchData = {
        id: 'match_101',
        winner: 'X',
        winnerName: 'Alice',
        playerX: 'Alice',
        playerO: 'Bob',
        timestamp: 1700000000000,
        completedAt: '06:30 PM',
        completedDate: 'Oct 24, 2026',
        moveCount: 35,
      };

      const result = recordMatchResult(history, initialScores, matchData);

      expect(result.recorded).toBe(true);
      expect(result.scores.xWins).toBe(3);
      expect(result.scores.oWins).toBe(1);
      expect(result.scores.draws).toBe(0);
      expect(result.history).toHaveLength(1);
      expect(result.history[0].winner).toBe('X');
      expect(result.history[0].winnerName).toBe('Alice');
      expect(result.history[0].completedAt).toBe('06:30 PM');
    });

    it('updates O wins when Player O claims victory', () => {
      const initialScores = { xWins: 1, oWins: 0, draws: 1 };
      const history = [];
      const matchData = {
        id: 'match_102',
        winner: 'O',
        winnerName: 'Bob',
        playerX: 'Alice',
        playerO: 'Bob',
        timestamp: 1700000005000,
        completedAt: '06:45 PM',
        moveCount: 42,
      };

      const result = recordMatchResult(history, initialScores, matchData);

      expect(result.recorded).toBe(true);
      expect(result.scores.xWins).toBe(1);
      expect(result.scores.oWins).toBe(1);
      expect(result.scores.draws).toBe(1);
      expect(result.history[0].winner).toBe('O');
      expect(result.history[0].winnerName).toBe('Bob');
    });

    it('updates draws tally when match ends in a draw (T)', () => {
      const initialScores = { xWins: 0, oWins: 0, draws: 0 };
      const history = [];
      const matchData = {
        id: 'match_103',
        winner: 'T',
        winnerName: 'Draw',
        playerX: 'Alice',
        playerO: 'Bob',
        timestamp: 1700000010000,
        completedAt: '07:00 PM',
        moveCount: 81,
      };

      const result = recordMatchResult(history, initialScores, matchData);

      expect(result.recorded).toBe(true);
      expect(result.scores.draws).toBe(1);
      expect(result.scores.xWins).toBe(0);
      expect(result.scores.oWins).toBe(0);
      expect(result.history[0].winner).toBe('T');
    });
  });

  describe('Duplicate History Prevention', () => {
    it('rejects recording the same match ID twice and does not increment scores', () => {
      const initialScores = { xWins: 1, oWins: 0, draws: 0 };
      const existingMatch = {
        id: 'match_duplicate_test',
        winner: 'X',
        winnerName: 'Alice',
        playerX: 'Alice',
        playerO: 'Bob',
        timestamp: 1700000000000,
        completedAt: '06:30 PM',
        moveCount: 30,
      };
      const history = [existingMatch];

      // Attempt to record the exact same match ID again (e.g. simulated re-render)
      const duplicateAttempt = recordMatchResult(history, initialScores, existingMatch);

      expect(duplicateAttempt.recorded).toBe(false);
      expect(duplicateAttempt.history).toHaveLength(1);
      expect(duplicateAttempt.scores.xWins).toBe(1);
      expect(duplicateAttempt.scores.oWins).toBe(0);
      expect(duplicateAttempt.scores.draws).toBe(0);
    });

    it('handles invalid or empty matchData without corrupting state', () => {
      const initialScores = { xWins: 1, oWins: 1, draws: 0 };
      const history = [];

      const resultNoId = recordMatchResult(history, initialScores, { winner: 'X' });
      expect(resultNoId.recorded).toBe(false);
      expect(resultNoId.history).toEqual([]);
      expect(resultNoId.scores.xWins).toBe(1);

      const resultNull = recordMatchResult(history, initialScores, null);
      expect(resultNull.recorded).toBe(false);
    });
  });

  describe('Restart Game & Score/History Reset Behavior', () => {
    it('Restart Game creates clean initial board starting with X and preserves session stats', () => {
      // Create a game with some moves made
      let state = createInitialState();
      state = makeMove(state, 0, 4); // X plays (0, 4) -> turn is O
      expect(state.currentPlayer).toBe('O');
      expect(state.moveCount).toBe(1);

      const savedScores = { xWins: 5, oWins: 3, draws: 2 };

      // Restart Game: generates new state
      const restartedState = createInitialState();

      // Clean board, starts with X
      expect(restartedState.currentPlayer).toBe('X');
      expect(restartedState.activeBoardIndex).toBeNull();
      expect(restartedState.overallWinner).toBeNull();
      expect(restartedState.moveCount).toBe(0);
      expect(restartedState.boards.every((b) => b.every((c) => c === null))).toBe(true);

      // Session scores remain completely untouched
      expect(savedScores.xWins).toBe(5);
      expect(savedScores.oWins).toBe(3);
      expect(savedScores.draws).toBe(2);
    });

    it('resetScoresAndHistory resets tallies to zero and empties history', () => {
      const reset = resetScoresAndHistory();

      expect(reset.history).toEqual([]);
      expect(reset.scores).toEqual({
        xWins: 0,
        oWins: 0,
        draws: 0,
        p1Wins: 0,
        p2Wins: 0,
      });
    });

    it('Clear History / Reset Scores preserves active game board and state', () => {
      // Simulate an active game in progress
      let activeGameState = createInitialState();
      activeGameState = makeMove(activeGameState, 4, 0); // X plays (4, 0)
      activeGameState = makeMove(activeGameState, 0, 4); // O plays (0, 4)

      expect(activeGameState.moveCount).toBe(2);
      expect(activeGameState.currentPlayer).toBe('X');
      expect(activeGameState.activeBoardIndex).toBe(4);

      // User performs Reset Scores & History
      const reset = resetScoresAndHistory();

      // Verify reset data
      expect(reset.scores.xWins).toBe(0);
      expect(reset.scores.oWins).toBe(0);
      expect(reset.scores.draws).toBe(0);
      expect(reset.history).toEqual([]);

      // Active game state is completely intact
      expect(activeGameState.moveCount).toBe(2);
      expect(activeGameState.currentPlayer).toBe('X');
      expect(activeGameState.activeBoardIndex).toBe(4);
      expect(activeGameState.boards[4][0]).toBe('X');
      expect(activeGameState.boards[0][4]).toBe('O');
    });
  });
});

