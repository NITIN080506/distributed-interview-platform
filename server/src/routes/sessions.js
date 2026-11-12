import express from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// List user's sessions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await prisma.interviewSession.findMany({
      where: {
        OR: [{ interviewerId: userId }, { candidateId: userId }],
      },
      include: {
        interviewer: { select: { id: true, name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true } },
        problem: { select: { id: true, title: true, slug: true, difficulty: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ error: 'Failed to retrieve sessions.' });
  }
});

// Create new interview session
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, candidateEmail, problemId, language } = req.body;

    let candidateId = null;
    if (candidateEmail) {
      const candidateUser = await prisma.user.findUnique({
        where: { email: candidateEmail.toLowerCase().trim() },
      });
      if (candidateUser) {
        candidateId = candidateUser.id;
      }
    }

    let initialCode = '';
    const selectedLanguage = language || 'python';

    if (problemId) {
      const problem = await prisma.problem.findUnique({
        where: { id: problemId },
      });
      if (problem && problem.starterCodes && problem.starterCodes[selectedLanguage]) {
        initialCode = problem.starterCodes[selectedLanguage];
      }
    }

    const session = await prisma.interviewSession.create({
      data: {
        title: title || 'Technical Interview Session',
        interviewerId: req.user.id,
        candidateId,
        problemId: problemId || null,
        language: selectedLanguage,
        code: initialCode,
        status: 'LIVE',
      },
      include: {
        interviewer: { select: { id: true, name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true } },
        problem: true,
      },
    });

    res.status(201).json({ message: 'Session created successfully.', session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create interview session.' });
  }
});

// Get session by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.interviewSession.findUnique({
      where: { id },
      include: {
        interviewer: { select: { id: true, name: true, email: true } },
        candidate: { select: { id: true, name: true, email: true } },
        problem: {
          include: {
            testCases: {
              where: { isHidden: false },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Interview session not found.' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Fetch session error:', error);
    res.status(500).json({ error: 'Failed to retrieve session.' });
  }
});

// Update session (e.g. status, notes, saved code)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, code, language, problemId } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (code !== undefined) updateData.code = code;
    if (language) updateData.language = language;
    if (problemId) updateData.problemId = problemId;

    const session = await prisma.interviewSession.update({
      where: { id },
      data: updateData,
    });

    res.json({ message: 'Session updated successfully.', session });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session.' });
  }
});

export default router;
