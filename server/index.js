import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { RoomManager } from './roomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

/**
 * Validates whether an incoming Origin header is permitted.
 * In production single-service deployment, only same-origin requests or
 * explicitly configured CLIENT_ORIGIN / RENDER_EXTERNAL_URL are permitted.
 * Arbitrary third-party cross-origin requests are blocked.
 */
function isOriginAllowed(origin, hostHeader) {
  // Allow requests without Origin header (same-origin standard navigation, server-to-server, curl)
  if (!origin) return true;

  // Local development origins
  const devOrigins = [
    CLIENT_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  if (devOrigins.includes(origin)) return true;

  // Explicitly configured production client origin
  if (process.env.CLIENT_ORIGIN && origin === process.env.CLIENT_ORIGIN) {
    return true;
  }

  // Render external URL (e.g. https://my-app.onrender.com)
  if (process.env.RENDER_EXTERNAL_URL) {
    try {
      if (new URL(origin).origin === new URL(process.env.RENDER_EXTERNAL_URL).origin) {
        return true;
      }
    } catch {
      // ignore URL parsing error
    }
  }

  // Same-origin verification: origin host strictly matching the Host header
  if (hostHeader) {
    try {
      if (new URL(origin).host === hostHeader) {
        return true;
      }
    } catch {
      // ignore URL parsing error
    }
  }

  return false;
}

// CORS configuration for Express
const corsOptionsDelegate = (req, callback) => {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (isOriginAllowed(origin, host)) {
    callback(null, { origin: true, credentials: true, methods: ['GET', 'POST'] });
  } else {
    callback(null, { origin: false });
  }
};

app.use(cors(corsOptionsDelegate));
app.use(express.json());

// Socket.IO Server attached to the same HTTP server
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (isOriginAllowed(origin, host)) {
      callback(null, true);
    } else {
      callback(3, false); // 3 = Engine.IO handshake error
    }
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 10000,
});

const roomManager = new RoomManager();

// Periodic cleanup of stale/idle rooms every 15 minutes
const cleanupInterval = setInterval(() => {
  roomManager.cleanupStaleRooms();
}, 15 * 60 * 1000);
cleanupInterval.unref?.();

// ---------------------------------------------------------------------------
// Socket.IO Event Handlers
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  // 1. Create a room
  socket.on('create_room', (data, callback) => {
    const playerName = data?.playerName || 'Player 1';
    const result = roomManager.createRoom(socket.id, playerName);

    if (result.success) {
      socket.join(result.roomCode);
      if (typeof callback === 'function') {
        callback({
          success: true,
          roomCode: result.roomCode,
          symbol: result.symbol,
          room: result.room,
        });
      }
    } else {
      if (typeof callback === 'function') {
        callback({ success: false, error: result.error });
      }
    }
  });

  // 2. Join a room
  socket.on('join_room', (data, callback) => {
    const { roomCode, playerName } = data || {};
    const result = roomManager.joinRoom(roomCode, socket.id, playerName || 'Player 2');

    if (result.success) {
      socket.join(result.roomCode);

      // Notify the joining player
      if (typeof callback === 'function') {
        callback({
          success: true,
          roomCode: result.roomCode,
          symbol: result.symbol,
          room: result.room,
        });
      }

      // Broadcast to the whole room (especially Player X) that opponent has joined
      socket.to(result.roomCode).emit('opponent_joined', {
        room: result.room,
        symbol: result.symbol,
        name: result.room.players.O?.name,
      });
    } else {
      if (typeof callback === 'function') {
        callback({ success: false, error: result.error });
      }
    }
  });

  // 3. Make a move (Server-Authoritative Validation)
  socket.on('make_move', (data, callback) => {
    const { boardIndex, cellIndex } = data || {};
    const result = roomManager.handleMove(socket.id, boardIndex, cellIndex);

    if (result.success) {
      // Broadcast the updated state and last move to all sockets in the room
      io.to(result.roomCode).emit('game_updated', {
        gameState: result.gameState,
        room: result.room,
      });

      if (typeof callback === 'function') {
        callback({ success: true, gameState: result.gameState });
      }
    } else {
      if (typeof callback === 'function') {
        callback({ success: false, error: result.error });
      }
    }
  });

  // 4. Request rematch
  socket.on('request_rematch', (data, callback) => {
    const result = roomManager.handleRematchRequest(socket.id);

    if (result.success) {
      if (result.reset) {
        // Both players agreed -> broadcast brand-new match state
        io.to(result.roomCode).emit('rematch_started', {
          gameState: result.gameState,
          room: result.room,
        });
      } else {
        // One player requested -> notify the opponent
        socket.to(result.roomCode).emit('rematch_requested', {
          room: result.room,
          waitingFor: result.waitingFor,
        });
      }

      if (typeof callback === 'function') {
        callback({ success: true, reset: result.reset, room: result.room });
      }
    } else {
      if (typeof callback === 'function') {
        callback({ success: false, error: result.error });
      }
    }
  });

  // 5. Update player name
  socket.on('update_name', (data, callback) => {
    const { name } = data || {};
    const result = roomManager.updatePlayerName(socket.id, name);

    if (result.success) {
      io.to(result.roomCode).emit('player_name_updated', {
        symbol: result.symbol,
        name: result.name,
        room: result.room,
      });
      if (typeof callback === 'function') {
        callback({ success: true, name: result.name });
      }
    } else {
      if (typeof callback === 'function') {
        callback({ success: false, error: result.error });
      }
    }
  });

  // 6. Leave room explicitly
  socket.on('leave_room', (data, callback) => {
    const result = roomManager.leaveRoom(socket.id);
    if (result) {
      socket.leave(result.roomCode);
      socket.to(result.roomCode).emit('opponent_left', {
        symbol: result.symbol,
        room: result.room,
      });
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } else {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'NOT_IN_ROOM' });
      }
    }
  });

  // 7. Disconnection
  socket.on('disconnect', () => {
    const result = roomManager.handleDisconnect(socket.id);
    if (result) {
      socket.to(result.roomCode).emit('player_disconnected', {
        symbol: result.symbol,
        name: result.player?.name,
        room: result.room,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Production Static Serving & SPA Fallback
// ---------------------------------------------------------------------------
const distPath = path.resolve(__dirname, '../dist');

// Serve static assets from frontend build
app.use(express.static(distPath));

// Health check endpoint for Render zero-downtime monitoring
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeRooms: roomManager.rooms.size,
    timestamp: Date.now(),
  });
});

// Explicit API & Socket.IO 404 handlers — NEVER return index.html for API or Socket.IO requests
app.use((req, res, next) => {
  if (req.path === '/api' || req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `API endpoint ${req.method} ${req.path} not found`,
    });
  }
  if (req.path === '/socket.io' || req.path.startsWith('/socket.io/')) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Socket.IO endpoint not found',
    });
  }
  next();
});

// Single-page React app fallback: only serve index.html for GET/HEAD requests
app.use((req, res) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  return res.status(405).json({
    error: 'METHOD_NOT_ALLOWED',
    message: `Method ${req.method} not allowed on route ${req.path}`,
  });
});

// Start listening when run directly (node server/index.js or npm start)
const isDirectRun = Boolean(
  process.argv[1] &&
    (process.argv[1].endsWith('server/index.js') ||
      process.argv[1].endsWith('server\\index.js') ||
      process.argv[1].endsWith('server'))
);

if (isDirectRun || process.env.RENDER) {
  server.listen(PORT, HOST, () => {
    console.log(`Ultimate Tic-Tac-Toe Server running on http://${HOST}:${PORT} [${NODE_ENV}]`);
  });
}

export { app, server, io, roomManager, isOriginAllowed };
