import http from 'http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RoomManager } from '../server/roomManager.js';
import { isOriginAllowed, app } from '../server/index.js';

describe('Server Authoritative Room & Multiplayer Logic', () => {
  let roomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('1. Room Creation', () => {
    it('creates a room with unique 6-character code and assigns Host as Player X', () => {
      const res = roomManager.createRoom('socket_host_1', 'Alice');
      expect(res.success).toBe(true);
      expect(res.roomCode).toBeDefined();
      expect(res.roomCode).toHaveLength(6);
      expect(res.symbol).toBe('X');
      expect(res.room.players.X.name).toBe('Alice');
      expect(res.room.players.X.connected).toBe(true);
      expect(res.room.players.O).toBeNull();
      expect(res.room.gameState.currentPlayer).toBe('X');
    });

    it('generates unique codes for multiple rooms without collision', () => {
      const codes = new Set();
      for (let i = 0; i < 50; i++) {
        const res = roomManager.createRoom(`socket_${i}`, `Player ${i}`);
        expect(res.success).toBe(true);
        expect(codes.has(res.roomCode)).toBe(false);
        codes.add(res.roomCode);
      }
      expect(codes.size).toBe(50);
    });
  });

  describe('2. Room Joining & Capacity', () => {
    it('allows a 2nd player to join as Player O', () => {
      const host = roomManager.createRoom('socket_p1', 'Alice');
      const guest = roomManager.joinRoom(host.roomCode, 'socket_p2', 'Bob');

      expect(guest.success).toBe(true);
      expect(guest.symbol).toBe('O');
      expect(guest.room.players.O.name).toBe('Bob');
      expect(guest.room.players.O.connected).toBe(true);
    });

    it('rejects a 3rd player when room is full (capacity = 2)', () => {
      const host = roomManager.createRoom('socket_p1', 'Alice');
      roomManager.joinRoom(host.roomCode, 'socket_p2', 'Bob');

      const third = roomManager.joinRoom(host.roomCode, 'socket_p3', 'Charlie');
      expect(third.success).toBe(false);
      expect(third.error).toBe('ROOM_FULL');
    });

    it('rejects joining a non-existent room', () => {
      const res = roomManager.joinRoom('NON999', 'socket_p2', 'Bob');
      expect(res.success).toBe(false);
      expect(res.error).toBe('ROOM_NOT_FOUND');
    });

    it('is case-insensitive for room codes', () => {
      const host = roomManager.createRoom('socket_p1', 'Alice');
      const guest = roomManager.joinRoom(host.roomCode.toLowerCase(), 'socket_p2', 'Bob');
      expect(guest.success).toBe(true);
      expect(guest.roomCode).toBe(host.roomCode);
    });
  });

  describe('3. Move Validation & Turn Enforcement', () => {
    let roomCode;
    const socketX = 'sock_x';
    const socketO = 'sock_o';

    beforeEach(() => {
      const host = roomManager.createRoom(socketX, 'Alice');
      roomCode = host.roomCode;
      roomManager.joinRoom(roomCode, socketO, 'Bob');
    });

    it('rejects moves before an opponent has joined', () => {
      roomManager.createRoom('sock_solo', 'Solo');
      const move = roomManager.handleMove('sock_solo', 4, 4);
      expect(move.success).toBe(false);
      expect(move.error).toBe('WAITING_FOR_OPPONENT');
    });

    it('allows Player X to make the initial move in any board and cell', () => {
      const res = roomManager.handleMove(socketX, 4, 0); // board 4, cell 0
      expect(res.success).toBe(true);
      expect(res.gameState.boards[4][0]).toBe('X');
      expect(res.gameState.currentPlayer).toBe('O');
      expect(res.gameState.activeBoardIndex).toBe(0); // Sent O to board 0
    });

    it('rejects Player O moving when it is Player X turn (wrong turn)', () => {
      const res = roomManager.handleMove(socketO, 4, 4);
      expect(res.success).toBe(false);
      expect(res.error).toBe('WRONG_TURN');
    });

    it('rejects moving in an already occupied cell', () => {
      roomManager.handleMove(socketX, 4, 0); // X plays (4, 0) -> directs O to board 0
      roomManager.handleMove(socketO, 0, 4); // O plays (0, 4) -> directs X to board 4

      // X attempts to play (4, 0) which is already occupied by X!
      const illegalMove = roomManager.handleMove(socketX, 4, 0);
      expect(illegalMove.success).toBe(false);
      expect(illegalMove.error).toBe('INVALID_MOVE');
    });

    it('rejects moving in an incorrect target mini-board', () => {
      roomManager.handleMove(socketX, 4, 2); // X plays in board 4, cell 2 -> directs O to board 2!

      // O tries to play in board 7 instead of board 2
      const wrongBoardMove = roomManager.handleMove(socketO, 7, 4);
      expect(wrongBoardMove.success).toBe(false);
      expect(wrongBoardMove.error).toBe('INVALID_MOVE');

      // O plays correctly in board 2
      const correctMove = roomManager.handleMove(socketO, 2, 4);
      expect(correctMove.success).toBe(true);
      expect(correctMove.gameState.boards[2][4]).toBe('O');
    });

    it('rejects moves from sockets not in any room', () => {
      const res = roomManager.handleMove('unknown_socket', 4, 4);
      expect(res.success).toBe(false);
      expect(res.error).toBe('NOT_IN_ROOM');
    });
  });

  describe('4. Winning & Game Over Enforcement', () => {
    let roomCode;
    const socketX = 'sock_x';
    const socketO = 'sock_o';

    beforeEach(() => {
      const host = roomManager.createRoom(socketX, 'Alice');
      roomCode = host.roomCode;
      roomManager.joinRoom(roomCode, socketO, 'Bob');
    });

    it('detects a mini-board victory and overall victory authoritatively on server', () => {
      const room = roomManager.getRoom(roomCode);

      // Force game state to near-win condition on server to test victory handling
      // Mini-boards 0 and 1 won by X. In mini-board 2, X has cells 0 and 1.
      room.gameState.macroBoard[0] = 'X';
      room.gameState.macroBoard[1] = 'X';
      room.gameState.activeBoardIndex = 2;
      room.gameState.currentPlayer = 'X';
      room.gameState.boards[2][0] = 'X';
      room.gameState.boards[2][1] = 'X';

      // X plays (2, 2) to win mini-board 2, completing macro row [0, 1, 2]!
      const res = roomManager.handleMove(socketX, 2, 2);
      expect(res.success).toBe(true);
      expect(res.gameState.macroBoard[2]).toBe('X');
      expect(res.gameState.overallWinner).toBe('X');
      expect(res.gameState.macroWinningLine).toEqual([0, 1, 2]);

      // Any further move after game is over is rejected
      const postWinMove = roomManager.handleMove(socketO, 3, 3);
      expect(postWinMove.success).toBe(false);
      expect(postWinMove.error).toBe('GAME_OVER');
    });
  });

  describe('5. Rematch Flow', () => {
    let roomCode;
    const socketX = 'sock_x';
    const socketO = 'sock_o';

    beforeEach(() => {
      const host = roomManager.createRoom(socketX, 'Alice');
      roomCode = host.roomCode;
      roomManager.joinRoom(roomCode, socketO, 'Bob');
    });

    it('rejects rematch requests before the game is over', () => {
      const res = roomManager.handleRematchRequest(socketX);
      expect(res.success).toBe(false);
      expect(res.error).toBe('GAME_NOT_OVER');
    });

    it('synchronizes rematch when both players request it', () => {
      const room = roomManager.getRoom(roomCode);
      room.gameState.overallWinner = 'X'; // Mark game finished

      // Player X requests rematch
      const res1 = roomManager.handleRematchRequest(socketX);
      expect(res1.success).toBe(true);
      expect(res1.reset).toBe(false);
      expect(res1.waitingFor).toBe('O');

      // Player O requests rematch -> game resets
      const res2 = roomManager.handleRematchRequest(socketO);
      expect(res2.success).toBe(true);
      expect(res2.reset).toBe(true);
      expect(res2.gameState.overallWinner).toBeNull();
      expect(res2.gameState.moveCount).toBe(0);
      expect(res2.gameState.currentPlayer).toBe('X');
    });
  });

  describe('6. Disconnect & Reconnect Handling', () => {
    let roomCode;
    const socketX = 'sock_x';
    const socketO = 'sock_o';

    beforeEach(() => {
      const host = roomManager.createRoom(socketX, 'Alice');
      roomCode = host.roomCode;
      roomManager.joinRoom(roomCode, socketO, 'Bob');
    });

    it('marks player as disconnected and notifies remaining opponent', () => {
      const dc = roomManager.handleDisconnect(socketX);
      expect(dc).toBeDefined();
      expect(dc.symbol).toBe('X');
      expect(dc.player.connected).toBe(false);
      expect(dc.player.disconnectedAt).toBeTypeOf('number');
      expect(dc.opponentSymbol).toBe('O');
      expect(dc.opponent.connected).toBe(true);

      // Room still exists during grace period
      const room = roomManager.getRoom(roomCode);
      expect(room).toBeDefined();
    });

    it('allows a disconnected player to reconnect to their existing slot', () => {
      roomManager.handleDisconnect(socketO);

      // O reconnects with a new socket ID
      const rejoin = roomManager.joinRoom(roomCode, 'sock_o_new', 'Bob');
      expect(rejoin.success).toBe(true);
      expect(rejoin.symbol).toBe('O');
      expect(rejoin.room.players.O.connected).toBe(true);
    });

    it('cleans up room immediately when both players explicitly leave', () => {
      roomManager.leaveRoom(socketX);
      roomManager.leaveRoom(socketO);

      const room = roomManager.getRoom(roomCode);
      expect(room).toBeUndefined();
    });
  });

  describe('7. Player Name Updates', () => {
    it('updates player name authoritatively with sanitization', () => {
      const host = roomManager.createRoom('sock_x', 'Alice');
      const update = roomManager.updatePlayerName('sock_x', '   NewSuperName   ');
      expect(update.success).toBe(true);
      expect(update.name).toBe('NewSuperName');

      // Verify sanitized room reflects new name
      const room = roomManager.getRoom(host.roomCode);
      expect(room.players.X.name).toBe('NewSuperName');
    });
  });

  describe('8. Single-Origin Security & CORS Verification', () => {
    it('permits requests with no origin (same-origin, curl, server-to-server)', () => {
      expect(isOriginAllowed(undefined)).toBe(true);
      expect(isOriginAllowed('')).toBe(true);
    });

    it('permits localhost and local dev origins', () => {
      expect(isOriginAllowed('http://localhost:5173')).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:5173')).toBe(true);
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    });

    it('permits same-origin requests where origin host matches the Host header', () => {
      expect(isOriginAllowed('https://my-game.onrender.com', 'my-game.onrender.com')).toBe(true);
      expect(isOriginAllowed('http://uttt.internal:8080', 'uttt.internal:8080')).toBe(true);
    });

    it('blocks arbitrary third-party cross-origin requests', () => {
      expect(isOriginAllowed('https://malicious-attacker.com', 'my-game.onrender.com')).toBe(false);
      expect(isOriginAllowed('https://evil.site', 'localhost:3000')).toBe(false);
    });
  });

  describe('9. Production Single-Service HTTP Serving & SPA Fallback', () => {
    let testServer;
    let baseUrl;

    beforeEach(async () => {
      testServer = http.createServer(app);
      await new Promise((resolve) => {
        testServer.listen(0, '127.0.0.1', () => {
          baseUrl = `http://127.0.0.1:${testServer.address().port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      if (testServer) {
        await new Promise((resolve) => testServer.close(resolve));
      }
    });

    it('serves /api/health with status ok and active room count', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');
      expect(typeof json.uptime).toBe('number');
      expect(typeof json.activeRooms).toBe('number');
    });

    it('returns 404 JSON for unknown API routes without returning index.html', async () => {
      const res = await fetch(`${baseUrl}/api/non_existent_endpoint`);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('NOT_FOUND');
      expect(json.message).toContain('/api/non_existent_endpoint');
    });

    it('returns 404 JSON for invalid /socket.io routes without returning index.html', async () => {
      const res = await fetch(`${baseUrl}/socket.io/invalid_route`);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('NOT_FOUND');
    });

    it('serves dist/index.html for client-side SPA GET routes', async () => {
      const res = await fetch(`${baseUrl}/room/ABC123`);
      expect(res.status).toBe(200);
      const contentType = res.headers.get('content-type');
      expect(contentType).toContain('text/html');
      const text = await res.text();
      expect(text).toContain('Ultimate Tic-Tac-Toe');
    });

    it('rejects unsupported HTTP methods on client routes with 405 Method Not Allowed', async () => {
      const res = await fetch(`${baseUrl}/room/ABC123`, { method: 'POST' });
      expect(res.status).toBe(405);
      const json = await res.json();
      expect(json.error).toBe('METHOD_NOT_ALLOWED');
    });
  });
});

