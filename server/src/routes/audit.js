import express from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get audit log history for a session
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const logs = await prisma.interviewAuditLog.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    res.json({ logs });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve audit log.' });
  }
});

// Append an audit log event
router.post('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { eventType, codeLength, delta } = req.body;

    const log = await prisma.interviewAuditLog.create({
      data: {
        sessionId,
        eventType: eventType || 'KEYSTROKE',
        codeLength: codeLength || 0,
        delta: delta || '',
      },
    });

    res.status(201).json({ log });
  } catch (error) {
    console.error('Record audit log error:', error);
    res.status(500).json({ error: 'Failed to record audit log event.' });
  }
});

export default router;
