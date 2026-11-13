import express from 'express';
import prisma from '../prisma.js';
import { enqueueSubmission } from '../redis.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Submit code for execution (Asynchronous worker queue via Redis)
router.post('/', authenticateToken, async (req, res) => {
  try {
    let { problemId, code, language, sessionId, customInput, isCustomRun } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required.' });
    }

    const validLanguages = ['python', 'javascript', 'cpp', 'java', 'go'];
    if (!validLanguages.includes(language.toLowerCase())) {
      return res.status(400).json({
        error: `Unsupported language. Supported: ${validLanguages.join(', ')}`,
      });
    }

    // Resolve sessionId: only set validSessionId if it exists in the database.
    // Virtual sessions (like "practice-...") must be null in PostgreSQL to avoid foreign key errors.
    let validSessionId = null;
    if (sessionId && !sessionId.startsWith('practice-')) {
      try {
        const sessionRecord = await prisma.interviewSession.findUnique({
          where: { id: sessionId },
          select: { id: true, problemId: true },
        });
        if (sessionRecord) {
          validSessionId = sessionRecord.id;
          if (!problemId && sessionRecord.problemId) {
            problemId = sessionRecord.problemId;
          }
        }
      } catch (_) {
        validSessionId = null;
      }
    }

    // Resolve problemId if missing (fallback to default problem)
    if (!problemId) {
      const defaultProblem = await prisma.problem.findFirst();
      if (defaultProblem) {
        problemId = defaultProblem.id;
      }
    }

    let problem = null;
    let testCasesToRun = [];

    if (problemId) {
      // Find problem by ID or slug
      problem = await prisma.problem.findFirst({
        where: {
          OR: [{ id: problemId }, { slug: problemId }],
        },
        include: {
          testCases: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!problem) {
        return res.status(404).json({ error: 'Problem not found.' });
      }

      problemId = problem.id;

      if (isCustomRun && customInput !== undefined) {
        testCasesToRun = [
          {
            id: 'custom-input',
            input: customInput,
            expectedOutput: '',
            isHidden: false,
          },
        ];
      } else if (isCustomRun) {
        // Run only public test cases
        testCasesToRun = (problem.testCases || []).filter((tc) => !tc.isHidden);
      } else {
        // Full evaluation: run all test cases (public + hidden)
        testCasesToRun = problem.testCases || [];
      }
    } else if (customInput !== undefined) {
      testCasesToRun = [
        {
          id: 'ad-hoc',
          input: customInput,
          expectedOutput: '',
          isHidden: false,
        },
      ];
    }

    // Ensure at least one testcase runs
    if (testCasesToRun.length === 0) {
      testCasesToRun = [
        {
          id: 'default-run',
          input: customInput !== undefined ? customInput : '',
          expectedOutput: '',
          isHidden: false,
        },
      ];
    }

    // 1. Create Submission record in PostgreSQL
    const submission = await prisma.submission.create({
      data: {
        userId: req.user.id,
        problemId: problem ? problem.id : problemId,
        sessionId: validSessionId, // Foreign key safe: null for practice rooms
        code,
        language: language.toLowerCase(),
        status: 'QUEUED',
        totalTestCases: testCasesToRun.length,
        passedTestCases: 0,
      },
      include: {
        problem: {
          select: { title: true, timeLimitMs: true, memoryLimitMb: true },
        },
      },
    });

    // 2. Prepare payload for Redis Worker Queue
    const jobPayload = {
      submissionId: submission.id,
      userId: req.user.id,
      sessionId: sessionId || null, // Keep room identifier for WebSocket live broadcast
      code,
      language: language.toLowerCase(),
      timeLimitMs: Math.max(Number(problem?.timeLimitMs) || 5000, 6000),
      memoryLimitMb: problem?.memoryLimitMb || 128,
      isCustomRun: !!isCustomRun,
      testCases: testCasesToRun.map((tc) => ({
        id: tc.id || 'tc',
        input: tc.input || '',
        expectedOutput: tc.expectedOutput || '',
        isHidden: !!tc.isHidden,
      })),
    };

    // 3. Dispatch to Redis Queue (Non-blocking)
    await enqueueSubmission(jobPayload);

    return res.status(202).json({
      message: 'Code submission enqueued for execution.',
      submissionId: submission.id,
      status: submission.status,
    });
  } catch (error) {
    console.error('Submission queue error:', error);
    return res.status(500).json({ error: error.message || 'Failed to enqueue code submission.' });
  }
});

// List user submissions with filtering and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, problemId, limit = 50 } = req.query;
    const where = { userId: req.user.id };
    if (status && status !== 'ALL') where.status = status;
    if (problemId) where.problemId = problemId;

    const submissions = await prisma.submission.findMany({
      where,
      take: parseInt(limit, 10),
      orderBy: { createdAt: 'desc' },
      include: {
        problem: {
          select: { id: true, title: true, difficulty: true },
        },
        telemetry: {
          select: { runtimeMs: true, memoryKb: true, sandboxType: true },
        },
      },
    });

    res.json({ submissions });
  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ error: 'Failed to retrieve submissions.' });
  }
});

// Get Submission Status and Telemetry
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        telemetry: true,
        problem: {
          select: { id: true, title: true, slug: true, difficulty: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    res.json({ submission });
  } catch (error) {
    console.error('Fetch submission error:', error);
    res.status(500).json({ error: 'Failed to retrieve submission.' });
  }
});

export default router;
