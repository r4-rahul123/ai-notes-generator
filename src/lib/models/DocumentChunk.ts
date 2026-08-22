import mongoose, { Schema, Document, models } from "mongoose";

export interface IDocumentChunk extends Document {
  userId: mongoose.Types.ObjectId;
  noteId: mongoose.Types.ObjectId;
  chunkIndex: number;
  text: string;
  embedding: number[];
  metadata?: {
    page?: number;
    sourceFileName?: string;
    charLength: number;
    wordCount: number;
  };
  createdAt: Date;
}

const DocumentChunkSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    noteId: { type: Schema.Types.ObjectId, ref: "Note", required: true, index: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    metadata: {
      page: { type: Number },
      sourceFileName: { type: String },
      charLength: { type: Number },
      wordCount: { type: Number },
    },
  },
  { timestamps: true }
);

// Add index on noteId for fast retrieval per document
DocumentChunkSchema.index({ noteId: 1, chunkIndex: 1 });

const DocumentChunk =
  models.DocumentChunk ||
  mongoose.model<IDocumentChunk>("DocumentChunk", DocumentChunkSchema);

export default DocumentChunk;
