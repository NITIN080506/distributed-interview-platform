import express from 'express';
import prisma from '../prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get Scorecard for a session
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const scorecard = await prisma.scorecard.findUnique({
      where: { sessionId },
      include: {
        interviewer: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ scorecard });
  } catch (error) {
    console.error('Fetch scorecard error:', error);
    res.status(500).json({ error: 'Failed to retrieve scorecard.' });
  }
});

// Upsert Scorecard (Interviewer / Admin only)
router.post(
  '/:sessionId',
  authenticateToken,
  requireRole(['INTERVIEWER', 'ADMIN']),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const {
        problemSolvingRating,
        dsaRating,
        codeQualityRating,
        communicationRating,
        decision,
        notes,
        strengths,
        weaknesses,
        isSubmitted,
      } = req.body;

      const scorecard = await prisma.scorecard.upsert({
        where: { sessionId },
        create: {
          sessionId,
          interviewerId: req.user.id,
          problemSolvingRating: Number(problemSolvingRating) || 3,
          dsaRating: Number(dsaRating) || 3,
          codeQualityRating: Number(codeQualityRating) || 3,
          communicationRating: Number(communicationRating) || 3,
          decision: decision || 'HIRE',
          notes: notes || '',
          strengths: strengths || '',
          weaknesses: weaknesses || '',
          isSubmitted: !!isSubmitted,
        },
        update: {
          problemSolvingRating: Number(problemSolvingRating) || 3,
          dsaRating: Number(dsaRating) || 3,
          codeQualityRating: Number(codeQualityRating) || 3,
          communicationRating: Number(communicationRating) || 3,
          decision: decision || 'HIRE',
          notes: notes || '',
          strengths: strengths || '',
          weaknesses: weaknesses || '',
          isSubmitted: !!isSubmitted,
        },
      });

      res.json({ message: 'Scorecard saved successfully.', scorecard });
    } catch (error) {
      console.error('Save scorecard error:', error);
      res.status(500).json({ error: 'Failed to save scorecard.' });
    }
  }
);

export default router;
