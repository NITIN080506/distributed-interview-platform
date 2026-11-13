import express from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { fetchLeetCodeProblem, CURATED_PACKS } from '../services/problemImporter.js';

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

// Import problem directly from LeetCode URL or Slug
router.post('/import-leetcode', authenticateToken, async (req, res) => {
  try {
    const { urlOrSlug } = req.body;
    if (!urlOrSlug) {
      return res.status(400).json({ error: 'LeetCode URL or problem slug is required.' });
    }

    const problemData = await fetchLeetCodeProblem(urlOrSlug);

    // Check if problem already exists
    let slug = problemData.slug;
    const existing = await prisma.problem.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const problem = await prisma.problem.create({
      data: {
        title: problemData.title,
        slug,
        description: problemData.description,
        difficulty: problemData.difficulty,
        tags: problemData.tags,
        starterCodes: problemData.starterCodes,
        timeLimitMs: problemData.timeLimitMs,
        memoryLimitMb: problemData.memoryLimitMb,
        testCases: {
          create: problemData.testCases.map((tc, idx) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: !!tc.isHidden,
            order: idx + 1,
          })),
        },
      },
      include: {
        testCases: true,
      },
    });

    res.status(201).json({
      message: `Successfully imported "${problem.title}" from LeetCode!`,
      problem,
    });
  } catch (error) {
    console.error('Import LeetCode problem error:', error);
    res.status(500).json({ error: error.message || 'Failed to import problem from LeetCode.' });
  }
});

// Import Curated Problem Pack (e.g. Blind 75 Essentials)
router.post('/import-pack', authenticateToken, async (req, res) => {
  try {
    const { packId = 'blind75' } = req.body;
    const pack = CURATED_PACKS[packId];

    if (!pack || pack.length === 0) {
      return res.status(404).json({ error: `Problem pack "${packId}" not found.` });
    }

    const createdProblems = [];
    for (const p of pack) {
      let slug = p.slug;
      const existing = await prisma.problem.findUnique({ where: { slug } });
      if (existing) {
        // Skip already imported problem
        continue;
      }

      const created = await prisma.problem.create({
        data: {
          title: p.title,
          slug,
          description: p.description,
          difficulty: p.difficulty,
          tags: p.tags,
          starterCodes: p.starterCodes,
          timeLimitMs: 2000,
          memoryLimitMb: 128,
          testCases: {
            create: p.testCases.map((tc, idx) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: !!tc.isHidden,
              order: idx + 1,
            })),
          },
        },
      });
      createdProblems.push(created);
    }

    res.status(201).json({
      message: `Successfully imported ${createdProblems.length} curated problems from "${packId}" pack!`,
      importedCount: createdProblems.length,
      problems: createdProblems,
    });
  } catch (error) {
    console.error('Import pack error:', error);
    res.status(500).json({ error: error.message || 'Failed to import problem pack.' });
  }
});

// Batch Import from Custom JSON
router.post('/import-json', authenticateToken, async (req, res) => {
  try {
    const { problems } = req.body;
    if (!Array.isArray(problems) || problems.length === 0) {
      return res.status(400).json({ error: 'An array of problem definitions is required.' });
    }

    const createdProblems = [];
    for (const p of problems) {
      if (!p.title || !p.description) continue;

      let slug = (p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
      const existing = await prisma.problem.findUnique({ where: { slug } });
      if (existing) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }

      const created = await prisma.problem.create({
        data: {
          title: p.title,
          slug,
          description: p.description,
          difficulty: p.difficulty || 'MEDIUM',
          tags: p.tags || [],
          starterCodes: p.starterCodes || {},
          timeLimitMs: Number(p.timeLimitMs) || 2000,
          memoryLimitMb: Number(p.memoryLimitMb) || 128,
          testCases: {
            create: (p.testCases || []).map((tc, idx) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: !!tc.isHidden,
              order: idx + 1,
            })),
          },
        },
      });
      createdProblems.push(created);
    }

    res.status(201).json({
      message: `Successfully imported ${createdProblems.length} problems.`,
      importedCount: createdProblems.length,
      problems: createdProblems,
    });
  } catch (error) {
    console.error('Batch import JSON error:', error);
    res.status(500).json({ error: error.message || 'Failed to batch import problems.' });
  }
});

// Create problem (Available to all authenticated developers)
router.post(
  '/',
  authenticateToken,
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
