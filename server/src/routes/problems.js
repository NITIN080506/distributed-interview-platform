import express from 'express';
import prisma from '../prisma.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// List all problems
router.get('/', async (req, res) => {
  try {
    const { difficulty, tag, search } = req.query;

    const where = {};
    if (difficulty) where.difficulty = difficulty;
    if (tag) where.tags = { has: tag };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const problems = await prisma.problem.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        tags: true,
        timeLimitMs: true,
        memoryLimitMb: true,
        createdAt: true,
        _count: {
          select: { testCases: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ problems });
  } catch (error) {
    console.error('Fetch problems error:', error);
    res.status(500).json({ error: 'Failed to retrieve problems.' });
  }
});

// Get problem by ID or slug
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    const problem = await prisma.problem.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        testCases: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isHidden: true,
            order: true,
          },
        },
      },
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    // By default, public endpoint hides hidden test cases
    const publicProblem = {
      ...problem,
      testCases: problem.testCases.map((tc) => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.isHidden ? '[Hidden Test Case]' : tc.expectedOutput,
        isHidden: tc.isHidden,
        order: tc.order,
      })),
    };

    res.json({ problem: publicProblem });
  } catch (error) {
    console.error('Fetch problem detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve problem details.' });
  }
});

// Create problem (Interviewer / Admin only)
router.post(
  '/',
  authenticateToken,
  requireRole(['INTERVIEWER', 'ADMIN']),
  async (req, res) => {
    try {
      const {
        title,
        description,
        difficulty,
        tags,
        starterCodes,
        timeLimitMs,
        memoryLimitMb,
        testCases,
      } = req.body;

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required.' });
      }

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const problem = await prisma.problem.create({
        data: {
          title,
          slug: `${slug}-${Date.now().toString().slice(-4)}`,
          description,
          difficulty: difficulty || 'MEDIUM',
          tags: tags || [],
          starterCodes: starterCodes || {},
          timeLimitMs: Number(timeLimitMs) || 2000,
          memoryLimitMb: Number(memoryLimitMb) || 128,
          testCases: {
            create: (testCases || []).map((tc, index) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: !!tc.isHidden,
              order: index + 1,
            })),
          },
        },
        include: {
          testCases: true,
        },
      });

      res.status(201).json({ message: 'Problem created successfully.', problem });
    } catch (error) {
      console.error('Create problem error:', error);
      res.status(500).json({ error: 'Failed to create problem.' });
    }
  }
);

export default router;
