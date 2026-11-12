import { Queue } from 'bullmq';
import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

export const redisConnection = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

redisConnection.on('error', (err) => {
  console.warn('⚠️ Redis connection warning:', err.message);
});

// BullMQ Queue for code submissions
export const submissionQueue = new Queue('code-submissions', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

export async function enqueueSubmission(data) {
  return await submissionQueue.add('execute-code', data, {
    jobId: data.submissionId,
  });
}
