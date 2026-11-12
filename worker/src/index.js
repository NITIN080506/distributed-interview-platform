import { Worker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import prisma from '../../server/src/prisma.js';
import { evaluateCodeSubmission } from './evaluator.js';

dotenv.config();
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

const redisConnection = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
});

// Dedicated publisher for live telemetry updates
const redisPub = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

console.log('👷 Background Code Execution Worker initializing...');

const worker = new Worker(
  'code-submissions',
  async (job) => {
    const { submissionId, sessionId, code, language, testCases, timeLimitMs, memoryLimitMb, isCustomRun } = job.data;
    console.log(`\n📥 [Job ${job.id}] Received submission: ${submissionId} (${language})`);

    try {
      // 1. Mark submission as PROCESSING
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'PROCESSING' },
      });

      // Emit status update over Redis PubSub
      await redisPub.publish(
        'submission-updates',
        JSON.stringify({
          submissionId,
          sessionId,
          status: 'PROCESSING',
          message: 'Executing in sandbox container...',
        })
      );

      // 2. Execute Code inside Sandbox Container
      const evaluation = await evaluateCodeSubmission({
        code,
        language,
        testCases,
        timeLimitMs,
        memoryLimitMb,
        isCustomRun,
      });

      console.log(`✅ [Job ${job.id}] Completed: ${evaluation.status} (${evaluation.passedTestCases}/${evaluation.totalTestCases} passed, ${evaluation.telemetry.runtimeMs}ms)`);

      // 3. Persist final results and execution telemetry to PostgreSQL
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: evaluation.status,
          passedTestCases: evaluation.passedTestCases,
          totalTestCases: evaluation.totalTestCases,
        },
      });

      await prisma.executionTelemetry.upsert({
        where: { submissionId },
        create: {
          submissionId,
          runtimeMs: evaluation.telemetry.runtimeMs,
          memoryKb: evaluation.telemetry.memoryKb,
          cpuUsagePercent: evaluation.telemetry.cpuUsagePercent,
          exitCode: evaluation.telemetry.exitCode,
          stdout: evaluation.telemetry.stdout,
          stderr: evaluation.telemetry.stderr,
          testCaseResults: evaluation.telemetry.testCaseResults,
        },
        update: {
          runtimeMs: evaluation.telemetry.runtimeMs,
          memoryKb: evaluation.telemetry.memoryKb,
          cpuUsagePercent: evaluation.telemetry.cpuUsagePercent,
          exitCode: evaluation.telemetry.exitCode,
          stdout: evaluation.telemetry.stdout,
          stderr: evaluation.telemetry.stderr,
          testCaseResults: evaluation.telemetry.testCaseResults,
        },
      });

      // 4. Publish real-time telemetry to Redis PubSub (Broadcasts to WebSockets)
      await redisPub.publish(
        'submission-updates',
        JSON.stringify({
          submissionId,
          sessionId,
          status: evaluation.status,
          passedTestCases: evaluation.passedTestCases,
          totalTestCases: evaluation.totalTestCases,
          telemetry: evaluation.telemetry,
        })
      );

      return evaluation;
    } catch (error) {
      console.error(`❌ [Job ${job.id}] Execution failed:`, error);
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'RUNTIME_ERROR' },
      }).catch(() => {});

      await redisPub.publish(
        'submission-updates',
        JSON.stringify({
          submissionId,
          sessionId,
          status: 'RUNTIME_ERROR',
          error: error.message,
        })
      );
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 4, // Concurrent execution workers
  }
);

worker.on('ready', () => {
  console.log('⚡ Code Execution Worker is READY and listening for jobs on BullMQ queue!');
});

worker.on('failed', (job, err) => {
  console.error(`⚠️ Job ${job?.id} failed with error:`, err.message);
});

// Graceful cleanup
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...');
  await worker.close();
  await redisConnection.quit();
  await redisPub.quit();
  await prisma.$disconnect();
  process.exit(0);
});
