import { io, Socket } from 'socket.io-client';

export function createSocket(): Socket {
  return io(import.meta.env.VITE_API_URL || 'http://localhost:5000');
}
