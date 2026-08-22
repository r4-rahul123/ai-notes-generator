import mongoose, { Schema, Document } from "mongoose";

export interface IQuizAttempt {
  _id?: string;
  attemptNumber: number;
  score: number;
  total: number;
  submittedAt: Date;
  mcqs: {
    question: string;
    options: string[];
    correctAnswer: string;
    userAnswer?: string;
  }[];
}

export interface IImportantQuestion {
  question: string;
  answer?: string;
}

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  topic: string;
  classLevel: string;
  summary: string;
  content: string;
  shortNotes: string;
  importantQuestions: Array<IImportantQuestion | string>;
  mcqs: {
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
  quizAttempts: IQuizAttempt[];
  mermaidCharts: string[];
  createdAt: Date;
}

const QuizAttemptSchema = new Schema({
  attemptNumber: { type: Number, required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
  mcqs: [
    {
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: String, required: true },
      userAnswer: { type: String },
    },
  ],
});

const NoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    topic: { type: String, required: true },
    classLevel: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    shortNotes: { type: String, required: true },
    importantQuestions: { type: [Schema.Types.Mixed], default: [] },
    mcqs: [
      {
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: String, required: true },
      },
    ],
    quizAttempts: [QuizAttemptSchema],
    mermaidCharts: [{ type: String }],
  },
  { timestamps: true, strict: false }
);

// Prevent stale cached model in Next.js hot reloading
if (mongoose.models && mongoose.models.Note) {
  delete (mongoose.models as any).Note;
}

const Note = mongoose.model<INote>("Note", NoteSchema);
export default Note;
