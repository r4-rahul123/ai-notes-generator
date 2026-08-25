import { Queue } from 'bullmq';
import { redis } from './redis';

export interface GenerateNoteJobData {
  userId: string;
  topic: string;
  classLevel: string;
  pdfContent?: string; // Optional context from uploaded PDF
}

export const notesQueueName = 'notes-generation-queue';

export const notesQueue = new Queue<GenerateNoteJobData>(notesQueueName, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false, // Must be false so the frontend can read the 'completed' state!
    removeOnFail: false,
  },
});
