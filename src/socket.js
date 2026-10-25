import { io } from 'socket.io-client';

let socket = null;

/**
 * Returns the singleton Socket.IO client.
 * Connects to the same origin via io() with no hardcoded URLs.
 */
export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

/**
 * Disconnects the socket if connected.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}
