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
        const { sessionId, submissionId } = data;

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
    // Join Interview Room
    socket.on('join-room', async ({ sessionId, user }) => {
      if (!sessionId || !user) return;

      socket.join(`session:${sessionId}`);
      socket.sessionId = sessionId;
      socket.user = user;

      if (!roomUsers.has(sessionId)) {
        roomUsers.set(sessionId, new Map());
      }
      roomUsers.get(sessionId).set(socket.id, { ...user, socketId: socket.id });

      const activeUsers = Array.from(roomUsers.get(sessionId).values());

      // Notify everyone in the room of updated participant list
      io.to(`session:${sessionId}`).emit('active-users', activeUsers);
      socket.to(`session:${sessionId}`).emit('user-joined', {
        user: { ...user, socketId: socket.id },
        timestamp: new Date(),
      });
    });

    // Real-Time Code Sync (Monaco Editor)
    socket.on('code-change', async ({ sessionId, code, language, cursor, delta }) => {
      if (!sessionId) return;

      // Broadcast changes to all other peers in the room
      socket.to(`session:${sessionId}`).emit('code-update', {
        code,
        language,
        senderId: socket.id,
        cursor,
      });

      // Periodically persist code and append audit log in background
      try {
        await prisma.interviewSession.update({
          where: { id: sessionId },
          data: { code, language: language || 'python' },
        }).catch(() => {});

        if (delta) {
          await prisma.interviewAuditLog.create({
            data: {
              sessionId,
              eventType: 'KEYSTROKE',
              codeLength: code ? code.length : 0,
              delta: typeof delta === 'string' ? delta : JSON.stringify(delta),
            },
          }).catch(() => {});
        }
      } catch (_) {}
    });

    // Language switch synchronization
    socket.on('language-change', async ({ sessionId, language, starterCode }) => {
      if (!sessionId) return;
      socket.to(`session:${sessionId}`).emit('language-update', {
        language,
        code: starterCode,
        changedBy: socket.user?.name || 'Peer',
      });

      await prisma.interviewAuditLog.create({
        data: {
          sessionId,
          eventType: 'LANGUAGE_CHANGE',
          codeLength: starterCode ? starterCode.length : 0,
          delta: `Switched language to ${language}`,
        },
      }).catch(() => {});
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

    // 🎨 Collaborative Whiteboard Drawing
    socket.on('whiteboard-draw', ({ sessionId, drawAction }) => {
      if (!sessionId) return;
      socket.to(`session:${sessionId}`).emit('whiteboard-remote-draw', drawAction);
    });

    socket.on('whiteboard-clear', ({ sessionId }) => {
      if (!sessionId) return;
      socket.to(`session:${sessionId}`).emit('whiteboard-remote-clear');
    });

    // 📹 WebRTC Peer-to-Peer Video/Audio Signaling
    socket.on('webrtc-offer', ({ sessionId, targetSocketId, offer }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-offer', {
          senderSocketId: socket.id,
          user: socket.user,
          offer,
        });
      } else {
        socket.to(`session:${sessionId}`).emit('webrtc-offer', {
          senderSocketId: socket.id,
          user: socket.user,
          offer,
        });
      }
    });

    socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc-answer', {
        senderSocketId: socket.id,
        answer,
      });
    });

    socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc-ice-candidate', {
        senderSocketId: socket.id,
        candidate,
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
          socketId: socket.id,
          timestamp: new Date(),
        });
      }
    });
  });
}
