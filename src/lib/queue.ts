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
    removeOnComplete: true, // Optional: Keep completed jobs for history, or remove to save space
    removeOnFail: false,
  },
});
