import Redis from 'ioredis';
import prisma from '../prisma.js';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

// In-memory track of active rooms and their participants
const roomUsers = new Map(); // sessionId -> Map(socketId -> user)

export function setupInterviewSockets(io) {
  // Setup Redis subscriber for execution telemetry events pushed by workers
  const redisSub = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    lazyConnect: true,
  });

  redisSub.connect().then(() => {
    console.log('📡 Redis Pub/Sub subscriber connected for WebSockets broadcast');
    redisSub.subscribe('submission-updates', (err) => {
      if (err) console.error('Failed to subscribe to submission-updates:', err);
    });
  }).catch((err) => {
    console.warn('⚠️ Redis Sub warning (background telemetry sync disabled until Redis is up):', err.message);
  });

  redisSub.on('message', (channel, message) => {
    if (channel === 'submission-updates') {
      try {
        const data = JSON.parse(message);
        const { sessionId, submissionId, status, telemetry } = data;

        // Broadcast to specific room or globally to the submission listener
        if (sessionId) {
          io.to(`session:${sessionId}`).emit('submission-telemetry', data);
        }
        io.emit(`submission:${submissionId}`, data);
      } catch (err) {
        console.error('Error parsing Redis PubSub message:', err);
      }
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Join Interview Room
    socket.on('join-room', async ({ sessionId, user }) => {
      if (!sessionId || !user) return;

      socket.join(`session:${sessionId}`);
      socket.sessionId = sessionId;
      socket.user = user;

      if (!roomUsers.has(sessionId)) {
        roomUsers.set(sessionId, new Map());
      }
      roomUsers.get(sessionId).set(socket.id, user);

      const activeUsers = Array.from(roomUsers.get(sessionId).values());

      // Notify everyone in the room of updated participant list
      io.to(`session:${sessionId}`).emit('active-users', activeUsers);
      socket.to(`session:${sessionId}`).emit('user-joined', { user, timestamp: new Date() });

      console.log(`👤 User "${user.name}" (${user.role}) joined session: ${sessionId}`);
    });

    // Real-Time Code Sync (Monaco Editor)
    socket.on('code-change', async ({ sessionId, code, language, cursor }) => {
      if (!sessionId) return;

      // Broadcast changes to all other peers in the room
      socket.to(`session:${sessionId}`).emit('code-update', {
        code,
        language,
        senderId: socket.id,
        cursor,
      });

      // Periodically debounce persist code to DB in background
      try {
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { code, language: language || 'python' },
        }).catch(() => {});
      } catch (_) {}
    });

    // Language switch synchronization
    socket.on('language-change', ({ sessionId, language, starterCode }) => {
      if (!sessionId) return;
      socket.to(`session:${sessionId}`).emit('language-update', {
        language,
        code: starterCode,
        changedBy: socket.user?.name || 'Peer',
      });
    });

    // Cursor position synchronization
    socket.on('cursor-change', ({ sessionId, cursor }) => {
      if (!sessionId) return;
      socket.to(`session:${sessionId}`).emit('cursor-update', {
        user: socket.user,
        cursor,
        socketId: socket.id,
      });
    });

    // Real-Time Room Chat
    socket.on('send-chat', ({ sessionId, message }) => {
      if (!sessionId || !message) return;
      const chatItem = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user: socket.user,
        text: message,
        createdAt: new Date().toISOString(),
      };
      io.to(`session:${sessionId}`).emit('new-chat-message', chatItem);
    });

    // Client Disconnect
    socket.on('disconnect', () => {
      const sessionId = socket.sessionId;
      if (sessionId && roomUsers.has(sessionId)) {
        roomUsers.get(sessionId).delete(socket.id);
        const activeUsers = Array.from(roomUsers.get(sessionId).values());
        io.to(`session:${sessionId}`).emit('active-users', activeUsers);
        socket.to(`session:${sessionId}`).emit('user-left', {
          user: socket.user,
          timestamp: new Date(),
        });
      }
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}
