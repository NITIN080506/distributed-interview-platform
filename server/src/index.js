import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import problemsRoutes from './routes/problems.js';
import submissionsRoutes from './routes/submissions.js';
import sessionsRoutes from './routes/sessions.js';
import scorecardsRoutes from './routes/scorecards.js';
import auditRoutes from './routes/audit.js';
import { setupInterviewSockets } from './sockets/interviewSocket.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 5000;

// Setup Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: [CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Distributed Code Execution & Interview Platform API Gateway',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/scorecards', scorecardsRoutes);
app.use('/api/audit', auditRoutes);

// Socket.io Handlers
setupInterviewSockets(io);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});

server.listen(PORT, () => {
  console.log(`🚀 API Gateway & WebSocket Server listening on port ${PORT}`);
  console.log(`📡 WebSocket ready at ws://localhost:${PORT}`);
});
