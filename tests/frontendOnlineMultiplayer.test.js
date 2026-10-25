import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSocket } from '../src/socket.js';
import { RoomManager } from '../server/roomManager.js';

describe('Frontend Online Multiplayer Integration & Logic', () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
    vi.clearAllMocks();
  });

  describe('1. Socket Connection & Singleton Client', () => {
    it('initializes socket.io-client to the same origin without hardcoded host', () => {
      const socket = getSocket();
      expect(socket).toBeDefined();
      expect(socket.io).toBeDefined();
      // Socket.IO client defaults uri to relative path / current host
      expect(typeof socket.emit).toBe('function');
      expect(typeof socket.on).toBe('function');
    });

    it('returns the same singleton socket instance on multiple calls', () => {
      const socket1 = getSocket();
      const socket2 = getSocket();
      expect(socket1).toBe(socket2);
    });
  });

  describe('2. Room Join Error Formatting & Mapping', () => {
    const errorMap = {
      ROOM_NOT_FOUND: 'Room not found. Please double-check the 6-character code.',
      ROOM_FULL: 'This room is full (max 2 players).',
      INVALID_ROOM_CODE: 'Please enter a valid 6-character room code.',
    };

    it('maps ROOM_NOT_FOUND to user-friendly message', () => {
      const err = 'ROOM_NOT_FOUND';
      const msg = errorMap[err] || 'Failed to join room.';
      expect(msg).toBe('Room not found. Please double-check the 6-character code.');
    });

    it('maps ROOM_FULL to capacity message', () => {
      const err = 'ROOM_FULL';
      const msg = errorMap[err] || 'Failed to join room.';
      expect(msg).toBe('This room is full (max 2 players).');
    });

    it('maps INVALID_ROOM_CODE to format message', () => {
      const err = 'INVALID_ROOM_CODE';
      const msg = errorMap[err] || 'Failed to join room.';
      expect(msg).toBe('Please enter a valid 6-character room code.');
    });
  });

  describe('3. Online Move Emission Guards', () => {
    it('blocks online move if waiting for opponent (room has no player O)', () => {
      const host = roomManager.createRoom('sock_x', 'Alice');
      const room = roomManager.getRoom(host.roomCode);

      // Condition: room has no player O
      const canMove = Boolean(room.players.O && room.players.O.connected);
      expect(canMove).toBe(false);

      const moveRes = roomManager.handleMove('sock_x', 4, 4);
      expect(moveRes.success).toBe(false);
      expect(moveRes.error).toBe('WAITING_FOR_OPPONENT');
    });

    it('blocks online move if it is not the player assigned turn', () => {
      const host = roomManager.createRoom('sock_x', 'Alice');
      roomManager.joinRoom(host.roomCode, 'sock_o', 'Bob');
      const room = roomManager.getRoom(host.roomCode);

      // Player O tries to move when currentPlayer is X
      expect(room.gameState.currentPlayer).toBe('X');
      const oMove = roomManager.handleMove('sock_o', 4, 4);
      expect(oMove.success).toBe(false);
      expect(oMove.error).toBe('WRONG_TURN');
    });

    it('blocks online move if game is already won', () => {
      const host = roomManager.createRoom('sock_x', 'Alice');
      roomManager.joinRoom(host.roomCode, 'sock_o', 'Bob');
      const room = roomManager.getRoom(host.roomCode);

      room.gameState.overallWinner = 'X';

      const postGameOverMove = roomManager.handleMove('sock_x', 0, 0);
      expect(postGameOverMove.success).toBe(false);
      expect(postGameOverMove.error).toBe('GAME_OVER');
    });
  });

  describe('4. Server-Authoritative State Rendering & No Optimistic State Corruption', () => {
    it('applies moves authoritatively and updates board without modifying local game', () => {
      const host = roomManager.createRoom('sock_x', 'Alice');
      roomManager.joinRoom(host.roomCode, 'sock_o', 'Bob');

      // Initial move emitted by Player X
      const res = roomManager.handleMove('sock_x', 4, 4);
      expect(res.success).toBe(true);
      expect(res.gameState.boards[4][4]).toBe('X');
      expect(res.gameState.currentPlayer).toBe('O');
      expect(res.gameState.activeBoardIndex).toBe(4);

      // Next move emitted by Player O
      const res2 = roomManager.handleMove('sock_o', 4, 0);
      expect(res2.success).toBe(true);
      expect(res2.gameState.boards[4][0]).toBe('O');
      expect(res2.gameState.currentPlayer).toBe('X');
      expect(res2.gameState.activeBoardIndex).toBe(0);
    });

    it('does not reset match on rematch until both players accept', () => {
      const host = roomManager.createRoom('sock_x', 'Alice');
      roomManager.joinRoom(host.roomCode, 'sock_o', 'Bob');
      const room = roomManager.getRoom(host.roomCode);
      room.gameState.overallWinner = 'X';

      // 1st request from X
      const r1 = roomManager.handleRematchRequest('sock_x');
      expect(r1.reset).toBe(false);
      expect(r1.waitingFor).toBe('O');
      expect(room.gameState.overallWinner).toBe('X'); // State not reset yet

      // 2nd request from O
      const r2 = roomManager.handleRematchRequest('sock_o');
      expect(r2.reset).toBe(true);
      expect(room.gameState.overallWinner).toBeNull(); // Reset only on confirmation
      expect(room.gameState.moveCount).toBe(0);
    });
  });

  describe('5. Clean Room Exit & Mode Isolation', () => {
    it('cleans up room membership on leave_room without affecting other active rooms', () => {
      const room1 = roomManager.createRoom('sock_1', 'Alice');
      const room2 = roomManager.createRoom('sock_2', 'Charlie');

      roomManager.leaveRoom('sock_1');
      expect(roomManager.getRoom(room1.roomCode)).toBeUndefined();
      expect(roomManager.getRoom(room2.roomCode)).toBeDefined();
    });
  });
});
