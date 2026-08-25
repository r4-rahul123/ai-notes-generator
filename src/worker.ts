import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Worker, Job } from 'bullmq';
import { redis } from './lib/redis';
import { notesQueueName, GenerateNoteJobData } from './lib/queue';
import connectToDatabase from './lib/mongoose';
import Note from './lib/models/Note';
import User from './lib/models/User';
import { generateWithFallback } from './lib/gemini';
import { parseAiJson } from './lib/parseAiJson';
import { indexDocument } from './lib/rag/vectorSearch';
import * as http from 'http';

// Dummy HTTP server to satisfy Render's Web Service port binding requirement (so it's free)
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('AI Worker is alive and processing background jobs.\\n');
}).listen(PORT, () => console.log(`Worker health server listening on port ${PORT}`));

console.log('Starting Notes Generation Worker...');

const worker = new Worker<GenerateNoteJobData>(
  notesQueueName,
  async (job: Job<GenerateNoteJobData>) => {
    try {
      const { userId, topic, classLevel, pdfContent } = job.data;
      
      await job.updateProgress(10); // Connected and starting
      await connectToDatabase();
      
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");
      if (user.credits < 1) throw new Error("Insufficient credits");

      await job.updateProgress(20); // Database verified

      const prompt = `You are an expert AI tutor. Generate comprehensive study notes... 
Topic: "${topic}" 
Target Class/Level: "${classLevel}"
${pdfContent ? `\nContext from user's PDF:\n${pdfContent}\n\nIMPORTANT: Ground your notes PRIMARILY on the provided PDF context. Use the PDF as the core source of truth.` : ""}

Return ONLY a RAW JSON object (no markdown fences, no commentary) containing ALL of these exact keys:
{
  "title": "A concise title",
  "summary": "A 2-3 sentence overview.",
  "content": "Detailed Markdown string using ## for headings, ** for bold, and - for bullet points to structure the core notes. Do NOT use raw HTML tags.",
  "shortNotes": "Brief bullet points for quick revision.",
  "importantQuestions": [
    {
      "question": "Question 1 (Core Concept)",
      "answer": "Detailed, step-by-step clear answer..."
    },
    ... (exactly 5 questions)
  ],
  "mcqs": [
    {
      "question": "Clear MCQ question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact string of the correct option from the options array"
    },
    ... (exactly 6 MCQs)
  ],
  "mermaidCharts": [
    "graph TD\\n  A[\\\"State evolves: $$\\\\vert \\\\psi(t)\\\\rangle = e^{-i\\\\hat{H}t/\\\\hbar} \\\\vert \\\\psi(0)\\\\rangle$$\\\"] --> B[\\\"Next concept\\\"]"
  ]
}

  Provide at least 6 MCQs and at least 2 mermaid charts.
  CRITICAL MATH INSTRUCTIONS:
  - For standard Markdown fields (content, summary, shortNotes, etc): Use $...$ for inline math (e.g. $A = \pi r^2$) and $$...$$ ONLY for standalone display equations on a new line. Never use $$ for inline variables. Use proper LaTeX (e.g. \\frac).
  - For Mermaid charts: ALWAYS wrap every node label in double quotes, like A[\"Label (with details)\"]. Wrap every formula in $$...$$ inside the quoted label. NEVER use the | pipe character inside math in labels - write \\vert instead.
  - Because you are returning JSON, you MUST escape every LaTeX backslash as a double backslash (e.g. \\\\frac).
  Make sure correctAnswer EXACTLY matches one of the options strings.`;

      await job.updateProgress(30); // Requesting AI generation

      const response = await generateWithFallback({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 16384,
        },
      });

      const rawText = response.text;
      if (!rawText) throw new Error("Empty response from AI");

      await job.updateProgress(60); // AI generation complete

      const noteData = parseAiJson<{
        title: string;
        summary: string;
        content: string;
        shortNotes: string;
        importantQuestions: any[];
        mcqs: any[];
        mermaidCharts: string[];
      }>(rawText);

      await job.updateProgress(70); // JSON parsed

      // Completeness guard
      const missingSections: string[] = [];
      if ((noteData.importantQuestions?.length || 0) < 3) missingSections.push("importantQuestions");
      if ((noteData.mcqs?.length || 0) < 4) missingSections.push("mcqs");
      if ((noteData.mermaidCharts?.length || 0) < 1) missingSections.push("mermaidCharts");

      if (missingSections.length > 0) {
        await job.updateProgress(75); // Requesting supplemental generation
        console.warn(`Job ${job.id}: missing sections, generating supplement:`, missingSections);
        try {
          const supplementPrompt = `You are an expert AI tutor. Based on the study notes below, generate ONLY the missing sections.
Topic: "${topic}" (Level: "${classLevel}")
Notes summary: "${(noteData.summary || noteData.content || "").slice(0, 1200)}"
Return ONLY a RAW JSON object with:
{
  "importantQuestions": [ ... 5 questions ],
  "mcqs": [ ... 6 MCQs ],
  "mermaidCharts": [ ... 2 charts ]
}`;
          const suppRes = await generateWithFallback({
            contents: supplementPrompt,
            config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
          });
          const supplement = parseAiJson<{
            importantQuestions?: any[];
            mcqs?: any[];
            mermaidCharts?: string[];
          }>(suppRes.text || "");

          if (supplement.importantQuestions?.length) {
            noteData.importantQuestions = [...(noteData.importantQuestions || []), ...supplement.importantQuestions];
          }
          if (supplement.mcqs?.length) {
            noteData.mcqs = [...(noteData.mcqs || []), ...supplement.mcqs];
          }
          if (supplement.mermaidCharts?.length) {
            noteData.mermaidCharts = [...(noteData.mermaidCharts || []), ...supplement.mermaidCharts];
          }
        } catch (suppErr: any) {
          console.warn("Supplemental section generation failed (proceeding):", suppErr?.message || suppErr);
        }
      }

      await job.updateProgress(85); // Structure normalized

      const normalizedQuestions = (noteData.importantQuestions || []).map((q: any) => {
        if (typeof q === "object" && q !== null) {
          return {
            question: q.question || q.q || String(q),
            answer: q.answer || q.a || "",
          };
        }
        return { question: String(q), answer: "" };
      });

      // Deduct credit
      user.credits -= 1;
      await user.save();

      await job.updateProgress(90); // Saving note to DB

      const newNote = await Note.create({
        userId: user._id,
        topic,
        classLevel,
        title: typeof noteData.title === 'string' ? noteData.title : (Array.isArray(noteData.title) ? noteData.title.join(' ') : "Generated Notes"),
        summary: typeof noteData.summary === 'string' ? noteData.summary : (Array.isArray(noteData.summary) ? noteData.summary.join('\n') : "Summary not provided by AI."),
        content: typeof noteData.content === 'string' ? noteData.content : (Array.isArray(noteData.content) ? noteData.content.join('\n') : "Content not provided by AI."),
        shortNotes: typeof noteData.shortNotes === 'string' ? noteData.shortNotes : (Array.isArray(noteData.shortNotes) ? noteData.shortNotes.map(s => `- ${s}`).join('\n') : "No short notes generated."),
        importantQuestions: normalizedQuestions.map((q: any) => ({
          question: q.question || "Untitled question",
          answer: q.answer || "No answer provided.",
        })),
        mcqs: (noteData.mcqs || []).map((mcq: any) => ({
          ...mcq,
          question: mcq.question || "Untitled question",
          correctAnswer: mcq.correctAnswer || "Not provided",
        })),
        mermaidCharts: noteData.mermaidCharts || [],
      });

      await job.updateProgress(95); // Indexing RAG

      try {
        const textToIndex = pdfContent
          ? `${pdfContent}\n\n=== AI GENERATED NOTES ===\n${noteData.content}`
          : `${noteData.title}\n\n${noteData.summary}\n\n${noteData.content}\n\n${noteData.shortNotes}`;

        await indexDocument(
          newNote._id.toString(),
          user._id.toString(),
          textToIndex,
          `${topic}_notes.pdf`
        );
      } catch (ragErr) {
        console.warn("RAG Vector Indexing warning (proceeding):", ragErr);
      }

      await job.updateProgress(100); // Complete
      return { noteId: newNote._id.toString() };
    } catch (error: any) {
      console.error(`Worker error for job ${job.id}:`, error);
      throw error;
    }
  },
  { connection: redis }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
