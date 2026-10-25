import { createInitialState, isValidMove, makeMove, validatePlayerName } from '../src/gameLogic.js';

/**
 * Clean character set for room codes (excludes ambiguous chars like 0, O, 1, I).
 */
const ROOM_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_CODE_LENGTH = 6;
const DEFAULT_DISCONNECT_GRACE_MS = 60000; // 60 seconds
const ROOM_MAX_IDLE_MS = 2 * 60 * 60 * 1000; // 2 hours

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> room
    this.socketToRoom = new Map(); // socketId -> { roomCode, symbol }
  }

  /**
   * Generates a unique 6-character room code.
   */
  generateRoomCode() {
    let attempts = 0;
    while (attempts < 1000) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        const randIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
        code += ROOM_CODE_CHARS[randIndex];
      }
      if (!this.rooms.has(code)) {
        return code;
      }
      attempts++;
    }
    // Fallback if collision rate is unexpectedly high
    return `R${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }

  /**
   * Creates a new room with the calling socket as Player X (Host).
   */
  createRoom(socketId, playerName = 'Player 1') {
    // If socket is already in another room, disconnect them from previous room
    if (this.socketToRoom.has(socketId)) {
      this.leaveRoom(socketId);
    }

    const roomCode = this.generateRoomCode();
    const cleanName = validatePlayerName(playerName, 'Player 1');

    const room = {
      roomCode,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      gameState: createInitialState(),
      players: {
        X: {
          id: socketId,
          name: cleanName,
          connected: true,
          disconnectedAt: null,
        },
        O: null,
      },
      rematchRequests: {
        X: false,
        O: false,
      },
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(socketId, { roomCode, symbol: 'X' });

    return {
      success: true,
      roomCode,
      symbol: 'X',
      room: this.sanitizeRoom(room),
    };
  }

  /**
   * Joins an existing room with the calling socket as Player O (Guest).
   */
  joinRoom(roomCode, socketId, playerName = 'Player 2') {
    if (!roomCode || typeof roomCode !== 'string') {
      return { success: false, error: 'INVALID_ROOM_CODE' };
    }

    const code = roomCode.trim().toUpperCase();
    const room = this.rooms.get(code);

    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' };
    }

    // Check if player is already in this room (reconnection scenario)
    if (room.players.X && room.players.X.id === socketId) {
      room.players.X.connected = true;
      room.players.X.disconnectedAt = null;
      room.lastActivity = Date.now();
      this.socketToRoom.set(socketId, { roomCode: code, symbol: 'X' });
      return {
        success: true,
        roomCode: code,
        symbol: 'X',
        room: this.sanitizeRoom(room),
      };
    }

    if (room.players.O && room.players.O.id === socketId) {
      room.players.O.connected = true;
      room.players.O.disconnectedAt = null;
      room.lastActivity = Date.now();
      this.socketToRoom.set(socketId, { roomCode: code, symbol: 'O' });
      return {
        success: true,
        roomCode: code,
        symbol: 'O',
        room: this.sanitizeRoom(room),
      };
    }

    // Reconnecting as O if O disconnected
    if (room.players.O && !room.players.O.connected) {
      room.players.O.id = socketId;
      room.players.O.connected = true;
      room.players.O.disconnectedAt = null;
      room.lastActivity = Date.now();
      this.socketToRoom.set(socketId, { roomCode: code, symbol: 'O' });
      return {
        success: true,
        roomCode: code,
        symbol: 'O',
        room: this.sanitizeRoom(room),
      };
    }

    // Room capacity check: max 2 players
    if (room.players.O !== null) {
      return { success: false, error: 'ROOM_FULL' };
    }

    // Assign Guest as Player O
    const cleanName = validatePlayerName(playerName, 'Player 2');
    room.players.O = {
      id: socketId,
      name: cleanName,
      connected: true,
      disconnectedAt: null,
    };
    room.lastActivity = Date.now();
    this.socketToRoom.set(socketId, { roomCode: code, symbol: 'O' });

    return {
      success: true,
      roomCode: code,
      symbol: 'O',
      room: this.sanitizeRoom(room),
    };
  }

  /**
   * Applies a move authoritatively on the server.
   * Client-supplied symbols or board states are NEVER trusted.
   */
  handleMove(socketId, boardIndex, cellIndex) {
    const membership = this.socketToRoom.get(socketId);
    if (!membership) {
      return { success: false, error: 'NOT_IN_ROOM' };
    }

    const { roomCode, symbol } = membership;
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' };
    }

    // Ensure both players are in the room before moves begin
    if (!room.players.X || !room.players.O) {
      return { success: false, error: 'WAITING_FOR_OPPONENT' };
    }

    // Validate finished-game status
    if (room.gameState.overallWinner !== null) {
      return { success: false, error: 'GAME_OVER' };
    }

    // Validate turn order strictly against the socket's assigned symbol
    if (room.gameState.currentPlayer !== symbol) {
      return { success: false, error: 'WRONG_TURN' };
    }

    // Validate move rules via pure game logic
    if (!isValidMove(room.gameState, boardIndex, cellIndex)) {
      return { success: false, error: 'INVALID_MOVE' };
    }

    // Apply move authoritatively
    const nextState = makeMove(room.gameState, boardIndex, cellIndex);
    room.gameState = nextState;
    room.lastActivity = Date.now();
    // Invalidate any previous rematch votes once a move occurs
    room.rematchRequests = { X: false, O: false };

    return {
      success: true,
      roomCode,
      symbol,
      gameState: room.gameState,
      room: this.sanitizeRoom(room),
    };
  }

  /**
   * Handles rematch requests when game has concluded.
   */
  handleRematchRequest(socketId) {
    const membership = this.socketToRoom.get(socketId);
    if (!membership) {
      return { success: false, error: 'NOT_IN_ROOM' };
    }

    const { roomCode, symbol } = membership;
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' };
    }

    if (room.gameState.overallWinner === null) {
      return { success: false, error: 'GAME_NOT_OVER' };
    }

    room.rematchRequests[symbol] = true;
    room.lastActivity = Date.now();

    // If both players have requested a rematch, reset the game state
    if (room.rematchRequests.X && room.rematchRequests.O) {
      room.gameState = createInitialState();
      room.rematchRequests = { X: false, O: false };
      return {
        success: true,
        reset: true,
        roomCode,
        gameState: room.gameState,
        room: this.sanitizeRoom(room),
      };
    }

    return {
      success: true,
      reset: false,
      roomCode,
      waitingFor: symbol === 'X' ? 'O' : 'X',
      room: this.sanitizeRoom(room),
    };
  }

  /**
   * Handles socket disconnection with a reconnect grace period.
   */
  handleDisconnect(socketId, graceMs = DEFAULT_DISCONNECT_GRACE_MS) {
    const membership = this.socketToRoom.get(socketId);
    if (!membership) {
      return null;
    }

    const { roomCode, symbol } = membership;
    const room = this.rooms.get(roomCode);
    this.socketToRoom.delete(socketId);

    if (!room) {
      return null;
    }

    const player = room.players[symbol];
    if (player) {
      player.connected = false;
      player.disconnectedAt = Date.now();
    }
    room.lastActivity = Date.now();

    const opponentSymbol = symbol === 'X' ? 'O' : 'X';
    const opponent = room.players[opponentSymbol];

    // If both players are disconnected, schedule room deletion after grace period
    const allDisconnected =
      (!room.players.X || !room.players.X.connected) &&
      (!room.players.O || !room.players.O.connected);

    if (allDisconnected) {
      setTimeout(() => {
        const currentRoom = this.rooms.get(roomCode);
        if (
          currentRoom &&
          (!currentRoom.players.X || !currentRoom.players.X.connected) &&
          (!currentRoom.players.O || !currentRoom.players.O.connected)
        ) {
          this.rooms.delete(roomCode);
        }
      }, graceMs);
    }

    return {
      roomCode,
      symbol,
      player,
      opponent,
      opponentSymbol,
      room: this.sanitizeRoom(room),
    };
  }

  /**
   * Explicitly leaves a room (e.g. clicking 'Leave Match').
   */
  leaveRoom(socketId) {
    const membership = this.socketToRoom.get(socketId);
    if (!membership) {
      return null;
    }

    const { roomCode, symbol } = membership;
    const room = this.rooms.get(roomCode);
    this.socketToRoom.delete(socketId);

    if (!room) {
      return null;
    }

    room.players[symbol] = null;
    room.lastActivity = Date.now();

    // If both player slots are now empty, remove room immediately
    if (!room.players.X && !room.players.O) {
      this.rooms.delete(roomCode);
    }

    return {
      roomCode,
      symbol,
      opponentSymbol: symbol === 'X' ? 'O' : 'X',
      room: this.sanitizeRoom(room),
    };
  }

  /**
   * Updates a player's display name inside an active room.
   */
  updatePlayerName(socketId, newName) {
    const membership = this.socketToRoom.get(socketId);
    if (!membership) {
      return { success: false, error: 'NOT_IN_ROOM' };
    }

    const { roomCode, symbol } = membership;
    const room = this.rooms.get(roomCode);
    if (!room || !room.players[symbol]) {
      return { success: false, error: 'PLAYER_NOT_FOUND' };
    }

    const fallback = symbol === 'X' ? 'Player 1' : 'Player 2';
    const cleanName = validatePlayerName(newName, fallback);
    room.players[symbol].name = cleanName;
    room.lastActivity = Date.now();

    return {
      success: true,
      roomCode,
      symbol,
      name: cleanName,
      room: this.sanitizeRoom(room),
    };
  }

  /**
   * Sanitizes room data before sending over the network (removes raw socket IDs).
   */
  sanitizeRoom(room) {
    if (!room) return null;
    return {
      roomCode: room.roomCode,
      gameState: room.gameState,
      players: {
        X: room.players.X
          ? {
              name: room.players.X.name,
              connected: room.players.X.connected,
            }
          : null,
        O: room.players.O
          ? {
              name: room.players.O.name,
              connected: room.players.O.connected,
            }
          : null,
      },
      rematchRequests: { ...room.rematchRequests },
    };
  }

  /**
   * Cleans up stale rooms that have been idle past max retention.
   */
  cleanupStaleRooms(maxIdleMs = ROOM_MAX_IDLE_MS) {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivity > maxIdleMs) {
        this.rooms.delete(code);
      }
    }
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode?.toUpperCase());
  }

  getMembership(socketId) {
    return this.socketToRoom.get(socketId);
  }
}
